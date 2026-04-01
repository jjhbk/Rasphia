import React, { useMemo, useState } from "react";
import type { Product } from "../types";
import StarRatingDisplay from "./StarRatingDisplay";
import { X } from "lucide-react";

type ProductReview = NonNullable<Product["reviews"]>[number];

interface ProductReviewsModalProps {
  productName: string;
  reviews: ProductReview[];
  isOpen: boolean;
  onClose: () => void;
}

const ProductReviewsModal: React.FC<ProductReviewsModalProps> = ({
  productName,
  reviews,
  isOpen,
  onClose,
}) => {
  const [ratingFilter, setRatingFilter] = useState<"all" | "5" | "4" | "3" | "2" | "1">("all");

  const sortedReviews = useMemo(() => {
    const copy = [...reviews];
    copy.sort((a, b) => {
      const aTime = new Date(String(a.date || a.createdAt || "")).getTime() || 0;
      const bTime = new Date(String(b.date || b.createdAt || "")).getTime() || 0;
      return bTime - aTime;
    });
    return copy;
  }, [reviews]);

  const filtered = useMemo(() => {
    if (ratingFilter === "all") return sortedReviews;
    const target = Number(ratingFilter);
    return sortedReviews.filter((r) => Math.round(Number(r.rating || 0)) === target);
  }, [ratingFilter, sortedReviews]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-brand-warm-black/35 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-2xl rounded-3xl border border-brand-sand/40 bg-white p-6 shadow-soft-xl max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-heading text-xl text-brand-charcoal">Reviews</h3>
            <p className="text-sm text-brand-stone">{productName}</p>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-xl border border-brand-sand/50 text-brand-stone hover:bg-brand-parchment flex items-center justify-center"
            aria-label="Close reviews"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4 flex items-center gap-2">
          <label htmlFor="rating-filter" className="text-xs text-brand-stone">
            Filter by rating
          </label>
          <select
            id="rating-filter"
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value as typeof ratingFilter)}
            className="rounded-lg border border-brand-sand/50 bg-white px-2 py-1 text-xs text-brand-charcoal"
          >
            <option value="all">All ratings</option>
            <option value="5">5 stars</option>
            <option value="4">4 stars</option>
            <option value="3">3 stars</option>
            <option value="2">2 stars</option>
            <option value="1">1 star</option>
          </select>
          <span className="ml-auto text-xs text-brand-stone">
            {filtered.length} shown
          </span>
        </div>

        <div className="space-y-3 overflow-y-auto custom-scrollbar pr-1 max-h-[58vh]">
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-brand-sand/50 bg-brand-parchment/30 p-4 text-sm text-brand-stone">
              No reviews found for this filter.
            </div>
          ) : (
            filtered.map((review, index) => {
              const when = String(review.date || review.createdAt || "").trim();
              const reviewDate = when
                ? new Date(when).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : "";
              const images = Array.isArray(review.imageUrls) ? review.imageUrls : [];
              return (
                <div
                  key={`${when || "review"}-${index}`}
                  className="rounded-xl border border-brand-sand/40 bg-white/90 p-3"
                >
                  <div className="flex items-center gap-2">
                    <StarRatingDisplay rating={Number(review.rating || 0)} />
                    <span className="text-xs text-brand-stone">
                      {Number(review.rating || 0).toFixed(1)}
                    </span>
                    <span className="ml-auto text-xs text-brand-stone">
                      {reviewDate}
                    </span>
                  </div>
                  {review.comment ? (
                    <p className="mt-2 text-sm text-brand-charcoal whitespace-pre-wrap">
                      {review.comment}
                    </p>
                  ) : null}
                  {images.length > 0 && (
                    <div className="mt-2 grid grid-cols-4 gap-2">
                      {images.map((url, imageIndex) => (
                        <a
                          key={`${url}-${imageIndex}`}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="block rounded-lg overflow-hidden border border-brand-sand/40"
                        >
                          <img
                            src={url}
                            alt={`Review image ${imageIndex + 1}`}
                            className="h-16 w-full object-cover"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductReviewsModal;

