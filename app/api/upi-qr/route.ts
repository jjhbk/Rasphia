import { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";

function extractQrPayload(customer: unknown) {
  if (!customer || typeof customer !== "object" || Array.isArray(customer)) {
    return "";
  }
  const obj = customer as Record<string, unknown>;
  return String(obj.paymentQrCode || obj.qrCode || "").trim();
}

function decodeBase64Image(payload: string) {
  const clean = payload.trim();
  const dataUriMatch = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/i.exec(clean);
  if (dataUriMatch) {
    return {
      mimeType: dataUriMatch[1].toLowerCase(),
      buffer: Buffer.from(dataUriMatch[2], "base64"),
    };
  }

  if (/^[A-Za-z0-9+/=\s]+$/.test(clean)) {
    return {
      mimeType: "image/png",
      buffer: Buffer.from(clean.replace(/\s+/g, ""), "base64"),
    };
  }

  return null;
}

export async function GET(req: NextRequest) {
  try {
    const orderId = String(req.nextUrl.searchParams.get("orderId") || "").trim();
    if (!orderId) return new Response("Missing orderId", { status: 400 });

    const order = await prisma.order.findUnique({
      where: { orderId },
      select: { orderId: true, customer: true },
    });
    if (!order) return new Response("Order not found", { status: 404 });

    const qrPayload = extractQrPayload(order.customer);
    if (!qrPayload) return new Response("QR not available", { status: 404 });

    if (/^https?:\/\//i.test(qrPayload)) {
      const upstream = await fetch(qrPayload, { method: "GET" });
      if (!upstream.ok) return new Response("Failed to load QR image", { status: 502 });
      const bytes = await upstream.arrayBuffer();
      const contentType = upstream.headers.get("content-type") || "image/png";
      return new Response(bytes, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `inline; filename=\"${order.orderId}.png\"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const decoded = decodeBase64Image(qrPayload);
    if (!decoded || !decoded.buffer.length) {
      return new Response("Unsupported QR payload", { status: 422 });
    }

    return new Response(decoded.buffer, {
      status: 200,
      headers: {
        "Content-Type": decoded.mimeType,
        "Content-Disposition": `inline; filename=\"${order.orderId}.png\"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response("Failed to render QR image", { status: 500 });
  }
}

