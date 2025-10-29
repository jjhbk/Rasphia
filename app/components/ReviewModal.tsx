import React, { useState } from "react";
import type { Order } from "../types";
import StarIcon from "./icons/StarIcon";

interface ReviewModalProps {
  order: Order;
  onClose: () => void;
  onSubmit: (orderId: string, rating: number, comment: string) => void;
}

const ReviewModal: React.FC<ReviewModalProps> = ({
  order,
  onClose,
  onSubmit,
}) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      alert("Please select a star rating.");
      return;
    }
    onSubmit(order.id, rating, comment);
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-2xl w-full max-w-md p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-serif text-amber-900">
              Leave a Review
            </h2>
            <p className="text-stone-600">for {order.product.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 transition-colors"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-medium text-stone-600 mb-2">
              Your Rating
            </label>
            <div className="flex items-center space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="text-yellow-400 focus:outline-none"
                  aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                >
                  <StarIcon
                    className="w-8 h-8 transition-colors"
                    filled={(hoverRating || rating) >= star}
                  />
                </button>
              ))}
            </div>
          </div>
          <div className="mb-6">
            <label
              htmlFor="comment"
              className="block text-sm font-medium text-stone-600 mb-2"
            >
              Your Review
            </label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              placeholder="What did you like or dislike? How did you use this product?"
              className="w-full p-3 bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-3 bg-stone-800 text-white font-medium rounded-md hover:bg-stone-900 transition-colors disabled:bg-stone-400"
              disabled={rating === 0}
            >
              Submit Review
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReviewModal;
