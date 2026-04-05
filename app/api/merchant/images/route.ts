import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import sharp from "sharp";
import { getManagementAccessFromRequest } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

export const runtime = "nodejs";

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

type UploadResult = {
  buffer: Buffer;
  contentType: string;
  ext: string;
  width: number | null;
  height: number | null;
};

function parsePagination(req: NextRequest) {
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") || "1") || 1);
  const pageSizeRaw = Number(
    req.nextUrl.searchParams.get("pageSize") || String(DEFAULT_PAGE_SIZE)
  );
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, pageSizeRaw || DEFAULT_PAGE_SIZE));
  return { page, pageSize };
}

function safeFileStem(name: string) {
  const stem = String(name || "asset")
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return stem || "asset";
}

async function compressImageLossless(file: File): Promise<UploadResult> {
  const inputBuffer = Buffer.from(await file.arrayBuffer());
  const base = sharp(inputBuffer, { failOn: "none" }).rotate();
  const metadata = await base.metadata();

  const webpLossless = await sharp(inputBuffer, { failOn: "none" })
    .rotate()
    .webp({ lossless: true, effort: 6 })
    .toBuffer();

  let best = {
    buffer: webpLossless,
    contentType: "image/webp",
    ext: "webp",
  };

  if ((metadata.format === "png" || metadata.format === "webp") && inputBuffer.length < best.buffer.length) {
    best = {
      buffer: inputBuffer,
      contentType: file.type || (metadata.format === "png" ? "image/png" : "image/webp"),
      ext: metadata.format === "png" ? "png" : "webp",
    };
  }

  return {
    ...best,
    width: metadata.width || null,
    height: metadata.height || null,
  };
}

function resolveMerchantScope(req: NextRequest, access: Awaited<ReturnType<typeof getManagementAccessFromRequest>>) {
  if (access.role === "admin") {
    const merchantId = String(req.nextUrl.searchParams.get("merchantId") || "").trim();
    if (!merchantId) {
      throw new Error("merchantId query param is required for admin requests");
    }
    return merchantId;
  }

  if (!access.merchantId) {
    throw new Error("Forbidden: Merchant profile not found");
  }

  return access.merchantId;
}

export async function GET(req: NextRequest) {
  try {
    const access = await getManagementAccessFromRequest(req);
    const merchantId = resolveMerchantScope(req, access);
    const { page, pageSize } = parsePagination(req);
    const skip = (page - 1) * pageSize;

    const [total, items] = await Promise.all([
      prisma.merchantImageAsset.count({ where: { merchantId } }),
      prisma.merchantImageAsset.findMany({
        where: { merchantId },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        select: {
          id: true,
          url: true,
          originalName: true,
          contentType: true,
          sizeBytes: true,
          width: true,
          height: true,
          createdAt: true,
        },
      }),
    ]);

    return NextResponse.json(
      {
        items,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.max(1, Math.ceil(total / pageSize)),
          hasMore: skip + items.length < total,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch image history";
    if (message.startsWith("Unauthorized")) {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message.startsWith("Forbidden") || message.includes("merchantId query param is required")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const access = await getManagementAccessFromRequest(req);
    const merchantId = resolveMerchantScope(req, access);

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!String(file.type || "").startsWith("image/")) {
      return NextResponse.json({ error: "Only image uploads are allowed" }, { status: 400 });
    }

    const compressed = await compressImageLossless(file);
    const stem = safeFileStem(file.name || "asset");
    const key = `merchant-assets/${merchantId}/${Date.now()}-${stem}.${compressed.ext}`;

    const blob = await put(key, compressed.buffer, {
      access: "public",
      contentType: compressed.contentType,
    });

    const saved = await prisma.merchantImageAsset.create({
      data: {
        merchantId,
        url: blob.url,
        originalName: String(file.name || "asset"),
        contentType: compressed.contentType,
        sizeBytes: compressed.buffer.length,
        width: compressed.width,
        height: compressed.height,
      },
      select: {
        id: true,
        url: true,
        originalName: true,
        contentType: true,
        sizeBytes: true,
        width: true,
        height: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ item: saved }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to upload image";
    if (message.startsWith("Unauthorized")) {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message.startsWith("Forbidden") || message.includes("merchantId query param is required")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
