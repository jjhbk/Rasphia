import React from "react";
import type { Product } from "../types";
import HeartIcon from "./icons/HeartIcon";
import StarRatingDisplay from "./StarRatingDisplay";

interface ProductCardProps {
  product: Product;
  onInitiateCheckout: (product: Product) => void;
  wishlist: Product[];
  onToggleWishlist: (product: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onInitiateCheckout,
  wishlist,
  onToggleWishlist,
}) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const isInWishlist = wishlist.some((item) => item.name === product.name);

  const averageRating =
    product.reviews.length > 0
      ? product.reviews.reduce((acc, review) => acc + review.rating, 0) /
        product.reviews.length
      : 0;

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/90 shadow-lg shadow-stone-200/70 transition hover:-translate-y-1">
      <div className="relative">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="h-48 w-full object-cover"
        />
        <button
          onClick={() => onToggleWishlist(product)}
          className="absolute top-3 right-3 rounded-full bg-white/80 p-2 text-stone-600 backdrop-blur-sm transition hover:text-red-500"
          aria-label={isInWishlist ? "Remove from wishlist" : "Add to wishlist"}
        >
          <HeartIcon filled={isInWishlist} />
        </button>
      </div>
      <div className="flex flex-grow flex-col p-4">
        <h3 className="font-semibold text-stone-800">{product.name}</h3>
        <p className="text-sm text-stone-500 mb-2">{product.brand}</p>

        {product.reviews.length > 0 && (
          <div className="flex items-center gap-2 mb-2">
            <StarRatingDisplay rating={averageRating} />
            <span className="text-xs text-stone-500">
              ({product.reviews.length})
            </span>
          </div>
        )}

        <p className="text-sm text-stone-600 flex-grow mb-4">{product.story}</p>
        <div className="mt-auto flex items-center justify-between">
          <span className="font-bold text-amber-900">
            {formatPrice(product.price)}
          </span>
          <button
            onClick={() => onInitiateCheckout(product)}
            className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white shadow hover:bg-stone-800"
            style={{ borderRadius: "999px" }}
          >
            Buy Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
