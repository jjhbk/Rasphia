import { MongoClient } from "mongodb";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.name || !body.email || !body.phone || !body.message) {
      return Response.json({ error: "Missing fields" }, { status: 400 });
    }

    const client = await MongoClient.connect(process.env.MONGODB_URI!);
    const db = client.db("contactForms");

    await db.collection("submissions").insertOne({
      ...body,
      createdAt: new Date(),
    });

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}
