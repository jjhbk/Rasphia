"use client";
import React, { useEffect, useState } from "react";
import type { UserProfile, Order, Product, OrderStatus } from "../types";
import EditIcon from "./icons/EditIcon";
import ProductCard from "./ProductCard";

interface ProfilePageProps {
  user: UserProfile;
  onBack: () => void;
  onInitiateCheckout: (product: Product) => void;
  onToggleWishlist: (product: Product) => void;
  onStartReview: (order: Order) => void;
}

const statusColors: Record<OrderStatus, string> = {
  Processing: "bg-amber-100 text-amber-800",
  Shipped: "bg-blue-100 text-blue-800",
  Delivered: "bg-green-100 text-green-800",
  Paid: "bg-green-200 text-green-800",
};

const OrderStatusBadge: React.FC<{ status: OrderStatus }> = ({ status }) => (
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
  onBack,
  onInitiateCheckout,
  onToggleWishlist,
  onStartReview,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<UserProfile>(user);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Load orders + user profile
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
        if (profileData) setProfile(profileData);
        if (ordersData) setOrders(ordersData);
      } catch (err) {
        console.error("Error fetching profile/orders:", err);
      } finally {
        setLoading(false);
      }
    };
    if (user.email) loadProfileAndOrders();
  }, [user]);

  const handleSave = async () => {
    try {
      await fetch("/api/user/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      alert("✅ Profile updated");
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
        <button
          onClick={onBack}
          className="text-sm text-stone-600 hover:text-amber-800 transition-colors mb-6"
        >
          &larr; Back to chat
        </button>

        {/* Profile */}
        <div className="bg-white rounded-lg shadow-lg mb-8 p-6">
          <div className="flex justify-between items-center border-b border-stone-200 pb-3 mb-4">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {["name", "email", "phone", "address"].map((field) => (
              <div key={field}>
                <label className="block text-sm font-medium text-stone-500 capitalize">
                  {field === "email" ? "Email Address" : field}
                </label>
                {field === "address" ? (
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
                ) : field === "email" ? (
                  <p className="text-lg text-stone-800">{profile.email}</p>
                ) : isEditing ? (
                  <input
                    name={field}
                    value={profile[field as keyof UserProfile] as string}
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
                onInitiateCheckout={onInitiateCheckout}
                wishlist={profile.wishlist}
                onToggleWishlist={onToggleWishlist}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-8 text-center mb-10">
            <p className="text-stone-500">
              Your wishlist is empty. Add items to see them here.
            </p>
          </div>
        )}

        {/* Orders */}
        <h2 className="text-2xl font-serif text-amber-900 mb-4">
          Order History
        </h2>
        {orders.length ? (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-lg shadow-md p-4 flex flex-col sm:flex-row items-start gap-4"
              >
                <img
                  src={order.product.imageUrl}
                  alt={order.product.name}
                  className="w-20 h-20 object-cover rounded-md"
                />
                <div className="flex-grow">
                  <p className="font-semibold text-stone-800">
                    {order.product.name}
                  </p>
                  <p className="text-sm text-stone-500">Order ID: {order.id}</p>
                  <p className="text-sm text-stone-500">
                    Status: <OrderStatusBadge status={order.status} />
                  </p>
                </div>
                <p className="font-bold text-amber-900 text-lg">
                  {formatPrice(order.product.price)}
                </p>
                {order.status === "Delivered" && !order.isReviewed && (
                  <button
                    onClick={() => onStartReview(order)}
                    className="mt-2 text-sm text-amber-800 font-medium hover:underline"
                  >
                    Leave Review
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-stone-500">No orders found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
