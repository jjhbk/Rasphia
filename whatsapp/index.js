require("dotenv").config();
const axios = require("axios");
const express = require("express");
const FormDate = require("form-data");
const fs = require("fs");
const crypto = require("crypto");
const app = express();
app.use(express.json());
const otpStore = {};
const path = require("path");

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});
app.post("/send-otp", async (req, res) => {
  const { phone } = req.body;

  if (!phone) return res.status(400).json({ error: "Phone required" });

  // Generate OTP
  const otp = crypto.randomInt(100000, 999999).toString();

  // Store OTP (expires in 5 minutes)
  otpStore[phone] = { otp, expiresAt: Date.now() + 5 * 60 * 1000 };

  try {
    await axios.post(
      `https://graph.facebook.com/v22.0/${process.env.PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: {
          body: `Your OTP is ${otp}`,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    return res.json({ success: true, message: "OTP sent via text message" });
  } catch (err) {
    console.log(err.response?.data || err);
    return res.status(500).json({
      error:
        err.response?.data?.error?.message ||
        "Failed to send text OTP. User must message first.",
    });
  }
});

app.post("/verify-otp", (req, res) => {
  const { phone, otp } = req.body;

  if (!phone || !otp)
    return res.status(400).json({ error: "Phone & OTP required" });

  const record = otpStore[phone];

  if (!record) return res.status(400).json({ error: "OTP not sent" });

  if (Date.now() > record.expiresAt)
    return res.status(400).json({ error: "OTP expired" });

  if (record.otp !== otp) return res.status(400).json({ error: "Invalid OTP" });

  delete otpStore[phone];

  return res.json({ success: true, message: "OTP verified" });
});

app.listen(3000, () => console.log("OTP server running on 3000"));

async function sendTemplateMessage() {
  console.log(process.env.WHATSAPP_TOKEN);
  const response = await axios({
    url: "https://graph.facebook.com/v22.0/880219895169236/messages",
    method: "post",
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    data: JSON.stringify({
      messaging_product: "whatsapp",
      to: "14254439123",
      type: "template",
      template: {
        name: "5_course_meal",
        language: {
          code: "en_US",
        },
      },
    }),
  });
  console.log(response.data);
}

//sendTemplateMessage();

async function sendTextMessage() {
  console.log(process.env.WHATSAPP_TOKEN);
  const response = await axios({
    url: "https://graph.facebook.com/v22.0/880219895169236/messages",
    method: "post",
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    data: JSON.stringify({
      messaging_product: "whatsapp",
      to: "14254439123",
      type: "text",
      text: {
        body: "Fuck PANEER!", //"Attention-Request for 5 course meal Waiting for my 5 course meal cooked by Ara Ramsay: specifications :Vegan,no milk, no soy, not greasy.Allergies: none yet known!, only thing is indifference!JJ - Jathin Jagannath Happy Button!",
      },
    }),
  });
  console.log(response.data);
}

//sendTextMessage();
async function sendMediaMessage() {
  console.log(process.env.WHATSAPP_TOKEN);
  const response = await axios({
    url: "https://graph.facebook.com/v22.0/880219895169236/messages",
    method: "post",
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    data: JSON.stringify({
      messaging_product: "whatsapp",
      to: "14254439123",
      type: "image",
      image: {
        link: "https://dummyimage.com/600x400/000/fff&text=JJ+is+here",
        caption: "This is JJ here, your happy button!",
      },
    }),
  });
  console.log(response.data);
}

//sendMediaMessage();
async function uploadImage() {
  console.log(process.env.WHATSAPP_TOKEN);
  const data = new FormData();
  data.append("messaging_product", "whatsapp");
  data.append(
    "messaging_product",
    "whatsapp",
    data.append("file", fs.createReadStream(process.cwd() + "/logo.png")),
    { contentType: "image/png" }
  );
  data.append("type", "image/png");
  const response = await axios({
    url: "https://graph.facebook.com/v22.0/880219895169236/media",
    method: "post",
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    data: data,
  });
  console.log(response.data);
}

//uploadImage();
