"use client";
import React, { useEffect, useState } from "react";
import type { UserProfile, Order, Product, OrderStatus } from "../types";
import CartModal from "./CartModal";
import ProductCard from "./ProductCard";
import {
  ArrowLeft,
  User,
  Package,
  Heart,
  ShoppingCart,
  Settings,
  RotateCcw,
  Edit3,
  Check,
  X,
} from "lucide-react";
import BrandLogo from "./brand/BrandLogo";

interface ProfilePageProps {
  user: UserProfile;
  cart: Product[];
  onBack: () => void;
  onAddToCart: (product: Product) => void;
  onCheckout: () => void;
  onToggleWishlist: (product: Product) => void;
  onStartReview: (order: Order) => void;
  onRemoveFromCart: (product: Product) => void;
}

type Tab = "profile" | "orders" | "wishlist" | "requests";

const statusStyles: Record<OrderStatus, string> = {
  created:     "bg-brand-parchment text-brand-stone border-brand-sand/50",
  paid:        "bg-green-50 text-green-700 border-green-200",
  Processing:  "bg-amber-50 text-amber-700 border-amber-200",
  Shipped:     "bg-blue-50 text-blue-700 border-blue-200",
  Delivered:   "bg-green-50 text-green-700 border-green-200",
  Paid:        "bg-green-50 text-green-700 border-green-200",
  Cancelled:   "bg-brand-parchment text-brand-stone border-brand-sand/50",
  Refunded:    "bg-red-50 text-red-700 border-red-200",
  Replacement: "bg-indigo-50 text-indigo-700 border-indigo-200",
};

const OrderStatusBadge = ({ status }: { status: OrderStatus }) => (
  <span
    className={`px-2.5 py-0.5 text-[10px] uppercase tracking-wider font-semibold rounded-full border ${
      statusStyles[status] || "bg-brand-parchment text-brand-stone border-brand-sand/50"
    }`}
  >
    {status}
  </span>
);

