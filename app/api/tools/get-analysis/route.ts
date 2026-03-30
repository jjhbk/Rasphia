import { NextRequest, NextResponse } from "next/server";
import { authGuard } from "@/app/lib/auth-guard";
import { prisma } from "@/app/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { sessionEmail, errorResponse } = await authGuard(req);
    if (errorResponse) return errorResponse;

    const id = req.nextUrl.searchParams.get("analysisId");
    if (!id) {
      return NextResponse.json({ error: "Missing analysisId" }, { status: 400 });
    }

    const doc = await prisma.analysis.findFirst({
      where: {
        OR: [{ analysisId: id }, { id }],
      },
    });

    if (!doc) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }

    if (doc.userEmail !== sessionEmail) {
      return NextResponse.json(
        { error: "Forbidden: You do not own this analysis" },
        { status: 403 }
      );
    }

    const payload =
      doc.payload && typeof doc.payload === "object"
        ? (doc.payload as Record<string, unknown>)
        : {};

    return NextResponse.json(
      {
        analysisId: doc.analysisId || doc.id,
        userEmail: doc.userEmail,
        type: doc.type,
        title: payload.title || `${doc.type || "analysis"} (${doc.createdAt.toISOString().slice(0, 10)})`,
        fileUrl: payload.fileUrl || null,
        aiResult: payload.aiResult || {},
        blurSensitive: payload.blurSensitive || false,
        chatRefs: payload.chatRefs || [],
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("❌ get-analysis error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
