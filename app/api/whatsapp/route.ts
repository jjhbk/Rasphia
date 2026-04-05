import { NextRequest, NextResponse } from "next/server";
import { processMerchantWhatsAppMessage } from "@/app/lib/whatsapp-orchestrator";
import { sendImage, sendText } from "@/app/lib/whatsapp";

export const runtime = "nodejs";

function isLikelyLlmFailure(message: string) {
  const m = String(message || "").toLowerCase();
  return (
    m.includes("429") ||
    m.includes("quota") ||
    m.includes("rate limit") ||
    m.includes("gemini") ||
    m.includes("openai") ||
    m.includes("generatecontent") ||
    m.includes("model") ||
    m.includes("llm")
  );
}

function buildWhatsAppUsageTemplate() {
  return [
    "*Rasphia Assistant Help*",
    "I hit a temporary AI processing issue. You can continue using these commands:",
    "",
    "*User commands*",
    "1) register userName=Rahul userEmail=rahul@example.com",
    "2) discover products query=table lamp maxPrice=2000",
    "3) shop acme-decor",
    "4) buy productName=Canvas Lamp quantity=2",
    "5) my orders",
    "6) track order orderId=sp_ord_xxx",
    "7) refund orderId=sp_ord_xxx reason=Received damaged item",
    "8) replacement orderId=sp_ord_xxx reason=Wrong size",
    "9) cancel order orderId=sp_ord_xxx reason=Ordered by mistake",
    "",
    "*Merchant commands*",
    "1) register merchant businessName=Acme Decor email=a@b.com addressLine1=... addressLine2=... city=Hyderabad state=Telangana zipCode=500001 locationLink=https://maps.google.com/...",
    "2) add product name=Canvas Lamp category=home price=1499 stockQuantity=20",
    "3) stock query Canvas Lamp",
    "4) stock update productName=Canvas Lamp stockQuantity=0",
    "5) active orders",
    "6) bulk upload help",
    "",
    "Please retry your command now.",
  ].join("\n");
}

type WhatsAppInbound = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        metadata?: {
          display_phone_number?: string;
          phone_number_id?: string;
        };
        messages?: Array<{
          from?: string;
          id?: string;
          type?: string;
          text?: { body?: string };
          image?: { id?: string; caption?: string };
          interactive?: {
            button_reply?: { title?: string; id?: string };
            list_reply?: { title?: string; id?: string };
          };
        }>;
      };
    }>;
  }>;
};

function extractImageCardsFromReply(reply: string) {
  const lines = String(reply || "")
    .split("\n")
    .map((line) => line.trim());
  const cards: Array<{ imageUrl: string; caption: string }> = [];

  for (let i = 0; i < lines.length; i += 1) {
    const imageMatch = /^Image:\s*(https?:\/\/\S+)/i.exec(lines[i]);
    if (!imageMatch) continue;
    const imageUrl = imageMatch[1];
    const title = i > 0 ? lines[i - 1].replace(/^\d+\)\s*/, "").trim() : "";
    const descLine = lines.find((line, idx) => idx > i - 3 && idx < i && /^Description:/i.test(line));
    const linkLine = lines.find((line, idx) => idx > i - 4 && idx < i + 4 && /^Product link:/i.test(line));
    const caption = [title, descLine, linkLine].filter(Boolean).join("\n").slice(0, 900);
    cards.push({ imageUrl, caption });
    if (cards.length >= 3) break;
  }

  return cards;
}

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token &&
    token === process.env.WHATSAPP_VERIFY_TOKEN
  ) {
    return new NextResponse(challenge || "", { status: 200 });
  }

  return NextResponse.json({ error: "Invalid webhook verification" }, { status: 403 });
}

export async function POST(req: NextRequest) {
  try {
    const debug =
      req.nextUrl.searchParams.get("debug") === "1" ||
      process.env.WHATSAPP_WEBHOOK_DEBUG === "1";
    const body = (await req.json()) as WhatsAppInbound;

    const messages =
      body.entry?.flatMap(
        (entry) =>
          entry.changes?.flatMap((c) => c.value?.messages || []) || []
      ) || [];

    let processed = 0;
    let skipped = 0;
    const diagnostics: Array<Record<string, string>> = [];

    for (const message of messages) {
      const parentChange = body.entry
        ?.flatMap((entry) => entry.changes || [])
        .find((c) => (c.value?.messages || []).some((m) => m.id === message.id));
      const recipientDisplayPhone = String(
        parentChange?.value?.metadata?.display_phone_number || ""
      ).trim();
      const recipientPhoneNumberId = String(
        parentChange?.value?.metadata?.phone_number_id || ""
      ).trim();

      const from = String(message.from || "").trim();
      if (!from) {
        skipped += 1;
        diagnostics.push({
          messageId: String(message.id || ""),
          reason: "missing_from",
        });
        continue;
      }

      const text = String(
        message.text?.body ||
          message.interactive?.button_reply?.title ||
          message.interactive?.list_reply?.title ||
          ""
      ).trim();
      const mediaId =
        message.type === "image" ? String(message.image?.id || "").trim() : "";
      const mediaCaption =
        message.type === "image"
          ? String(message.image?.caption || "").trim()
          : "";

      if (!text && !mediaId && !mediaCaption) {
        skipped += 1;
        diagnostics.push({
          messageId: String(message.id || ""),
          from,
          reason: "empty_payload",
          type: String(message.type || ""),
        });
        continue;
      }

      try {
        const reply = await processMerchantWhatsAppMessage({
          fromPhone: from,
          recipientPhone: recipientDisplayPhone || undefined,
          recipientPhoneNumberId: recipientPhoneNumberId || undefined,
          text,
          messageId: message.id,
          mediaId: mediaId || undefined,
          mediaCaption: mediaCaption || undefined,
        });
        const cards = extractImageCardsFromReply(reply);
        for (const card of cards) {
          try {
            await sendImage(from, card.imageUrl, card.caption);
          } catch {
            // Non-blocking; continue with text reply.
          }
        }
        await sendText(from, reply);
        processed += 1;
        diagnostics.push({
          messageId: String(message.id || ""),
          from,
          status: "processed",
          type: String(message.type || ""),
        });
      } catch (err: unknown) {
        const reason = err instanceof Error ? err.message : "unknown_error";
        const likelyLlmFailure = isLikelyLlmFailure(reason);

        if (likelyLlmFailure) {
          try {
            await sendText(from, buildWhatsAppUsageTemplate());
            processed += 1;
            diagnostics.push({
              messageId: String(message.id || ""),
              from,
              status: "fallback_usage_sent",
              reason,
            });
            continue;
          } catch (fallbackErr: unknown) {
            diagnostics.push({
              messageId: String(message.id || ""),
              from,
              status: "fallback_send_failed",
              reason:
                fallbackErr instanceof Error
                  ? fallbackErr.message
                  : "fallback_send_failed",
            });
          }
        }

        diagnostics.push({
          messageId: String(message.id || ""),
          from,
          status: "error",
          reason,
        });
        // Do not fail the entire webhook for a single message failure.
        // Meta retries aggressively on non-2xx responses.
        console.error("[/api/whatsapp] message processing error", {
          messageId: String(message.id || ""),
          from,
          reason,
        });
        continue;
      }
    }

    if (debug) {
      return NextResponse.json(
        { ok: true, received: messages.length, processed, skipped, diagnostics },
        { status: 200 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "WhatsApp webhook failed";
    console.error("[/api/whatsapp] fatal webhook error", { message });
    // Return 200 so Meta does not keep retrying for transient/server-side failures.
    return NextResponse.json({ ok: false, error: message }, { status: 200 });
  }
}
