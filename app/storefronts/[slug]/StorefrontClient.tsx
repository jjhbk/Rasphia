"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import BrandLogo from "@/app/components/brand/BrandLogo";
import { toHighQualityImageUrl } from "@/app/utils/imageQuality";
import { signIn, useSession } from "next-auth/react";
import { ShoppingCart, X } from "lucide-react";
import CheckoutPage from "@/app/components/CheckoutPage";
import type { CheckoutCustomer, Product, UserProfile } from "@/app/types";

type StorefrontProduct = {
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
  products: StorefrontProduct[];
  facets: {
    categories: string[];
    tags: string[];
    price: { min: number; max: number };
  };
};

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
  suggestedProducts?: StorefrontProduct[];
};

type CartItem = {
  _id?: string;
  id: string;
  name: string;
  brand?: string | null;
  price: number;
  imageUrl?: string | null;
  quantity: number;
  merchantSlug: string;
  merchantName: string;
};

const initialUser: UserProfile = {
  name: "",
  email: "",
  phone: "",
  address: "",
  wishlist: [],
  addressBook: [],
};

const CART_STORAGE_PREFIX = "rasphia_cart_v1";
const CART_SYNC_EVENT = "rasphia-cart-updated";
const CART_LAST_KEY = "rasphia_cart_last_key";
const CHAT_STORAGE_PREFIX = "rasphia_storefront_chat_v1";
const CHAT_CACHE_STORAGE_PREFIX = "rasphia_storefront_chat_cache_v1";

function normalizeCartItem(raw: any): CartItem | null {
  const name = String(raw?.name || "").trim();
  const id =
    String(raw?.id || raw?._id || "").trim() ||
    (name ? `name:${name.toLowerCase().replace(/\s+/g, "_")}` : "");
  if (!id || !name) return null;
  return {
    _id: raw?._id ? String(raw._id) : undefined,
    id,
    name,
    brand: raw?.brand ? String(raw.brand) : null,
    price: Number(raw?.price || 0),
    imageUrl: raw?.imageUrl ? String(raw.imageUrl) : null,
    quantity: Math.max(1, Number(raw?.quantity || 1)),
    merchantSlug: String(raw?.merchantSlug || "").trim(),
    merchantName: String(raw?.merchantName || "").trim(),
  };
}

function isSameCart(a: CartItem[], b: CartItem[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const x = a[i];
    const y = b[i];
    if (
      x.id !== y.id ||
      x.quantity !== y.quantity ||
      Number(x.price || 0) !== Number(y.price || 0) ||
      (x.name || "") !== (y.name || "")
    ) {
      return false;
    }
  }
  return true;
}

