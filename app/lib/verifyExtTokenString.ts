import jwt from "jsonwebtoken";

export function verifyExtensionTokenFromString(token: string | null) {
  if (!token || typeof token !== "string") return null;
  try {
    // If your extension token is a JWT:
    const decoded = jwt.verify(token, process.env.EXTENSION_JWT_SECRET!) as any;

    // Standard form of your payload should contain: { email, uid, ... }
    return decoded.sub as string; // this is EMAIL
  } catch (e) {
    console.error("verifyExtensionTokenFromString error:", e);
    return null;
  }
}
