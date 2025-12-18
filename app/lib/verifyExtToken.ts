import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.EXTENSION_JWT_SECRET!);

/**
 * Verifies Rasphia extension JWT from request headers.
 * Uses custom header to avoid Authorization stripping.
 */
export async function verifyExtensionToken(
  req: Request
): Promise<string | null> {
  // ✅ PRIMARY: custom extension header (PROD SAFE)
  const token = req.headers.get("x-rasphia-extension-token") || null;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret, {
      audience: "rasphia_extension",
      issuer: "rasphia",
    });

    return payload.sub as string; // EMAIL
  } catch (err) {
    console.error("JWT verify failed:", err);
    return null;
  }
}
