import { NextRequest, NextResponse } from "next/server";
import { validateWebhookSignature } from "razorpay/dist/utils/razorpay-utils";
import clientPromise from "@/app/lib/mongodb";
import { sendText } from "@/app/lib/whatsapp";

export async function GET(req: NextRequest) {
  // `callback_method: "get"`
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  console.log("Razorpay callback GET event →", params);

  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const payload = await req.text();
  const signature = req.headers.get("x-razorpay-signature") || "";
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET!;

  const valid = validateWebhookSignature(payload, signature, secret);
  if (!valid)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });

  const data = JSON.parse(payload);
  const client = await clientPromise;
  const db = client.db("rasphia");

  if (data.event === "payment_link.paid") {
    const payEntity = data.payload.payment_link.entity;
    const payId = payEntity.payment_id;
    const linkId = payEntity.id;

    // Update the order
    const order = await db
      .collection("orders")
      .findOneAndUpdate(
        { payment_link_id: linkId },
        { $set: { status: "paid", payment_id: payId, verifiedAt: new Date() } },
        { returnDocument: "after" }
      );

    if (order?.value?.customer?.phone) {
      await sendText(
        order.value.customer.phone,
        `Payment received successfully! 🎉\nYour order for *${order.value.product.name}* is confirmed.\nWe'll notify you when it's shipped.`
      );
    }
  }

  return NextResponse.json({ ok: true });
}
