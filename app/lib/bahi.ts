import crypto from "crypto";

export type BahiWebhookMerchant = {
  merchant_id: string;
  business_name: string;
  gstin: string | null;
  upi_id: string;
  address: string;
  email: string;
};

export type BahiWebhookCustomer = {
  name: string;
  email: string;
  phone: string;
};

export type BahiWebhookLineItem = {
  name: string;
  description: string;
  quantity: number;
  unit_price_paise: number;
};

export type BahiWebhookPayload = {
  event_type: "order.completed";
  timestamp: string;
  order_id: string;
  total_amount_paise: number;
  payment_timestamp: string;
  merchant: BahiWebhookMerchant;
  customer: BahiWebhookCustomer;
  line_items: BahiWebhookLineItem[];
};

export type BahiInvoiceResponse = {
  status?: string;
  invoice_number?: string;
  invoice_id?: string;
  pdf_url?: string;
  detail?: string;
};

export type BahiInvoiceRecord = {
  invoice_id?: string;
  merchant_id?: string;
  invoice_number?: string;
  seedhape_order_id?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  total_amount_paise?: number;
  pdf_url?: string | null;
  created_at?: string;
  email_sent_at?: string | null;
};

function normalizeBase(baseUrl: string) {
  const clean = String(baseUrl || "").trim().replace(/\/+$/, "");
  return /\/api$/i.test(clean) ? clean : `${clean}/api`;
}

function signPayload(rawBody: string, secret: string) {
  return crypto
    .createHmac("sha256", String(secret || ""))
    .update(rawBody)
    .digest("hex");
}

function buildDetailMessage(fallback: string, body: unknown) {
  if (!body || typeof body !== "object") return fallback;
  const detail = (body as { detail?: unknown }).detail;
  if (typeof detail === "string" && detail.trim()) return detail.trim();
  return fallback;
}

export async function generateBahiInvoice(input: {
  baseUrl: string;
  webhookSecret: string;
  payload: BahiWebhookPayload;
}) {
  const raw = JSON.stringify(input.payload);
  const base = normalizeBase(input.baseUrl);
  const res = await fetch(`${base}/webhooks/rasphia`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-bahi-signature": signPayload(raw, input.webhookSecret),
    },
    body: raw,
  });

  const json = (await res.json().catch(() => ({}))) as BahiInvoiceResponse;

  if (!res.ok && res.status !== 409) {
    throw new Error(buildDetailMessage(`Bahi invoice generation failed (${res.status})`, json));
  }

  return {
    statusCode: res.status,
    data: json,
  };
}

export async function listBahiInvoices(input: {
  baseUrl: string;
  apiKey: string;
  merchantId: string;
  since?: string;
}) {
  const base = normalizeBase(input.baseUrl);
  const url = new URL(`${base}/invoices/${encodeURIComponent(input.merchantId)}`);
  if (input.since) url.searchParams.set("since", input.since);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "X-API-Key": input.apiKey,
    },
  });

  const json = (await res.json().catch(() => ({}))) as {
    invoices?: BahiInvoiceRecord[];
    detail?: string;
  };

  if (!res.ok) {
    throw new Error(buildDetailMessage(`Bahi invoice tracking fetch failed (${res.status})`, json));
  }

  return Array.isArray(json.invoices) ? json.invoices : [];
}
