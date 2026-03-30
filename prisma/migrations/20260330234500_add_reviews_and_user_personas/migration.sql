ALTER TABLE "products"
DROP COLUMN IF EXISTS "reviews";

CREATE TABLE IF NOT EXISTS "user_personas" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_personas_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_personas_email_key"
ON "user_personas"("email");
CREATE INDEX IF NOT EXISTS "user_personas_updated_at_idx"
ON "user_personas"("updated_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_personas_email_fkey'
  ) THEN
    ALTER TABLE "user_personas"
      ADD CONSTRAINT "user_personas_email_fkey"
      FOREIGN KEY ("email") REFERENCES "user_profiles"("email")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "reviews" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "user_email" TEXT NOT NULL,
    "order_id" TEXT,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "image_urls" JSONB,
    "verified_purchase" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "reviews_product_id_idx"
ON "reviews"("product_id");
CREATE INDEX IF NOT EXISTS "reviews_user_email_idx"
ON "reviews"("user_email");
CREATE INDEX IF NOT EXISTS "reviews_order_id_idx"
ON "reviews"("order_id");
CREATE INDEX IF NOT EXISTS "reviews_created_at_idx"
ON "reviews"("created_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'reviews_product_id_fkey'
  ) THEN
    ALTER TABLE "reviews"
      ADD CONSTRAINT "reviews_product_id_fkey"
      FOREIGN KEY ("product_id") REFERENCES "products"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
