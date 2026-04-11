import { NextResponse } from "next/server";
import { verifyExtensionToken } from "@/app/lib/verifyExtToken";
import { handleOptions, withExtensionCors } from "@/app/lib/extensionCors";
import { prisma } from "@/app/lib/prisma";

export const runtime = "nodejs";
export const OPTIONS = handleOptions;

export const POST = withExtensionCors(async (req: Request) => {
  try {
    const email = await verifyExtensionToken(req);
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { chatId, products } = await req.json();

    if (!chatId) {
      return NextResponse.json(
        { error: "Invalid or missing chatId" },
        { status: 400 }
      );
    }

    if (!Array.isArray(products)) {
      return NextResponse.json(
        { error: "Products array required" },
        { status: 400 }
      );
    }

    const chat = await prisma.chat.findUnique({ where: { id: chatId } });
    if (!chat || chat.userEmail !== email) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    await prisma.analysis.create({
      data: {
        userEmail: email,
        chatId,
        type: "extension_product_context",
        payload: { products },
      },
    });

    await prisma.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Attach product context error:", err);
    return NextResponse.json(
      { error: "Failed to attach product context" },
      { status: 500 }
    );
  }
});
