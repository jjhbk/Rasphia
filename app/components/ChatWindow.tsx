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
         behavior: "smooth"
      });
    }
  }, [messages, isLoading]);

  return (
    <div className="flex-1 min-h-0 relative">
      <div 
        ref={scrollRef}
        className="relative flex-1 min-h-0 overflow-y-auto px-4 md:px-10 py-6 scroll-smooth custom-scrollbar h-full"
      >
        <div className="max-w-3xl mx-auto flex flex-col gap-6 pb-32">
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
