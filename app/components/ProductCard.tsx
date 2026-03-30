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
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const isInWishlist = wishlist.some((item) => item.name === product.name);
  const isOutOfStock =
    product.isAvailable !== undefined || product.stockQuantity !== undefined
      ? product.isAvailable === false || (product.stockQuantity ?? 0) <= 0
      : false;

  const averageRating = product.reviews?.length
    ? product.reviews.reduce((acc, review) => acc + (review.rating || 0), 0) /
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
        {isOutOfStock && (
          <span className="absolute top-3 left-3 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 border border-red-200">
            Unavailable
          </span>
        )}
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
        {product.merchantSlug && (
          <a
            href={`/storefronts/${product.merchantSlug}`}
            className="mb-2 inline-flex w-fit rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-800 hover:bg-amber-100"
          >
            Visit Storefront
          </a>
        )}

        {product.reviews?.length != undefined &&
          product.reviews?.length > 0 && (
            <div className="flex items-center gap-2 mb-2">
              <StarRatingDisplay rating={averageRating} />
              <span className="text-xs text-stone-500">
                ({product.reviews?.length})
              </span>
            </div>
          )}

        <p className="text-sm text-stone-600 flex-grow mb-4">{product.story}</p>
        <div className="mt-auto flex items-center justify-between">
          <span className="font-bold text-amber-900">
            {formatPrice(product.price as number)}
          </span>
          <button
            onClick={() => onAddToCart(product)}
            disabled={isOutOfStock}
            className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white shadow hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-300"
            style={{ borderRadius: "999px" }}
          >
            {isOutOfStock ? "Out of Stock" : "Add To Cart"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
