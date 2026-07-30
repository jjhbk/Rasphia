"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import {
  UploadCloud,
  Package,
  ShoppingBag,
  Users,
  ImageIcon,
  FileSpreadsheet,
  LayoutGrid,
  ChevronRight,
  Copy,
  Check,
  ArrowLeft,
  ExternalLink,
  Pencil,
  Trash2,
  Plus,
  AlertCircle,
  ClipboardList,
  Store,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
} from "lucide-react";
import AdminProductForm from "../components/AdminProductForm";
import Navbar from "../components/Navbar";
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
  currency?: string;
  paymentId?: string | null;
  receipt?: string | null;
  mode?: string | null;
  trackingNumber?: string | null;
  shippingProvider?: string | null;
  trackingUrl?: string | null;
  estimatedDelivery?: string | null;
  shippingDetails?: Record<string, unknown> | null;
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    paymentProvider?: string;
  };
  products?: Array<{
    productId?: string;
    name?: string;
    brand?: string | null;
    category?: string | null;
    price?: number | null;
    quantity?: number | null;
  }>;
  invoiceId?: string | null;
  invoiceNumber?: string | null;
  invoicePdfUrl?: string | null;
  invoiceGeneratedAt?: string | null;
  invoiceSyncStatus?: string | null;
  invoiceSyncError?: string | null;
  verifiedAt?: string | null;
  statusHistory?: Array<Record<string, unknown>>;
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

function getOrderStatusClass(status: string): string {
  const s = status.toLowerCase();
  if (s === "delivered") return "status-delivered";
  if (s === "shipped") return "status-shipped";
  if (s === "paid") return "status-paid";
  if (s === "processing") return "status-processing";
  if (s === "cancelled") return "status-cancelled";
  if (s === "refunded") return "status-refunded";
  return "status-created";
}

