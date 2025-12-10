import clientPromise from "./mongodb";

export async function loadPersona(email: string) {
  const client = await clientPromise;
  const db = client.db("rasphia");

  const profile = await db.collection("user_profiles").findOne({ email });

  return profile?.persona || {};
}
