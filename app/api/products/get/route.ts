import { NextResponse } from "next/server";
import { getManagementAccessFromRequest } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    // Optional query params for pagination
    const limit = parseInt(url.searchParams.get("limit") || "50", 10);
    const skip = parseInt(url.searchParams.get("skip") || "0", 10);
    const scope = url.searchParams.get("scope");

    let where: Record<string, unknown> = {};

    if (scope === "managed") {
      const access = await getManagementAccessFromRequest(req);
      if (access.role === "merchant") {
        where = {
          merchantEmail: access.email,
        };
      }
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    return NextResponse.json(products.map((p) => ({ ...p, _id: p.id })));
  } catch (err) {
    console.error("❌ Error fetching products:", err);
    if (
      err instanceof Error &&
      (err.message.startsWith("Unauthorized") ||
        err.message.startsWith("Forbidden"))
    ) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
