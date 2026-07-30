"use client";
import React, { useEffect, useRef, useState } from "react";
import type { Product, CheckoutCustomer, UserProfile } from "../types";
import { X, ShieldCheck, Package, MapPin, CreditCard, ArrowLeft, Truck } from "lucide-react";
import { PaymentModal, SeedhaPeProvider } from "@seedhape/react";
import type { CreateOrderOptions, OrderData } from "@seedhape/sdk";
import BrandLogo from "./brand/BrandLogo";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const loadRazorpay = () =>
  new Promise<void>((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay checkout."));
    document.body.appendChild(script);
  });

type CheckoutPaymentOrder = {
  id: string;
  provider: "seedhape" | "razorpay";
  seedhapeOrderId?: string;
  seedhapeBaseUrl?: string;
  internalOrderId?: string;
  appOrderId?: string | null;
  merchantId?: string;
  merchantName?: string;
  productName?: string;
  productIds?: string[];
  amount: number;
  currency: string;
  status: string;
  upiUri?: string;
  qrCode?: string;
  expiresAt?: string;
  paymentLinks?: {
    upiUri?: string;
    androidIntents?: {
      gpay?: string;
      phonepe?: string;
      paytm?: string;
      bhim?: string;
    };
  };
  razorpayOrderId?: string;
  razorpayKeyId?: string;
  checkoutPrefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
};

interface CheckoutPageProps {
  products: Product[];
  user: UserProfile;
  onPlaceOrder: (customer: CheckoutCustomer, paymentIds: string[]) => void;
  onPaymentGroupVerified?: (payload: {
    customer: CheckoutCustomer;
    paymentId: string;
    merchantId?: string;
    productIds: string[];
  }) => void;
  onCancel: () => void;
}

function buildCustomerFromProfile(user: UserProfile): CheckoutCustomer {
  const primaryAddress = Array.isArray(user.addressBook) && user.addressBook.length > 0
    ? user.addressBook[0]
    : null;

  return {
    name: user.name || "",
    email: user.email || "",
    phone: user.phone || "",
    address: primaryAddress?.address || "",
    addressLine1: primaryAddress?.addressLine1 || "",
    addressLine2: primaryAddress?.addressLine2 || "",
    city: primaryAddress?.city || "",
    state: primaryAddress?.state || "",
    zipCode: primaryAddress?.zipCode || "",
  };
}

