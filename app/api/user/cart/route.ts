import { NextResponse } from "next/server";
import { authGuard } from "@/app/lib/auth-guard";
import { prisma } from "@/app/lib/prisma";
import {
  normalizePersistedCart,
  persistedCartEquals,
} from "@/app/lib/cart-persistence";

type UserMetadata = {
  cart?: unknown;
  [key: string]: unknown;
};

export async function GET(req: Request) {
  try {
    const { sessionEmail, errorResponse } = await authGuard(req);
    if (errorResponse) return errorResponse;

    const profile = await prisma.userProfile.findUnique({
      where: { email: sessionEmail },
      select: { metadata: true },
    });

    const metadata =
      profile?.metadata && typeof profile.metadata === "object"
        ? (profile.metadata as UserMetadata)
        : {};
    const cart = normalizePersistedCart(metadata.cart);

    return NextResponse.json({ cart }, { status: 200 });
  } catch (error) {
    console.error("[user-cart:get] Failed to load cart", error);
    return NextResponse.json({ error: "Failed to load cart" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { sessionEmail, body, errorResponse } = await authGuard(req);
    if (errorResponse) return errorResponse;

    const incomingCart = normalizePersistedCart(body?.cart);
    const existing = await prisma.userProfile.findUnique({
      where: { email: sessionEmail },
      select: { metadata: true },
    });

    const existingMetadata =
      existing?.metadata && typeof existing.metadata === "object"
        ? (existing.metadata as UserMetadata)
        : {};

    if (persistedCartEquals(existingMetadata.cart, incomingCart)) {
      return NextResponse.json({ success: true, cart: incomingCart }, { status: 200 });
    }

    await prisma.userProfile.upsert({
      where: { email: sessionEmail },
      create: {
        email: sessionEmail,
        credits: 0,
        metadata: {
          ...existingMetadata,
          cart: incomingCart,
        },
      },
      update: {
        metadata: {
          ...existingMetadata,
          cart: incomingCart,
        },
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, cart: incomingCart }, { status: 200 });
  } catch (error) {
    console.error("[user-cart:put] Failed to save cart", error);
    return NextResponse.json({ error: "Failed to save cart" }, { status: 500 });
  }
}
