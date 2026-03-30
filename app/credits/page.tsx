"use client";
import React, { useState, useEffect } from "react";
import type { CheckoutCustomer } from "../types";
import { useSession } from "next-auth/react";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const CREDITS_PER_INR = 1;

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
    if (!customer.name || !customer.email || !customer.phone || !customer.address) {
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
        body: JSON.stringify({ credits: selectedCredits, customer }),
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
        theme: { color: "#2C2420" },

        handler: async (response: any) => {
          try {
            const verifyRes = await fetch("/api/extension/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...response, credits: selectedCredits }),
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

  const inputClass =
    "w-full px-4 py-2.5 bg-brand-parchment/50 border border-brand-sand/50 rounded-xl text-sm text-brand-charcoal placeholder:text-brand-stone/50 focus:outline-none focus:border-brand-terracotta/40 focus:ring-2 focus:ring-brand-terracotta/10 transition-all";

  /* SUCCESS */
  if (paymentSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-charcoal/50 backdrop-blur-sm p-4 font-body">
        <div className="bg-white rounded-3xl shadow-soft-xl max-w-md w-full p-8 text-center border border-brand-sand/30">
          <div className="h-14 w-14 rounded-full bg-brand-parchment flex items-center justify-center mx-auto mb-4">
            <span className="text-brand-terracotta text-2xl">✓</span>
          </div>
          <h2 className="font-heading text-2xl text-brand-charcoal mb-2">
            Credits Added
          </h2>
          <div className="bg-brand-parchment/50 rounded-2xl p-4 text-sm space-y-2 text-left border border-brand-sand/30 my-4">
            <div className="flex justify-between">
              <span className="text-brand-stone">Credits added</span>
              <span className="font-semibold text-brand-charcoal">{creditedCredits}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-brand-stone">Payment ID</span>
              <span className="font-mono text-xs text-brand-stone/70">{paymentId}</span>
            </div>
          </div>
          <button
            onClick={() => window.close()}
            className="mt-2 w-full py-3 rounded-xl bg-brand-charcoal text-brand-cream text-sm font-medium hover:bg-brand-warm-black transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  /* ERROR */
  if (paymentError) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-charcoal/50 backdrop-blur-sm p-4 font-body">
        <div className="bg-white rounded-3xl shadow-soft-xl max-w-md w-full p-8 text-center border border-brand-sand/30">
          <div className="h-14 w-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <span className="text-red-500 text-2xl">⚠</span>
          </div>
          <h2 className="font-heading text-2xl text-brand-charcoal mb-2">Payment Failed</h2>
          <p className="text-brand-stone text-sm mb-6">{paymentError}</p>
          <button
            onClick={resetForRetry}
            className="w-full py-3 rounded-xl bg-brand-charcoal text-brand-cream text-sm font-medium hover:bg-brand-warm-black transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  /* CHECKOUT */
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 font-body">
      <div className="absolute inset-0 bg-brand-charcoal/50 backdrop-blur-sm" />

      <div className="relative w-full max-w-4xl bg-white/95 backdrop-blur-xl rounded-3xl shadow-soft-xl grid grid-cols-1 md:grid-cols-2 overflow-hidden border border-brand-sand/30">
        {/* LEFT */}
        <div className="p-8 bg-brand-parchment/40 flex flex-col relative h-full max-h-[90vh] overflow-y-auto">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-clay via-brand-terracotta to-brand-coral" />

          <h2 className="font-heading text-2xl text-brand-charcoal mb-1">Add Credits</h2>
          <p className="text-brand-stone text-sm mb-6">
            Choose how many credits to purchase
          </p>

          <div className="grid grid-cols-3 gap-3 mb-6">
            {[50, 100, 200].map((credits) => (
              <button
                key={credits}
                onClick={() => handlePresetSelect(credits)}
                className={`p-4 rounded-xl border-2 transition-all text-center ${
                  selectedCredits === credits && !customCredits
                    ? "border-brand-terracotta bg-brand-parchment shadow-soft"
                    : "border-brand-sand/50 bg-white hover:border-brand-clay/50"
                }`}
              >
                <div className="text-lg font-bold text-brand-charcoal">{credits}</div>
                <div className="text-xs text-brand-stone">credits</div>
              </button>
            ))}
          </div>

          <input
            type="number"
            min={10}
            step={10}
            value={customCredits}
            onChange={handleCustomInput}
            placeholder="Custom amount"
            className={inputClass}
          />

          <div className="mt-auto border-t border-brand-sand/40 pt-4 flex justify-between text-sm font-semibold text-brand-charcoal mt-6">
            <span>Total</span>
            <span>{formatPrice(amountInInr)}</span>
          </div>
        </div>

        {/* RIGHT */}
        <div className="p-8 bg-white/60">
          <h2 className="font-heading text-2xl text-brand-charcoal mb-6">Payment Details</h2>

          <form
            onSubmit={(e) => { e.preventDefault(); handlePayment(); }}
            className="space-y-4"
          >
            {["name", "email", "phone"].map((field) => (
              <input
                key={field}
                name={field}
                value={(customer as any)[field]}
                onChange={handleInputChange}
                placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                className={inputClass}
                required
              />
            ))}

            <textarea
              name="address"
              value={customer.address}
              onChange={handleInputChange}
              rows={3}
              placeholder="Billing address"
              className={`${inputClass} resize-none`}
              required
            />

            <button
              disabled={isProcessing}
              type="submit"
              className="w-full py-3 bg-brand-charcoal text-brand-cream rounded-xl text-sm font-medium hover:bg-brand-warm-black disabled:bg-brand-stone/50 transition-colors shadow-soft"
            >
              {isProcessing ? "Processing…" : `Pay ${formatPrice(amountInInr)}`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreditsCheckout;
