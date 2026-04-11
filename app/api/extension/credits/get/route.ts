import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { verifyExtensionToken } from "@/app/lib/verifyExtToken";
import { handleOptions, withExtensionCors } from "@/app/lib/extensionCors";

export const runtime = "nodejs";
export const OPTIONS = handleOptions;

export const GET = withExtensionCors(async (req: Request) => {
  const email = await verifyExtensionToken(req);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.userProfile.findUnique({
    where: { email },
    select: { credits: true },
  });

  return NextResponse.json({ credits: user?.credits ?? 0 }, { status: 200 });
});
