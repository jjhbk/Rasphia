import React, { useRef, useEffect, useState } from "react";
import type { Message as MessageType, Product } from "../types";
import Message from "./Message";

interface ChatWindowProps {
  messages: MessageType[];
  isLoading: boolean;
  onAddToCart: (product: Product) => void;
  wishlist: Product[];
  onToggleWishlist: (product: Product) => void;
  products: Product[]; // Add products prop
  cart: Product[];
  setIsCartOpen: (open: boolean) => void; // ← ADD THIS
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  isLoading,
  onAddToCart,
  wishlist,
  onToggleWishlist,
  products,

  cart,
  setIsCartOpen,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollButtons, setShowScrollButtons] = useState(true);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  const scrollToTop = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 20;
      const atTop = el.scrollTop <= 20;

      // show only if not at top or bottom
      setShowScrollButtons(!(atBottom && atTop));
    };

    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="flex-1 min-h-0 relative">
      <div
        ref={scrollRef}
        className="relative flex-1 min-h-0 overflow-y-auto space-y-6 pr-2 pb-32"
      >
        {/* ⭐ FLOATING CART BUTTON ⭐ */}
        <button
          onClick={() => setIsCartOpen(true)}
          className="
        fixed z-50
        right-130 bottom-80
        h-20 w-20
        flex items-center justify-center
        rounded-full bg-white text-4xl
        border border-stone-300 shadow-2xl
        backdrop-blur-xl hover:bg-stone-100 transition
      "
        >
          🛒
          {cart.length > 0 && (
            <span
              className="
            absolute -top-1 -right-1
            bg-red-600 text-white text-sm
            w-7 h-7 flex items-center justify-center
            rounded-full shadow-md
          "
            >
              {cart.length}
            </span>
          )}
        </button>{" "}
        {messages.map((msg, index) => (
          <Message
            key={index}
            message={msg}
            onAddToCart={onAddToCart}
            wishlist={wishlist}
            onToggleWishlist={onToggleWishlist}
            products={products} // Pass products down
          />
        ))}
        {isLoading && (
          <Message
            message={{ author: "ai", text: "..." }}
            isLoading={true}
            onAddToCart={() => {}}
            wishlist={[]}
            onToggleWishlist={() => {}}
            products={[]}
          />
        )}
      </div>
      {true && (
        <div className="pointer-events-auto fixed right-6 bottom-28 flex flex-col gap-3">
          {/* Scroll to top */}
          <button
            onClick={scrollToTop}
            className="h-10 w-10 flex items-center justify-center rounded-full 
      bg-white/80 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.15)]
      hover:bg-white transition"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-stone-700"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 15l7-7 7 7"
              />
            </svg>
          </button>

          {/* Scroll to bottom */}
          <button
            onClick={scrollToBottom}
            className="h-10 w-10 flex items-center justify-center rounded-full 
      bg-white/80 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.15)]
      hover:bg-white transition"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-stone-700"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatWindow;
