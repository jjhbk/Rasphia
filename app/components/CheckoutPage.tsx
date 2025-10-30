"use client";
import React, { useState, useEffect } from "react";
import type { Product, CheckoutCustomer, UserProfile } from "../types";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface CheckoutPageProps {
  product: Product;
  user: UserProfile;
  onPlaceOrder: (customer: CheckoutCustomer, paymentId: string) => void;
  onCancel: () => void;
}

const CheckoutPage: React.FC<CheckoutPageProps> = ({
  product,
  user,
  onPlaceOrder,
  onCancel,
}) => {
  const [customer, setCustomer] = useState<CheckoutCustomer>({
    name: "",
    email: "",
    phone: "",
    address: "",
  });
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Pre-fill customer data
    setCustomer({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      address: user.address || "",
    });

    // Load Razorpay checkout script dynamically
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
  }, [user]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setCustomer((prev) => ({ ...prev, [name]: value }));
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handlePayment = async () => {
    if (
      !customer.name ||
      !customer.email ||
      !customer.phone ||
      !customer.address
    ) {
      alert("Please fill in all required fields.");
      return;
    }

    setIsProcessing(true);

    try {
      // ✅ Step 1: Create order on backend with product + customer details
      const res = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product, customer }),
      });

      if (!res.ok) {
        throw new Error("Failed to create Razorpay order");
      }

      const order = await res.json();

      if (!order?.id) {
        throw new Error("Invalid Razorpay order response");
      }

      // ✅ Step 2: Initialize Razorpay Checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
        amount: order.amount, // in paise
        currency: order.currency,
        name: "Rasphia",
        description: `Purchase of ${product.name}`,
        image: product.imageUrl || "https://picsum.photos/seed/logo/128/128",
        order_id: order.id,
        prefill: {
          name: customer.name,
          email: customer.email,
          contact: customer.phone,
        },
        notes: {
          productName: product.name,
          productBrand: product.brand,
          address: customer.address,
        },
        theme: {
          color: "#4E443C",
        },

        // ✅ Step 3: Payment handler after checkout success
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch("/api/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...response,
                customer,
                product,
              }),
            });

            const verifyData = await verifyRes.json();

            if (verifyData.status === "ok") {
              // Order successfully verified & saved
              onPlaceOrder(customer, response.razorpay_payment_id);
            } else {
              alert("⚠️ Payment verification failed. Please contact support.");
            }
          } catch (verifyErr) {
            console.error("Payment verification error:", verifyErr);
            alert("Error verifying payment. Please try again.");
          } finally {
            setIsProcessing(false);
          }
        },

        modal: {
          ondismiss: function () {
            setIsProcessing(false);
          },
        },
      };

      // ✅ Step 4: Open Razorpay checkout window
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error("Payment initiation failed:", err);
      alert("❌ Error initiating payment. Please try again.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-lg shadow-xl grid grid-cols-1 md:grid-cols-2 overflow-hidden">
        {/* Product Info */}
        <div className="p-8 bg-stone-50 flex flex-col">
          <h2 className="text-2xl font-serif text-amber-900 mb-6">
            Your Selection
          </h2>
          <div className="flex items-center space-x-4 mb-6 pb-6 border-b border-stone-200">
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-24 h-24 object-cover rounded-lg"
            />
            <div>
              <h3 className="font-semibold text-stone-800">{product.name}</h3>
              <p className="text-sm text-stone-500">{product.brand}</p>
            </div>
          </div>
          <div className="flex justify-between items-center text-lg">
            <span className="text-stone-600">Total</span>
            <span className="font-bold text-amber-900">
              {formatPrice(product.price)}
            </span>
          </div>
          <div className="mt-auto pt-6 text-center text-stone-500 text-sm">
            <button
              onClick={onCancel}
              className="hover:text-amber-800 transition-colors"
            >
              &larr; Back to chat
            </button>
          </div>
        </div>

        {/* Checkout Form */}
        <div className="p-8">
          <h2 className="text-2xl font-serif text-amber-900 mb-6">
            Shipping & Payment
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handlePayment();
            }}
            className="space-y-4"
          >
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-stone-600 mb-1"
              >
                Full Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={customer.name}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="Your Name"
              />
            </div>
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-stone-600 mb-1"
              >
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={customer.email}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-stone-600 mb-1"
              >
                Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={customer.phone}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="10-digit mobile number"
              />
            </div>
            <div>
              <label
                htmlFor="address"
                className="block text-sm font-medium text-stone-600 mb-1"
              >
                Shipping Address
              </label>
              <textarea
                id="address"
                name="address"
                value={customer.address}
                onChange={handleInputChange}
                required
                rows={3}
                className="w-full px-4 py-2 bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="123 Main St, Anytown, State, 12345"
              />
            </div>
            <div className="pt-4">
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-3 bg-stone-800 text-white text-lg font-medium rounded-md hover:bg-stone-900 transition-colors disabled:bg-stone-400 disabled:cursor-wait"
              >
                {isProcessing
                  ? "Processing..."
                  : `Pay ${formatPrice(product.price)}`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
