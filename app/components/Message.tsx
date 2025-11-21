import React, { useEffect, useState } from "react";
import type { Message as MessageType, Product } from "../types";
import ProductCard from "./ProductCard";
import BotIcon from "./icons/BotIcon";
import UserIcon from "./icons/UserIcon";
import ComparisonTable from "./ComparisonTable";

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

const Message: React.FC<MessageProps> = ({
  message,
  isLoading = false,
  onInitiateCheckout,
  wishlist,
  onToggleWishlist,
}) => {
  const isUser = message.author === "user";

  // ----------------------------------------
  // 1️⃣ State to store the fetched products
  // ----------------------------------------
  const [fetchedProducts, setFetchedProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(false);

  // ----------------------------------------
  // 2️⃣ Fetch recommended products dynamically
  // ----------------------------------------
  useEffect(() => {
    async function fetchRecommended() {
      if (!message.products || message.products.length === 0) {
        setFetchedProducts([]);
        return;
      }

      setLoadingProducts(true);

      try {
        // Fetch all products in parallel
        const fetched = await Promise.all(
          message.products.map(async (p) => {
            const res = await fetch(
              `/api/products/getByName?name=${encodeURIComponent(p.name)}`
            );
            const data = await res.json();
            return {
              ...data,
              _id: data._id?.toString?.() ?? data._id,
            } as Product;
          })
        );

        setFetchedProducts(fetched);
      } catch (err) {
        console.error("❌ Failed loading recommended products:", err);
      } finally {
        setLoadingProducts(false);
      }
    }

    fetchRecommended();
  }, [message.products]);

  return (
    <div className={`flex items-start gap-4 ${isUser ? "justify-end" : ""}`}>
      {/* Bot Avatar */}
      {!isUser && (
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800">
          <BotIcon />
        </div>
      )}

      <div
        className={`max-w-md md:max-w-lg lg:max-w-2xl flex flex-col ${
          isUser ? "items-end" : "items-start"
        }`}
      >
        {/* Message Bubble */}
        <div
          className={`px-5 py-4 rounded-[24px] text-sm leading-relaxed ${
            isUser
              ? "bg-gradient-to-br from-[#2C1A13] via-[#3F2B22] to-[#6C4C3C] text-white shadow-lg shadow-black/20"
              : "bg-white/90 text-stone-800 border border-white/70 shadow-[0_10px_30px_rgba(15,15,15,0.08)]"
          }`}
        >
          {isLoading ? (
            <TypingIndicator />
          ) : (
            <p className="whitespace-pre-wrap">{message.text}</p>
          )}
        </div>

        {/* Comparison Table */}
        {message.comparisonTable && (
          <div className="mt-4 w-full rounded-2xl border border-white/60 bg-white/80 p-4 shadow-inner">
            <ComparisonTable tableData={message.comparisonTable} />
          </div>
        )}

        {/* Recommended Products */}
        {fetchedProducts.length > 0 && (
          <div className="mt-4 grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {loadingProducts && (
              <p className="text-sm text-stone-500">Loading products…</p>
            )}

            {fetchedProducts.map((product, index) => (
              <ProductCard
                key={index}
                product={product}
                onInitiateCheckout={onInitiateCheckout}
                wishlist={wishlist}
                onToggleWishlist={onToggleWishlist}
              />
            ))}
          </div>
        )}
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-stone-900/80 text-white">
          <UserIcon />
        </div>
      )}
    </div>
  );
};

export default Message;
