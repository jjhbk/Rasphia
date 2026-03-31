"use client";
import React, { useEffect, useState } from "react";
import type { UserProfile, Order, Product, OrderStatus } from "../types";
import CartModal from "./CartModal";
import ProductCard from "./ProductCard";
import { ArrowLeft, User, Package, Heart, ShoppingCart } from "lucide-react";
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

const statusStyles: Record<OrderStatus, string> = {
  created:     "bg-brand-parchment text-brand-stone border-brand-sand/50",
  paid:        "bg-green-50 text-green-700 border-green-200",
  Processing:  "bg-brand-parchment text-brand-terracotta border-brand-clay/30",
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
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<UserProfile>(user);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    const loadProfileAndOrders = async () => {
      try {
        const [profileRes, ordersRes] = await Promise.all([
          fetch(`/api/user/get-profile?email=${encodeURIComponent(user.email)}`),
          fetch(`/api/orders?email=${encodeURIComponent(user.email)}`),
        ]);
        const profileData = await profileRes.json();
        const ordersData = await ordersRes.json();
        const normalizedOrders: Order[] = (ordersData || []).map((o: any) => ({
          ...o,
          id: o.orderId ?? o.order_id ?? o.id ?? o._id,
          products: Array.isArray(o.products) ? o.products : o.product ? [o.product] : Array.isArray(o.items) ? o.items : [],
        }));
        if (profileData) setProfile(profileData);
        if (normalizedOrders) setOrders(normalizedOrders);
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

  const handleServiceRequest = async (orderId: string, type: "refund" | "replacement") => {
    const reason = prompt(`Why are you requesting a ${type}?`);
    if (!reason?.trim()) return;
    try {
      const res = await fetch("/api/orders/service-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, type, reason: reason.trim() }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d?.error || "Failed"); }
      alert(`${type === "refund" ? "Refund" : "Replacement"} request submitted.`);
    } catch (err) {
      console.error("Service request error:", err);
      alert("Could not submit your request.");
    }
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0 }).format(price);

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center bg-brand-cream">
        <div className="flex flex-col items-center gap-4">
          <BrandLogo size={40} />
          <p className="text-sm text-brand-stone">Loading profile…</p>
        </div>
      </div>
    );

  const inputClass = "w-full px-3 py-2 rounded-xl bg-brand-parchment/50 border border-brand-sand/50 text-sm text-brand-charcoal focus:outline-none focus:border-brand-terracotta/40 focus:ring-2 focus:ring-brand-terracotta/10 transition-all";
  const sectionIcon = "h-8 w-8 flex items-center justify-center rounded-xl flex-shrink-0";

  return (
    <div className="relative h-screen w-full bg-brand-cream overflow-hidden p-2 sm:p-3 font-body">
      <div className="absolute inset-0 bg-brand-hero -z-10" />

      <div className="w-full max-w-5xl mx-auto h-full bg-white/80 backdrop-blur-xl border border-brand-sand/30 rounded-3xl shadow-soft-md overflow-hidden flex flex-col">
        {/* Header */}
        <header className="flex-shrink-0 h-14 px-5 flex items-center justify-between border-b border-brand-sand/30 bg-white/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 rounded-xl hover:bg-brand-parchment text-brand-stone hover:text-brand-charcoal transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h1 className="text-sm font-semibold text-brand-charcoal font-heading">
              My Profile
            </h1>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-1.5 rounded-xl bg-brand-charcoal text-brand-cream text-xs font-medium hover:bg-brand-warm-black transition-colors"
            >
              Edit details
            </button>
          )}
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-8">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Personal info */}
            <section>
              <div className="flex items-center gap-3 mb-5">
                <div className={`${sectionIcon} bg-brand-parchment text-brand-terracotta`}>
                  <User className="h-4 w-4" />
                </div>
                <h2 className="text-base font-semibold text-brand-charcoal font-heading">
                  Personal information
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/50 border border-brand-sand/30 p-5 rounded-2xl">
                {["name", "email", "phone", "address"].map((field) => (
                  <div key={field} className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-widest font-medium text-brand-stone/60">
                      {field === "email" ? "Email address" : field}
                    </label>
                    {isEditing ? (
                      field === "address" ? (
                        <textarea rows={2} value={profile.address}
                          onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                          className={`${inputClass} resize-none`} />
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
                          <span className="text-brand-stone/40 italic font-normal text-xs">Not set</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {isEditing && (
                <div className="mt-4 flex justify-end gap-2">
                  <button onClick={() => setIsEditing(false)}
                    className="px-4 py-1.5 text-xs font-medium text-brand-stone hover:bg-brand-parchment rounded-xl transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleSave}
                    className="px-4 py-1.5 text-xs font-medium text-brand-cream bg-brand-charcoal hover:bg-brand-warm-black rounded-xl transition-colors shadow-soft">
                    Save changes
                  </button>
                </div>
              )}
            </section>

            {/* Wishlist */}
            <section>
              <div className="flex items-center gap-3 mb-5">
                <div className={`${sectionIcon} bg-brand-parchment text-brand-coral`}>
                  <Heart className="h-4 w-4" />
                </div>
                <h2 className="text-base font-semibold text-brand-charcoal font-heading">
                  Wishlist
                </h2>
              </div>
              {profile.wishlist?.length ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {profile.wishlist.map((product) => (
                    <ProductCard key={product.name} product={product}
                      onAddToCart={onAddToCart} wishlist={profile.wishlist}
                      onToggleWishlist={onToggleWishlist} />
                  ))}
                </div>
              ) : (
                <div className="py-10 rounded-2xl border border-dashed border-brand-sand/50 bg-brand-parchment/20 text-center">
                  <Heart className="h-8 w-8 text-brand-sand mx-auto mb-2" />
                  <p className="text-sm text-brand-stone/60">Your wishlist is empty.</p>
                </div>
              )}
            </section>

            {/* Orders */}
            <section className="pb-6">
              <div className="flex items-center gap-3 mb-5">
                <div className={`${sectionIcon} bg-brand-parchment text-brand-sage`}>
                  <Package className="h-4 w-4" />
                </div>
                <h2 className="text-base font-semibold text-brand-charcoal font-heading">
                  Order history
                </h2>
              </div>
              {orders.length ? (
                <div className="space-y-3">
                  {orders.map((order) => {
                    const items: Product[] = (order as any).products ?? ((order as any).product ? [(order as any).product] : []);
                    const firstProduct = items[0] || {};
                    const trackingNumber = (order as any).trackingNumber as string | undefined;
                    const trackingUrl = (order as any).trackingUrl as string | undefined;
                    const shippingProvider = (order as any).shippingProvider as string | undefined;
                    const estimatedDelivery = (order as any).estimatedDelivery as string | undefined;
                    return (
                      <div key={order.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-white/60 border border-brand-sand/30 rounded-2xl hover:shadow-soft transition-all">
                        <div className="h-14 w-14 rounded-xl overflow-hidden flex-shrink-0 border border-brand-sand/20">
                          <img src={firstProduct.imageUrl || "/placeholder.png"} alt={firstProduct.name || "Product"}
                            className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="text-sm font-medium text-brand-charcoal truncate">
                              {items.length > 1 ? `${firstProduct.name} + ${items.length - 1} more` : firstProduct.name}
                            </h3>
                            <OrderStatusBadge status={order.status} />
                          </div>
                          <p className="text-[10px] text-brand-stone/50 font-mono">#{order.id}</p>
                          {(trackingNumber || shippingProvider || estimatedDelivery) && (
                            <div className="mt-1.5 text-xs text-brand-stone/70 space-y-0.5">
                              {shippingProvider && <p>Carrier: {shippingProvider}</p>}
                              {trackingNumber && (
                                <p>Tracking: {trackingUrl ? (
                                  <a href={trackingUrl} target="_blank" rel="noreferrer" className="text-brand-terracotta underline">{trackingNumber}</a>
                                ) : trackingNumber}</p>
                              )}
                              {estimatedDelivery && (
                                <p>ETA: {new Date(estimatedDelivery).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <p className="font-semibold text-brand-charcoal text-base">
                            {formatPrice(items.reduce((sum, p) => sum + (p.price || 0) * (p.quantity || 1), 0))}
                          </p>
                          <div className="flex gap-1.5 flex-wrap justify-end">
                            {order.status === "Delivered" && !order.isReviewed && (
                              <button onClick={() => onStartReview(order)}
                                className="px-2.5 py-1 text-[10px] font-medium text-brand-terracotta bg-brand-parchment border border-brand-sand/40 rounded-full hover:bg-brand-sand/30 transition-colors">
                                Review
                              </button>
                            )}
                            {order.status === "Delivered" && (
                              <>
                                <button onClick={() => handleServiceRequest(order.id, "refund")}
                                  className="px-2.5 py-1 text-[10px] font-medium text-red-700 bg-red-50 border border-red-200 rounded-full hover:bg-red-100 transition-colors">
                                  Refund
                                </button>
                                <button onClick={() => handleServiceRequest(order.id, "replacement")}
                                  className="px-2.5 py-1 text-[10px] font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-full hover:bg-blue-100 transition-colors">
                                  Replace
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-10 rounded-2xl border border-dashed border-brand-sand/50 bg-brand-parchment/20 text-center">
                  <Package className="h-8 w-8 text-brand-sand mx-auto mb-2" />
                  <p className="text-sm text-brand-stone/60">No orders yet.</p>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>

      <CartModal isOpen={isCartOpen} cart={cart} onClose={() => setIsCartOpen(false)}
        onRemoveFromCart={onRemoveFromCart} onCheckout={() => { setIsCartOpen(false); onCheckout(); }} />

      <button onClick={() => setIsCartOpen(true)}
        className="fixed z-50 right-6 bottom-6 h-13 w-13 flex items-center justify-center rounded-2xl bg-brand-charcoal border border-brand-warm-black shadow-soft-lg hover:bg-brand-warm-black transition-colors text-brand-cream"
        aria-label="View cart">
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
