"use client";
import React, { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  ShoppingCart,
  ChevronDown,
  User,
  LogOut,
  LayoutDashboard,
  Store,
} from "lucide-react";
import ChatWindow from "./components/ChatWindow";
import ChatInput from "./components/ChatInput";
import LandingPage from "./components/LandingPage";
import CheckoutPage from "./components/CheckoutPage";
import ProfilePage from "./components/ProfilePage";
import ReviewModal from "./components/ReviewModal";
import SignInPopup from "./components/SignInPopup";

import ChatSidebar from "@/app/components/ChatSidebar";
import AnalysisSidebar from "./components/analysis/AnalysisSidebar";
import AnalysisUploadModal from "./components/analysis/AnalysisUploadModal";
import AnalysisDetailModal from "./components/analysis/AnalysisDetailsModal";
import AnalysisListModal from "./components/analysis/AnalysisListModal";
import CartModal from "./components/CartModal";
import PersonaSidebar from "./components/persona/PersonaSidebar";
import BrandLogo from "./components/brand/BrandLogo";
import type {
  Message,
  Product,
  Order,
  CheckoutCustomer,
  UserProfile,
} from "./types";
import { products as initialProducts } from "./data/products";

import PersonaFlowModal from "./components/persona/PersonalFlowModal";
import usePersona from "@/hooks/userPersona";

const initialMessage: Message = {
  author: "ai",
  text: "Hello, I’m Rasphia — your personal shopping concierge. What would you like to explore today?",
};

const DEMO_IMG_PATH =
  '/mnt/data/A_logo_for_a_brand_named_"Rasphia"_is_displayed_on.png';

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
const BOOTSTRAP_CACHE_PREFIX = "rasphia_bootstrap_v1";
const BOOTSTRAP_CACHE_TTL_MS = 2 * 60 * 1000;

function isSameCart(
  a: Array<{ id?: string; _id?: string; name?: string; quantity?: number; price?: number }>,
  b: Array<{ id?: string; _id?: string; name?: string; quantity?: number; price?: number }>
) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const x = a[i];
    const y = b[i];
    const xId = String(x?.id || x?._id || "");
    const yId = String(y?.id || y?._id || "");
    if (
      xId !== yId ||
      String(x?.name || "") !== String(y?.name || "") ||
      Number(x?.quantity || 1) !== Number(y?.quantity || 1) ||
      Number(x?.price || 0) !== Number(y?.price || 0)
    ) {
      return false;
    }
  }
  return true;
}

function deriveCartIdFromProduct(raw: { id?: string; _id?: string; name?: string }) {
  const explicit = String(raw?.id || raw?._id || "").trim();
  if (explicit) return explicit;
  const name = String(raw?.name || "").trim().toLowerCase();
  return name ? `name:${name.replace(/\s+/g, "_")}` : "";
}

