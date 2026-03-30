"use client";
import React, { useEffect, useState } from "react";
import type { UserProfile, Order, Product, OrderStatus } from "../types";
import CartModal from "./CartModal";
import ProductCard from "./ProductCard";
import { ArrowLeft, User, Package, Heart, ShoppingCart } from "lucide-react";

interface ProfilePageProps {
  user: UserProfile;
  cart: Product[];
  onBack: () => void;

  onAddToCart: (product: Product) => void;
  onCheckout: () => void; // no product arg
  onToggleWishlist: (product: Product) => void;
  onStartReview: (order: Order) => void;
  onRemoveFromCart: (product: Product) => void;
}

const statusColors: Record<OrderStatus, string> = {
  created: "bg-stone-100 text-stone-700 border-stone-200",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Processing: "bg-amber-100 text-amber-800 border-amber-200",
  Shipped: "bg-blue-50 text-blue-700 border-blue-200",
  Delivered: "bg-green-50 text-green-700 border-green-200",
  Paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Cancelled: "bg-stone-100 text-stone-700 border-stone-200",
  Refunded: "bg-red-50 text-red-700 border-red-200",
  Replacement: "bg-indigo-50 text-indigo-700 border-indigo-200",
};

const OrderStatusBadge = ({ status }: { status: OrderStatus }) => (
  <span
    className={`px-2.5 py-0.5 text-[10px] uppercase tracking-wider font-semibold rounded-full border ${
      statusColors[status] || "bg-stone-100 text-stone-600 border-stone-200"
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

  // 🟢 DATA FETCHING LOGIC (From Surya Branch)
  useEffect(() => {
    const loadProfileAndOrders = async () => {
      try {
        const [profileRes, ordersRes] = await Promise.all([
          fetch(
            `/api/user/get-profile?email=${encodeURIComponent(user.email)}`
          ),
          fetch(`/api/orders?email=${encodeURIComponent(user.email)}`),
        ]);

        const profileData = await profileRes.json();
        const ordersData = await ordersRes.json();

        // normalize older order shapes if necessary:
        const normalizedOrders: Order[] =
          (ordersData || []).map((o: any) => ({
            ...o,
            id: o.orderId ?? o.order_id ?? o.id ?? o._id,
            products: Array.isArray(o.products)
              ? o.products
              : o.product
              ? [o.product]
              : Array.isArray(o.items)
              ? o.items
              : [],
          })) || [];

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

      alert("Profile updated");
      setIsEditing(false);
    } catch (err) {
      console.error("Profile update failed:", err);
    }
  };

  const handleServiceRequest = async (
    orderId: string,
    type: "refund" | "replacement"
  ) => {
    const reason = prompt(
      `Please describe why you are requesting a ${type}:`
    );
    if (!reason || !reason.trim()) return;

    try {
      const res = await fetch("/api/orders/service-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          type,
          reason: reason.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to submit request");
      }
      alert(
        `${type === "refund" ? "Refund" : "Replacement"} request submitted.`
      );
    } catch (err) {
      console.error("Service request error:", err);
      alert("Could not submit your request.");
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
      <div className="flex h-screen items-center justify-center bg-[#F8F4EF] text-stone-500">
        Loading...
      </div>
    );

  return (
    <div className="relative h-screen w-full bg-[#F8F4EF] text-stone-900 font-sans overflow-hidden p-2 sm:p-4">
      {/* Background Gradients & Blobs (Consistent with App) */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#FFF4E1] via-[#F8F1EA] to-[#F1E3D3] -z-20" />
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-20 -left-20 h-96 w-96 rounded-full bg-[#F8DCC0] opacity-40 blur-3xl" />
        <div className="absolute top-1/2 right-0 h-[500px] w-[500px] rounded-full bg-[#F0B9A3] opacity-30 blur-[100px]" />
      </div>

      {/* Main Floating Panel */}
      <div className="w-full max-w-full sm:max-w-xl lg:max-w-6xl mx-auto h-full bg-white/80 backdrop-blur-xl border border-white/60 rounded-[32px] shadow-[0_20px_40px_rgba(0,0,0,0.06)] overflow-hidden flex flex-col">
        
        {/* Header */}
        <header className="flex-shrink-0 h-16 px-4 sm:px-8 flex items-center justify-between border-b border-stone-100/50 bg-white/50 backdrop-blur-md z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 -ml-2 rounded-full hover:bg-stone-200/50 text-stone-500 hover:text-stone-800 transition-colors"
              title="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-serif font-semibold text-stone-900">
              My Profile
            </h1>
          </div>
          
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-3 py-1 rounded-full bg-stone-900 text-white text-xs font-medium hover:bg-stone-800 transition-colors shadow-md"
            >
              Edit Details
            </button>
          )}
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-8">
          <div className="max-w-4xl mx-auto space-y-6 sm:space-y-10">
            
            {/* 1. Personal Info Section */}
            <section>
              <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <div className="p-1.5 bg-amber-100 rounded-lg text-amber-800">
                  <User className="h-4 w-4" />
                </div>
                <h2 className="text-base sm:text-xl font-serif text-stone-800">Personal Information</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 bg-white/40 border border-white/60 p-4 sm:p-6 rounded-2xl sm:rounded-3xl">
                {["name", "email", "phone", "address"].map((field) => (
                  <div key={field} className="space-y-1.5">
                    <label className="text-[9px] sm:text-[10px] uppercase tracking-wider font-bold text-stone-400 pl-1">
                      {field === "email" ? "Email Address" : field}
                    </label>
                    {isEditing ? (
                      field === "address" ? (
                        <textarea
                          rows={2}
                          value={profile.address}
                          onChange={(e) =>
                            setProfile({ ...profile, address: e.target.value })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-white/80 border border-stone-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100/20 text-sm outline-none transition-all resize-none"
                        />
                      ) : (
                        <input
                          value={profile[field as keyof UserProfile] as string}
                          onChange={(e) =>
                            setProfile({ ...profile, [field]: e.target.value })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-white/80 border border-stone-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100/20 text-sm outline-none transition-all"
                        />
                      )
                    ) : (
                      <div className="px-3 py-2 rounded-lg bg-white/40 border border-stone-100 text-stone-800 font-medium text-sm min-h-[38px] flex items-center">
                        {profile[field as keyof UserProfile] as string || <span className="text-stone-400 italic font-normal">Not set</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {isEditing && (
                <div className="mt-4 flex justify-end gap-2 pt-4 border-t border-stone-200/50">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-200/50 rounded-full transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-4 py-1.5 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-full shadow-md transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              )}
            </section>

            {/* 2. Wishlist Section */}
            <section>
              <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <div className="p-1.5 bg-rose-100 rounded-lg text-rose-800">
                  <Heart className="h-4 w-4" />
                </div>
                <h2 className="text-base sm:text-xl font-serif text-stone-800">Wishlist</h2>
              </div>

              {profile.wishlist?.length ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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
                <div className="p-6 sm:p-8 rounded-2xl border border-dashed border-stone-300 bg-stone-50/50 text-center">
                  <p className="text-sm text-stone-500">Your wishlist is empty.</p>
                </div>
              )}
            </section>

            {/* 3. Orders Section */}
            <section className="pb-4 sm:pb-8">
              <div className="flex items-center gap-3 mb-4 sm:mb-6">
                 <div className="p-1.5 bg-blue-100 rounded-lg text-blue-800">
                    <Package className="h-4 w-4" />
                 </div>
                 <h2 className="text-base sm:text-xl font-serif text-stone-800">Order History</h2>
              </div>

              {orders.length ? (
                <div className="grid gap-3 sm:gap-4">
                  {orders.map((order) => {
                     // Normalize items again for display loop
                     const items: Product[] = (order as any).products ?? ((order as any).product ? [(order as any).product] : []);
                     const firstProduct = items[0] || {};
                     const trackingNumber = (order as any).trackingNumber as string | undefined;
                     const trackingUrl = (order as any).trackingUrl as string | undefined;
                     const shippingProvider = (order as any).shippingProvider as string | undefined;
                     const estimatedDelivery = (order as any).estimatedDelivery as string | undefined;
                     
                     return (
                        <div key={order.id}
                          className="group flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5 p-3 sm:p-4 bg-white/60 border border-white/60 rounded-xl sm:rounded-2xl hover:bg-white hover:shadow-md transition-all"
                        >
                          <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-lg sm:rounded-xl bg-stone-100 border border-stone-200/50 overflow-hidden flex-shrink-0">
                            <img
                              src={firstProduct.imageUrl || "/placeholder.png"}
                              alt={firstProduct.name || "Product"}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          </div>
                          
                          <div className="flex-1 min-w-0 w-full">
                            <div className="flex justify-between sm:justify-start items-center gap-2 mb-1">
                               <h3 className="text-sm sm:text-base font-serif font-medium text-stone-900 truncate">
                                 {items.length > 1 ? `${firstProduct.name} + ${items.length - 1} more` : firstProduct.name}
                               </h3>
                               <OrderStatusBadge status={order.status} />
                            </div>
                            <p className="text-[9px] sm:text-[10px] text-stone-400 font-mono">ID: {order.id}</p>
                            {(trackingNumber || shippingProvider || estimatedDelivery) && (
                              <div className="mt-2 text-[10px] sm:text-xs text-stone-600 space-y-1">
                                {shippingProvider && (
                                  <p>Carrier: {shippingProvider}</p>
                                )}
                                {trackingNumber && (
                                  <p>
                                    Tracking:{" "}
                                    {trackingUrl ? (
                                      <a
                                        href={trackingUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-blue-700 underline"
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
                                    {new Date(estimatedDelivery).toLocaleDateString(
                                      "en-IN",
                                      {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric",
                                      }
                                    )}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="w-full sm:w-auto text-right flex flex-row sm:flex-col justify-between sm:justify-center items-center sm:items-end gap-1">
                             <p className="font-semibold text-stone-900 text-base sm:text-xl mb-0.5 sm:mb-1">
                               {/* Calculate total if not present, or use product price */}
                               {formatPrice(
                                 items.reduce(
                                   (sum, p) => sum + (p.price || 0) * (p.quantity || 1),
                                   0
                                 )
                               )}
                             </p>
                             <div className="flex gap-1.5 flex-wrap justify-end">
                               {order.status === "Delivered" && !order.isReviewed && (
                                 <button
                                   onClick={() => onStartReview(order)}
                                   className="px-3 py-1 text-[9px] sm:text-[10px] font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-full transition-colors"
                                 >
                                   Write Review
                                 </button>
                               )}
                               {order.status === "Delivered" && (
                                 <>
                                   <button
                                     onClick={() =>
                                       handleServiceRequest(order.id, "refund")
                                     }
                                     className="px-3 py-1 text-[9px] sm:text-[10px] font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-full transition-colors"
                                   >
                                     Request Refund
                                   </button>
                                   <button
                                     onClick={() =>
                                       handleServiceRequest(
                                         order.id,
                                         "replacement"
                                       )
                                     }
                                     className="px-3 py-1 text-[9px] sm:text-[10px] font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-full transition-colors"
                                   >
                                     Request Replacement
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
                <div className="p-6 sm:p-8 rounded-3xl border border-dashed border-stone-300 bg-stone-50/50 text-center">
                  <p className="text-sm text-stone-500">No orders yet.</p>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>

      {/* Cart */}
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
        className="
          fixed z-50
          right-6 bottom-6
          sm:right-10 sm:bottom-10
          h-14 w-14 sm:h-16 sm:w-16
          flex items-center justify-center
          rounded-full bg-stone-900
          border border-stone-800 shadow-xl
          hover:bg-black transition text-white
        "
        aria-label="View cart"
      >
        <ShoppingCart className="h-6 w-6 sm:h-7 sm:w-7" />
        {cart.length > 0 && (
          <span
            className="
              absolute -top-1 -right-1
              bg-red-600 text-white text-[10px] sm:text-xs font-bold
              min-w-[18px] h-5 sm:h-6 px-1 flex items-center justify-center
              rounded-full shadow-md border-2 border-stone-900
            "
          >
            {cart.length}
          </span>
        )}
      </button>

    </div>
  );
};

export default ProfilePage;
