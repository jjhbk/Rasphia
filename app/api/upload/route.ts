import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getManagementAccessFromRequest } from "@/app/lib/auth";

export async function POST(req: Request) {
  try {
    // Allow both admins and approved merchants.
    await getManagementAccessFromRequest(req);

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Upload to Vercel Blob
    const blob = await put(`products/${Date.now()}-${file.name}`, file, {
      access: "public", // public URL
    });

    return NextResponse.json({ url: blob.url });
  } catch (err: any) {
    console.error("❌ Upload error:", err);
    const message = err instanceof Error ? err.message : "Failed to upload file";
    if (message.startsWith("Unauthorized")) {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message.startsWith("Forbidden")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
