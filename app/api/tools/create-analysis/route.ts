import { NextRequest, NextResponse } from "next/server";
import { authGuard } from "@/app/lib/auth-guard";
import { processImageAnalysis } from "@/app/lib/analysis/processImageAnalysis";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { sessionEmail, errorResponse } = await authGuard(req);
    if (errorResponse) return errorResponse;

    const form = await req.formData();
    const type = String(form.get("tool") || "skin");
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing image file" }, { status: 400 });
    }

    const analysis = await processImageAnalysis(file, type, sessionEmail);
    return NextResponse.json({ ok: true, analysis }, { status: 200 });
  } catch (err) {
    console.error("Create-analysis fatal error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