const ProfilePage: React.FC<ProfilePageProps> = ({
  user,
  cart,
  onBack,
  onAddToCart,
  onCheckout,
  onToggleWishlist,
  onStartReview,
  onRemoveFromCart,
}) => {
  type UserServiceRequest = {
    requestId: string;
    requestNumber?: string | null;
    orderId: string;
    type: "refund" | "replacement" | "cancellation";
    status: string;
    reason: string;
    details?: string | null;
    createdAt: string;
  };

  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<UserProfile>(user);
  const [orders, setOrders] = useState<Order[]>([]);
  const [serviceRequests, setServiceRequests] = useState<UserServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [requestModal, setRequestModal] = useState<{
    open: boolean;
    orderId: string;
    type: "refund" | "replacement" | "cancellation" | null;
    reason: string;
    details: string;
  }>({ open: false, orderId: "", type: null, reason: "", details: "" });

  useEffect(() => {
    const loadProfileAndOrders = async () => {
      try {
        const [profileRes, ordersRes] = await Promise.all([
          fetch(`/api/user/get-profile?email=${encodeURIComponent(user.email)}`),
          fetch(`/api/orders?email=${encodeURIComponent(user.email)}`),
        ]);
        const profileData = await profileRes.json();
        const ordersData = await ordersRes.json();
        const serviceRequestsRes = await fetch("/api/orders/service-requests");
        const serviceRequestsData = serviceRequestsRes.ok ? await serviceRequestsRes.json() : [];

        const normalizedOrders: Order[] = (ordersData || []).map((o: any) => ({
          ...o,
          id: o.providerOrderId ?? o.orderId ?? o.order_id ?? o.id ?? o._id,
          internalOrderId: o.internalOrderId ?? null,
          providerOrderId: o.providerOrderId ?? o.orderId ?? o.order_id ?? o.id ?? o._id,
          appOrderId: o.appOrderId ?? o.receipt ?? null,
          products: Array.isArray(o.products)
            ? o.products
            : o.product
            ? [o.product]
            : Array.isArray(o.items)
            ? o.items
            : [],
        }));
        const normalizedServiceRequests: UserServiceRequest[] = (serviceRequestsData || []).map(
          (r: any) => ({
            requestId: r.requestId || r.request_id,
            requestNumber: r.requestNumber || r.request_number || null,
            orderId: r.orderId || r.order_id,
            type: r.type,
            status: r.status,
            reason: r.reason,
            details: r.details || null,
            createdAt: r.createdAt,
          })
        );

        if (profileData) setProfile(profileData);
        if (normalizedOrders) setOrders(normalizedOrders);
        setServiceRequests(normalizedServiceRequests);
      } catch (err) {
        console.error("Error fetching profile/orders:", err);
      } finally {
        setLoading(false);
      }
    };
    if (user?.email) loadProfileAndOrders();
  }, [user]);

  const handleSave = async () => {
    try {
      await fetch("/api/user/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      setIsEditing(false);
    } catch (err) {
      console.error("Profile update failed:", err);
    }
  };

  const handleServiceRequest = async () => {
    if (!requestModal.orderId || !requestModal.type || !requestModal.reason.trim()) return;
    try {
      setIsSubmittingRequest(true);
      const res = await fetch("/api/orders/service-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: requestModal.orderId,
          type: requestModal.type,
          reason: requestModal.reason.trim(),
          details: requestModal.details.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.error || "Failed");
      }
      const created = await res.json();
      setServiceRequests((prev) => [
        {
          requestId: created.requestId || created.request_id,
          requestNumber: created.requestNumber || created.request_number || null,
          orderId: created.orderId || created.order_id,
          type: created.type,
          status: created.status,
          reason: created.reason,
          details: created.details || null,
          createdAt: created.createdAt || new Date().toISOString(),
        },
        ...prev,
      ]);
      setRequestModal({ open: false, orderId: "", type: null, reason: "", details: "" });
      alert(
        `${
          requestModal.type === "refund"
            ? "Refund"
            : requestModal.type === "replacement"
            ? "Replacement"
            : "Cancellation"
        } request submitted.`
      );
    } catch (err) {
      console.error("Service request error:", err);
      alert("Could not submit your request.");
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(price);

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center bg-brand-cream">
        <div className="flex flex-col items-center gap-4">
          <BrandLogo size={40} />
          <p className="text-sm text-brand-stone">Loading profile…</p>
        </div>
      </div>
    );

  const inputClass =
    "w-full px-3 py-2 rounded-xl bg-white border border-brand-sand/60 text-sm text-brand-charcoal focus:outline-none focus:border-brand-terracotta/50 focus:ring-2 focus:ring-brand-terracotta/10 transition-all";

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: "profile", label: "Profile", icon: <User className="h-4 w-4" /> },
    { id: "orders", label: "Orders", icon: <Package className="h-4 w-4" />, count: orders.length || undefined },
    { id: "wishlist", label: "Wishlist", icon: <Heart className="h-4 w-4" />, count: profile.wishlist?.length || undefined },
    { id: "requests", label: "Requests", icon: <RotateCcw className="h-4 w-4" />, count: serviceRequests.length || undefined },
  ];

  // --- Summary stats ---
  const totalSpend = orders.reduce(
    (sum, o) =>
      sum +
      ((o as any).products ?? []).reduce(
        (s: number, p: Product) => s + (p.price || 0) * (p.quantity || 1),
        0
      ),
    0
  );

  return (
    <div className="relative h-screen w-full bg-brand-hero overflow-hidden font-body">
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-20 right-[-5%] h-80 w-80 rounded-full bg-brand-clay/15 blur-[90px]" />
        <div className="absolute bottom-[-10%] left-[10%] h-60 w-60 rounded-full bg-brand-sage/12 blur-[80px]" />
      </div>

      <div className="h-full w-full max-w-5xl mx-auto flex flex-col p-2 sm:p-3">
        {/* Header */}
        <header className="flex-shrink-0 h-14 px-4 flex items-center justify-between bg-white/70 backdrop-blur-xl border border-brand-sand/40 rounded-2xl mb-3 shadow-soft">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="h-8 w-8 flex items-center justify-center rounded-xl hover:bg-brand-parchment text-brand-stone hover:text-brand-charcoal transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <BrandLogo size={24} showWordmark wordmarkClassName="text-[13px] font-semibold hidden sm:block" />
            <span className="text-brand-sand/60 hidden sm:block">·</span>
            <h1 className="text-sm font-semibold text-brand-charcoal font-heading">My Account</h1>
          </div>
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative h-9 w-9 flex items-center justify-center rounded-xl bg-white border border-brand-sand/50 text-brand-stone hover:text-brand-charcoal hover:bg-brand-parchment transition-colors shadow-soft"
            aria-label="View cart"
          >
            <ShoppingCart className="h-4 w-4" />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-brand-coral text-white text-[9px] font-bold flex items-center justify-center">
                {cart.length}
              </span>
            )}
          </button>
        </header>

        {/* Main content */}
        <div className="flex-1 overflow-hidden flex flex-col bg-white/75 backdrop-blur-xl border border-brand-sand/30 rounded-2xl shadow-soft-md">

          {/* User hero band */}
          <div className="flex-shrink-0 px-6 py-5 border-b border-brand-sand/30 bg-gradient-to-r from-brand-parchment/60 to-transparent flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-brand-terracotta/10 border border-brand-sand/40 flex items-center justify-center flex-shrink-0 shadow-soft">
              {(profile as any).profileImage ? (
                <img src={(profile as any).profileImage} className="h-full w-full object-cover rounded-2xl" alt="avatar" />
              ) : (
                <span className="text-xl font-semibold text-brand-terracotta font-heading">
                  {(profile.name?.[0] ?? profile.email?.[0] ?? "?").toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <h2 className="font-heading text-lg text-brand-charcoal truncate">{profile.name || "Your Account"}</h2>
              <p className="text-xs text-brand-stone truncate">{profile.email}</p>
            </div>
            <div className="ml-auto hidden sm:flex items-center gap-4">
              <div className="text-center">
                <p className="font-heading text-xl text-brand-charcoal">{orders.length}</p>
                <p className="text-[10px] text-brand-stone uppercase tracking-widest">Orders</p>
              </div>
              <div className="h-8 w-px bg-brand-sand/40" />
              <div className="text-center">
                <p className="font-heading text-xl text-brand-charcoal">{profile.wishlist?.length ?? 0}</p>
                <p className="text-[10px] text-brand-stone uppercase tracking-widest">Wishlist</p>
              </div>
              <div className="h-8 w-px bg-brand-sand/40" />
              <div className="text-center">
                <p className="font-heading text-xl text-brand-terracotta">{formatPrice(totalSpend)}</p>
                <p className="text-[10px] text-brand-stone uppercase tracking-widest">Spent</p>
              </div>
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex-shrink-0 flex border-b border-brand-sand/30 bg-white/40 px-2 gap-0.5 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-brand-terracotta text-brand-charcoal"
                    : "border-transparent text-brand-stone hover:text-brand-charcoal hover:bg-brand-parchment/40"
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                    activeTab === tab.id ? "bg-brand-terracotta/10 text-brand-terracotta" : "bg-brand-sand/40 text-brand-stone"
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6">

            {/* ── PROFILE TAB ── */}
            {activeTab === "profile" && (
              <div className="max-w-2xl space-y-5">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-heading text-base text-brand-charcoal flex items-center gap-2">
                    <Settings className="h-4 w-4 text-brand-stone" />
                    Personal information
                  </h3>
                  {!isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-charcoal bg-brand-parchment border border-brand-sand/50 rounded-xl hover:bg-brand-sand/30 transition-colors"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Edit
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 bg-white/60 border border-brand-sand/30 rounded-2xl">
                  {(["name", "email", "phone", "address"] as const).map((field) => (
                    <div key={field} className={field === "address" ? "sm:col-span-2" : ""}>
                      <label className="text-[10px] uppercase tracking-widest font-semibold text-brand-stone/60 block mb-1.5">
                        {field === "email" ? "Email address" : field}
                      </label>
                      {isEditing ? (
                        field === "address" ? (
                          <textarea
                            rows={2}
                            value={profile.address}
                            onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                            className={`${inputClass} resize-none`}
                          />
                        ) : (
                          <input
                            value={profile[field as keyof UserProfile] as string}
                            onChange={(e) => setProfile({ ...profile, [field]: e.target.value })}
                            className={inputClass}
                          />
                        )
                      ) : (
                        <div className="px-3 py-2 rounded-xl bg-brand-parchment/40 border border-brand-sand/30 text-sm text-brand-charcoal min-h-[38px] flex items-center">
                          {(profile[field as keyof UserProfile] as string) || (
                            <span className="text-brand-stone/40 italic text-xs">Not set</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {isEditing && (
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-brand-stone border border-brand-sand/50 rounded-xl hover:bg-brand-parchment transition-colors"
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-brand-charcoal rounded-xl hover:bg-brand-warm-black transition-colors shadow-soft"
                    >
                      <Check className="h-4 w-4" />
                      Save changes
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── ORDERS TAB ── */}
            {activeTab === "orders" && (
              <div className="space-y-3">
                {orders.length === 0 ? (
                  <div className="py-16 text-center">
                    <div className="h-16 w-16 rounded-2xl bg-brand-parchment/60 border border-brand-sand/40 flex items-center justify-center mx-auto mb-4">
                      <Package className="h-7 w-7 text-brand-sand" />
                    </div>
                    <p className="font-medium text-brand-charcoal">No orders yet</p>
                    <p className="text-sm text-brand-stone mt-1">Your purchases will appear here.</p>
                  </div>
                ) : (
                  orders.map((order) => {
                    const items: Product[] =
                      (order as any).products ??
                      ((order as any).product ? [(order as any).product] : []);
                    const firstProduct = items[0] || {};
                    const trackingNumber = (order as any).trackingNumber as string | undefined;
                    const trackingUrl = (order as any).trackingUrl as string | undefined;
                    const shippingProvider = (order as any).shippingProvider as string | undefined;
                    const estimatedDelivery = (order as any).estimatedDelivery as string | undefined;
                    const normalizedStatus = String(order.status || "").trim().toLowerCase();
                    const isDelivered = normalizedStatus === "delivered";
                    const canCancel = ["created", "paid", "processing"].includes(normalizedStatus);

                    return (
                      <div
                        key={order.id}
                        className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-white/70 border border-brand-sand/30 rounded-2xl hover:shadow-soft transition-all"
                      >
                        <div className="h-16 w-16 rounded-xl overflow-hidden flex-shrink-0 border border-brand-sand/20 bg-brand-parchment/40">
                          <img
                            src={firstProduct.imageUrl || "/placeholder.png"}
                            alt={firstProduct.name || "Product"}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="text-sm font-semibold text-brand-charcoal truncate">
                              {items.length > 1
                                ? `${firstProduct.name} + ${items.length - 1} more`
                                : firstProduct.name}
                            </h3>
                            <OrderStatusBadge status={order.status} />
                          </div>
                          {(order as any).appOrderId ? (
                            <p className="text-[10px] text-brand-stone/50 font-mono">
                              Order #{(order as any).appOrderId}
                            </p>
                          ) : (
                            <p className="text-[10px] text-brand-stone/50 font-mono">
                              Order #{order.id}
                            </p>
                          )}
                          {(order as any).appOrderId ? (
                            <p className="text-[10px] text-brand-stone/50 font-mono">
                              Payment Ref #{order.id}
                            </p>
                          ) : null}
                          {(trackingNumber || shippingProvider || estimatedDelivery) && (
                            <div className="mt-1.5 text-xs text-brand-stone/70 space-y-0.5">
                              {shippingProvider && <p>Carrier: {shippingProvider}</p>}
                              {trackingNumber && (
                                <p>
                                  Tracking:{" "}
                                  {trackingUrl ? (
                                    <a
                                      href={trackingUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-brand-terracotta underline"
                                    >
                                      {trackingNumber}
                                    </a>
                                  ) : (
                                    trackingNumber
                                  )}
                                </p>
                              )}
                              {estimatedDelivery && (
                                <p>
                                  ETA:{" "}
                                  {new Date(estimatedDelivery).toLocaleDateString("en-IN", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <p className="font-semibold text-brand-charcoal text-base">
                            {formatPrice(
                              items.reduce(
                                (sum, p) => sum + (p.price || 0) * (p.quantity || 1),
                                0
                              )
                            )}
                          </p>
                          <div className="flex gap-1.5 flex-wrap justify-end">
                            {isDelivered && !order.isReviewed && (
                              <button
                                onClick={() => onStartReview(order)}
                                className="px-2.5 py-1 text-[10px] font-medium text-brand-terracotta bg-brand-parchment border border-brand-sand/40 rounded-full hover:bg-brand-sand/30 transition-colors"
                              >
                                Review
                              </button>
                            )}
                            {isDelivered && (
                              <>
                                <button
                                  onClick={() =>
                                    setRequestModal({
                                      open: true,
                                      orderId: order.id,
                                      type: "refund",
                                      reason: "",
                                      details: "",
                                    })
                                  }
                                  className="px-2.5 py-1 text-[10px] font-medium text-red-700 bg-red-50 border border-red-200 rounded-full hover:bg-red-100 transition-colors"
                                >
                                  Refund
                                </button>
                                <button
                                  onClick={() =>
                                    setRequestModal({
                                      open: true,
                                      orderId: order.id,
                                      type: "replacement",
                                      reason: "",
                                      details: "",
                                    })
                                  }
                                  className="px-2.5 py-1 text-[10px] font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-full hover:bg-blue-100 transition-colors"
                                >
                                  Replace
                                </button>
                              </>
                            )}
                            {canCancel && (
                              <button
                                onClick={() =>
                                  setRequestModal({
                                    open: true,
                                    orderId: order.id,
                                    type: "cancellation",
                                    reason: "",
                                    details: "",
                                  })
                                }
                                className="px-2.5 py-1 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full hover:bg-amber-100 transition-colors"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ── WISHLIST TAB ── */}
            {activeTab === "wishlist" && (
              <div>
                {profile.wishlist?.length ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {profile.wishlist.map((product) => (
                      <ProductCard
                        key={product.name}
                        product={product}
                        onAddToCart={onAddToCart}
                        wishlist={profile.wishlist}
                        onToggleWishlist={onToggleWishlist}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="py-16 text-center">
                    <div className="h-16 w-16 rounded-2xl bg-brand-parchment/60 border border-brand-sand/40 flex items-center justify-center mx-auto mb-4">
                      <Heart className="h-7 w-7 text-brand-sand" />
                    </div>
                    <p className="font-medium text-brand-charcoal">Wishlist is empty</p>
                    <p className="text-sm text-brand-stone mt-1">Save products you love for later.</p>
                  </div>
                )}
              </div>
            )}

            {/* ── REQUESTS TAB ── */}
            {activeTab === "requests" && (
              <div className="space-y-3">
                {serviceRequests.length === 0 ? (
                  <div className="py-16 text-center">
                    <div className="h-16 w-16 rounded-2xl bg-brand-parchment/60 border border-brand-sand/40 flex items-center justify-center mx-auto mb-4">
                      <RotateCcw className="h-7 w-7 text-brand-sand" />
                    </div>
                    <p className="font-medium text-brand-charcoal">No requests yet</p>
                    <p className="text-sm text-brand-stone mt-1">Refund, replacement and cancellation requests appear here.</p>
                  </div>
                ) : (
                  serviceRequests.map((req) => (
                    <div
                      key={req.requestId}
                      className="p-4 bg-white/70 border border-brand-sand/30 rounded-2xl"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold rounded-full border ${
                            req.type === "refund"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : req.type === "replacement"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}>
                            {req.type}
                          </span>
                          <span className="rounded-full border border-brand-sand/50 px-2 py-0.5 text-[10px] uppercase text-brand-stone bg-brand-parchment/40">
                            {req.status}
                          </span>
                        </div>
                        <p className="text-[10px] font-mono text-brand-stone/60">
                          {req.requestNumber || req.requestId}
                        </p>
                      </div>
                      <p className="text-xs text-brand-stone mb-1">
                        Order <span className="font-mono">#{req.orderId}</span>
                      </p>
                      <p className="text-sm text-brand-charcoal">{req.reason}</p>
                      {req.details && (
                        <p className="mt-1 text-xs text-brand-stone">{req.details}</p>
                      )}
                      <p className="mt-2 text-[10px] text-brand-stone/50">
                        {new Date(req.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Service Request Modal */}
      {requestModal.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-brand-warm-black/35 backdrop-blur-sm"
            onClick={() => setRequestModal({ open: false, orderId: "", type: null, reason: "", details: "" })}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-brand-sand/40 bg-white p-6 shadow-soft-xl animate-scale-in">
            <h3 className="font-heading text-lg text-brand-charcoal mb-1">
              Request{" "}
              {requestModal.type === "refund"
                ? "Refund"
                : requestModal.type === "replacement"
                ? "Replacement"
                : "Cancellation"}
            </h3>
            <p className="text-xs text-brand-stone mb-4">Order #{requestModal.orderId}</p>
            <textarea
              rows={3}
              value={requestModal.reason}
              onChange={(e) => setRequestModal((prev) => ({ ...prev, reason: e.target.value }))}
              placeholder="Reason for your request"
              className="w-full rounded-xl border border-brand-sand/60 bg-white px-3 py-2 text-sm text-brand-charcoal outline-none focus:ring-2 focus:ring-brand-terracotta/20 resize-none"
            />
            <textarea
              rows={2}
              value={requestModal.details}
              onChange={(e) => setRequestModal((prev) => ({ ...prev, details: e.target.value }))}
              placeholder="Additional details (optional)"
              className="mt-2 w-full rounded-xl border border-brand-sand/60 bg-white px-3 py-2 text-sm text-brand-charcoal outline-none focus:ring-2 focus:ring-brand-terracotta/20 resize-none"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRequestModal({ open: false, orderId: "", type: null, reason: "", details: "" })}
                className="px-4 py-2 rounded-xl border border-brand-sand/50 text-sm text-brand-charcoal hover:bg-brand-cream transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingRequest || !requestModal.reason.trim()}
                onClick={handleServiceRequest}
                className="px-4 py-2 rounded-xl bg-brand-charcoal text-sm text-white hover:bg-brand-warm-black disabled:opacity-50 transition-colors shadow-soft"
              >
                {isSubmittingRequest ? "Submitting…" : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      <CartModal
        isOpen={isCartOpen}
        cart={cart}
        onClose={() => setIsCartOpen(false)}
        onRemoveFromCart={onRemoveFromCart}
        onCheckout={() => {
          setIsCartOpen(false);
          onCheckout();
        }}
      />

      <button
        onClick={() => setIsCartOpen(true)}
        className="fixed z-50 right-6 bottom-6 h-12 w-12 flex items-center justify-center rounded-2xl bg-brand-charcoal border border-brand-warm-black shadow-soft-lg hover:bg-brand-warm-black transition-colors text-brand-cream"
        aria-label="View cart"
      >
        <ShoppingCart className="h-5 w-5" />
        {cart.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-brand-coral text-white text-[10px] font-bold min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full">
            {cart.length}
          </span>
        )}
      </button>
    </div>
  );
};

export default ProfilePage;
