"use client";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
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
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white rounded-2xl shadow-lg p-8 w-[90%] max-w-md text-center relative"
            initial={{ scale: 0.8, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 40 }}
            transition={{ type: "spring", stiffness: 120 }}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 transition-colors"
            >
              <X size={20} />
            </button>

            <h2 className="text-2xl font-serif text-amber-900 mb-2">
              Welcome to Rasphia
            </h2>
            <p className="text-stone-500 mb-6 text-sm">
              Sign in to continue your personalized shopping journey
            </p>

            <button
              onClick={onGoogleSignIn}
              className="flex items-center justify-center w-full py-3 bg-white border border-stone-300 rounded-full hover:shadow-md transition-all active:scale-95"
            >
              <img
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                alt="Google logo"
                className="w-5 h-5 mr-3"
              />
              <span className="text-stone-700 font-medium">
                Continue with Google
              </span>
            </button>

            <p className="text-xs text-stone-400 mt-6">
              By signing in, you agree to Rasphia’s{" "}
              <a href="#" className="underline hover:text-stone-600">
                Terms
              </a>{" "}
              &{" "}
              <a href="#" className="underline hover:text-stone-600">
                Privacy Policy
              </a>
              .
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SignInPopup;
