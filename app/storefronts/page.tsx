"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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
    <div className="min-h-screen bg-[radial-gradient(circle_at_12%_18%,#ffd9b6_0%,transparent_36%),radial-gradient(circle_at_88%_10%,#f5cdb5_0%,transparent_30%),linear-gradient(140deg,#f8f3eb,#efe5d8_40%,#f5eee4)] p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-3xl border border-white/70 bg-white/80 backdrop-blur-xl p-6 md:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.08)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-stone-500">
                Rasphia Merchant Stores
              </p>
              <h1 className="text-3xl md:text-5xl font-serif text-stone-900 mt-2">
                Discover Independent Storefronts
              </h1>
              <p className="mt-2 text-sm text-stone-600">
                Browse curated merchant boutiques, filter products, and chat
                with store-specific assistants.
              </p>
            </div>
            <Link
              href="/"
              className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm text-stone-700 hover:bg-stone-100"
            >
              Back Home
            </Link>
          </div>

          <div className="mt-6">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by merchant name, style, or vibe"
              className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-200"
            />
          </div>
        </div>

        {loading ? (
          <p className="text-center text-stone-600 mt-8">Loading storefronts...</p>
        ) : stores.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-white/70 bg-white/70 p-8 text-center text-stone-600">
            No storefronts found.
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {stores.map((store) => (
              <Link
                key={store.id}
                href={`/storefronts/${store.slug}`}
                className="group overflow-hidden rounded-3xl border border-white/80 bg-white/80 backdrop-blur-xl shadow-[0_14px_32px_rgba(0,0,0,0.08)] transition hover:-translate-y-1"
              >
                <div className="h-36 bg-stone-200">
                  {store.coverImageUrl ? (
                    <img
                      src={store.coverImageUrl}
                      alt={store.name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : null}
                </div>
                <div className="px-5 pb-5">
                  <div className="mt-3 h-16 w-16 rounded-2xl border-4 border-white bg-stone-100 overflow-hidden shadow-md">
                    {store.logoUrl ? (
                      <img
                        src={store.logoUrl}
                        alt={`${store.name} logo`}
                        className="block h-full w-full object-fill bg-white"
                      />
                    ) : null}
                  </div>
                  <h2 className="mt-3 text-2xl font-serif text-stone-900">
                    {store.name}
                  </h2>
                  <p className="mt-1 text-xs text-stone-500 uppercase tracking-wider">
                    {[store.city, store.state].filter(Boolean).join(", ") ||
                      "Online Boutique"}
                  </p>
                  <p className="mt-3 text-sm text-stone-600 line-clamp-3">
                    {store.storefrontDescription ||
                      "Discover this merchant's latest product collection."}
                  </p>
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-amber-800">
                      {store._count?.catalog || 0} products
                    </span>
                    <span className="text-stone-700">Visit Store</span>
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
