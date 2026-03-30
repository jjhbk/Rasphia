import { NextRequest, NextResponse } from "next/server";
import { authGuard } from "@/app/lib/auth-guard";
import { prisma } from "@/app/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { sessionEmail, errorResponse } = await authGuard(req);
    if (errorResponse) return errorResponse;

    const docs = await prisma.analysis.findMany({
      where: { userEmail: sessionEmail },
      orderBy: { createdAt: "desc" },
    });

    const result = docs.map((d) => {
      const payload =
        d.payload && typeof d.payload === "object"
          ? (d.payload as Record<string, unknown>)
          : {};

      return {
        analysisId: d.analysisId || d.id,
        userEmail: d.userEmail,
        type: d.type,
        title: payload.title || `${d.type || "analysis"} (${d.createdAt.toISOString().slice(0, 10)})`,
        fileUrl: payload.fileUrl || null,
        aiResult: payload.aiResult || {},
        blurSensitive: payload.blurSensitive || false,
        chatRefs: payload.chatRefs || [],
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
      };
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("❌ list-analyses error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
