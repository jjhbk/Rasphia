import { NextRequest } from "next/server";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildUpiAppLinks(upiUri: string) {
  if (!upiUri.startsWith("upi://")) {
    return { upi: "", gpay: "", phonepe: "", paytm: "" };
  }
  const pathAndQuery = upiUri.slice("upi://".length);
  return {
    upi: upiUri,
    gpay: `tez://${pathAndQuery}`,
    phonepe: `phonepe://${pathAndQuery}`,
    paytm: `paytmmp://${pathAndQuery}`,
  };
}

export async function GET(req: NextRequest) {
  const upi = String(req.nextUrl.searchParams.get("upi") || "").trim();
  const orderId = String(req.nextUrl.searchParams.get("orderId") || "").trim();
  const links = buildUpiAppLinks(upi);

  if (!links.upi) {
    return new Response("Invalid UPI link", { status: 400 });
  }

  const orderLabel = orderId ? `Order ${escapeHtml(orderId)}` : "Payment";
  const safeUpi = escapeHtml(links.upi);
  const safeGpay = escapeHtml(links.gpay);
  const safePhonepe = escapeHtml(links.phonepe);
  const safePaytm = escapeHtml(links.paytm);

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Open UPI Payment</title>
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 0; background: #f8f7f4; color: #1f2937; }
    .wrap { max-width: 560px; margin: 0 auto; padding: 24px 16px; }
    .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 16px; box-shadow: 0 8px 24px rgba(0,0,0,0.06); }
    h1 { font-size: 20px; margin: 0 0 8px; }
    p { margin: 0 0 12px; color: #4b5563; }
    .btn { display: block; text-decoration: none; text-align: center; border-radius: 12px; padding: 12px 14px; font-weight: 600; margin-top: 10px; }
    .primary { background: #111827; color: #fff; }
    .secondary { background: #fff; color: #111827; border: 1px solid #d1d5db; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; word-break: break-all; background: #f9fafb; border: 1px solid #e5e7eb; padding: 8px; border-radius: 8px; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <h1>Pay ${orderLabel}</h1>
      <p>Choose a UPI app to continue payment.</p>

      <a class="btn primary" href="${safeUpi}">Choose Any UPI App</a>
      <a class="btn secondary" href="${safeGpay}">Open Google Pay</a>
      <a class="btn secondary" href="${safePhonepe}">Open PhonePe</a>
      <a class="btn secondary" href="${safePaytm}">Open Paytm</a>

      <p style="margin-top:14px;">Fallback UPI URL</p>
      <div class="mono">${safeUpi}</div>
    </div>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

