"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import BrandBanner from "@/app/components/brand/BrandBanner";
import BrandLogo from "@/app/components/brand/BrandLogo";

const SLUG_MIN_LENGTH = 3;
const SLUG_MAX_LENGTH = 40;
const LOGO_SIZE = 512;
const COVER_WIDTH = 1600;
const COVER_HEIGHT = 640;

function sanitizeSlugInput(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, SLUG_MAX_LENGTH);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read image."));
    img.src = src;
  });
}

async function resizeImageForStorefront(
  file: File,
  field: "logoUrl" | "coverImageUrl"
): Promise<File> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not initialize canvas context.");

    if (field === "logoUrl") {
      canvas.width = LOGO_SIZE;
      canvas.height = LOGO_SIZE;
      ctx.clearRect(0, 0, LOGO_SIZE, LOGO_SIZE);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, LOGO_SIZE, LOGO_SIZE);

      const scale = Math.min(LOGO_SIZE / img.width, LOGO_SIZE / img.height);
      const drawW = Math.round(img.width * scale);
      const drawH = Math.round(img.height * scale);
      const offsetX = Math.floor((LOGO_SIZE - drawW) / 2);
      const offsetY = Math.floor((LOGO_SIZE - drawH) / 2);
      ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
    } else {
      canvas.width = COVER_WIDTH;
      canvas.height = COVER_HEIGHT;
      ctx.clearRect(0, 0, COVER_WIDTH, COVER_HEIGHT);
      ctx.fillStyle = "#f5f5f4";
      ctx.fillRect(0, 0, COVER_WIDTH, COVER_HEIGHT);

      // Keep the full cover image visible (no crop) and pad the sides.
      const scale = Math.min(COVER_WIDTH / img.width, COVER_HEIGHT / img.height);
      const drawW = Math.round(img.width * scale);
      const drawH = Math.round(img.height * scale);
      const offsetX = Math.floor((COVER_WIDTH - drawW) / 2);
      const offsetY = Math.floor((COVER_HEIGHT - drawH) / 2);

      ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
    }

    const mimeType = "image/jpeg";
    const quality = 0.9;
    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (result) => (result ? resolve(result) : reject(new Error("Image processing failed."))),
        mimeType,
        quality
      );
    });
    return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
      type: mimeType,
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

type Storefront = {
  id: string;
  slug: string;
  name: string;
  email: string;
  status: string;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  storefrontDescription?: string | null;
  chatbotWelcomeMessage?: string | null;
  locationLink?: string | null;
};

type MerchantSeedhapeSettings = {
  configured: boolean;
  apiKeyMasked: string | null;
  webhookUrl: string;
  baseUrl: string;
  configuredAt: string | null;
  generatedWebhookSecret?: string | null;
};

