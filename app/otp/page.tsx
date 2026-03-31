"use client";

import { useState } from "react";
import BrandLogo from "@/app/components/brand/BrandLogo";

export default function OTPPage() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [status, setStatus] = useState("");

  const WHATSAPP_NUMBER = "15551760605";

  async function sendOTP() {
    setStatus("Sending...");

    const res = await fetch("/api/whatsapp/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });

    const data = await res.json();
    if (!res.ok) return setStatus(data.error);

    setStatus("OTP sent! Check WhatsApp.");
  }

  async function verifyOTP() {
    setStatus("Verifying...");

    const res = await fetch("/api/whatsapp/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, otp }),
    });

    const data = await res.json();
    if (!res.ok) return setStatus(data.error);

    setStatus("OTP verified!");
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-brand-hero font-body">
      <div className="w-full max-w-md bg-white/85 border border-brand-sand/40 shadow-soft-lg rounded-3xl p-7">
        <div className="flex items-center gap-3 mb-5">
          <BrandLogo size={38} />
          <div>
            <h1 className="text-xl font-heading text-brand-charcoal">WhatsApp OTP Login</h1>
            <p className="text-xs text-brand-stone">Secure sign-in via WhatsApp verification</p>
          </div>
        </div>

        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}?text=Hi`}
          target="_blank"
          className="block text-center w-full bg-[#25D366] text-white py-2.5 rounded-xl mb-4 hover:opacity-95 transition"
        >
          Send "Hi" on WhatsApp
        </a>

        <p className="text-xs text-brand-stone mb-4 text-center">
          Start this first so we can message your OTP.
        </p>

        <label className="block mb-2 text-sm text-brand-charcoal">Phone Number</label>
        <input
          type="text"
          className="w-full border border-brand-sand/60 bg-brand-parchment/40 p-2.5 rounded-xl mb-4"
          placeholder="9198XXXXXXX"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <button
          onClick={sendOTP}
          className="w-full bg-brand-charcoal text-white py-2.5 rounded-xl mb-4 hover:bg-brand-warm-black transition"
        >
          Send OTP
        </button>

        <label className="block mb-2 text-sm text-brand-charcoal">Enter OTP</label>
        <input
          type="text"
          className="w-full border border-brand-sand/60 bg-brand-parchment/40 p-2.5 rounded-xl mb-4"
          placeholder="123456"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
        />

        <button
          onClick={verifyOTP}
          className="w-full bg-brand-terracotta text-white py-2.5 rounded-xl hover:bg-brand-coral transition"
        >
          Verify OTP
        </button>

        <p className="text-center mt-4 text-sm text-brand-stone">{status}</p>
      </div>
    </div>
  );
}
