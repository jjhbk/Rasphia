ALTER TABLE "products"
ADD COLUMN IF NOT EXISTS "stock_quantity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "is_available" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "products_is_available_idx" ON "products"("is_available");
