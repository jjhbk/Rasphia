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

import type {
  Message,
  Product,
  Order,
  CheckoutCustomer,
  UserProfile,
  Review,
} from "./types";

import { products as initialProducts } from "./data/products";

const initialMessage: Message = {
  author: "ai",
  text: "Hello, I'm Rasphia. I blend taste with thought to help you find the perfect gift or perfume. Who is this for, and what's the occasion?",
};

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
  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [checkoutProduct, setCheckoutProduct] = useState<Product | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isProfileVisible, setIsProfileVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile>(initialUser);
  const [reviewingOrder, setReviewingOrder] = useState<Order | null>(null);
  const [isSignInPopupOpen, setIsSignInPopupOpen] = useState(false);

  // 🔹 Load user + orders from MongoDB when session is ready
  useEffect(() => {
    const userEmail = session?.user?.email ?? "";
    const userName = session?.user?.name ?? "";

    if (!userEmail) return; // Exit early if no email (user not loaded yet)

    const loadUserData = async () => {
      try {
        const [profileRes, ordersRes] = await Promise.all([
          fetch(`/api/user/get-profile?email=${encodeURIComponent(userEmail)}`),
          fetch(`/api/orders?email=${encodeURIComponent(userEmail)}`),
        ]);

        if (!profileRes.ok || !ordersRes.ok) {
          throw new Error("Failed to fetch user data or orders");
        }

        const profile = await profileRes.json();
        const userOrders = await ordersRes.json();

        // ✅ Always have fallbacks for missing data
        setCurrentUser({
          name: profile?.name || userName,
          email: profile?.email || userEmail,
          phone: profile?.phone || "",
          address: profile?.address || "",
          wishlist: profile?.wishlist || [],
        });

        setOrders(userOrders || []);
      } catch (error) {
        console.error("❌ Error loading user data:", error);
      }
    };

    loadUserData();
  }, [session]);

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
  const handleSendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      // Add user message to chat
      const userMessage: Message = { author: "user", text };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        // Send message to Rasphia’s backend (RAG route)
        const res = await fetch("/api/curate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatHistory: [...messages, userMessage],
          }),
        });

        if (!res.ok) {
          throw new Error(`Rasphia response failed: ${res.statusText}`);
        }

        const aiResponse: Message = await res.json();

        // Add AI response to the chat
        setMessages((prev) => [...prev, aiResponse]);
      } catch (error) {
        console.error("❌ Rasphia AI error:", error);
        setMessages((prev) => [
          ...prev,
          {
            author: "ai",
            text: "Hmm, I’m having a bit of trouble thinking right now. Could you please try again?",
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages]
  );

  // 🟢 Auth handlers
  const handleLogin = () => setIsSignInPopupOpen(true);
  const handleGoogleSignIn = async () => {
    setIsSignInPopupOpen(false);
    await signIn("google");
  };
  const handleLogout = async () => {
    await signOut({ callbackUrl: "/" });
    setMessages([initialMessage]);
    setCheckoutProduct(null);
    setOrders([]);
    setCurrentUser(initialUser);
    setIsProfileVisible(false);
  };

  // 💳 Checkout
  const handleInitiateCheckout = (product: Product) =>
    setCheckoutProduct(product);
  const handleCancelCheckout = () => setCheckoutProduct(null);

  const handlePlaceOrder = async (
    customer: CheckoutCustomer,
    paymentId: string
  ) => {
    if (!checkoutProduct) return;
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

      setCheckoutProduct(null);
      setMessages((prev) => [
        ...prev,
        {
          author: "ai",
          text: `✅ Thank you for your purchase of ${checkoutProduct.name}! We'll keep you updated on shipping.`,
        },
      ]);
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
          productName: orderToReview.product.name,
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

  if (isProfileVisible)
    return (
      <ProfilePage
        user={currentUser}
        onBack={handleHideProfile}
        onInitiateCheckout={handleInitiateCheckout}
        onToggleWishlist={handleToggleWishlist}
        onStartReview={handleStartReview}
      />
    );

  if (checkoutProduct)
    return (
      <CheckoutPage
        product={checkoutProduct}
        user={currentUser}
        onPlaceOrder={handlePlaceOrder}
        onCancel={handleCancelCheckout}
      />
    );

  // 🪶 Default Chat UI
  return (
    <div className="flex flex-col h-screen bg-stone-100 text-stone-800 font-sans">
      <header className="p-4 flex justify-between items-center border-b border-stone-200 bg-white">
        <button
          onClick={handleLogout}
          className="text-sm text-stone-500 hover:text-stone-800 transition-colors"
        >
          Sign Out
        </button>
        <div className="text-center">
          <h1 className="text-2xl font-serif text-amber-900 tracking-wider">
            Rasphia
          </h1>
          <p className="text-sm text-stone-500">
            The Art of Thoughtful Gifting
          </p>
        </div>
        <button
          onClick={handleShowProfile}
          className="text-stone-500 hover:text-stone-800 transition-colors"
          aria-label="View Profile"
        >
          <ProfileIcon />
        </button>
      </header>

      <main className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden">
        <ChatWindow
          messages={messages}
          isLoading={isLoading}
          onInitiateCheckout={handleInitiateCheckout}
          wishlist={currentUser.wishlist}
          onToggleWishlist={handleToggleWishlist}
          products={products}
        />
        <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      </main>

      {reviewingOrder && (
        <ReviewModal
          order={reviewingOrder}
          onClose={handleCloseReview}
          onSubmit={handleAddReview}
        />
      )}
    </div>
  );
};

export default App;
