"use client";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Shield, ArrowRight, LogIn } from "lucide-react";
import React from "react";

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
  const highlights = [
    {
      icon: Sparkles,
      title: "Continue the brief",
      copy: "We remember scents, wishlists, and carted rituals across devices.",
    },
    {
      icon: Shield,
      title: "Private & secure",
      copy: "Protected by NextAuth + Google. No passwords to juggle.",
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(248,236,220,0.9),_rgba(32,24,18,0.9))] opacity-90" />
          <motion.div
            className="relative w-[90%] max-w-lg"
            initial={{ scale: 0.9, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 40 }}
            transition={{ type: "spring", stiffness: 120 }}
          >
            <div className="pointer-events-none absolute -top-10 right-2 h-36 w-36 rounded-full bg-gradient-to-br from-amber-200 via-rose-100 to-white blur-2xl opacity-80" />
            <div className="pointer-events-none absolute bottom-[-40px] left-[-20px] h-40 w-40 rounded-full bg-gradient-to-br from-[#2F1A19] via-[#613629] to-[#AD6F52] blur-[90px] opacity-70" />
            <div className="relative overflow-hidden rounded-[32px] border border-white/30 bg-white/95 p-8 shadow-2xl backdrop-blur">
              <button
                onClick={onClose}
                className="absolute right-5 top-5 rounded-full border border-stone-200 bg-white/70 p-2 text-stone-500 transition hover:bg-white"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex flex-col gap-2 text-left">
                <p className="inline-flex w-fit items-center gap-2 rounded-full bg-amber-50 px-4 py-1 text-xs font-semibold uppercase tracking-[0.4em] text-amber-800">
                  Sign in
                </p>
                <h2 className="text-3xl font-serif text-stone-900">
                  Pick up where your concierge left off.
                </h2>
                <p className="text-sm text-stone-500">
                  Save conversations, wishlists, and checkout progress with a single tap.
                </p>
              </div>

              <div className="mt-6 grid gap-4">
                {highlights.map((highlight) => (
                  <div
                    key={highlight.title}
                    className="flex items-start gap-3 rounded-2xl border border-stone-100 bg-stone-50/70 px-4 py-3"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-800">
                      <highlight.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-stone-900">{highlight.title}</p>
                      <p className="text-xs text-stone-500">{highlight.copy}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={onGoogleSignIn}
                className="mt-6 inline-flex w-full items-center justify-center gap-3 rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-stone-400/40 transition hover:-translate-y-0.5 hover:bg-stone-800"
                style={{ borderRadius: "999px" }}
              >
                <LogIn className="h-4 w-4" />
                Continue with Google
                <ArrowRight className="h-4 w-4" />
              </button>

              <p className="mt-4 text-center text-xs text-stone-400">
                By continuing you agree to our{" "}
                <a href="#" className="underline decoration-amber-300 underline-offset-4 hover:text-stone-600">
                  Terms
                </a>{" "}
                &{" "}
                <a href="#" className="underline decoration-amber-300 underline-offset-4 hover:text-stone-600">
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
