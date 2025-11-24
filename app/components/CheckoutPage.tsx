"use client";
import React, { useState, useEffect } from "react";
import type { Product, CheckoutCustomer, UserProfile } from "../types";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface CheckoutPageProps {
  products: Product[];
  user: UserProfile;
  onPlaceOrder: (customer: CheckoutCustomer, paymentId: string) => void;
  onCancel: () => void;
}

const CheckoutPage: React.FC<CheckoutPageProps> = ({
  products,
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

  const SHIPPING_COST = 0;
  const subtotal = products.reduce((sum, p) => sum + p.price, 0);
  const totalAmount = subtotal + SHIPPING_COST;

  useEffect(() => {
    setCustomer({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      address: user.address || "",
    });

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

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(price);

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
      const res = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products, customer, totalAmount }),
      });

      if (!res.ok) throw new Error("Failed to create Razorpay order");

      const order = await res.json();
      if (!order?.id) throw new Error("Invalid Razorpay order");

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
        amount: order.amount,
        currency: order.currency,
        name: "Rasphia",
        description: `Purchase of ${products.length} item(s)`,
        image:
          products[0]?.imageUrl || "https://picsum.photos/seed/logo/128/128",
        order_id: order.id,
        prefill: {
          name: customer.name,
          email: customer.email,
          contact: customer.phone,
        },
        notes: {
          items: products.map((p) => p.name).join(", "),
          address: customer.address,
        },
        theme: { color: "#4E443C" },

        handler: async function (response: any) {
          try {
            const verifyRes = await fetch("/api/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...response,
                customer,
                products,
                totalAmount,
              }),
            });

            const verify = await verifyRes.json();

            if (verify.status === "ok") {
              onPlaceOrder(customer, response.razorpay_payment_id);
            } else {
              alert("Payment verification failed.");
            }
          } catch (err) {
            console.error("Verification error:", err);
            alert("Error verifying payment.");
          } finally {
            setIsProcessing(false);
          }
        },

        modal: {
          ondismiss: () => setIsProcessing(false),
        },
      };

      new window.Razorpay(options).open();
    } catch (err) {
      console.error("Payment error:", err);
      alert("Error initiating payment.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-lg shadow-xl grid grid-cols-1 md:grid-cols-2 overflow-hidden">
        {/* Product Summary */}
        <div className="p-8 bg-stone-50 flex flex-col">
          <h2 className="text-2xl font-serif text-amber-900 mb-6">
            Your Items
          </h2>

          <div className="space-y-4 mb-6 pb-6 border-b border-stone-200">
            {products.map((p) => (
              <div key={p.name} className="flex items-center space-x-4">
                <img
                  src={p.imageUrl}
                  className="w-20 h-20 rounded-lg object-cover"
                />
                <div>
                  <h3 className="font-semibold">{p.name}</h3>
                  <p className="text-sm text-stone-500">{p.brand}</p>
                  <p className="font-medium">{formatPrice(p.price)}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between text-lg">
            <span className="text-stone-600">Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>

          <div className="flex justify-between text-lg mt-2">
            <span className="text-stone-600">Shipping</span>
            <span>{formatPrice(SHIPPING_COST)}</span>
          </div>

          <div className="flex justify-between text-xl font-bold mt-4">
            <span>Total</span>
            <span className="text-amber-900">{formatPrice(totalAmount)}</span>
          </div>

          <button
            onClick={onCancel}
            className="mt-auto text-sm text-stone-500 hover:text-amber-800"
          >
            ← Back to chat
          </button>
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
              <label className="block text-sm text-stone-600 mb-1">
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={customer.name}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-stone-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm text-stone-600 mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={customer.email}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-stone-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm text-stone-600 mb-1">Phone</label>
              <input
                type="tel"
                name="phone"
                value={customer.phone}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-stone-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm text-stone-600 mb-1">
                Address
              </label>
              <textarea
                name="address"
                rows={3}
                value={customer.address}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-stone-300 rounded-md"
              />
            </div>

            <button
              type="submit"
              disabled={isProcessing}
              className="w-full py-3 bg-stone-800 text-white text-lg rounded-md mt-4"
            >
              {isProcessing ? "Processing…" : `Pay ${formatPrice(totalAmount)}`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
