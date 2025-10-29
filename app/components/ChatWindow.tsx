
import React, { useRef, useEffect } from 'react';
import type { Message as MessageType, Product } from '../types';
import Message from './Message';

interface ChatWindowProps {
  messages: MessageType[];
  isLoading: boolean;
  onInitiateCheckout: (product: Product) => void;
  wishlist: Product[];
  onToggleWishlist: (product: Product) => void;
  products: Product[]; // Add products prop
}

const ChatWindow: React.FC<ChatWindowProps> = ({ messages, isLoading, onInitiateCheckout, wishlist, onToggleWishlist, products }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-6 pr-2">
      {messages.map((msg, index) => (
        <Message 
          key={index} 
          message={msg} 
          onInitiateCheckout={onInitiateCheckout}
          wishlist={wishlist}
          onToggleWishlist={onToggleWishlist}
          products={products} // Pass products down
        />
      ))}
      {isLoading && <Message message={{ author: 'ai', text: '...' }} isLoading={true} onInitiateCheckout={() => {}} wishlist={[]} onToggleWishlist={() => {}} products={[]} />}
    </div>
  );
};

export default ChatWindow;