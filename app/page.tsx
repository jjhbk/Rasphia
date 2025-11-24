"use client";
import React, { useState, useCallback, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import ChatWindow from "./components/ChatWindow";
import ChatInput from "./components/ChatInput";
import LandingPage from "./components/LandingPage";
import CheckoutPage from "./components/CheckoutPage";
import ProfilePage from "./components/ProfilePage";
import ReviewModal from "./components/ReviewModal";
import SignInPopup from "./components/SignInPopup";
import ProfileIcon from "./components/icons/ProfileIcon";
import ChatSidebar from "@/app/components/ChatSidebar";
import AnalysisSidebar from "./components/analysis/AnalysisSidebar";

import type {
  Message,
  Product,
  Order,
  CheckoutCustomer,
  UserProfile,
  Review,
  ChatSession,
} from "./types";
import { products as initialProducts } from "./data/products";
import AnalysisUploadModal from "./components/analysis/AnalysisUploadModal";
import AnalysisDetailModal from "./components/analysis/AnalysisDetailsModal";
import AnalysisListModal from "./components/analysis/AnalysisListModal";
import CartModal from "./components/CartModal";

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
};

const App: React.FC = () => {
  const { data: session, status } = useSession();
  const isAuthenticated = !!session?.user;

  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [chatSessions, setChatSessions] = useState<any[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [checkoutProducts, setCheckoutProducts] = useState<Product[] | null>(
    null
  );

  const [orders, setOrders] = useState<Order[]>([]);
  const [isProfileVisible, setIsProfileVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile>(initialUser);
  const [reviewingOrder, setReviewingOrder] = useState<Order | null>(null);
  const [isSignInPopupOpen, setIsSignInPopupOpen] = useState(false);
  const [recentAnalyses, setRecentAnalyses] = useState<any[]>([]);
  // controlled draft for ChatInput (so AnalysisSidebar can insert text)
  const [draft, setDraft] = useState<string>("");
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [analysisType, setAnalysisType] = useState<string | null>(null);
  const [analyses, setAnalyses] = useState<any[]>([]); // recent analyses
  const [analysisDetail, setAnalysisDetail] = useState(null);
  const [showAnalysisList, setShowAnalysisList] = useState(false);
  const [cart, setCart] = useState<Product[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

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

    const loadUserData = async () => {
      try {
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
        // analyses endpoint might not be present in early dev; guard it
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

        setCurrentUser({
          name: profile?.name || userName,
          email: profile?.email || userEmail,
          phone: profile?.phone || "",
          address: profile?.address || "",
          wishlist: profile?.wishlist || [],
        });

        setOrders(userOrders || []);
        setChatSessions(chats || []);

        if (chats?.length) {
          setActiveChatId(chats[0]._id);
          setMessages(chats[0].messages || [initialMessage]);
        } else {
          // create initial chat if none
          const res = await fetch("/api/chats/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: userEmail, initialMessage }),
          });
          const newChat = await res.json();
          setChatSessions([newChat]);
          setActiveChatId(newChat._id);
          setMessages(newChat.messages || [initialMessage]);
        }
        // set a demo analysis if none found to help dev flow:
        if (!analyses || analyses.length === 0) {
          setRecentAnalyses([
            {
              analysisId: "demo-analysis-1",
              title: "Demo analysis",
              fileUrl: DEMO_IMG_PATH,
              createdAt: new Date().toISOString(),
              prompt: "Demo prompt: show me product suggestions for this item",
              aiResult: {
                text: "Demo analysis: Use this to test insert/paste flow.",
              },
            },
          ]);
        } else {
          setRecentAnalyses(analyses);
        }
      } catch (error) {
        console.error("Error loading user data:", error);
      }
    };

    loadUserData();
  }, [session]);

  // select chat
  const handleSelectChat = async (chatId: string) => {
    if (!chatId) return;
    setActiveChatId(chatId);
    const res = await fetch(`/api/chats/get?id=${chatId}`);
    if (!res.ok) return;
    const chat = await res.json();
    setMessages(chat.messages || [initialMessage]);
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

  // send message: uses your existing /api/curate and also saves message into the chat
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
        // Post to curate with chat context + chatId + userEmail
        const res = await fetch("/api/curate", {
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
        // response contains aiMessage and chatId
        setMessages((prev) => [...prev, aiMessage]);
        // update sessions list (brief)
        const chatsRes = await fetch(
          `/api/chats/list?email=${encodeURIComponent(currentUser.email)}`
        );
        const chats = await chatsRes.json();
        setChatSessions(chats || []);
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

  // 💬 AI chat handler
  // 💬 AI chat handler (streaming enabled)
  const handleSendAgentMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      const userMessage: Message = { author: "user", text };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        const res = await fetch("/api/curate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatHistory: [...messages, userMessage],
          }),
        });

        if (!res.ok || !res.body) throw new Error("Stream failed");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedText = "";
        let aiMessage: Message = { author: "ai", text: "" };

        // Add placeholder message for the AI
        setMessages((prev) => [...prev, aiMessage]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          accumulatedText += chunk;

          // Update last AI message incrementally
          setMessages((prev) => {
            const updated = [...prev];
            const lastIndex = updated.length - 1;
            if (updated[lastIndex]?.author === "ai") {
              updated[lastIndex] = {
                ...updated[lastIndex],
                text: accumulatedText,
              };
            }
            return updated;
          });
        }
      } catch (error) {
        console.error("❌ AI streaming error:", error);
        setMessages((prev) => [
          ...prev,
          {
            author: "ai",
            text: "I'm having trouble connecting right now. Please try again later.",
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages]
  );

  // Integration hooks for AnalysisSidebar
  // Insert a generated prompt into the chat input (controlled)
  const handleInsertPrompt = (prompt: string) => {
    setDraft(prompt);
    // optionally focus the chat input — ChatInput should implement focus via ref if you want it.
  };

  // Open an analysis or open upload modal — here we will open a viewer (simple behavior)
  /*const handleOpenAnalysis = async (idOrTool: string) => {
    // if id is an analysisId, open the analysis viewer (profile)
    if (idOrTool && idOrTool.startsWith("demo-analysis-")) {
      // demo click: open profile view for now
      setIsProfileVisible(true);
      // you can also route to /profile#analysisId
      return;
    }

    // if it's a tool name (skin, hair, similar), open a simple upload modal flow.
    // For now, open the profile to show demo flow. Later we will add a modal.
    setIsProfileVisible(true);
  };*/
  const handleOpenAnalysis = (type: string) => {
    setAnalysisType(type);
    setIsAnalysisOpen(true);
  };
  const handleAnalysisComplete = (saved: any) => {
    // Add to recent list (UI).
    setRecentAnalyses((prev) => [saved, ...prev]);

    // Optionally auto-insert into chat:
    setMessages((prev) => [
      ...prev,
      {
        author: "ai",
        text: `📎 Attached analysis ready.\n\n**${
          saved.title || saved.type
        }**\n\nType: ${
          saved.type
        }\nUse "Insert into chat" to inject the optimized prompt.`,
      },
    ]);
  };

  const handleTriggerAnalysis = (type: string) => {
    setAnalysisType(type);
    setIsAnalysisOpen(true);
  };

  // Attach-to-chat helper when clicking "Attach" in the sidebar viewer (optional)
  const handleAttachToChat = async (analysisId: string) => {
    const analysis = recentAnalyses.find((a) => a.analysisId === analysisId);
    if (!analysis) {
      console.warn("Analysis not found:", analysisId);
      return;
    }

    // Create a user-friendly + vector-search-friendly prompt
    const text = `
Here's my saved analysis: **${analysis.title || analysis.type}**
Summary:
${analysis.aiResult?.summary || "No summary available."}

Optimized prompt for Rasphia:
${analysis.aiResult?.optimizedPrompt || analysis.aiResult?.summary || ""}
  find some products for this`.trim();

    // Insert as a user message
    setMessages((prev) => [...prev, { author: "user", text }]);

    // Auto-send to AI
    await handleSendMessage(text);
  };

  // 🟢 Auth handlers
  const handleLogin = () => setIsSignInPopupOpen(true);
  const handleGoogleSignIn = async () => {
    setIsSignInPopupOpen(false);
    await signIn("google");
  };
  const handleLogout = async () => {
    await signOut({ callbackUrl: "/" });
    setMessages([initialMessage]);
    setCheckoutProducts(null);
    setOrders([]);
    setCurrentUser(initialUser);
    setIsProfileVisible(false);
  };
  const handleAddToCart = (product: Product) => {
    setCart((prev) => {
      const exists = prev.find((p) => p.name === product.name);
      if (exists) return prev;
      return [...prev, product];
    });

    setMessages((prev) => [
      ...prev,
      { author: "ai", text: `🛒 Added **${product.name}** to your cart.` },
    ]);
  };

  const handleRemoveFromCart = (product: Product) => {
    setCart((prev) => prev.filter((p) => p.name !== product.name));
  };

  const handleCheckoutFromCart = () => {
    setCheckoutProducts(cart);
    setIsCartOpen(false);
  };

  // 💳 Checkout
  const handleInitiateCheckout = (product: Product) =>
    setCheckoutProducts(cart);
  const handleCancelCheckout = () => setCheckoutProducts(null);

  const handlePlaceOrder = async (
    customer: CheckoutCustomer,
    paymentId: string
  ) => {
    if (!checkoutProducts) return;
    try {
      // Update MongoDB order record to “Processing”
      await fetch("/api/orders/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId,
          email: customer.email,
          status: "Processing",
        }),
      });

      // Re-fetch orders from DB
      const res = await fetch(
        `/api/orders?email=${encodeURIComponent(customer.email)}`
      );
      const updatedOrders = await res.json();
      setOrders(updatedOrders);

      setCurrentUser({
        ...currentUser,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
      });

      setCheckoutProducts(null);
      setMessages((prev) => [
        ...prev,
        {
          author: "ai",
          text: `✅ Thank you for your purchase of ${checkoutProducts
            .map((p) => p.name)
            .join(", ")}! We'll keep you updated on shipping.`,
        },
      ]);
      setCart([]);
    } catch (err) {
      console.error("Error updating order:", err);
    }
  };

  // 💗 Wishlist persistence
  const handleToggleWishlist = async (product: Product) => {
    setCurrentUser((prevUser) => {
      const isInWishlist = prevUser.wishlist.some(
        (item) => item.name === product.name
      );
      const updatedWishlist = isInWishlist
        ? prevUser.wishlist.filter((i) => i.name !== product.name)
        : [...prevUser.wishlist, product];

      // Persist to DB
      fetch("/api/user/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...prevUser, wishlist: updatedWishlist }),
      }).catch(console.error);

      return { ...prevUser, wishlist: updatedWishlist };
    });
  };

  // 👤 Profile
  const handleShowProfile = () => setIsProfileVisible(true);
  const handleHideProfile = () => setIsProfileVisible(false);
  const handleSaveProfile = async (updatedProfile: UserProfile) => {
    try {
      await fetch("/api/user/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedProfile),
      });
      setCurrentUser(updatedProfile);
      handleHideProfile();
    } catch (err) {
      console.error("Profile save failed:", err);
    }
  };

  // ⭐ Reviews
  const handleStartReview = (order: Order) => setReviewingOrder(order);
  const handleCloseReview = () => setReviewingOrder(null);
  const handleAddReview = async (
    orderId: string,
    rating: number,
    comment: string
  ) => {
    const orderToReview = orders.find((o) => o.id === orderId);
    if (!orderToReview) return;

    try {
      await fetch("/api/reviews/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          productNames: orderToReview.products.map((p) => p.name),
          rating,
          comment,
          authorEmail: currentUser.email,
          authorName: currentUser.name,
        }),
      });

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, isReviewed: true } : o))
      );
    } catch (err) {
      console.error("Review error:", err);
    }

    handleCloseReview();
  };

  // ⏳ Auth state guards
  if (status === "loading")
    return (
      <div className="flex h-screen items-center justify-center text-stone-500">
        Loading...
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
        products={checkoutProducts} // send array
        user={currentUser}
        onPlaceOrder={handlePlaceOrder}
        onCancel={handleCancelCheckout}
      />
    );

  if (isProfileVisible)
    return (
      <ProfilePage
        user={currentUser}
        onBack={handleHideProfile}
        onAddToCart={handleAddToCart}
        cart={cart}
        onToggleWishlist={handleToggleWishlist}
        onCheckout={handleCheckoutFromCart}
        onStartReview={handleStartReview}
        onRemoveFromCart={handleRemoveFromCart}
      />
    );

  // 🪶 Default Chat UI
  return (
    <div className="flex h-screen bg-[#F8F4EF] text-stone-900 overflow-hidden">
      {/* LEFT SIDEBAR */}
      <ChatSidebar
        userEmail={currentUser.email}
        onSelect={handleSelectChat}
        activeId={activeChatId}
        onNew={handleNewChat}
        onDelete={handleDeleteChat}
      />

      {/* RIGHT MAIN CHAT PANEL */}
      <div className="flex-1 h-full overflow-y-auto relative">
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute -top-16 left-10 h-72 w-72 rounded-[45%] 
        bg-gradient-to-br from-[#FBE8D1] via-[#F7CFB8] to-[#F2B9A6] 
        opacity-60 blur-3xl"
          />

          <div
            className="absolute bottom-0 right-0 h-96 w-80 rounded-[60%] 
        bg-gradient-to-br from-[#301B16] via-[#563223] to-[#A16443] 
        opacity-50 blur-[160px]"
          />
        </div>

        <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 md:px-6">
          {/* HEADER */}
          <header
            className="
    sticky top-0 z-40
    flex flex-wrap items-center justify-between gap-4 
    rounded-full border border-white/40 bg-white/70 
    px-5 py-3 shadow-[0_10px_40px_rgba(0,0,0,0.04)] backdrop-blur-lg
  "
          >
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-full 
            border border-stone-200 px-4 py-2 text-sm 
            font-medium text-stone-700 hover:bg-white transition"
            >
              Sign Out
            </button>

            <div className="text-center">
              <p className="text-xs uppercase tracking-[0.5em] text-stone-400">
                Rasphia
              </p>
              <p className="font-serif text-xl text-stone-900">
                Concierge Session
              </p>
            </div>

            <button
              onClick={handleShowProfile}
              className="inline-flex items-center justify-center rounded-full 
            border border-stone-200 bg-white/70 p-2 
            text-stone-500 hover:bg-white transition"
              aria-label="View Profile"
            >
              <ProfileIcon />
            </button>
          </header>
          <main className="mt-6 flex-1 min-h-0 overflow-hidden">
            <div className="relative flex h-full flex-col rounded-[36px] border border-white/50 bg-white/90 p-4 shadow-[0_25px_100px_rgba(0,0,0,0.08)]">
              <div className="pointer-events-none absolute -top-6 right-4 h-40 w-40 rounded-full bg-gradient-to-br from-amber-200 via-rose-100 to-white blur-[70px] opacity-80" />
              <div className="pointer-events-none absolute bottom-[-20px] left-[-10px] h-44 w-44 rounded-full bg-gradient-to-br from-[#2C1A13] via-[#4F2B1E] to-[#8E5637] blur-[90px] opacity-60" />
              <div className="relative flex h-full min-h-0 flex-col rounded-[28px] bg-white/85 p-4 shadow-inner">
                <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-semibold uppercase tracking-[0.4em] text-stone-400">
                  <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-1 text-amber-800">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />{" "}
                    Live concierge
                  </span>
                  <span className="text-stone-500">
                    Signed in as {currentUser.name || session?.user?.name}
                  </span>
                </div>
                <div className="mt-4 flex flex-1 min-h-0 flex-col overflow-hidden rounded-[24px] border border-white/60 bg-white/75 p-4 shadow-lg shadow-white/60">
                  <div className="relative flex flex-1 min-h-0 flex-col overflow-hidden">
                    <ChatWindow
                      messages={messages}
                      isLoading={isLoading}
                      onAddToCart={handleAddToCart}
                      wishlist={currentUser.wishlist}
                      onToggleWishlist={handleToggleWishlist}
                      products={products}
                      cart={cart}
                      setIsCartOpen={setIsCartOpen}
                    />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center px-2 pb-2">
                      <div className="pointer-events-auto w-full max-w-3xl">
                        <ChatInput
                          onSendMessage={handleSendMessage}
                          isLoading={isLoading}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>

          {reviewingOrder && (
            <ReviewModal
              order={reviewingOrder}
              onClose={handleCloseReview}
              onSubmit={handleAddReview}
            />
          )}
        </div>
      </div>
      {/* RIGHT: Analysis Sidebar */}
      <AnalysisSidebar
        onOpenAnalysis={handleOpenAnalysis}
        onAttachToChat={handleAttachToChat}
        recentAnalyses={recentAnalyses}
        onOpenAnalysisDetails={handleOpenAnalysisDetails}
        onOpenAnalysisList={handleOpenAnalysisList}
      />

      <AnalysisUploadModal
        isOpen={isAnalysisOpen}
        onClose={() => setIsAnalysisOpen(false)}
        onAnalysisComplete={(analysis) => {
          setRecentAnalyses((prev) => [analysis, ...prev]); // store new analysis
        }}
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
    </div>
  );
};

export default App;
