import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";
import { isAdminEmail } from "@/app/lib/adminEmails";

export default async function PostLoginPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim();

  if (!email) {
    redirect("/");
  }

  const profile = await prisma.userProfile.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { role: true },
  });

  if (profile?.role === "admin" || isAdminEmail(email)) {
    redirect("/admin");
  }

  const merchant = await prisma.merchant.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { status: true },
  });

  if (merchant?.status === "approved") {
    redirect("/dashboard");
  }

  if (merchant) {
    redirect("/merchant/onboarding");
  }

  redirect("/");
}
