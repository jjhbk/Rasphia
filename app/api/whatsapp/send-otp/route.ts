import axios from "axios";
import crypto from "crypto";
import { saveOTP } from "@/app/lib/otp-store";

export async function POST(req: Request) {
  const { phone } = await req.json();

  const otp = crypto.randomInt(100000, 999999).toString();
  saveOTP(phone, otp);

  try {
    await axios.post(
      `https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: { body: `Your OTP is: ${otp}` },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
    return Response.json({ success: true });
  } catch (err: any) {
    console.log(err.response?.data || err);
    return Response.json(
      { error: "Failed to send OTP (user must message you first)" },
      { status: 500 }
    );
  }
}
