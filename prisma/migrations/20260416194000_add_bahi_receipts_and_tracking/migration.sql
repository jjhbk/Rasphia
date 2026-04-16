ALTER TABLE "merchants"
  ADD COLUMN IF NOT EXISTS "bahi_api_key_encrypted" TEXT,
  ADD COLUMN IF NOT EXISTS "bahi_webhook_secret_encrypted" TEXT,
  ADD COLUMN IF NOT EXISTS "bahi_merchant_id" TEXT,
  ADD COLUMN IF NOT EXISTS "bahi_upi_id" TEXT,
  ADD COLUMN IF NOT EXISTS "bahi_base_url" TEXT,
  ADD COLUMN IF NOT EXISTS "bahi_auto_receipt_enabled" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "bahi_configured_at" TIMESTAMP(3);

ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "invoice_number" TEXT,
  ADD COLUMN IF NOT EXISTS "invoice_id" TEXT,
  ADD COLUMN IF NOT EXISTS "invoice_pdf_url" TEXT,
  ADD COLUMN IF NOT EXISTS "invoice_generated_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "invoice_sync_status" TEXT,
  ADD COLUMN IF NOT EXISTS "invoice_sync_error" TEXT,
  ADD COLUMN IF NOT EXISTS "invoice_synced_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "orders_invoice_number_idx"
  ON "orders"("invoice_number");

CREATE INDEX IF NOT EXISTS "orders_invoice_generated_at_idx"
  ON "orders"("invoice_generated_at");

CREATE INDEX IF NOT EXISTS "orders_invoice_sync_status_idx"
  ON "orders"("invoice_sync_status");

CREATE INDEX IF NOT EXISTS "merchants_bahi_merchant_id_idx"
  ON "merchants"("bahi_merchant_id");

CREATE INDEX IF NOT EXISTS "merchants_bahi_upi_id_idx"
  ON "merchants"("bahi_upi_id");
