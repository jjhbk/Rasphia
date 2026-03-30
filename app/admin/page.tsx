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
  const [pendingMerchants, setPendingMerchants] = useState<PendingMerchant[]>(
    []
  );
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [isLoadingServiceRequests, setIsLoadingServiceRequests] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        estimatedDelivery:
          o.estimatedDelivery ?? o.estimated_delivery ?? null,
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

      const payload = {
        ...product,
        ...(isEdit ? { id: String(product._id) } : {}),
      };

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
    try {
      const res = await fetch("/api/management/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status, ...extra }),
      });
      if (!res.ok) throw new Error("Failed to update order status");
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                status,
                ...(extra as Partial<ManagementOrder>),
              }
            : o
        )
      );
    } catch (e) {
      console.error(e);
      alert("Could not update order status");
    }
  };

  const handleUpdateServiceRequest = async (
    requestId: string,
    status: string
  ) => {
    const resolutionNote =
      prompt("Optional resolution note (visible in pipeline):") || "";
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

  if (sessionStatus === "loading" || !access) return <p className="p-6">Loading...</p>;

  if (!access.authenticated) {
    return <p className="p-6">Please sign in to continue.</p>;
  }

  if (access.access === "none") {
    return (
      <div className="p-6 space-y-3">
        <p className="text-stone-700">
          You do not have management access yet.
        </p>
        <Link href="/merchant/onboarding" className="underline text-blue-700">
          Apply as Merchant
        </Link>
      </div>
    );
  }

  if (access.access === "merchant_pending") {
    return (
      <div className="p-6 space-y-3">
        <p className="text-amber-700 font-medium">
          Your merchant account is pending admin approval.
        </p>
        <Link href="/merchant/onboarding" className="underline text-blue-700">
          View / Update Application
        </Link>
      </div>
    );
  }

  const isAdmin = access.access === "admin";

  return (
    <div className="min-h-screen bg-stone-100 p-6">
      <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-lg p-6">
        <h1 className="text-3xl font-serif text-amber-900 mb-2 text-center">
          {isAdmin ? "Admin Dashboard" : "Merchant Dashboard"}
        </h1>
        <p className="text-center text-stone-500 mb-6">
          Manage products and orders.
        </p>
        {!isAdmin && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-amber-900 font-medium">
                Build your public merchant storefront
              </p>
              <p className="text-xs text-amber-800">
                Add logo, cover image, description, and merchant chatbot welcome.
              </p>
            </div>
            <Link
              href="/merchant/storefront"
              className="px-4 py-2 rounded-full bg-amber-700 text-white text-sm hover:bg-amber-800"
            >
              Storefront Settings
            </Link>
          </div>
        )}

        {error && (
          <p className="text-red-600 text-center mb-4 font-medium">{error}</p>
        )}

        {isAdmin && (
          <section className="mb-8 border rounded-lg p-4 bg-amber-50">
            <h2 className="text-xl font-semibold text-stone-800 mb-3">
              Pending Merchant Approvals
            </h2>
            {pendingMerchants.length === 0 ? (
              <p className="text-stone-600 text-sm">No pending applications.</p>
            ) : (
              <div className="space-y-3">
                {pendingMerchants.map((m) => (
                  <div
                    key={m.id}
                    className="bg-white border rounded-md p-3 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="text-sm">
                      <p className="font-medium text-stone-800">{m.name}</p>
                      <p className="text-stone-600">{m.email}</p>
                      <p className="text-stone-600">{m.phone}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleMerchantAction(m.id, "approve")}
                        className="px-3 py-1 rounded bg-green-100 text-green-800 text-sm"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleMerchantAction(m.id, "reject")}
                        className="px-3 py-1 rounded bg-red-100 text-red-800 text-sm"
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
            className="bg-stone-800 text-white px-4 py-2 rounded-md mb-6 hover:bg-stone-700"
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
          <h2 className="text-xl font-semibold text-stone-800 mb-3">
            Managed Products
          </h2>
          {isLoadingProducts ? (
            <p className="text-stone-500">Loading products...</p>
          ) : products.length === 0 ? (
            <p className="text-stone-500">No products found.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((p) => (
                <div
                  key={p._id}
                  className="border border-stone-300 rounded-lg p-4 flex flex-col gap-2 bg-white shadow-sm"
                >
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    className="w-full h-40 object-cover rounded-md"
                  />
                  <h3 className="text-lg font-medium text-stone-800">{p.name}</h3>
                  <p className="text-sm text-stone-500">{p.brand}</p>
                  <p className="text-amber-900 font-semibold">
                    ₹{(p.price as number).toFixed(2)}
                  </p>
                  <div className="flex justify-between mt-3">
                    <button
                      onClick={() => setEditingProduct(p)}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-md"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(p._id!)}
                      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md"
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
          <h2 className="text-xl font-semibold text-stone-800 mb-3">Managed Orders</h2>
          {isLoadingOrders ? (
            <p className="text-stone-500">Loading orders...</p>
          ) : orders.length === 0 ? (
            <p className="text-stone-500">No orders found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border border-stone-200 text-sm">
                <thead className="bg-stone-50">
                  <tr>
                    <th className="text-left px-3 py-2 border-b">Order ID</th>
                    <th className="text-left px-3 py-2 border-b">Customer</th>
                    <th className="text-left px-3 py-2 border-b">Amount</th>
                    <th className="text-left px-3 py-2 border-b">Status</th>
                    <th className="text-left px-3 py-2 border-b">Shipping</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td className="px-3 py-2 border-b">{o.id}</td>
                      <td className="px-3 py-2 border-b">
                        {o.customer?.name || "-"} ({o.customer?.email || "-"})
                      </td>
                      <td className="px-3 py-2 border-b">₹{o.amount ?? 0}</td>
                      <td className="px-3 py-2 border-b">
                        <select
                          value={o.status}
                          onChange={(e) =>
                            handleUpdateOrderStatus(o.id, e.target.value)
                          }
                          className="border rounded px-2 py-1"
                        >
                          {ORDER_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2 border-b">
                        <input
                          value={o.shippingProvider || ""}
                          onChange={(e) =>
                            setOrders((prev) =>
                              prev.map((row) =>
                                row.id === o.id
                                  ? { ...row, shippingProvider: e.target.value }
                                  : row
                              )
                            )
                          }
                          placeholder="Carrier"
                          className="w-28 border rounded px-2 py-1 text-xs"
                        />
                        <input
                          value={o.trackingNumber || ""}
                          onChange={(e) =>
                            setOrders((prev) =>
                              prev.map((row) =>
                                row.id === o.id
                                  ? { ...row, trackingNumber: e.target.value }
                                  : row
                              )
                            )
                          }
                          placeholder="Tracking #"
                          className="w-32 border rounded px-2 py-1 text-xs ml-2"
                        />
                        <input
                          value={o.trackingUrl || ""}
                          onChange={(e) =>
                            setOrders((prev) =>
                              prev.map((row) =>
                                row.id === o.id
                                  ? { ...row, trackingUrl: e.target.value }
                                  : row
                              )
                            )
                          }
                          placeholder="Tracking URL"
                          className="w-40 border rounded px-2 py-1 text-xs ml-2"
                        />
                        <button
                          onClick={() =>
                            handleUpdateOrderStatus(o.id, o.status, {
                              shippingProvider: o.shippingProvider,
                              trackingNumber: o.trackingNumber,
                              trackingUrl: o.trackingUrl,
                            })
                          }
                          className="ml-2 px-2 py-1 rounded bg-stone-100 text-stone-700 text-xs"
                        >
                          Save
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-semibold text-stone-800 mb-3">
            Refund / Replacement Requests
          </h2>
          {isLoadingServiceRequests ? (
            <p className="text-stone-500">Loading service requests...</p>
          ) : serviceRequests.length === 0 ? (
            <p className="text-stone-500">No requests yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border border-stone-200 text-sm">
                <thead className="bg-stone-50">
                  <tr>
                    <th className="text-left px-3 py-2 border-b">Request ID</th>
                    <th className="text-left px-3 py-2 border-b">Order</th>
                    <th className="text-left px-3 py-2 border-b">Type</th>
                    <th className="text-left px-3 py-2 border-b">Reason</th>
                    <th className="text-left px-3 py-2 border-b">Requested By</th>
                    <th className="text-left px-3 py-2 border-b">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {serviceRequests.map((r) => (
                    <tr key={r.requestId}>
                      <td className="px-3 py-2 border-b">{r.requestId}</td>
                      <td className="px-3 py-2 border-b">{r.orderId}</td>
                      <td className="px-3 py-2 border-b uppercase">{r.type}</td>
                      <td className="px-3 py-2 border-b">{r.reason}</td>
                      <td className="px-3 py-2 border-b">{r.requestedByEmail}</td>
                      <td className="px-3 py-2 border-b">
                        <select
                          value={r.status}
                          onChange={(e) =>
                            handleUpdateServiceRequest(r.requestId, e.target.value)
                          }
                          className="border rounded px-2 py-1"
                        >
                          {SERVICE_REQUEST_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
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
