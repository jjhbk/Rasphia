ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS razorpay_key_id_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_key_secret_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_configured_at TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS preferred_payment_provider TEXT;
