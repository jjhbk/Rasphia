import { Prisma } from "@prisma/client";
import { encryptSecret } from "@/app/lib/secret-crypto";

const META_GRAPH_VERSION = process.env.META_GRAPH_API_VERSION || "v25.0";
const META_APP_ID = process.env.NEXT_PUBLIC_META_APP_ID || "";
const META_APP_SECRET = process.env.META_APP_SECRET || "";
const META_REDIRECT_URI = process.env.META_EMBEDDED_SIGNUP_REDIRECT_URI || "";

type MetaGraphRecord = Record<string, unknown>;

export type MetaEmbeddedSignupResult = {
  accessTokenPlain: string;
  accessTokenEncrypted: string;
  tokenType: string;
  expiresIn: number | null;
  graphVersion: string;
  grantedAt: string;
  profile: {
    id: string;
    name: string;
  } | null;
  business: {
    id: string;
    name: string;
  } | null;
  whatsapp: {
    wabaId: string;
    wabaName: string;
    phoneNumberId: string;
    displayPhoneNumber: string;
    verifiedName: string;
  } | null;
  instagram: {
    accountId: string;
    username: string;
    pageId: string;
    pageName: string;
  } | null;
  raw: {
    profile: MetaGraphRecord | null;
    businesses: MetaGraphRecord[];
  };
};

function requireMetaConfig() {
  if (!META_APP_ID || !META_APP_SECRET) {
    throw new Error(
      "Meta Embedded Signup is not configured. Set NEXT_PUBLIC_META_APP_ID and META_APP_SECRET."
    );
  }
}

async function parseJsonSafe(res: Response) {
  try {
    return (await res.json()) as MetaGraphRecord;
  } catch {
    return null;
  }
}

async function fetchGraph(path: string, accessToken: string, init?: RequestInit) {
  const url = new URL(`https://graph.facebook.com/${META_GRAPH_VERSION}${path}`);
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await parseJsonSafe(res);
    throw new Error(
      `Meta Graph request failed (${res.status}) for ${path}: ${JSON.stringify(body)}`
    );
  }

  return (await res.json()) as MetaGraphRecord;
}

async function exchangeCodeForAccessToken(code: string) {
  requireMetaConfig();

  const url = new URL(`https://graph.facebook.com/${META_GRAPH_VERSION}/oauth/access_token`);
  url.searchParams.set("client_id", META_APP_ID);
  url.searchParams.set("client_secret", META_APP_SECRET);
  url.searchParams.set("code", code);
  if (META_REDIRECT_URI) {
    url.searchParams.set("redirect_uri", META_REDIRECT_URI);
  }

  const res = await fetch(url, { method: "GET", cache: "no-store" });
  if (!res.ok) {
    const body = await parseJsonSafe(res);
    throw new Error(
      `Meta code exchange failed (${res.status}): ${JSON.stringify(body)}`
    );
  }

  const data = (await res.json()) as {
    access_token?: string;
    token_type?: string;
    expires_in?: number;
  };

  if (!String(data.access_token || "").trim()) {
    throw new Error("Meta code exchange succeeded without an access token.");
  }

  return {
    accessToken: String(data.access_token || "").trim(),
    tokenType: String(data.token_type || "bearer").trim() || "bearer",
    expiresIn:
      typeof data.expires_in === "number" && Number.isFinite(data.expires_in)
        ? data.expires_in
        : null,
  };
}

function firstString(input: unknown, fallback = "") {
  return String(input || "").trim() || fallback;
}

function asArray(input: unknown) {
  return Array.isArray(input) ? input : [];
}

