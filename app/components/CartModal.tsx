"use client";

import React from "react";
import { X, ShoppingBag, ArrowRight } from "lucide-react";
import type { Product } from "../types";

interface CartModalProps {
  isOpen: boolean;
  cart: Product[];
  onClose: () => void;
  onRemoveFromCart: (product: Product) => void;
  onCheckout: (product: Product) => void;
}

const CartModal: React.FC<CartModalProps> = ({
  isOpen,
  cart,
  onClose,
  onRemoveFromCart,
  onCheckout,
}) => {
  if (!isOpen) return null;

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(price);

  const total = cart.reduce((sum, item) => sum + ((item.price as number) || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-brand-warm-black/25 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md rounded-3xl bg-white border border-brand-sand/40 shadow-soft-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-sand/30">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-brand-terracotta" />
            <h2 className="text-sm font-semibold text-brand-charcoal">
              Your cart
            </h2>
            {cart.length > 0 && (
              <span className="text-xs text-brand-stone/60">
                · {cart.length} {cart.length === 1 ? "item" : "items"}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="h-10 w-10 flex items-center justify-center rounded-xl border border-brand-sand/40 text-brand-stone hover:bg-brand-parchment transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <ShoppingBag className="h-10 w-10 text-brand-sand mx-auto mb-3" />
            <p className="text-sm text-brand-stone">Nothing here yet.</p>
            <p className="text-xs text-brand-stone/60 mt-1">
              Ask Rasphia to find something you'll love.
            </p>
          </div>
        ) : (
          <>
            <div className="max-h-64 overflow-y-auto custom-scrollbar">
              {cart.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center gap-4 px-6 py-4 border-b border-brand-sand/20 last:border-0"
                >
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-14 w-14 rounded-xl object-cover flex-shrink-0 border border-brand-sand/30"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-brand-charcoal truncate">
                      {item.name}
                    </p>
                    <p className="text-xs text-brand-stone/60 mt-0.5">
                      {item.brand}
                    </p>
                    <p className="text-sm font-semibold text-brand-charcoal mt-1">
                      {formatPrice(item.price as number)}
                    </p>
                  </div>
                  <button
                    onClick={() => onRemoveFromCart(item)}
                    className="text-xs text-brand-stone/50 hover:text-brand-coral transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="px-6 py-5">
              {/* Total */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-brand-stone">Total</span>
                <span className="text-base font-semibold text-brand-charcoal">
                  {formatPrice(total)}
                </span>
              </div>

              <button
                onClick={() => onCheckout(cart[0])}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-charcoal text-brand-cream py-3 text-sm font-medium hover:bg-brand-warm-black transition-colors shadow-soft"
              >
                Proceed to checkout
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={onClose}
                className="mt-2 w-full py-2.5 rounded-xl text-sm text-brand-stone hover:text-brand-charcoal hover:bg-brand-parchment transition-colors"
              >
                Continue shopping
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CartModal;
