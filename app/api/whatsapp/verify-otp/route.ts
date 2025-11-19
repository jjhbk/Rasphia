import { getOTP, deleteOTP } from "@/app/lib/otp-store";

export async function POST(req: Request) {
  const { phone, otp } = await req.json();

  const entry = getOTP(phone);

  if (!entry) {
    return Response.json({ error: "OTP not sent" }, { status: 400 });
  }

  if (Date.now() > entry.expiresAt) {
    deleteOTP(phone);
    return Response.json({ error: "OTP expired" }, { status: 400 });
  }

  if (entry.otp !== otp) {
    return Response.json({ error: "Invalid OTP" }, { status: 400 });
  }

  deleteOTP(phone);
  return Response.json({ success: true, message: "OTP verified" });
}
