"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import AdminProductForm from "../components/AdminProductForm";
import { Product } from "../types";

type AccessResponse = {
  authenticated: boolean;
  access: "none" | "admin" | "merchant" | "merchant_pending";
  email?: string;
  merchant?: {
    id: string;
    name: string;
    status: string;
  } | null;
};

type ManagementOrder = {
  id: string;
  status: string;
  amount?: number;
  trackingNumber?: string | null;
  shippingProvider?: string | null;
  trackingUrl?: string | null;
  estimatedDelivery?: string | null;
  shippingDetails?: Record<string, unknown> | null;
  customer?: {
    name?: string;
    email?: string;
  };
  createdAt?: string;
};

type ServiceRequest = {
  requestId: string;
  orderId: string;
  type: string;
  status: string;
  reason: string;
  details?: string | null;
  requestedByEmail: string;
  reviewedByEmail?: string | null;
  resolutionNote?: string | null;
  createdAt?: string;
};

type PendingMerchant = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  status: string;
};

const ORDER_STATUSES = [
  "created",
  "paid",
  "Processing",
  "Shipped",
  "Delivered",
  "Cancelled",
  "Refunded",
  "Replacement",
];
const SERVICE_REQUEST_STATUSES = [
  "requested",
  "approved",
  "rejected",
  "in_progress",
  "completed",
];

