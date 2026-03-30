import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";

/**
 * Validates that the current user is logged in and is an admin.
 * Returns user info if valid; throws otherwise.
 */
export async function requireAdmin() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    throw new Error("Unauthorized: No session found");
  }

  const user = await prisma.userProfile.findUnique({
    where: { email: session.user.email },
  });

  if (!user || user.role !== "admin") {
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

  const email = session.user.email;
  const profile = await prisma.userProfile.findUnique({ where: { email } });

  if (profile?.role === "admin") {
    return {
      email,
      role: "admin",
      merchantId: null,
      merchantStatus: null,
    };
  }

  const merchant = await prisma.merchant.findUnique({
    where: { email },
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
