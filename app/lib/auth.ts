import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/app/lib/mongodb";

/**
 * Validates that the current user is logged in and is an admin.
 * Returns user info if valid; throws otherwise.
 */
export async function requireAdmin() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    throw new Error("Unauthorized: No session found");
  }

  const client = await clientPromise;
  const db = client.db("rasphia");

  const user = await db
    .collection("user_profiles")
    .findOne({ email: session.user.email });

  if (!user || user.role !== "admin") {
    throw new Error("Forbidden: Admin access required email is" + user?.email);
  }

  return user;
}
