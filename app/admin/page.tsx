"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { UploadCloud } from "lucide-react";
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

type BulkRowError = {
  row: number;
  field: string;
  message: string;
};

type BulkPreviewProduct = {
  name: string;
  category: string;
  price: number;
  stockQuantity: number;
  imageUrl: string;
};

type MerchantImageAsset = {
  id: string;
  url: string;
  originalName: string;
  contentType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  createdAt: string;
};

const IMAGE_PAGE_SIZE = 10;

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

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
  const [bulkCsvFile, setBulkCsvFile] = useState<File | null>(null);
  const [bulkIsPreviewing, setBulkIsPreviewing] = useState(false);
  const [bulkIsImporting, setBulkIsImporting] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkSummary, setBulkSummary] = useState<{
    totalRows: number;
    validRows: number;
    invalidRows: number;
    createdCount?: number;
    dryRun: boolean;
  } | null>(null);
  const [bulkPreviewRows, setBulkPreviewRows] = useState<BulkPreviewProduct[]>([]);
  const [bulkRowErrors, setBulkRowErrors] = useState<BulkRowError[]>([]);
  const [imageAssets, setImageAssets] = useState<MerchantImageAsset[]>([]);
  const [imagePage, setImagePage] = useState(1);
  const [imageTotalPages, setImageTotalPages] = useState(1);
  const [imageTotal, setImageTotal] = useState(0);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [isUploadingProductImage, setIsUploadingProductImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [imageCopiedId, setImageCopiedId] = useState<string | null>(null);

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
    if (access?.access !== "merchant") return;
    loadMerchantImageHistory(imagePage);
  }, [access?.access, imagePage]);

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
      const rows: Array<Record<string, unknown>> = Array.isArray(data) ? data : [];
      const normalized: ManagementOrder[] = rows.map((o) => ({
        id: String(o.orderId || o.order_id || o.id || o._id || ""),
        status: String(o.status || ""),
        amount: typeof o.amount === "number" ? o.amount : undefined,
        trackingNumber:
          typeof o.trackingNumber === "string"
            ? o.trackingNumber
            : typeof o.tracking_number === "string"
            ? o.tracking_number
            : null,
        shippingProvider:
          typeof o.shippingProvider === "string"
            ? o.shippingProvider
            : typeof o.shipping_provider === "string"
            ? o.shipping_provider
            : null,
        trackingUrl:
          typeof o.trackingUrl === "string"
            ? o.trackingUrl
            : typeof o.tracking_url === "string"
            ? o.tracking_url
            : null,
        estimatedDelivery:
          typeof o.estimatedDelivery === "string"
            ? o.estimatedDelivery
            : typeof o.estimated_delivery === "string"
            ? o.estimated_delivery
            : null,
        shippingDetails:
          o.shippingDetails && typeof o.shippingDetails === "object"
            ? (o.shippingDetails as Record<string, unknown>)
            : o.shipping_details && typeof o.shipping_details === "object"
            ? (o.shipping_details as Record<string, unknown>)
            : null,
        customer:
          o.customer && typeof o.customer === "object"
            ? (o.customer as { name?: string; email?: string })
            : {},
        createdAt: typeof o.createdAt === "string" ? o.createdAt : undefined,
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
      const rows: Array<Record<string, unknown>> = Array.isArray(data) ? data : [];
      const normalized: ServiceRequest[] = rows.map((r) => ({
        requestId: String(r.requestId || r.request_id || ""),
        orderId: String(r.orderId || r.order_id || ""),
        type: String(r.type || ""),
        status: String(r.status || ""),
        reason: String(r.reason || ""),
        details: typeof r.details === "string" ? r.details : null,
        requestedByEmail: String(r.requestedByEmail || r.requested_by_email || ""),
        reviewedByEmail:
          typeof r.reviewedByEmail === "string"
            ? r.reviewedByEmail
            : typeof r.reviewed_by_email === "string"
            ? r.reviewed_by_email
            : null,
        resolutionNote:
          typeof r.resolutionNote === "string"
            ? r.resolutionNote
            : typeof r.resolution_note === "string"
            ? r.resolution_note
            : null,
        createdAt: typeof r.createdAt === "string" ? r.createdAt : undefined,
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

  const submitBulkCsv = async (dryRun: boolean) => {
    if (!bulkCsvFile) {
      setBulkError("Please choose a CSV file first.");
      return;
    }
    setBulkError(null);
    if (dryRun) setBulkIsPreviewing(true);
    else setBulkIsImporting(true);

    try {
      const fd = new FormData();
      fd.append("file", bulkCsvFile);
      fd.append("dryRun", dryRun ? "true" : "false");
      const res = await fetch("/api/merchant/products/bulk", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Bulk CSV processing failed");
      }

      setBulkSummary({
        totalRows: Number(data?.totalRows || 0),
        validRows: Number(data?.validRows || 0),
        invalidRows: Number(data?.invalidRows || 0),
        createdCount:
          data?.createdCount !== undefined ? Number(data.createdCount || 0) : undefined,
        dryRun: Boolean(data?.dryRun),
      });
      setBulkPreviewRows(Array.isArray(data?.preview) ? data.preview : []);
      setBulkRowErrors(Array.isArray(data?.errors) ? data.errors : []);

      if (!dryRun) {
        await loadProducts();
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Bulk CSV processing failed";
      setBulkError(message);
    } finally {
      if (dryRun) setBulkIsPreviewing(false);
      else setBulkIsImporting(false);
    }
  };

  const loadMerchantImageHistory = async (page = 1) => {
    try {
      setIsLoadingImages(true);
      setImageUploadError(null);
      const res = await fetch(
        `/api/merchant/images?page=${page}&pageSize=${IMAGE_PAGE_SIZE}`
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to load image history");
      }
      const items: MerchantImageAsset[] = Array.isArray(data?.items) ? data.items : [];
      const totalPages = Math.max(1, Number(data?.pagination?.totalPages || 1));
      const total = Math.max(0, Number(data?.pagination?.total || 0));
      setImageAssets(items);
      setImageTotalPages(totalPages);
      setImageTotal(total);
      if (page > totalPages) {
        setImagePage(totalPages);
      }
    } catch (imageError: unknown) {
      const message =
        imageError instanceof Error ? imageError.message : "Failed to load image history";
      setImageUploadError(message);
    } finally {
      setIsLoadingImages(false);
    }
  };

  const handleUploadProductImage = async (file: File) => {
    try {
      setIsUploadingProductImage(true);
      setImageUploadError(null);
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/merchant/images", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Product image upload failed");
      }
      setImagePage(1);
      await loadMerchantImageHistory(1);
    } catch (imageError: unknown) {
      const message =
        imageError instanceof Error ? imageError.message : "Product image upload failed";
      setImageUploadError(message);
    } finally {
      setIsUploadingProductImage(false);
    }
  };

  const handleCopyImageUrl = async (asset: MerchantImageAsset) => {
    try {
      await navigator.clipboard.writeText(asset.url);
      setImageCopiedId(asset.id);
      window.setTimeout(() => {
        setImageCopiedId((current) => (current === asset.id ? null : current));
      }, 1200);
    } catch {
      setImageUploadError("Could not copy image URL. Please copy it manually.");
    }
  };

  const inputClass = "border border-brand-sand/50 rounded-lg px-2 py-1 text-xs bg-white text-brand-charcoal focus:outline-none focus:border-brand-terracotta/40";
  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" });
  };

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
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="rounded-full border border-brand-sand/60 bg-white px-4 py-2 text-sm text-brand-charcoal hover:bg-brand-cream"
          >
            Rasphia Home
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-full border border-brand-sand/60 bg-white px-4 py-2 text-sm text-brand-charcoal hover:bg-brand-cream"
          >
            Sign out
          </button>
        </div>

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

        {!isAdmin && (
          <section
            id="bulk-product-upload"
            className="mb-6 rounded-2xl border border-brand-sand/40 bg-brand-parchment/50 p-4"
          >
            <p className="text-sm font-semibold text-brand-charcoal">
              Bulk Product Upload (CSV)
            </p>
            <p className="mt-1 text-xs text-brand-stone">
              Download template, preview CSV, then import valid rows.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <a
                href="/templates/merchant-products-bulk-upload-sample.csv"
                download
                className="rounded-lg border border-brand-sand/60 bg-white px-3 py-1.5 text-xs text-brand-charcoal hover:bg-brand-cream"
              >
                Download Template
              </a>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-brand-sand/60 bg-white px-3 py-1.5 text-xs text-brand-charcoal hover:bg-brand-cream">
                Choose CSV
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setBulkCsvFile(file);
                    setBulkError(null);
                  }}
                />
              </label>
              <button
                type="button"
                onClick={() => submitBulkCsv(true)}
                disabled={bulkIsPreviewing || bulkIsImporting || !bulkCsvFile}
                className="rounded-lg border border-brand-sand/60 bg-white px-3 py-1.5 text-xs text-brand-charcoal hover:bg-brand-cream disabled:opacity-50"
              >
                {bulkIsPreviewing ? "Previewing..." : "Preview CSV"}
              </button>
              <button
                type="button"
                onClick={() => submitBulkCsv(false)}
                disabled={
                  bulkIsPreviewing ||
                  bulkIsImporting ||
                  !bulkCsvFile ||
                  !bulkSummary ||
                  bulkSummary.validRows < 1
                }
                className="rounded-lg bg-brand-charcoal px-3 py-1.5 text-xs text-white hover:bg-brand-warm-black disabled:opacity-50"
              >
                {bulkIsImporting ? "Importing..." : "Import Valid Rows"}
              </button>
            </div>
            <p className="mt-2 text-xs text-brand-stone">
              {bulkCsvFile ? `Selected: ${bulkCsvFile.name}` : "No CSV selected yet."}
            </p>
            {bulkError && (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {bulkError}
              </p>
            )}
            {bulkSummary && (
              <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                <div className="rounded-lg border border-brand-sand/50 bg-white px-3 py-2 text-xs">
                  <p className="text-brand-stone">Total Rows</p>
                  <p className="font-semibold text-brand-charcoal">{bulkSummary.totalRows}</p>
                </div>
                <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs">
                  <p className="text-green-700">Valid Rows</p>
                  <p className="font-semibold text-green-800">{bulkSummary.validRows}</p>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs">
                  <p className="text-amber-700">Invalid Rows</p>
                  <p className="font-semibold text-amber-800">{bulkSummary.invalidRows}</p>
                </div>
                <div className="rounded-lg border border-brand-sand/50 bg-white px-3 py-2 text-xs">
                  <p className="text-brand-stone">
                    {bulkSummary.dryRun ? "Ready to Import" : "Created"}
                  </p>
                  <p className="font-semibold text-brand-charcoal">
                    {bulkSummary.dryRun
                      ? bulkSummary.validRows
                      : Number(bulkSummary.createdCount || 0)}
                  </p>
                </div>
              </div>
            )}
            {bulkPreviewRows.length > 0 && (
              <div className="mt-3 overflow-x-auto rounded-xl border border-brand-sand/40 bg-white">
                <table className="min-w-full table-fixed text-xs">
                  <thead className="bg-brand-cream/60">
                    <tr>
                      {["Name", "Category", "Price", "Stock", "Image URL"].map((h) => (
                        <th
                          key={h}
                          className="px-2 py-2 text-left font-medium uppercase tracking-wide text-brand-stone"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bulkPreviewRows.slice(0, 8).map((row, idx) => (
                      <tr key={`${row.name}-${idx}`} className="border-t border-brand-sand/20">
                        <td className="px-2 py-2 text-brand-charcoal break-words">{row.name}</td>
                        <td className="px-2 py-2 text-brand-charcoal break-words">{row.category}</td>
                        <td className="px-2 py-2 text-brand-charcoal">₹{row.price}</td>
                        <td className="px-2 py-2 text-brand-charcoal">{row.stockQuantity}</td>
                        <td className="max-w-[220px] truncate px-2 py-2 text-brand-stone break-all">
                          {row.imageUrl}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {bulkRowErrors.length > 0 && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                <p className="text-xs font-medium text-amber-800">Row Errors</p>
                <div className="mt-2 max-h-44 overflow-auto space-y-1">
                  {bulkRowErrors.slice(0, 20).map((err, idx) => (
                    <p key={`${err.row}-${err.field}-${idx}`} className="text-xs text-amber-900">
                      Row {err.row} • {err.field}: {err.message}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {!isAdmin && (
          <section className="mb-8 rounded-3xl border border-brand-sand/40 bg-white/70 p-4 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-medium text-brand-charcoal">Product Image Library</h2>
                <p className="mt-1 text-sm text-brand-stone">
                  Upload product images to get public blob URLs. Images are stored with
                  lossless compression and listed below.
                </p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-black/70 bg-black px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-neutral-800">
                <UploadCloud className="h-4 w-4 text-white" />
                <span>{isUploadingProductImage ? "Uploading Image..." : "Upload Product Image"}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const input = e.currentTarget;
                    const file = input.files?.[0];
                    if (!file) return;
                    input.value = "";
                    await handleUploadProductImage(file);
                  }}
                />
              </label>
            </div>

            {imageUploadError && (
              <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {imageUploadError}
              </p>
            )}

            <p className="mt-3 text-xs text-brand-stone">
              {isLoadingImages ? "Loading image history..." : `Total uploaded images: ${imageTotal}`}
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {imageAssets.map((asset) => (
                <article
                  key={asset.id}
                  className="overflow-hidden rounded-2xl border border-brand-sand/50 bg-white"
                >
                  <img
                    src={asset.url}
                    alt={asset.originalName}
                    loading="lazy"
                    className="h-40 w-full object-cover bg-brand-parchment/50"
                  />
                  <div className="space-y-1 px-3 py-3">
                    <p className="truncate text-sm font-medium text-brand-charcoal">
                      {asset.originalName}
                    </p>
                    <p className="text-xs text-brand-stone">
                      {formatBytes(asset.sizeBytes)}
                      {asset.width && asset.height ? ` • ${asset.width}x${asset.height}` : ""}
                    </p>
                    <p className="text-xs text-brand-stone">
                      {new Date(asset.createdAt).toLocaleString()}
                    </p>
                    <p className="truncate text-xs text-brand-stone">{asset.url}</p>
                    <button
                      type="button"
                      onClick={() => handleCopyImageUrl(asset)}
                      className="mt-1 rounded-lg border border-brand-sand/60 px-3 py-1.5 text-xs text-brand-charcoal hover:bg-brand-cream"
                    >
                      {imageCopiedId === asset.id ? "Copied" : "Copy URL"}
                    </button>
                  </div>
                </article>
              ))}
            </div>

            {!isLoadingImages && !imageAssets.length && (
              <p className="mt-4 text-sm text-brand-stone">No images uploaded yet.</p>
            )}

            <div className="mt-5 flex items-center justify-between">
              <button
                type="button"
                disabled={imagePage <= 1}
                onClick={() => setImagePage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-brand-sand/60 bg-white px-3 py-1.5 text-xs text-brand-charcoal hover:bg-brand-cream disabled:opacity-50"
              >
                Previous
              </button>
              <p className="text-xs text-brand-stone">
                Page {imagePage} of {imageTotalPages}
              </p>
              <button
                type="button"
                disabled={imagePage >= imageTotalPages}
                onClick={() => setImagePage((p) => Math.min(imageTotalPages, p + 1))}
                className="rounded-lg border border-brand-sand/60 bg-white px-3 py-1.5 text-xs text-brand-charcoal hover:bg-brand-cream disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </section>
        )}

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