const CheckoutPage: React.FC<CheckoutPageProps> = ({
  products,
  user,
  onPlaceOrder,
  onPaymentGroupVerified,
  onCancel,
}) => {
  const unsupportedCreateOrder = async (
    _opts: CreateOrderOptions
  ): Promise<OrderData> => {
    void _opts;
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
  const [activePayment, setActivePayment] = useState<CheckoutPaymentOrder | null>(null);
  const [isSeedhapeModalOpen, setIsSeedhapeModalOpen] = useState(false);
  const [pendingCustomer, setPendingCustomer] = useState<CheckoutCustomer | null>(null);
  const [paymentStatusText, setPaymentStatusText] = useState("");
  const [paymentProgress, setPaymentProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const pendingPaymentsRef = useRef<CheckoutPaymentOrder[]>([]);
  const successHandledRef = useRef<Set<string>>(new Set());
  const completedPaymentIdsRef = useRef<string[]>([]);

  const SHIPPING_COST = 0;
  const subtotal = products.reduce((sum, p, idx) => {
    const key = `${p._id || p.name}-${idx}`;
    const qty = quantities[key] || 1;
    return sum + (p.price as number) * qty;
  }, 0);
  const totalAmount = subtotal + SHIPPING_COST;

  useEffect(() => {
    const profileCustomer = buildCustomerFromProfile(user);
    setCustomer(profileCustomer);
    setSelectedSavedAddress(profileCustomer.address || "");
    const initialQuantities: Record<string, number> = {};
    products.forEach((p, idx) => {
      initialQuantities[`${p._id || p.name}-${idx}`] = 1;
    });
    setQuantities(initialQuantities);
  }, [user, products]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCustomer((prev) => ({ ...prev, [name]: value }));
    if (selectedSavedAddress) {
      setSelectedSavedAddress("");
    }
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
      const payload = (await res.json()) as {
        orders?: CheckoutPaymentOrder[];
      } & CheckoutPaymentOrder;
      const orders = Array.isArray(payload.orders)
        ? payload.orders
        : payload?.id
        ? [payload]
        : [];
      if (!orders.length || !orders[0]?.id || !orders[0]?.provider) {
        throw new Error("Invalid order response");
      }
      const [first, ...rest] = orders;
      successHandledRef.current.clear();
      completedPaymentIdsRef.current = [];
      setActivePayment(first);
      pendingPaymentsRef.current = rest;
      setPendingCustomer(normalizedCustomer);
      setPaymentProgress({ current: 1, total: orders.length });
      setPaymentStatusText(
        `Order created (1/${orders.length}). Complete payment via ${
          first.provider === "razorpay" ? "Razorpay" : "SeedhaPe"
        }.`
      );
      if (first.provider === "seedhape") {
        setIsSeedhapeModalOpen(true);
      } else {
        await openRazorpayCheckout(first, normalizedCustomer);
      }
    } catch (err) {
      console.error("Payment error:", err);
      setFormError(err instanceof Error ? err.message : "Error initiating payment.");
      setIsProcessing(false);
    }
  };

  const handleVerifiedPaymentSuccess = (
    payment: CheckoutPaymentOrder,
    orderId: string,
    normalizedCustomer?: CheckoutCustomer,
    invoiceWarning?: string | null
  ) => {
    const completedPaymentId =
      payment.seedhapeOrderId || payment.razorpayOrderId || orderId;
    if (successHandledRef.current.has(completedPaymentId)) {
      return;
    }
    successHandledRef.current.add(completedPaymentId);
    if (!completedPaymentIdsRef.current.includes(completedPaymentId)) {
      completedPaymentIdsRef.current.push(completedPaymentId);
    }
    if (normalizedCustomer) {
      onPaymentGroupVerified?.({
        customer: normalizedCustomer,
        paymentId: completedPaymentId,
        merchantId: payment.merchantId,
        productIds: Array.isArray(payment.productIds)
          ? payment.productIds
          : [],
      });
    }

    if (pendingPaymentsRef.current.length > 0) {
      const [nextOrder, ...rest] = pendingPaymentsRef.current;
      pendingPaymentsRef.current = rest;
      setIsSeedhapeModalOpen(false);
      setActivePayment(nextOrder);
      setPaymentProgress((prev) =>
        prev ? { ...prev, current: Math.min(prev.current + 1, prev.total) } : prev
      );
      setPaymentStatusText(
        `Payment confirmed for ${orderId}. Continue with next ${
          nextOrder.provider === "razorpay" ? "Razorpay" : "SeedhaPe"
        } payment.`
      );
      if (nextOrder.provider === "seedhape") {
        window.setTimeout(() => setIsSeedhapeModalOpen(true), 120);
      } else if (normalizedCustomer) {
        window.setTimeout(() => {
          void openRazorpayCheckout(nextOrder, normalizedCustomer);
        }, 120);
      }
      return;
    }

    setPaymentStatusText(
      invoiceWarning || "Payment verified. Finalizing order..."
    );
    setIsSeedhapeModalOpen(false);
    pendingPaymentsRef.current = [];
    setPendingCustomer(null);
    setIsProcessing(false);
    setPaymentProgress(null);
    if (normalizedCustomer) {
      onPlaceOrder(
        normalizedCustomer,
        [...completedPaymentIdsRef.current]
      );
    }
    setActivePayment(null);
  };

  const checkPaymentStatus = async (orderId: string, normalizedCustomer?: CheckoutCustomer) => {
    const activeOrder = activePayment && activePayment.id === orderId ? activePayment : null;
    if (!activeOrder) {
      setPaymentStatusText("This payment session has already advanced. Please check your order status.");
      return;
    }
    const verifyBody =
      activeOrder.provider === "razorpay"
        ? {
            razorpay_order_id: orderId,
            internal_order_id: activeOrder?.internalOrderId,
            app_order_id: activeOrder?.appOrderId,
            customer: normalizedCustomer,
          }
        : {
            seedhape_order_id: orderId,
            internal_order_id: activeOrder?.internalOrderId,
            app_order_id: activeOrder?.appOrderId,
            customer: normalizedCustomer,
          };
    const verifyRes = await fetch("/api/verify-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(verifyBody),
    });
    const verify = await verifyRes.json();
    if (verify.status === "ok") {
      handleVerifiedPaymentSuccess(
        activeOrder,
        orderId,
        normalizedCustomer,
        typeof verify.invoiceWarning === "string" ? verify.invoiceWarning : null
      );
      return;
    }
    if (verify.status === "expired") {
      setIsSeedhapeModalOpen(false);
      pendingPaymentsRef.current = [];
      setPaymentStatusText("Payment expired. Please create a new checkout.");
      setIsProcessing(false);
      setPaymentProgress(null);
      return;
    }
    if (verify.status === "disputed") {
      setIsSeedhapeModalOpen(false);
      setPaymentStatusText("Payment marked as disputed. Please contact support before retrying.");
      setIsProcessing(false);
      return;
    }
    setPaymentStatusText(
      activeOrder.provider === "razorpay"
        ? "Payment is still pending in Razorpay. Complete payment and try again."
        : "Payment pending. Complete payment in your UPI app."
    );
  };

  const openRazorpayCheckout = async (
    payment: CheckoutPaymentOrder,
    normalizedCustomer: CheckoutCustomer
  ) => {
    if (payment.provider !== "razorpay") return;
    if (!payment.razorpayOrderId || !payment.razorpayKeyId) {
      throw new Error("Razorpay checkout details are missing.");
    }

    const razorpayOrderId = payment.razorpayOrderId;
    const razorpayKeyId = payment.razorpayKeyId;

    await loadRazorpay();

    const options = {
      key: razorpayKeyId,
      order_id: razorpayOrderId,
      amount: payment.amount,
      currency: payment.currency || "INR",
      name: payment.merchantName || "Rasphia",
      description: payment.productName || "Checkout payment",
      prefill: {
        name: payment.checkoutPrefill?.name || normalizedCustomer.name,
        email: payment.checkoutPrefill?.email || normalizedCustomer.email,
        contact: payment.checkoutPrefill?.contact || normalizedCustomer.phone,
      },
      notes: {
        merchantId: payment.merchantId || "",
        internalOrderId: payment.internalOrderId || "",
      },
      theme: { color: "#2C2420" },
      handler: async (response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => {
        setPaymentStatusText("Payment successful. Verifying confirmation...");
        try {
          const verifyRes = await fetch("/api/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...response,
              internal_order_id: payment.internalOrderId,
              app_order_id: payment.appOrderId,
              customer: normalizedCustomer,
            }),
          });
          const verify = await verifyRes.json();
          if (verify.status !== "ok") {
            throw new Error(verify.message || "Razorpay verification failed.");
          }
          handleVerifiedPaymentSuccess(
            payment,
            razorpayOrderId,
            normalizedCustomer,
            typeof verify.invoiceWarning === "string" ? verify.invoiceWarning : null
          );
        } catch (err) {
          console.error("Razorpay verify error:", err);
          setPaymentStatusText(
            err instanceof Error
              ? err.message
              : "Payment completed, but verification failed. Please check order status in profile."
          );
          setIsProcessing(false);
        }
      },
      modal: {
        ondismiss: () => {
          setPaymentStatusText("Payment window closed.");
          setIsProcessing(false);
        },
      },
    };

    new window.Razorpay(options).open();
  };

  const handleOpenPaymentWindow = () => {
    if (!activePayment) return;
    if (activePayment.provider === "seedhape") {
      setIsSeedhapeModalOpen(true);
      return;
    }
    const customerToUse = pendingCustomer || customer;
    void openRazorpayCheckout(activePayment, customerToUse);
  };

  const handleVerifyCurrentPayment = async () => {
    if (!activePayment || isVerifyingPayment) return;
    setIsVerifyingPayment(true);
    try {
      const customerToUse = pendingCustomer || customer;
      await checkPaymentStatus(
        activePayment.seedhapeOrderId ||
          activePayment.razorpayOrderId ||
          activePayment.id,
        customerToUse
      );
    } catch (err) {
      console.error("Manual verify payment error:", err);
      setPaymentStatusText("Could not verify payment right now. Please try again.");
    } finally {
      setIsVerifyingPayment(false);
    }
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
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-brand-warm-black/35 backdrop-blur-md p-4 sm:p-6">
        <div className="hero-panel relative my-auto w-full max-w-5xl overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between border-b border-brand-sand/20 px-6 py-5 sm:px-7">
            <div className="flex items-center gap-3">
              <button
                onClick={onCancel}
                className="h-8 w-8 flex items-center justify-center rounded-xl text-brand-stone hover:bg-white hover:text-brand-charcoal transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <BrandLogo size={22} showWordmark wordmarkClassName="text-[13px] font-semibold hidden sm:block" />
            </div>

            <div className="hidden md:block">
              <span className="hero-kicker">Secure Checkout</span>
            </div>

            <button
              onClick={onCancel}
              className="h-8 w-8 flex items-center justify-center rounded-xl border border-brand-sand/40 bg-white text-brand-stone hover:bg-brand-parchment transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1.04fr_0.96fr]">
            {/* LEFT — Order summary */}
            <div className="border-b border-brand-sand/30 bg-brand-parchment/25 p-6 md:border-b-0 md:border-r md:p-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
              <div className="flex items-center gap-2 mb-5">
                <Package className="h-4 w-4 text-brand-terracotta" />
                <h2 className="font-heading text-lg text-brand-charcoal">Order summary</h2>
              </div>

              <div className="surface-card-soft mb-5 rounded-[1.25rem] p-4">
                <p className="metric-pill-label">Checkout Flow</p>
                <div className="mt-3 flex items-center gap-3 text-sm">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-brand-charcoal shadow-soft">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-terracotta text-[11px] font-bold text-white">1</span>
                    Details
                  </span>
                  <span className="h-px flex-1 bg-brand-sand/60" />
                  <span className="inline-flex items-center gap-2 rounded-full border border-brand-sand/60 bg-white/70 px-3 py-2 text-brand-stone">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full border border-brand-sand/60 text-[11px]">2</span>
                    Payment
                  </span>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                {products.map((product, idx) => {
                  const key = `${product._id || product.name}-${idx}`;
                  const qty = quantities[key] || 1;
                  return (
                    <div
                      key={key}
                      className="surface-card flex items-start gap-4 p-4"
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
            <div className="bg-white/78 p-6 sm:p-8 flex flex-col max-h-[75vh] overflow-y-auto custom-scrollbar">
              <div className="flex items-center gap-2 mb-6">
                <MapPin className="h-4 w-4 text-brand-terracotta" />
                <h2 className="font-heading text-lg text-brand-charcoal">Shipping details</h2>
              </div>

              <div className="surface-card-soft mb-5 rounded-[1.25rem] p-4">
                <p className="metric-pill-label">What We Preload</p>
                <p className="mt-2 text-sm leading-relaxed text-brand-stone">
                  Your profile and saved addresses are used to prefill details when available. You can still adjust anything before paying.
                </p>
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
                    className="btn btn-primary w-full py-3.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
                      Payments secured by your merchant&apos;s configured provider
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
                key={activePayment.seedhapeOrderId || activePayment.id}
                orderId={activePayment.seedhapeOrderId || activePayment.id}
                open={isSeedhapeModalOpen}
                onClose={() => {
                  setIsSeedhapeModalOpen(false);
                  setPaymentStatusText(
                    pendingPaymentsRef.current.length > 0
                      ? "Payment window closed. Re-open to continue remaining payments."
                      : "Payment window closed."
                  );
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
              <p className="mt-0.5 text-[11px] text-brand-stone/80">
                Provider: {activePayment.provider === "razorpay" ? "Razorpay" : "SeedhaPe"}
              </p>
              {paymentProgress && (
                <p className="mt-0.5 text-[11px] text-brand-stone/80">
                  Payment step {paymentProgress.current} of {paymentProgress.total}
                </p>
              )}
              <p className="mt-0.5 text-[11px] text-brand-stone/60 font-mono">
                {activePayment.seedhapeOrderId ||
                  activePayment.razorpayOrderId ||
                  activePayment.id}
              </p>
              <p className="mt-2 text-xs text-brand-stone">{paymentStatusText}</p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenPaymentWindow}
                  className="rounded-lg bg-brand-charcoal px-3 py-1.5 text-xs text-white hover:bg-brand-warm-black"
                >
                  Open payment window
                </button>
                {activePayment.provider === "seedhape" && (
                  <button
                    type="button"
                    onClick={handleVerifyCurrentPayment}
                    disabled={isVerifyingPayment}
                    className="rounded-lg border border-brand-sand/60 px-3 py-1.5 text-xs text-brand-charcoal disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isVerifyingPayment ? "Verifying..." : "I paid, verify now"}
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </SeedhaPeProvider>
  );
};

export default CheckoutPage;
