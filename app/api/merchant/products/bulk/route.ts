import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getManagementAccessFromRequest } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { generateProductEmbedding } from "@/app/lib/generateEmbeddings";

export const runtime = "nodejs";

type CsvRow = Record<string, string>;

type NormalizedProduct = {
  name: string;
  brand: string;
  description: string;
  category: string;
  price: number;
  imageUrl: string;
  tags: string[];
  occasion: string[];
  recipient: string;
  story: string;
  affiliateLink: string;
  attributes: Record<string, unknown>;
  styleTags: string[];
  colorPalette: string[];
  materials: string[];
  stockQuantity: number;
  isAvailable: boolean;
};

type RowError = {
  row: number;
  field: string;
  message: string;
};

function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const ch = content[i];

    if (ch === '"') {
      if (inQuotes && content[i + 1] === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && content[i + 1] === "\n") {
        i += 1;
      }
      row.push(field);
      field = "";
      const hasAnyValue = row.some((cell) => cell.trim().length > 0);
      if (hasAnyValue) rows.push(row);
      row = [];
      continue;
    }

    field += ch;
  }

  row.push(field);
  if (row.some((cell) => cell.trim().length > 0)) {
    rows.push(row);
  }

  return rows;
}

function boolFromText(value: string, fallback: boolean) {
  const v = value.trim().toLowerCase();
  if (!v) return fallback;
  if (["true", "1", "yes", "y"].includes(v)) return true;
  if (["false", "0", "no", "n"].includes(v)) return false;
  return fallback;
}

