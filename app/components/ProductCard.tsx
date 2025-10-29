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
    <div className="bg-white border border-stone-200 rounded-lg overflow-hidden shadow-sm transition-shadow hover:shadow-md flex flex-col group">
      <div className="relative">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-48 object-cover"
        />
        <button
          onClick={() => onToggleWishlist(product)}
          className="absolute top-2 right-2 bg-white/70 backdrop-blur-sm p-2 rounded-full text-stone-600 hover:text-red-500 transition-colors"
          aria-label={isInWishlist ? "Remove from wishlist" : "Add to wishlist"}
        >
          <HeartIcon filled={isInWishlist} />
        </button>
      </div>
      <div className="p-4 flex flex-col flex-grow">
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
        <div className="flex justify-between items-center mt-auto">
          <span className="font-bold text-amber-900">
            {formatPrice(product.price)}
          </span>
          <button
            onClick={() => onInitiateCheckout(product)}
            className="px-4 py-2 bg-stone-800 text-white text-sm font-medium rounded-md hover:bg-stone-900 transition-colors"
          >
            Buy Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
