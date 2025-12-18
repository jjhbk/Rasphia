// lib/verifyExtensionTokenEdge.ts
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.EXTENSION_JWT_SECRET!);

export async function verifyExtensionToken(
  authHeader: string | null
): Promise<string | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.replace("Bearer ", "");

  try {
    const { payload } = await jwtVerify(token, secret, {
      audience: "rasphia_extension",
    });

    return payload.sub as string; // email
  } catch (err) {
    console.error("Edge JWT verify failed:", err);
    return null;
  }
}
