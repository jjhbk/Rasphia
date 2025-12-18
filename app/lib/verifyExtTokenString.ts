// lib/verifyExtensionTokenEdge.ts
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.EXTENSION_JWT_SECRET!);

export async function verifyExtensionTokenFromString(
  token: string | null
): Promise<string | null> {
  if (!token || typeof token !== "string") return null;

  try {
    const { payload } = await jwtVerify(token, secret, {
      audience: "rasphia_extension", // IMPORTANT
    });

    return payload.sub as string; // EMAIL
  } catch (err) {
    console.error("Edge JWT verification failed:", err);
    return null;
  }
}
