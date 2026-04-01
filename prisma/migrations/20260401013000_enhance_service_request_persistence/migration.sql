ALTER TABLE order_service_requests
  ADD COLUMN IF NOT EXISTS request_number TEXT,
  ADD COLUMN IF NOT EXISTS merchant_id TEXT,
  ADD COLUMN IF NOT EXISTS requested_amount DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS order_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS customer_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS requested_items JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS order_service_requests_request_number_key
  ON order_service_requests(request_number);

CREATE INDEX IF NOT EXISTS order_service_requests_merchant_id_idx
  ON order_service_requests(merchant_id);

CREATE INDEX IF NOT EXISTS order_service_requests_request_number_idx
  ON order_service_requests(request_number);
