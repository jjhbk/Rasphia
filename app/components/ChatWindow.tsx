import React, { useRef, useEffect } from "react";
import type { Message as MessageType, Product } from "../types";
import Message from "./Message";

interface ChatWindowProps {
  messages: MessageType[];
  isLoading: boolean;
  onAddToCart: (product: Product) => void;
  wishlist: Product[];
  onToggleWishlist: (product: Product) => void;
  products: Product[];
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  isLoading,
  onAddToCart,
  wishlist,
  onToggleWishlist,
  products,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, isLoading]);

  return (
    <div className="flex-1 min-h-0 relative">
      <div
        ref={scrollRef}
        className="h-full overflow-y-auto px-4 md:px-8 py-8 custom-scrollbar"
      >
        <div className="max-w-3xl mx-auto flex flex-col gap-5 pb-6">
          {messages.map((msg, index) => (
            <Message
              key={index}
              message={msg}
              onAddToCart={onAddToCart}
              wishlist={wishlist}
              onToggleWishlist={onToggleWishlist}
              products={products}
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
      </div>
    </div>
  );
};

export default ChatWindow;
