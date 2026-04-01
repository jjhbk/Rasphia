import React, { useEffect, useMemo, useState } from "react";
import type { Product } from "../types";
import HeartIcon from "./icons/HeartIcon";
import StarRatingDisplay from "./StarRatingDisplay";
import ProductReviewsModal from "./ProductReviewsModal";

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
  const [reviews, setReviews] = useState(product.reviews || []);
  const [isReviewsOpen, setIsReviewsOpen] = useState(false);

  const reviewCacheKey = useMemo(() => {
    const id = String(product.id || product._id || "").trim();
    if (id) return `id:${id}`;
    const name = String(product.name || "").trim().toLowerCase();
    return name ? `name:${name}` : "";
  }, [product.id, product._id, product.name]);

  useEffect(() => {
    if (Array.isArray(product.reviews) && product.reviews.length > 0) {
      setReviews(product.reviews);
      if (reviewCacheKey) {
        reviewCache.set(reviewCacheKey, product.reviews);
      }
      return;
    }
    if (!reviewCacheKey) return;
    const cached = reviewCache.get(reviewCacheKey);
    if (cached) {
      setReviews(cached);
      return;
    }

    let isCancelled = false;
    const loadReviews = async () => {
      const productId = String(product.id || product._id || "").trim();
      const productName = String(product.name || "").trim();
      const query = productId
        ? `productId=${encodeURIComponent(productId)}`
        : `productName=${encodeURIComponent(productName)}`;
      if (!query) return;
      try {
        const res = await fetch(`/api/reviews/list?${query}`);
        if (!res.ok) return;
        const data = await res.json();
        const normalized = Array.isArray(data)
          ? data.map((row: any) => ({
              rating: Number(row?.rating || 0),
              comment: row?.comment || "",
              user: row?.userEmail || row?.user_email || "",
              userEmail: row?.userEmail || row?.user_email || "",
              authorName: row?.authorName || "",
              date: row?.createdAt || row?.created_at || "",
              createdAt: row?.createdAt || row?.created_at || "",
              imageUrls: Array.isArray(row?.imageUrls)
                ? row.imageUrls
                : Array.isArray(row?.image_urls)
                ? row.image_urls
                : [],
            }))
          : [];
        if (!isCancelled) {
          setReviews(normalized);
          reviewCache.set(reviewCacheKey, normalized);
        }
      } catch {
        // ignore review fetch failures for card rendering
      }
    };
    loadReviews();

    return () => {
      isCancelled = true;
    };
  }, [product.reviews, product.id, product._id, product.name, reviewCacheKey]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const isInWishlist = wishlist.some((item) => item.name === product.name);

  const averageRating = reviews?.length
    ? reviews.reduce((acc, r) => acc + (r.rating || 0), 0) /
      reviews.length
    : 0;
  return (
    <>
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

          <button
            type="button"
            onClick={() => setIsReviewsOpen(true)}
            className="flex items-center gap-2 mb-2 text-left hover:opacity-85 transition-opacity"
            aria-label={`View ${reviews.length} reviews for ${product.name}`}
          >
            <StarRatingDisplay rating={averageRating} />
            <span className="text-xs text-stone-500">
              {averageRating.toFixed(1)} ({reviews.length} review
              {reviews.length === 1 ? "" : "s"})
            </span>
          </button>

          <p className="text-sm text-stone-600 flex-grow mb-4">{product.story}</p>
          <div className="mt-auto flex items-center justify-between">
            <span className="font-bold text-amber-900">
              {formatPrice(product.price as number)}
            </span>
            <button
              onClick={() => onAddToCart(product)}
              className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white shadow hover:bg-stone-800"
              style={{ borderRadius: "999px" }}
            >
              Add To Cart
            </button>
          </div>
        </div>
      </div>
      <ProductReviewsModal
        productName={product.name}
        reviews={reviews}
        isOpen={isReviewsOpen}
        onClose={() => setIsReviewsOpen(false)}
      />
    </>
  );
};

export default ProductCard;

const reviewCache = new Map<string, NonNullable<Product["reviews"]>>();