type Section = "products" | "orders" | "service" | "merchants" | "images" | "bulk";

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
  const [activeSection, setActiveSection] = useState<Section>("products");
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

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
        currency:
          typeof o.currency === "string"
            ? o.currency
            : undefined,
        paymentId:
          typeof o.paymentId === "string"
            ? o.paymentId
            : typeof o.payment_id === "string"
            ? o.payment_id
            : null,
        receipt:
          typeof o.receipt === "string"
            ? o.receipt
            : null,
        mode:
          typeof o.mode === "string"
            ? o.mode
            : null,
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
            ? (o.customer as ManagementOrder["customer"])
            : {},
        products: Array.isArray(o.products)
          ? (o.products as ManagementOrder["products"])
          : [],
        invoiceId:
          typeof o.invoiceId === "string"
            ? o.invoiceId
            : typeof o.invoice_id === "string"
            ? o.invoice_id
            : null,
        invoiceNumber:
          typeof o.invoiceNumber === "string"
            ? o.invoiceNumber
            : typeof o.invoice_number === "string"
            ? o.invoice_number
            : null,
        invoicePdfUrl:
          typeof o.invoicePdfUrl === "string"
            ? o.invoicePdfUrl
            : typeof o.invoice_pdf_url === "string"
            ? o.invoice_pdf_url
            : null,
        invoiceGeneratedAt:
          typeof o.invoiceGeneratedAt === "string"
            ? o.invoiceGeneratedAt
            : typeof o.invoice_generated_at === "string"
            ? o.invoice_generated_at
            : null,
        invoiceSyncStatus:
          typeof o.invoiceSyncStatus === "string"
            ? o.invoiceSyncStatus
            : typeof o.invoice_sync_status === "string"
            ? o.invoice_sync_status
            : null,
        invoiceSyncError:
          typeof o.invoiceSyncError === "string"
            ? o.invoiceSyncError
            : typeof o.invoice_sync_error === "string"
            ? o.invoice_sync_error
            : null,
        verifiedAt:
          typeof o.verifiedAt === "string"
            ? o.verifiedAt
            : typeof o.verified_at === "string"
            ? o.verified_at
            : null,
        statusHistory: Array.isArray(o.statusHistory)
          ? (o.statusHistory as Array<Record<string, unknown>>)
          : Array.isArray(o.status_history)
          ? (o.status_history as Array<Record<string, unknown>>)
          : [],
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

  const formatCurrency = (amount?: number, currency = "INR") =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(Number(amount || 0));

  const downloadOrdersCsv = () => {
    const escapeCsv = (value: unknown) => {
      const text = String(value ?? "");
      if (/[",\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    };

    const header = [
      "order_id",
      "created_at",
      "verified_at",
      "status",
      "amount",
      "currency",
      "payment_id",
      "invoice_number",
      "invoice_pdf_url",
      "customer_name",
      "customer_email",
      "customer_phone",
      "customer_address",
      "products",
    ];

    const rows = orders.map((order) => [
      order.id,
      order.createdAt || "",
      order.verifiedAt || "",
      order.status,
      order.amount ?? "",
      order.currency || "INR",
      order.paymentId || "",
      order.invoiceNumber || "",
      order.invoicePdfUrl || "",
      order.customer?.name || "",
      order.customer?.email || "",
      order.customer?.phone || "",
      order.customer?.address ||
        [
          order.customer?.addressLine1 || "",
          order.customer?.addressLine2 || "",
          order.customer?.city || "",
          order.customer?.state || "",
          order.customer?.zipCode || "",
        ]
          .filter(Boolean)
          .join(", "),
      (order.products || [])
        .map((item) => `${item?.name || "Item"} x${item?.quantity || 1}`)
        .join(" | "),
    ]);

    const csv = [header, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `managed-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
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

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" });
  };

  const inputClass =
    "border border-brand-sand/50 rounded-lg px-2 py-1 text-xs bg-white text-brand-charcoal focus:outline-none focus:border-brand-terracotta/40";

  /* ── Loading / access gates ── */
  if (sessionStatus === "loading" || !access)
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-brand-cream flex items-center justify-center font-body">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-brand-terracotta/30 border-t-brand-terracotta animate-spin" />
            <p className="text-sm text-brand-stone">Loading dashboard…</p>
          </div>
        </div>
      </>
    );

  if (!access.authenticated) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-brand-cream flex items-center justify-center font-body">
          <div className="glass-card p-8 text-center max-w-sm mx-auto animate-scale-in">
            <AlertCircle className="h-10 w-10 text-brand-terracotta mx-auto mb-3" />
            <p className="text-brand-charcoal font-medium">Sign in required</p>
            <p className="text-brand-stone text-sm mt-1">
              Please sign in to access the dashboard.
            </p>
          </div>
        </div>
      </>
    );
  }

  if (access.access === "none") {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-brand-cream flex items-center justify-center font-body">
          <div className="glass-card p-8 text-center max-w-sm mx-auto animate-scale-in">
            <Store className="h-10 w-10 text-brand-stone mx-auto mb-3" />
            <p className="text-brand-charcoal font-medium">No management access</p>
            <p className="text-brand-stone text-sm mt-1 mb-4">
              You don&apos;t have admin or merchant access yet.
            </p>
            <Link
              href="/merchant/onboarding"
              className="btn btn-primary text-sm"
            >
              Apply as Merchant
            </Link>
          </div>
        </div>
      </>
    );
  }

  if (access.access === "merchant_pending") {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-brand-cream flex items-center justify-center font-body">
          <div className="glass-card p-8 text-center max-w-sm mx-auto animate-scale-in">
            <div className="w-12 h-12 rounded-full bg-brand-mustard/10 flex items-center justify-center mx-auto mb-3">
              <RefreshCw className="h-6 w-6 text-brand-mustard" />
            </div>
            <p className="text-brand-charcoal font-semibold">Application pending</p>
            <p className="text-brand-stone text-sm mt-1 mb-4">
              Your merchant account is awaiting admin approval. We&apos;ll notify you soon.
            </p>
            <Link
              href="/merchant/onboarding"
              className="btn btn-secondary text-sm"
            >
              View Application
            </Link>
          </div>
        </div>
      </>
    );
  }

  const isAdmin = access.access === "admin";

  /* ── Sidebar nav config ── */
  type SidebarItem = {
    id: Section;
    label: string;
    icon: React.ReactNode;
    badge?: number;
    adminOnly?: boolean;
    merchantOnly?: boolean;
  };

  const sidebarItems = ([
    {
      id: "products" as Section,
      label: "Products",
      icon: <Package className="h-4 w-4" />,
      badge: products.length,
    },
    {
      id: "orders" as Section,
      label: "Orders",
      icon: <ShoppingBag className="h-4 w-4" />,
      badge: orders.length,
    },
    {
      id: "service" as Section,
      label: "Service Requests",
      icon: <ClipboardList className="h-4 w-4" />,
      badge: serviceRequests.filter((r) => r.status === "requested").length || undefined,
    },
    {
      id: "merchants" as Section,
      label: "Merchants",
      icon: <Users className="h-4 w-4" />,
      badge: pendingMerchants.length || undefined,
      adminOnly: true,
    },
    {
      id: "images" as Section,
      label: "Image Library",
      icon: <ImageIcon className="h-4 w-4" />,
      badge: imageTotal || undefined,
      merchantOnly: true,
    },
    {
      id: "bulk" as Section,
      label: "Bulk Upload",
      icon: <FileSpreadsheet className="h-4 w-4" />,
      merchantOnly: true,
    },
  ] as SidebarItem[]).filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.merchantOnly && isAdmin) return false;
    return true;
  });

  return (
    <>
      <Navbar />
      <div className="flex min-h-screen bg-brand-cream font-body">
        {/* ─── Sidebar ─── */}
        <aside className="dash-sidebar sticky top-[64px] self-start hidden md:flex">
          {/* Role badge */}
          <div className="px-3 mb-3">
            <span className={`badge ${isAdmin ? "badge-primary" : "badge-accent"}`}>
              {isAdmin ? "Admin" : "Merchant"}
            </span>
            {access.merchant && (
              <p className="text-xs text-brand-stone mt-1.5 truncate font-medium">
                {access.merchant.name}
              </p>
            )}
          </div>

          <span className="dash-nav-section">Management</span>

          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`dash-nav-item ${activeSection === item.id ? "dash-nav-item-active" : ""}`}
            >
              {item.icon}
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className={`badge ${item.id === "service" ? "badge-warning" : "badge-neutral"} text-[10px]`}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}

          <div className="mt-auto pt-4 border-t border-brand-sand/30 space-y-1">
            {!isAdmin && (
              <Link
                href="/merchant/storefront"
                className="dash-nav-item text-brand-terracotta hover:text-brand-coral"
              >
                <Store className="h-4 w-4" />
                Storefront Settings
              </Link>
            )}
            <Link href="/" className="dash-nav-item">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
            <button onClick={handleSignOut} className="dash-nav-item w-full text-left text-red-500 hover:bg-red-50 hover:text-red-600">
              Sign out
            </button>
          </div>
        </aside>

        {/* ─── Main Content ─── */}
        <main className="flex-1 min-w-0 p-4 md:p-6 lg:p-8 space-y-6">
          {/* Page Header */}
          <div className="animate-fade-up">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div>
                <h1 className="font-heading text-2xl md:text-3xl text-brand-charcoal">
                  {isAdmin ? "Admin Dashboard" : "Merchant Dashboard"}
                </h1>
                <p className="text-brand-stone text-sm mt-0.5">
                  {isAdmin
                    ? "Manage all products, orders, and merchants."
                    : "Manage your products, orders, and storefront."}
                </p>
              </div>
              {/* Mobile section nav */}
              <div className="flex md:hidden gap-2 flex-wrap">
                <select
                  value={activeSection}
                  onChange={(e) => setActiveSection(e.target.value as Section)}
                  className="border border-brand-sand/50 rounded-xl px-3 py-2 text-sm bg-white text-brand-charcoal"
                >
                  {sidebarItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <StatCard label="Products" value={products.length} icon={<Package className="h-4 w-4 text-brand-terracotta" />} />
              <StatCard label="Orders" value={orders.length} icon={<ShoppingBag className="h-4 w-4 text-brand-sage" />} />
              <StatCard
                label="Service Requests"
                value={serviceRequests.length}
                icon={<ClipboardList className="h-4 w-4 text-brand-mustard" />}
              />
              {isAdmin ? (
                <StatCard
                  label="Pending Merchants"
                  value={pendingMerchants.length}
                  icon={<Users className="h-4 w-4 text-brand-coral" />}
                  highlight={pendingMerchants.length > 0}
                />
              ) : (
                <StatCard label="Uploaded Images" value={imageTotal} icon={<ImageIcon className="h-4 w-4 text-brand-stone" />} />
              )}
            </div>

            {/* Merchant storefront banner */}
            {!isAdmin && (
              <div className="panel animate-fade-up delay-75 mb-6">
                <div className="panel-header">
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-brand-terracotta" />
                    <span className="text-sm font-semibold text-brand-charcoal">Your Public Storefront</span>
                  </div>
                  <div className="flex gap-2">
                    <Link href="/merchant/storefront" className="btn btn-primary btn-sm">
                      Storefront Settings
                    </Link>
                    <Link href="/merchant/storefront#seedhape-payments" className="btn btn-secondary btn-sm">
                      SeedhaPe
                    </Link>
                  </div>
                </div>
                <div className="panel-body py-3">
                  <p className="text-xs text-brand-stone">
                    Customize your store branding, chatbot, and payment credentials.
                  </p>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="alert alert-danger animate-fade-in">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* ── Products Section ── */}
          {activeSection === "products" && (
            <section className="animate-fade-up space-y-4">
              <div className="section-header">
                <h2 className="section-title">Managed Products</h2>
                {!isAdding && !editingProduct && (
                  <button
                    onClick={() => setIsAdding(true)}
                    className="btn btn-primary btn-sm"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Product
                  </button>
                )}
              </div>

              {(isAdding || editingProduct) && (
                <div className="panel animate-scale-in">
                  <div className="panel-header">
                    <h3 className="text-sm font-semibold text-brand-charcoal">
                      {editingProduct ? "Edit Product" : "New Product"}
                    </h3>
                    <button
                      onClick={() => { setIsAdding(false); setEditingProduct(null); }}
                      className="btn btn-ghost btn-sm"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="panel-body">
                    <AdminProductForm
                      product={editingProduct}
                      onSave={handleSave}
                      onCancel={() => { setIsAdding(false); setEditingProduct(null); }}
                    />
                  </div>
                </div>
              )}

              {isLoadingProducts ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1,2,3].map((i) => (
                    <div key={i} className="rounded-2xl overflow-hidden border border-brand-sand/30 bg-white">
                      <div className="skeleton h-40 w-full" />
                      <div className="p-4 space-y-2">
                        <div className="skeleton h-4 w-3/4" />
                        <div className="skeleton h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : products.length === 0 ? (
                <div className="panel">
                  <div className="empty-state">
                    <Package className="empty-state-icon" />
                    <p className="empty-state-text">No products yet. Add your first product.</p>
                    <button onClick={() => setIsAdding(true)} className="btn btn-primary btn-sm mt-2">
                      <Plus className="h-3.5 w-3.5" />
                      Add Product
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {products.map((p, i) => (
                    <div
                      key={p._id}
                      className="hover-lift panel overflow-hidden animate-fade-up"
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      <div className="relative h-44 bg-brand-parchment">
                        {p.imageUrl ? (
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-10 w-10 text-brand-sand" />
                          </div>
                        )}
                        <span className="absolute top-2 right-2 badge badge-accent">
                          {p.category}
                        </span>
                      </div>
                      <div className="p-4 space-y-2">
                        <h3 className="text-sm font-semibold text-brand-charcoal line-clamp-1">{p.name}</h3>
                        {p.brand && <p className="text-xs text-brand-stone">{p.brand}</p>}
                        <p className="text-brand-terracotta font-semibold text-sm">
                          ₹{(p.price as number).toFixed(2)}
                        </p>
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => setEditingProduct(p)}
                            className="btn btn-secondary btn-sm flex-1"
                          >
                            <Pencil className="h-3 w-3" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(p._id!)}
                            className="btn btn-danger btn-sm flex-1"
                          >
                            <Trash2 className="h-3 w-3" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ── Orders Section ── */}
          {activeSection === "orders" && (
            <section className="animate-fade-up space-y-4">
              <div className="section-header">
                <h2 className="section-title">Orders</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={downloadOrdersCsv}
                    className="btn btn-secondary btn-sm"
                    disabled={orders.length === 0}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export CSV
                  </button>
                  <button onClick={loadOrders} className="btn btn-ghost btn-sm">
                    <RefreshCw className="h-3.5 w-3.5" />
                    Refresh
                  </button>
                </div>
              </div>

              {orderUpdateFeedback && (
                <div className={`alert ${orderUpdateFeedback.type === "success" ? "alert-success" : "alert-danger"} animate-fade-in`}>
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {orderUpdateFeedback.message}
                </div>
              )}

              {isLoadingOrders ? (
                <div className="panel">
                  <div className="panel-body">
                    <div className="space-y-3">
                      {[1,2,3].map((i) => <div key={i} className="skeleton h-12 w-full rounded-xl" />)}
                    </div>
                  </div>
                </div>
              ) : orders.length === 0 ? (
                <div className="panel">
                  <div className="empty-state">
                    <ShoppingBag className="empty-state-icon" />
                    <p className="empty-state-text">No orders yet.</p>
                  </div>
                </div>
              ) : (
                <div className="panel overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="rasphia-table">
                      <thead>
                        <tr>
                          <th>Details</th>
                          <th>Order ID</th>
                          <th>Customer</th>
                          <th>Amount</th>
                          <th>Status</th>
                          <th>Invoice</th>
                          <th>Shipping</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((o) => {
                          const isExpanded = expandedOrderId === o.id;
                          return (
                            <React.Fragment key={o.id}>
                              <tr>
                                <td>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedOrderId((prev) => (prev === o.id ? null : o.id))
                                    }
                                    className="btn btn-ghost btn-sm"
                                  >
                                    {isExpanded ? (
                                      <ChevronUp className="h-4 w-4" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4" />
                                    )}
                                    Expand
                                  </button>
                                </td>
                                <td>
                                  <span className="font-mono text-xs text-brand-stone/70 truncate block max-w-[120px]">
                                    {o.id}
                                  </span>
                                  {o.createdAt && (
                                    <span className="text-xs text-brand-stone/50">
                                      {new Date(o.createdAt).toLocaleDateString()}
                                    </span>
                                  )}
                                </td>
                                <td>
                                  <p className="font-medium text-sm text-brand-charcoal">
                                    {o.customer?.name || "—"}
                                  </p>
                                  <p className="text-xs text-brand-stone">{o.customer?.email || "—"}</p>
                                </td>
                                <td>
                                  <span className="font-semibold text-brand-charcoal">
                                    {formatCurrency(o.amount, o.currency || "INR")}
                                  </span>
                                </td>
                                <td>
                                  <select
                                    value={o.status}
                                    onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value)}
                                    disabled={Boolean(updatingOrderIds[o.id])}
                                    className={`${inputClass} min-w-[110px]`}
                                  >
                                    {ORDER_STATUSES.map((s) => (
                                      <option key={s} value={s}>{s}</option>
                                    ))}
                                  </select>
                                </td>
                                <td>
                                  <div className="flex min-w-[140px] flex-col gap-1">
                                    {o.invoiceNumber ? (
                                      <>
                                        <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-charcoal">
                                          <FileText className="h-3.5 w-3.5" />
                                          {o.invoiceNumber}
                                        </span>
                                        {o.invoicePdfUrl ? (
                                          <a
                                            href={o.invoicePdfUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-xs text-brand-sage underline"
                                          >
                                            View invoice
                                          </a>
                                        ) : (
                                          <span className="text-xs text-brand-stone">
                                            Invoice generated
                                          </span>
                                        )}
                                      </>
                                    ) : (
                                      <span className="text-xs text-brand-stone">Not generated yet</span>
                                    )}
                                  </div>
                                </td>
                                <td>
                                  <div className="flex flex-wrap gap-1.5 items-center">
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
                                      className={`${inputClass} w-20`}
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
                                      className={`${inputClass} w-24`}
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
                                      className={`${inputClass} w-32`}
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
                                      className="btn btn-secondary btn-sm"
                                    >
                                      {updatingOrderIds[o.id] ? "Saving…" : "Save"}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                              {isExpanded ? (
                                <tr>
                                  <td colSpan={7} className="bg-brand-sand/10">
                                    <div className="grid gap-4 p-4 md:grid-cols-2">
                                      <div className="space-y-3">
                                        <div>
                                          <p className="text-xs font-semibold uppercase tracking-wide text-brand-stone">
                                            Customer
                                          </p>
                                          <p className="text-sm text-brand-charcoal">
                                            {o.customer?.name || "—"} · {o.customer?.email || "—"}
                                          </p>
                                          <p className="text-sm text-brand-stone">{o.customer?.phone || "—"}</p>
                                          <p className="text-sm text-brand-stone">
                                            {o.customer?.address ||
                                              [
                                                o.customer?.addressLine1 || "",
                                                o.customer?.addressLine2 || "",
                                                o.customer?.city || "",
                                                o.customer?.state || "",
                                                o.customer?.zipCode || "",
                                              ]
                                                .filter(Boolean)
                                                .join(", ") ||
                                              "—"}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-xs font-semibold uppercase tracking-wide text-brand-stone">
                                            Payment
                                          </p>
                                          <p className="text-sm text-brand-charcoal">
                                            Provider: {o.customer?.paymentProvider || o.mode || "—"}
                                          </p>
                                          <p className="text-sm text-brand-stone">Payment ID: {o.paymentId || "—"}</p>
                                          <p className="text-sm text-brand-stone">Receipt: {o.receipt || "—"}</p>
                                          <p className="text-sm text-brand-stone">
                                            Verified: {o.verifiedAt ? new Date(o.verifiedAt).toLocaleString() : "—"}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-xs font-semibold uppercase tracking-wide text-brand-stone">
                                            Invoice
                                          </p>
                                          <p className="text-sm text-brand-charcoal">
                                            {o.invoiceNumber || "Not generated"}
                                          </p>
                                          <p className="text-sm text-brand-stone">
                                            Status: {o.invoiceSyncStatus || "—"}
                                          </p>
                                          {o.invoiceGeneratedAt ? (
                                            <p className="text-sm text-brand-stone">
                                              Generated: {new Date(o.invoiceGeneratedAt).toLocaleString()}
                                            </p>
                                          ) : null}
                                          {o.invoiceSyncError ? (
                                            <p className="text-sm text-red-700">{o.invoiceSyncError}</p>
                                          ) : null}
                                        </div>
                                      </div>
                                      <div className="space-y-3">
                                        <div>
                                          <p className="text-xs font-semibold uppercase tracking-wide text-brand-stone">
                                            Products
                                          </p>
                                          <div className="space-y-2">
                                            {(o.products || []).length > 0 ? (
                                              (o.products || []).map((item, index) => (
                                                <div
                                                  key={`${o.id}-item-${index}`}
                                                  className="rounded-xl border border-brand-sand/50 bg-white/70 p-3"
                                                >
                                                  <p className="text-sm font-medium text-brand-charcoal">
                                                    {item?.name || "Item"} x{item?.quantity || 1}
                                                  </p>
                                                  <p className="text-xs text-brand-stone">
                                                    {item?.brand || "—"} ·{" "}
                                                    {formatCurrency(Number(item?.price || 0), o.currency || "INR")}
                                                  </p>
                                                  {item?.productId ? (
                                                    <p className="font-mono text-[11px] text-brand-stone/70">
                                                      {item.productId}
                                                    </p>
                                                  ) : null}
                                                </div>
                                              ))
                                            ) : (
                                              <p className="text-sm text-brand-stone">No product details available.</p>
                                            )}
                                          </div>
                                        </div>
                                        <div>
                                          <p className="text-xs font-semibold uppercase tracking-wide text-brand-stone">
                                            Status history
                                          </p>
                                          <div className="space-y-1">
                                            {(o.statusHistory || []).length > 0 ? (
                                              (o.statusHistory || []).map((entry, index) => (
                                                <p
                                                  key={`${o.id}-history-${index}`}
                                                  className="text-xs text-brand-stone"
                                                >
                                                  {String(entry.status || "status")} · {String(entry.note || "—")} ·{" "}
                                                  {typeof entry.at === "string"
                                                    ? new Date(entry.at).toLocaleString()
                                                    : "—"}
                                                </p>
                                              ))
                                            ) : (
                                              <p className="text-xs text-brand-stone">No status history available.</p>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              ) : null}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ── Service Requests Section ── */}
          {activeSection === "service" && (
            <section className="animate-fade-up space-y-4">
              <div className="section-header">
                <h2 className="section-title">Service Requests</h2>
                <button onClick={loadServiceRequests} className="btn btn-ghost btn-sm">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh
                </button>
              </div>

              {isLoadingServiceRequests ? (
                <div className="panel">
                  <div className="panel-body">
                    <div className="space-y-3">
                      {[1,2,3].map((i) => <div key={i} className="skeleton h-12 w-full rounded-xl" />)}
                    </div>
                  </div>
                </div>
              ) : serviceRequests.length === 0 ? (
                <div className="panel">
                  <div className="empty-state">
                    <ClipboardList className="empty-state-icon" />
                    <p className="empty-state-text">No service requests yet.</p>
                  </div>
                </div>
              ) : (
                <div className="panel overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="rasphia-table">
                      <thead>
                        <tr>
                          <th>Request ID</th>
                          <th>Order</th>
                          <th>Type</th>
                          <th>Reason</th>
                          <th>Requested By</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {serviceRequests.map((r) => (
                          <tr key={r.requestId}>
                            <td>
                              <span className="font-mono text-xs text-brand-stone/70">
                                {r.requestId.slice(0, 10)}…
                              </span>
                            </td>
                            <td>
                              <span className="text-sm text-brand-charcoal">{r.orderId}</span>
                            </td>
                            <td>
                              <span className="badge badge-neutral uppercase text-[10px]">
                                {r.type}
                              </span>
                            </td>
                            <td>
                              <span className="text-sm text-brand-stone max-w-[140px] block truncate">
                                {r.reason}
                              </span>
                            </td>
                            <td>
                              <span className="text-xs text-brand-stone">{r.requestedByEmail}</span>
                            </td>
                            <td>
                              <select
                                value={r.status}
                                onChange={(e) =>
                                  handleUpdateServiceRequest(r.requestId, e.target.value)
                                }
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
                </div>
              )}
            </section>
          )}

          {/* ── Merchants Section (Admin only) ── */}
          {activeSection === "merchants" && isAdmin && (
            <section className="animate-fade-up space-y-4">
              <div className="section-header">
                <h2 className="section-title">Pending Merchant Approvals</h2>
                <button onClick={loadPendingMerchants} className="btn btn-ghost btn-sm">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh
                </button>
              </div>

              {pendingMerchants.length === 0 ? (
                <div className="panel">
                  <div className="empty-state">
                    <Users className="empty-state-icon" />
                    <p className="empty-state-text">No pending applications.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingMerchants.map((m, i) => (
                    <div
                      key={m.id}
                      className="panel animate-fade-up"
                      style={{ animationDelay: `${i * 50}ms` }}
                    >
                      <div className="panel-body">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="avatar avatar-md bg-brand-terracotta/10 text-brand-terracotta font-semibold">
                              {m.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-brand-charcoal">{m.name}</p>
                              <p className="text-sm text-brand-stone">{m.email}</p>
                              <p className="text-xs text-brand-stone/70">{m.phone}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleMerchantAction(m.id, "approve")}
                              className="btn btn-success btn-sm"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleMerchantAction(m.id, "reject")}
                              className="btn btn-danger btn-sm"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ── Image Library (Merchant only) ── */}
          {activeSection === "images" && !isAdmin && (
            <section className="animate-fade-up space-y-4">
              <div className="section-header">
                <h2 className="section-title">Image Library</h2>
                <label className="btn btn-primary btn-sm cursor-pointer">
                  <UploadCloud className="h-3.5 w-3.5" />
                  {isUploadingProductImage ? "Uploading…" : "Upload Image"}
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

              <p className="text-xs text-brand-stone">
                Upload images to get public URLs for use in product listings.
              </p>

              {imageUploadError && (
                <div className="alert alert-danger">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {imageUploadError}
                </div>
              )}

              {isLoadingImages ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {[1,2,3,4,5,6].map((i) => (
                    <div key={i} className="rounded-2xl overflow-hidden border border-brand-sand/30">
                      <div className="skeleton h-36 w-full" />
                      <div className="p-3 space-y-2">
                        <div className="skeleton h-3 w-3/4" />
                        <div className="skeleton h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : imageAssets.length === 0 ? (
                <div className="panel">
                  <div className="empty-state">
                    <ImageIcon className="empty-state-icon" />
                    <p className="empty-state-text">No images uploaded yet.</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {imageAssets.map((asset, i) => (
                      <article
                        key={asset.id}
                        className="panel overflow-hidden hover-lift animate-fade-up"
                        style={{ animationDelay: `${i * 40}ms` }}
                      >
                        <div className="relative">
                          <img
                            src={asset.url}
                            alt={asset.originalName}
                            loading="lazy"
                            className="h-36 w-full object-cover bg-brand-parchment/50"
                          />
                        </div>
                        <div className="p-3 space-y-1.5">
                          <p className="truncate text-sm font-medium text-brand-charcoal">
                            {asset.originalName}
                          </p>
                          <p className="text-xs text-brand-stone">
                            {formatBytes(asset.sizeBytes)}
                            {asset.width && asset.height
                              ? ` · ${asset.width}×${asset.height}`
                              : ""}
                          </p>
                          <p className="text-xs text-brand-stone/60">
                            {new Date(asset.createdAt).toLocaleDateString()}
                          </p>
                          <button
                            type="button"
                            onClick={() => handleCopyImageUrl(asset)}
                            className="btn btn-secondary btn-sm w-full mt-1"
                          >
                            {imageCopiedId === asset.id ? (
                              <>
                                <Check className="h-3 w-3 text-green-600" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" />
                                Copy URL
                              </>
                            )}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      disabled={imagePage <= 1}
                      onClick={() => setImagePage((p) => Math.max(1, p - 1))}
                      className="btn btn-secondary btn-sm"
                    >
                      Previous
                    </button>
                    <span className="text-xs text-brand-stone">
                      Page {imagePage} of {imageTotalPages} · {imageTotal} total
                    </span>
                    <button
                      type="button"
                      disabled={imagePage >= imageTotalPages}
                      onClick={() => setImagePage((p) => Math.min(imageTotalPages, p + 1))}
                      className="btn btn-secondary btn-sm"
                    >
                      Next
                    </button>
                  </div>
                </>
              )}
            </section>
          )}

          {/* ── Bulk Upload (Merchant only) ── */}
          {activeSection === "bulk" && !isAdmin && (
            <section className="animate-fade-up space-y-4">
              <div className="section-header">
                <h2 className="section-title">Bulk Product Upload</h2>
              </div>

              <div className="panel">
                <div className="panel-header">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-brand-terracotta" />
                    <span className="text-sm font-semibold text-brand-charcoal">CSV Import</span>
                  </div>
                </div>
                <div className="panel-body space-y-4">
                  <p className="text-sm text-brand-stone">
                    Download the template, fill in your products, preview the CSV, then import valid rows.
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <a
                      href="/templates/merchant-products-bulk-upload-sample.csv"
                      download
                      className="btn btn-secondary btn-sm"
                    >
                      Download Template
                    </a>
                    <label className="btn btn-secondary btn-sm cursor-pointer">
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                      {bulkCsvFile ? bulkCsvFile.name : "Choose CSV"}
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
                      className="btn btn-secondary btn-sm"
                    >
                      {bulkIsPreviewing ? "Previewing…" : "Preview CSV"}
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
                      className="btn btn-primary btn-sm"
                    >
                      {bulkIsImporting ? "Importing…" : "Import Valid Rows"}
                    </button>
                  </div>

                  {bulkError && (
                    <div className="alert alert-danger">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      {bulkError}
                    </div>
                  )}

                  {bulkSummary && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <MiniStat label="Total Rows" value={bulkSummary.totalRows} />
                      <MiniStat label="Valid Rows" value={bulkSummary.validRows} color="green" />
                      <MiniStat label="Invalid Rows" value={bulkSummary.invalidRows} color="amber" />
                      <MiniStat
                        label={bulkSummary.dryRun ? "Ready to Import" : "Created"}
                        value={bulkSummary.dryRun ? bulkSummary.validRows : Number(bulkSummary.createdCount || 0)}
                      />
                    </div>
                  )}

                  {bulkPreviewRows.length > 0 && (
                    <div className="overflow-x-auto rounded-xl border border-brand-sand/40 bg-white">
                      <table className="rasphia-table min-w-full">
                        <thead>
                          <tr>
                            {["Name", "Category", "Price", "Stock", "Image URL"].map((h) => (
                              <th key={h}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {bulkPreviewRows.slice(0, 8).map((row, idx) => (
                            <tr key={`${row.name}-${idx}`}>
                              <td>{row.name}</td>
                              <td>{row.category}</td>
                              <td>₹{row.price}</td>
                              <td>{row.stockQuantity}</td>
                              <td className="max-w-[200px] truncate text-brand-stone text-xs">
                                {row.imageUrl}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {bulkRowErrors.length > 0 && (
                    <div className="alert alert-warning">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-sm">Row Errors ({bulkRowErrors.length})</p>
                        <div className="mt-2 max-h-40 overflow-auto space-y-1">
                          {bulkRowErrors.slice(0, 20).map((err, idx) => (
                            <p key={`${err.row}-${err.field}-${idx}`} className="text-xs">
                              Row {err.row} · {err.field}: {err.message}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    </>
  );
}

/* ── Helper Components ── */

function StatCard({
  label,
  value,
  icon,
  highlight,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className={`stat-card animate-fade-up ${highlight ? "border-brand-coral/30 bg-red-50/30" : ""}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="stat-card-label">{label}</span>
        {icon}
      </div>
      <span className="stat-card-value">{value}</span>
    </div>
  );
}

function MiniStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: "green" | "amber";
}) {
  const colorMap = {
    green: "border-green-200 bg-green-50 text-green-800",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
  };
  const cls = color ? colorMap[color] : "border-brand-sand/50 bg-white text-brand-charcoal";
  return (
    <div className={`rounded-xl border px-3 py-2 ${cls}`}>
      <p className="text-xs opacity-70">{label}</p>
      <p className="font-semibold text-lg leading-tight">{value}</p>
    </div>
  );
}
