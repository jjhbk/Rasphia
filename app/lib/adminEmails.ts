export function getAdminEmailSet(): Set<string> {
  const raw = process.env.ADMIN_EMAILS || "";

  return new Set(
    raw
      .split(",")
      .map((v) => v.trim().replace(/^['\"]|['\"]$/g, "").toLowerCase())
      .filter(Boolean)
  );
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return getAdminEmailSet().has(email.trim().toLowerCase());
}
