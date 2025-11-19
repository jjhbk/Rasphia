declare global {
  // Extend globalThis with your own variable
  // so TS understands it exists.
  var otpStore: Record<string, { otp: string; expiresAt: number }>;
}

export {};
