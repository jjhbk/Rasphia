// lib/verifyExtensionToken.ts
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.EXTENSION_JWT_SECRET!);

export async function verifyExtensionToken(
  authHeader: string | null
): Promise<string | null> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

  const token = authHeader.slice("Bearer ".length);

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
