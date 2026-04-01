-- Merchant-scoped SeedhaPe credentials and webhook identifiers
ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS seedhape_api_key_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS seedhape_webhook_secret_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS seedhape_webhook_path TEXT,
  ADD COLUMN IF NOT EXISTS seedhape_base_url TEXT,
  ADD COLUMN IF NOT EXISTS seedhape_configured_at TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS merchants_seedhape_webhook_path_key
  ON merchants(seedhape_webhook_path);

-- Order to merchant linkage for isolated payment provider credentials
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS merchant_id TEXT;

CREATE INDEX IF NOT EXISTS orders_merchant_id_idx
  ON orders(merchant_id);
