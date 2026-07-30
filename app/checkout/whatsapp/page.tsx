"use client";

import { useEffect, useMemo, useState } from "react";

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
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    zipCode: string;
  };
  invoice: {
    invoiceNumber?: string | null;
    invoicePdfUrl?: string | null;
    invoiceSyncStatus?: string | null;
    verifiedAt?: string | null;
  };
};

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

export default function WhatsAppCheckoutPage() {
  const [session, setSession] = useState<CheckoutSessionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusText, setStatusText] = useState("");
  const [isOpeningCheckout, setIsOpeningCheckout] = useState(false);
  const token = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("token") || "";
  }, []);

  useEffect(() => {
    if (!token) {
      setError("Missing checkout token.");
      setIsLoading(false);
      return;
    }

    const load = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/whatsapp-checkout/session?token=${encodeURIComponent(token)}`);
        const data = (await res.json()) as CheckoutSessionResponse | { error?: string };
        if (!res.ok) {
          throw new Error("error" in data ? data.error || "Failed to load checkout." : "Failed to load checkout.");
        }
        setSession(data as CheckoutSessionResponse);
        if ((data as CheckoutSessionResponse).paid) {
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

    void load();
  }, [token]);

  const handleOpenRazorpay = async () => {
    if (!session || session.provider !== "razorpay") return;
    if (!session.razorpayOrderId || !session.razorpayKeyId) {
      setError("Razorpay checkout details are missing.");
      return;
    }

    setIsOpeningCheckout(true);
    setStatusText("");
    try {
      await loadRazorpay();
      const options = {
        key: session.razorpayKeyId,
        order_id: session.razorpayOrderId,
        amount: session.amount,
        currency: session.currency || "INR",
        name: "Rasphia",
        description: session.productName || "Checkout payment",
        prefill: {
          name: session.customer.name,
          email: session.customer.email,
          contact: session.customer.phone,
        },
        notes: {
          merchantId: session.merchantId || "",
          internalOrderId: session.internalOrderId || "",
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
                internal_order_id: session.internalOrderId,
                app_order_id: session.appOrderId,
                customer: session.customer,
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
            const refreshRes = await fetch(
              `/api/whatsapp-checkout/session?token=${encodeURIComponent(token)}`
            );
            const refreshed = (await refreshRes.json()) as CheckoutSessionResponse;
            if (refreshRes.ok) {
              setSession(refreshed);
            }
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
    } catch (checkoutError: unknown) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Failed to open Razorpay checkout."
      );
    } finally {
      setIsOpeningCheckout(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F8F4EF] px-4 py-10 text-brand-charcoal">
      <div className="mx-auto max-w-2xl rounded-[28px] border border-brand-sand/40 bg-white/90 p-6 shadow-[0_24px_60px_rgba(30,22,18,0.12)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-stone">
          Rasphia Checkout
        </p>
        <h1 className="mt-2 text-2xl font-semibold">Complete your payment</h1>

        {isLoading ? (
          <p className="mt-6 text-sm text-brand-stone">Loading checkout…</p>
        ) : error ? (
          <p className="mt-6 text-sm text-red-700">{error}</p>
        ) : session ? (
          <div className="mt-6 space-y-5">
            <div className="rounded-2xl border border-brand-sand/40 bg-brand-parchment/30 p-4">
              <p className="text-sm font-medium">{session.productName}</p>
              <p className="mt-1 text-sm text-brand-stone">
                Order ID: {session.orderId}
              </p>
              <p className="mt-2 text-xl font-semibold">
                {formatPrice(session.amount, session.currency)}
              </p>
            </div>

            <div className="rounded-2xl border border-brand-sand/40 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-stone">
                Customer
              </p>
              <p className="mt-2 text-sm">{session.customer.name}</p>
              <p className="text-sm text-brand-stone">{session.customer.email}</p>
              <p className="text-sm text-brand-stone">{session.customer.phone}</p>
              <p className="mt-1 text-sm text-brand-stone">{session.customer.address}</p>
            </div>

            {session.paid ? (
              <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
                <p className="text-sm font-medium text-green-900">Payment verified</p>
                <p className="mt-1 text-sm text-green-800">
                  Verified at {session.invoice.verifiedAt ? new Date(session.invoice.verifiedAt).toLocaleString("en-IN") : "just now"}.
                </p>
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
            ) : session.provider === "razorpay" ? (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => void handleOpenRazorpay()}
                  disabled={isOpeningCheckout}
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-brand-charcoal px-4 py-3 text-sm font-medium text-white"
                >
                  {isOpeningCheckout ? "Opening checkout…" : "Continue to secure payment"}
                </button>
                <p className="text-xs text-brand-stone">
                  This uses the same Rasphia Razorpay checkout flow as the website.
                </p>
              </div>
            ) : (
              <p className="text-sm text-brand-stone">
                This checkout session is not a Razorpay web checkout.
              </p>
            )}

            {statusText ? <p className="text-sm text-brand-stone">{statusText}</p> : null}
          </div>
        ) : null}
      </div>
    </main>
  );
}
