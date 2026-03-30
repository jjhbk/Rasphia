import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

function normalizePhone(input: string) {
  const digits = String(input || "").replace(/[^\d]/g, "");
  if (!digits) return "";
  return `+${digits}`;
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const phoneQuery = String(req.nextUrl.searchParams.get("phone") || "").trim();
    if (phoneQuery) {
      const phone = normalizePhone(phoneQuery) || phoneQuery;
      const session = await prisma.whatsappSession.findUnique({
        where: { phone },
      });
      return NextResponse.json({ session: session || null }, { status: 200 });
    }

    const sessions = await prisma.whatsappSession.findMany({
      orderBy: { updatedAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ sessions }, { status: 200 });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch WhatsApp sessions";
    if (message.startsWith("Unauthorized") || message.startsWith("Forbidden")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin();

    const phoneQuery = String(req.nextUrl.searchParams.get("phone") || "").trim();
    if (!phoneQuery) {
      return NextResponse.json(
        { error: "phone query param is required" },
        { status: 400 }
      );
    }

    const phone = normalizePhone(phoneQuery) || phoneQuery;
    await prisma.whatsappSession.deleteMany({
      where: {
        OR: [{ phone }, { phone: phone.replace(/^\+/, "") }],
      },
    });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to delete WhatsApp session";
    if (message.startsWith("Unauthorized") || message.startsWith("Forbidden")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
