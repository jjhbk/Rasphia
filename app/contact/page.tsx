"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, MessageCircle, Send, Paperclip } from "lucide-react";
import BrandLogo from "@/app/components/brand/BrandLogo";
import Navbar from "@/app/components/Navbar";

export default function ContactUs() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [showPopup, setShowPopup] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = Array.from(e.target.files || []) as File[];
    const urls = uploaded.map((f) => URL.createObjectURL(f));
    setFiles((prev) => [...prev, ...uploaded]);
    setPreviews((prev) => [...prev, ...urls]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
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

  return (
    <>
      <Navbar />

      {/* WhatsApp floating button */}
      <a
        href="https://wa.me/917995981488"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 flex items-center gap-2 bg-green-500 text-white px-4 py-3 rounded-full shadow-soft-lg hover:bg-green-600 transition-all hover:scale-105 z-50 text-sm font-medium"
      >
        <MessageCircle className="h-4 w-4" />
        Chat on WhatsApp
      </a>

      <div className="min-h-screen bg-brand-hero py-12 px-4 font-body">
        <div className="max-w-lg mx-auto animate-fade-up">
          {/* Header */}
          <div className="text-center mb-8">
            <BrandLogo size={40} showWordmark wordmarkClassName="text-xl" className="justify-center" />
            <p className="text-brand-stone text-sm mt-3">
              We&apos;d love to hear from you. Send us a message and we&apos;ll respond within 24–48 hours.
            </p>
          </div>

          {/* Form card */}
          <div className="glass-card p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Name</label>
                  <input
                    name="name"
                    placeholder="Your name"
                    value={form.name}
                    onChange={handleChange}
                    required
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="input-label">Phone</label>
                  <input
                    name="phone"
                    type="tel"
                    placeholder="+91 XXXXX XXXXX"
                    value={form.phone}
                    onChange={handleChange}
                    required
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="input-label">Email</label>
                <input
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className="input-field"
                />
              </div>

              <div>
                <label className="input-label">Message</label>
                <textarea
                  name="message"
                  placeholder="Tell us how we can help…"
                  value={form.message}
                  onChange={handleChange}
                  rows={5}
                  required
                  className="input-field resize-none"
                />
              </div>

              {/* File attachments */}
              <div>
                <label className="input-label flex items-center gap-1.5">
                  <Paperclip className="h-3 w-3" />
                  Attachments (optional)
                </label>
                <label className="btn btn-secondary btn-sm cursor-pointer w-full justify-center border-dashed">
                  <Paperclip className="h-3.5 w-3.5" />
                  Choose images to attach
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
                {previews.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {previews.map((src, i) => (
                      <img
                        key={i}
                        src={src}
                        className="w-16 h-16 object-cover rounded-xl border border-brand-sand/40"
                        alt="attachment preview"
                      />
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full justify-center"
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send Message
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Success popup */}
      <AnimatePresence>
        {showPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center bg-brand-charcoal/40 backdrop-blur-sm z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card p-8 text-center max-w-sm w-full animate-scale-in"
            >
              <div className="h-14 w-14 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-7 w-7 text-green-600" />
              </div>
              <h2 className="font-heading text-xl text-brand-charcoal mb-2">
                Message sent!
              </h2>
              <p className="text-brand-stone text-sm mb-6">
                We&apos;ll be in touch within 24–48 hours.
              </p>
              <button
                onClick={() => setShowPopup(false)}
                className="btn btn-primary w-full justify-center"
              >
                Done
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
