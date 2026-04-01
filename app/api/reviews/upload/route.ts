import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { authGuard } from "@/app/lib/auth-guard";

export async function POST(req: Request) {
  try {
    const { errorResponse } = await authGuard(req);
    if (errorResponse) return errorResponse;

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const mimeType = String(file.type || "").toLowerCase();
    if (!mimeType.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only image uploads are allowed." },
        { status: 400 }
      );
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const blob = await put(`reviews/${Date.now()}-${safeName}`, file, {
      access: "public",
      addRandomSuffix: true,
    });

    return NextResponse.json({ url: blob.url }, { status: 200 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to upload review image";
    if (message.startsWith("Unauthorized")) {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to upload review image" },
      { status: 500 }
    );
  }
}