export default function MerchantStorefrontPublicPage({
  slug,
}: {
  slug: string;
}) {
  const { data: session, status: sessionStatus } = useSession();
  const [data, setData] = useState<StorefrontResponse | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
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
  const [currentUser, setCurrentUser] = useState<UserProfile>(initialUser);
  const [checkoutProducts, setCheckoutProducts] = useState<Product[] | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartFeedback, setCartFeedback] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartFeedbackPulse, setCartFeedbackPulse] = useState(false);
  const [chatCache, setChatCache] = useState<
    Record<string, { text: string; suggestedProducts: StorefrontProduct[] }>
  >({});

  const priceRange = data?.facets?.price;
  const canRenderFilters = Boolean(data);

  const [userCartStorageKey, setUserCartStorageKey] = useState(
    `${CART_STORAGE_PREFIX}:guest`
  );

  useEffect(() => {
    const userEmail = String(session?.user?.email || "").trim();
    if (!userEmail) {
      setCurrentUser(initialUser);
      return;
    }

    let cancelled = false;
    setCurrentUser((prev) => ({
      ...prev,
      email: userEmail,
      name: String(session?.user?.name || prev.name || "").trim(),
    }));

    const loadProfile = async () => {
      try {
        const res = await fetch(
          `/api/user/get-profile?email=${encodeURIComponent(userEmail)}`
        );
        if (!res.ok) return;
        const profile = await res.json();
        if (cancelled) return;
        setCurrentUser({
          name: String(profile?.name || session?.user?.name || "").trim(),
          email: String(profile?.email || userEmail).trim(),
          phone: String(profile?.phone || "").trim(),
          address: String(profile?.address || "").trim(),
          wishlist: Array.isArray(profile?.wishlist) ? profile.wishlist : [],
          addressBook: Array.isArray(profile?.addressBook) ? profile.addressBook : [],
        });
      } catch {
        if (cancelled) return;
        setCurrentUser((prev) => ({
          ...prev,
          email: userEmail,
          name: String(session?.user?.name || "").trim(),
        }));
      }
    };

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.email, session?.user?.name]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const email = String(session?.user?.email || "").trim().toLowerCase();
    if (email) {
      const userKey = `${CART_STORAGE_PREFIX}:${email}`;
      const guestKey = `${CART_STORAGE_PREFIX}:guest`;
      try {
        const guestRaw = window.localStorage.getItem(guestKey);
        if (guestRaw) {
          const guestParsed = JSON.parse(guestRaw);
          const userParsed = JSON.parse(
            window.localStorage.getItem(userKey) || "[]"
          );
          if (Array.isArray(guestParsed) && guestParsed.length) {
            const merged = [...(Array.isArray(userParsed) ? userParsed : [])];
            for (const g of guestParsed) {
              const gid = normalizeCartItem(g)?.id;
              if (!gid) continue;
              const idx = merged.findIndex(
                (x: any) => normalizeCartItem(x)?.id === gid
              );
              if (idx === -1) merged.push(g);
              else {
                merged[idx] = {
                  ...merged[idx],
                  quantity: Math.max(
                    1,
                    Number(merged[idx]?.quantity || 1) +
                      Number(g?.quantity || 1)
                  ),
                };
              }
            }
            window.localStorage.setItem(userKey, JSON.stringify(merged));
            window.localStorage.removeItem(guestKey);
          }
        }
      } catch {
        // ignore storage parse errors
      }
      window.localStorage.setItem(CART_LAST_KEY, userKey);
      setUserCartStorageKey((prev) => (prev === userKey ? prev : userKey));
      return;
    }
    const fallback =
      window.localStorage.getItem(CART_LAST_KEY) ||
      `${CART_STORAGE_PREFIX}:guest`;
    setUserCartStorageKey((prev) => (prev === fallback ? prev : fallback));
  }, [session?.user?.email]);

  const chatStorageKey = useMemo(() => {
    const email = String(session?.user?.email || "").trim().toLowerCase() || "guest";
    return `${CHAT_STORAGE_PREFIX}:${slug}:${email}`;
  }, [session?.user?.email, slug]);

  const chatCacheStorageKey = useMemo(() => {
    const email = String(session?.user?.email || "").trim().toLowerCase() || "guest";
    return `${CHAT_CACHE_STORAGE_PREFIX}:${slug}:${email}`;
  }, [session?.user?.email, slug]);

  useEffect(() => {
    if (!userCartStorageKey || typeof window === "undefined") {
      setCart((prev) => (prev.length ? [] : prev));
      return;
    }
    const readCart = () => {
      try {
        const raw = window.localStorage.getItem(userCartStorageKey);
        if (!raw) {
          setCart((prev) => (prev.length ? [] : prev));
          return;
        }
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
          setCart((prev) => (prev.length ? [] : prev));
          return;
        }
        const normalized = parsed
          .map((item) => normalizeCartItem(item))
          .filter((item): item is CartItem => Boolean(item));
        setCart((prev) => (isSameCart(prev, normalized) ? prev : normalized));
      } catch {
        setCart((prev) => (prev.length ? [] : prev));
      }
    };
    readCart();

    const onStorage = (event: StorageEvent) => {
      if (event.key && event.key !== userCartStorageKey) return;
      readCart();
    };
    const onCartSync = () => readCart();
    window.addEventListener("storage", onStorage);
    window.addEventListener(CART_SYNC_EVENT, onCartSync);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(CART_SYNC_EVENT, onCartSync);
    };
  }, [userCartStorageKey]);

  useEffect(() => {
    if (!userCartStorageKey || typeof window === "undefined") return;
    window.localStorage.setItem(userCartStorageKey, JSON.stringify(cart));
    window.dispatchEvent(new Event(CART_SYNC_EVENT));
  }, [cart, userCartStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const rawChat = window.localStorage.getItem(chatStorageKey);
      if (rawChat) {
        const parsed = JSON.parse(rawChat);
        if (Array.isArray(parsed)) {
          const normalized = parsed
            .map((m) => ({
              role: (m?.role === "user" ? "user" : "assistant") as
                | "user"
                | "assistant",
              text: String(m?.text || "").trim(),
              suggestedProducts: Array.isArray(m?.suggestedProducts)
                ? (m.suggestedProducts as StorefrontProduct[])
                : undefined,
            }))
            .filter((m) => m.text.length > 0);
          if (normalized.length) {
            setChatMessages(normalized);
          }
        }
      }
    } catch {
      // ignore storage parse errors
    }

    try {
      const rawCache = window.localStorage.getItem(chatCacheStorageKey);
      if (rawCache) {
        const parsed = JSON.parse(rawCache);
        if (parsed && typeof parsed === "object") {
          setChatCache(parsed as Record<string, { text: string; suggestedProducts: StorefrontProduct[] }>);
        }
      }
    } catch {
      // ignore storage parse errors
    }
  }, [chatStorageKey, chatCacheStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(chatStorageKey, JSON.stringify(chatMessages));
  }, [chatMessages, chatStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(chatCacheStorageKey, JSON.stringify(chatCache));
  }, [chatCache, chatCacheStorageKey]);

  useEffect(() => {
    if (!cartFeedback) return;
    const id = window.setTimeout(() => setCartFeedback(null), 1800);
    return () => window.clearTimeout(id);
  }, [cartFeedback]);

  useEffect(() => {
    if (!cartFeedbackPulse) return;
    const id = window.setTimeout(() => setCartFeedbackPulse(false), 420);
    return () => window.clearTimeout(id);
  }, [cartFeedbackPulse]);

  useEffect(() => {
    const abortController = new AbortController();

    const run = async () => {
      try {
        if (data) {
          setIsFetching(true);
        } else {
          setInitialLoading(true);
        }
        setError(null);

        const res = await fetch(`/api/storefronts/${slug}`, {
          signal: abortController.signal,
        });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload?.error || "Failed to load storefront");

        setData(payload);
        setChatMessages((prev) =>
          prev.length
            ? prev
            : [
                {
                  role: "assistant",
                  text:
                    payload?.merchant?.chatbotWelcomeMessage ||
                    "Hi, I am your store assistant. Tell me what you are looking for.",
                },
              ]
        );

        if (!maxPrice && payload?.facets?.price?.max) {
          setMaxPrice(payload.facets.price.max);
        }
      } catch (e: unknown) {
        if (abortController.signal.aborted) return;
        const message = e instanceof Error ? e.message : "Failed to load storefront";
        setError(message);
      } finally {
        if (abortController.signal.aborted) return;
        setInitialLoading(false);
        setIsFetching(false);
      }
    };

    const id = setTimeout(run, 160);
    return () => {
      clearTimeout(id);
      abortController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const filteredProducts = useMemo(() => {
    if (!data?.products?.length) return [];
    const q = search.trim().toLowerCase();
    const requiredTags = selectedTags.map((t) => t.toLowerCase());
    let next = data.products.filter((p) => {
      const tags = Array.isArray(p.tags)
        ? p.tags
            .map((t) => String(t || "").trim().toLowerCase())
            .filter(Boolean)
        : [];
      const categoryValue = String(p.category || "");
      const price = Number(p.price || 0);
      const searchable = [
        p.name,
        p.description || "",
        p.brand || "",
        categoryValue,
        ...tags,
      ]
        .join(" ")
        .toLowerCase();
      if (q && !searchable.includes(q)) return false;
      if (category && categoryValue.toLowerCase() !== category.toLowerCase()) {
        return false;
      }
      if (requiredTags.length && !requiredTags.every((tag) => tags.includes(tag))) {
        return false;
      }
      if (price < minPrice) return false;
      if (maxPrice > 0 && price > maxPrice) return false;
      if (inStockOnly && (!p.isAvailable || p.stockQuantity <= 0)) return false;
      return true;
    });

    if (sort === "price_asc") {
      next = [...next].sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    } else if (sort === "price_desc") {
      next = [...next].sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    } else if (sort === "latest") {
      next = [...next].sort((a, b) => String(b.id).localeCompare(String(a.id)));
    }
    return next;
  }, [data?.products, search, selectedTags, category, minPrice, maxPrice, inStockOnly, sort]);

  const visibleTagFacets = useMemo(
    () => (data?.facets?.tags || []).slice(0, 18),
    [data?.facets?.tags]
  );

  const addToCart = async (product: StorefrontProduct) => {
    if (sessionStatus === "loading") return;
    if (!session?.user?.email) {
      await signIn(undefined, {
        callbackUrl:
          typeof window !== "undefined" ? window.location.href : `/storefronts/${slug}`,
      });
      return;
    }

    if (!product.isAvailable || product.stockQuantity <= 0) {
      setCartFeedback("Product is currently unavailable.");
      return;
    }

    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === product.id);
      if (existingIndex === -1) {
        return [
          ...prev,
          {
            _id: product._id || product.id,
            id: product.id,
            name: product.name,
            brand: product.brand || null,
            price: Number(product.price || 0),
            imageUrl: product.imageUrl || null,
            quantity: 1,
            merchantSlug: data?.merchant.slug || slug,
            merchantName: data?.merchant.name || "Merchant",
          },
        ];
      }
      const next = [...prev];
      const current = next[existingIndex];
      next[existingIndex] = {
        ...current,
        quantity: Math.min(current.quantity + 1, Math.max(1, product.stockQuantity)),
      };
      return next;
    });
    setCartFeedbackPulse(true);
    setCartFeedback(`Added ${product.name} to cart`);
  };

  const sendChat = async () => {
    const text = chatInput.trim();
    if (!text) return;
    const nextHistory = [...chatMessages, { role: "user" as const, text }];
    setChatMessages(nextHistory);
    setChatInput("");

    const historySignature = JSON.stringify(
      nextHistory.slice(-8).map((m) => ({
        role: m.role,
        text: m.text,
      }))
    );
    const cacheKey = `${slug}:${historySignature}`;
    const cached = chatCache[cacheKey];
    if (cached) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: cached.text,
          suggestedProducts: cached.suggestedProducts || [],
        },
      ]);
      return;
    }

    try {
      setChatLoading(true);
      const res = await fetch(`/api/storefronts/${slug}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: nextHistory.slice(-8),
          userEmail: session?.user?.email || "",
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || "Chat failed");

      const assistantText =
        payload?.text ||
        "I found some options in this store. Want me to narrow them?";
      const assistantProducts: StorefrontProduct[] = payload?.suggestedProducts || [];
      setChatCache((prev) => ({
        ...prev,
        [cacheKey]: {
          text: assistantText,
          suggestedProducts: assistantProducts,
        },
      }));

      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: assistantText,
          suggestedProducts: assistantProducts,
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

  const checkoutCartItems = useMemo<Product[]>(
    () =>
      cart.map((item) => ({
        _id: item._id || item.id,
        id: item.id,
        name: item.name,
        brand: item.brand || "",
        merchantSlug: item.merchantSlug,
        merchantName: item.merchantName,
        category: "General",
        price: Number(item.price || 0),
        quantity: Math.max(1, Number(item.quantity || 1)),
        imageUrl: item.imageUrl || "",
      })),
    [cart]
  );

  const handleCheckoutFromCart = async () => {
    if (!cart.length) return;
    if (sessionStatus === "loading") return;
    if (!session?.user?.email) {
      await signIn(undefined, {
        callbackUrl:
          typeof window !== "undefined" ? window.location.href : `/storefronts/${slug}`,
      });
      return;
    }
    setCheckoutProducts(checkoutCartItems);
    setIsCartOpen(false);
  };

  const handleCancelCheckout = () => {
    setCheckoutProducts(null);
  };

  const handlePlaceOrder = async (
    customer: CheckoutCustomer,
    _paymentId: string
  ) => {
    if (!checkoutProducts?.length) return;
    const checkedOutIds = new Set(
      checkoutProducts
        .map((p) => String(p.id || p._id || "").trim())
        .filter(Boolean)
    );
    const addressEntry = {
      name: customer.name,
      phone: customer.phone,
      addressLine1: customer.addressLine1 || "",
      addressLine2: customer.addressLine2 || "",
      city: customer.city || "",
      state: customer.state || "",
      zipCode: customer.zipCode || "",
      address: customer.address,
    };
    const nextAddressBook = (currentUser.addressBook || []).some(
      (entry) => entry.address === addressEntry.address
    )
      ? (currentUser.addressBook || []).map((entry) =>
          entry.address === addressEntry.address ? addressEntry : entry
        )
      : [addressEntry, ...(currentUser.addressBook || [])];

    setCurrentUser((prev) => ({
      ...prev,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      addressBook: nextAddressBook,
    }));
    setCart((prev) =>
      prev.filter((item) => !checkedOutIds.has(String(item.id || item._id || "").trim()))
    );
    setCheckoutProducts(null);
    setCartFeedback("Order placed successfully.");
  };

  if (checkoutProducts) {
    return (
      <CheckoutPage
        products={checkoutProducts}
        user={currentUser}
        onPlaceOrder={handlePlaceOrder}
        onCancel={handleCancelCheckout}
      />
    );
  }

  if (initialLoading && !data) {
    return <div className="min-h-screen bg-brand-cream p-6">Loading storefront...</div>;
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-brand-cream p-8">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white border border-brand-sand/50 p-6">
          <p className="text-red-700">{error || "Storefront not found"}</p>
          <Link href="/storefronts" className="mt-3 inline-block underline text-brand-charcoal">
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
          <div className="relative h-56 md:h-72 bg-brand-parchment">
            {data.merchant.coverImageUrl ? (
              <img
                src={data.merchant.coverImageUrl}
                alt={data.merchant.name}
                className="absolute inset-0 h-full w-full object-cover"
                loading="eager"
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/5 to-transparent" />
            <Link
              href="/storefronts"
              className="absolute top-4 left-4 rounded-full bg-white/90 px-3 py-1.5 text-xs text-brand-charcoal hover:bg-white"
            >
              All Storefronts
            </Link>
          </div>

          <div className="px-4 md:px-8 pb-8">
            <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
              <div className="flex items-end gap-4">
                <div className="h-24 w-24 rounded-3xl border-4 border-white bg-brand-cream overflow-hidden shadow-xl">
                  {data.merchant.logoUrl ? (
                    <img
                      src={data.merchant.logoUrl}
                      alt={`${data.merchant.name} logo`}
                      className="block h-full w-full object-fill bg-white"
                      loading="eager"
                    />
                  ) : (
                    <BrandLogo size={72} className="h-full w-full items-center justify-center" />
                  )}
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-serif text-brand-charcoal">
                    {data.merchant.name}
                  </h1>
                  <p className="text-xs uppercase tracking-[0.2em] text-brand-stone mt-1">
                    {[data.merchant.city, data.merchant.state]
                      .filter(Boolean)
                      .join(", ") || "Online Store"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-brand-sand/70 bg-white px-2.5 py-1 text-[11px] text-brand-charcoal">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)} item
                  {cart.reduce((sum, item) => sum + item.quantity, 0) === 1
                    ? ""
                    : "s"}
                </span>
                <button
                  type="button"
                  onClick={() => setIsCartOpen(true)}
                  className={`relative rounded-full border border-brand-sand/70 bg-white p-2 text-brand-charcoal hover:bg-brand-cream transition-all ${
                    cartFeedbackPulse
                      ? "scale-105 ring-2 ring-amber-200 shadow-[0_0_0_4px_rgba(251,191,36,0.18)]"
                      : ""
                  }`}
                  aria-label="Open cart"
                >
                  <ShoppingCart className="h-4 w-4" />
                  {cart.reduce((sum, item) => sum + item.quantity, 0) > 0 ? (
                    <span
                      className={`absolute -right-1 -top-1 min-w-[18px] rounded-full bg-brand-charcoal px-1.5 py-0.5 text-[10px] text-white ${
                        cartFeedbackPulse ? "scale-110" : ""
                      }`}
                    >
                      {cart.reduce((sum, item) => sum + item.quantity, 0)}
                    </span>
                  ) : null}
                </button>
                {!session?.user?.email ? (
                  <button
                    type="button"
                    onClick={() => signIn(undefined, { callbackUrl: `/storefronts/${slug}` })}
                    className="rounded-full bg-brand-charcoal px-3 py-1.5 text-xs text-white"
                  >
                    Login
                  </button>
                ) : null}
              </div>
            </div>

            <p className="mt-4 max-w-3xl text-brand-charcoal leading-relaxed">
              {data.merchant.storefrontDescription ||
                "Explore this merchant's curated assortment and ask the store assistant for quick recommendations."}
            </p>
            {cartFeedback ? (
              <p className="mt-2 text-xs text-brand-sage">{cartFeedback}</p>
            ) : null}

            {canRenderFilters && (
              <div className="mt-6 rounded-2xl border border-brand-sand/50 bg-white/90 p-4 md:p-5">
                {isFetching && (
                  <p className="mb-3 text-xs text-brand-stone">Updating products...</p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search products"
                    className="md:col-span-2 rounded-xl border border-brand-sand/60 px-3 py-2 text-sm"
                  />
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="rounded-xl border border-brand-sand/60 px-3 py-2 text-sm"
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
                    className="rounded-xl border border-brand-sand/60 px-3 py-2 text-sm"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="latest">Latest</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                  </select>
                  <label className="inline-flex items-center gap-2 rounded-xl border border-brand-sand/60 px-3 py-2 text-sm bg-brand-parchment/40">
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
                    <p className="text-xs text-brand-stone mb-2">
                      Price range: ₹{minPrice} - ₹{maxPrice || priceRange?.max || 0}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        min={priceRange?.min ?? 0}
                        value={minPrice}
                        onChange={(e) => setMinPrice(Math.max(0, Number(e.target.value || 0)))}
                        className="rounded-lg border border-brand-sand/60 px-3 py-2 text-sm"
                        placeholder="Min price"
                      />
                      <input
                        type="number"
                        min={minPrice}
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(Math.max(0, Number(e.target.value || 0)))}
                        className="rounded-lg border border-brand-sand/60 px-3 py-2 text-sm"
                        placeholder="Max price"
                      />
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-brand-stone mb-2">Tags</p>
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
                                ? "bg-brand-charcoal text-white border-brand-charcoal"
                                : "bg-white text-brand-charcoal border-brand-sand/60"
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
                {filteredProducts.map((p) => (
                  <div
                    key={p._id}
                    className="rounded-2xl border border-brand-sand/50 bg-white p-3 shadow-[0_8px_20px_rgba(0,0,0,0.04)]"
                  >
                    <div className="h-44 w-full overflow-hidden rounded-xl bg-brand-cream">
                      {p.imageUrl ? (
                        <img
                          src={toHighQualityImageUrl(p.imageUrl)}
                          alt={p.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : null}
                    </div>
                    <h3 className="mt-3 text-lg font-medium text-brand-charcoal">{p.name}</h3>
                    <p className="text-xs uppercase tracking-[0.18em] text-brand-stone mt-1">
                      {p.brand || p.category || "General"}
                    </p>
                    <p className="mt-2 text-sm text-brand-stone line-clamp-3">
                      {p.description || "No description provided."}
                    </p>
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-lg font-semibold text-brand-charcoal">
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
                    <button
                      type="button"
                      disabled={!p.isAvailable || p.stockQuantity <= 0 || sessionStatus === "loading"}
                      onClick={() => addToCart(p)}
                      className="mt-3 w-full rounded-xl bg-brand-charcoal px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {sessionStatus === "loading"
                        ? "Checking..."
                        : p.isAvailable && p.stockQuantity > 0
                        ? "Add to Cart"
                        : "Out of Stock"}
                    </button>
                  </div>
                ))}

                {!filteredProducts.length && (
                  <div className="col-span-full rounded-2xl border border-brand-sand/50 bg-white p-8 text-center text-brand-stone">
                    No products match these filters.
                  </div>
                )}
              </div>

              <aside className="rounded-2xl border border-brand-sand/50 bg-white p-4 shadow-[0_10px_26px_rgba(0,0,0,0.05)] sticky top-4">
                <h2 className="text-lg font-serif text-brand-charcoal">Store Assistant</h2>
                <p className="text-xs text-brand-stone mt-1">
                  Ask about use-cases, budget, bestsellers, or alternatives.
                </p>

                <div className="mt-3 max-h-[420px] overflow-y-auto space-y-3 pr-1">
                  {chatMessages.map((m, idx) => (
                    <div key={`${m.role}-${idx}`}>
                      <div
                        className={`rounded-xl px-3 py-2 text-sm ${
                          m.role === "assistant"
                            ? "bg-brand-cream text-brand-charcoal"
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
                              className="rounded-lg border border-brand-sand/50 bg-white p-2 text-xs"
                            >
                              <p className="font-medium text-brand-charcoal">{sp.name}</p>
                              <p className="text-brand-stone">₹{Number(sp.price || 0).toFixed(0)}</p>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                  {chatLoading && (
                    <div>
                      <div className="inline-flex items-center gap-1 rounded-xl bg-brand-cream px-3 py-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-brand-stone/70 animate-bounce [animation-delay:-0.2s]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-brand-stone/70 animate-bounce [animation-delay:-0.1s]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-brand-stone/70 animate-bounce" />
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
                    className="flex-1 rounded-xl border border-brand-sand/60 px-3 py-2 text-sm"
                    disabled={chatLoading}
                  />
                  <button
                    disabled={chatLoading}
                    onClick={sendChat}
                    className="rounded-xl bg-brand-charcoal px-3 py-2 text-sm text-white disabled:opacity-50"
                  >
                    {chatLoading ? "..." : "Send"}
                  </button>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </div>

      {isCartOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsCartOpen(false)}
          />
          <div className="relative w-full max-w-lg rounded-2xl border border-brand-sand/50 bg-white p-4 shadow-[0_20px_50px_rgba(0,0,0,0.18)]">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-serif text-brand-charcoal">Your Cart</h3>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="rounded-full border border-brand-sand/60 p-1.5 text-brand-charcoal hover:bg-brand-cream"
                aria-label="Close cart"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {cart.length === 0 ? (
              <p className="mt-4 text-sm text-brand-stone">Your cart is empty.</p>
            ) : (
              <>
                <div className="mt-4 max-h-[360px] space-y-2 overflow-y-auto pr-1">
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-xl border border-brand-sand/50 bg-brand-parchment/30 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-brand-charcoal">
                          {item.name}
                        </p>
                        <p className="text-xs text-brand-stone">
                          Qty {item.quantity} • ₹{Number(item.price || 0).toFixed(0)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setCart((prev) => prev.filter((p) => p.id !== item.id))
                        }
                        className="rounded-lg border border-brand-sand/60 px-2 py-1 text-xs text-brand-charcoal hover:bg-white"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-4 border-t border-brand-sand/40 pt-3">
                  <p className="text-sm text-brand-charcoal">
                    Total: ₹
                    {cart
                      .reduce(
                        (sum, item) =>
                          sum + Number(item.price || 0) * Number(item.quantity || 1),
                        0
                      )
                      .toFixed(0)}
                  </p>
                  <button
                    type="button"
                    onClick={handleCheckoutFromCart}
                    disabled={!cart.length || sessionStatus === "loading"}
                    className="mt-3 w-full rounded-xl bg-brand-charcoal px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {sessionStatus === "loading" ? "Checking..." : "Proceed to checkout"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
