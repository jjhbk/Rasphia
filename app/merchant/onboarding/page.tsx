"use client";

import { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import Link from "next/link";

type MerchantStatus = "approved" | "pending" | "rejected";

type Merchant = {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  locationLink: string | null;
  status: MerchantStatus;
};

export default function MerchantOnboardingPage() {
  const { data: session, status } = useSession();
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [form, setForm] = useState({
    businessName: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    zipCode: "",
    locationLink: "",
  });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "loading") {
      setLoading(true);
      return;
    }

    if (status !== "authenticated") {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/merchants/apply");
        const data = await res.json();
        if (data?.merchant) {
          setMerchant(data.merchant);
          setForm({
            businessName: data.merchant.name || "",
            phone: data.merchant.phone || "",
            addressLine1: data.merchant.addressLine1 || "",
            addressLine2: data.merchant.addressLine2 || "",
            city: data.merchant.city || "",
            state: data.merchant.state || "",
            zipCode: data.merchant.zipCode || "",
            locationLink: data.merchant.locationLink || "",
          });
        }
      } catch (e) {
        console.error(e);
        setError("Could not load merchant application.");
      } finally {
        setLoading(false);
      }
    })();
  }, [status]);

  const inputClass =
    "w-full rounded-xl border border-brand-sand/50 bg-brand-parchment/50 px-3 py-2.5 text-sm text-brand-charcoal placeholder:text-brand-stone/50 outline-none focus:border-brand-terracotta/40 focus:ring-2 focus:ring-brand-terracotta/10 transition-all";

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-brand-cream flex items-center justify-center font-body">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-brand-charcoal flex items-center justify-center">
            <span className="font-heading text-lg text-brand-cream">R</span>
          </div>
          <p className="text-sm text-brand-stone">Loading…</p>
        </div>
      </div>
    );
  }

  if (!session?.user?.email) {
    return (
      <div className="min-h-screen bg-brand-cream flex items-center justify-center p-6 font-body">
        <div className="max-w-md w-full rounded-3xl border border-brand-sand/30 bg-white/80 p-8 text-center shadow-soft-md backdrop-blur-xl space-y-5">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-brand-charcoal">
            <span className="font-heading text-base text-brand-cream">R</span>
          </div>
          <div>
            <p className="font-heading text-xl text-brand-charcoal">Rasphia</p>
            <p className="text-[10px] uppercase tracking-widest text-brand-stone/60 mt-1">
              Merchant Onboarding
            </p>
          </div>
          <p className="text-brand-stone text-sm">
            Sign in to submit your merchant application.
          </p>
          <button
            onClick={() => signIn("google")}
            className="inline-flex w-full items-center justify-center rounded-xl bg-brand-charcoal px-5 py-2.5 text-sm font-medium text-brand-cream hover:bg-brand-warm-black transition-colors shadow-soft"
          >
            Continue with Google
          </button>
          <Link href="/" className="inline-flex text-sm text-brand-stone hover:text-brand-charcoal transition-colors">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const statusBadge =
    merchant?.status === "approved"
      ? "bg-green-50 text-green-700 border-green-200"
      : merchant?.status === "rejected"
      ? "bg-red-50 text-red-700 border-red-200"
      : "bg-brand-parchment text-brand-terracotta border-brand-sand/50";

  const shouldShowForm = !merchant || merchant.status === "rejected";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (form.businessName.trim().length < 2) {
      setError("Business name must be at least 2 characters.");
      return;
    }
    if (!/^\+?[0-9\s\-()]{8,20}$/.test(form.phone.trim())) {
      setError("Phone number format is invalid.");
      return;
    }
    if (form.addressLine1.trim().length < 3) {
      setError("Address line 1 must be at least 3 characters.");
      return;
    }
    if (form.addressLine2.trim().length < 2) {
      setError("Address line 2 must be at least 2 characters.");
      return;
    }
    if (form.city.trim().length < 2) {
      setError("City must be at least 2 characters.");
      return;
    }
    if (form.state.trim().length < 2) {
      setError("State must be at least 2 characters.");
      return;
    }
    if (!/^[A-Za-z0-9\- ]{4,12}$/.test(form.zipCode.trim())) {
      setError("ZIP code format is invalid.");
      return;
    }
    if (!form.locationLink.trim()) {
      setError("Location link is required.");
      return;
    }
    if (!/^https?:\/\/.+/i.test(form.locationLink.trim())) {
      setError("Location link must be a valid URL.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/merchants/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to submit");
      setMerchant(data.merchant);
      setMessage(data.message || "Application submitted.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-cream font-body">
      <div className="relative bg-brand-parchment border-b border-brand-sand/40">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-parchment to-brand-cream pointer-events-none" />
        <div className="relative max-w-2xl mx-auto px-6 py-10 md:py-14">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-brand-stone/60 mb-1">Rasphia</p>
              <h1 className="font-heading text-3xl text-brand-charcoal">Merchant Onboarding</h1>
            </div>
            {merchant?.status && (
              <span className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-wider font-semibold border ${statusBadge}`}>
                {merchant.status}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-5">
        {merchant?.status === "approved" && (
          <div className="rounded-2xl bg-green-50 border border-green-200 p-4 text-green-800 text-sm">
            Your merchant account is approved. You can now access the management dashboard.
            <div className="mt-3">
              <Link href="/admin" className="font-medium underline">Go to Dashboard</Link>
            </div>
          </div>
        )}

        {merchant?.status === "pending" && (
          <div className="rounded-2xl bg-brand-parchment border border-brand-sand/40 p-4 text-brand-terracotta text-sm">
            Your application is under review. We will notify you after admin approval.
          </div>
        )}

        {message && (
          <div className="rounded-2xl bg-green-50 border border-green-200 p-3 text-green-700 text-sm">{message}</div>
        )}
        {error && (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-3 text-red-700 text-sm">{error}</div>
        )}

        <div className="rounded-3xl border border-brand-sand/30 bg-white/70 backdrop-blur-xl p-6 md:p-8 shadow-soft space-y-5">
          {shouldShowForm ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-widest font-medium text-brand-stone/60 block mb-1.5">
                  Business Name
                </label>
                <input
                  value={form.businessName}
                  onChange={(e) => setForm((p) => ({ ...p, businessName: e.target.value }))}
                  className={inputClass}
                  minLength={2}
                  required
                />
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest font-medium text-brand-stone/60 block mb-1.5">Phone</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  className={inputClass}
                  minLength={8}
                  required
                />
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest font-medium text-brand-stone/60 block mb-1.5">Email</label>
                <input
                  value={session.user.email || ""}
                  className={`${inputClass} opacity-50 cursor-not-allowed`}
                  disabled
                />
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest font-medium text-brand-stone/60 block mb-1.5">Address Line 1</label>
                <input
                  value={form.addressLine1}
                  onChange={(e) => setForm((p) => ({ ...p, addressLine1: e.target.value }))}
                  className={inputClass}
                  minLength={3}
                  required
                />
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest font-medium text-brand-stone/60 block mb-1.5">Address Line 2</label>
                <input
                  value={form.addressLine2}
                  onChange={(e) => setForm((p) => ({ ...p, addressLine2: e.target.value }))}
                  className={inputClass}
                  minLength={2}
                  placeholder="Apartment, suite, floor, etc."
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: "City", key: "city", min: 2 },
                  { label: "State", key: "state", min: 2 },
                  { label: "ZIP Code", key: "zipCode", min: 4 },
                ].map(({ label, key, min }) => (
                  <div key={key}>
                    <label className="text-[10px] uppercase tracking-widest font-medium text-brand-stone/60 block mb-1.5">{label}</label>
                    <input
                      value={(form as any)[key]}
                      onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                      className={inputClass}
                      minLength={min}
                      required
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest font-medium text-brand-stone/60 block mb-1.5">Location Link</label>
                <input
                  value={form.locationLink}
                  onChange={(e) => setForm((p) => ({ ...p, locationLink: e.target.value }))}
                  type="url"
                  className={inputClass}
                  placeholder="https://maps.google.com/..."
                  required
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:items-center pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center rounded-xl bg-brand-charcoal px-5 py-2.5 text-sm font-medium text-brand-cream hover:bg-brand-warm-black disabled:opacity-50 transition-colors shadow-soft"
                >
                  {submitting ? "Submitting…" : "Register as Merchant"}
                </button>
                <Link href="/" className="inline-flex text-sm text-brand-stone hover:text-brand-charcoal transition-colors">
                  Back to Home
                </Link>
              </div>
            </form>
          ) : (
            <div className="rounded-2xl border border-brand-sand/30 bg-brand-parchment/40 p-5 text-sm text-brand-charcoal space-y-2">
              <p className="font-semibold text-brand-charcoal font-heading">Submitted Application</p>
              <div className="space-y-1 text-brand-stone">
                <p>Business: {merchant?.name}</p>
                <p>Phone: {merchant?.phone}</p>
                <p>Email: {merchant?.email}</p>
                <p>
                  Address: {merchant?.addressLine1}, {merchant?.addressLine2},{" "}
                  {merchant?.city}, {merchant?.state} {merchant?.zipCode}
                </p>
                <p className="truncate">Location: {merchant?.locationLink}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
