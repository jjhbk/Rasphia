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

import { addOrder } from "./data/orders";
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

  // Update user info when session is available
  useEffect(() => {
    if (session?.user) {
      setCurrentUser((prev) => ({
        ...prev,
        name: session.user.name || "",
        email: session.user.email || "",
      }));
    }
  }, [session]);

  // AI chat logic
  const handleSendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      const userMessage: Message = { author: "user", text };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        const response = await fetch("/api/curate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatHistory: [...messages, userMessage],
            products,
          }),
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`);
        }

        const aiResponse: Message = await response.json();
        setMessages((prev) => [...prev, aiResponse]);
      } catch (error) {
        console.error("Error fetching AI response:", error);
        const errorMessage: Message = {
          author: "ai",
          text: "I’m sorry — I’m having a bit of trouble connecting right now. Could you please try again in a moment?",
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, products]
  );

  // Google login + popup
  const handleLogin = async () => {
    setIsSignInPopupOpen(true);
  };

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
    setProducts(initialProducts);
  };

  // Checkout and profile handlers
  const handleInitiateCheckout = (product: Product) =>
    setCheckoutProduct(product);
  const handleCancelCheckout = () => setCheckoutProduct(null);

  const handlePlaceOrder = (customer: CheckoutCustomer, paymentId: string) => {
    if (!checkoutProduct) return;
    const newOrder: Order = {
      id: `ORD-${Date.now()}`,
      customer,
      product: checkoutProduct,
      paymentId,
      date: new Date().toISOString(),
      status: "Processing",
      isReviewed: false,
    };

    addOrder(newOrder);
    setOrders((prev) => [...prev, newOrder]);

    // Simulate shipment and delivery
    setTimeout(() => {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === newOrder.id
            ? {
                ...o,
                status: "Shipped",
                trackingNumber: `RS${Math.floor(
                  100000000 + Math.random() * 900000000
                )}`,
              }
            : o
        )
      );
    }, 5000);

    setTimeout(() => {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === newOrder.id ? { ...o, status: "Delivered" } : o
        )
      );
    }, 12000);

    setCurrentUser((prev) => ({
      ...prev,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
    }));

    setCheckoutProduct(null);

    const confirmationMessage: Message = {
      author: "ai",
      text: `Thank you for your purchase of ${checkoutProduct.name}! Your order ID is ${newOrder.id}. We'll notify you once it ships. You can track its status in your profile.`,
    };
    setMessages((prev) => [...prev, confirmationMessage]);
  };

  const handleToggleWishlist = (product: Product) => {
    setCurrentUser((prevUser) => {
      const isInWishlist = prevUser.wishlist.some(
        (item) => item.name === product.name
      );
      if (isInWishlist) {
        return {
          ...prevUser,
          wishlist: prevUser.wishlist.filter((i) => i.name !== product.name),
        };
      } else {
        return { ...prevUser, wishlist: [...prevUser.wishlist, product] };
      }
    });
  };

  const handleShowProfile = () => setIsProfileVisible(true);
  const handleHideProfile = () => setIsProfileVisible(false);
  const handleSaveProfile = (updatedProfile: UserProfile) => {
    setCurrentUser(updatedProfile);
    handleHideProfile();
  };

  const handleStartReview = (order: Order) => setReviewingOrder(order);
  const handleCloseReview = () => setReviewingOrder(null);

  const handleAddReview = (
    orderId: string,
    rating: number,
    comment: string
  ) => {
    const orderToReview = orders.find((o) => o.id === orderId);
    if (!orderToReview) return;

    const newReview: Review = {
      authorName: currentUser.name || "Anonymous",
      rating,
      comment,
      date: new Date().toISOString(),
    };

    setProducts((prev) =>
      prev.map((p) =>
        p.name === orderToReview.product.name
          ? { ...p, reviews: [...p.reviews, newReview] }
          : p
      )
    );

    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, isReviewed: true } : o))
    );

    handleCloseReview();
  };

  // Render login page if not signed in
  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center text-stone-500">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
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
  }

  if (isProfileVisible) {
    return (
      <ProfilePage
        user={currentUser}
        orders={orders}
        onSave={handleSaveProfile}
        onBack={handleHideProfile}
        onInitiateCheckout={handleInitiateCheckout}
        onToggleWishlist={handleToggleWishlist}
        onStartReview={handleStartReview}
      />
    );
  }

  if (checkoutProduct) {
    return (
      <CheckoutPage
        product={checkoutProduct}
        user={currentUser}
        onPlaceOrder={handlePlaceOrder}
        onCancel={handleCancelCheckout}
      />
    );
  }

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
