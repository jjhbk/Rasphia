UPDATE "merchants"
SET "location_link" = COALESCE("location_link", '')
WHERE "location_link" IS NULL;

ALTER TABLE "merchants"
ALTER COLUMN "location_link" SET NOT NULL;