function parseNumber(value: string): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function parseStringArray(value: string): string[] {
  const input = String(value || "").trim();
  if (!input) return [];

  try {
    const parsed = JSON.parse(input);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => String(item || "").trim())
        .filter((item) => item.length > 0);
    }
  } catch {
    // fallback below
  }

  return input
    .split(/[,\n;|]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function parseLooseValue(raw: string): unknown {
  const value = raw.trim();
  if (!value) return "";
  const lower = value.toLowerCase();
  if (lower === "true") return true;
  if (lower === "false") return false;
  const maybeNumber = Number(value);
  if (Number.isFinite(maybeNumber)) return maybeNumber;
  return value;
}

function parseObject(value: string): Record<string, unknown> {
  const input = String(value || "").trim();
  if (!input) return {};
  try {
    const parsed = JSON.parse(input);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // no-op
  }

  const out: Record<string, unknown> = {};
  const pairs = input
    .split(/[;\n|]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
  for (const pair of pairs) {
    const idx = pair.indexOf(":");
    if (idx < 1) continue;
    const key = pair.slice(0, idx).trim();
    const rawValue = pair.slice(idx + 1).trim();
    if (!key) continue;
    out[key] = parseLooseValue(rawValue);
  }
  if (Object.keys(out).length > 0) return out;
  return {};
}

function normalizeCsvRow(row: CsvRow, rowNumber: number): {
  product: NormalizedProduct | null;
  errors: RowError[];
} {
  const errors: RowError[] = [];

  const name = String(row.name || "").trim();
  const category = String(row.category || "").trim();
  const imageUrl = String(row.imageUrl || "").trim();

  const priceRaw = String(row.price || "").trim();
  const stockRaw = String(row.stockQuantity || "").trim();

  const price = parseNumber(priceRaw);
  const stockQuantityNumber = parseNumber(stockRaw);
  const stockQuantity =
    stockQuantityNumber === null ? null : Math.max(0, Math.floor(stockQuantityNumber));

  if (!name) errors.push({ row: rowNumber, field: "name", message: "Name is required" });
  if (!category)
    errors.push({ row: rowNumber, field: "category", message: "Category is required" });
  if (price === null || price <= 0)
    errors.push({ row: rowNumber, field: "price", message: "Price must be a positive number" });
  if (stockQuantity === null)
    errors.push({
      row: rowNumber,
      field: "stockQuantity",
      message: "Stock quantity must be a number",
    });
  if (!imageUrl) {
    errors.push({ row: rowNumber, field: "imageUrl", message: "Image URL is required" });
  } else if (!/^https?:\/\//i.test(imageUrl)) {
    errors.push({
      row: rowNumber,
      field: "imageUrl",
      message: "Image URL must start with http:// or https://",
    });
  }

  if (errors.length) return { product: null, errors };

  const product: NormalizedProduct = {
    name,
    brand: String(row.brand || "").trim() || "Unknown",
    description: String(row.description || "").trim(),
    category,
    price: Number(price),
    imageUrl,
    tags: parseStringArray(String(row.tags || "")),
    occasion: parseStringArray(String(row.occasion || "")),
    recipient: String(row.recipient || "").trim() || "Anyone",
    story: String(row.story || "").trim(),
    affiliateLink: String(row.affiliateLink || "").trim(),
    attributes: parseObject(String(row.attributes || "")),
    styleTags: parseStringArray(String(row.styleTags || "")),
    colorPalette: parseStringArray(String(row.colorPalette || "")),
    materials: parseStringArray(String(row.materials || "")),
    stockQuantity: stockQuantity || 0,
    isAvailable: boolFromText(String(row.isAvailable || ""), (stockQuantity || 0) > 0),
  };

  return { product, errors: [] };
}

function rowsToObjects(rows: string[][]): CsvRow[] {
  if (!rows.length) return [];
  const headers = rows[0].map((h, idx) => {
    const value = String(h || "").trim();
    return idx === 0 ? value.replace(/^\uFEFF/, "") : value;
  });
  const body = rows.slice(1);

  return body.map((row) => {
    const out: CsvRow = {};
    headers.forEach((header, idx) => {
      if (!header) return;
      out[header] = String(row[idx] || "").trim();
    });
    return out;
  });
}

export async function POST(req: NextRequest) {
  try {
    const access = await getManagementAccessFromRequest(req);

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "CSV file is required" }, { status: 400 });
    }

    const csvText = await file.text();
    const csvRows = parseCsv(csvText);
    if (csvRows.length < 2) {
      return NextResponse.json(
        { error: "CSV must include header row and at least one data row" },
        { status: 400 }
      );
    }

    const merchantIdFromForm = String(formData.get("merchantId") || "").trim();
    const merchantId =
      access.role === "admin"
        ? merchantIdFromForm
        : String(access.merchantId || "").trim();

    if (!merchantId) {
      return NextResponse.json(
        { error: "merchantId is required for admin bulk imports" },
        { status: 400 }
      );
    }

    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { id: true, email: true, status: true, name: true },
    });

    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    if (access.role === "merchant") {
      if (merchant.email.toLowerCase() !== access.email.toLowerCase()) {
        return NextResponse.json({ error: "Forbidden: merchant mismatch" }, { status: 403 });
      }
      if (merchant.status !== "approved") {
        return NextResponse.json(
          { error: "Merchant account must be approved for bulk upload" },
          { status: 403 }
        );
      }
    }

    const dryRun = boolFromText(String(formData.get("dryRun") || "true"), true);

    const mappedRows = rowsToObjects(csvRows);
    const validProducts: NormalizedProduct[] = [];
    const errors: RowError[] = [];

    mappedRows.forEach((row, idx) => {
      const { product, errors: rowErrors } = normalizeCsvRow(row, idx + 2);
      if (rowErrors.length) {
        errors.push(...rowErrors);
      } else if (product) {
        validProducts.push(product);
      }
    });

    if (dryRun) {
      return NextResponse.json(
        {
          dryRun: true,
          totalRows: mappedRows.length,
          validRows: validProducts.length,
          invalidRows: mappedRows.length - validProducts.length,
          errors,
          preview: validProducts.slice(0, 15),
        },
        { status: 200 }
      );
    }

    if (!validProducts.length) {
      return NextResponse.json(
        {
          dryRun: false,
          totalRows: mappedRows.length,
          validRows: 0,
          invalidRows: mappedRows.length,
          createdCount: 0,
          errors,
        },
        { status: 400 }
      );
    }

    const createdIds: string[] = [];

    for (const product of validProducts) {
      const created = await prisma.product.create({
        data: {
          merchantId: merchant.id,
          merchantEmail: merchant.email,
          name: product.name,
          brand: product.brand,
          description: product.description,
          category: product.category,
          price: product.price,
          imageUrl: product.imageUrl,
          tags: product.tags,
          occasion: product.occasion,
          recipient: product.recipient,
          story: product.story,
          affiliateLink: product.affiliateLink,
          attributes: product.attributes as Prisma.InputJsonValue,
          styleTags: product.styleTags,
          colorPalette: product.colorPalette,
          materials: product.materials,
          stockQuantity: product.stockQuantity,
          isAvailable: product.isAvailable,
          embedding: Prisma.JsonNull,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        select: { id: true },
      });
      createdIds.push(created.id);
    }

    createdIds.forEach((id) => {
      generateProductEmbedding(id).catch(() => {});
    });

    return NextResponse.json(
      {
        dryRun: false,
        totalRows: mappedRows.length,
        validRows: validProducts.length,
        invalidRows: mappedRows.length - validProducts.length,
        createdCount: createdIds.length,
        errors,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Bulk import failed";
    if (message.startsWith("Unauthorized")) {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message.startsWith("Forbidden")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
