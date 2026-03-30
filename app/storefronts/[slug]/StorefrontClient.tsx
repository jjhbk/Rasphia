"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Product = {
  _id: string;
  id: string;
  name: string;
  brand?: string | null;
  category?: string | null;
  price?: number | null;
  description?: string | null;
  imageUrl?: string | null;
  tags?: string[] | null;
  stockQuantity: number;
  isAvailable: boolean;
};

type StorefrontResponse = {
  merchant: {
    id: string;
    slug: string;
    name: string;
    logoUrl?: string | null;
    coverImageUrl?: string | null;
    storefrontDescription?: string | null;
    chatbotWelcomeMessage?: string | null;
    city?: string | null;
    state?: string | null;
  };
  products: Product[];
  facets: {
    categories: string[];
    tags: string[];
    price: { min: number; max: number };
  };
};

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
  suggestedProducts?: Product[];
};

export default function MerchantStorefrontPublicPage({
  slug,
}: {
  slug: string;
}) {
  const [data, setData] = useState<StorefrontResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(0);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sort, setSort] = useState("relevance");

  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const priceRange = data?.facets?.price;
  const canRenderFilters = Boolean(data);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const qp = new URLSearchParams();
        if (search.trim()) qp.set("q", search.trim());
        if (category) qp.set("category", category);
        if (selectedTags.length) qp.set("tags", selectedTags.join(","));
        qp.set("minPrice", String(minPrice || 0));
        if (maxPrice > 0) qp.set("maxPrice", String(maxPrice));
        if (inStockOnly) qp.set("inStock", "true");
        if (sort) qp.set("sort", sort);

        const res = await fetch(`/api/storefronts/${slug}?${qp.toString()}`);
        const payload = await res.json();
        if (!res.ok) throw new Error(payload?.error || "Failed to load storefront");

        setData(payload);
        if (!chatMessages.length) {
          setChatMessages([
            {
              role: "assistant",
              text:
                payload?.merchant?.chatbotWelcomeMessage ||
                "Hi, I am your store assistant. Tell me what you are looking for.",
            },
          ]);
        }

        if (!maxPrice && payload?.facets?.price?.max) {
          setMaxPrice(payload.facets.price.max);
        }
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Failed to load storefront";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    const id = setTimeout(run, 160);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, search, category, inStockOnly, sort, minPrice, maxPrice, selectedTags.join(",")]);

  const visibleTagFacets = useMemo(
    () => (data?.facets?.tags || []).slice(0, 18),
    [data?.facets?.tags]
  );

  const sendChat = async () => {
    const text = chatInput.trim();
    if (!text) return;
    const nextHistory = [...chatMessages, { role: "user" as const, text }];
    setChatMessages(nextHistory);
    setChatInput("");

    try {
      setChatLoading(true);
      const res = await fetch(`/api/storefronts/${slug}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: nextHistory.slice(-8),
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || "Chat failed");

      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text:
            payload?.text ||
            "I found some options in this store. Want me to narrow them?",
          suggestedProducts: payload?.suggestedProducts || [],
        },
      ]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Chat failed";
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", text: `Sorry, I hit an issue: ${msg}` },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-stone-100 p-6">Loading storefront...</div>;
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-stone-100 p-8">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white border border-stone-200 p-6">
          <p className="text-red-700">{error || "Storefront not found"}</p>
          <Link href="/storefronts" className="mt-3 inline-block underline text-stone-700">
            Back to storefronts
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_10%_10%,#f7d5b7_0%,transparent_34%),radial-gradient(circle_at_90%_0%,#f9dcc6_0%,transparent_30%),linear-gradient(160deg,#f8f4ec,#efe5d9_45%,#f5ede1)]">
      <div className="mx-auto max-w-7xl p-4 md:p-8">
        <div className="overflow-hidden rounded-[30px] border border-white/80 bg-white/75 backdrop-blur-xl shadow-[0_30px_70px_rgba(0,0,0,0.09)]">
          <div className="relative h-56 md:h-72 bg-stone-200">
            {data.merchant.coverImageUrl ? (
              <img
                src={data.merchant.coverImageUrl}
                alt={data.merchant.name}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/5 to-transparent" />
            <Link
              href="/storefronts"
              className="absolute top-4 left-4 rounded-full bg-white/90 px-3 py-1.5 text-xs text-stone-800 hover:bg-white"
            >
              All Storefronts
            </Link>
          </div>

          <div className="px-4 md:px-8 pb-8">
            <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
              <div className="flex items-end gap-4">
                <div className="h-24 w-24 rounded-3xl border-4 border-white bg-stone-100 overflow-hidden shadow-xl">
                  {data.merchant.logoUrl ? (
                    <img
                      src={data.merchant.logoUrl}
                      alt={`${data.merchant.name} logo`}
                      className="block h-full w-full object-fill bg-white"
                    />
                  ) : null}
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-serif text-stone-900">
                    {data.merchant.name}
                  </h1>
                  <p className="text-xs uppercase tracking-[0.2em] text-stone-500 mt-1">
                    {[data.merchant.city, data.merchant.state]
                      .filter(Boolean)
                      .join(", ") || "Online Store"}
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-4 max-w-3xl text-stone-700 leading-relaxed">
              {data.merchant.storefrontDescription ||
                "Explore this merchant's curated assortment and ask the store assistant for quick recommendations."}
            </p>

            {canRenderFilters && (
              <div className="mt-6 rounded-2xl border border-stone-200 bg-white/90 p-4 md:p-5">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search products"
                    className="md:col-span-2 rounded-xl border border-stone-300 px-3 py-2 text-sm"
                  />
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="rounded-xl border border-stone-300 px-3 py-2 text-sm"
                  >
                    <option value="">All categories</option>
                    {data.facets.categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className="rounded-xl border border-stone-300 px-3 py-2 text-sm"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="latest">Latest</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                  </select>
                  <label className="inline-flex items-center gap-2 rounded-xl border border-stone-300 px-3 py-2 text-sm bg-stone-50">
                    <input
                      type="checkbox"
                      checked={inStockOnly}
                      onChange={(e) => setInStockOnly(e.target.checked)}
                    />
                    In stock only
                  </label>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-stone-500 mb-2">
                      Price range: ₹{minPrice} - ₹{maxPrice || priceRange?.max || 0}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        min={priceRange?.min ?? 0}
                        value={minPrice}
                        onChange={(e) => setMinPrice(Math.max(0, Number(e.target.value || 0)))}
                        className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                        placeholder="Min price"
                      />
                      <input
                        type="number"
                        min={minPrice}
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(Math.max(0, Number(e.target.value || 0)))}
                        className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                        placeholder="Max price"
                      />
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-stone-500 mb-2">Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {visibleTagFacets.map((tag) => {
                        const selected = selectedTags.includes(tag);
                        return (
                          <button
                            key={tag}
                            onClick={() =>
                              setSelectedTags((prev) =>
                                selected
                                  ? prev.filter((x) => x !== tag)
                                  : [...prev, tag]
                              )
                            }
                            className={`rounded-full border px-3 py-1 text-xs ${
                              selected
                                ? "bg-stone-900 text-white border-stone-900"
                                : "bg-white text-stone-700 border-stone-300"
                            }`}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8 grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 items-start">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.products.map((p) => (
                  <div
                    key={p._id}
                    className="rounded-2xl border border-stone-200 bg-white p-3 shadow-[0_8px_20px_rgba(0,0,0,0.04)]"
                  >
                    <div className="h-44 w-full overflow-hidden rounded-xl bg-stone-100">
                      {p.imageUrl ? (
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <h3 className="mt-3 text-lg font-medium text-stone-900">{p.name}</h3>
                    <p className="text-xs uppercase tracking-[0.18em] text-stone-500 mt-1">
                      {p.brand || p.category || "General"}
                    </p>
                    <p className="mt-2 text-sm text-stone-600 line-clamp-3">
                      {p.description || "No description provided."}
                    </p>
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-lg font-semibold text-stone-900">
                        ₹{Number(p.price || 0).toFixed(0)}
                      </p>
                      {p.isAvailable && p.stockQuantity > 0 ? (
                        <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs text-emerald-700">
                          In Stock ({p.stockQuantity})
                        </span>
                      ) : (
                        <span className="rounded-full bg-red-50 border border-red-200 px-2.5 py-1 text-xs text-red-700">
                          Unavailable
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {!data.products.length && (
                  <div className="col-span-full rounded-2xl border border-stone-200 bg-white p-8 text-center text-stone-600">
                    No products match these filters.
                  </div>
                )}
              </div>

              <aside className="rounded-2xl border border-stone-200 bg-white p-4 shadow-[0_10px_26px_rgba(0,0,0,0.05)] sticky top-4">
                <h2 className="text-lg font-serif text-stone-900">Store Assistant</h2>
                <p className="text-xs text-stone-500 mt-1">
                  Ask about use-cases, budget, bestsellers, or alternatives.
                </p>

                <div className="mt-3 max-h-[420px] overflow-y-auto space-y-3 pr-1">
                  {chatMessages.map((m, idx) => (
                    <div key={`${m.role}-${idx}`}>
                      <div
                        className={`rounded-xl px-3 py-2 text-sm ${
                          m.role === "assistant"
                            ? "bg-stone-100 text-stone-800"
                            : "bg-amber-100 text-amber-900"
                        }`}
                      >
                        {m.text}
                      </div>
                      {m.suggestedProducts?.length ? (
                        <div className="mt-2 grid gap-2">
                          {m.suggestedProducts.slice(0, 2).map((sp) => (
                            <div
                              key={sp._id}
                              className="rounded-lg border border-stone-200 bg-white p-2 text-xs"
                            >
                              <p className="font-medium text-stone-900">{sp.name}</p>
                              <p className="text-stone-600">₹{Number(sp.price || 0).toFixed(0)}</p>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                  {chatLoading && (
                    <div>
                      <div className="inline-flex items-center gap-1 rounded-xl bg-stone-100 px-3 py-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-stone-400 animate-bounce [animation-delay:-0.2s]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-stone-400 animate-bounce [animation-delay:-0.1s]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-stone-400 animate-bounce" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-3 flex gap-2">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !chatLoading && sendChat()}
                    placeholder="Ask this merchant assistant..."
                    className="flex-1 rounded-xl border border-stone-300 px-3 py-2 text-sm"
                    disabled={chatLoading}
                  />
                  <button
                    disabled={chatLoading}
                    onClick={sendChat}
                    className="rounded-xl bg-stone-900 px-3 py-2 text-sm text-white disabled:opacity-50"
                  >
                    {chatLoading ? "..." : "Send"}
                  </button>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
