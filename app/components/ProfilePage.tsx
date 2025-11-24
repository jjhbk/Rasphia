"use client";
import React, { useEffect, useState } from "react";
import type { UserProfile, Order, Product, OrderStatus } from "../types";
import EditIcon from "./icons/EditIcon";
import ProductCard from "./ProductCard";
import CartModal from "./CartModal";

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
  Processing: "bg-amber-100 text-amber-800",
  Shipped: "bg-blue-100 text-blue-800",
  Delivered: "bg-green-100 text-green-800",
  Paid: "bg-green-200 text-green-800",
};

const OrderStatusBadge = ({ status }: { status: OrderStatus }) => (
  <span
    className={`px-2 py-1 text-xs font-medium rounded-full ${
      statusColors[status] || "bg-gray-100 text-gray-800"
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
            id: o.id ?? o.order_id ?? o._id ?? o.orderId,
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

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(price);

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center text-stone-500">
        Loading your profile...
      </div>
    );

  return (
    <div className="min-h-screen bg-stone-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Back */}
        <button
          onClick={onBack}
          className="text-sm text-stone-600 hover:text-amber-800 transition-colors mb-6"
        >
          ← Back to chat
        </button>

        {/* Floating cart button */}
        <button
          onClick={() => setIsCartOpen(true)}
          className="
            fixed z-50
            right-10 bottom-20
            h-20 w-20
            flex items-center justify-center
            rounded-full bg-white text-4xl
            border border-stone-300 shadow-2xl
            backdrop-blur-xl hover:bg-stone-100 transition
          "
        >
          🛒
          {cart.length > 0 && (
            <span
              className="
                absolute -top-1 -right-1
                bg-red-600 text-white text-sm
                w-7 h-7 flex items-center justify-center
                rounded-full shadow-md
              "
            >
              {cart.length}
            </span>
          )}
        </button>

        {/* Profile */}
        <div className="bg-white rounded-lg shadow-lg mb-8 p-6">
          <div className="flex justify-between items-center border-b pb-3 mb-4">
            <h1 className="text-3xl font-serif text-amber-900">Your Profile</h1>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 text-sm text-stone-600 hover:text-amber-800"
              >
                <EditIcon />
                Edit
              </button>
            )}
          </div>

          {/* Profile fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* name, phone, address, etc — wishlist intentionally excluded */}
            {["name", "email", "phone", "address"].map((field) => (
              <div key={field}>
                <label className="block text-sm font-medium text-stone-500 capitalize">
                  {field === "email" ? "Email Address" : field}
                </label>

                {field === "email" ? (
                  <p className="text-lg text-stone-800">{profile.email}</p>
                ) : field === "address" ? (
                  isEditing ? (
                    <textarea
                      name="address"
                      value={profile.address}
                      onChange={(e) =>
                        setProfile({ ...profile, address: e.target.value })
                      }
                      className="mt-1 w-full px-3 py-2 border border-stone-300 rounded-md"
                    />
                  ) : (
                    <p className="text-lg text-stone-800 whitespace-pre-wrap">
                      {profile.address || "Not set"}
                    </p>
                  )
                ) : isEditing ? (
                  <input
                    name={field}
                    value={
                      (profile[field as keyof UserProfile] as string) || ""
                    }
                    onChange={(e) =>
                      setProfile({ ...profile, [field]: e.target.value })
                    }
                    className="mt-1 w-full px-3 py-2 border border-stone-300 rounded-md"
                  />
                ) : (
                  <p className="text-lg text-stone-800">
                    {typeof profile[field as keyof UserProfile] === "string"
                      ? (profile[field as keyof UserProfile] as string)
                      : "Not set"}
                  </p>
                )}
              </div>
            ))}
          </div>

          {isEditing && (
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-sm font-medium text-stone-700 bg-stone-200 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm font-medium text-white bg-stone-800 rounded-md"
              >
                Save
              </button>
            </div>
          )}
        </div>

        {/* Wishlist */}
        <h2 className="text-2xl font-serif text-amber-900 mb-4">
          Your Wishlist
        </h2>

        {profile.wishlist?.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
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
          <div className="bg-white rounded-lg shadow-md p-8 text-center mb-10">
            <p className="text-stone-500">Your wishlist is empty.</p>
          </div>
        )}

        {/* Orders */}
        <h2 className="text-2xl font-serif text-amber-900 mb-4">
          Order History
        </h2>

        {orders.length ? (
          <div className="space-y-4">
            {orders.map((order) => {
              // safe fallback: items can come from order.products (new) or order.product (old)
              const items: Product[] =
                (order as any).products ??
                ((order as any).product ? [(order as any).product] : []);

              // safe id (normalize any older field names)
              const orderId =
                (order as any).id ??
                (order as any).order_id ??
                (order as any)._id ??
                "";

              return (
                <div
                  key={orderId || Math.random()}
                  className="bg-white rounded-lg shadow-md p-4"
                >
                  <p className="text-sm text-stone-500 mb-3">
                    Order ID: {orderId || "—"}
                  </p>

                  {/* Multi-product display (handles both shapes) */}
                  <div className="space-y-3">
                    {items.map((p) => (
                      <div key={p.name} className="flex items-center gap-3">
                        <img
                          src={p.imageUrl}
                          className="w-16 h-16 rounded-md object-cover"
                          alt={p.name}
                        />
                        <div className="flex-grow">
                          <p className="font-semibold text-stone-800">
                            {p.name}
                          </p>
                          <p className="text-sm text-stone-500">
                            {formatPrice(p.price)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex justify-between items-center">
                    <OrderStatusBadge status={order.status} />
                    {order.status === "Delivered" && !order.isReviewed && (
                      <button
                        onClick={() => onStartReview(order)}
                        className="text-sm text-amber-800 hover:underline"
                      >
                        Leave Review
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-stone-500">No orders found.</p>
          </div>
        )}
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
    </div>
  );
};

export default ProfilePage;
