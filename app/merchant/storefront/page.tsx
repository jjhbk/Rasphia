"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Store,
  Check,
  Copy,
  Share2,
  ExternalLink,
  Upload,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Eye,
  CreditCard,
  Layout,
  Image as ImageIcon,
} from "lucide-react";
import BrandLogo from "@/app/components/brand/BrandLogo";
import Navbar from "@/app/components/Navbar";

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
        (result) =>
          result
            ? resolve(result)
            : reject(new Error("Image processing failed.")),
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

type Tab = "branding" | "payments";

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
  const [rotatedWebhookSecret, setRotatedWebhookSecret] = useState<string | null>(null);
  const [urlCopied, setUrlCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("branding");

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
      `/api/merchant/storefront/slug-availability?slug=${encodeURIComponent(trimmed)}`
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Slug check failed");
    const normalized = String(data.slug || trimmed);
    if (applyNormalized && normalized !== rawSlug) {
      setForm((prev) => ({ ...prev, slug: normalized }));
    }
    if (data.available) {
      setSlugStatus("available");
      setSlugHint("URL is available.");
    } else {
      setSlugStatus("taken");
      setSlugHint("This URL is already taken.");
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
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 1400);
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
      // handled below
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
      storefront?.id ? `?merchantId=${encodeURIComponent(storefront.id)}` : ""
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
      setSeedhapeForm({ seedhapeApiKey: "", seedhapeWebhookSecret: "" });
      setSeedhapeSuccess("SeedhaPe settings updated.");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to save SeedhaPe settings";
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
        setSeedhapeSuccess("Webhook secret rotated. Copy and paste it in SeedhaPe.");
      } else {
        setSeedhapeSuccess("Webhook secret rotated successfully.");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to rotate webhook secret";
      setSeedhapeError(msg);
    } finally {
      setIsRotatingSecret(false);
    }
  };

  /* ── Loading ── */
  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-brand-cream flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-brand-terracotta/30 border-t-brand-terracotta animate-spin" />
            <p className="text-sm text-brand-stone">Loading storefront…</p>
          </div>
        </div>
      </>
    );
  }

  /* ── Render ── */
  return (
    <div className="min-h-screen bg-brand-cream font-body">
      <Navbar />

      {/* Page header */}
      <div className="bg-brand-hero border-b border-brand-sand/30">
        <div className="mx-auto max-w-5xl px-4 md:px-8 py-8 animate-fade-up">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 text-xs text-brand-stone hover:text-brand-charcoal mb-2 transition-colors"
              >
                <ArrowLeft className="h-3 w-3" />
                Back to Dashboard
              </Link>
              <h1 className="font-heading text-2xl md:text-3xl text-brand-charcoal">
                Storefront Settings
              </h1>
              <p className="text-sm text-brand-stone mt-0.5">
                Customize your public store appearance and payment configuration.
              </p>
            </div>

            {/* Store URL actions */}
            {publicStoreUrl && (
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={publicStoreUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary btn-sm"
                >
                  <Eye className="h-3.5 w-3.5" />
                  View Store
                  <ExternalLink className="h-3 w-3 opacity-60" />
                </Link>
                <button
                  type="button"
                  onClick={handleCopyStorefrontUrl}
                  className="btn btn-secondary btn-sm"
                >
                  {urlCopied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-green-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy URL
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleShareStorefront}
                  className="btn btn-secondary btn-sm"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  Share
                </button>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="mt-6 tab-nav w-fit">
            <button
              onClick={() => setActiveTab("branding")}
              className={`tab-item ${activeTab === "branding" ? "tab-item-active" : ""}`}
            >
              <Layout className="h-3.5 w-3.5" />
              Branding
            </button>
            <button
              onClick={() => setActiveTab("payments")}
              className={`tab-item ${activeTab === "payments" ? "tab-item-active" : ""}`}
            >
              <CreditCard className="h-3.5 w-3.5" />
              Payments
              {seedhape?.configured && (
                <span className="badge badge-success text-[10px] ml-0.5">Active</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="mx-auto max-w-5xl px-4 md:px-8 py-8">
        {error && (
          <div className="alert alert-danger mb-6 animate-fade-in">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* ── Branding Tab ── */}
        {activeTab === "branding" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-up">
            {/* Form - 2/3 width */}
            <div className="lg:col-span-2 space-y-4">
              <form onSubmit={onSave} className="space-y-4">
                {/* Store identity */}
                <div className="panel">
                  <div className="panel-header">
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4 text-brand-terracotta" />
                      <span className="text-sm font-semibold text-brand-charcoal">Store Identity</span>
                    </div>
                  </div>
                  <div className="panel-body space-y-4">
                    <div>
                      <label className="input-label">Business Name</label>
                      <input
                        required
                        value={form.name}
                        onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                        className="input-field"
                        placeholder="My Amazing Store"
                      />
                    </div>

                    <div>
                      <label className="input-label">Store URL Slug</label>
                      <div className="flex items-center rounded-xl border border-brand-sand/50 bg-white focus-within:border-brand-terracotta/40 focus-within:ring-2 focus-within:ring-brand-terracotta/10">
                        <span className="px-3 py-2.5 text-sm text-brand-stone/70 border-r border-brand-sand/40 whitespace-nowrap">
                          rasphia.com/storefronts/
                        </span>
                        <input
                          required
                          value={form.slug}
                          minLength={SLUG_MIN_LENGTH}
                          maxLength={SLUG_MAX_LENGTH}
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
                          className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-brand-charcoal outline-none placeholder:text-brand-stone/50"
                          placeholder="my-store"
                        />
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        {slugStatus === "checking" && (
                          <span className="text-xs text-brand-stone flex items-center gap-1">
                            <RefreshCw className="h-3 w-3 animate-spin" />
                            Checking…
                          </span>
                        )}
                        {slugStatus === "available" && (
                          <span className="text-xs text-green-700 flex items-center gap-1">
                            <Check className="h-3 w-3" />
                            {slugHint}
                          </span>
                        )}
                        {slugStatus === "taken" && (
                          <span className="text-xs text-red-600 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {slugHint}
                          </span>
                        )}
                        {slugStatus === "idle" && (
                          <span className="text-xs text-brand-stone/60">
                            3–40 chars, a–z, 0–9, - and _ only
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Images */}
                <div className="panel">
                  <div className="panel-header">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-brand-terracotta" />
                      <span className="text-sm font-semibold text-brand-charcoal">Store Images</span>
                    </div>
                  </div>
                  <div className="panel-body space-y-5">
                    {/* Logo upload */}
                    <div>
                      <label className="input-label">Store Logo</label>
                      <p className="text-xs text-brand-stone mb-3">
                        Square image recommended. Will be auto-resized to 512×512.
                      </p>
                      <div className="flex items-start gap-4">
                        <div className="h-20 w-20 rounded-2xl border-2 border-brand-sand/60 overflow-hidden bg-brand-parchment flex-shrink-0">
                          {form.logoUrl ? (
                            <img
                              src={form.logoUrl}
                              alt="Logo preview"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <BrandLogo size={32} />
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <label className="btn btn-secondary btn-sm cursor-pointer">
                            <Upload className="h-3.5 w-3.5" />
                            {uploadingField === "logoUrl" ? "Uploading…" : "Upload Logo"}
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
                                  const msg =
                                    err instanceof Error ? err.message : "Upload failed";
                                  setError(msg);
                                }
                              }}
                            />
                          </label>
                          {form.logoUrl && (
                            <button
                              type="button"
                              onClick={() => setForm((p) => ({ ...p, logoUrl: "" }))}
                              className="btn btn-danger btn-sm"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Cover image */}
                    <div>
                      <label className="input-label">Cover Image</label>
                      <p className="text-xs text-brand-stone mb-3">
                        Wide banner shown at the top of your store. Auto-resized to 1600×640.
                      </p>
                      <div className="space-y-3">
                        {form.coverImageUrl && (
                          <div className="rounded-2xl overflow-hidden border border-brand-sand/30 h-32">
                            <img
                              src={form.coverImageUrl}
                              alt="Cover preview"
                              className="h-full w-full object-cover"
                            />
                          </div>
                        )}
                        <div className="flex gap-2 flex-wrap">
                          <label className="btn btn-secondary btn-sm cursor-pointer">
                            <Upload className="h-3.5 w-3.5" />
                            {uploadingField === "coverImageUrl" ? "Uploading…" : "Upload Cover"}
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
                                  const msg =
                                    err instanceof Error ? err.message : "Upload failed";
                                  setError(msg);
                                }
                              }}
                            />
                          </label>
                          {form.coverImageUrl && (
                            <button
                              type="button"
                              onClick={() => setForm((p) => ({ ...p, coverImageUrl: "" }))}
                              className="btn btn-danger btn-sm"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description & Chatbot */}
                <div className="panel">
                  <div className="panel-header">
                    <span className="text-sm font-semibold text-brand-charcoal">Store Content</span>
                  </div>
                  <div className="panel-body space-y-4">
                    <div>
                      <label className="input-label">Store Description</label>
                      <textarea
                        rows={4}
                        value={form.storefrontDescription}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            storefrontDescription: e.target.value,
                          }))
                        }
                        className="input-field resize-none"
                        placeholder="Tell visitors what your store specializes in…"
                      />
                    </div>

                    <div>
                      <label className="input-label">Chatbot Welcome Message</label>
                      <textarea
                        rows={3}
                        value={form.chatbotWelcomeMessage}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            chatbotWelcomeMessage: e.target.value,
                          }))
                        }
                        className="input-field resize-none"
                        placeholder="Hi! Tell me what you're looking for and I'll find the perfect match…"
                      />
                      <p className="text-xs text-brand-stone mt-1.5">
                        This message appears when customers open your store&apos;s AI chat.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    disabled={isSaving}
                    type="submit"
                    className="btn btn-primary"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        Save Storefront
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Live Preview - 1/3 width */}
            <div className="lg:col-span-1">
              <div className="sticky top-[80px]">
                <div className="panel-header rounded-t-2xl border border-brand-sand/30 bg-brand-parchment/50">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-brand-stone" />
                    <span className="text-sm font-semibold text-brand-charcoal">Live Preview</span>
                  </div>
                </div>
                <div className="overflow-hidden rounded-b-2xl border-x border-b border-brand-sand/30 bg-white">
                  {/* Cover */}
                  <div className="h-28 bg-brand-parchment">
                    {form.coverImageUrl ? (
                      <img
                        src={form.coverImageUrl}
                        alt="Store cover"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-brand-parchment to-brand-sand flex items-center justify-center">
                        <Store className="h-8 w-8 text-brand-clay/40" />
                      </div>
                    )}
                  </div>
                  <div className="px-4 pb-4">
                    {/* Logo */}
                    <div className="mt-[-22px] mb-2 relative z-10">
                      <div className="h-14 w-14 rounded-2xl border-2 border-white overflow-hidden shadow-soft bg-white">
                        {form.logoUrl ? (
                          <img
                            src={form.logoUrl}
                            alt="Logo"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full bg-brand-parchment flex items-center justify-center">
                            <BrandLogo size={28} />
                          </div>
                        )}
                      </div>
                    </div>
                    <h3 className="font-heading text-lg text-brand-charcoal">
                      {form.name || "Your Store Name"}
                    </h3>
                    <p className="text-xs text-brand-stone mt-1 line-clamp-3">
                      {form.storefrontDescription ||
                        "Your store description will appear here."}
                    </p>
                    {publicStoreUrl && (
                      <div className="mt-3 pt-3 border-t border-brand-sand/30">
                        <p className="text-xs text-brand-stone/60 font-mono truncate">
                          {shareableStoreUrl || publicStoreUrl}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Chatbot preview */}
                {form.chatbotWelcomeMessage && (
                  <div className="mt-4 panel">
                    <div className="panel-body py-3">
                      <p className="text-xs text-brand-stone mb-2 font-medium">Chatbot greeting</p>
                      <div className="rounded-xl bg-brand-parchment/50 px-3 py-2.5 border border-brand-sand/40">
                        <p className="text-sm text-brand-charcoal">
                          {form.chatbotWelcomeMessage}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Payments Tab ── */}
        {activeTab === "payments" && (
          <div className="max-w-2xl space-y-4 animate-fade-up">
            {/* Status */}
            <div className={`alert ${seedhape?.configured ? "alert-success" : "alert-info"}`}>
              {seedhape?.configured ? (
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
              )}
              <div>
                <p className="font-medium text-sm">
                  {seedhape?.configured ? "SeedhaPe is configured" : "SeedhaPe not configured"}
                </p>
                {seedhape?.configuredAt && (
                  <p className="text-xs opacity-70 mt-0.5">
                    Last updated: {new Date(seedhape.configuredAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            {seedhapeError && (
              <div className="alert alert-danger">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {seedhapeError}
              </div>
            )}

            {seedhapeSuccess && (
              <div className="alert alert-success">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-600" />
                {seedhapeSuccess}
              </div>
            )}

            {rotatedWebhookSecret && (
              <div className="panel animate-scale-in">
                <div className="panel-header bg-green-50/80 border-green-200/60">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm font-semibold">New Webhook Secret (shown once)</span>
                  </div>
                </div>
                <div className="panel-body">
                  <p className="text-xs text-brand-stone mb-2">
                    Copy this secret and add it to SeedhaPe. It will not be shown again.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={rotatedWebhookSecret}
                      readOnly
                      className="input-field font-mono text-xs flex-1"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(rotatedWebhookSecret);
                          setSeedhapeSuccess("Webhook secret copied.");
                        } catch {
                          setSeedhapeError("Could not copy webhook secret.");
                        }
                      }}
                      className="btn btn-secondary btn-sm flex-shrink-0"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* API credentials */}
            <div className="panel">
              <div className="panel-header">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-brand-terracotta" />
                  <span className="text-sm font-semibold text-brand-charcoal">SeedhaPe Credentials</span>
                </div>
              </div>
              <div className="panel-body space-y-4">
                <p className="text-xs text-brand-stone">
                  Configure SeedhaPe credentials to enable direct customer payments from your storefront.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="input-label">API Key</label>
                    <input
                      type="password"
                      value={seedhapeForm.seedhapeApiKey}
                      onChange={(e) =>
                        setSeedhapeForm((p) => ({
                          ...p,
                          seedhapeApiKey: e.target.value,
                        }))
                      }
                      placeholder={seedhape?.apiKeyMasked || "sp_live_xxxxx…"}
                      className="input-field"
                    />
                    <p className="text-xs text-brand-stone mt-1">
                      Leave blank to keep existing key.
                    </p>
                  </div>
                  <div>
                    <label className="input-label">Webhook Secret</label>
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
                      className="input-field"
                    />
                    <p className="text-xs text-brand-stone mt-1">
                      Use Rotate to generate a random secret.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={saveSeedhapeSettings}
                    disabled={isSavingSeedhape}
                    className="btn btn-primary"
                  >
                    {isSavingSeedhape ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      "Save Settings"
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={rotateSeedhapeSecret}
                    disabled={isRotatingSecret}
                    className="btn btn-secondary"
                  >
                    {isRotatingSecret ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Rotating…
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4" />
                        Rotate Secret
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Webhook URL */}
            <div className="panel">
              <div className="panel-header">
                <span className="text-sm font-semibold text-brand-charcoal">Webhook Configuration</span>
              </div>
              <div className="panel-body space-y-3">
                <p className="text-xs text-brand-stone">
                  Add this URL to your SeedhaPe dashboard to receive payment notifications.
                </p>

                <div>
                  <label className="input-label">Webhook URL</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={webhookUrl}
                      readOnly
                      className="input-field flex-1 font-mono text-xs bg-brand-parchment/40 text-brand-stone"
                    />
                    <button
                      type="button"
                      onClick={handleCopyWebhookUrl}
                      className="btn btn-secondary btn-sm flex-shrink-0"
                    >
                      {webhookCopied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-green-600" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {seedhape?.baseUrl && (
                  <div>
                    <label className="input-label">API Base URL</label>
                    <input
                      type="text"
                      value={seedhape.baseUrl}
                      readOnly
                      className="input-field font-mono text-xs bg-brand-parchment/40 text-brand-stone"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
