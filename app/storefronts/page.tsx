"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Search, MapPin, ShoppingBag, ArrowRight, Store } from "lucide-react";
import BrandLogo from "@/app/components/brand/BrandLogo";
import Navbar from "@/app/components/Navbar";

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
    <div className="min-h-screen bg-brand-cream font-body">
      <Navbar />

      {/* Hero Header */}
      <div className="bg-brand-hero border-b border-brand-sand/30">
        <div className="mx-auto max-w-6xl px-4 md:px-8 py-12 md:py-16">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="animate-fade-up">
              <span className="text-xs uppercase tracking-[0.2em] text-brand-stone font-medium">
                Rasphia Marketplace
              </span>
              <h1 className="mt-2 font-heading text-3xl md:text-5xl text-brand-charcoal leading-tight">
                Discover Independent
                <br />
                <span className="text-brand-terracotta">Boutiques</span>
              </h1>
              <p className="mt-3 text-sm text-brand-stone max-w-md">
                Curated merchant stores, each with their own vibe. Browse products, chat with store AI, and find something made for you.
              </p>
            </div>
            <div className="animate-fade-up delay-150">
              <div className="flex items-center gap-2 text-sm text-brand-stone">
                <Store className="h-4 w-4 text-brand-terracotta" />
                <span>{stores.length > 0 ? `${stores.length} stores` : "Loading…"}</span>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="mt-8 max-w-2xl animate-fade-up delay-150">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-stone/50" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, style, city, or vibe…"
                className="w-full rounded-2xl border border-brand-sand/60 bg-white/90 backdrop-blur pl-11 pr-4 py-3.5 text-sm text-brand-charcoal outline-none focus:ring-2 focus:ring-brand-terracotta/20 focus:border-brand-terracotta/40 shadow-soft transition-all placeholder-brand-stone/50"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Store Grid */}
      <div className="mx-auto max-w-6xl px-4 md:px-8 py-10 space-y-6">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-3xl overflow-hidden border border-brand-sand/30 bg-white animate-fade-in">
                <div className="skeleton h-36 w-full" />
                <div className="p-5 space-y-3">
                  <div className="skeleton h-5 w-2/3" />
                  <div className="skeleton h-3.5 w-1/3" />
                  <div className="skeleton h-3.5 w-full" />
                  <div className="skeleton h-3.5 w-4/5" />
                </div>
              </div>
            ))}
          </div>
        ) : stores.length === 0 ? (
          <div className="glass-card p-12 text-center animate-scale-in">
            <Store className="h-12 w-12 text-brand-sand mx-auto mb-3" />
            <p className="font-heading text-xl text-brand-charcoal mb-1">No stores found</p>
            <p className="text-sm text-brand-stone">
              {query
                ? `No results for "${query}". Try a different search.`
                : "No storefronts are available yet."}
            </p>
            {query && (
              <button
                onClick={() => setQuery("")}
                className="btn btn-secondary btn-sm mt-4"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <>
            <p className="text-xs text-brand-stone">
              {stores.length} {stores.length === 1 ? "storefront" : "storefronts"}
              {query ? ` matching "${query}"` : ""}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {stores.map((store, i) => (
                <Link
                  key={store.id}
                  href={`/storefronts/${store.slug}`}
                  className="group hover-lift block overflow-hidden rounded-3xl border border-brand-sand/40 bg-white shadow-soft animate-fade-up"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  {/* Cover */}
                  <div className="relative h-40 bg-brand-parchment overflow-hidden">
                    {store.coverImageUrl ? (
                      <img
                        src={store.coverImageUrl}
                        alt={store.name}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-brand-parchment to-brand-sand flex items-center justify-center">
                        <Store className="h-10 w-10 text-brand-clay/50" />
                      </div>
                    )}
                    {/* Product count badge */}
                    <div className="absolute top-3 right-3">
                      <span className="badge badge-neutral bg-white/90 backdrop-blur">
                        <ShoppingBag className="h-3 w-3" />
                        {store._count?.catalog ?? 0} products
                      </span>
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="px-5 pb-5">
                    {/* Logo */}
                    <div className="mt-[-20px] mb-3 relative z-10">
                      <div className="h-14 w-14 rounded-2xl border-2 border-white bg-white overflow-hidden shadow-soft-md">
                        {store.logoUrl ? (
                          <img
                            src={store.logoUrl}
                            alt={`${store.name} logo`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full bg-brand-parchment flex items-center justify-center">
                            <BrandLogo size={28} />
                          </div>
                        )}
                      </div>
                    </div>

                    <h2 className="text-xl font-heading text-brand-charcoal group-hover:text-brand-terracotta transition-colors">
                      {store.name}
                    </h2>

                    {(store.city || store.state) && (
                      <div className="flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3 text-brand-stone/60" />
                        <p className="text-xs text-brand-stone">
                          {[store.city, store.state].filter(Boolean).join(", ")}
                        </p>
                      </div>
                    )}

                    <p className="mt-2.5 text-sm text-brand-stone line-clamp-2">
                      {store.storefrontDescription ||
                        "Discover this merchant's latest product collection."}
                    </p>

                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-xs text-brand-stone/60">
                        {store._count?.catalog ?? 0} products listed
                      </span>
                      <span className="flex items-center gap-1 text-sm font-medium text-brand-terracotta group-hover:gap-2 transition-all">
                        Visit store
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {/* CTA for merchants */}
        <div className="mt-12 glass-card p-8 flex flex-col md:flex-row items-center justify-between gap-6 animate-fade-up">
          <div>
            <h3 className="font-heading text-2xl text-brand-charcoal">Own a brand?</h3>
            <p className="text-sm text-brand-stone mt-1">
              Join Rasphia as a merchant. Get your own storefront, AI chatbot, and access to persona-matched customers.
            </p>
          </div>
          <Link href="/merchant/onboarding" className="btn btn-primary flex-shrink-0">
            Apply as Merchant
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
