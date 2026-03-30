"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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
  const [slugStatus, setSlugStatus] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");
  const [slugHint, setSlugHint] = useState("");
  const [origin, setOrigin] = useState("");

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

  if (isLoading) {
    return <div className="min-h-screen bg-stone-100 p-6">Loading storefront...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8f4ef] via-[#f3ece3] to-[#efe2d5] p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-3xl border border-white/70 bg-white/75 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.08)] p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-stone-500">Merchant Storefront</p>
              <h1 className="text-3xl md:text-4xl font-serif text-stone-900 mt-1">Design Your Public Store</h1>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/admin"
                className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm text-stone-700 hover:bg-stone-100"
              >
                Back to Dashboard
              </Link>
              {publicStoreUrl && (
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={publicStoreUrl}
                    className="rounded-full bg-stone-900 px-4 py-2 text-sm text-white hover:bg-black"
                  >
                    View Public Store
                  </Link>
                  <button
                    type="button"
                    onClick={handleCopyStorefrontUrl}
                    className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm text-stone-700 hover:bg-stone-100"
                  >
                    Copy URL
                  </button>
                  <button
                    type="button"
                    onClick={handleShareStorefront}
                    className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm text-stone-700 hover:bg-stone-100"
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
                <label className="text-sm text-stone-700">Business Name</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-amber-200"
                />
              </div>
              <div>
                <label className="text-sm text-stone-700">Store URL Slug</label>
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
                  className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-amber-200"
                />
                {slugStatus === "checking" && (
                  <p className="text-xs text-stone-500 mt-1">Checking availability...</p>
                )}
                {slugStatus === "available" && (
                  <p className="text-xs text-emerald-700 mt-1">{slugHint}</p>
                )}
                {slugStatus === "taken" && (
                  <p className="text-xs text-red-700 mt-1">{slugHint}</p>
                )}
                <p className="text-xs text-stone-500 mt-1">Public URL: {publicStoreUrl || "-"}</p>
                <p className="text-xs text-stone-500 mt-1">
                  Allowed: `a-z`, `0-9`, `-`, `_` | Length: {SLUG_MIN_LENGTH}-{SLUG_MAX_LENGTH}
                </p>
                {shareableStoreUrl && (
                  <p className="text-xs text-stone-500 break-all mt-1">
                    Shareable: {shareableStoreUrl}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-stone-700">Store Logo</label>
                <div className="mt-1 rounded-xl border border-stone-300 bg-white p-3">
                  <label className="inline-flex cursor-pointer rounded-lg border border-stone-300 px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-100">
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
                    className="ml-2 rounded-lg border border-stone-300 px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-100"
                  >
                    Remove
                  </button>
                  {form.logoUrl && (
                    <img
                      src={form.logoUrl}
                      alt="Logo preview"
                      className="mt-3 block h-24 w-24 rounded-xl object-fill bg-white border border-stone-200"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm text-stone-700">Cover Image</label>
                <div className="mt-1 rounded-xl border border-stone-300 bg-white p-3">
                  <label className="inline-flex cursor-pointer rounded-lg border border-stone-300 px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-100">
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
                    className="ml-2 rounded-lg border border-stone-300 px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-100"
                  >
                    Remove
                  </button>
                  {form.coverImageUrl && (
                    <img
                      src={form.coverImageUrl}
                      alt="Cover preview"
                      className="mt-3 h-28 w-full rounded-xl object-cover border border-stone-200"
                    />
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm text-stone-700">Store Description</label>
              <textarea
                rows={4}
                value={form.storefrontDescription}
                onChange={(e) =>
                  setForm((p) => ({ ...p, storefrontDescription: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-amber-200"
                placeholder="Tell visitors what your store specializes in."
              />
            </div>

            <div>
              <label className="text-sm text-stone-700">Chatbot Welcome Message</label>
              <textarea
                rows={3}
                value={form.chatbotWelcomeMessage}
                onChange={(e) =>
                  setForm((p) => ({ ...p, chatbotWelcomeMessage: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-amber-200"
                placeholder="Example: Hi, tell me your budget and I will recommend bestsellers."
              />
            </div>

            <div className="flex justify-end">
              <button
                disabled={isSaving}
                type="submit"
                className="rounded-full bg-amber-700 px-6 py-2 text-white hover:bg-amber-800 disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Storefront"}
              </button>
            </div>
          </form>
        </div>

        <div className="rounded-3xl border border-white/70 bg-white/75 p-4 md:p-6 backdrop-blur-xl shadow-[0_14px_30px_rgba(0,0,0,0.06)]">
          <h2 className="text-lg font-medium text-stone-800">Preview</h2>
          <div className="mt-3 overflow-hidden rounded-2xl border border-stone-200 bg-white">
            <div className="h-40 bg-stone-200">
              {form.coverImageUrl ? (
                <img
                  src={form.coverImageUrl}
                  alt="Store cover"
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>
            <div className="mt-3 px-4 pb-5">
              <div className="h-20 w-20 rounded-2xl border-4 border-white bg-stone-100 overflow-hidden">
                {form.logoUrl ? (
                  <img
                    src={form.logoUrl}
                    alt="Store logo"
                    className="block h-full w-full object-fill bg-white"
                  />
                ) : null}
              </div>
              <h3 className="mt-3 text-2xl font-serif text-stone-900">{form.name || storefront?.name || "Your Store"}</h3>
              <p className="mt-1 text-sm text-stone-600">
                {form.storefrontDescription || "Add your store description to make your storefront stand out."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
