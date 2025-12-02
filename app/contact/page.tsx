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

  return (
    <>
      {/* FLOATING WHATSAPP */}
      <a
        href="https://wa.me/917995981488"
        className="fixed bottom-6 right-6 bg-green-500 text-white px-4 py-3 rounded-full shadow-lg hover:bg-green-600 transition z-50"
      >
        Chat on WhatsApp
      </a>

      <div className="min-h-screen flex justify-center items-center bg-[#F8F4EF] p-6 text-stone-900">
        <div className="max-w-xl w-full bg-gradient-to-br from-white via-[#FFF6EA] to-white p-10 rounded-3xl shadow-2xl border border-stone-200">
          <h1 className="text-4xl font-serif text-center mb-2">Rasphia</h1>
          <p className="text-center text-stone-600 mb-6">Contact Us</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              name="name"
              placeholder="Your Name"
              value={form.name}
              onChange={handleChange}
              required
              className="w-full bg-white border border-stone-300 p-3 rounded-xl shadow-sm focus:ring-2 focus:ring-amber-300"
            />

            <input
              name="email"
              type="email"
              placeholder="Your Email"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full bg-white border border-stone-300 p-3 rounded-xl shadow-sm focus:ring-2 focus:ring-amber-300"
            />

            <input
              name="phone"
              type="tel"
              placeholder="Your Phone Number"
              value={form.phone}
              onChange={handleChange}
              required
              className="w-full bg-white border border-stone-300 p-3 rounded-xl shadow-sm focus:ring-2 focus:ring-amber-300"
            />

            <textarea
              name="message"
              placeholder="Your Message"
              value={form.message}
              onChange={handleChange}
              rows={5}
              required
              className="w-full bg-white border border-stone-300 p-3 rounded-xl shadow-sm focus:ring-2 focus:ring-amber-300"
            />

            {/* MULTIPLE IMAGES */}
            <div>
              <label className="text-sm font-medium text-stone-700">
                Attach Images (optional)
              </label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="w-full bg-white border border-stone-300 p-3 rounded-xl mt-2"
              />

              {previews.length > 0 && (
                <div className="flex flex-wrap gap-3 mt-3">
                  {previews.map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      className="w-20 h-20 object-cover rounded-xl border"
                    />
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-stone-900 text-white py-3 rounded-full shadow-lg hover:bg-stone-800 transition"
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
            className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50"
          >
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xl text-center max-w-sm w-full">
              <h2 className="text-xl font-semibold text-stone-900 mb-2">
                Request Sent
              </h2>
              <p className="text-stone-600 mb-4">
                We will contact you within 24–48 hours.
              </p>
              <button
                onClick={() => setShowPopup(false)}
                className="bg-stone-900 text-white px-5 py-2 rounded-full hover:bg-stone-800"
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
