import { NextResponse } from "next/server";

export async function GET() {
  const appId = String(process.env.NEXT_PUBLIC_META_APP_ID || "").trim();
  const configId = String(
    process.env.NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID ||
      process.env.NEXT_PUBLIC_META_SETUP_ID ||
      process.env.META_EMBEDDED_SIGNUP_CONFIG_ID ||
      process.env.META_SETUP_ID ||
      ""
  ).trim();
  const successPath = String(
    process.env.NEXT_PUBLIC_META_EMBEDDED_SIGNUP_SUCCESS_PATH ||
      "/merchant/onboarding"
  ).trim();

  return NextResponse.json(
    {
      enabled: Boolean(appId && configId),
      appId,
      configId,
      successPath: successPath || "/merchant/onboarding",
    },
    { status: 200 }
  );
}
