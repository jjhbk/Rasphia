// app/lib/whatsapp.ts
import fetch from "node-fetch";

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN!;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!;

export async function sendText(to: string, text: string) {
  const url = `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`;
  await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      text: { body: text },
    }),
  });
}

// Send an interactive list of product options (max 10 per list)
export async function sendProductList(
  to: string,
  title: string,
  bodyText: string,
  products: { id: string; name: string; subtitle?: string }[]
) {
  const url = `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`;
  const sections = [
    {
      title,
      rows: products.map((p, idx) => ({
        id: p.id,
        title: p.name,
        description: p.subtitle || "",
      })),
    },
  ];
  await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "list",
        header: { type: "text", text: title },
        body: { text: bodyText },
        footer: { text: "Tap any item to pick it." },
        action: { button: "View options", sections },
      },
    }),
  });
}

// Send a message with a single button (useful to send payment link as button)
export async function sendButtonLink(
  to: string,
  textBody: string,
  buttonText: string,
  urlLink: string
) {
  const url = `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`;
  await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: textBody },
        action: {
          buttons: [
            {
              type: "url",
              url: urlLink,
              title: buttonText,
            },
          ],
        },
      },
    }),
  });
}
