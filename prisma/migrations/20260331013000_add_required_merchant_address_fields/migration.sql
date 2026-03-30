ALTER TABLE "merchants"
ADD COLUMN IF NOT EXISTS "address_line_1" TEXT,
ADD COLUMN IF NOT EXISTS "address_line_2" TEXT,
ADD COLUMN IF NOT EXISTS "city" TEXT,
ADD COLUMN IF NOT EXISTS "state" TEXT,
ADD COLUMN IF NOT EXISTS "zip_code" TEXT;

UPDATE "merchants"
SET
  "address_line_1" = COALESCE("address_line_1", "address", ''),
  "address_line_2" = COALESCE("address_line_2", ''),
  "city" = COALESCE("city", ''),
  "state" = COALESCE("state", ''),
  "zip_code" = COALESCE("zip_code", '')
WHERE
  "address_line_1" IS NULL
  OR "address_line_2" IS NULL
  OR "city" IS NULL
  OR "state" IS NULL
  OR "zip_code" IS NULL;

ALTER TABLE "merchants"
ALTER COLUMN "address_line_1" SET NOT NULL,
ALTER COLUMN "address_line_2" SET NOT NULL,
ALTER COLUMN "city" SET NOT NULL,
ALTER COLUMN "state" SET NOT NULL,
ALTER COLUMN "zip_code" SET NOT NULL;
