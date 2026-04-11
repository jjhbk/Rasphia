"use client";

import { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import Link from "next/link";
import { ArrowLeft, Store, CheckCircle2, Clock, XCircle, AlertCircle } from "lucide-react";
import BrandLogo from "@/app/components/brand/BrandLogo";
import Navbar from "@/app/components/Navbar";

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
      <>
        <Navbar />
        <div className="min-h-screen bg-brand-cream flex items-center justify-center font-body">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-brand-terracotta/30 border-t-brand-terracotta animate-spin" />
            <p className="text-sm text-brand-stone">Loading…</p>
          </div>
        </div>
      </>
    );
  }

  if (!session?.user?.email) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-brand-hero flex items-center justify-center p-6 font-body">
          <div className="glass-card p-8 text-center max-w-sm w-full animate-scale-in space-y-5">
            <BrandLogo size={48} showWordmark wordmarkClassName="text-xl" className="justify-center" />
            <div>
              <p className="text-brand-stone text-sm mt-2">Sign in to submit your merchant application and get your own storefront on Rasphia.</p>
            </div>
            <button
              onClick={() => signIn("google")}
              className="btn btn-primary w-full justify-center"
            >
              Continue with Google
            </button>
            <Link href="/" className="block text-sm text-brand-stone hover:text-brand-charcoal transition-colors">
              Back to Home
            </Link>
          </div>
        </div>
      </>
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
    if (
      form.locationLink.trim().length > 0 &&
      !/^https?:\/\/.+/i.test(form.locationLink.trim())
    ) {
      setError("Google Maps location link must be a valid URL.");
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
      <Navbar />

      {/* Hero header */}
      <div className="bg-brand-hero border-b border-brand-sand/30">
        <div className="max-w-2xl mx-auto px-6 py-10 animate-fade-up">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-brand-stone hover:text-brand-charcoal mb-3 transition-colors">
            <ArrowLeft className="h-3 w-3" />
            Back to Home
          </Link>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Store className="h-5 w-5 text-brand-terracotta" />
                <span className="text-xs uppercase tracking-widest text-brand-stone font-medium">
                  Merchant Onboarding
                </span>
              </div>
              <h1 className="font-heading text-3xl text-brand-charcoal">Apply as Merchant</h1>
              <p className="text-brand-stone text-sm mt-1">
                Get your own storefront, AI chatbot, and access to persona-matched customers.
              </p>
            </div>
            {merchant?.status && (
              <span className={`badge ${statusBadge}`}>
                {merchant.status}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-5">
        {merchant?.status === "approved" && (
          <div className="alert alert-success animate-fade-in">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-600" />
            <div>
              <p className="font-medium">Your merchant account is approved!</p>
              <p className="text-sm mt-0.5">You can now access the management dashboard and set up your storefront.</p>
              <Link href="/admin" className="inline-block mt-2 text-sm font-medium underline">
                Go to Dashboard →
              </Link>
            </div>
          </div>
        )}

        {merchant?.status === "pending" && (
          <div className="alert alert-info animate-fade-in">
            <Clock className="h-4 w-4 flex-shrink-0" />
            <div>
              <p className="font-medium">Application under review</p>
              <p className="text-sm mt-0.5">We&apos;ll notify you once admin approves your application.</p>
            </div>
          </div>
        )}

        {merchant?.status === "rejected" && (
          <div className="alert alert-danger animate-fade-in">
            <XCircle className="h-4 w-4 flex-shrink-0" />
            <div>
              <p className="font-medium">Application rejected</p>
              <p className="text-sm mt-0.5">You can resubmit your application below.</p>
            </div>
          </div>
        )}

        {message && (
          <div className="alert alert-success animate-fade-in">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-600" />
            {message}
          </div>
        )}
        {error && (
          <div className="alert alert-danger animate-fade-in">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="panel animate-fade-up">
          {shouldShowForm ? (
            <>
              <div className="panel-header">
                <span className="text-sm font-semibold text-brand-charcoal">Business Details</span>
              </div>
              <div className="panel-body">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="input-label">Business Name</label>
                      <input
                        value={form.businessName}
                        onChange={(e) => setForm((p) => ({ ...p, businessName: e.target.value }))}
                        className="input-field"
                        placeholder="My Amazing Store"
                        minLength={2}
                        required
                      />
                    </div>
                    <div>
                      <label className="input-label">Phone</label>
                      <input
                        value={form.phone}
                        onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                        className="input-field"
                        placeholder="+91 XXXXX XXXXX"
                        minLength={8}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="input-label">Email</label>
                    <input
                      value={session.user.email || ""}
                      className="input-field opacity-60 cursor-not-allowed"
                      disabled
                    />
                    <p className="text-xs text-brand-stone mt-1">Auto-filled from your signed-in account.</p>
                  </div>

                  <div>
                    <label className="input-label">Address Line 1</label>
                    <input
                      value={form.addressLine1}
                      onChange={(e) => setForm((p) => ({ ...p, addressLine1: e.target.value }))}
                      className="input-field"
                      placeholder="Street address"
                      minLength={3}
                      required
                    />
                  </div>

                  <div>
                    <label className="input-label">Address Line 2</label>
                    <input
                      value={form.addressLine2}
                      onChange={(e) => setForm((p) => ({ ...p, addressLine2: e.target.value }))}
                      className="input-field"
                      minLength={2}
                      placeholder="Apartment, suite, floor, etc."
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { label: "City", key: "city", min: 2, placeholder: "Mumbai" },
                      { label: "State", key: "state", min: 2, placeholder: "Maharashtra" },
                      { label: "ZIP Code", key: "zipCode", min: 4, placeholder: "400001" },
                    ].map(({ label, key, min, placeholder }) => (
                      <div key={key}>
                        <label className="input-label">{label}</label>
                        <input
                          value={(form as Record<string, string>)[key]}
                          onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                          className="input-field"
                          placeholder={placeholder}
                          minLength={min}
                          required
                        />
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="input-label">
                      Google Maps Location Link (optional)
                    </label>
                    <input
                      value={form.locationLink}
                      onChange={(e) => setForm((p) => ({ ...p, locationLink: e.target.value }))}
                      type="url"
                      className="input-field"
                      placeholder="https://maps.google.com/..."
                    />
                    <p className="text-xs text-brand-stone mt-1">
                      Paste your Google Maps pin/location URL if available.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn btn-primary sm:flex-none"
                    >
                      {submitting ? (
                        <>
                          <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                          Submitting…
                        </>
                      ) : (
                        "Register as Merchant"
                      )}
                    </button>
                    <Link href="/" className="btn btn-ghost">
                      Cancel
                    </Link>
                  </div>
                </form>
              </div>
            </>
          ) : (
            <>
              <div className="panel-header">
                <span className="text-sm font-semibold text-brand-charcoal">Submitted Application</span>
                <span className={`badge ${statusBadge}`}>{merchant?.status}</span>
              </div>
              <div className="panel-body">
                <dl className="space-y-2 text-sm">
                  <div className="flex gap-2">
                    <dt className="text-brand-stone w-24 flex-shrink-0">Business</dt>
                    <dd className="text-brand-charcoal font-medium">{merchant?.name}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-brand-stone w-24 flex-shrink-0">Phone</dt>
                    <dd className="text-brand-charcoal">{merchant?.phone}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-brand-stone w-24 flex-shrink-0">Email</dt>
                    <dd className="text-brand-charcoal">{merchant?.email}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-brand-stone w-24 flex-shrink-0">Address</dt>
                    <dd className="text-brand-charcoal">
                      {[merchant?.addressLine1, merchant?.addressLine2, merchant?.city, merchant?.state, merchant?.zipCode]
                        .filter(Boolean)
                        .join(", ")}
                    </dd>
                  </div>
                  {merchant?.locationLink && (
                    <div className="flex gap-2">
                      <dt className="text-brand-stone w-24 flex-shrink-0">Location</dt>
                      <dd className="text-brand-terracotta truncate">
                        <a href={merchant.locationLink} target="_blank" rel="noopener noreferrer">
                          View on map →
                        </a>
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
