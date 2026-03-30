import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { authGuard } from "@/app/lib/auth-guard";
import { prisma } from "@/app/lib/prisma";
import { defaultPersona } from "@/app/utils/defaultPersona";

function deepMerge(
  target: Record<string, unknown>,
  patch: Record<string, unknown>
) {
  const merged: Record<string, unknown> = { ...target };
  for (const [key, value] of Object.entries(patch)) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      typeof merged[key] === "object" &&
      merged[key] !== null &&
      !Array.isArray(merged[key])
    ) {
      merged[key] = deepMerge(
        merged[key] as Record<string, unknown>,
        value as Record<string, unknown>
      );
    } else {
      merged[key] = value;
    }
  }
  return merged;
}

export async function POST(req: NextRequest) {
  try {
    const { sessionEmail, body, errorResponse } = await authGuard(req);
    if (errorResponse) return errorResponse;

    const incomingPersona =
      body?.persona && typeof body.persona === "object"
        ? (body.persona as Record<string, unknown>)
        : body && typeof body === "object"
        ? (body as Record<string, unknown>)
        : null;

    if (!incomingPersona) {
      return NextResponse.json(
        { error: "Invalid or missing persona payload" },
        { status: 400 }
      );
    }

    const existing = await prisma.userPersona.findUnique({
      where: { email: sessionEmail },
    });

    const base = (existing?.data as Record<string, unknown>) || defaultPersona;
    const merged = deepMerge(base, incomingPersona);
    const jsonPersona = merged as unknown as Prisma.InputJsonValue;

    await prisma.userPersona.upsert({
      where: { email: sessionEmail },
      create: {
        email: sessionEmail,
        data: jsonPersona,
      },
      update: {
        data: jsonPersona,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, persona: merged }, { status: 200 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to update persona";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
