// 🚨 MUST be the first lines of the file — before imports
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "bom1"; // Primary region
export const region = "bom1"; // Hard pin execution to BOM

// ----------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";
import { sendText, sendProductList, sendButtonLink } from "@/app/lib/whatsapp";
import clientPromise from "@/app/lib/mongodb";

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

// ----------------------------------------------------------
// 🟢 GET — Meta Webhook Verification
// ----------------------------------------------------------
export async function GET(req: NextRequest) {
  const url = req.nextUrl;

  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  console.log("VERIFY_TOKEN:", VERIFY_TOKEN);
  console.log("TOKEN FROM META:", token);

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new Response(challenge ?? "", { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

// ----------------------------------------------------------
// 🟣 POST — Handle incoming WhatsApp messages
// ----------------------------------------------------------
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false });

  try {
    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];

    if (!message) return NextResponse.json({ ok: true });

    const from = message.from;
    const type = message.type;

    // ----------------------------------------------------------
    // 🔵 Case 1: User selected an item from the interactive list
    // ----------------------------------------------------------
    if (type === "interactive") {
      const interactive = message.interactive;
      if (interactive.type === "list_reply") {
        const selectedId = interactive.list_reply.id;

        const client = await clientPromise;
        const db = client.db("rasphia");

        const session = await db
          .collection("whatsapp_sessions")
          .findOne({ phone: from });

        const sessionData = session?.data || {};
        const selectedProduct = (sessionData.products || []).find(
          (p: any) => p.id === selectedId
        );

        if (!selectedProduct) {
          await sendText(
            from,
            "Sorry! I couldn't find that product. Please try again."
          );
          return NextResponse.json({ ok: true });
        }

        // Build customer info
        const customer = {
          phone: from,
          email: sessionData.customer?.email || `${from}@whatsapp.local`,
          name: sessionData.customer?.name || "WhatsApp Customer",
          address: sessionData.customer?.address || "",
        };

        const origin = req.nextUrl.origin;
        const createResp = await fetch(`${origin}/api/create-payment-link`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ product: selectedProduct, customer }),
        }).then((r) => r.json());

        if (createResp?.error) {
          await sendText(from, "Couldn't create order — please try again.");
          return NextResponse.json({ ok: true });
        }

        const paymentLink = createResp.shortUrl;

        // Send payment button
        if (paymentLink) {
          await sendButtonLink(
            from,
            `You're ordering: ${selectedProduct.name} — ₹${selectedProduct.price}\nTap to pay securely.`,
            "Pay Now",
            paymentLink
          );

          await db
            .collection("orders")
            .updateOne(
              { order_id: createResp.id || createResp.order_id },
              { $set: { whatsapp: { phone: from }, updatedAt: new Date() } }
            );

          return NextResponse.json({ ok: true });
        }

        // Fallback if no paymentLink
        await sendText(
          from,
          `Order created! Please pay here: ${origin}/checkout?order_id=${
            createResp.id || createResp.order_id
          }`
        );

        return NextResponse.json({ ok: true });
      }
    }

    // ----------------------------------------------------------
    // 🔴 Case 2: Handle normal text messages → call curate
    // ----------------------------------------------------------
    const text = message.text?.body || "";
    const origin = req.nextUrl.origin;

    const curateResp = await fetch(`${origin}/api/curate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatHistory: [{ author: "user", text }] }),
    }).then((r) => r.json());

    if (curateResp?.error) {
      await sendText(
        from,
        "I couldn't find anything for that. Could you rephrase?"
      );
      return NextResponse.json({ ok: true });
    }

    const products = (curateResp.products || [])
      .slice(0, 8)
      .map((p: any, i: number) => ({
        id: p._id?.toString ? p._id.toString() : `${p.name}_${i}`,
        name: p.name,
        subtitle: p.brand ? `${p.brand} • ₹${p.price}` : `₹${p.price}`,
        price: p.price,
        imageUrl: p.imageUrl,
        raw: p,
      }));

    if (!products.length) {
      await sendText(
        from,
        curateResp.text || "I couldn't find products. Tell me more!"
      );
      return NextResponse.json({ ok: true });
    }

    // Save session
    const client = await clientPromise;
    const db = client.db("rasphia");
    await db.collection("whatsapp_sessions").updateOne(
      { phone: from },
      {
        $set: {
          data: { products, lastUserMessage: text },
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    // Send WhatsApp Product List
    await sendProductList(
      from,
      "Recommended for you",
      curateResp.text || "Here are some great picks — tap to choose:",
      products
    );

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("whatsapp webhook error", err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
