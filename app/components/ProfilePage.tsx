import React, { useState } from "react";
import type { UserProfile, Order, Product, OrderStatus } from "../types";
import EditIcon from "./icons/EditIcon";
import ProductCard from "./ProductCard";

interface ProfilePageProps {
  user: UserProfile;
  orders: Order[];
  onSave: (updatedProfile: UserProfile) => void;
  onBack: () => void;
  onInitiateCheckout: (product: Product) => void;
  onToggleWishlist: (product: Product) => void;
  onStartReview: (order: Order) => void;
}

const statusColors: Record<OrderStatus, string> = {
  Processing: "bg-amber-100 text-amber-800",
  Shipped: "bg-blue-100 text-blue-800",
  Delivered: "bg-green-100 text-green-800",
};

const OrderStatusBadge: React.FC<{ status: OrderStatus }> = ({ status }) => (
  <span
    className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[status]}`}
  >
    {status}
  </span>
);

const ProfilePage: React.FC<ProfilePageProps> = ({
  user,
  orders,
  onSave,
  onBack,
  onInitiateCheckout,
  onToggleWishlist,
  onStartReview,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<UserProfile>(user);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    onSave(profile);
    setIsEditing(false);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-stone-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <button
            onClick={onBack}
            className="text-sm text-stone-600 hover:text-amber-800 transition-colors"
          >
            &larr; Back to chat
          </button>
        </div>

        {/* Profile Details Card */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
          <div className="p-6 border-b border-stone-200">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-serif text-amber-900">
                Your Profile
              </h1>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 text-sm text-stone-600 hover:text-amber-800 transition-colors"
                >
                  <EditIcon />
                  <span>Edit</span>
                </button>
              )}
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-stone-500">
                  Full Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    name="name"
                    value={profile.name}
                    onChange={handleInputChange}
                    className="mt-1 w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                ) : (
                  <p className="text-lg text-stone-800">
                    {profile.name || "Not set"}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-500">
                  Email Address
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    name="email"
                    value={profile.email}
                    onChange={handleInputChange}
                    className="mt-1 w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                ) : (
                  <p className="text-lg text-stone-800">
                    {profile.email || "Not set"}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-500">
                  Phone Number
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    name="phone"
                    value={profile.phone}
                    onChange={handleInputChange}
                    className="mt-1 w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                ) : (
                  <p className="text-lg text-stone-800">
                    {profile.phone || "Not set"}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-500">
                  Shipping Address
                </label>
                {isEditing ? (
                  <textarea
                    name="address"
                    value={profile.address}
                    onChange={handleInputChange}
                    rows={3}
                    className="mt-1 w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                ) : (
                  <p className="text-lg text-stone-800 whitespace-pre-wrap">
                    {profile.address || "Not set"}
                  </p>
                )}
              </div>
            </div>
            {isEditing && (
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setProfile(user);
                  }}
                  className="px-4 py-2 text-sm font-medium text-stone-700 bg-stone-200 rounded-md hover:bg-stone-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 text-sm font-medium text-white bg-stone-800 rounded-md hover:bg-stone-900"
                >
                  Save Changes
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Wishlist Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-serif text-amber-900 mb-4">
            Your Wishlist
          </h2>
          {user.wishlist.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {user.wishlist.map((product) => (
                <ProductCard
                  key={product.name}
                  product={product}
                  onInitiateCheckout={onInitiateCheckout}
                  wishlist={user.wishlist}
                  onToggleWishlist={onToggleWishlist}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-stone-500">
                Your wishlist is empty. Add items you love to see them here.
              </p>
            </div>
          )}
        </div>

        {/* Order History Section */}
        <div>
          <h2 className="text-2xl font-serif text-amber-900 mb-4">
            Order History
          </h2>
          {orders.length > 0 ? (
            <div className="space-y-4">
              {[...orders].reverse().map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-lg shadow-md p-4 flex flex-col sm:flex-row items-start gap-4"
                >
                  <img
                    src={order.product.imageUrl}
                    alt={order.product.name}
                    className="w-20 h-20 object-cover rounded-md flex-shrink-0"
                  />
                  <div className="flex-grow">
                    <p className="font-semibold text-stone-800">
                      {order.product.name}
                    </p>
                    <p className="text-sm text-stone-500">
                      Order ID: {order.id}
                    </p>
                    <p className="text-sm text-stone-500">
                      Date: {formatDate(order.date)}
                    </p>
                    {order.trackingNumber && (
                      <p className="text-sm text-stone-500">
                        Tracking:{" "}
                        <span className="font-medium text-stone-700">
                          {order.trackingNumber}
                        </span>
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-center sm:items-end gap-2 sm:ml-auto w-full sm:w-auto">
                    <OrderStatusBadge status={order.status} />
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
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-stone-500">
                You haven't placed any orders yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
