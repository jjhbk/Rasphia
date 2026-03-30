import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";

export default async function PostLoginPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if (!email) {
    redirect("/");
  }

  const profile = await prisma.userProfile.findUnique({
    where: { email },
    select: { role: true },
  });

  if (profile?.role === "admin") {
    redirect("/admin");
  }

  const merchant = await prisma.merchant.findUnique({
    where: { email },
    select: { status: true },
  });

  if (merchant?.status === "approved") {
    redirect("/admin");
  }

  if (merchant) {
    redirect("/merchant/onboarding");
  }

  redirect("/");
}
