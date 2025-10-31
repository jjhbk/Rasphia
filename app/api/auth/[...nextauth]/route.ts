import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/app/lib/mongodb";

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise, {
    databaseName: "rasphia",
  }),

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  session: {
    strategy: "jwt",
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token?.id && session.user) {
        // attach token ID to session.user
        (session.user as any).id = token.id;
      }
      return session;
    },
  },

  events: {
    async createUser({ user }) {
      try {
        const client = await clientPromise;
        const db = client.db("rasphia");
        const profiles = db.collection("user_profiles");

        const existing = await profiles.findOne({ email: user.email });
        if (existing) return;

        // Determine if user is admin
        const adminEmails =
          process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim()) || [];
        const role = adminEmails.includes(user.email ?? "") ? "admin" : "user";

        await profiles.insertOne({
          name: user.name || "",
          email: user.email,
          role,
          phone: "",
          address: "",
          wishlist: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        console.log(`✅ Created ${role} profile for ${user.email}`);
      } catch (err) {
        console.error("❌ Error creating user profile:", err);
      }
    },

    async signIn({ user }) {
      try {
        const client = await clientPromise;
        const db = client.db("rasphia");
        await db
          .collection("user_profiles")
          .updateOne(
            { email: user.email },
            { $set: { updatedAt: new Date() } }
          );
      } catch (err) {
        console.error("⚠️ Error updating login timestamp:", err);
      }
    },
  },
};

// ✅ Export both the NextAuth handler and the options
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
