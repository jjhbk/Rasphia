ALTER TABLE "orders"
ADD COLUMN IF NOT EXISTS "shipping_provider" TEXT,
ADD COLUMN IF NOT EXISTS "tracking_url" TEXT,
ADD COLUMN IF NOT EXISTS "shipping_details" JSONB,
ADD COLUMN IF NOT EXISTS "estimated_delivery" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "shipped_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "delivered_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "status_history" JSONB;

CREATE TABLE IF NOT EXISTS "order_service_requests" (
  "id" TEXT NOT NULL,
  "request_id" TEXT NOT NULL,
  "order_id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'requested',
  "reason" TEXT NOT NULL,
  "details" TEXT,
  "requested_by_email" TEXT NOT NULL,
  "reviewed_by_email" TEXT,
  "merchant_email" TEXT,
  "admin_note" TEXT,
  "resolution_note" TEXT,
  "timeline" JSONB,
  "resolved_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "order_service_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "order_service_requests_request_id_key"
ON "order_service_requests"("request_id");
CREATE INDEX IF NOT EXISTS "order_service_requests_order_id_idx"
ON "order_service_requests"("order_id");
CREATE INDEX IF NOT EXISTS "order_service_requests_requested_by_email_idx"
ON "order_service_requests"("requested_by_email");
CREATE INDEX IF NOT EXISTS "order_service_requests_merchant_email_idx"
ON "order_service_requests"("merchant_email");
CREATE INDEX IF NOT EXISTS "order_service_requests_status_idx"
ON "order_service_requests"("status");
CREATE INDEX IF NOT EXISTS "order_service_requests_type_idx"
ON "order_service_requests"("type");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'order_service_requests_order_id_fkey'
  ) THEN
    ALTER TABLE "order_service_requests"
      ADD CONSTRAINT "order_service_requests_order_id_fkey"
      FOREIGN KEY ("order_id") REFERENCES "orders"("order_id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
