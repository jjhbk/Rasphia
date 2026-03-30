ALTER TABLE "merchants"
ADD COLUMN IF NOT EXISTS "slug" TEXT,
ADD COLUMN IF NOT EXISTS "logo_url" TEXT,
ADD COLUMN IF NOT EXISTS "cover_image_url" TEXT,
ADD COLUMN IF NOT EXISTS "storefront_description" TEXT,
ADD COLUMN IF NOT EXISTS "chatbot_welcome_message" TEXT;

UPDATE "merchants"
SET "slug" = lower(
  regexp_replace(
    coalesce(nullif(trim("name"), ''), 'merchant') || '-' || substr("id", 1, 6),
    '[^a-zA-Z0-9]+',
    '-',
    'g'
  )
)
WHERE "slug" IS NULL OR trim("slug") = '';

ALTER TABLE "merchants"
ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "merchants_slug_key" ON "merchants"("slug");
CREATE INDEX IF NOT EXISTS "merchants_slug_idx" ON "merchants"("slug");
