"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import BrandLogo from "@/app/components/brand/BrandLogo";
import BrandBanner from "@/app/components/brand/BrandBanner";

type Store = {
  id: string;
  slug: string;
  name: string;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  storefrontDescription?: string | null;
  city?: string | null;
  state?: string | null;
  _count?: { catalog: number };
};

export default function StorefrontIndexPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await fetch(`/api/storefronts?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setStores(data?.stores || []);
      setLoading(false);
    };

    const id = setTimeout(load, 200);
    return () => clearTimeout(id);
  }, [query]);

  return (
    <div className="min-h-screen bg-brand-hero p-4 md:p-8 font-body">
      <div className="mx-auto max-w-6xl space-y-6">
        <BrandBanner className="hidden md:block" />

        <div className="rounded-3xl border border-brand-sand/40 bg-white/80 backdrop-blur-xl p-6 md:p-8 shadow-soft-lg">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <BrandLogo size={40} showWordmark wordmarkClassName="text-lg" />
              <p className="mt-4 text-xs uppercase tracking-[0.22em] text-brand-stone">
                Merchant Storefronts
              </p>
              <h1 className="text-3xl md:text-5xl font-heading text-brand-charcoal mt-2">
                Discover Independent Stores
              </h1>
              <p className="mt-2 text-sm text-brand-stone max-w-2xl">
                Browse curated merchant boutiques, filter products, and chat with
                store-specific assistants.
              </p>
            </div>
            <Link
              href="/"
              className="rounded-full border border-brand-sand/70 bg-white px-4 py-2 text-sm text-brand-charcoal hover:bg-brand-parchment transition-colors"
            >
              Back Home
            </Link>
          </div>

          <div className="mt-6">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by merchant name, style, or vibe"
              className="w-full rounded-2xl border border-brand-sand/60 bg-white px-4 py-3 text-sm text-brand-charcoal outline-none focus:ring-2 focus:ring-brand-terracotta/20"
            />
          </div>
        </div>

        {loading ? (
          <p className="text-center text-brand-stone mt-8">Loading storefronts...</p>
        ) : stores.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-brand-sand/40 bg-white/70 p-8 text-center text-brand-stone">
            No storefronts found.
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {stores.map((store) => (
              <Link
                key={store.id}
                href={`/storefronts/${store.slug}`}
                className="group overflow-hidden rounded-3xl border border-brand-sand/40 bg-white/80 backdrop-blur-xl shadow-soft-md transition hover:-translate-y-1"
              >
                <div className="h-36 bg-brand-parchment">
                  {store.coverImageUrl ? (
                    <img
                      src={store.coverImageUrl}
                      alt={store.name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : null}
                </div>
                <div className="px-5 pb-5">
                  <div className="mt-3 h-16 w-16 rounded-2xl border-4 border-white bg-brand-cream overflow-hidden shadow-soft">
                    {store.logoUrl ? (
                      <img
                        src={store.logoUrl}
                        alt={`${store.name} logo`}
                        className="block h-full w-full object-fill bg-white"
                      />
                    ) : (
                      <BrandLogo size={48} className="h-full w-full items-center justify-center" />
                    )}
                  </div>
                  <h2 className="mt-3 text-2xl font-heading text-brand-charcoal">
                    {store.name}
                  </h2>
                  <p className="mt-1 text-xs text-brand-stone uppercase tracking-wider">
                    {[store.city, store.state].filter(Boolean).join(", ") ||
                      "Online Boutique"}
                  </p>
                  <p className="mt-3 text-sm text-brand-stone line-clamp-3">
                    {store.storefrontDescription ||
                      "Discover this merchant's latest product collection."}
                  </p>
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="rounded-full bg-brand-parchment border border-brand-sand/60 px-3 py-1 text-brand-terracotta">
                      {store._count?.catalog || 0} products
                    </span>
                    <span className="text-brand-charcoal">Visit Store</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