export default function ManagementDashboard() {
  const { status: sessionStatus } = useSession();
  const [access, setAccess] = useState<AccessResponse | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<ManagementOrder[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [pendingMerchants, setPendingMerchants] = useState<PendingMerchant[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [isLoadingServiceRequests, setIsLoadingServiceRequests] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingOrderIds, setUpdatingOrderIds] = useState<Record<string, boolean>>({});
  const [orderUpdateFeedback, setOrderUpdateFeedback] = useState<{
    type: "success" | "error";
    message: string;
    orderId?: string;
  } | null>(null);

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    loadAccess();
  }, [sessionStatus]);

  useEffect(() => {
    if (!access) return;
    if (access.access === "admin" || access.access === "merchant") {
      loadProducts();
      loadOrders();
      loadServiceRequests();
      if (access.access === "admin") {
        loadPendingMerchants();
      }
    }
  }, [access]);

  useEffect(() => {
    if (!orderUpdateFeedback) return;
    const timer = window.setTimeout(() => {
      setOrderUpdateFeedback(null);
    }, 3500);
    return () => window.clearTimeout(timer);
  }, [orderUpdateFeedback]);

  const loadAccess = async () => {
    try {
      const res = await fetch("/api/management/access");
      const data = await res.json();
      setAccess(data);
    } catch (e) {
      console.error(e);
      setError("Could not resolve dashboard access.");
    }
  };

  const loadProducts = async () => {
    try {
      setIsLoadingProducts(true);
      const res = await fetch("/api/products/get?scope=managed");
      if (!res.ok) throw new Error("Failed to fetch products");
      const data = await res.json();
      setProducts(data || []);
    } catch (e) {
      console.error(e);
      setError("Could not load products");
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const loadOrders = async () => {
    try {
      setIsLoadingOrders(true);
      const res = await fetch("/api/management/orders");
      if (!res.ok) throw new Error("Failed to fetch orders");
      const data = await res.json();
      const normalized: ManagementOrder[] = (data || []).map((o: any) => ({
        id: o.orderId || o.order_id || o.id || o._id,
        status: o.status,
        amount: o.amount,
        trackingNumber: o.trackingNumber ?? o.tracking_number ?? null,
        shippingProvider: o.shippingProvider ?? o.shipping_provider ?? null,
        trackingUrl: o.trackingUrl ?? o.tracking_url ?? null,
        estimatedDelivery: o.estimatedDelivery ?? o.estimated_delivery ?? null,
        shippingDetails: o.shippingDetails ?? o.shipping_details ?? null,
        customer: o.customer || {},
        createdAt: o.createdAt,
      }));
      setOrders(normalized);
    } catch (e) {
      console.error(e);
      setError("Could not load orders");
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const loadServiceRequests = async () => {
    try {
      setIsLoadingServiceRequests(true);
      const res = await fetch("/api/management/service-requests");
      if (!res.ok) throw new Error("Failed to load service requests");
      const data = await res.json();
      const normalized: ServiceRequest[] = (data || []).map((r: any) => ({
        requestId: r.requestId || r.request_id,
        orderId: r.orderId || r.order_id,
        type: r.type,
        status: r.status,
        reason: r.reason,
        details: r.details,
        requestedByEmail: r.requestedByEmail || r.requested_by_email,
        reviewedByEmail: r.reviewedByEmail || r.reviewed_by_email,
        resolutionNote: r.resolutionNote || r.resolution_note,
        createdAt: r.createdAt,
      }));
      setServiceRequests(normalized);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingServiceRequests(false);
    }
  };

  const loadPendingMerchants = async () => {
    try {
      const res = await fetch("/api/merchants?status=pending");
      if (!res.ok) throw new Error("Failed to load pending merchants");
      const data = await res.json();
      setPendingMerchants(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async (product: Product) => {
    try {
      const isEdit = Boolean(product._id);
      const method = isEdit ? "PUT" : "POST";
      const url = isEdit ? "/api/products/update" : "/api/products/add";
      const payload = { ...product, ...(isEdit ? { id: String(product._id) } : {}) };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to save product");
      }
      setEditingProduct(null);
      setIsAdding(false);
      await loadProducts();
      alert(`Product ${isEdit ? "updated" : "added"} successfully`);
    } catch (e) {
      console.error(e);
      alert("Error saving product");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      const res = await fetch("/api/products/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Failed to delete");
      setProducts((prev) => prev.filter((p) => p._id !== id));
    } catch (e) {
      console.error(e);
      alert("Error deleting product");
    }
  };

  const handleMerchantAction = async (merchantId: string, action: "approve" | "reject") => {
    try {
      const res = await fetch(`/api/merchants/${merchantId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error("Failed to update merchant");
      await loadPendingMerchants();
      alert(`Merchant ${action}d successfully`);
    } catch (e) {
      console.error(e);
      alert(`Failed to ${action} merchant`);
    }
  };

  const handleUpdateOrderStatus = async (
    orderId: string,
    status: string,
    extra: Record<string, unknown> = {}
  ) => {
    setUpdatingOrderIds((prev) => ({ ...prev, [orderId]: true }));
    setOrderUpdateFeedback(null);
    try {
      const res = await fetch("/api/management/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status, ...extra }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to update order status");
      }
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, status, ...(extra as Partial<ManagementOrder>) } : o
        )
      );
      setOrderUpdateFeedback({
        type: "success",
        message: `Order ${orderId} updated to ${status}.`,
        orderId,
      });
    } catch (e) {
      console.error(e);
      const message =
        e instanceof Error ? e.message : "Could not update order status";
      setOrderUpdateFeedback({
        type: "error",
        message,
        orderId,
      });
    } finally {
      setUpdatingOrderIds((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  const handleUpdateServiceRequest = async (requestId: string, status: string) => {
    const resolutionNote = prompt("Optional resolution note (visible in pipeline):") || "";
    try {
      const res = await fetch("/api/management/service-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, status, resolutionNote }),
      });
      if (!res.ok) throw new Error("Failed to update service request");
      await loadServiceRequests();
    } catch (e) {
      console.error(e);
      alert("Could not update service request");
    }
  };

  const inputClass = "border border-brand-sand/50 rounded-lg px-2 py-1 text-xs bg-white text-brand-charcoal focus:outline-none focus:border-brand-terracotta/40";

  if (sessionStatus === "loading" || !access)
    return (
      <div className="min-h-screen bg-brand-cream flex items-center justify-center font-body">
        <p className="text-sm text-brand-stone">Loading…</p>
      </div>
    );

  if (!access.authenticated) {
    return (
      <div className="min-h-screen bg-brand-cream flex items-center justify-center font-body">
        <p className="text-brand-stone">Please sign in to continue.</p>
      </div>
    );
  }

  if (access.access === "none") {
    return (
      <div className="min-h-screen bg-brand-cream flex items-center justify-center font-body">
        <div className="text-center space-y-3">
          <p className="text-brand-stone">You do not have management access yet.</p>
          <Link href="/merchant/onboarding" className="text-brand-terracotta underline text-sm">
            Apply as Merchant
          </Link>
        </div>
      </div>
    );
  }

  if (access.access === "merchant_pending") {
    return (
      <div className="min-h-screen bg-brand-cream flex items-center justify-center font-body">
        <div className="text-center space-y-3">
          <p className="text-brand-terracotta font-medium">
            Your merchant account is pending admin approval.
          </p>
          <Link href="/merchant/onboarding" className="text-brand-terracotta underline text-sm">
            View / Update Application
          </Link>
        </div>
      </div>
    );
  }

  const isAdmin = access.access === "admin";

  return (
    <div className="min-h-screen bg-brand-cream p-6 font-body">
      <div className="max-w-7xl mx-auto bg-white/80 backdrop-blur-xl rounded-3xl border border-brand-sand/30 shadow-soft-md p-6 md:p-8">
        <div className="text-center mb-8">
          <h1 className="font-heading text-3xl text-brand-charcoal mb-1">
            {isAdmin ? "Admin Dashboard" : "Merchant Dashboard"}
          </h1>
          <p className="text-brand-stone text-sm">Manage products and orders.</p>
        </div>

        {!isAdmin && (
          <div className="mb-6 rounded-2xl border border-brand-sand/40 bg-brand-parchment/50 p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-brand-charcoal font-medium">
                Build your public merchant storefront and payment setup
              </p>
              <p className="text-xs text-brand-stone mt-0.5">
                Add branding, chatbot welcome message, and SeedhaPe payment credentials.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/merchant/storefront"
                className="px-4 py-2 rounded-xl bg-brand-charcoal text-brand-cream text-sm hover:bg-brand-warm-black transition-colors"
              >
                Storefront Settings
              </Link>
              <Link
                href="/merchant/storefront#seedhape-payments"
                className="px-4 py-2 rounded-xl border border-brand-sand/60 bg-white text-brand-charcoal text-sm hover:bg-brand-cream transition-colors"
              >
                SeedhaPe Settings
              </Link>
            </div>
          </div>
        )}

        {error && (
          <p className="text-red-600 text-center mb-4 text-sm font-medium">{error}</p>
        )}

        {isAdmin && (
          <section className="mb-8 border border-brand-sand/30 rounded-2xl p-5 bg-brand-parchment/30">
            <h2 className="font-heading text-lg text-brand-charcoal mb-4">
              Pending Merchant Approvals
            </h2>
            {pendingMerchants.length === 0 ? (
              <p className="text-brand-stone text-sm">No pending applications.</p>
            ) : (
              <div className="space-y-3">
                {pendingMerchants.map((m) => (
                  <div
                    key={m.id}
                    className="bg-white border border-brand-sand/30 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="text-sm">
                      <p className="font-medium text-brand-charcoal">{m.name}</p>
                      <p className="text-brand-stone">{m.email}</p>
                      <p className="text-brand-stone">{m.phone}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleMerchantAction(m.id, "approve")}
                        className="px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs border border-green-200 hover:bg-green-100 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleMerchantAction(m.id, "reject")}
                        className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-xs border border-red-200 hover:bg-red-100 transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {!isAdding && !editingProduct && (
          <button
            onClick={() => setIsAdding(true)}
            className="bg-brand-charcoal text-brand-cream px-4 py-2 rounded-xl text-sm font-medium mb-6 hover:bg-brand-warm-black transition-colors shadow-soft"
          >
            Add Product
          </button>
        )}

        {(isAdding || editingProduct) && (
          <AdminProductForm
            product={editingProduct}
            onSave={handleSave}
            onCancel={() => {
              setIsAdding(false);
              setEditingProduct(null);
            }}
          />
        )}

        <section className="mb-10">
          <h2 className="font-heading text-lg text-brand-charcoal mb-4">Managed Products</h2>
          {isLoadingProducts ? (
            <p className="text-brand-stone text-sm">Loading products…</p>
          ) : products.length === 0 ? (
            <p className="text-brand-stone text-sm">No products found.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {products.map((p) => (
                <div
                  key={p._id}
                  className="border border-brand-sand/30 rounded-2xl p-4 flex flex-col gap-2 bg-white shadow-soft"
                >
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    className="w-full h-40 object-cover rounded-xl"
                  />
                  <h3 className="text-sm font-semibold text-brand-charcoal">{p.name}</h3>
                  <p className="text-xs text-brand-stone">{p.brand}</p>
                  <p className="text-brand-terracotta font-semibold text-sm">
                    ₹{(p.price as number).toFixed(2)}
                  </p>
                  <div className="flex justify-between mt-2">
                    <button
                      onClick={() => setEditingProduct(p)}
                      className="px-3 py-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(p._id!)}
                      className="px-3 py-1 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="font-heading text-lg text-brand-charcoal mb-4">Managed Orders</h2>
          {orderUpdateFeedback && (
            <div
              className={`mb-3 rounded-xl border px-3 py-2 text-xs ${
                orderUpdateFeedback.type === "success"
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {orderUpdateFeedback.message}
            </div>
          )}
          {isLoadingOrders ? (
            <p className="text-brand-stone text-sm">Loading orders…</p>
          ) : orders.length === 0 ? (
            <p className="text-brand-stone text-sm">No orders found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border border-brand-sand/30 text-sm rounded-xl overflow-hidden">
                <thead className="bg-brand-parchment/50">
                  <tr>
                    {["Order ID", "Customer", "Amount", "Status", "Shipping"].map((h) => (
                      <th key={h} className="text-left px-3 py-2.5 border-b border-brand-sand/30 text-xs uppercase tracking-widest font-medium text-brand-stone/70">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="border-b border-brand-sand/20 hover:bg-brand-cream/40 transition-colors">
                      <td className="px-3 py-2.5 font-mono text-xs text-brand-stone/70">{o.id}</td>
                      <td className="px-3 py-2.5 text-brand-charcoal">
                        {o.customer?.name || "-"}
                        <br />
                        <span className="text-xs text-brand-stone">{o.customer?.email || "-"}</span>
                      </td>
                      <td className="px-3 py-2.5 text-brand-charcoal">₹{o.amount ?? 0}</td>
                      <td className="px-3 py-2.5">
                        <select
                          value={o.status}
                          onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value)}
                          disabled={Boolean(updatingOrderIds[o.id])}
                          className={inputClass}
                        >
                          {ORDER_STATUSES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap gap-1.5 items-center">
                          <input
                            value={o.shippingProvider || ""}
                            onChange={(e) =>
                              setOrders((prev) =>
                                prev.map((row) =>
                                  row.id === o.id ? { ...row, shippingProvider: e.target.value } : row
                                )
                              )
                            }
                            placeholder="Carrier"
                            className={`${inputClass} w-24`}
                          />
                          <input
                            value={o.trackingNumber || ""}
                            onChange={(e) =>
                              setOrders((prev) =>
                                prev.map((row) =>
                                  row.id === o.id ? { ...row, trackingNumber: e.target.value } : row
                                )
                              )
                            }
                            placeholder="Tracking #"
                            className={`${inputClass} w-28`}
                          />
                          <input
                            value={o.trackingUrl || ""}
                            onChange={(e) =>
                              setOrders((prev) =>
                                prev.map((row) =>
                                  row.id === o.id ? { ...row, trackingUrl: e.target.value } : row
                                )
                              )
                            }
                            placeholder="Tracking URL"
                            className={`${inputClass} w-36`}
                          />
                          <button
                            onClick={() =>
                              handleUpdateOrderStatus(o.id, o.status, {
                                shippingProvider: o.shippingProvider,
                                trackingNumber: o.trackingNumber,
                                trackingUrl: o.trackingUrl,
                              })
                            }
                            disabled={Boolean(updatingOrderIds[o.id])}
                            className="px-2 py-1 rounded-lg bg-brand-parchment text-brand-charcoal text-xs border border-brand-sand/40 hover:bg-brand-sand/30 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {updatingOrderIds[o.id] ? "Saving..." : "Save"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-8">
          <h2 className="font-heading text-lg text-brand-charcoal mb-4">
            Refund / Replacement / Cancellation Requests
          </h2>
          {isLoadingServiceRequests ? (
            <p className="text-brand-stone text-sm">Loading service requests…</p>
          ) : serviceRequests.length === 0 ? (
            <p className="text-brand-stone text-sm">No requests yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border border-brand-sand/30 text-sm rounded-xl overflow-hidden">
                <thead className="bg-brand-parchment/50">
                  <tr>
                    {["Request ID", "Order", "Type", "Reason", "Requested By", "Status"].map((h) => (
                      <th key={h} className="text-left px-3 py-2.5 border-b border-brand-sand/30 text-xs uppercase tracking-widest font-medium text-brand-stone/70">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {serviceRequests.map((r) => (
                    <tr key={r.requestId} className="border-b border-brand-sand/20 hover:bg-brand-cream/40 transition-colors">
                      <td className="px-3 py-2.5 font-mono text-xs text-brand-stone/70">{r.requestId}</td>
                      <td className="px-3 py-2.5 text-brand-charcoal">{r.orderId}</td>
                      <td className="px-3 py-2.5 uppercase text-xs text-brand-stone">{r.type}</td>
                      <td className="px-3 py-2.5 text-brand-stone max-w-[160px] truncate">{r.reason}</td>
                      <td className="px-3 py-2.5 text-brand-stone">{r.requestedByEmail}</td>
                      <td className="px-3 py-2.5">
                        <select
                          value={r.status}
                          onChange={(e) => handleUpdateServiceRequest(r.requestId, e.target.value)}
                          className={inputClass}
                        >
                          {SERVICE_REQUEST_STATUSES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
