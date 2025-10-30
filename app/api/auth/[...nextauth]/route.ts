import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/app/lib/mongodb";

const handler = NextAuth({
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
      // if (token?.id && session.user) session.user= token.id as string;
      return session;
    },
  },

  events: {
    // 🔹 Fires when a new user is created
    async createUser({ user }) {
      try {
        const client = await clientPromise;
        const db = client.db("rasphia"); // your app's DB
        const existingProfile = await db
          .collection("user_profiles")
          .findOne({ email: user.email });

        if (!existingProfile) {
          await db.collection("user_profiles").insertOne({
            name: user.name || "",
            email: user.email,
            phone: "",
            address: "",
            wishlist: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          console.log(`✅ Created user profile for ${user.email}`);
        }
      } catch (err) {
        console.error("❌ Error creating user profile:", err);
      }
    },
  },
});

export { handler as GET, handler as POST };