export default function MerchantStorefrontPage() {
  const [storefront, setStorefront] = useState<Storefront | null>(null);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    logoUrl: "",
    coverImageUrl: "",
    storefrontDescription: "",
    chatbotWelcomeMessage: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<
    "logoUrl" | "coverImageUrl" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [seedhapeError, setSeedhapeError] = useState<string | null>(null);
  const [slugStatus, setSlugStatus] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");
  const [slugHint, setSlugHint] = useState("");
  const [origin, setOrigin] = useState("");
  const [seedhape, setSeedhape] = useState<MerchantSeedhapeSettings | null>(null);
  const [seedhapeForm, setSeedhapeForm] = useState({
    seedhapeApiKey: "",
    seedhapeWebhookSecret: "",
  });
  const [isSavingSeedhape, setIsSavingSeedhape] = useState(false);
  const [isRotatingSecret, setIsRotatingSecret] = useState(false);
  const [seedhapeSuccess, setSeedhapeSuccess] = useState<string | null>(null);
  const [webhookCopied, setWebhookCopied] = useState(false);
  const [rotatedWebhookSecret, setRotatedWebhookSecret] = useState<string | null>(
    null
  );

  const publicStoreUrl = useMemo(() => {
    if (!form.slug) return "";
    return `/storefronts/${form.slug}`;
  }, [form.slug]);
  const shareableStoreUrl = useMemo(() => {
    if (!publicStoreUrl) return "";
    return origin ? `${origin}${publicStoreUrl}` : publicStoreUrl;
  }, [origin, publicStoreUrl]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }

    const load = async () => {
      try {
        setIsLoading(true);
        const res = await fetch("/api/merchant/storefront");
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load storefront");

        const s: Storefront = data?.storefront;
        setStorefront(s);
        setForm({
          name: s?.name || "",
          slug: s?.slug || "",
          logoUrl: s?.logoUrl || "",
          coverImageUrl: s?.coverImageUrl || "",
          storefrontDescription: s?.storefrontDescription || "",
          chatbotWelcomeMessage: s?.chatbotWelcomeMessage || "",
        });

        const seedhapeRes = await fetch("/api/merchant/seedhape");
        const seedhapeData = await seedhapeRes.json();
        if (seedhapeRes.ok && seedhapeData?.seedhape) {
          const settings = seedhapeData.seedhape as MerchantSeedhapeSettings;
          setSeedhape(settings);
          if (settings.generatedWebhookSecret) {
            setSeedhapeSuccess(
              `Default webhook secret generated. Save it now: ${settings.generatedWebhookSecret}`
            );
          }
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to load storefront";
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  const checkSlugAvailability = async (
    rawSlug: string,
    applyNormalized: boolean
  ) => {
    const trimmed = rawSlug.trim();
    if (!trimmed) {
      setSlugStatus("idle");
      setSlugHint("");
      return { available: false, normalized: "" };
    }
    if (trimmed.length < SLUG_MIN_LENGTH) {
      setSlugStatus("idle");
      setSlugHint(`Use at least ${SLUG_MIN_LENGTH} characters.`);
      return { available: false, normalized: trimmed };
    }

    setSlugStatus("checking");
    const res = await fetch(
      `/api/merchant/storefront/slug-availability?slug=${encodeURIComponent(
        trimmed
      )}`
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error || "Slug check failed");
    }

    const normalized = String(data.slug || trimmed);
    if (applyNormalized && normalized !== rawSlug) {
      setForm((prev) => ({ ...prev, slug: normalized }));
    }

    if (data.available) {
      setSlugStatus("available");
      setSlugHint("Storefront URL is available.");
    } else {
      setSlugStatus("taken");
      setSlugHint("This storefront URL is already taken.");
    }

    return { available: Boolean(data.available), normalized };
  };

  useEffect(() => {
    const raw = form.slug.trim();
    if (!raw) {
      setSlugStatus("idle");
      setSlugHint("");
      return;
    }

    const id = setTimeout(async () => {
      try {
        await checkSlugAvailability(raw, false);
      } catch {
        setSlugStatus("idle");
        setSlugHint("");
      }
    }, 300);

    return () => clearTimeout(id);
  }, [form.slug]);

  const handleCopyStorefrontUrl = async () => {
    if (!shareableStoreUrl) return;
    try {
      await navigator.clipboard.writeText(shareableStoreUrl);
      alert("Storefront URL copied.");
    } catch {
      setError("Could not copy URL. Please copy it manually.");
    }
  };

  const handleShareStorefront = async () => {
    if (!shareableStoreUrl) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: form.name || "Rasphia Storefront",
          text: "Explore my storefront on Rasphia.",
          url: shareableStoreUrl,
        });
      } else {
        await handleCopyStorefrontUrl();
      }
    } catch {
      // user canceled share sheet; no-op
    }
  };

  const handleUpload = async (file: File, field: "logoUrl" | "coverImageUrl") => {
    try {
      setUploadingField(field);
      const resized = await resizeImageForStorefront(file, field);
      const fd = new FormData();
      fd.append("file", resized);

      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data?.url) {
        throw new Error(data?.error || "Image upload failed");
      }

      setForm((prev) => ({ ...prev, [field]: data.url }));
    } finally {
      setUploadingField(null);
    }
  };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    let slugAvailable = slugStatus === "available";
    try {
      const check = await checkSlugAvailability(form.slug, true);
      slugAvailable = check.available;
    } catch {
      // handled below by generic save error
    }
    if (!slugAvailable || slugStatus === "taken") {
      setError("This storefront URL is already taken. Please choose another.");
      alert("Please choose a different storefront URL before saving.");
      return;
    }
    try {
      setIsSaving(true);
      setError(null);
      const res = await fetch("/api/merchant/storefront", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to save storefront");

      setStorefront(data.storefront);
      setForm({
        name: data.storefront.name || "",
        slug: data.storefront.slug || "",
        logoUrl: data.storefront.logoUrl || "",
        coverImageUrl: data.storefront.coverImageUrl || "",
        storefrontDescription: data.storefront.storefrontDescription || "",
        chatbotWelcomeMessage: data.storefront.chatbotWelcomeMessage || "",
      });
      alert("Storefront updated successfully.");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to save storefront";
      setError(msg);
      if (msg.toLowerCase().includes("already taken")) {
        alert("This storefront URL is already taken. Please choose another.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const webhookUrl =
    seedhape?.webhookUrl ||
    `${origin || ""}/api/seedhape-webhook${
      storefront?.id
        ? `?merchantId=${encodeURIComponent(storefront.id)}`
        : ""
    }`;

  const handleCopyWebhookUrl = async () => {
    if (!webhookUrl) return;
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setWebhookCopied(true);
      window.setTimeout(() => setWebhookCopied(false), 1400);
    } catch {
      setSeedhapeError("Could not copy webhook URL. Please copy it manually.");
    }
  };

  const saveSeedhapeSettings = async () => {
    try {
      setIsSavingSeedhape(true);
      setSeedhapeError(null);
      setSeedhapeSuccess(null);

      const payload: Record<string, unknown> = {};
      if (seedhapeForm.seedhapeApiKey.trim()) {
        payload.seedhapeApiKey = seedhapeForm.seedhapeApiKey.trim();
      }
      if (seedhapeForm.seedhapeWebhookSecret.trim()) {
        payload.seedhapeWebhookSecret = seedhapeForm.seedhapeWebhookSecret.trim();
      }

      const res = await fetch("/api/merchant/seedhape", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to save SeedhaPe settings");

      const next = data?.seedhape as MerchantSeedhapeSettings;
      setSeedhape(next);
      setSeedhapeForm((prev) => ({
        ...prev,
        seedhapeApiKey: "",
        seedhapeWebhookSecret: "",
      }));
      setSeedhapeSuccess("SeedhaPe settings updated.");
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "Failed to save SeedhaPe settings";
      setSeedhapeError(msg);
    } finally {
      setIsSavingSeedhape(false);
    }
  };

  const rotateSeedhapeSecret = async () => {
    try {
      setIsRotatingSecret(true);
      setSeedhapeError(null);
      setSeedhapeSuccess(null);
      setRotatedWebhookSecret(null);
      const res = await fetch("/api/merchant/seedhape", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rotateWebhookSecret: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to rotate webhook secret");
      setSeedhape(data.seedhape as MerchantSeedhapeSettings);
      const generated = String(data?.rotated?.generatedWebhookSecret || "").trim();
      if (generated) {
        setRotatedWebhookSecret(generated);
        setSeedhapeSuccess("Webhook secret rotated successfully. Copy and paste it in SeedhaPe.");
      } else {
        setSeedhapeSuccess("Webhook secret rotated successfully.");
      }
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "Failed to rotate webhook secret";
      setSeedhapeError(msg);
    } finally {
      setIsRotatingSecret(false);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen bg-brand-cream p-6">Loading storefront...</div>;
  }

  return (
    <div className="min-h-screen bg-brand-hero p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <BrandBanner className="hidden md:block" />

        <div className="rounded-3xl border border-white/70 bg-white/75 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.08)] p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-brand-stone">Merchant Storefront</p>
              <h1 className="text-3xl md:text-4xl font-heading text-brand-charcoal mt-1">Design Your Public Store</h1>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/admin"
                className="rounded-full border border-brand-sand/60 bg-white px-4 py-2 text-sm text-brand-charcoal hover:bg-brand-cream"
              >
                Back to Dashboard
              </Link>
              {publicStoreUrl && (
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={publicStoreUrl}
                    className="rounded-full bg-brand-charcoal px-4 py-2 text-sm text-white hover:bg-brand-warm-black"
                  >
                    View Public Store
                  </Link>
                  <button
                    type="button"
                    onClick={handleCopyStorefrontUrl}
                    className="rounded-full border border-brand-sand/60 bg-white px-4 py-2 text-sm text-brand-charcoal hover:bg-brand-cream"
                  >
                    Copy URL
                  </button>
                  <button
                    type="button"
                    onClick={handleShareStorefront}
                    className="rounded-full border border-brand-sand/60 bg-white px-4 py-2 text-sm text-brand-charcoal hover:bg-brand-cream"
                  >
                    Share
                  </button>
                </div>
              )}
            </div>
          </div>

          {error && (
            <p className="mt-4 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <form onSubmit={onSave} className="mt-6 grid grid-cols-1 gap-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-brand-charcoal">Business Name</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-brand-sand/60 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-brand-terracotta/20"
                />
              </div>
              <div>
                <label className="text-sm text-brand-charcoal">Store URL Slug</label>
                <input
                  required
                  value={form.slug}
                  minLength={SLUG_MIN_LENGTH}
                  maxLength={SLUG_MAX_LENGTH}
                  pattern="^[a-z0-9_-]+$"
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      slug: sanitizeSlugInput(e.target.value),
                    }))
                  }
                  onBlur={() => {
                    if (form.slug.trim()) {
                      checkSlugAvailability(form.slug, true).catch(() => {
                        setSlugStatus("idle");
                        setSlugHint("");
                      });
                    }
                  }}
                  className="mt-1 w-full rounded-xl border border-brand-sand/60 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-brand-terracotta/20"
                />
                {slugStatus === "checking" && (
                  <p className="text-xs text-brand-stone mt-1">Checking availability...</p>
                )}
                {slugStatus === "available" && (
                  <p className="text-xs text-emerald-700 mt-1">{slugHint}</p>
                )}
                {slugStatus === "taken" && (
                  <p className="text-xs text-red-700 mt-1">{slugHint}</p>
                )}
                <p className="text-xs text-brand-stone mt-1">Public URL: {publicStoreUrl || "-"}</p>
                <p className="text-xs text-brand-stone mt-1">
                  Allowed: `a-z`, `0-9`, `-`, `_` | Length: {SLUG_MIN_LENGTH}-{SLUG_MAX_LENGTH}
                </p>
                {shareableStoreUrl && (
                  <p className="text-xs text-brand-stone break-all mt-1">
                    Shareable: {shareableStoreUrl}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-brand-charcoal">Store Logo</label>
                <div className="mt-1 rounded-xl border border-brand-sand/60 bg-white p-3">
                  <label className="inline-flex cursor-pointer rounded-lg border border-brand-sand/60 px-3 py-1.5 text-xs text-brand-charcoal hover:bg-brand-cream">
                    {uploadingField === "logoUrl" ? "Uploading..." : "Upload Logo"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          await handleUpload(file, "logoUrl");
                        } catch (err: unknown) {
                          const msg = err instanceof Error ? err.message : "Upload failed";
                          setError(msg);
                        }
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, logoUrl: "" }))}
                    className="ml-2 rounded-lg border border-brand-sand/60 px-3 py-1.5 text-xs text-brand-charcoal hover:bg-brand-cream"
                  >
                    Remove
                  </button>
                  {form.logoUrl && (
                    <img
                      src={form.logoUrl}
                      alt="Logo preview"
                      className="mt-3 block h-24 w-24 rounded-xl object-fill bg-white border border-brand-sand/50"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm text-brand-charcoal">Cover Image</label>
                <div className="mt-1 rounded-xl border border-brand-sand/60 bg-white p-3">
                  <label className="inline-flex cursor-pointer rounded-lg border border-brand-sand/60 px-3 py-1.5 text-xs text-brand-charcoal hover:bg-brand-cream">
                    {uploadingField === "coverImageUrl"
                      ? "Uploading..."
                      : "Upload Cover"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        await handleUpload(file, "coverImageUrl");
                      } catch (err: unknown) {
                        const msg = err instanceof Error ? err.message : "Upload failed";
                        setError(msg);
                      }
                    }}
                  />
                </label>
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, coverImageUrl: "" }))}
                    className="ml-2 rounded-lg border border-brand-sand/60 px-3 py-1.5 text-xs text-brand-charcoal hover:bg-brand-cream"
                  >
                    Remove
                  </button>
                  {form.coverImageUrl && (
                    <img
                      src={form.coverImageUrl}
                      alt="Cover preview"
                      className="mt-3 h-28 w-full rounded-xl object-cover border border-brand-sand/50"
                    />
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm text-brand-charcoal">Store Description</label>
              <textarea
                rows={4}
                value={form.storefrontDescription}
                onChange={(e) =>
                  setForm((p) => ({ ...p, storefrontDescription: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-brand-sand/60 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-brand-terracotta/20"
                placeholder="Tell visitors what your store specializes in."
              />
            </div>

            <div>
              <label className="text-sm text-brand-charcoal">Chatbot Welcome Message</label>
              <textarea
                rows={3}
                value={form.chatbotWelcomeMessage}
                onChange={(e) =>
                  setForm((p) => ({ ...p, chatbotWelcomeMessage: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-brand-sand/60 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-brand-terracotta/20"
                placeholder="Example: Hi, tell me your budget and I will recommend bestsellers."
              />
            </div>

            <div className="flex justify-end">
              <button
                disabled={isSaving}
                type="submit"
                className="rounded-full bg-brand-charcoal px-6 py-2 text-white hover:bg-brand-warm-black disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Storefront"}
              </button>
            </div>
          </form>
        </div>

        <div
          id="seedhape-payments"
          className="rounded-3xl border border-white/70 bg-white/75 p-4 md:p-6 backdrop-blur-xl shadow-[0_14px_30px_rgba(0,0,0,0.06)]"
        >
          <h2 className="text-lg font-medium text-brand-charcoal">Preview</h2>
          <div className="mt-3 overflow-hidden rounded-2xl border border-brand-sand/50 bg-white">
            <div className="h-40 bg-brand-parchment">
              {form.coverImageUrl ? (
                <img
                  src={form.coverImageUrl}
                  alt="Store cover"
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>
            <div className="mt-3 px-4 pb-5">
              <div className="h-20 w-20 rounded-2xl border-4 border-white bg-brand-cream overflow-hidden">
                {form.logoUrl ? (
                  <img
                    src={form.logoUrl}
                    alt="Store logo"
                    className="block h-full w-full object-fill bg-white"
                  />
                ) : (
                  <BrandLogo size={62} className="h-full w-full items-center justify-center" />
                )}
              </div>
              <h3 className="mt-3 text-2xl font-heading text-brand-charcoal">{form.name || storefront?.name || "Your Store"}</h3>
              <p className="mt-1 text-sm text-brand-stone">
                {form.storefrontDescription || "Add your store description to make your storefront stand out."}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/70 bg-white/75 p-4 md:p-6 backdrop-blur-xl shadow-[0_14px_30px_rgba(0,0,0,0.06)]">
          <h2 className="text-lg font-medium text-brand-charcoal">SeedhaPe Payments</h2>
          <p className="mt-1 text-sm text-brand-stone">
            Configure merchant-level SeedhaPe credentials for direct customer payments.
          </p>

          {seedhapeError && (
            <p className="mt-4 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {seedhapeError}
            </p>
          )}
          {seedhapeSuccess && (
            <p className="mt-4 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-700">
              {seedhapeSuccess}
            </p>
          )}
          {rotatedWebhookSecret && (
            <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
              <p className="text-xs text-emerald-800">New Webhook Secret (shown once)</p>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="text"
                  value={rotatedWebhookSecret}
                  readOnly
                  className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs text-emerald-900"
                />
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(rotatedWebhookSecret);
                      setSeedhapeSuccess("Webhook secret copied.");
                    } catch {
                      setSeedhapeError("Could not copy webhook secret. Please copy it manually.");
                    }
                  }}
                  className="rounded-full border border-emerald-300 bg-white px-4 py-2 text-xs text-emerald-800 hover:bg-emerald-100"
                >
                  Copy
                </button>
              </div>
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-brand-charcoal">API Key</label>
              <input
                type="password"
                value={seedhapeForm.seedhapeApiKey}
                onChange={(e) =>
                  setSeedhapeForm((p) => ({ ...p, seedhapeApiKey: e.target.value }))
                }
                placeholder={seedhape?.apiKeyMasked || "sp_live_xxxxx..."}
                className="mt-1 w-full rounded-xl border border-brand-sand/60 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-brand-terracotta/20"
              />
              <p className="mt-1 text-xs text-brand-stone">
                Leave blank to keep existing key.
              </p>
            </div>
            <div>
              <label className="text-sm text-brand-charcoal">Webhook Secret</label>
              <input
                type="password"
                value={seedhapeForm.seedhapeWebhookSecret}
                onChange={(e) =>
                  setSeedhapeForm((p) => ({
                    ...p,
                    seedhapeWebhookSecret: e.target.value,
                  }))
                }
                placeholder="Set or replace webhook secret"
                className="mt-1 w-full rounded-xl border border-brand-sand/60 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-brand-terracotta/20"
              />
              <p className="mt-1 text-xs text-brand-stone">
                Use rotate for random secret generation.
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={saveSeedhapeSettings}
              disabled={isSavingSeedhape}
              className="rounded-full bg-brand-charcoal px-5 py-2 text-white hover:bg-brand-warm-black disabled:opacity-50"
            >
              {isSavingSeedhape ? "Saving..." : "Save SeedhaPe Settings"}
            </button>
            <button
              type="button"
              onClick={rotateSeedhapeSecret}
              disabled={isRotatingSecret}
              className="rounded-full border border-brand-sand/60 bg-white px-5 py-2 text-brand-charcoal hover:bg-brand-cream disabled:opacity-50"
            >
              {isRotatingSecret ? "Rotating..." : "Rotate Webhook Secret"}
            </button>
          </div>

          <div className="mt-3">
            <label className="text-xs text-brand-stone">Webhook URL</label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="text"
                value={webhookUrl}
                readOnly
                className="w-full rounded-xl border border-brand-sand/60 bg-brand-parchment/40 px-3 py-2 text-xs text-brand-charcoal"
              />
              <button
                type="button"
                onClick={handleCopyWebhookUrl}
                className="rounded-full border border-brand-sand/60 bg-white px-4 py-2 text-xs text-brand-charcoal hover:bg-brand-cream"
              >
                {webhookCopied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
          <p className="mt-1 text-xs text-brand-stone break-all">
            Common SeedhaPe API base URL: {seedhape?.baseUrl || "Not configured"}
          </p>

          <p className="mt-3 text-xs text-brand-stone">
            Status: {seedhape?.configured ? "Configured" : "Not configured"}
            {seedhape?.configuredAt ? ` • Updated ${new Date(seedhape.configuredAt).toLocaleString()}` : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
