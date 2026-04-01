"use client";
import React, { useEffect, useRef, useState } from "react";
import type { Product, CheckoutCustomer, UserProfile } from "../types";
import { X, ShieldCheck } from "lucide-react";
import { PaymentModal, SeedhaPeProvider } from "@seedhape/react";
import type { CreateOrderOptions, OrderData } from "@seedhape/sdk";

type SeedhapeCheckoutOrder = {
  id: string; // SeedhaPe order ID (backward-compatible)
  seedhapeOrderId?: string;
  seedhapeBaseUrl?: string;
  internalOrderId?: string;
  appOrderId?: string | null;
  merchantId?: string;
  merchantName?: string;
  productName?: string;
  amount: number;
  currency: string;
  status: string;
  upiUri: string;
  qrCode: string;
  expiresAt: string;
  paymentLinks?: {
    upiUri?: string;
    androidIntents?: {
      gpay?: string;
      phonepe?: string;
      paytm?: string;
      bhim?: string;
    };
  };
};

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
  const unsupportedCreateOrder = async (
    _opts: CreateOrderOptions
  ): Promise<OrderData> => {
    throw new Error(
      "Direct SeedhaPe order creation is disabled in this flow. Use /api/create-order."
    );
  };

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
  const [activePayment, setActivePayment] = useState<SeedhapeCheckoutOrder | null>(
    null
  );
  const [pendingCustomer, setPendingCustomer] = useState<CheckoutCustomer | null>(
    null
  );
  const [paymentStatusText, setPaymentStatusText] = useState("");
  const pollRef = useRef<number | null>(null);
  const pendingPaymentsRef = useRef<SeedhapeCheckoutOrder[]>([]);

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
  }, [user, products]);

  useEffect(() => {
    return () => {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
      }
    };
  }, []);

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
      if (!res.ok) {
        const errorPayload = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(errorPayload?.error || "Failed to create order");
      }
      const payload = (await res.json()) as {
        orders?: SeedhapeCheckoutOrder[];
      } & SeedhapeCheckoutOrder;
      const orders = Array.isArray(payload.orders)
        ? payload.orders
        : payload?.id
        ? [payload]
        : [];
      if (
        !orders.length ||
        !orders[0]?.id ||
        !orders[0]?.upiUri ||
        !orders[0]?.seedhapeBaseUrl
      ) {
        throw new Error("Invalid order response");
      }

      const [first, ...rest] = orders;
      setActivePayment(first);
      pendingPaymentsRef.current = rest;
      setPendingCustomer(normalizedCustomer);
      setPaymentStatusText(
        `Waiting for payment confirmation (1/${orders.length})...`
      );
      startPaymentPolling(first.id, normalizedCustomer);
    } catch (err) {
      console.error("Payment error:", err);
      alert(
        err instanceof Error ? err.message : "Error initiating payment."
      );
      setIsProcessing(false);
    }
  };

  const checkPaymentStatus = async (
    orderId: string,
    normalizedCustomer?: CheckoutCustomer
  ) => {
    const activeOrder =
      activePayment && activePayment.id === orderId ? activePayment : null;
    const verifyRes = await fetch("/api/verify-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seedhape_order_id: orderId,
        internal_order_id: activeOrder?.internalOrderId,
        app_order_id: activeOrder?.appOrderId,
        customer: normalizedCustomer,
      }),
    });
    const verify = await verifyRes.json();
    if (verify.status === "ok") {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
      if (pendingPaymentsRef.current.length > 0) {
        const [nextOrder, ...rest] = pendingPaymentsRef.current;
        pendingPaymentsRef.current = rest;
        setActivePayment(nextOrder);
        setPaymentStatusText(`Payment confirmed for ${orderId}. Continue with next payment.`);
        if (normalizedCustomer) {
          startPaymentPolling(nextOrder.id, normalizedCustomer);
        }
        return;
      }

      setActivePayment(null);
      pendingPaymentsRef.current = [];
      setPendingCustomer(null);
      setIsProcessing(false);
      if (normalizedCustomer) {
        onPlaceOrder(normalizedCustomer, `seedhape_${orderId}`);
      }
      return;
    }
    if (verify.status === "expired") {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
      setActivePayment(null);
      pendingPaymentsRef.current = [];
      setPaymentStatusText("Payment expired. Please create a new checkout.");
      setIsProcessing(false);
      return;
    }
    setPaymentStatusText("Payment pending. Complete payment in your UPI app.");
  };

  const startPaymentPolling = (
    orderId: string,
    normalizedCustomer: CheckoutCustomer
  ) => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
    }
    pollRef.current = window.setInterval(() => {
      checkPaymentStatus(orderId, normalizedCustomer).catch((err) => {
        console.error("Payment poll error:", err);
      });
    }, 4000);
  };

  const inputClass = "w-full px-4 py-2.5 bg-brand-parchment/50 border border-brand-sand/50 rounded-xl focus:outline-none focus:border-brand-terracotta/40 focus:ring-2 focus:ring-brand-terracotta/10 text-sm text-brand-charcoal placeholder-brand-stone/40 transition-all";
  const labelClass = "block text-[10px] font-semibold uppercase tracking-widest text-brand-stone/60 mb-1.5";

  return (
    <SeedhaPeProvider
      onCreateOrder={unsupportedCreateOrder}
      baseUrl={
        activePayment?.seedhapeBaseUrl ||
        process.env.NEXT_PUBLIC_SEEDHAPE_BASE_URL ||
        undefined
      }
    >
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
              <input type="tel" name="phone" value={customer.phone} onChange={handleInputChange} required placeholder="10-digit number" className={inputClass} />
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
                <input type="text" name="zipCode" value={customer.zipCode || ""} onChange={handleInputChange} required placeholder="PIN" className={inputClass} />
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
                  Secured by SeedhaPe (UPI)
                </p>
              </div>
            </div>
          </form>
        </div>
      </div>

      {activePayment && (
        <>
          <PaymentModal
            orderId={activePayment.seedhapeOrderId || activePayment.id}
            open={true}
            onClose={() => {
              setPaymentStatusText(
                "Payment window closed. Re-open checkout to continue."
              );
            }}
            onSuccess={async (result) => {
              const customerToUse = pendingCustomer || customer;
              await checkPaymentStatus(result.orderId, customerToUse);
            }}
            onExpired={(orderId) => {
              setPaymentStatusText(`Order ${orderId} expired. Please retry checkout.`);
              setIsProcessing(false);
            }}
          />
          <div className="fixed bottom-4 left-1/2 z-[70] w-[min(92vw,560px)] -translate-x-1/2 rounded-2xl border border-brand-sand/40 bg-white/95 p-4 shadow-soft-xl backdrop-blur">
            <p className="text-xs text-brand-stone">
              Paying: {activePayment.productName || "Item"} •{" "}
              {formatPrice(activePayment.amount / 100)} • Merchant{" "}
              {activePayment.merchantName || activePayment.merchantId || "Store"}
            </p>
            <p className="mt-1 text-[11px] text-brand-stone/80">
              Track IDs: app {activePayment.appOrderId || "n/a"} • internal{" "}
              {activePayment.internalOrderId || "n/a"} • seedhape{" "}
              {activePayment.seedhapeOrderId || activePayment.id}
            </p>
            <p className="mt-2 text-xs text-brand-stone">{paymentStatusText}</p>
          </div>
        </>
      )}
      </div>
    </SeedhaPeProvider>
  );
};

export default CheckoutPage;
