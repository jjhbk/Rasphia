function getGlobalSeedhapeBaseUrl() {
  const configured = String(process.env.SEEDHAPE_BASE_URL || "").trim();
  if (!configured) {
    throw new Error("SEEDHAPE_BASE_URL is not configured.");
  }
  return configured;
}

export type SeedhapeOrderStatus =
  | "CREATED"
  | "PENDING"
  | "VERIFIED"
  | "DISPUTED"
  | "RESOLVED"
  | "EXPIRED"
  | "REJECTED";

type SeedhapeApiError = {
  error?: string;
  code?: string;
  message?: string;
  details?: unknown;
  errors?: unknown;
  issues?: unknown;
};

export type CreateSeedhapeOrderInput = {
  amount: number;
  description?: string;
  externalOrderId?: string;
  expectedSenderName?: string;
  customerEmail?: string;
  customerPhone?: string;
  expiresInMinutes?: number;
  metadata?: Record<string, unknown>;
};

export type SeedhapeOrderData = {
  id: string;
  externalOrderId?: string | null;
  amount: number;
  originalAmount: number;
  currency: string;
  description?: string | null;
  status: SeedhapeOrderStatus;
  upiUri: string;
  qrCode: string;
  expiresAt: string;
  createdAt: string;
  verifiedAt?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type SeedhapeOrderStatusResponse = {
  id: string;
  status: SeedhapeOrderStatus;
  amount: number;
  verifiedAt?: string | null;
};

function getSeedhapeConfig() {
  const apiKey = process.env.SEEDHAPE_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("SEEDHAPE_API_KEY is not configured.");
  }
  const baseUrl = normalizeSeedhapeBaseUrl(
    process.env.SEEDHAPE_BASE_URL?.trim() || getGlobalSeedhapeBaseUrl()
  );
  return { apiKey, baseUrl };
}

type SeedhapeRequestConfig = {
  apiKey: string;
  baseUrl?: string;
};

function normalizeSeedhapeBaseUrl(baseUrl: string) {
  const cleaned = String(baseUrl || "").trim() || getGlobalSeedhapeBaseUrl();
  const noTrailingSlash = cleaned.replace(/\/+$/, "");
  // Some merchants saved `.../v1` in settings. We add `/v1/*` in paths below,
  // so strip the version suffix to avoid accidental `/v1/v1/...` 404s.
  return noTrailingSlash.replace(/\/v1$/i, "");
}

async function parseSeedhapeError(res: Response, requestUrl: string) {
  let message = `Seedhape API request failed (${res.status}) at ${requestUrl}`;
  try {
    const json = (await res.json()) as SeedhapeApiError;
    const primary =
      (typeof json?.error === "string" && json.error) ||
      (typeof json?.message === "string" && json.message) ||
      "";
    if (primary) message = `${message}: ${primary}`;
    const details = json?.details ?? json?.errors ?? json?.issues;
    if (details !== undefined) {
      const serialized =
        typeof details === "string" ? details : JSON.stringify(details);
      if (serialized) message = `${message} | details: ${serialized.slice(0, 500)}`;
    }
  } catch {
    const text = await res.text().catch(() => "");
    if (text) message = `${message}: ${text.slice(0, 300)}`;
  }
  return message;
}

function sanitizePhoneForSeedhape(phone?: string) {
  const raw = String(phone || "").trim();
  if (!raw) return undefined;
  const hasPlus = raw.startsWith("+");
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.length < 8 || digits.length > 15) return undefined;
  return hasPlus ? `+${digits}` : digits;
}

function sanitizeEmailForSeedhape(email?: string) {
  const clean = String(email || "").trim();
  if (!clean) return undefined;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return undefined;
  return clean;
}

function sanitizeNameForSeedhape(name?: string) {
  const clean = String(name || "").trim().replace(/\s+/g, " ");
  if (!clean) return undefined;
  if (clean.length < 2) return undefined;
  return clean.slice(0, 100);
}

function sanitizeDescriptionForSeedhape(description?: string) {
  const clean = String(description || "").trim();
  if (!clean) return undefined;
  return clean.slice(0, 100);
}

export async function createSeedhapeOrder(
  input: CreateSeedhapeOrderInput
): Promise<SeedhapeOrderData> {
  const { apiKey, baseUrl } = getSeedhapeConfig();
  return createSeedhapeOrderWithConfig(input, { apiKey, baseUrl });
}

