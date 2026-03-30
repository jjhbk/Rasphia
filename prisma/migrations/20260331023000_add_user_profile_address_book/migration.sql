ALTER TABLE "user_profiles"
ADD COLUMN IF NOT EXISTS "address_book" JSONB;
