"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function ContactUs() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [showPopup, setShowPopup] = useState(false);

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      setShowPopup(true);
      setForm({ name: "", email: "", phone: "", message: "" });
    }

    setLoading(false);
    setTimeout(() => {
      window.location.href = "/";
    }, 1500);
  };

  return (
    <>
      {/* FLOATING WHATSAPP BUTTON */}
      <a
        href="https://wa.me/917995981488"
        className="fixed bottom-6 right-6 bg-green-500 text-white px-4 py-3 rounded-full shadow-lg hover:bg-green-600 transition z-50"
      >
        Chat on WhatsApp
      </a>

      <div className="min-h-screen flex justify-center items-center bg-stone-950 p-6 text-stone-200">
        <div className="max-w-xl w-full bg-stone-900 p-8 rounded-2xl shadow-2xl border border-stone-800">
          <h1 className="text-4xl font-extrabold mb-2 text-center">Rasphia</h1>
          <p className="text-center text-stone-400 mb-6">Contact Us</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              name="name"
              placeholder="Your Name"
              value={form.name}
              onChange={handleChange}
              required
              className="w-full bg-stone-800 border border-stone-700 p-3 rounded-lg"
            />

            <input
              name="email"
              type="email"
              placeholder="Your Email"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full bg-stone-800 border border-stone-700 p-3 rounded-lg"
            />

            <input
              name="phone"
              type="tel"
              placeholder="Your Phone Number"
              value={form.phone}
              onChange={handleChange}
              required
              className="w-full bg-stone-800 border border-stone-700 p-3 rounded-lg"
            />

            <textarea
              name="message"
              placeholder="Your Message"
              value={form.message}
              onChange={handleChange}
              rows={5}
              required
              className="w-full bg-stone-800 border border-stone-700 p-3 rounded-lg"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition"
            >
              {loading ? "Sending..." : "Send Message"}
            </button>
          </form>
        </div>
      </div>

      {/* SUCCESS POPUP */}
      <AnimatePresence>
        {showPopup && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 flex items-center justify-center bg-black/60 z-50"
          >
            <div className="bg-stone-900 p-6 rounded-xl shadow-xl border border-stone-700 text-center max-w-sm w-full">
              <h2 className="text-xl font-semibold mb-2">Request Sent</h2>
              <p className="text-stone-300 mb-4">
                We will contact you within 24–48 hours.
              </p>
              <button
                onClick={() => setShowPopup(false)}
                className="bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                OK
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
