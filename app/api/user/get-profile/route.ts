import { NextRequest, NextResponse } from "next/server";
import { authGuard } from "@/app/lib/auth-guard";
import { prisma } from "@/app/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    // 1️⃣ Authenticate request
    const { sessionEmail, errorResponse } = await authGuard(req);
    if (errorResponse) return errorResponse;

    // 2️⃣ Ignore `?email=` from client — trust session only
    const email = sessionEmail;

    const user = await prisma.userProfile.findUnique({ where: { email } });

    return NextResponse.json(
      {
        ...(user || {}),
        addressBook: Array.isArray(user?.addressBook)
          ? user?.addressBook
          : [],
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("❌ user-profile error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
