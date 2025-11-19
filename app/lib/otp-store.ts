// lib/otp-store.ts

type OTPEntry = { otp: string; expiresAt: number };

const _store =
  (globalThis as any).__OTP_STORE__ || ((globalThis as any).__OTP_STORE__ = {});

export function saveOTP(phone: string, otp: string) {
  _store[phone] = {
    otp,
    expiresAt: Date.now() + 5 * 60 * 1000,
  };
}

export function getOTP(phone: string): OTPEntry | undefined {
  return _store[phone];
}

export function deleteOTP(phone: string) {
  delete _store[phone];
}
