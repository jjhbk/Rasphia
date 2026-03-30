import React from "react";
import type { Product } from "../types";
import HeartIcon from "./icons/HeartIcon";
import StarRatingDisplay from "./StarRatingDisplay";

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  wishlist: Product[];
  onToggleWishlist: (product: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart,
  wishlist,
  onToggleWishlist,
}) => {
  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(price);

  const isInWishlist = wishlist.some((item) => item.name === product.name);

  const averageRating = product.reviews?.length
    ? product.reviews.reduce((acc, r) => acc + (r.rating || 0), 0) /
      product.reviews.length
    : 0;

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl bg-white border border-brand-sand/40 shadow-soft transition-all hover:shadow-soft-md hover:-translate-y-0.5">
      {/* Image */}
      <div className="relative overflow-hidden">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="h-44 w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        {/* Wishlist button */}
        <button
          onClick={() => onToggleWishlist(product)}
          className={`absolute top-3 right-3 h-8 w-8 flex items-center justify-center rounded-full backdrop-blur-sm border transition-all ${
            isInWishlist
              ? "bg-brand-coral border-brand-coral text-white"
              : "bg-white/80 border-brand-sand/40 text-brand-stone hover:border-brand-coral hover:text-brand-coral"
          }`}
          aria-label={isInWishlist ? "Remove from wishlist" : "Save"}
        >
          <HeartIcon filled={isInWishlist} />
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4 gap-2">
        <div>
          <h3 className="text-sm font-semibold text-brand-charcoal leading-snug">
            {product.name}
          </h3>
          <p className="text-xs text-brand-stone mt-0.5">{product.brand}</p>
        </div>

        {product.reviews?.length ? (
          <div className="flex items-center gap-1.5">
            <StarRatingDisplay rating={averageRating} />
            <span className="text-[10px] text-brand-stone/70">
              ({product.reviews.length})
            </span>
          </div>
        ) : null}

        <p className="text-xs text-brand-stone/80 leading-relaxed line-clamp-2 flex-1">
          {product.story}
        </p>

        <div className="mt-auto flex items-center justify-between pt-3 border-t border-brand-sand/30">
          <span className="text-sm font-semibold text-brand-charcoal">
            {formatPrice(product.price as number)}
          </span>
          <button
            onClick={() => onAddToCart(product)}
            className="rounded-xl bg-brand-charcoal px-3.5 py-1.5 text-xs font-medium text-brand-cream hover:bg-brand-warm-black transition-colors shadow-soft"
          >
            Add to cart
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
