"use client";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight } from "lucide-react";
import React from "react";
import GoogleIcon from "./icons/GoogleIcon";
import BrandLogo from "./brand/BrandLogo";

interface SignInPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onGoogleSignIn: () => void;
}

const SignInPopup: React.FC<SignInPopupProps> = ({
  isOpen,
  onClose,
  onGoogleSignIn,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-brand-warm-black/30 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            className="relative w-full max-w-sm"
            initial={{ scale: 0.96, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <div className="relative overflow-hidden rounded-3xl bg-white border border-brand-sand/40 shadow-soft-xl p-8">
              {/* Warm accent blob */}
              <div className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-brand-clay/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-brand-sage/15 blur-2xl" />

              {/* Close */}
              <button
                onClick={onClose}
                className="absolute right-5 top-5 h-10 w-10 p-0 inline-flex items-center justify-center rounded-xl border border-brand-sand/40 text-brand-stone hover:bg-brand-parchment transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Logo mark */}
              <BrandLogo size={48} className="mb-6" />

              <h2 className="font-heading text-3xl text-brand-charcoal leading-tight">
                Your personal
                <br />
                store awaits.
              </h2>
              <p className="mt-3 text-sm text-brand-stone leading-relaxed">
                Sign in to save your taste profile, wishlist, and chat history.
                Takes five seconds.
              </p>

              {/* Benefits */}
              <div className="mt-6 space-y-2.5">
                {[
                  "Your taste graph, remembered",
                  "Wishlist & orders synced",
                  "Picks that get sharper over time",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="h-1.5 w-1.5 rounded-full bg-brand-terracotta flex-shrink-0" />
                    <p className="text-sm text-brand-charcoal">{item}</p>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <button
                onClick={onGoogleSignIn}
                className="mt-8 w-full flex items-center justify-center gap-3 rounded-xl bg-brand-charcoal px-6 py-3.5 text-sm font-medium text-brand-cream shadow-soft hover:bg-brand-warm-black transition-all hover:-translate-y-0.5"
              >
                <GoogleIcon />
                Continue with Google
                <ArrowRight className="h-5 w-5 ml-auto" />
              </button>

              <p className="mt-4 text-center text-[11px] text-brand-stone/50">
                By continuing you agree to our{" "}
                <a href="/privacy" className="underline decoration-brand-sand underline-offset-2 hover:text-brand-charcoal">
                  Privacy Policy
                </a>
                .
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SignInPopup;
