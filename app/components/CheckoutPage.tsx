"use client";
import React, { useState, useEffect } from "react";
import type { Product, CheckoutCustomer, UserProfile } from "../types";
import { X, ShieldCheck } from "lucide-react";

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
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    zipCode: "",
  });
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedSavedAddress, setSelectedSavedAddress] = useState("");

  const SHIPPING_COST = 0;
  const subtotal = products.reduce((sum, p, idx) => {
    const key = `${p._id || p.name}-${idx}`;
    const qty = quantities[key] || 1;
    return sum + (p.price as number) * qty;
  }, 0);
  const totalAmount = subtotal + SHIPPING_COST;

  useEffect(() => {
    setCustomer({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      address: user.address || "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      zipCode: "",
    });
    const initialQuantities: Record<string, number> = {};
    products.forEach((p, idx) => {
      initialQuantities[`${p._id || p.name}-${idx}`] = 1;
    });
    setQuantities(initialQuantities);

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, [user, products]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCustomer((prev) => ({ ...prev, [name]: value }));
  };

  const buildAddress = (c: CheckoutCustomer) =>
    [
      c.addressLine1?.trim(),
      c.addressLine2?.trim(),
      `${(c.city || "").trim()}, ${(c.state || "").trim()} ${(c.zipCode || "").trim()}`.trim(),
    ].filter(Boolean).join(", ");

  const validateCheckout = (c: CheckoutCustomer) => {
    if (!c.name.trim() || !c.email.trim()) return "Please fill in all required fields.";
    if (!/^\+?[0-9\s\-()]{8,20}$/.test(c.phone.trim())) return "Phone number format is invalid.";
    if ((c.addressLine1 || "").trim().length < 3) return "Address line 1 must be at least 3 characters.";
    if ((c.addressLine2 || "").trim().length < 2) return "Address line 2 must be at least 2 characters.";
    if ((c.city || "").trim().length < 2) return "City must be at least 2 characters.";
    if ((c.state || "").trim().length < 2) return "State must be at least 2 characters.";
    if (!/^[A-Za-z0-9\- ]{4,12}$/.test((c.zipCode || "").trim())) return "ZIP code format is invalid.";
    return null;
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(price);

  const handlePayment = async () => {
    const normalizedCustomer: CheckoutCustomer = {
      ...customer,
      addressLine1: (customer.addressLine1 || "").trim(),
      addressLine2: (customer.addressLine2 || "").trim(),
      city: (customer.city || "").trim(),
      state: (customer.state || "").trim(),
      zipCode: (customer.zipCode || "").trim(),
      address: buildAddress(customer),
    };
    const validationError = validateCheckout(normalizedCustomer);
    if (validationError) { alert(validationError); return; }
    setIsProcessing(true);
    try {
      const res = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          products: products.map((p, idx) => {
            const key = `${p._id || p.name}-${idx}`;
            return { ...p, quantity: quantities[key] || 1 };
          }),
          customer: normalizedCustomer,
          totalAmount,
        }),
      });
      if (!res.ok) throw new Error("Failed to create order");
      const order = await res.json();
      if (!order?.id) throw new Error("Invalid order");
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
        amount: order.amount,
        currency: order.currency,
        name: "Rasphia",
        description: `Purchase of ${products.length} item(s)`,
        image: products[0]?.imageUrl || "",
        order_id: order.id,
        prefill: {
          name: normalizedCustomer.name,
          email: normalizedCustomer.email,
          contact: normalizedCustomer.phone,
        },
        notes: {
          items: products.map((p, idx) => { const key = `${p._id || p.name}-${idx}`; return `${p.name} x${quantities[key] || 1}`; }).join(", "),
          address: normalizedCustomer.address,
        },
        theme: { color: "#2C2420" },
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch("/api/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...response,
                customer: normalizedCustomer,
                products: products.map((p, idx) => {
                  const key = `${p._id || p.name}-${idx}`;
                  return { ...p, quantity: quantities[key] || 1 };
                }),
                totalAmount,
              }),
            });
            const verify = await verifyRes.json();
            if (verify.status === "ok") {
              onPlaceOrder(normalizedCustomer, response.razorpay_payment_id);
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
        modal: { ondismiss: () => setIsProcessing(false) },
      };
      new window.Razorpay(options).open();
    } catch (err) {
      console.error("Payment error:", err);
      alert("Error initiating payment.");
      setIsProcessing(false);
    }
  };

  const inputClass = "w-full px-4 py-2.5 bg-brand-parchment/50 border border-brand-sand/50 rounded-xl focus:outline-none focus:border-brand-terracotta/40 focus:ring-2 focus:ring-brand-terracotta/10 text-sm text-brand-charcoal placeholder-brand-stone/40 transition-all";
  const labelClass = "block text-[10px] font-semibold uppercase tracking-widest text-brand-stone/60 mb-1.5";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-brand-warm-black/30 backdrop-blur-sm"
        onClick={onCancel}
      />

      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-soft-xl grid grid-cols-1 md:grid-cols-2 overflow-hidden border border-brand-sand/30">
        {/* Close */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 z-10 h-10 w-10 flex items-center justify-center rounded-xl border border-brand-sand/40 bg-white text-brand-stone hover:bg-brand-parchment transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* LEFT — Order summary */}
        <div className="p-8 bg-brand-parchment/40 flex flex-col max-h-[90vh] overflow-y-auto custom-scrollbar border-b md:border-b-0 md:border-r border-brand-sand/30">
          <h2 className="font-heading text-2xl text-brand-charcoal mb-1">
            Order summary
          </h2>
          <p className="text-sm text-brand-stone mb-6">
            Review items before payment
          </p>

          <div className="space-y-3 mb-6">
            {products.map((product, idx) => {
              const key = `${product._id || product.name}-${idx}`;
              const qty = quantities[key] || 1;
              return (
                <div
                  key={key}
                  className="flex items-start gap-4 p-4 bg-white rounded-2xl border border-brand-sand/30 shadow-soft"
                >
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="h-16 w-16 object-cover rounded-xl flex-shrink-0 border border-brand-sand/20"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-brand-charcoal truncate">
                      {product.name}
                    </h3>
                    <p className="text-xs text-brand-stone">{product.brand}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQuantities((prev) => ({ ...prev, [key]: Math.max(1, (prev[key] || 1) - 1) }))}
                        className="h-6 w-6 rounded-lg border border-brand-sand text-brand-charcoal text-sm flex items-center justify-center hover:bg-brand-parchment transition-colors"
                      >
                        −
                      </button>
                      <span className="text-xs font-medium text-brand-charcoal min-w-[16px] text-center">{qty}</span>
                      <button
                        type="button"
                        onClick={() => setQuantities((prev) => ({ ...prev, [key]: (prev[key] || 1) + 1 }))}
                        className="h-6 w-6 rounded-lg border border-brand-sand text-brand-charcoal text-sm flex items-center justify-center hover:bg-brand-parchment transition-colors"
                      >
                        +
                      </button>
                    </div>
                    <p className="text-sm font-semibold text-brand-charcoal mt-1">
                      {formatPrice((product.price as number) * qty)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-auto pt-4 border-t border-brand-sand/40 space-y-2">
            <div className="flex justify-between text-sm text-brand-stone">
              <span>Subtotal</span>
              <span className="font-medium text-brand-charcoal">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-brand-stone">
              <span>Shipping</span>
              <span className="text-brand-sage font-medium">Free</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-brand-sand/30">
              <span className="font-semibold text-brand-charcoal">Total</span>
              <span className="font-heading text-2xl text-brand-charcoal">{formatPrice(totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* RIGHT — Shipping form */}
        <div className="p-8 bg-white flex flex-col max-h-[90vh] overflow-y-auto custom-scrollbar">
          <h2 className="font-heading text-2xl text-brand-charcoal mb-6">
            Shipping details
          </h2>

          <form
            onSubmit={(e) => { e.preventDefault(); handlePayment(); }}
            className="flex flex-col gap-4 flex-1"
          >
            <div>
              <label className={labelClass}>Full Name</label>
              <input type="text" name="name" value={customer.name} onChange={handleInputChange} required placeholder="Your name" className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Email</label>
              <input type="email" name="email" value={customer.email} onChange={handleInputChange} required placeholder="you@example.com" className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Phone</label>
              <input type="tel" name="phone" value={customer.phone} onChange={handleInputChange} required pattern="^\+?[0-9\s\-()]{8,20}$" placeholder="10-digit number" className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Address</label>
              {!!user.addressBook?.length && (
                <select
                  value={selectedSavedAddress}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedSavedAddress(value);
                    const found = user.addressBook?.find((a) => a.address === value);
                    if (found) {
                      setCustomer((prev) => ({ ...prev, name: found.name, phone: found.phone, addressLine1: found.addressLine1, addressLine2: found.addressLine2, city: found.city, state: found.state, zipCode: found.zipCode, address: found.address }));
                    }
                  }}
                  className={`${inputClass} mb-2`}
                >
                  <option value="">Use a saved address</option>
                  {user.addressBook.map((a) => (
                    <option key={a.address} value={a.address}>{a.name} · {a.address}</option>
                  ))}
                </select>
              )}
              <input type="text" name="addressLine1" value={customer.addressLine1 || ""} onChange={handleInputChange} required minLength={3} placeholder="Address line 1" className={`${inputClass} mb-2`} />
              <input type="text" name="addressLine2" value={customer.addressLine2 || ""} onChange={handleInputChange} required minLength={2} placeholder="Address line 2 / Landmark" className={`${inputClass} mb-2`} />
              <div className="grid grid-cols-3 gap-2">
                <input type="text" name="city" value={customer.city || ""} onChange={handleInputChange} required minLength={2} placeholder="City" className={inputClass} />
                <input type="text" name="state" value={customer.state || ""} onChange={handleInputChange} required minLength={2} placeholder="State" className={inputClass} />
                <input type="text" name="zipCode" value={customer.zipCode || ""} onChange={handleInputChange} required pattern="[A-Za-z0-9\\- ]{4,12}" placeholder="PIN" className={inputClass} />
              </div>
            </div>

            <div className="mt-auto pt-4">
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-3.5 rounded-xl bg-brand-charcoal text-brand-cream font-medium hover:bg-brand-warm-black transition-all shadow-soft-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? "Processing…" : `Pay ${formatPrice(totalAmount)}`}
              </button>
              <div className="flex items-center justify-center gap-1.5 mt-3">
                <ShieldCheck className="h-3.5 w-3.5 text-brand-sage" />
                <p className="text-[11px] text-brand-stone/60">
                  Secured by Razorpay
                </p>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
