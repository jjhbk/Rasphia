"use client";

import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, ShieldCheck, MapPin, Package, CreditCard } from "lucide-react";
import type { CheckoutCustomer, SavedAddress } from "@/app/types";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

type CheckoutSessionResponse = {
  ok: boolean;
  paid: boolean;
  provider: "razorpay" | "seedhape";
  razorpayOrderId?: string;
  razorpayKeyId?: string;
  internalOrderId: string;
  orderId: string;
  appOrderId?: string | null;
  merchantId?: string;
  amount: number;
  currency: string;
  status: string;
  productName: string;
  products: Array<{
    productId: string;
    name: string;
    brand?: string;
    imageUrl?: string;
    price: number;
    quantity: number;
  }>;
  customer: CheckoutCustomer;
  savedAddresses?: SavedAddress[];
  invoice: {
    invoiceNumber?: string | null;
    invoicePdfUrl?: string | null;
    invoiceSyncStatus?: string | null;
    verifiedAt?: string | null;
  };
  paymentId?: string | null;
};

function normalizeSavedAddress(address: SavedAddress): CheckoutCustomer {
  return {
    name: address.name || "",
    email: "",
    phone: address.phone || "",
    address: address.address || "",
    addressLine1: address.addressLine1 || "",
    addressLine2: address.addressLine2 || "",
    city: address.city || "",
    state: address.state || "",
    zipCode: address.zipCode || "",
  };
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

function formatPrice(amountPaise: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(Math.round(Number(amountPaise || 0)) / 100);
}

function buildAddress(customer: CheckoutCustomer) {
  return [
    (customer.addressLine1 || "").trim(),
    (customer.addressLine2 || "").trim(),
    `${(customer.city || "").trim()}, ${(customer.state || "").trim()} ${(customer.zipCode || "").trim()}`.trim(),
  ]
    .filter(Boolean)
    .join(", ");
}

function validateCheckout(customer: CheckoutCustomer) {
  if (!customer.name.trim() || !customer.email.trim()) {
    return "Please fill in your name and email.";
  }
  if (!/^\+?[0-9\s\-()]{8,20}$/.test(customer.phone.trim())) {
    return "Phone number format is invalid.";
  }
  if ((customer.addressLine1 || "").trim().length < 3) {
    return "Address line 1 must be at least 3 characters.";
  }
  if ((customer.addressLine2 || "").trim().length < 2) {
    return "Address line 2 must be at least 2 characters.";
  }
  if ((customer.city || "").trim().length < 2) {
    return "City must be at least 2 characters.";
  }
  if ((customer.state || "").trim().length < 2) {
    return "State must be at least 2 characters.";
  }
  if (!/^[A-Za-z0-9\- ]{4,12}$/.test((customer.zipCode || "").trim())) {
    return "ZIP code format is invalid.";
  }
  return null;
}

export default function WhatsAppCheckoutPage() {
  const [session, setSession] = useState<CheckoutSessionResponse | null>(null);
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
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPreparingCheckout, setIsPreparingCheckout] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [selectedAddressIndex, setSelectedAddressIndex] = useState("0");
  const token = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("token") || "";
  }, []);

  const hydrateSession = async () => {
    if (!token) {
      setError("Missing checkout token.");
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const res = await fetch(`/api/whatsapp-checkout/session?token=${encodeURIComponent(token)}`);
      const data = (await res.json()) as CheckoutSessionResponse | { error?: string };
      if (!res.ok) {
        throw new Error("error" in data ? data.error || "Failed to load checkout." : "Failed to load checkout.");
      }
      const nextSession = data as CheckoutSessionResponse;
      setSession(nextSession);
      setCustomer({
        ...nextSession.customer,
        address: nextSession.customer.address || buildAddress(nextSession.customer),
      });
      setSelectedAddressIndex(nextSession.savedAddresses?.length ? "0" : "");
      setQuantity(Math.max(1, Number(nextSession.products?.[0]?.quantity || 1)));
      if (nextSession.paid) {
        setStatusText("Payment already verified for this order.");
      }
    } catch (checkoutError: unknown) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Failed to load checkout."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void hydrateSession();
  }, [token]);

  const handleCustomerChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setCustomer((current) => ({ ...current, [name]: value }));
    if (selectedAddressIndex) {
      setSelectedAddressIndex("");
    }
    if (error) setError(null);
  };

  const handleSavedAddressChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextIndex = event.target.value;
    setSelectedAddressIndex(nextIndex);
    if (!session?.savedAddresses || !nextIndex) {
      return;
    }
    const selectedAddress = session.savedAddresses[Number(nextIndex)];
    if (!selectedAddress) {
      return;
    }
    setCustomer((current) => ({
      ...current,
      ...normalizeSavedAddress(selectedAddress),
      name: current.name || selectedAddress.name || "",
      email: current.email,
      phone: selectedAddress.phone || current.phone || "",
      address: selectedAddress.address || buildAddress(normalizeSavedAddress(selectedAddress)),
    }));
    if (error) setError(null);
  };

  const openRazorpay = async (preparedSession: CheckoutSessionResponse, preparedCustomer: CheckoutCustomer) => {
    if (!preparedSession.razorpayOrderId || !preparedSession.razorpayKeyId) {
      throw new Error("Razorpay checkout details are missing.");
    }
    await loadRazorpay();
    const options = {
      key: preparedSession.razorpayKeyId,
      order_id: preparedSession.razorpayOrderId,
      amount: preparedSession.amount,
      currency: preparedSession.currency || "INR",
      name: "Rasphia",
      description: preparedSession.productName || "Checkout payment",
      prefill: {
        name: preparedCustomer.name,
        email: preparedCustomer.email,
        contact: preparedCustomer.phone,
      },
      notes: {
        merchantId: preparedSession.merchantId || "",
        internalOrderId: preparedSession.internalOrderId || "",
        channel: "whatsapp",
      },
      theme: { color: "#2C2420" },
      handler: async (response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => {
        setStatusText("Payment successful. Verifying...");
        try {
          const verifyRes = await fetch("/api/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...response,
              internal_order_id: preparedSession.internalOrderId,
              app_order_id: preparedSession.appOrderId,
              customer: preparedCustomer,
            }),
          });
          const verify = (await verifyRes.json()) as {
            status?: string;
            message?: string;
            invoiceWarning?: string | null;
          };
          if (verify.status !== "ok") {
            throw new Error(verify.message || "Payment verification failed.");
          }
          setStatusText(
            verify.invoiceWarning || "Payment verified. Invoice is ready below."
          );
          await hydrateSession();
        } catch (verifyError: unknown) {
          setError(
            verifyError instanceof Error
              ? verifyError.message
              : "Payment verification failed."
          );
        }
      },
      modal: {
        ondismiss: () => {
          setStatusText("Checkout window closed. You can reopen it below.");
        },
      },
    };
    new window.Razorpay(options).open();
  };

  const handleContinueToPayment = async () => {
    if (!session) return;
    const normalizedCustomer: CheckoutCustomer = {
      ...customer,
      name: customer.name.trim(),
      email: customer.email.trim().toLowerCase(),
      phone: customer.phone.trim(),
      addressLine1: (customer.addressLine1 || "").trim(),
      addressLine2: (customer.addressLine2 || "").trim(),
      city: (customer.city || "").trim(),
      state: (customer.state || "").trim(),
      zipCode: (customer.zipCode || "").trim(),
      address: buildAddress(customer),
    };
    const validationError = validateCheckout(normalizedCustomer);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setStatusText("Preparing checkout...");
    setIsPreparingCheckout(true);
    try {
      const res = await fetch("/api/whatsapp-checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          quantity,
          customer: normalizedCustomer,
        }),
      });
      const data = (await res.json()) as CheckoutSessionResponse | { error?: string };
      if (!res.ok) {
        throw new Error("error" in data ? data.error || "Failed to prepare checkout." : "Failed to prepare checkout.");
      }
      const preparedSession = data as CheckoutSessionResponse;
      setSession(preparedSession);
      setCustomer(normalizedCustomer);
      if (preparedSession.paid) {
        setStatusText("Payment already verified for this order.");
        return;
      }
      if (preparedSession.provider !== "razorpay") {
        throw new Error("This hosted checkout currently supports Razorpay only.");
      }
      setStatusText("");
      await openRazorpay(preparedSession, normalizedCustomer);
    } catch (checkoutError: unknown) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Failed to prepare checkout."
      );
      setStatusText("");
    } finally {
      setIsPreparingCheckout(false);
    }
  };

  const primaryProduct = session?.products?.[0] || null;
  const computedAmount = primaryProduct
    ? Math.max(100, Math.round(Number(primaryProduct.price || 0) * quantity * 100))
    : session?.amount || 0;

  return (
    <main className="min-h-screen bg-[#F8F4EF] px-4 py-10 text-brand-charcoal">
      <div className="mx-auto max-w-5xl rounded-[30px] border border-brand-sand/40 bg-white/90 p-5 shadow-[0_24px_60px_rgba(30,22,18,0.12)] sm:p-6">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-[26px] border border-brand-sand/35 bg-brand-parchment/25 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-stone">
              Rasphia Checkout
            </p>
            <h1 className="mt-2 text-2xl font-semibold">Complete your order</h1>

            {isLoading ? (
              <p className="mt-6 text-sm text-brand-stone">Loading checkout…</p>
            ) : error ? (
              <p className="mt-6 text-sm text-red-700">{error}</p>
            ) : session ? (
              <div className="mt-6 space-y-5">
                {primaryProduct ? (
                  <div className="overflow-hidden rounded-[24px] border border-brand-sand/35 bg-white">
                    <div className="grid gap-0 sm:grid-cols-[180px_1fr]">
                      <div className="bg-brand-cream/50">
                        {primaryProduct.imageUrl ? (
                          <img
                            src={primaryProduct.imageUrl}
                            alt={primaryProduct.name}
                            className="h-full min-h-[180px] w-full object-cover"
                          />
                        ) : (
                          <div className="flex min-h-[180px] items-center justify-center text-brand-stone">
                            <Package className="h-10 w-10" />
                          </div>
                        )}
                      </div>
                      <div className="p-5">
                        <p className="text-lg font-semibold">{primaryProduct.name}</p>
                        {primaryProduct.brand ? (
                          <p className="mt-1 text-sm text-brand-stone">{primaryProduct.brand}</p>
                        ) : null}
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-brand-stone">
                              Unit price
                            </p>
                            <p className="mt-1 text-base font-medium">
                              {formatPrice(Math.round(Number(primaryProduct.price || 0) * 100), session.currency)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-brand-stone">
                              Quantity
                            </p>
                            <div className="mt-1 inline-flex items-center rounded-full border border-brand-sand/50 bg-white">
                              <button
                                type="button"
                                onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                                className="px-3 py-2 text-brand-charcoal"
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <span className="min-w-10 text-center text-sm font-medium">{quantity}</span>
                              <button
                                type="button"
                                onClick={() => setQuantity((current) => current + 1)}
                                className="px-3 py-2 text-brand-charcoal"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="rounded-[24px] border border-brand-sand/35 bg-white p-5">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-brand-terracotta" />
                    <p className="text-sm font-semibold">Customer details</p>
                  </div>
                  {session.savedAddresses?.length ? (
                    <div className="mt-4">
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-brand-stone">
                        Saved address
                      </label>
                      <select
                        value={selectedAddressIndex}
                        onChange={handleSavedAddressChange}
                        className="w-full rounded-2xl border border-brand-sand/50 bg-white px-4 py-3 text-sm"
                      >
                        {session.savedAddresses.map((address, index) => (
                          <option key={`${address.address}-${index}`} value={String(index)}>
                            {address.address || `${address.addressLine1}, ${address.city}`}
                          </option>
                        ))}
                        <option value="">Enter a different address manually</option>
                      </select>
                    </div>
                  ) : null}
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <input
                      name="name"
                      value={customer.name}
                      onChange={handleCustomerChange}
                      placeholder="Full name"
                      className="rounded-2xl border border-brand-sand/50 bg-white px-4 py-3 text-sm"
                    />
                    <input
                      name="email"
                      value={customer.email}
                      onChange={handleCustomerChange}
                      placeholder="Email"
                      className="rounded-2xl border border-brand-sand/50 bg-white px-4 py-3 text-sm"
                    />
                    <input
                      name="phone"
                      value={customer.phone}
                      onChange={handleCustomerChange}
                      placeholder="Phone number"
                      className="rounded-2xl border border-brand-sand/50 bg-white px-4 py-3 text-sm"
                    />
                    <input
                      name="addressLine1"
                      value={customer.addressLine1 || ""}
                      onChange={handleCustomerChange}
                      placeholder="Address line 1"
                      className="rounded-2xl border border-brand-sand/50 bg-white px-4 py-3 text-sm"
                    />
                    <input
                      name="addressLine2"
                      value={customer.addressLine2 || ""}
                      onChange={handleCustomerChange}
                      placeholder="Address line 2"
                      className="rounded-2xl border border-brand-sand/50 bg-white px-4 py-3 text-sm"
                    />
                    <input
                      name="city"
                      value={customer.city || ""}
                      onChange={handleCustomerChange}
                      placeholder="City"
                      className="rounded-2xl border border-brand-sand/50 bg-white px-4 py-3 text-sm"
                    />
                    <input
                      name="state"
                      value={customer.state || ""}
                      onChange={handleCustomerChange}
                      placeholder="State"
                      className="rounded-2xl border border-brand-sand/50 bg-white px-4 py-3 text-sm"
                    />
                    <input
                      name="zipCode"
                      value={customer.zipCode || ""}
                      onChange={handleCustomerChange}
                      placeholder="ZIP / Postal code"
                      className="rounded-2xl border border-brand-sand/50 bg-white px-4 py-3 text-sm"
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </section>

          <aside className="rounded-[26px] border border-brand-sand/35 bg-white p-5">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-brand-sage" />
              <p className="text-sm font-semibold">Order summary</p>
            </div>

            {session ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-brand-sand/35 bg-brand-cream/30 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{primaryProduct?.name || session.productName}</p>
                      <p className="mt-1 text-xs text-brand-stone">Order ID: {session.orderId}</p>
                    </div>
                    <p className="text-sm font-semibold">
                      {formatPrice(computedAmount, session.currency)}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm text-brand-stone">
                    <span>Quantity</span>
                    <span>{quantity}</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-brand-sand/35 bg-brand-parchment/25 p-4 text-sm">
                  <div className="flex items-center gap-2 text-brand-charcoal">
                    <ShieldCheck className="h-4 w-4 text-brand-sage" />
                    Secure Razorpay checkout on Rasphia
                  </div>
                </div>

                {session.paid ? (
                  <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
                    <p className="text-sm font-medium text-green-900">Payment verified</p>
                    <p className="mt-1 text-sm text-green-800">
                      Verified at {session.invoice.verifiedAt ? new Date(session.invoice.verifiedAt).toLocaleString("en-IN") : "just now"}.
                    </p>
                    {session.paymentId ? (
                      <p className="mt-1 text-sm text-green-800">Payment ID: {session.paymentId}</p>
                    ) : null}
                    {session.invoice.invoiceNumber ? (
                      <p className="mt-2 text-sm text-green-800">
                        Invoice {session.invoice.invoiceNumber} is ready.
                      </p>
                    ) : null}
                    {session.invoice.invoicePdfUrl ? (
                      <a
                        href={session.invoice.invoicePdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-block text-sm font-medium text-green-900 underline"
                      >
                        Open invoice
                      </a>
                    ) : null}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleContinueToPayment()}
                    disabled={isPreparingCheckout || isLoading}
                    className="inline-flex w-full items-center justify-center rounded-2xl bg-brand-charcoal px-4 py-3 text-sm font-medium text-white"
                  >
                    {isPreparingCheckout ? "Preparing checkout…" : "Continue to payment"}
                  </button>
                )}

                {statusText ? (
                  <p className="text-sm text-brand-stone">{statusText}</p>
                ) : null}
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </main>
  );
}
