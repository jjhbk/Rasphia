"use client";
import React, { useState, useCallback, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import {
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  ShoppingCart,
} from "lucide-react";
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
import AnalysisUploadModal from "./components/analysis/AnalysisUploadModal";
import AnalysisDetailModal from "./components/analysis/AnalysisDetailsModal";
import AnalysisListModal from "./components/analysis/AnalysisListModal";
import CartModal from "./components/CartModal";

import type {
  Message,
  Product,
  Order,
  CheckoutCustomer,
  UserProfile,
} from "./types";
import { products as initialProducts } from "./data/products";

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
        setMessages((prev) => [...prev, aiMessage]);
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
      { author: "ai", text: `Added **${product.name}** to your cart.` },
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
        products={checkoutProducts}
        user={currentUser}
        onPlaceOrder={handlePlaceOrder}
        onCancel={handleCancelCheckout}
      />
    );

  if (isProfileVisible)
    return (
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
    );

  return (
    <div className="relative h-screen w-full bg-[#F8F4EF] text-stone-900 font-sans overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#FFF4E1] via-[#F8F1EA] to-[#F1E3D3] -z-20" />
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-20 -left-20 h-96 w-96 rounded-full bg-[#F8DCC0] opacity-40 blur-3xl" />
        <div className="absolute top-1/2 right-0 h-[500px] w-[500px] rounded-full bg-[#F0B9A3] opacity-30 blur-[100px]" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-[#E5D0C5] opacity-40 blur-3xl" />
      </div>

      <div className="flex h-full w-full p-2 lg:p-4 gap-2 lg:gap-4 relative">
        {isLeftSidebarOpen && isMobile && (
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsLeftSidebarOpen(false)}
          />
        )}

        <div
          className={`${
            isLeftSidebarOpen ? "flex" : "hidden"
          } fixed inset-y-2 left-2 z-50 w-[280px] h-[calc(100%-16px)] flex-col
          lg:static lg:h-full lg:w-[280px]
          rounded-[32px] bg-white/60 backdrop-blur-xl border border-white/50 shadow-2xl lg:shadow-[0_8px_32px_rgba(0,0,0,0.04)] overflow-hidden transition-all duration-300`}
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
        <main className="flex-1 flex flex-col min-w-0 relative rounded-[32px] bg-white/80 backdrop-blur-xl border border-white/60 shadow-[0_20px_40px_rgba(0,0,0,0.06)] overflow-hidden">
          <header className="flex-shrink-0 h-16 px-4 lg:px-6 flex items-center justify-between border-b border-stone-100/50 bg-white/50 backdrop-blur-md z-10">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
                className="p-2 rounded-full hover:bg-stone-200/50 text-stone-500 hover:text-stone-800 transition-colors"
                title={isLeftSidebarOpen ? "Close sidebar" : "Open sidebar"}
              >
                {isLeftSidebarOpen ? (
                  <PanelLeftClose className="h-5 w-5" />
                ) : (
                  <PanelLeftOpen className="h-5 w-5" />
                )}
              </button>
              <div className="hidden sm:flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-600 to-amber-700 text-white text-sm font-serif font-bold shadow-md shadow-amber-200">
                R
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-stone-900 tracking-tight">
                  Rasphia <span className="hidden sm:inline">Concierge</span>
                </span>
                <span className="text-[10px] uppercase tracking-wider text-stone-500 font-medium hidden sm:block">
                  {currentUser.name
                    ? `Session for ${currentUser.name}`
                    : "Guest Session"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={() => setIsCartOpen(true)}
                className="h-10 w-10 relative flex items-center justify-center rounded-full bg-white border border-stone-200 text-stone-700 shadow-sm hover:scale-105 transition-all"
                aria-label="View cart"
              >
                <ShoppingCart className="h-5 w-5" />
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-5 px-1 rounded-full bg-amber-600 text-white text-[10px] font-semibold flex items-center justify-center">
                    {cart.length}
                  </span>
                )}
              </button>
              <button
                onClick={handleLogout}
                className="hidden sm:block px-4 py-1.5 rounded-full text-xs font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-900 transition-colors"
              >
                Sign out
              </button>
              <button
                onClick={handleShowProfile}
                className="h-10 w-10 flex items-center justify-center rounded-full bg-white border border-stone-200 text-stone-700 shadow-sm hover:scale-105 transition-all"
              >
                <ProfileIcon />
              </button>
              <button
                onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
                className="p-2 ml-0 sm:ml-1 rounded-full hover:bg-stone-200/50 text-stone-500 hover:text-stone-800 transition-colors"
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

          <div className="flex-1 flex flex-col relative overflow-hidden">
            <ChatWindow
              messages={messages}
              isLoading={isLoading}
              onAddToCart={handleAddToCart}
              wishlist={currentUser.wishlist}
              onToggleWishlist={handleToggleWishlist}
              products={products}
            />

            <div className="flex-shrink-0 px-6 pb-6 pt-4 bg-gradient-to-t from-white via-white/80 to-transparent">
              <div className="max-w-3xl mx-auto">
                <ChatInput
                  onSendMessage={handleSendMessage}
                  isLoading={isLoading}
                  value={draft}
                  onChange={setDraft}
                />
                <div className="mt-3 text-center">
                  <p className="text-[10px] text-stone-400 font-medium">
                    Rasphia AI can make mistakes. Please verify product details.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>

        {isRightSidebarOpen && isMobile && (
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsRightSidebarOpen(false)}
          />
        )}

        <div
          className={`${
            isRightSidebarOpen ? "flex" : "hidden"
          } fixed inset-y-2 right-2 z-50 w-[320px] h-[calc(100%-16px)] flex-col
          xl:static xl:h-full xl:w-[320px]
          rounded-[32px] bg-white/60 backdrop-blur-xl border border-white/50 shadow-2xl xl:shadow-[0_8px_32px_rgba(0,0,0,0.04)] overflow-hidden transition-all duration-300`}
        >
          <AnalysisSidebar
            onOpenAnalysis={handleOpenAnalysis}
            onAttachToChat={handleAttachToChat}
            recentAnalyses={recentAnalyses}
            onOpenAnalysisDetails={handleOpenAnalysisDetails}
            onOpenAnalysisList={handleOpenAnalysisList}
          />
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
    </div>
  );
};

export default App;
