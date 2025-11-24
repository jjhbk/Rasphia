"use client";

import React from "react";
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl border border-stone-200">
        <h2 className="text-xl font-semibold text-stone-900 mb-4">Your Cart</h2>

        {cart.length === 0 ? (
          <p className="text-stone-600 text-sm">Your cart is empty.</p>
        ) : (
          <div className="max-h-60 overflow-y-auto space-y-3">
            {cart.map((item) => (
              <div
                key={item.name}
                className="flex justify-between items-center p-2 border rounded-lg"
              >
                <div>
                  <p className="font-medium text-stone-800">{item.name}</p>
                  <p className="text-sm text-stone-500">{item.brand}</p>
                </div>

                <button
                  onClick={() => onRemoveFromCart(item)}
                  className="text-red-500 text-sm hover:underline"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Checkout */}
        {cart.length > 0 && (
          <button
            onClick={() => onCheckout(cart[0])}
            className="mt-5 w-full bg-stone-900 text-white py-2 rounded-xl shadow hover:bg-stone-800 transition"
          >
            Buy Now
          </button>
        )}

        {/* Close */}
        <button
          onClick={onClose}
          className="mt-3 w-full text-stone-600 text-sm hover:underline"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default CartModal;
