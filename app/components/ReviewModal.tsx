import React, { useEffect, useMemo, useState } from "react";
import type { Order } from "../types";
import StarIcon from "./icons/StarIcon";
import { ImagePlus, Trash2, X } from "lucide-react";

interface ReviewModalProps {
  order: Order;
  onClose: () => void;
  onSubmit: (
    orderId: string,
    rating: number,
    comment: string,
    imageUrls: string[]
  ) => Promise<void>;
}

const ReviewModal: React.FC<ReviewModalProps> = ({ order, onClose, onSubmit }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const selectedFilePreviews = useMemo(
    () => selectedFiles.map((file) => URL.createObjectURL(file)),
    [selectedFiles]
  );

  useEffect(() => {
    return () => {
      selectedFilePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [selectedFilePreviews]);

  const uploadSelectedFiles = async () => {
    if (!selectedFiles.length) return [];
    setIsUploadingImages(true);
    try {
      const uploaded = await Promise.all(
        selectedFiles.map(async (file) => {
          const form = new FormData();
          form.append("file", file);
          const res = await fetch("/api/reviews/upload", {
            method: "POST",
            body: form,
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok || !data?.url) {
            throw new Error(data?.error || `Failed to upload ${file.name}`);
          }
          return String(data.url);
        })
      );
      return uploaded;
    } finally {
      setIsUploadingImages(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const manualUrls = imageUrlInput
        .split("\n")
        .map((v) => v.trim())
        .filter(Boolean);
      const uploadedUrls = await uploadSelectedFiles();
      const allImageUrls = [...uploadedUrls, ...manualUrls];
      await onSubmit(order.id, rating, comment, allImageUrls);
      onClose();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to submit review.";
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const productNames = (order.products || []).map((p) => p.name).join(", ");
  const activeRating = hoverRating || rating;

  const isBusy = isSubmitting || isUploadingImages;

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
            className="h-10 w-10 flex items-center justify-center rounded-xl border border-brand-sand/40 text-brand-stone hover:bg-brand-parchment transition-colors"
          >
            <X className="h-5 w-5" />
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
            <label className="block text-xs font-medium uppercase tracking-wider text-brand-stone/60 mb-2">
              Upload photos <span className="normal-case text-brand-stone/40">(optional)</span>
            </label>
            <label className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-brand-parchment/40 border border-brand-sand/40 text-sm text-brand-charcoal cursor-pointer hover:bg-brand-parchment/60 transition-colors">
              <ImagePlus className="h-4 w-4" />
              Add images
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (!files.length) return;
                  setSelectedFiles((prev) => [...prev, ...files].slice(0, 6));
                  e.currentTarget.value = "";
                }}
              />
            </label>
            {!!selectedFiles.length && (
              <div className="mt-2 grid grid-cols-3 gap-2">
                {selectedFilePreviews.map((src, index) => (
                  <div
                    key={`${src}-${index}`}
                    className="relative rounded-xl overflow-hidden border border-brand-sand/40 bg-white"
                  >
                    <img
                      src={src}
                      alt={`Review upload ${index + 1}`}
                      className="h-20 w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedFiles((prev) =>
                          prev.filter((_, i) => i !== index)
                        )
                      }
                      className="absolute top-1 right-1 h-6 w-6 rounded-full bg-white/90 border border-brand-sand/40 text-brand-stone hover:text-red-600 flex items-center justify-center"
                      aria-label="Remove image"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Image URLs */}
          <div>
            <label
              htmlFor="review-images"
              className="block text-xs font-medium uppercase tracking-wider text-brand-stone/60 mb-2"
            >
              Photo URLs{" "}
              <span className="normal-case text-brand-stone/40">
                (optional, one per line)
              </span>
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

          {submitError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {submitError}
            </p>
          )}

          <button
            type="submit"
            disabled={rating === 0 || isBusy}
            className="w-full py-3 rounded-xl bg-brand-charcoal text-brand-cream text-sm font-medium hover:bg-brand-warm-black transition-colors shadow-soft disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isBusy ? "Submitting..." : "Submit review"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ReviewModal;
