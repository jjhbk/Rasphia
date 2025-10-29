
import React from 'react';
import type { Message as MessageType, Product } from '../types';
import ProductCard from './ProductCard';
import BotIcon from './icons/BotIcon';
import UserIcon from './icons/UserIcon';
import ComparisonTable from './ComparisonTable';

interface MessageProps {
  message: MessageType;
  isLoading?: boolean;
  onInitiateCheckout: (product: Product) => void;
  wishlist: Product[];
  onToggleWishlist: (product: Product) => void;
  products: Product[];
}

const TypingIndicator: React.FC = () => (
  <div className="flex items-center space-x-1">
    <span className="h-2 w-2 bg-stone-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
    <span className="h-2 w-2 bg-stone-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
    <span className="h-2 w-2 bg-stone-400 rounded-full animate-bounce"></span>
  </div>
);

const Message: React.FC<MessageProps> = ({ message, isLoading = false, onInitiateCheckout, wishlist, onToggleWishlist, products }) => {
  const isUser = message.author === 'user';

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'justify-end' : ''}`}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center">
          <BotIcon />
        </div>
      )}
      <div className={`max-w-md md:max-w-lg lg:max-w-2xl flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`px-4 py-3 rounded-2xl ${
            isUser
              ? 'bg-amber-800 text-white rounded-br-none'
              : 'bg-white text-stone-800 rounded-bl-none border border-stone-200'
          }`}
        >
          {isLoading ? <TypingIndicator /> : <p className="whitespace-pre-wrap">{message.text}</p>}
        </div>

        {message.comparisonTable && (
          <div className="mt-4 w-full">
            <ComparisonTable tableData={message.comparisonTable} />
          </div>
        )}

        {message.products && message.products.length > 0 && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
            {message.products.map((recommendedProduct) => {
              // Find the full product object from the state to get the latest review data
              const fullProduct = products.find(p => p.name === recommendedProduct.name);
              if (!fullProduct) return null;

              return (
                <ProductCard 
                  key={fullProduct.name} 
                  product={fullProduct} 
                  onInitiateCheckout={onInitiateCheckout}
                  wishlist={wishlist}
                  onToggleWishlist={onToggleWishlist}
                />
              )
            })}
          </div>
        )}
      </div>
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-stone-300 text-stone-600 flex items-center justify-center">
          <UserIcon />
        </div>
      )}
    </div>
  );
};

export default Message;