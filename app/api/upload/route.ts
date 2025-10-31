import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireAdmin } from "@/app/lib/auth"; // 🔒 optional admin check

export async function POST(req: Request) {
  try {
    await requireAdmin(); // optional, but good for security

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
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
