import { NextRequest, NextResponse } from "next/server";
import { processMerchantWhatsAppMessage } from "@/app/lib/whatsapp-orchestrator";
import { sendText } from "@/app/lib/whatsapp";

export const runtime = "nodejs";

type WhatsAppInbound = {
  entry?: Array<{
    changes?: Array<{
      value?: {
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
          text,
          messageId: message.id,
          mediaId: mediaId || undefined,
          mediaCaption: mediaCaption || undefined,
        });
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
        diagnostics.push({
          messageId: String(message.id || ""),
          from,
          status: "error",
          reason,
        });
        if (!debug) {
          throw err;
        }
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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
