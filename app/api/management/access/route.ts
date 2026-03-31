import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";
import { isAdminEmail } from "@/app/lib/adminEmails";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { authenticated: false, access: "none" },
        { status: 200 }
      );
    }

    const email = session.user.email.trim();
    const profile = await prisma.userProfile.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });

    if (profile?.role === "admin" || isAdminEmail(email)) {
      return NextResponse.json(
        { authenticated: true, access: "admin", email },
        { status: 200 }
      );
    }

    const merchant = await prisma.merchant.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true, status: true, name: true },
    });

    if (!merchant) {
      return NextResponse.json(
        { authenticated: true, access: "none", email, merchant: null },
        { status: 200 }
      );
    }

    if (merchant.status === "approved") {
      return NextResponse.json(
        {
          authenticated: true,
          access: "merchant",
          email,
          merchant,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        authenticated: true,
        access: "merchant_pending",
        email,
        merchant,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to resolve access";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
