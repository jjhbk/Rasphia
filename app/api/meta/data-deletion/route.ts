import { randomBytes, createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/app/lib/prisma";

export const runtime = "nodejs";

type SignedRequestPayload = {
  algorithm?: string;
  expires?: number;
  issued_at?: number;
  user_id?: string;
  [key: string]: unknown;
};

function base64UrlDecode(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(`${normalized}${padding}`, "base64");
}

function resolveAppSecret() {
  return (
    process.env.FACEBOOK_APP_SECRET ||
    process.env.META_APP_SECRET ||
    process.env.APP_SECRET ||
    ""
  )
    .trim();
}

function resolvePublicBaseUrl(req: NextRequest) {
  const configured =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXTAUTH_URL ||
    process.env.RASPHIA_BASE_URL ||
    "";
  const base = String(configured).trim().replace(/\/+$/, "");
  if (base) return base;
  return req.nextUrl.origin;
}

function parseSignedRequest(signedRequest: string, appSecret: string) {
  const [encodedSig, encodedPayload] = String(signedRequest || "").split(".", 2);
  if (!encodedSig || !encodedPayload) {
    throw new Error("Invalid signed_request format.");
  }

  const providedSig = base64UrlDecode(encodedSig);
  const expectedSig = createHmac("sha256", appSecret).update(encodedPayload).digest();

  if (
    providedSig.length !== expectedSig.length ||
    !timingSafeEqual(providedSig, expectedSig)
  ) {
    throw new Error("Invalid signed_request signature.");
  }

  const payload = JSON.parse(
    base64UrlDecode(encodedPayload).toString("utf8")
  ) as SignedRequestPayload;

  if (String(payload.algorithm || "").toUpperCase() !== "HMAC-SHA256") {
    throw new Error("Unsupported signed_request algorithm.");
  }

  const userId = String(payload.user_id || "").trim();
  if (!userId) {
    throw new Error("signed_request is missing user_id.");
  }

  return { payload, userId };
}

async function extractSignedRequest(req: NextRequest) {
  const contentType = String(req.headers.get("content-type") || "").toLowerCase();

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const raw = await req.text();
    return new URLSearchParams(raw).get("signed_request") || "";
  }

  if (contentType.includes("application/json")) {
    const json = (await req.json()) as { signed_request?: string };
    return String(json.signed_request || "");
  }

  const raw = await req.text();
  if (!raw) return "";

  const params = new URLSearchParams(raw);
  const maybeParam = params.get("signed_request");
  if (maybeParam) return maybeParam;

  return raw.trim();
}

function generateConfirmationCode() {
  return `FBDEL${randomBytes(6).toString("hex").toUpperCase()}`;
}

async function deleteFacebookLinkedData(appScopedUserId: string) {
  const allMatchingAccounts = await prisma.account.findMany({
    where: { providerAccountId: appScopedUserId },
    select: { id: true, userId: true, provider: true },
  });

  const facebookAccounts = allMatchingAccounts.filter((account) =>
    String(account.provider || "").toLowerCase().includes("facebook")
  );

  if (!facebookAccounts.length) {
    return {
      matchedAccounts: 0,
      deletedUsers: 0,
      deletedProfiles: 0,
      deletedPersonas: 0,
      deletedChats: 0,
      deletedAnalyses: 0,
    };
  }

  await prisma.account.deleteMany({
    where: {
      id: {
        in: facebookAccounts.map((account) => account.id),
      },
    },
  });

  let deletedUsers = 0;
  let deletedProfiles = 0;
  let deletedPersonas = 0;
  let deletedChats = 0;
  let deletedAnalyses = 0;

  const uniqueUserIds = [...new Set(facebookAccounts.map((account) => account.userId))];

  for (const userId of uniqueUserIds) {
    const remainingAccounts = await prisma.account.count({ where: { userId } });
    if (remainingAccounts > 0) continue;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) continue;

    const email = String(user.email || "").trim();

    if (email) {
      const [profileDelete, personaDelete, chatDelete, analysisDelete] =
        await prisma.$transaction([
          prisma.userProfile.deleteMany({ where: { email } }),
          prisma.userPersona.deleteMany({ where: { email } }),
          prisma.chat.deleteMany({ where: { userEmail: email } }),
          prisma.analysis.deleteMany({ where: { userEmail: email } }),
        ]);

      deletedProfiles += profileDelete.count;
      deletedPersonas += personaDelete.count;
      deletedChats += chatDelete.count;
      deletedAnalyses += analysisDelete.count;
    }

    await prisma.user.delete({ where: { id: user.id } });
    deletedUsers += 1;
  }

  return {
    matchedAccounts: facebookAccounts.length,
    deletedUsers,
    deletedProfiles,
    deletedPersonas,
    deletedChats,
    deletedAnalyses,
  };
}

export async function POST(req: NextRequest) {
  try {
    const appSecret = resolveAppSecret();
    if (!appSecret) {
      return NextResponse.json(
        { error: "App secret is not configured." },
        { status: 500 }
      );
    }

    const signedRequest = await extractSignedRequest(req);
    if (!signedRequest) {
      return NextResponse.json(
        { error: "signed_request is required." },
        { status: 400 }
      );
    }

    const { payload, userId } = parseSignedRequest(signedRequest, appSecret);

    const confirmationCode = generateConfirmationCode();
    const deletionSummary = await deleteFacebookLinkedData(userId);

    await prisma.analysis.create({
      data: {
        analysisId: confirmationCode,
        type: "facebook_data_deletion_request",
        payload: {
          source: "meta_data_deletion_callback",
          status: "received",
          appScopedUserId: userId,
          requestPayload: payload as unknown as Prisma.InputJsonValue,
          deletionSummary,
          receivedAt: new Date().toISOString(),
        },
      },
    });

    const statusUrl = `${resolvePublicBaseUrl(req)}/data-deletion/status/${confirmationCode}`;

    return NextResponse.json({
      url: statusUrl,
      confirmation_code: confirmationCode,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Callback handling failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