export async function createSeedhapeOrderWithConfig(
  input: CreateSeedhapeOrderInput,
  config: SeedhapeRequestConfig
): Promise<SeedhapeOrderData> {
  const apiKey = String(config.apiKey || "").trim();
  if (!apiKey) throw new Error("Missing SeedhaPe API key.");
  const baseUrl = normalizeSeedhapeBaseUrl(
    String(config.baseUrl || "").trim() || getGlobalSeedhapeBaseUrl()
  );
  const payload: CreateSeedhapeOrderInput = {
    amount: Math.max(100, Math.round(Number(input.amount || 0))),
    ...(sanitizeDescriptionForSeedhape(input.description)
      ? { description: sanitizeDescriptionForSeedhape(input.description) }
      : {}),
    ...(String(input.externalOrderId || "").trim()
      ? { externalOrderId: String(input.externalOrderId).trim().slice(0, 100) }
      : {}),
    ...(sanitizeNameForSeedhape(input.expectedSenderName)
      ? { expectedSenderName: sanitizeNameForSeedhape(input.expectedSenderName) }
      : {}),
    ...(sanitizeEmailForSeedhape(input.customerEmail)
      ? { customerEmail: sanitizeEmailForSeedhape(input.customerEmail) }
      : {}),
    ...(sanitizePhoneForSeedhape(input.customerPhone)
      ? { customerPhone: sanitizePhoneForSeedhape(input.customerPhone) }
      : {}),
    ...(Number.isFinite(Number(input.expiresInMinutes))
      ? { expiresInMinutes: Math.max(1, Math.min(180, Math.round(Number(input.expiresInMinutes)))) }
      : {}),
    ...(input.metadata && typeof input.metadata === "object"
      ? { metadata: input.metadata }
      : {}),
  };

  const requestUrl = `${baseUrl}/v1/orders`;
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  let res = await fetch(requestUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok && res.status === 400) {
    const minimalPayload: CreateSeedhapeOrderInput = {
      amount: payload.amount,
      ...(payload.description ? { description: payload.description } : {}),
      ...(payload.externalOrderId
        ? { externalOrderId: payload.externalOrderId }
        : {}),
      ...(payload.expiresInMinutes
        ? { expiresInMinutes: payload.expiresInMinutes }
        : {}),
    };
    const retried = await fetch(requestUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(minimalPayload),
    });
    if (retried.ok) {
      return (await retried.json()) as SeedhapeOrderData;
    }
    res = retried;
  }

  if (!res.ok) {
    throw new Error(await parseSeedhapeError(res, requestUrl));
  }

  return (await res.json()) as SeedhapeOrderData;
}

export async function getSeedhapeOrderStatus(
  orderId: string
): Promise<SeedhapeOrderStatusResponse> {
  const { apiKey, baseUrl } = getSeedhapeConfig();
  return getSeedhapeOrderStatusWithConfig(orderId, { apiKey, baseUrl });
}

export async function getSeedhapeOrderStatusWithConfig(
  orderId: string,
  config: SeedhapeRequestConfig
): Promise<SeedhapeOrderStatusResponse> {
  const apiKey = String(config.apiKey || "").trim();
  if (!apiKey) throw new Error("Missing SeedhaPe API key.");
  const baseUrl = normalizeSeedhapeBaseUrl(
    String(config.baseUrl || "").trim() || getGlobalSeedhapeBaseUrl()
  );
  const requestUrl = `${baseUrl}/v1/orders/${encodeURIComponent(orderId)}/status`;
  const res = await fetch(
    requestUrl,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    }
  );
  if (!res.ok) {
    throw new Error(await parseSeedhapeError(res, requestUrl));
  }
  return (await res.json()) as SeedhapeOrderStatusResponse;
}

function buildIntentLink(upiUri: string, packageName: string) {
  if (!upiUri.startsWith("upi://")) return "";
  const withoutScheme = upiUri.slice("upi://".length);
  return `intent://${withoutScheme}#Intent;scheme=upi;package=${packageName};end`;
}

export function buildSeedhapePaymentLinks(
  orderId: string,
  upiUri: string,
  baseUrl?: string
) {
  const normalizedBase = normalizeSeedhapeBaseUrl(
    baseUrl || getGlobalSeedhapeBaseUrl()
  );
  return {
    upiUri,
    hostedStatusUrl: `${normalizedBase}/v1/pay/${encodeURIComponent(orderId)}`,
    androidIntents: {
      gpay: buildIntentLink(upiUri, "com.google.android.apps.nbu.paisa.user"),
      phonepe: buildIntentLink(upiUri, "com.phonepe.app"),
      paytm: buildIntentLink(upiUri, "net.one97.paytm"),
      bhim: buildIntentLink(upiUri, "in.org.npci.upiapp"),
    },
  };
}

export function isSeedhapePaidStatus(status: SeedhapeOrderStatus) {
  return status === "VERIFIED" || status === "RESOLVED";
}
