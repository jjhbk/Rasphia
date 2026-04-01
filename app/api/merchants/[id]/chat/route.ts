import { NextRequest } from "next/server";
import { POST as storefrontChatPost } from "@/app/api/storefronts/[slug]/chat/route";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  return storefrontChatPost(req, { params: Promise.resolve({ slug: params.id }) });
}
