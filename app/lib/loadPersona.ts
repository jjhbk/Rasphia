import { prisma } from "@/app/lib/prisma";

export async function loadPersona(email: string) {
  const profile = await prisma.user.findUnique({ where: { email } });

  return profile?.persona || {};
}
