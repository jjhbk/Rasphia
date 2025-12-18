// lib/verifyExtensionTokenEdge.ts
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.EXTENSION_JWT_SECRET!);

/**
 * Verifies a raw JWT string.
 * Use ONLY when you already have the token string.
 */
export async function verifyExtensionTokenFromString(
  token: string | null
): Promise<string | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret, {
      audience: "rasphia_extension",
      issuer: "rasphia",
    });

    return payload.sub as string; // EMAIL
  } catch (err) {
    console.error("Edge JWT verification failed:", err);
    return null;
  }
}
