"use client";

import { useState } from "react";

export default function OTPPage() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [status, setStatus] = useState("");

  const WHATSAPP_NUMBER = "15551760605";
  // example: "919876543210"
  // Do NOT include "+" in wa.me format

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

    setStatus("OTP verified! 🎉");
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-100">
      <div className="w-full max-w-sm bg-white shadow-lg rounded-xl p-6">
        <h1 className="text-xl font-semibold mb-4 text-center">
          WhatsApp OTP Login
        </h1>

        {/* SEND HI BUTTON */}
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}?text=Hi`}
          target="_blank"
          className="block text-center w-full bg-green-600 text-white py-2 rounded-md mb-4 hover:bg-green-700"
        >
          👋 Send “Hi” on WhatsApp
        </a>

        <p className="text-xs text-gray-500 mb-4 text-center">
          Tap this first so we can message you. (Meta requires the user to
          message you before you can send OTP.)
        </p>

        <label className="block mb-2">Phone Number</label>
        <input
          type="text"
          className="w-full border p-2 rounded mb-4"
          placeholder="9198XXXXXXX"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <button
          onClick={sendOTP}
          className="w-full bg-blue-600 text-white py-2 rounded mb-4 hover:bg-blue-700"
        >
          Send OTP
        </button>

        <label className="block mb-2">Enter OTP</label>
        <input
          type="text"
          className="w-full border p-2 rounded mb-4"
          placeholder="123456"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
        />

        <button
          onClick={verifyOTP}
          className="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700"
        >
          Verify OTP
        </button>

        <p className="text-center mt-4 text-sm">{status}</p>
      </div>
    </div>
  );
}
