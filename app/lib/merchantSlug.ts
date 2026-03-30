import { prisma } from "@/app/lib/prisma";

export const MERCHANT_SLUG_MIN_LENGTH = 3;
export const MERCHANT_SLUG_MAX_LENGTH = 40;

function normalizeSlug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/_{2,}/g, "_");
}

export function slugFromBusinessName(name: string) {
  const base = normalizeSlug(name || "").slice(0, MERCHANT_SLUG_MAX_LENGTH);
  return base || "merchant-store";
}

export function validateMerchantSlug(candidate: string) {
  const slug = normalizeSlug(candidate);
  if (
    slug.length < MERCHANT_SLUG_MIN_LENGTH ||
    slug.length > MERCHANT_SLUG_MAX_LENGTH
  ) {
    return {
      valid: false,
      slug,
      error: `Slug must be ${MERCHANT_SLUG_MIN_LENGTH}-${MERCHANT_SLUG_MAX_LENGTH} characters.`,
    };
  }
  if (!/^[a-z0-9_-]+$/.test(slug)) {
    return {
      valid: false,
      slug,
      error: "Slug can contain only lowercase letters, numbers, '-' and '_'.",
    };
  }
  return { valid: true, slug };
}

export async function ensureUniqueMerchantSlug(
  candidate: string,
  merchantIdToExclude?: string
) {
  const base = slugFromBusinessName(candidate);
  let slug = base;
  let suffix = 1;

  while (true) {
    const existing = await prisma.merchant.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!existing || existing.id === merchantIdToExclude) {
      return slug;
    }
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
}

export async function isMerchantSlugAvailable(
  candidate: string,
  merchantIdToExclude?: string
) {
  const slug = slugFromBusinessName(candidate);
  const existing = await prisma.merchant.findUnique({
    where: { slug },
    select: { id: true },
  });
  return !existing || existing.id === merchantIdToExclude;
}