const App: React.FC = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isAuthenticated = !!session?.user;
  const [authCheckTimedOut, setAuthCheckTimedOut] = useState(false);
  const [roleRedirecting, setRoleRedirecting] = useState(false);

  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [chatSessions, setChatSessions] = useState<any[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [products] = useState<Product[]>(initialProducts);
  const [checkoutProducts, setCheckoutProducts] = useState<Product[] | null>(
    null
  );
  const [orders, setOrders] = useState<Order[]>([]);
  const [isProfileVisible, setIsProfileVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile>(initialUser);
  const [reviewingOrder, setReviewingOrder] = useState<Order | null>(null);
  const [isSignInPopupOpen, setIsSignInPopupOpen] = useState(false);
  const [recentAnalyses, setRecentAnalyses] = useState<any[]>([]);
  const [draft, setDraft] = useState<string>("");
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [analysisType, setAnalysisType] = useState<string | null>(null);
  const [analysisDetail, setAnalysisDetail] = useState(null);
  const [showAnalysisList, setShowAnalysisList] = useState(false);

  // Sidebar toggle state
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  const [cart, setCart] = useState<Product[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const {
    persona,
    loading: personaLoading,
    update: updatePersona,
  } = usePersona(currentUser.email);
  // add local state to App:
  const [personaOpenType, setPersonaOpenType] = useState<string | null>(null);
  const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const iconOnlyButtonClass =
    "h-11 w-11 p-0 inline-flex items-center justify-center rounded-xl";
  const [cartFeedbackPulse, setCartFeedbackPulse] = useState(false);
  const cartItemCount = cart.reduce(
    (sum, item) => sum + Math.max(1, Number(item.quantity || 1)),
    0
  );
  const [cartStorageKey, setCartStorageKey] = useState(
    `${CART_STORAGE_PREFIX}:guest`
  );

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
              const gid = deriveCartIdFromProduct(g);
              if (!gid) continue;
              const idx = merged.findIndex(
                (x: any) => deriveCartIdFromProduct(x) === gid
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
      setCartStorageKey((prev) => (prev === userKey ? prev : userKey));
      return;
    }
    const fallback =
      window.localStorage.getItem(CART_LAST_KEY) ||
      `${CART_STORAGE_PREFIX}:guest`;
    setCartStorageKey((prev) => (prev === fallback ? prev : fallback));
  }, [session?.user?.email]);

  function handleOpenPersonaFlow(type: any) {
    setPersonaOpenType(type);
    setIsPersonaModalOpen(true);
  }

  // pass onSave to modal
  async function handlePersonaSave(patch: any) {
    await updatePersona(patch);
    setIsPersonaModalOpen(false);
  }
  // Handle responsive sidebar behavior
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setIsLeftSidebarOpen(false);
        setIsRightSidebarOpen(false);
      }
    };

    if (window.innerWidth < 1024) {
      setIsMobile(true);
      setIsLeftSidebarOpen(false);
      setIsRightSidebarOpen(false);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (status !== "loading") {
      setAuthCheckTimedOut(false);
      return;
    }
    const timer = window.setTimeout(() => setAuthCheckTimedOut(true), 5000);
    return () => window.clearTimeout(timer);
  }, [status]);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.email) return;

    let cancelled = false;

    const resolveHomeRedirect = async () => {
      try {
        const res = await fetch("/api/management/access");
        if (!res.ok) return;
        const access = await res.json();
        if (cancelled) return;

        if (access?.access === "admin") {
          setRoleRedirecting(true);
          router.replace("/admin");
          return;
        }
        if (access?.access === "merchant") {
          setRoleRedirecting(true);
          router.replace("/dashboard");
          return;
        }
        if (access?.access === "merchant_pending") {
          setRoleRedirecting(true);
          router.replace("/merchant/onboarding");
          return;
        }
      } catch (err) {
        console.error("Failed to resolve role redirect:", err);
      }
    };

    resolveHomeRedirect();
    return () => {
      cancelled = true;
    };
  }, [status, session?.user?.email, router]);

  const handleOpenAnalysisDetails = (id: string) => {
    const found = recentAnalyses.find((a) => a.analysisId === id);
    if (found) {
      setAnalysisDetail(found);
      setShowAnalysisList(false);
    }
  };
  const handleOpenAnalysisList = () => {
    setShowAnalysisList(true);
  };

  // load user + chats
  useEffect(() => {
    const userEmail = session?.user?.email ?? "";
    const userName = session?.user?.name ?? "";
    if (!userEmail) return;

    const applyBootstrap = (payload: {
      profile: any;
      orders: any[];
      chats: any[];
      analyses: any[];
    }) => {
      const profile = payload.profile || {};
      const userOrders = payload.orders || [];
      const chats = payload.chats || [];
      const analyses = payload.analyses || [];

      setCurrentUser({
        name: profile?.name || userName,
        email: profile?.email || userEmail,
        phone: profile?.phone || "",
        address: profile?.address || "",
        wishlist: profile?.wishlist || [],
        addressBook: profile?.addressBook || [],
      });

      setOrders(userOrders || []);
      setChatSessions(chats || []);

      if (chats?.length) {
        setActiveChatId(chats[0]._id);
        setMessages(chats[0].messages || [initialMessage]);
      }

      setRecentAnalyses(analyses);
    };

    const loadUserData = async () => {
      try {
        const cacheKey = `${BOOTSTRAP_CACHE_PREFIX}:${userEmail.toLowerCase()}`;
        if (typeof window !== "undefined") {
          const raw = window.sessionStorage.getItem(cacheKey);
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              if (
                parsed?.ts &&
                Date.now() - Number(parsed.ts) < BOOTSTRAP_CACHE_TTL_MS
              ) {
                applyBootstrap({
                  profile: parsed.profile,
                  orders: parsed.orders || [],
                  chats: parsed.chats || [],
                  analyses: parsed.analyses || [],
                });
                return;
              }
            } catch {
              // ignore stale/invalid cache
            }
          }
        }

        const [profileRes, ordersRes, chatsRes, analysesRes] =
          await Promise.all([
            fetch(
              `/api/user/get-profile?email=${encodeURIComponent(userEmail)}`
            ),
            fetch(`/api/orders?email=${encodeURIComponent(userEmail)}`),
            fetch(`/api/chats/list?email=${encodeURIComponent(userEmail)}`),
            fetch(
              `/api/tools/list-analyses?email=${encodeURIComponent(userEmail)}`
            ),
          ]);
        let analyses: any[] = [];
        try {
          if (analysesRes?.ok) analyses = await analysesRes.json();
        } catch (e) {
          console.warn("analyses fetch failed:", e);
        }

        if (!profileRes.ok || !ordersRes.ok || !chatsRes.ok) {
          throw new Error("Failed to fetch user data or orders or chats");
        }

        const profile = await profileRes.json();
        const userOrders = await ordersRes.json();
        const chats = await chatsRes.json();

        if (!chats?.length) {
          const res = await fetch("/api/chats/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: userEmail, initialMessage }),
          });
          const newChat = await res.json();
          const payload = {
            profile,
            orders: userOrders || [],
            chats: [newChat],
            analyses,
          };
          applyBootstrap(payload);
          if (typeof window !== "undefined") {
            window.sessionStorage.setItem(
              cacheKey,
              JSON.stringify({ ...payload, ts: Date.now() })
            );
          }
          return;
        }

        const payload = {
          profile,
          orders: userOrders || [],
          chats: chats || [],
          analyses,
        };
        applyBootstrap(payload);
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(
            cacheKey,
            JSON.stringify({ ...payload, ts: Date.now() })
          );
        }
        //alert("User Login successful! Try reconnecting the extension now!");
      } catch (error) {
        console.error("Error loading user data:", error);
      }
    };

    loadUserData();
  }, [session]);

  useEffect(() => {
    if (!cartStorageKey || typeof window === "undefined") {
      setCart((prev) => (prev.length ? [] : prev));
      return;
    }
    const readCart = () => {
      try {
        const raw = window.localStorage.getItem(cartStorageKey);
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
          .map((item) => ({
            ...(item || {}),
            id: deriveCartIdFromProduct(item),
            _id: deriveCartIdFromProduct(item) || undefined,
            name: String(item?.name || "").trim(),
            price: Number(item?.price || 0),
            quantity: Math.max(1, Number(item?.quantity || 1)),
          }))
          .filter((item) => item.name && item.id);
        setCart((prev) => (isSameCart(prev, normalized) ? prev : normalized));
      } catch {
        setCart((prev) => (prev.length ? [] : prev));
      }
    };

    readCart();
    const onStorage = (event: StorageEvent) => {
      if (event.key && event.key !== cartStorageKey) return;
      readCart();
    };
    const onCartSync = () => readCart();
    window.addEventListener("storage", onStorage);
    window.addEventListener(CART_SYNC_EVENT, onCartSync);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(CART_SYNC_EVENT, onCartSync);
    };
  }, [cartStorageKey]);

  useEffect(() => {
    if (!cartStorageKey || typeof window === "undefined") return;
    window.localStorage.setItem(cartStorageKey, JSON.stringify(cart));
    window.dispatchEvent(new Event(CART_SYNC_EVENT));
  }, [cart, cartStorageKey]);

  // select chat
  const handleSelectChat = async (chatId: string) => {
    if (!chatId) return;
    setActiveChatId(chatId);
    const res = await fetch(`/api/chats/get?id=${chatId}`);
    if (!res.ok) return;
    const chat = await res.json();
    setMessages(chat.messages || [initialMessage]);

    if (isMobile) {
      setIsLeftSidebarOpen(false);
    }
  };

  // new chat
  const handleNewChat = async () => {
    const res = await fetch("/api/chats/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: currentUser.email, initialMessage }),
    });
    const chat = await res.json();
    setChatSessions((s) => [chat, ...s]);
    setActiveChatId(chat._id);
    setMessages(chat.messages || [initialMessage]);
    if (isMobile) setIsLeftSidebarOpen(false);
  };

  // delete chat
  const handleDeleteChat = async (chatId: string) => {
    await fetch("/api/chats/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId }),
    });
    setChatSessions((s) => s.filter((c) => c._id !== chatId));
    if (activeChatId === chatId) {
      if (chatSessions.length > 1) {
        const next = chatSessions.find((c: any) => c._id !== chatId);
        if (next) handleSelectChat(next._id);
      } else {
        handleNewChat();
      }
    }
  };

  // send message
  const handleSendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      const userMessage: Message = {
        author: "user",
        text,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        // 1️⃣ Save user message to DB before AI reply
        console.log(
          "the user message is:",
          JSON.stringify({
            chatId: activeChatId,
            message: {
              author: "user",
              text,
              createdAt: new Date().toISOString(),
            },
          })
        );
        await fetch("/api/chats/add-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatId: activeChatId,
            message: {
              author: "user",
              text,
              createdAt: new Date().toISOString(),
            },
          }),
        });

        const res = await fetch("/api/curate-openai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatHistory: [...messages, userMessage],
            chatId: activeChatId,
            userEmail: currentUser.email,
          }),
        });

        if (!res.ok) throw new Error("Rasphia response failed");

        const aiMessage = await res.json();
        setMessages((prev) => [...prev, aiMessage]);
        setChatSessions((prev) =>
          prev.map((chat: any) =>
            chat._id === activeChatId
              ? {
                  ...chat,
                  messages: [...(Array.isArray(chat.messages) ? chat.messages : []), userMessage, aiMessage],
                  updatedAt: new Date().toISOString(),
                }
              : chat
          )
        );
      } catch (err) {
        console.error("Rasphia AI error:", err);
        setMessages((prev) => [
          ...prev,
          {
            author: "ai",
            text: "Hmm, I'm having trouble right now — please try again.",
            createdAt: new Date().toISOString(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, activeChatId, currentUser.email]
  );

  // Integration hooks for AnalysisSidebar
  const handleOpenAnalysis = (type: string) => {
    setAnalysisType(type);
    setIsAnalysisOpen(true);
  };
  const handleAnalysisComplete = (saved: any) => {
    setRecentAnalyses((prev) => [saved, ...prev]);
    setMessages((prev) => [
      ...prev,
      {
        author: "ai",
        text: `Attachment ready.\n\n**${saved.title || saved.type}**\n\nType: ${
          saved.type
        }\nUse "Insert into chat" to inject the optimized prompt.`,
      },
    ]);
  };

  const handleAttachToChat = async (analysisId: string) => {
    const analysis = recentAnalyses.find((a) => a.analysisId === analysisId);
    if (!analysis) {
      console.warn("Analysis not found:", analysisId);
      return;
    }

    const text = `
Here's my saved analysis: **${analysis.title || analysis.type}**
Summary:
${
  analysis.aiResult?.summary || "No summary available."
} find some products for this`.trim();

    /*Optimized prompt for Rasphia:
${analysis.aiResult?.summary || analysis.aiResult?.summary || ""}
  find some products for this`.trim();*/

    setDraft(text);
    //await handleSendMessage(text);
    if (isMobile) setIsRightSidebarOpen(false);
  };

  // Auth handlers
  const handleLogin = () => setIsSignInPopupOpen(true);
  const handleGoogleSignIn = async () => {
    setIsSignInPopupOpen(false);
    await signIn("google", { callbackUrl: "/post-login" });
  };
  const handleLogout = async () => {
    await signOut({ callbackUrl: "/" });
    setMessages([initialMessage]);
    setCheckoutProducts(null);
    setOrders([]);
    setCurrentUser(initialUser);
    setIsProfileVisible(false);
    setCart([]);
  };

  const handleAddToCart = (product: Product) => {
    const inventoryTracked =
      product.isAvailable !== undefined || product.stockQuantity !== undefined;
    if (
      inventoryTracked &&
      (product.isAvailable === false || (product.stockQuantity ?? 0) <= 0)
    ) {
      setMessages((prev) => [
        ...prev,
        {
          author: "ai",
          text: `Sorry, **${product.name}** is currently unavailable.`,
        },
      ]);
      return;
    }

    let added = false;
    setCart((prev) => {
      const cartId = deriveCartIdFromProduct(product);
      const exists = prev.find((p) => p.name === product.name);
      if (exists) return prev;
      added = true;
      return [
        ...prev,
        {
          ...product,
          id: cartId || product.id,
          _id: cartId || product._id || product.id,
          quantity: Math.max(1, Number(product.quantity || 1)),
        },
      ];
    });

    setCartFeedbackPulse(true);
    window.setTimeout(() => setCartFeedbackPulse(false), 420);

    setMessages((prev) => [
      ...prev,
      {
        author: "ai",
        text: added
          ? `Added **${product.name}** to your cart.`
          : `**${product.name}** is already in your cart.`,
      },
    ]);
  };

  const handleRemoveFromCart = (product: Product) => {
    setCart((prev) => prev.filter((p) => p.name !== product.name));
  };

  const handleCheckoutFromCart = () => {
    setCheckoutProducts(cart);
    setIsCartOpen(false);
  };

  // Checkout
  const handleCancelCheckout = () => setCheckoutProducts(null);

  const handlePlaceOrder = async (
    customer: CheckoutCustomer,
    paymentId: string
  ) => {
    if (!checkoutProducts) return;
    try {
      await fetch("/api/orders/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId,
          email: customer.email,
          status: "Processing",
        }),
      });

      const res = await fetch(
        `/api/orders?email=${encodeURIComponent(customer.email)}`
      );
      const updatedOrders = await res.json();
      setOrders(updatedOrders);

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

      setCurrentUser({
        ...currentUser,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        addressBook: nextAddressBook,
      });

      setCheckoutProducts(null);
      setMessages((prev) => [
        ...prev,
        {
          author: "ai",
          text: `Thank you for your purchase of ${checkoutProducts
            .map((p) => p.name)
            .join(", ")}! We'll keep you updated on shipping.`,
        },
      ]);
      setCart([]);
    } catch (err) {
      console.error("Error updating order:", err);
    }
  };

  // Wishlist persistence
  const handleToggleWishlist = async (product: Product) => {
    setCurrentUser((prevUser) => {
      const isInWishlist = prevUser.wishlist.some(
        (item) => item.name === product.name
      );
      const updatedWishlist = isInWishlist
        ? prevUser.wishlist.filter((i) => i.name !== product.name)
        : [...prevUser.wishlist, product];

      fetch("/api/user/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...prevUser, wishlist: updatedWishlist }),
      }).catch(console.error);

      return { ...prevUser, wishlist: updatedWishlist };
    });
  };

  // Profile
  const handleShowProfile = () => setIsProfileVisible(true);
  const handleHideProfile = () => setIsProfileVisible(false);
  // Reviews
  const handleStartReview = (order: Order) => setReviewingOrder(order);
  const handleCloseReview = () => setReviewingOrder(null);
  const handleAddReview = async (
    orderId: string,
    rating: number,
    comment: string,
    imageUrls: string[]
  ) => {
    const orderToReview =
      orders.find(
        (o) => o.id === orderId || String((o as any).orderId || "") === orderId
      ) ||
      (reviewingOrder &&
      (reviewingOrder.id === orderId ||
        String((reviewingOrder as any).orderId || "") === orderId)
        ? reviewingOrder
        : null);
    if (!orderToReview) return;

    try {
      const res = await fetch("/api/reviews/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          productNames: orderToReview.products.map((p) => p.name),
          rating,
          comment,
          imageUrls,
          authorEmail: currentUser.email,
          authorName: currentUser.name,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to submit review");
      }

      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId || String((o as any).orderId || "") === orderId
            ? { ...o, isReviewed: true }
            : o
        )
      );
    } catch (err) {
      console.error("Review error:", err);
      throw err;
    }
  };

  if ((status === "loading" && !authCheckTimedOut) || roleRedirecting)
    return (
      <div className="flex h-screen items-center justify-center bg-brand-cream">
        <div className="flex flex-col items-center gap-4">
          <BrandLogo size={48} />
          <p className="text-sm text-brand-stone">Loading your store...</p>
        </div>
      </div>
    );

  if (!isAuthenticated)
    return (
      <>
        <LandingPage onLogin={handleLogin} />
        <SignInPopup
          isOpen={isSignInPopupOpen}
          onClose={() => setIsSignInPopupOpen(false)}
          onGoogleSignIn={handleGoogleSignIn}
        />
      </>
    );

  if (checkoutProducts)
    return (
      <CheckoutPage
        products={checkoutProducts}
        user={currentUser}
        onPlaceOrder={handlePlaceOrder}
        onCancel={handleCancelCheckout}
      />
    );

  if (isProfileVisible)
    return (
      <>
        <ProfilePage
          user={currentUser}
          cart={cart}
          onBack={handleHideProfile}
          onAddToCart={handleAddToCart}
          onCheckout={handleCheckoutFromCart}
          onToggleWishlist={handleToggleWishlist}
          onStartReview={handleStartReview}
          onRemoveFromCart={handleRemoveFromCart}
        />
        {reviewingOrder && (
          <ReviewModal
            order={reviewingOrder}
            onClose={handleCloseReview}
            onSubmit={handleAddReview}
          />
        )}
      </>
    );

  return (
    <div className="relative h-screen w-full bg-[#F8F4EF] text-brand-charcoal font-body overflow-hidden">
      {/* Glassmorphic ambient background */}
      <div className="absolute inset-0 -z-20 bg-gradient-to-br from-[#FFF4E1] via-[#F8F1EA] to-[#F1E3D3]" />
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-20 right-[-8%] h-[420px] w-[420px] rounded-full bg-brand-sand/35 blur-[120px]" />
        <div className="absolute -top-28 -left-28 h-[420px] w-[420px] rounded-full bg-brand-clay/20 blur-[110px]" />
        <div className="absolute bottom-[-14%] left-1/3 h-[320px] w-[320px] rounded-full bg-brand-sage/15 blur-[90px]" />
      </div>

      <div className="flex h-full w-full p-2 lg:p-3 gap-2 lg:gap-3 relative">
        {/* Mobile overlay */}
        {isLeftSidebarOpen && isMobile && (
          <div
            className="fixed inset-0 bg-brand-warm-black/20 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsLeftSidebarOpen(false)}
          />
        )}

        {/* LEFT SIDEBAR */}
        <div
          className={`${
            isLeftSidebarOpen ? "flex" : "hidden"
          } fixed inset-y-2 left-2 z-50 w-[272px] h-[calc(100%-16px)] flex-col
          lg:static lg:h-full lg:w-[272px]
          rounded-3xl bg-white/58 backdrop-blur-2xl border border-white/70 shadow-[0_18px_44px_rgba(30,22,18,0.14)] lg:shadow-[0_14px_32px_rgba(30,22,18,0.12)] overflow-hidden transition-all duration-300`}
        >
          <ChatSidebar
            userEmail={currentUser.email}
            onSelect={handleSelectChat}
            activeId={activeChatId}
            onNew={handleNewChat}
            onDelete={handleDeleteChat}
          />
        </div>

        {/* CENTER PANEL */}
        <main className="flex-1 flex flex-col min-w-0 relative rounded-3xl bg-white/52 backdrop-blur-2xl border border-white/75 shadow-[0_22px_52px_rgba(30,22,18,0.16)] overflow-hidden">
          {/* App Header */}
          <header className="flex-shrink-0 h-14 px-4 lg:px-5 flex items-center justify-between border-b border-white/70 bg-white/44 backdrop-blur-xl z-10">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
                className={`${iconOnlyButtonClass} hover:bg-brand-parchment text-brand-stone hover:text-brand-charcoal transition-colors`}
                title={isLeftSidebarOpen ? "Close sidebar" : "Open sidebar"}
              >
                {isLeftSidebarOpen ? (
                  <PanelLeftClose className="h-5 w-5" />
                ) : (
                  <PanelLeftOpen className="h-5 w-5" />
                )}
              </button>
              <BrandLogo size={32} className="hidden sm:inline-flex" />
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-brand-charcoal tracking-tight font-heading">
                  Rasphia
                </span>
                <span className="text-[10px] text-brand-stone hidden sm:block">
                  {currentUser.name
                    ? `${currentUser.name}'s store`
                    : "Your personal store"}
                </span>
                <span className="text-[10px] text-brand-terracotta/90 hidden lg:block">
                  We partner with independent makers, local shops, and neighborhood businesses.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <Link
                href="/storefronts"
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-brand-charcoal bg-white border border-brand-sand/60 hover:bg-brand-parchment transition-colors"
              >
                <Store className="h-3 w-3" />
                Explore Stores
              </Link>

              {/* Cart */}
              <button
                onClick={() => setIsCartOpen(true)}
                className={`${iconOnlyButtonClass} relative bg-white border border-brand-sand/50 text-brand-stone shadow-soft hover:shadow-soft-md hover:text-brand-charcoal transition-all ${
                  cartFeedbackPulse
                    ? "scale-105 ring-2 ring-amber-200 shadow-[0_0_0_4px_rgba(251,191,36,0.18)]"
                    : ""
                }`}
                aria-label="View cart"
              >
                <ShoppingCart className="h-[22px] w-[22px]" />
                {cartItemCount > 0 && (
                  <span
                    className={`absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-amber-600 text-white text-[10px] font-semibold flex items-center justify-center ${
                      cartFeedbackPulse ? "scale-110" : ""
                    }`}
                  >
                    {cartItemCount}
                  </span>
                )}
              </button>

              {/* User avatar dropdown */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-xl px-2 py-1.5 bg-white border border-brand-sand/50 shadow-soft hover:bg-brand-parchment/60 hover:border-brand-sand transition-colors"
                >
                  {session?.user?.image ? (
                    <img
                      src={session.user.image}
                      alt={session.user.name ?? "User"}
                      className="h-7 w-7 rounded-full border border-brand-sand/40 object-cover flex-shrink-0"
                    />
                  ) : (
                    <span className="h-7 w-7 rounded-full bg-brand-terracotta/10 text-brand-terracotta text-xs font-semibold flex items-center justify-center flex-shrink-0">
                      {(session?.user?.name?.[0] ?? session?.user?.email?.[0] ?? "?").toUpperCase()}
                    </span>
                  )}
                  <span className="hidden sm:block text-xs font-medium text-brand-charcoal max-w-[100px] truncate">
                    {session?.user?.name?.split(" ")[0] ?? session?.user?.email}
                  </span>
                  <ChevronDown className={`h-3.5 w-3.5 text-brand-stone transition-transform flex-shrink-0 ${userMenuOpen ? "rotate-180" : ""}`} />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white/90 backdrop-blur-xl border border-brand-sand/40 rounded-2xl shadow-[0_16px_40px_rgba(30,22,18,0.18)] py-1 z-50 animate-scale-in">
                    <div className="px-4 py-3 border-b border-brand-sand/30">
                      <p className="text-sm font-semibold text-brand-charcoal truncate">
                        {session?.user?.name ?? "Guest"}
                      </p>
                      <p className="text-xs text-brand-stone truncate mt-0.5">
                        {session?.user?.email}
                      </p>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={() => { setUserMenuOpen(false); handleShowProfile(); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-brand-stone hover:text-brand-charcoal hover:bg-brand-parchment/60 transition-colors text-left"
                      >
                        <User className="h-4 w-4" />
                        My Profile
                      </button>
                      <Link
                        href="/storefronts"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-sm text-brand-stone hover:text-brand-charcoal hover:bg-brand-parchment/60 transition-colors"
                      >
                        <Store className="h-4 w-4" />
                        Explore Stores
                      </Link>
                      <Link
                        href="/merchant/onboarding"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-sm text-brand-stone hover:text-brand-charcoal hover:bg-brand-parchment/60 transition-colors"
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        Become a Merchant
                      </Link>
                    </div>
                    <div className="border-t border-brand-sand/30 py-1">
                      <button
                        onClick={() => { setUserMenuOpen(false); handleLogout(); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-brand-stone hover:text-red-600 hover:bg-red-50/60 transition-colors text-left"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
                className={`${iconOnlyButtonClass} hover:bg-brand-parchment text-brand-stone hover:text-brand-charcoal transition-colors`}
                title={isRightSidebarOpen ? "Close tools" : "Open tools"}
              >
                {isRightSidebarOpen ? (
                  <PanelRightClose className="h-5 w-5" />
                ) : (
                  <PanelRightOpen className="h-5 w-5" />
                )}
              </button>
            </div>
          </header>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col relative overflow-hidden">
            <ChatWindow
              messages={messages}
              isLoading={isLoading}
              onAddToCart={handleAddToCart}
              wishlist={currentUser.wishlist}
              onToggleWishlist={handleToggleWishlist}
              products={products}
            />

            <div className="flex-shrink-0 px-5 pb-5 pt-3 bg-gradient-to-t from-white/90 via-white/70 to-transparent">
              <div className="max-w-3xl mx-auto">
                <ChatInput
                  onSendMessage={handleSendMessage}
                  isLoading={isLoading}
                  value={draft}
                  onChange={setDraft}
                />
                <div className="mt-2.5 text-center">
                  <p className="text-[10px] text-brand-stone/70">
                    Rasphia can make mistakes. Verify product details before purchasing.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Mobile right overlay */}
        {isRightSidebarOpen && isMobile && (
          <div
            className="fixed inset-0 bg-brand-warm-black/20 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsRightSidebarOpen(false)}
          />
        )}

        {/* RIGHT SIDEBAR */}
        <div
          className={`${
            isRightSidebarOpen ? "flex" : "hidden"
          } fixed inset-y-2 right-2 z-50 w-[300px] h-[calc(100%-16px)] flex-col
  xl:static xl:h-full xl:w-[300px]
  rounded-3xl bg-white/58 backdrop-blur-2xl border border-white/70 shadow-[0_18px_44px_rgba(30,22,18,0.14)] xl:shadow-[0_14px_32px_rgba(30,22,18,0.12)] overflow-hidden transition-all duration-300`}
        >
          {/* Persona */}
          <div className="flex-none border-b border-brand-sand/30">
            <PersonaSidebar
              persona={persona}
              onOpenFlow={handleOpenPersonaFlow}
            />
          </div>

          {/* Analysis Tools */}
          <div className="flex-1 overflow-y-auto">
            <AnalysisSidebar
              onOpenAnalysis={handleOpenAnalysis}
              onAttachToChat={handleAttachToChat}
              recentAnalyses={recentAnalyses}
              onOpenAnalysisDetails={handleOpenAnalysisDetails}
              onOpenAnalysisList={handleOpenAnalysisList}
            />
          </div>
        </div>
      </div>

      {reviewingOrder && (
        <ReviewModal
          order={reviewingOrder}
          onClose={handleCloseReview}
          onSubmit={handleAddReview}
        />
      )}
      <AnalysisUploadModal
        isOpen={isAnalysisOpen}
        onClose={() => setIsAnalysisOpen(false)}
        onAnalysisComplete={handleAnalysisComplete}
        userEmail={currentUser.email}
        type={analysisType}
      />
      {analysisDetail && (
        <AnalysisDetailModal
          analysis={analysisDetail}
          onClose={() => setAnalysisDetail(null)}
        />
      )}
      {showAnalysisList && (
        <AnalysisListModal
          analyses={recentAnalyses}
          onClose={() => setShowAnalysisList(false)}
          onOpenAnalysisDetails={handleOpenAnalysisDetails}
        />
      )}
      <CartModal
        isOpen={isCartOpen}
        cart={cart}
        onClose={() => setIsCartOpen(false)}
        onRemoveFromCart={handleRemoveFromCart}
        onCheckout={handleCheckoutFromCart}
      />
      <PersonaFlowModal
        type={personaOpenType}
        isOpen={isPersonaModalOpen}
        onClose={() => setIsPersonaModalOpen(false)}
        onSave={handlePersonaSave}
        userEmail={currentUser.email}
      />
    </div>
  );
};

export default App;
