import { Prisma } from "@prisma/client";
import { prisma } from "@/app/lib/prisma";

type InvoiceEmailSendResult = {
  sent: boolean;
  skipped?: "not_configured" | "missing_recipient" | "missing_invoice";
  providerId?: string | null;
};

type InvoiceEmailAttachment = {
  filename: string;
  content: Buffer;
};

function getInvoiceEmailConfig() {
  const apiKey = String(process.env.RESEND_API_KEY || "").trim();
  const from = String(process.env.INVOICE_EMAIL_FROM || "").trim();
  const replyTo = String(process.env.INVOICE_EMAIL_REPLY_TO || "").trim();
  const baseUrl =
    String(process.env.NEXT_PUBLIC_BASE_URL || "").trim() ||
    String(process.env.NEXTAUTH_URL || "").trim();

  return {
    apiKey,
    from,
    replyTo: replyTo || undefined,
    baseUrl: baseUrl.replace(/\/+$/, ""),
  };
}

export function isInvoiceEmailConfigured() {
  const { apiKey, from } = getInvoiceEmailConfig();
  return Boolean(apiKey && from);
}

function escapeHtml(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatCurrency(amount: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

async function sendResendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachment?: InvoiceEmailAttachment;
}) {
  const config = getInvoiceEmailConfig();
  if (!config.apiKey || !config.from) {
    return { sent: false as const, skipped: "not_configured" as const };
  }

  const payload: Record<string, unknown> = {
    from: config.from,
    to: [input.to],
    subject: input.subject,
    html: input.html,
    text: input.text,
  };
  if (input.attachment) {
    payload.attachments = [
      {
        filename: input.attachment.filename,
        content: input.attachment.content.toString("base64"),
      },
    ];
  }
  if (config.replyTo) {
    payload.reply_to = config.replyTo;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const json = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
  if (!res.ok) {
    throw new Error(
      `Invoice email send failed (${res.status})${json.message ? `: ${json.message}` : ""}`
    );
  }

  return {
    sent: true as const,
    providerId: typeof json.id === "string" ? json.id : null,
  };
}

export async function sendInvoiceEmailForOrder(
  orderId: string,
  options?: { force?: boolean; attachment?: InvoiceEmailAttachment }
): Promise<InvoiceEmailSendResult> {
  const order = await prisma.order.findUnique({
    where: { orderId },
    select: {
      id: true,
      orderId: true,
      amount: true,
      currency: true,
      invoiceId: true,
      invoiceNumber: true,
      invoicePdfUrl: true,
      invoiceGeneratedAt: true,
      statusHistory: true,
      customer: true,
      merchantId: true,
    },
  });

  if (!order?.invoiceNumber) {
    return { sent: false, skipped: "missing_invoice" };
  }

  const customer = (order.customer || {}) as {
    name?: string;
    email?: string;
  };
  const to = String(customer.email || "").trim();
  if (!to) {
    return { sent: false, skipped: "missing_recipient" };
  }

  if (!isInvoiceEmailConfigured()) {
    return { sent: false, skipped: "not_configured" };
  }

  const statusHistory = Array.isArray(order.statusHistory)
    ? (order.statusHistory as Array<Record<string, unknown>>)
    : [];
  const alreadySent = statusHistory.some(
    (entry) =>
      String(entry.status || "").trim() === "invoice_emailed" &&
      String(entry.note || "").includes(order.invoiceNumber || "")
  );
  if (alreadySent && !options?.force) {
    return { sent: true, providerId: null };
  }

  const config = getInvoiceEmailConfig();
  const merchant = order.merchantId
    ? await prisma.merchant.findUnique({
        where: { id: order.merchantId },
        select: {
          name: true,
          email: true,
        },
      })
    : null;
  const invoiceUrl =
    order.invoicePdfUrl ||
    (config.baseUrl && order.invoiceId
      ? `${config.baseUrl}/api/invoices/${encodeURIComponent(order.invoiceId)}`
      : "");
  const merchantName = merchant?.name || "Rasphia Merchant";
  const customerName = String(customer.name || "Customer").trim() || "Customer";
  const amountText = formatCurrency(Number(order.amount || 0), order.currency || "INR");
  const subject = `Your invoice ${order.invoiceNumber} from ${merchantName}`;

  const safeCustomer = escapeHtml(customerName);
  const safeMerchant = escapeHtml(merchantName);
  const safeInvoiceNumber = escapeHtml(order.invoiceNumber || "");
  const safeAmount = escapeHtml(amountText);
  const safeInvoiceUrl = escapeHtml(invoiceUrl);

  const html = `<!doctype html>
<html>
  <body style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.5;">
    <p>Hi ${safeCustomer},</p>
    <p>Your order has been invoiced by <strong>${safeMerchant}</strong>.</p>
    <p><strong>Invoice number:</strong> ${safeInvoiceNumber}<br />
    <strong>Order total:</strong> ${safeAmount}</p>
    ${
      safeInvoiceUrl
        ? `<p><a href="${safeInvoiceUrl}" style="display:inline-block;padding:10px 14px;background:#111827;color:#ffffff;text-decoration:none;border-radius:8px;">View invoice</a></p>`
        : ""
    }
    <p>If you have any questions, reply to this email.</p>
  </body>
</html>`;

  const text = [
    `Hi ${customerName},`,
    "",
    `Your order has been invoiced by ${merchantName}.`,
    `Invoice number: ${order.invoiceNumber}`,
    `Order total: ${amountText}`,
    invoiceUrl ? `View invoice: ${invoiceUrl}` : "",
    "",
    "If you have any questions, reply to this email.",
  ]
    .filter(Boolean)
    .join("\n");

  const result = await sendResendEmail({
    to,
    subject,
    html,
    text,
    attachment: options?.attachment,
  });

  if (!result.sent) {
    return result;
  }

  const nextStatusHistory = [
    ...statusHistory,
    {
      status: "invoice_emailed",
      note: `Invoice emailed (${order.invoiceNumber})`,
      by: "invoice_email",
      at: new Date().toISOString(),
      recipient: to,
      providerId: result.providerId || null,
    },
  ];

  await prisma.order.update({
    where: { id: order.id },
    data: {
      statusHistory: nextStatusHistory as Prisma.InputJsonValue,
      updatedAt: new Date(),
    },
  });

  return result;
}
