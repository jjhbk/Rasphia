import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";
import { isAdminEmail } from "@/app/lib/adminEmails";
import { jwtVerify } from "jose";

/**
 * Validates that the current user is logged in and is an admin.
 * Returns user info if valid; throws otherwise.
 */
export async function requireAdmin() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    throw new Error("Unauthorized: No session found");
  }

  const email = session.user.email.trim();
  const user = await prisma.userProfile.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });

  if (!user || (user.role !== "admin" && !isAdminEmail(email))) {
    throw new Error("Forbidden: Admin access required email is" + user?.email);
  }

  return user;
}

export type ManagementAccess = {
  email: string;
  role: "admin" | "merchant";
  merchantId: string | null;
  merchantStatus: "approved" | "pending" | "rejected" | null;
};

const mobileSecretRaw =
  process.env.MOBILE_APP_JWT_SECRET || process.env.EXTENSION_JWT_SECRET || "";
const mobileSecret = mobileSecretRaw
  ? new TextEncoder().encode(mobileSecretRaw)
  : null;

export async function resolveManagementAccessByEmail(
  emailRaw: string
): Promise<ManagementAccess> {
  const email = emailRaw.trim();
  const profile = await prisma.userProfile.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });

  if (profile?.role === "admin" || isAdminEmail(email)) {
    return {
      email,
      role: "admin",
      merchantId: null,
      merchantStatus: null,
    };
  }

  const merchant = await prisma.merchant.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, status: true },
  });

  const merchantStatus =
    (merchant?.status as "approved" | "pending" | "rejected" | undefined) ??
    null;

  if (!merchant || merchantStatus !== "approved") {
    throw new Error("Forbidden: Merchant approval pending");
  }

  return {
    email,
    role: "merchant",
    merchantId: merchant.id,
    merchantStatus,
  };
}

function readMobileAccessToken(req: Request): string | null {
  const headerToken = req.headers.get("x-rasphia-mobile-token");
  if (headerToken) {
    return headerToken.trim();
  }

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader) {
    return null;
  }
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

async function verifyMobileToken(token: string): Promise<string | null> {
  if (!mobileSecret) {
    return null;
  }
  try {
    const { payload } = await jwtVerify(token, mobileSecret, {
      audience: "rasphia_mobile_app",
      issuer: "rasphia",
    });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function getManagementAccess(): Promise<ManagementAccess> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    throw new Error("Unauthorized: No session found");
  }

  return resolveManagementAccessByEmail(session.user.email);
}

export async function getManagementAccessFromRequest(
  req: Request
): Promise<ManagementAccess> {
  const token = readMobileAccessToken(req);
  if (token) {
    const email = await verifyMobileToken(token);
    if (email) {
      return resolveManagementAccessByEmail(email);
    }

    // If a token is present but invalid, still allow normal web-session auth fallback.
    // This prevents accidental Authorization headers from breaking browser flows.
    try {
      return await getManagementAccess();
    } catch {
      throw new Error("Unauthorized: Invalid mobile token");
    }
  }

  return getManagementAccess();
}
