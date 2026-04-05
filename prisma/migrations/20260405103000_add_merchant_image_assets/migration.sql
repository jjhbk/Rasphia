CREATE TABLE IF NOT EXISTS "merchant_image_assets" (
  "id" TEXT NOT NULL,
  "merchant_id" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "original_name" TEXT NOT NULL,
  "content_type" TEXT NOT NULL,
  "size_bytes" INTEGER NOT NULL,
  "width" INTEGER,
  "height" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "merchant_image_assets_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "merchant_image_assets_merchant_id_created_at_idx"
  ON "merchant_image_assets"("merchant_id", "created_at");

ALTER TABLE "merchant_image_assets"
  ADD CONSTRAINT "merchant_image_assets_merchant_id_fkey"
  FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
