import React, { useState } from "react";
import type { Order } from "../types";
import StarIcon from "./icons/StarIcon";
import { X } from "lucide-react";

interface ReviewModalProps {
  order: Order;
  onClose: () => void;
  onSubmit: (
    orderId: string,
    rating: number,
    comment: string,
    imageUrls: string[]
  ) => void;
}

const ReviewModal: React.FC<ReviewModalProps> = ({ order, onClose, onSubmit }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [imageUrlInput, setImageUrlInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;
    const imageUrls = imageUrlInput.split("\n").map((v) => v.trim()).filter(Boolean);
    onSubmit(order.id, rating, comment, imageUrls);
  };

  const productNames = (order.products || []).map((p) => p.name).join(", ");
  const activeRating = hoverRating || rating;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-brand-warm-black/25 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md rounded-3xl bg-white border border-brand-sand/40 shadow-soft-xl p-7"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="font-heading text-2xl text-brand-charcoal">
              Leave a review
            </h2>
            <p className="text-sm text-brand-stone mt-0.5">{productNames}</p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-xl border border-brand-sand/40 text-brand-stone hover:bg-brand-parchment transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Star rating */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-brand-stone/60 mb-3">
              Rating
            </label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-110"
                >
                  <StarIcon
                    className={`w-8 h-8 transition-colors ${
                      activeRating >= star
                        ? "text-brand-mustard"
                        : "text-brand-sand"
                    }`}
                    filled={activeRating >= star}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Comment */}
          <div>
            <label
              htmlFor="review-comment"
              className="block text-xs font-medium uppercase tracking-wider text-brand-stone/60 mb-2"
            >
              Your experience
            </label>
            <textarea
              id="review-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="What did you love? What could be better?"
              className="w-full px-4 py-3 rounded-xl bg-brand-parchment/50 border border-brand-sand/40 text-sm text-brand-charcoal placeholder-brand-stone/40 focus:outline-none focus:border-brand-terracotta/40 focus:ring-2 focus:ring-brand-terracotta/10 resize-none"
            />
          </div>

          {/* Image URLs */}
          <div>
            <label
              htmlFor="review-images"
              className="block text-xs font-medium uppercase tracking-wider text-brand-stone/60 mb-2"
            >
              Photo URLs <span className="normal-case text-brand-stone/40">(optional, one per line)</span>
            </label>
            <textarea
              id="review-images"
              value={imageUrlInput}
              onChange={(e) => setImageUrlInput(e.target.value)}
              rows={2}
              placeholder="https://..."
              className="w-full px-4 py-3 rounded-xl bg-brand-parchment/50 border border-brand-sand/40 text-sm text-brand-charcoal placeholder-brand-stone/40 focus:outline-none focus:border-brand-terracotta/40 focus:ring-2 focus:ring-brand-terracotta/10 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={rating === 0}
            className="w-full py-3 rounded-xl bg-brand-charcoal text-brand-cream text-sm font-medium hover:bg-brand-warm-black transition-colors shadow-soft disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Submit review
          </button>
        </form>
      </div>
    </div>
  );
};

export default ReviewModal;
