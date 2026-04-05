"use client";
import React, { useEffect, useRef, useState } from "react";
import type { Product, CheckoutCustomer, UserProfile } from "../types";
import { X, ShieldCheck, Package, MapPin, CreditCard, ArrowLeft, Truck } from "lucide-react";
import { PaymentModal, SeedhaPeProvider } from "@seedhape/react";
import type { CreateOrderOptions, OrderData } from "@seedhape/sdk";
import BrandLogo from "./brand/BrandLogo";

type SeedhapeCheckoutOrder = {
  id: string;
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
  const [activePayment, setActivePayment] = useState<SeedhapeCheckoutOrder | null>(null);
  const [isSeedhapeModalOpen, setIsSeedhapeModalOpen] = useState(false);
  const [pendingCustomer, setPendingCustomer] = useState<CheckoutCustomer | null>(null);
  const [paymentStatusText, setPaymentStatusText] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const pendingPaymentsRef = useRef<SeedhapeCheckoutOrder[]>([]);
  const successHandledRef = useRef<Set<string>>(new Set());

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCustomer((prev) => ({ ...prev, [name]: value }));
    if (formError) setFormError(null);
  };

  const buildAddress = (c: CheckoutCustomer) =>
    [
      c.addressLine1?.trim(),
      c.addressLine2?.trim(),
      `${(c.city || "").trim()}, ${(c.state || "").trim()} ${(c.zipCode || "").trim()}`.trim(),
    ]
      .filter(Boolean)
      .join(", ");

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
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setIsProcessing(true);
    setFormError(null);
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
        const errorPayload = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errorPayload?.error || "Failed to create order");
      }
      const payload = (await res.json()) as { orders?: SeedhapeCheckoutOrder[] } & SeedhapeCheckoutOrder;
      const orders = Array.isArray(payload.orders)
        ? payload.orders
        : payload?.id
        ? [payload]
        : [];
      if (!orders.length || !orders[0]?.id || !orders[0]?.upiUri || !orders[0]?.seedhapeBaseUrl) {
        throw new Error("Invalid order response");
      }
      const [first, ...rest] = orders;
      successHandledRef.current.clear();
      setActivePayment(first);
      setIsSeedhapeModalOpen(true);
      pendingPaymentsRef.current = rest;
      setPendingCustomer(normalizedCustomer);
      setPaymentStatusText(`Order created (1/${orders.length}). Complete payment in SeedhaPe.`);
    } catch (err) {
      console.error("Payment error:", err);
      setFormError(err instanceof Error ? err.message : "Error initiating payment.");
      setIsProcessing(false);
    }
  };

  const checkPaymentStatus = async (orderId: string, normalizedCustomer?: CheckoutCustomer) => {
    const activeOrder = activePayment && activePayment.id === orderId ? activePayment : null;
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
      if (pendingPaymentsRef.current.length > 0) {
        const [nextOrder, ...rest] = pendingPaymentsRef.current;
        pendingPaymentsRef.current = rest;
        setActivePayment(nextOrder);
        setIsSeedhapeModalOpen(true);
        setPaymentStatusText(`Payment confirmed for ${orderId}. Continue with next payment.`);
        return;
      }
      setPaymentStatusText("Payment verified. Finalizing order...");
      setIsSeedhapeModalOpen(false);
      pendingPaymentsRef.current = [];
      setPendingCustomer(null);
      setIsProcessing(false);
      if (normalizedCustomer) {
        onPlaceOrder(normalizedCustomer, `seedhape_${orderId}`);
      }
      setActivePayment(null);
      return;
    }
    if (verify.status === "expired") {
      setIsSeedhapeModalOpen(false);
      pendingPaymentsRef.current = [];
      setPaymentStatusText("Payment expired. Please create a new checkout.");
      setIsProcessing(false);
      return;
    }
    if (verify.status === "disputed") {
      setIsSeedhapeModalOpen(false);
      setPaymentStatusText("Payment marked as disputed. Please contact support before retrying.");
      setIsProcessing(false);
      return;
    }
    setPaymentStatusText("Payment pending. Complete payment in your UPI app.");
  };

  const inputClass =
    "w-full px-3.5 py-2.5 bg-white border border-brand-sand/60 rounded-xl focus:outline-none focus:border-brand-terracotta/50 focus:ring-2 focus:ring-brand-terracotta/10 text-sm text-brand-charcoal placeholder-brand-stone/40 transition-all";
  const labelClass =
    "block text-[10px] font-semibold uppercase tracking-widest text-brand-stone/60 mb-1.5";

  return (
    <SeedhaPeProvider
      onCreateOrder={unsupportedCreateOrder}
      baseUrl={
        activePayment?.seedhapeBaseUrl ||
        process.env.NEXT_PUBLIC_SEEDHAPE_BASE_URL ||
        undefined
      }
    >
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-brand-warm-black/30 backdrop-blur-sm p-4 sm:p-6">
        <div className="relative w-full max-w-4xl my-auto bg-white rounded-3xl shadow-[0_32px_80px_rgba(30,22,18,0.22)] border border-brand-sand/30 overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-brand-sand/20 bg-brand-parchment/40">
            <div className="flex items-center gap-3">
              <button
                onClick={onCancel}
                className="h-8 w-8 flex items-center justify-center rounded-xl text-brand-stone hover:bg-white hover:text-brand-charcoal transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <BrandLogo size={22} showWordmark wordmarkClassName="text-[13px] font-semibold hidden sm:block" />
            </div>

            {/* Steps */}
            <div className="flex items-center gap-2 text-[11px] font-medium">
              <span className="flex items-center gap-1.5 text-brand-terracotta">
                <span className="h-5 w-5 rounded-full bg-brand-terracotta text-white text-[10px] flex items-center justify-center font-bold">1</span>
                Details
              </span>
              <span className="w-8 h-px bg-brand-sand/60" />
              <span className="flex items-center gap-1.5 text-brand-stone/50">
                <span className="h-5 w-5 rounded-full border border-brand-sand/60 text-[10px] flex items-center justify-center">2</span>
                Payment
              </span>
            </div>

            <button
              onClick={onCancel}
              className="h-8 w-8 flex items-center justify-center rounded-xl border border-brand-sand/40 bg-white text-brand-stone hover:bg-brand-parchment transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* LEFT — Order summary */}
            <div className="p-6 sm:p-8 bg-brand-parchment/30 flex flex-col border-b md:border-b-0 md:border-r border-brand-sand/30 max-h-[75vh] overflow-y-auto custom-scrollbar">
              <div className="flex items-center gap-2 mb-5">
                <Package className="h-4 w-4 text-brand-terracotta" />
                <h2 className="font-heading text-lg text-brand-charcoal">Order summary</h2>
              </div>

              <div className="space-y-3 mb-6">
                {products.map((product, idx) => {
                  const key = `${product._id || product.name}-${idx}`;
                  const qty = quantities[key] || 1;
                  return (
                    <div
                      key={key}
                      className="flex items-start gap-4 p-4 bg-white rounded-2xl border border-brand-sand/30 shadow-soft"
                    >
                      <div className="h-16 w-16 rounded-xl overflow-hidden flex-shrink-0 border border-brand-sand/20 bg-brand-parchment/40">
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-brand-charcoal truncate leading-tight">
                          {product.name}
                        </h3>
                        {product.brand && (
                          <p className="text-xs text-brand-stone mt-0.5">{product.brand}</p>
                        )}
                        <div className="mt-2.5 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setQuantities((prev) => ({
                                ...prev,
                                [key]: Math.max(1, (prev[key] || 1) - 1),
                              }))
                            }
                            className="h-7 w-7 rounded-lg border border-brand-sand/60 text-brand-charcoal text-sm flex items-center justify-center hover:bg-brand-parchment transition-colors font-medium"
                          >
                            −
                          </button>
                          <span className="text-sm font-semibold text-brand-charcoal min-w-[20px] text-center">
                            {qty}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setQuantities((prev) => ({
                                ...prev,
                                [key]: (prev[key] || 1) + 1,
                              }))
                            }
                            className="h-7 w-7 rounded-lg border border-brand-sand/60 text-brand-charcoal text-sm flex items-center justify-center hover:bg-brand-parchment transition-colors font-medium"
                          >
                            +
                          </button>
                          <span className="ml-auto text-sm font-semibold text-brand-charcoal">
                            {formatPrice((product.price as number) * qty)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Totals */}
              <div className="mt-auto space-y-2 pt-4 border-t border-brand-sand/40">
                <div className="flex justify-between text-sm text-brand-stone">
                  <span>Subtotal</span>
                  <span className="font-medium text-brand-charcoal">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-brand-stone">
                  <span className="flex items-center gap-1.5">
                    <Truck className="h-3.5 w-3.5 text-brand-sage" />
                    Shipping
                  </span>
                  <span className="text-brand-sage font-medium">Free</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-brand-sand/30">
                  <span className="font-semibold text-brand-charcoal">Total</span>
                  <span className="font-heading text-2xl text-brand-charcoal">{formatPrice(totalAmount)}</span>
                </div>
              </div>

              {/* Trust badges */}
              <div className="mt-4 pt-4 border-t border-brand-sand/30 flex flex-wrap gap-3">
                {[
                  { icon: <ShieldCheck className="h-3 w-3 text-brand-sage" />, label: "Secure checkout" },
                  { icon: <Truck className="h-3 w-3 text-brand-sage" />, label: "Free delivery" },
                  { icon: <Package className="h-3 w-3 text-brand-sage" />, label: "Easy returns" },
                ].map((b) => (
                  <div key={b.label} className="flex items-center gap-1.5 text-[11px] text-brand-stone">
                    {b.icon}
                    {b.label}
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT — Shipping form */}
            <div className="p-6 sm:p-8 bg-white flex flex-col max-h-[75vh] overflow-y-auto custom-scrollbar">
              <div className="flex items-center gap-2 mb-6">
                <MapPin className="h-4 w-4 text-brand-terracotta" />
                <h2 className="font-heading text-lg text-brand-charcoal">Shipping details</h2>
              </div>

              {formError && (
                <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2">
                  <span className="mt-0.5 h-4 w-4 rounded-full bg-red-200 text-red-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">!</span>
                  {formError}
                </div>
              )}

              <form
                onSubmit={(e) => { e.preventDefault(); handlePayment(); }}
                className="flex flex-col gap-5 flex-1"
              >
                {/* Contact */}
                <div>
                  <p className="text-xs font-semibold text-brand-charcoal mb-3 flex items-center gap-1.5">
                    <span className="h-4 w-4 rounded-full bg-brand-parchment text-brand-terracotta text-[10px] flex items-center justify-center font-bold">1</span>
                    Contact information
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className={labelClass}>Full name</label>
                      <input type="text" name="name" value={customer.name} onChange={handleInputChange} required placeholder="Your name" className={inputClass} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Email</label>
                        <input type="email" name="email" value={customer.email} onChange={handleInputChange} required placeholder="you@example.com" className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Phone</label>
                        <input type="tel" name="phone" value={customer.phone} onChange={handleInputChange} required placeholder="+91 XXXXX XXXXX" className={inputClass} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Delivery */}
                <div>
                  <p className="text-xs font-semibold text-brand-charcoal mb-3 flex items-center gap-1.5">
                    <span className="h-4 w-4 rounded-full bg-brand-parchment text-brand-terracotta text-[10px] flex items-center justify-center font-bold">2</span>
                    Delivery address
                  </p>
                  <div className="space-y-3">
                    {!!user.addressBook?.length && (
                      <div>
                        <label className={labelClass}>Saved addresses</label>
                        <select
                          value={selectedSavedAddress}
                          onChange={(e) => {
                            const value = e.target.value;
                            setSelectedSavedAddress(value);
                            const found = user.addressBook?.find((a) => a.address === value);
                            if (found) {
                              setCustomer((prev) => ({
                                ...prev,
                                name: found.name,
                                phone: found.phone,
                                addressLine1: found.addressLine1,
                                addressLine2: found.addressLine2,
                                city: found.city,
                                state: found.state,
                                zipCode: found.zipCode,
                                address: found.address,
                              }));
                            }
                          }}
                          className={inputClass}
                        >
                          <option value="">Choose a saved address…</option>
                          {user.addressBook.map((a) => (
                            <option key={a.address} value={a.address}>
                              {a.name} · {a.address}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div>
                      <label className={labelClass}>Address line 1</label>
                      <input type="text" name="addressLine1" value={customer.addressLine1 || ""} onChange={handleInputChange} required minLength={3} placeholder="Flat / House no., Building" className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Address line 2</label>
                      <input type="text" name="addressLine2" value={customer.addressLine2 || ""} onChange={handleInputChange} required minLength={2} placeholder="Street, Landmark" className={inputClass} />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className={labelClass}>City</label>
                        <input type="text" name="city" value={customer.city || ""} onChange={handleInputChange} required minLength={2} placeholder="City" className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>State</label>
                        <input type="text" name="state" value={customer.state || ""} onChange={handleInputChange} required minLength={2} placeholder="State" className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>PIN code</label>
                        <input type="text" name="zipCode" value={customer.zipCode || ""} onChange={handleInputChange} required placeholder="6-digit PIN" className={inputClass} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <div className="mt-auto pt-4">
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-brand-charcoal text-brand-cream font-medium text-sm hover:bg-brand-warm-black transition-all shadow-soft-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? (
                      <>
                        <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        Processing…
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4" />
                        Pay {formatPrice(totalAmount)}
                      </>
                    )}
                  </button>
                  <div className="flex items-center justify-center gap-1.5 mt-3">
                    <ShieldCheck className="h-3.5 w-3.5 text-brand-sage" />
                    <p className="text-[11px] text-brand-stone/60">
                      Payments secured by SeedhaPe · UPI
                    </p>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>

        {activePayment && (
          <>
            {isSeedhapeModalOpen && (
              <PaymentModal
                orderId={activePayment.seedhapeOrderId || activePayment.id}
                open={isSeedhapeModalOpen}
                onClose={() => {
                  setIsSeedhapeModalOpen(false);
                  setPaymentStatusText("Payment window closed.");
                }}
                onSuccess={async (result) => {
                  if (successHandledRef.current.has(result.orderId)) return;
                  successHandledRef.current.add(result.orderId);
                  setIsSeedhapeModalOpen(false);
                  setPaymentStatusText("Payment successful. Verifying confirmation...");
                  const customerToUse = pendingCustomer || customer;
                  try {
                    await checkPaymentStatus(result.orderId, customerToUse);
                  } catch (err) {
                    console.error("Payment verify error after success:", err);
                    setPaymentStatusText(
                      "Payment completed, but verification failed. Please check order status in profile."
                    );
                    setIsProcessing(false);
                  }
                }}
                onExpired={(orderId) => {
                  setIsSeedhapeModalOpen(false);
                  setPaymentStatusText(`Order ${orderId} expired. Please retry checkout.`);
                  setIsProcessing(false);
                }}
              />
            )}
            <div className="fixed bottom-4 left-1/2 z-[70] w-[min(92vw,560px)] -translate-x-1/2 rounded-2xl border border-brand-sand/40 bg-white/95 p-4 shadow-soft-xl backdrop-blur">
              <p className="text-xs font-medium text-brand-charcoal">
                {activePayment.productName || "Item"} · {formatPrice(activePayment.amount / 100)}
              </p>
              <p className="mt-0.5 text-[11px] text-brand-stone/60 font-mono">
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
