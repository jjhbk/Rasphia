import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/app/lib/mongodb";
import crypto from "crypto";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const isExtension = url.searchParams.get("ext") === "1";

  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    if (isExtension) {
      return NextResponse.redirect("https://rasphia.com/login?ext=1", {
        status: 302,
      });
    }
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const email = session.user.email;
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  const client = await clientPromise;
  const db = client.db("rasphia");

  await db.collection("extension_tokens").insertOne({
    email,
    token,
    expiresAt,
    consumed: false,
  });

  if (isExtension) {
    const EXT_ID = process.env.NEXT_PUBLIC_EXTENSION_ID;

    const redirectUrl = `chrome-extension://${EXT_ID}/bridge/bridge.html?token=${token}`;

    return NextResponse.redirect(redirectUrl, { status: 302 });
  }

  return NextResponse.json({ one_time_token: token });
}
