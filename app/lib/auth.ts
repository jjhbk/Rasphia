import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";
import { isAdminEmail } from "@/app/lib/adminEmails";

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

export async function getManagementAccess(): Promise<ManagementAccess> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    throw new Error("Unauthorized: No session found");
  }

  const email = session.user.email.trim();
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
