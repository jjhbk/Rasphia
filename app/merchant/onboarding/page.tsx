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

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-[#F8F4EF] text-stone-900">
        <div className="relative isolate min-h-screen overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#FFF4E1] via-[#F8F1EA] to-[#F1E3D3]" />
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-10 right-0 h-72 w-72 rounded-[45%] bg-gradient-to-br from-[#F8DCC0] via-[#F9C8A7] to-[#F0B9A3] opacity-60 blur-3xl" />
            <div className="absolute bottom-[-60px] left-[-40px] h-96 w-96 rounded-[60%] bg-gradient-to-br from-[#2F1A19] via-[#613629] to-[#AD6F52] opacity-40 blur-[120px]" />
          </div>
          <div className="relative min-h-screen flex items-center justify-center p-6">
            <div className="w-full max-w-md rounded-3xl border border-white/50 bg-white/80 p-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.08)] backdrop-blur-xl">
              <p className="text-sm font-medium text-stone-600">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!session?.user?.email) {
    return (
      <div className="min-h-screen bg-[#F8F4EF] text-stone-900">
        <div className="relative isolate min-h-screen overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#FFF4E1] via-[#F8F1EA] to-[#F1E3D3]" />
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-10 right-0 h-72 w-72 rounded-[45%] bg-gradient-to-br from-[#F8DCC0] via-[#F9C8A7] to-[#F0B9A3] opacity-60 blur-3xl" />
            <div className="absolute bottom-[-60px] left-[-40px] h-96 w-96 rounded-[60%] bg-gradient-to-br from-[#2F1A19] via-[#613629] to-[#AD6F52] opacity-40 blur-[120px]" />
          </div>

          <div className="relative min-h-screen flex items-center justify-center p-6">
            <div className="max-w-md w-full rounded-3xl border border-white/50 bg-white/85 p-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.08)] backdrop-blur-xl space-y-5">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-stone-900 to-stone-700 text-[#F8F4EF] font-semibold">
                R
              </div>
              <div>
                <p className="font-['Playfair_Display',serif] text-xl uppercase tracking-[0.35em] text-stone-700">
                  Rasphia
                </p>
                <p className="text-xs tracking-[0.35em] text-stone-400 mt-1">
                  Merchant Onboarding
                </p>
              </div>
              <p className="text-stone-600">
                Sign in to submit your merchant application.
              </p>
              <button
                onClick={() => signIn("google")}
                className="inline-flex w-full items-center justify-center rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-stone-300/50 hover:-translate-y-0.5 hover:bg-stone-800 transition"
              >
                Continue with Google
              </button>
              <Link
                href="/"
                className="inline-flex text-sm text-stone-500 hover:text-stone-800"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const statusBadge =
    merchant?.status === "approved"
      ? "bg-green-100 text-green-800"
      : merchant?.status === "rejected"
      ? "bg-red-100 text-red-800"
      : "bg-amber-100 text-amber-800";
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
    <div className="min-h-screen bg-[#F8F4EF] text-stone-900">
      <div className="relative isolate min-h-screen overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FFF4E1] via-[#F8F1EA] to-[#F1E3D3]" />
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-10 right-0 h-72 w-72 rounded-[45%] bg-gradient-to-br from-[#F8DCC0] via-[#F9C8A7] to-[#F0B9A3] opacity-60 blur-3xl" />
          <div className="absolute bottom-[-60px] left-[-40px] h-96 w-96 rounded-[60%] bg-gradient-to-br from-[#2F1A19] via-[#613629] to-[#AD6F52] opacity-40 blur-[120px]" />
        </div>

        <div className="relative max-w-2xl mx-auto p-6 md:p-8">
          <div className="rounded-[28px] border border-white/50 bg-white/85 p-6 md:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)] backdrop-blur-xl space-y-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-stone-500">
                  Rasphia
                </p>
                <h1 className="text-3xl font-serif text-stone-800">
                  Merchant Onboarding
                </h1>
              </div>
              {merchant?.status && (
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${statusBadge}`}
                >
                  {merchant.status.toUpperCase()}
                </span>
              )}
            </div>

            {merchant?.status === "approved" && (
              <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-green-800">
                Your merchant account is approved. You can now access the
                management dashboard.
                <div className="mt-3">
                  <Link href="/admin" className="underline">
                    Go to Dashboard
                  </Link>
                </div>
              </div>
            )}

            {merchant?.status === "pending" && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-amber-800">
                Your application is under review. We will notify you after admin
                approval.
              </div>
            )}

            {message && (
              <div className="rounded-xl bg-green-50 border border-green-200 p-3 text-green-700">
                {message}
              </div>
            )}
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-red-700">
                {error}
              </div>
            )}

            {shouldShowForm ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-stone-600 mb-1">
                  Business Name
                </label>
                <input
                  value={form.businessName}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, businessName: e.target.value }))
                  }
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
                  minLength={2}
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-stone-600 mb-1">Phone</label>
                <input
                  value={form.phone}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, phone: e.target.value }))
                  }
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
                  minLength={8}
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-stone-600 mb-1">Email</label>
                <input
                  value={session.user.email || ""}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-stone-500"
                  disabled
                />
              </div>

              <div>
                <label className="block text-sm text-stone-600 mb-1">
                  Address Line 1
                </label>
                <input
                  value={form.addressLine1}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, addressLine1: e.target.value }))
                  }
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
                  minLength={3}
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-stone-600 mb-1">
                  Address Line 2
                </label>
                <input
                  value={form.addressLine2}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, addressLine2: e.target.value }))
                  }
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
                  minLength={2}
                  placeholder="Apartment, suite, floor, etc."
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-sm text-stone-600 mb-1">
                    City
                  </label>
                  <input
                    value={form.city}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, city: e.target.value }))
                    }
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
                    minLength={2}
                    required
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-sm text-stone-600 mb-1">
                    State
                  </label>
                  <input
                    value={form.state}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, state: e.target.value }))
                    }
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
                    minLength={2}
                    required
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-sm text-stone-600 mb-1">
                    ZIP Code
                  </label>
                  <input
                    value={form.zipCode}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, zipCode: e.target.value }))
                    }
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
                    pattern="[A-Za-z0-9\\- ]{4,12}"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-stone-600 mb-1">
                  Location Link
                </label>
                <input
                  value={form.locationLink}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, locationLink: e.target.value }))
                  }
                  type="url"
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
                  placeholder="https://maps.google.com/..."
                  required
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-stone-300/50 hover:-translate-y-0.5 hover:bg-stone-800 transition disabled:opacity-60"
                >
                  {submitting ? "Submitting..." : "Register as Merchant"}
                </button>
                <Link
                  href="/"
                  className="inline-flex text-sm text-stone-500 hover:text-stone-800"
                >
                  Back to Home
                </Link>
              </div>
            </form>
            ) : (
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700 space-y-1">
                <p className="font-medium">Submitted Application Details</p>
                <p>Business Name: {merchant?.name}</p>
                <p>Phone: {merchant?.phone}</p>
                <p>Email: {merchant?.email}</p>
                <p>
                  Address: {merchant?.addressLine1}, {merchant?.addressLine2},{" "}
                  {merchant?.city}, {merchant?.state} {merchant?.zipCode}
                </p>
                <p>Location Link: {merchant?.locationLink}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
