"use client";
import React, { useState, useEffect } from "react";
import type { Product, CheckoutCustomer, UserProfile } from "../types";
import { X } from "lucide-react";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface CheckoutPageProps {
  products: Product[]; // Changed back to array to support Cart
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

  // Initialize User Data & Load Razorpay
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
    
    return () => {
      document.body.removeChild(script);
    };
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onCancel}
      />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-4xl bg-white/95 backdrop-blur-xl rounded-[32px] shadow-2xl grid grid-cols-1 md:grid-cols-2 overflow-hidden border border-white/50 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/50 hover:bg-white text-stone-500 hover:text-stone-800 transition-all shadow-sm"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Product Info (Left) */}
        <div className="p-8 bg-stone-50/50 flex flex-col relative h-full max-h-[90vh] overflow-y-auto custom-scrollbar">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600" />
          <h2 className="text-2xl font-serif text-amber-900 mb-2">
            Order Summary
          </h2>
          <p className="text-stone-500 mb-6 text-sm">Review your items before purchase</p>
          
          <div className="space-y-4 mb-6">
            {products.map((product) => (
               <div key={product.name + Math.random()} className="flex items-center gap-4 p-4 bg-white rounded-2xl shadow-sm border border-stone-100">
                  <div className="relative h-16 w-16 flex-shrink-0">
                     <img
                       src={product.imageUrl}
                       alt={product.name}
                       className="w-full h-full object-cover rounded-lg shadow-sm"
                     />
                  </div>
                  <div className="flex-1 min-w-0">
                     <h3 className="font-bold text-sm text-stone-800 mb-0.5 truncate">{product.name}</h3>
                     <p className="text-xs text-stone-500">{product.brand}</p>
                     <p className="text-sm font-semibold text-amber-900 mt-1">{formatPrice(product.price)}</p>
                  </div>
               </div>
            ))}
          </div>

          <div className="mt-auto pt-4 border-t border-stone-200">
            <div className="flex justify-between items-center mb-2">
               <span className="text-stone-600">Subtotal</span>
               <span className="text-stone-800 font-medium">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-stone-600 font-medium">Total Amount</span>
              <span className="text-2xl font-serif font-bold text-amber-900">
                {formatPrice(totalAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* Checkout Form (Right) */}
        <div className="p-8 bg-white/40 h-full overflow-y-auto">
          <h2 className="text-2xl font-serif text-amber-900 mb-6">
            Shipping Details
          </h2>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handlePayment();
            }}
            className="space-y-5"
          >
            <div>
              <label
                htmlFor="name"
                className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1.5"
              >
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={customer.name}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2.5 bg-stone-50/50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:bg-white transition-all text-stone-800 placeholder-stone-400"
                placeholder="Your Name"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1.5"
              >
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={customer.email}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2.5 bg-stone-50/50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:bg-white transition-all text-stone-800 placeholder-stone-400"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="phone"
                className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1.5"
              >
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={customer.phone}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2.5 bg-stone-50/50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:bg-white transition-all text-stone-800 placeholder-stone-400"
                placeholder="10-digit mobile number"
              />
            </div>

            <div>
              <label
                htmlFor="address"
                className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1.5"
              >
                Shipping Address
              </label>
              <textarea
                name="address"
                value={customer.address}
                onChange={handleInputChange}
                required
                rows={3}
                className="w-full px-4 py-2.5 bg-stone-50/50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:bg-white transition-all text-stone-800 placeholder-stone-400 resize-none"
                placeholder="Full delivery address"
              />
            </div>
            
            <div className="pt-4">
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-3.5 bg-stone-900 text-white text-lg font-medium rounded-full shadow-lg hover:bg-black hover:shadow-xl hover:scale-[1.01] transition-all disabled:bg-stone-400 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isProcessing
                  ? "Processing..."
                  : `Pay ${formatPrice(totalAmount)}`}
              </button>
              <p className="text-center text-xs text-stone-400 mt-3">
                Secure payment powered by Razorpay
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;