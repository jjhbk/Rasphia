import { NextRequest, NextResponse } from "next/server";
import { authGuard } from "@/app/lib/auth-guard";
import { prisma } from "@/app/lib/prisma";
import { defaultPersona } from "@/app/utils/defaultPersona";

export async function GET(req: NextRequest) {
  try {
    const { sessionEmail, errorResponse } = await authGuard(req);
    if (errorResponse) return errorResponse;

    const email = sessionEmail;
    const personaRecord = await prisma.userPersona.findUnique({
      where: { email },
    });

    return NextResponse.json(
      { persona: (personaRecord?.data as Record<string, unknown>) || defaultPersona },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch persona";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
