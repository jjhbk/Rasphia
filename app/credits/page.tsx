"use client";
import React, { useState, useEffect } from "react";
import type { CheckoutCustomer } from "../types";
import { useSession } from "next-auth/react";

declare global {
  interface Window {
    Razorpay: any;
  }
}

// Credit pricing
const CREDITS_PER_INR = 1;

// Safe Razorpay loader
const loadRazorpay = () =>
  new Promise<void>((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject("Failed to load Razorpay");
    document.body.appendChild(script);
  });

const CreditsCheckout = () => {
  const { data: session } = useSession();

  const [customer, setCustomer] = useState<CheckoutCustomer>({
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  const [selectedCredits, setSelectedCredits] = useState<number>(100);
  const [customCredits, setCustomCredits] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [creditedCredits, setCreditedCredits] = useState<number>(0);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const amountInInr = Math.max(1, Math.ceil(selectedCredits / CREDITS_PER_INR));

  useEffect(() => {
    setCustomer({
      name: session?.user?.name || "",
      email: session?.user?.email || "",
      phone: "",
      address: "",
    });
  }, [session]);

  const handlePresetSelect = (credits: number) => {
    setSelectedCredits(credits);
    setCustomCredits("");
  };

  const handleCustomInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomCredits(value);
    const num = Number(value);
    if (num >= 10) setSelectedCredits(num);
  };

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

  const resetForRetry = () => {
    setPaymentError(null);
    setIsProcessing(false);
  };

  const handlePayment = async () => {
    if (
      !customer.name ||
      !customer.email ||
      !customer.phone ||
      !customer.address
    ) {
      setPaymentError("Please fill in all required fields.");
      return;
    }

    if (selectedCredits < 10) {
      setPaymentError("Minimum purchase is 10 credits.");
      return;
    }

    setIsProcessing(true);

    try {
      await loadRazorpay();

      const res = await fetch("/api/extension/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credits: selectedCredits,
          customer,
        }),
      });

      if (!res.ok) throw new Error("Failed to create order");

      const order = await res.json();

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
        amount: order.amount * 100,
        currency: "INR",
        name: "Rasphia",
        description: `Credit top-up (${selectedCredits} credits)`,
        order_id: order.id,
        prefill: {
          name: customer.name,
          email: customer.email,
          contact: customer.phone,
        },
        notes: {
          mode: "credit_topup",
          credits: selectedCredits.toString(),
          address: customer.address,
        },
        theme: { color: "#4E443C" },

        handler: async (response: any) => {
          try {
            const verifyRes = await fetch("/api/extension/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...response,
                credits: selectedCredits,
              }),
            });

            const verify = await verifyRes.json();
            if (verify.status !== "ok") throw new Error("Verification failed");

            setPaymentId(response.razorpay_payment_id);
            setCreditedCredits(selectedCredits);
            setPaymentSuccess(true);
          } catch (err: any) {
            setPaymentError(err.message || "Payment verification failed");
          } finally {
            setIsProcessing(false);
          }
        },

        modal: {
          ondismiss: () => setIsProcessing(false),
        },
      };

      new window.Razorpay(options).open();
    } catch (err: any) {
      setPaymentError(err.message || "Payment failed");
      setIsProcessing(false);
    }
  };

  /* ---------------- SUCCESS SCREEN ---------------- */
  if (paymentSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-white rounded-[32px] shadow-2xl max-w-md w-full p-8 text-center">
          <div className="text-green-600 text-4xl mb-3">✓</div>
          <h2 className="text-2xl font-serif text-amber-900 mb-2">
            Credits Reloaded Successfully
          </h2>

          <div className="bg-stone-50 rounded-xl p-4 text-sm space-y-2 text-left">
            <div className="flex justify-between">
              <span className="text-stone-500">Credits Added</span>
              <span className="font-semibold">{creditedCredits}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Payment ID</span>
              <span className="font-mono text-xs">{paymentId}</span>
            </div>
          </div>

          <button
            onClick={() => window.close()}
            className="mt-6 w-full py-3 rounded-full bg-stone-900 text-white hover:bg-black transition"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  /* ---------------- FAILURE SCREEN ---------------- */
  if (paymentError) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-white rounded-[32px] shadow-2xl max-w-md w-full p-8 text-center">
          <div className="text-red-500 text-4xl mb-3">⚠</div>
          <h2 className="text-2xl font-serif text-amber-900 mb-2">
            Payment Failed
          </h2>
          <p className="text-stone-600 mb-6">{paymentError}</p>

          <button
            onClick={resetForRetry}
            className="w-full py-3 rounded-full bg-stone-900 text-white hover:bg-black transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  /* ---------------- ORIGINAL STYLED CHECKOUT ---------------- */
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div className="relative w-full max-w-4xl bg-white/95 backdrop-blur-xl rounded-[32px] shadow-2xl grid grid-cols-1 md:grid-cols-2 overflow-hidden border border-white/50 animate-in fade-in zoom-in-95 duration-200">
        {/* LEFT */}
        <div className="p-8 bg-stone-50/50 flex flex-col relative h-full max-h-[90vh] overflow-y-auto">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600" />

          <h2 className="text-2xl font-serif text-amber-900 mb-2">
            Add Credits
          </h2>
          <p className="text-stone-500 mb-6 text-sm">
            Choose how many credits you want to purchase
          </p>

          <div className="grid grid-cols-3 gap-3 mb-6">
            {[50, 100, 200].map((credits) => (
              <button
                key={credits}
                onClick={() => handlePresetSelect(credits)}
                className={`p-4 rounded-xl border-2 transition-all ${
                  selectedCredits === credits && !customCredits
                    ? "border-amber-500 bg-amber-50 shadow-md"
                    : "border-stone-200 bg-white hover:border-amber-300"
                }`}
              >
                <div className="text-lg font-bold">{credits}</div>
                <div className="text-xs text-stone-500">credits</div>
              </button>
            ))}
          </div>

          <input
            type="number"
            min={10}
            step={10}
            value={customCredits}
            onChange={handleCustomInput}
            placeholder="Custom credits"
            className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl mb-6"
          />

          <div className="mt-auto border-t pt-4 flex justify-between text-lg font-semibold">
            <span>Total</span>
            <span>{formatPrice(amountInInr)}</span>
          </div>
        </div>

        {/* RIGHT */}
        <div className="p-8 bg-white/40">
          <h2 className="text-2xl font-serif text-amber-900 mb-6">
            Payment Details
          </h2>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handlePayment();
            }}
            className="space-y-5"
          >
            {["name", "email", "phone"].map((field) => (
              <input
                key={field}
                name={field}
                value={(customer as any)[field]}
                onChange={handleInputChange}
                placeholder={field.toUpperCase()}
                className="w-full px-4 py-2.5 border rounded-xl"
                required
              />
            ))}

            <textarea
              name="address"
              value={customer.address}
              onChange={handleInputChange}
              rows={3}
              placeholder="Billing address"
              className="w-full px-4 py-2.5 border rounded-xl"
              required
            />

            <button
              disabled={isProcessing}
              type="submit"
              className="w-full py-3.5 bg-stone-900 text-white rounded-full hover:bg-black disabled:bg-stone-400"
            >
              {isProcessing
                ? "Processing..."
                : `Pay ${formatPrice(amountInInr)}`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreditsCheckout;
