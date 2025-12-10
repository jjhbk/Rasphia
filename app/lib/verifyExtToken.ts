import jwt from "jsonwebtoken";

export function verifyExtensionToken(headers: Headers) {
  const auth = headers.get("authorization");
  if (!auth) return null;

  const token = auth.replace("Bearer ", "");

  try {
    const decoded = jwt.verify(token, process.env.EXTENSION_JWT_SECRET!) as any;

    return decoded.sub as string; // this is EMAIL
  } catch {
    return null;
  }
}
