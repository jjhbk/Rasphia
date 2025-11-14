// app/api/whatsapp/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sendText, sendProductList, sendButtonLink } from "@/app/lib/whatsapp";
import clientPromise from "@/app/lib/mongodb";

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

export async function GET(req: NextRequest) {
  // Webhook verification (Meta)
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const mode = params["hub.mode"];
  const token = params["hub.verify_token"];
  const challenge = params["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  } else {
    return NextResponse.json({ status: "failed" }, { status: 403 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false });

  try {
    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];
    if (!message) return NextResponse.json({ ok: true }); // keep alive for other change types

    const from = message.from; // user phone number
    const type = message.type;

    // 1) If this is an interactive list selection
    if (type === "interactive") {
      const interactive = message.interactive;
      if (interactive.type === "list_reply") {
        const selectedId = interactive.list_reply.id; // this is product id we sent earlier
        // load session to find full product metadata
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
            "Sorry I couldn't find that product in our session. Can you ask again?"
          );
          return NextResponse.json({ ok: true });
        }

        // Create order (call your create-order route; expects product + customer)
        // For WhatsApp flow we may have only phone number; ask for email if not present OR create lightweight customer
        const customer = {
          phone: from,
          email: sessionData.customer?.email || `${from}@whatsapp.local`,
          name: sessionData.customer?.name || "WhatsApp Customer",
          address: sessionData.customer?.address || "",
        };

        const origin = req.nextUrl.origin;
        const createResp = await fetch(`${origin}/api/create-payment-link`, {
          method: "POST",
          body: JSON.stringify({ product: selectedProduct, customer }),
          headers: { "Content-Type": "application/json" },
        }).then((r) => r.json());

        if (createResp?.error) {
          await sendText(from, "Couldn't create order — please try again.");
          return NextResponse.json({ ok: true });
        }

        // If create-order returns a Razorpay order object, we want to generate a payment link.
        // Quick path: if create-order returns order.short_url (payment link) use it.
        // If not, create a small payment link here using Razorpay REST API (server-side).
        //let paymentLink = createResp.short_url || null;
        const paymentLink = createResp.shortUrl;

        // If no short_url, build a Razorpay paymentLink using /api/create-payment-link or use the order.id in frontend checkout

        // Send payment link as button (interactive)
        if (paymentLink) {
          await sendButtonLink(
            from,
            `You're ordering: ${selectedProduct.name} — ₹${selectedProduct.price}\nTap to pay securely.`,
            "Pay Now",
            paymentLink
          );

          // Update session / orders collection with whatsapp_phone etc (optional)
          await db
            .collection("orders")
            .updateOne(
              { order_id: createResp.id || createResp.order_id },
              { $set: { whatsapp: { phone: from }, updatedAt: new Date() } }
            );
          return NextResponse.json({ ok: true });
        } else {
          await sendText(
            from,
            `Order created — order id ${
              createResp.id || createResp.order_id
            }. Please open your checkout to pay: ${origin}/checkout?order_id=${
              createResp.id || createResp.order_id
            }`
          );
          return NextResponse.json({ ok: true });
        }
      }
    }

    // 2) Otherwise treat as plain text — call /api/curate to get recommendations
    const text = message.text?.body || "";
    const origin = req.nextUrl.origin;
    // Call your curate route (pass chatHistory minimal)
    const curateResp = await fetch(`${origin}/api/curate`, {
      method: "POST",
      body: JSON.stringify({ chatHistory: [{ author: "user", text }] }),
      headers: { "Content-Type": "application/json" },
    }).then((r) => r.json());

    if (curateResp?.error) {
      await sendText(
        from,
        "Sorry — I couldn't find anything right now. Could you rephrase?"
      );
      return NextResponse.json({ ok: true });
    }

    // curateResp.products contains Product[] from your route (we used that response shape earlier)
    const products = (curateResp.products || [])
      .slice(0, 8)
      .map((p: any, i: number) => ({
        id: p._id?.toString ? p._id.toString() : String(p.name + "_" + i),
        name: p.name,
        subtitle: p.brand ? `${p.brand} • ₹${p.price}` : `₹${p.price}`,
        price: p.price,
        imageUrl: p.imageUrl,
        raw: p,
      }));

    if (!products.length) {
      await sendText(
        from,
        curateResp.text ||
          "I couldn't find products for that. Can you tell me a bit more?"
      );
      return NextResponse.json({ ok: true });
    }

    // Save session (products list + lastUserMessage) so we can resolve selection later
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

    // Send interactive list
    await sendProductList(
      from,
      "Recommended for you",
      curateResp.text || "Here are a few picks — tap one to buy",
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
