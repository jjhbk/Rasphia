CREATE TABLE IF NOT EXISTS "products" (
    "id" TEXT NOT NULL,
    "merchant_id" TEXT,
    "merchant_email" TEXT,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "description" TEXT,
    "category" TEXT,
    "price" DOUBLE PRECISION,
    "image_url" TEXT,
    "tags" JSONB,
    "occasion" JSONB,
    "recipient" TEXT,
    "story" TEXT,
    "affiliate_link" TEXT,
    "reviews" JSONB,
    "attributes" JSONB,
    "style_tags" JSONB,
    "color_palette" JSONB,
    "materials" JSONB,
    "embedding" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "products_merchant_id_idx" ON "products"("merchant_id");
CREATE INDEX IF NOT EXISTS "products_merchant_email_idx" ON "products"("merchant_email");
CREATE INDEX IF NOT EXISTS "products_name_idx" ON "products"("name");
CREATE INDEX IF NOT EXISTS "products_updated_at_idx" ON "products"("updated_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'products_merchant_id_fkey'
  ) THEN
    ALTER TABLE "products"
      ADD CONSTRAINT "products_merchant_id_fkey"
      FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
