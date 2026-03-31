import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/app/lib/prisma";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { isAdminEmail } from "@/app/lib/adminEmails";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  session: {
    strategy: "database",
  },

  callbacks: {
    async session({ session, user }) {
      if (user?.id && session.user) {
        (session.user as { id?: string }).id = String(user.id);
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Always allow callbackUrl param if it belongs to us
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (url.startsWith(baseUrl)) return url;
      return baseUrl;
    },
  },

  events: {
    async createUser({ user }) {
      try {
        if (!user.email) return;
        const existing = await prisma.userProfile.findUnique({
          where: { email: user.email },
        });
        if (existing) return;

        // Determine if user is admin
        const role = isAdminEmail(user.email) ? "admin" : "user";

        await prisma.userProfile.create({
          data: {
            name: user.name || "",
            email: user.email,
            role,
            phone: "",
            address: "",
            wishlist: [],
            credits: 50,
          },
        });

        console.log(`✅ Created ${role} profile for ${user.email}`);
      } catch (err) {
        console.error("❌ Error creating user profile:", err);
      }
    },

    async signIn({ user }) {
      try {
        if (!user.email) return;
        await prisma.userProfile.upsert({
          where: { email: user.email },
          create: {
            email: user.email,
            name: user.name || "",
            role: isAdminEmail(user.email) ? "admin" : "user",
            credits: 50,
          },
          update: {
            updatedAt: new Date(),
            role: isAdminEmail(user.email) ? "admin" : undefined,
          },
        });
      } catch (err) {
        console.error("⚠️ Error updating login timestamp:", err);
      }
    },
  },
};

// ✅ Export both the NextAuth handler and the options
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
