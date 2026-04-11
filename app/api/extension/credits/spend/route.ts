import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { verifyExtensionToken } from "@/app/lib/verifyExtToken";
import { handleOptions, withExtensionCors } from "@/app/lib/extensionCors";

export const runtime = "nodejs";
export const OPTIONS = handleOptions;

export const POST = withExtensionCors(async (req: Request) => {
  const email = await verifyExtensionToken(req);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { amount, reason } = await req.json();
  const spendAmount = Number(amount);

  if (!Number.isFinite(spendAmount) || spendAmount < 5) {
    return NextResponse.json(
      { error: "Invalid amount" },
      { status: 400 }
    );
  }

  const user = await prisma.userProfile.findUnique({ where: { email } });

  if (!user || (user.credits ?? 0) < spendAmount) {
    return NextResponse.json(
      { error: "Insufficient credits" },
      { status: 400 }
    );
  }

  await prisma.$transaction([
    prisma.userProfile.update({
      where: { email },
      data: { credits: { decrement: spendAmount } },
    }),
    prisma.creditLedger.create({
      data: {
        email,
        type: "debit",
        amount: spendAmount,
        reason: reason ?? "usage",
      },
    }),
  ]);

  return NextResponse.json({ ok: true }, { status: 200 });
});
