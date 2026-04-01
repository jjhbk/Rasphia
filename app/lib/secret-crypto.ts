import crypto from "crypto";

const ENCRYPTION_KEY_ENV =
  process.env.SECRETS_ENCRYPTION_KEY ||
  process.env.SEEDHAPE_SECRETS_KEY ||
  process.env.NEXTAUTH_SECRET ||
  "";

function resolveEncryptionKey() {
  const raw = ENCRYPTION_KEY_ENV.trim();
  if (!raw) {
    throw new Error(
      "Missing secret encryption key. Set SECRETS_ENCRYPTION_KEY (recommended)."
    );
  }

  try {
    const parsed = Buffer.from(raw, "base64");
    if (parsed.length === 32) return parsed;
  } catch {}

  return crypto.createHash("sha256").update(raw).digest();
}

const ENC_KEY = resolveEncryptionKey();

export function encryptSecret(value: string) {
  const plaintext = String(value || "").trim();
  if (!plaintext) return "";

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", ENC_KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
}

export function decryptSecret(payload: string | null | undefined) {
  const encoded = String(payload || "").trim();
  if (!encoded) return "";
  const parts = encoded.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted secret payload format.");
  }

  const iv = Buffer.from(parts[0], "base64");
  const tag = Buffer.from(parts[1], "base64");
  const ciphertext = Buffer.from(parts[2], "base64");

  const decipher = crypto.createDecipheriv("aes-256-gcm", ENC_KEY, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plain.toString("utf8");
}

export function generateRandomSecret(size = 32) {
  return crypto.randomBytes(size).toString("base64url");
}
