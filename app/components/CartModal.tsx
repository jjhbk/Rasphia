"use client";

import React from "react";
import { X } from "lucide-react";
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-md">
      <div className="relative w-full max-w-lg rounded-3xl border border-white/60 bg-white/90 backdrop-blur-xl shadow-[0_25px_80px_rgba(0,0,0,0.18)] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/60 bg-white/70">
          <h2 className="text-lg font-semibold text-stone-900">Your Cart</h2>
          <button
            onClick={onClose}
            className="h-10 w-10 flex items-center justify-center rounded-full bg-white border border-stone-200 text-stone-600 hover:scale-105 transition"
            aria-label="Close cart"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="p-6 text-sm text-stone-600">Your cart is empty.</div>
        ) : (
          <div className="max-h-72 overflow-y-auto space-y-3 p-6">
            {cart.map((item) => (
              <div
                key={item.name}
                className="flex items-center gap-3 p-3 rounded-2xl border border-white/70 bg-white/80 shadow-sm shadow-amber-100/40"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-stone-900 truncate">
                    {item.name}
                  </p>
                  <p className="text-xs text-stone-500">{item.brand}</p>
                </div>

                <button
                  onClick={() => onRemoveFromCart(item)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium text-amber-800 border border-amber-100 bg-amber-50 hover:bg-amber-100 hover:text-amber-900 transition"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {cart.length > 0 && (
          <div className="px-6 pb-6">
            <button
              onClick={() => onCheckout(cart[0])}
              className="w-full rounded-full bg-amber-600 text-white py-3 text-sm font-semibold shadow-lg shadow-amber-200/50 hover:bg-amber-700 transition"
            >
              Proceed to checkout
            </button>
            <button
              onClick={onClose}
              className="mt-3 w-full rounded-full border border-stone-200 bg-white text-sm text-stone-700 hover:text-stone-900 py-2.5 transition"
            >
              Continue shopping
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartModal;
