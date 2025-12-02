import { put } from "@vercel/blob";
import { MongoClient } from "mongodb";

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const name = String(form.get("name") || "");
    const email = String(form.get("email") || "");
    const phone = String(form.get("phone") || "");
    const message = String(form.get("message") || "");

    if (!name || !email || !phone || !message) {
      return Response.json({ error: "Missing fields" }, { status: 400 });
    }

    // ------ MULTIPLE IMAGE UPLOAD ------
    const images = form.getAll("images") as File[];
    const uploadedUrls: string[] = [];

    for (const file of images) {
      if (!file) continue;

      const buffer = Buffer.from(await file.arrayBuffer());
      const blob = await put(`contact-${Date.now()}-${file.name}`, buffer, {
        access: "public",
        contentType: file.type,
      });

      uploadedUrls.push(blob.url);
    }

    // ------ SAVE TO MONGO ------
    const client = await MongoClient.connect(process.env.MONGODB_URI!);
    const db = client.db("contactForms");

    await db.collection("submissions").insertOne({
      name,
      email,
      phone,
      message,
      imageUrls: uploadedUrls,
      createdAt: new Date(),
    });

    return Response.json({ success: true });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}
