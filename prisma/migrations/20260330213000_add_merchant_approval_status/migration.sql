ALTER TABLE "merchants"
ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "approved_by" TEXT;

CREATE INDEX IF NOT EXISTS "merchants_status_idx"
ON "merchants"("status");