function pickFirstBusiness(rawBusinesses: MetaGraphRecord[]) {
  for (const business of rawBusinesses) {
    const businessId = firstString(business.id);
    const businessName = firstString(business.name);
    const ownedWabas = asArray(business.owned_whatsapp_business_accounts);
    const ownedPages = asArray(business.owned_pages);

    let whatsapp: MetaEmbeddedSignupResult["whatsapp"] = null;
    for (const item of ownedWabas) {
      const waba = item as MetaGraphRecord;
      const phoneNumbers = asArray(waba.phone_numbers);
      const phone = (phoneNumbers[0] || {}) as MetaGraphRecord;
      if (!firstString(waba.id) && !firstString(phone.id)) continue;

      whatsapp = {
        wabaId: firstString(waba.id),
        wabaName: firstString(waba.name),
        phoneNumberId: firstString(phone.id),
        displayPhoneNumber: firstString(phone.display_phone_number),
        verifiedName: firstString(phone.verified_name),
      };
      break;
    }

    let instagram: MetaEmbeddedSignupResult["instagram"] = null;
    for (const pageItem of ownedPages) {
      const page = pageItem as MetaGraphRecord;
      const ig = (page.instagram_business_account || {}) as MetaGraphRecord;
      if (!firstString(ig.id)) continue;

      instagram = {
        accountId: firstString(ig.id),
        username: firstString(ig.username),
        pageId: firstString(page.id),
        pageName: firstString(page.name),
      };
      break;
    }

    if (businessId || whatsapp || instagram) {
      return {
        business: businessId || businessName ? { id: businessId, name: businessName } : null,
        whatsapp,
        instagram,
      };
    }
  }

  return {
    business: null,
    whatsapp: null,
    instagram: null,
  };
}

async function loadBusinessAssets(accessToken: string) {
  const profile = await fetchGraph("/me?fields=id,name", accessToken);

  const businessQueries = [
    "/me/businesses?fields=id,name,verification_status,owned_whatsapp_business_accounts{id,name,phone_numbers{id,display_phone_number,verified_name,code_verification_status}},owned_pages{id,name,instagram_business_account{id,username,name}}",
    "/me/businesses?fields=id,name,owned_whatsapp_business_accounts{id,name,phone_numbers{id,display_phone_number,verified_name}},owned_pages{id,name,instagram_business_account{id,username}}",
  ];

  const businessResponses: MetaGraphRecord[] = [];
  for (const query of businessQueries) {
    try {
      const response = await fetchGraph(query, accessToken);
      const data = asArray(response.data).filter(
        (item): item is MetaGraphRecord =>
          Boolean(item && typeof item === "object" && !Array.isArray(item))
      );
      if (data.length) {
        businessResponses.push(...data);
        break;
      }
    } catch {
      continue;
    }
  }

  const selected = pickFirstBusiness(businessResponses);

  return {
    profile: {
      id: firstString(profile.id),
      name: firstString(profile.name),
    },
    businesses: businessResponses,
    selected,
  };
}

export async function exchangeMetaEmbeddedSignupCode(
  code: string
): Promise<MetaEmbeddedSignupResult> {
  const normalizedCode = String(code || "").trim();
  if (!normalizedCode) {
    throw new Error("Missing Meta Embedded Signup code.");
  }

  const token = await exchangeCodeForAccessToken(normalizedCode);
  const assets = await loadBusinessAssets(token.accessToken);
  const grantedAt = new Date().toISOString();

  return {
    accessTokenPlain: token.accessToken,
    accessTokenEncrypted: encryptSecret(token.accessToken),
    tokenType: token.tokenType,
    expiresIn: token.expiresIn,
    graphVersion: META_GRAPH_VERSION,
    grantedAt,
    profile:
      assets.profile.id || assets.profile.name
        ? {
            id: assets.profile.id,
            name: assets.profile.name,
          }
        : null,
    business: assets.selected.business,
    whatsapp: assets.selected.whatsapp,
    instagram: assets.selected.instagram,
    raw: {
      profile: {
        id: assets.profile.id,
        name: assets.profile.name,
      },
      businesses: assets.businesses,
    },
  };
}

export function mergeMerchantMetaEmbeddedSignup(
  metadata: Prisma.JsonValue | null,
  input: MetaEmbeddedSignupResult
) {
  const base =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? ({ ...(metadata as Record<string, unknown>) } as Record<string, unknown>)
      : {};

  base.metaEmbeddedSignup = {
    status: "connected",
    grantedAt: input.grantedAt,
    graphVersion: input.graphVersion,
    tokenType: input.tokenType,
    expiresIn: input.expiresIn,
    accessTokenEncrypted: input.accessTokenEncrypted,
    profile: input.profile,
    business: input.business,
    whatsapp: input.whatsapp,
    instagram: input.instagram,
    raw: input.raw,
  };

  return base as Prisma.InputJsonValue;
}

export async function subscribeAppToWabaIfPossible(
  accessToken: string,
  wabaId: string
) {
  const normalizedWabaId = String(wabaId || "").trim();
  if (!normalizedWabaId) return;

  const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${encodeURIComponent(
    normalizedWabaId
  )}/subscribed_apps`;

  try {
    await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });
  } catch {
    // Non-blocking.
  }
}
