import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/app/lib/mongodb";
import crypto from "crypto";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const isExtension = url.searchParams.get("ext") === "1";

  const session = await getServerSession(authOptions);

  // Get the base URL (works for both localhost and production)
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || url.origin;

  if (!session?.user?.email) {
    if (isExtension) {
      const signinUrl = `${baseUrl}/api/auth/signin?callbackUrl=${encodeURIComponent(
        `${baseUrl}/api/extension/init?ext=1`
      )}`;

      return NextResponse.redirect(signinUrl, { status: 302 });
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
    // Redirect to HTTPS callback page (extension script will handle it)
    const redirectUrl = `${baseUrl}/extension/auth?token=${token}`;

    return NextResponse.redirect(redirectUrl, {
      status: 302,
      headers: {
        "Access-Control-Allow-Origin": "chrome-extension://*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, X-Rasphia-Extension-Token",
      },
    });
  }

  return NextResponse.json({ one_time_token: token });
}
