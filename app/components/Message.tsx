import React, { useEffect, useState } from "react";
import type { Message as MessageType, Product } from "../types";
import ProductCard from "./ProductCard";
import ComparisonTable from "./ComparisonTable";

interface MessageProps {
  message: MessageType;
  isLoading?: boolean;
  onAddToCart: (product: Product) => void;
  wishlist: Product[];
  onToggleWishlist: (product: Product) => void;
  products: Product[];
}

/* Warm, subtle typing indicator */
const TypingIndicator: React.FC = () => (
  <div className="flex items-center gap-1.5 py-1">
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        className="h-1.5 w-1.5 rounded-full bg-brand-clay/60 animate-bounce"
        style={{ animationDelay: `${i * 0.15}s` }}
      />
    ))}
  </div>
);

/* Rasphia monogram avatar */
const RasphiaAvatar: React.FC = () => (
  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-charcoal">
    <span className="font-heading text-sm text-brand-cream leading-none">R</span>
  </div>
);

/* User initial avatar */
const UserAvatar: React.FC = () => (
  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-sand border border-brand-sand/60">
    <span className="text-brand-stone text-xs font-medium">You</span>
  </div>
);

const Message: React.FC<MessageProps> = ({
  message,
  isLoading = false,
  onAddToCart,
  wishlist,
  onToggleWishlist,
}) => {
  const isUser = message.author === "user";

  const [fetchedProducts, setFetchedProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(false);

  useEffect(() => {
    async function fetchRecommended() {
      if (!message.products || message.products.length === 0) {
        setFetchedProducts([]);
        return;
      }
      setLoadingProducts(true);
      try {
        const fetched = await Promise.all(
          message.products.map(async (p) => {
            const res = await fetch(
              `/api/products/getByName?name=${encodeURIComponent(p.name)}`
            );
            const data = await res.json();
            return { ...data, _id: data._id?.toString?.() ?? data._id } as Product;
          })
        );
        setFetchedProducts(fetched);
      } catch (err) {
        console.error("Failed loading recommended products:", err);
      } finally {
        setLoadingProducts(false);
      }
    }
    fetchRecommended();
  }, [message.products]);

  if (isUser) {
    return (
      <div className="flex items-end justify-end gap-2.5">
        <div className="max-w-[75%] md:max-w-[60%]">
          <div className="px-4 py-3 rounded-2xl rounded-br-sm bg-brand-charcoal text-brand-cream text-sm leading-relaxed shadow-soft">
            <p className="whitespace-pre-wrap">{message.text}</p>
          </div>
        </div>
        <UserAvatar />
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5">
      <RasphiaAvatar />

      <div className="flex-1 min-w-0 flex flex-col gap-3">
        {/* Message bubble */}
        <div className="inline-block max-w-[85%]">
          <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-white border border-brand-sand/40 shadow-soft text-sm leading-relaxed text-brand-charcoal">
            {isLoading ? (
              <TypingIndicator />
            ) : (
              <p className="whitespace-pre-wrap prose-rasphia">{message.text}</p>
            )}
          </div>
        </div>

        {/* Comparison Table */}
        {message.comparisonTable && (
          <div className="rounded-2xl border border-brand-sand/40 bg-white shadow-soft overflow-hidden">
            <ComparisonTable tableData={message.comparisonTable} />
          </div>
        )}

        {/* Recommended Products */}
        {fetchedProducts.length > 0 && (
          <div className="w-full">
            {loadingProducts && (
              <p className="text-xs text-brand-stone/60 mb-3">Finding products…</p>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {fetchedProducts.map((product, index) => (
                <ProductCard
                  key={index}
                  product={product}
                  onAddToCart={onAddToCart}
                  wishlist={wishlist}
                  onToggleWishlist={onToggleWishlist}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Message;
