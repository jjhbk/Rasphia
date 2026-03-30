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

  const [files, setFiles] = useState<any[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFileSelect = (e: any) => {
    const uploaded = Array.from(e.target.files || []);
    const urls = uploaded.map((f: any) => URL.createObjectURL(f));
    setFiles((prev) => [...prev, ...uploaded]);
    setPreviews((prev) => [...prev, ...urls]);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData();
    formData.append("name", form.name);
    formData.append("email", form.email);
    formData.append("phone", form.phone);
    formData.append("message", form.message);
    files.forEach((file) => {
      formData.append("images", file);
    });

    const res = await fetch("/api/contact", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      setShowPopup(true);
      setForm({ name: "", email: "", phone: "", message: "" });
      setFiles([]);
      setPreviews([]);
    }

    setLoading(false);
  };

  const inputClass =
    "w-full bg-brand-parchment/50 border border-brand-sand/50 px-4 py-3 rounded-xl text-sm text-brand-charcoal placeholder:text-brand-stone/50 focus:outline-none focus:border-brand-terracotta/40 focus:ring-2 focus:ring-brand-terracotta/10 transition-all";

  return (
    <>
      {/* FLOATING WHATSAPP */}
      <a
        href="https://wa.me/917995981488"
        className="fixed bottom-6 right-6 bg-green-500 text-white px-4 py-3 rounded-full shadow-soft-lg hover:bg-green-600 transition z-50 text-sm font-medium"
      >
        Chat on WhatsApp
      </a>

      <div className="min-h-screen flex justify-center items-center bg-brand-cream p-6 font-body">
        <div className="max-w-lg w-full bg-white/80 backdrop-blur-xl border border-brand-sand/30 p-10 rounded-3xl shadow-soft-md">
          <div className="flex flex-col items-center mb-8">
            <div className="h-10 w-10 rounded-full bg-brand-charcoal flex items-center justify-center mb-4">
              <span className="font-heading text-base text-brand-cream">R</span>
            </div>
            <h1 className="font-heading text-2xl text-brand-charcoal">Rasphia</h1>
            <p className="text-brand-stone text-sm mt-1">Get in touch with us</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              name="name"
              placeholder="Your name"
              value={form.name}
              onChange={handleChange}
              required
              className={inputClass}
            />

            <input
              name="email"
              type="email"
              placeholder="Your email"
              value={form.email}
              onChange={handleChange}
              required
              className={inputClass}
            />

            <input
              name="phone"
              type="tel"
              placeholder="Your phone number"
              value={form.phone}
              onChange={handleChange}
              required
              className={inputClass}
            />

            <textarea
              name="message"
              placeholder="Your message"
              value={form.message}
              onChange={handleChange}
              rows={5}
              required
              className={`${inputClass} resize-none`}
            />

            <div>
              <label className="text-[10px] uppercase tracking-widest font-medium text-brand-stone/60 block mb-2">
                Attach images (optional)
              </label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="w-full bg-brand-parchment/40 border border-brand-sand/40 px-3 py-2 rounded-xl text-sm text-brand-stone"
              />
              {previews.length > 0 && (
                <div className="flex flex-wrap gap-3 mt-3">
                  {previews.map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      className="w-20 h-20 object-cover rounded-xl border border-brand-sand/40"
                      alt="attachment preview"
                    />
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-charcoal text-brand-cream py-3 rounded-xl text-sm font-medium hover:bg-brand-warm-black disabled:bg-brand-stone/50 transition-colors shadow-soft"
            >
              {loading ? "Sending…" : "Send Message"}
            </button>
          </form>
        </div>
      </div>

      {/* SUCCESS POPUP */}
      <AnimatePresence>
        {showPopup && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 flex items-center justify-center bg-brand-charcoal/40 backdrop-blur-sm z-50"
          >
            <div className="bg-white p-8 rounded-3xl border border-brand-sand/30 shadow-soft-xl text-center max-w-sm w-full mx-4">
              <div className="h-12 w-12 rounded-full bg-brand-parchment flex items-center justify-center mx-auto mb-4">
                <span className="text-brand-terracotta text-xl">✓</span>
              </div>
              <h2 className="font-heading text-xl text-brand-charcoal mb-2">
                Message sent
              </h2>
              <p className="text-brand-stone text-sm mb-6">
                We'll be in touch within 24–48 hours.
              </p>
              <button
                onClick={() => setShowPopup(false)}
                className="bg-brand-charcoal text-brand-cream px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-brand-warm-black transition-colors"
              >
                Done
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
