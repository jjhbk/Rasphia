import type { Product } from "@/app/types";

export type PersistedCartItem = {
  _id?: string;
  id: string;
  name: string;
  brand?: string | null;
  category?: string;
  price: number;
  quantity: number;
  imageUrl?: string | null;
  merchantSlug?: string;
  merchantName?: string;
  stockQuantity?: number;
  isAvailable?: boolean;
};

export function deriveCartId(raw: { id?: string; _id?: string; name?: string }) {
  const explicit = String(raw?.id || raw?._id || "").trim();
  if (explicit) return explicit;
  const name = String(raw?.name || "").trim().toLowerCase();
  return name ? `name:${name.replace(/\s+/g, "_")}` : "";
}

export function normalizePersistedCartItem(raw: unknown): PersistedCartItem | null {
  const item = raw as Record<string, unknown> | null | undefined;
  const id = deriveCartId({
    id: typeof item?.id === "string" ? item.id : undefined,
    _id: typeof item?._id === "string" ? item._id : undefined,
    name: typeof item?.name === "string" ? item.name : undefined,
  });
  const name = String(item?.name || "").trim();
  if (!id || !name) return null;

  return {
    _id: typeof item?._id === "string" ? item._id : undefined,
    id,
    name,
    brand: item?.brand ? String(item.brand) : null,
    category: item?.category ? String(item.category) : "General",
    price: Number(item?.price || 0),
    quantity: Math.max(1, Number(item?.quantity || 1)),
    imageUrl: item?.imageUrl ? String(item.imageUrl) : null,
    merchantSlug: item?.merchantSlug ? String(item.merchantSlug) : undefined,
    merchantName: item?.merchantName ? String(item.merchantName) : undefined,
    stockQuantity:
      item?.stockQuantity === undefined || item?.stockQuantity === null
        ? undefined
        : Number(item.stockQuantity || 0),
    isAvailable:
      item?.isAvailable === undefined ? undefined : Boolean(item.isAvailable),
  };
}

export function normalizePersistedCart(items: unknown): PersistedCartItem[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => normalizePersistedCartItem(item))
    .filter((item): item is PersistedCartItem => Boolean(item));
}

export function mergePersistedCarts(
  ...carts: Array<unknown>
): PersistedCartItem[] {
  const merged = new Map<string, PersistedCartItem>();

  for (const cart of carts) {
    for (const item of normalizePersistedCart(cart)) {
      const existing = merged.get(item.id);
      if (!existing) {
        merged.set(item.id, item);
        continue;
      }
      merged.set(item.id, {
        ...existing,
        ...item,
        quantity: Math.max(1, Number(existing.quantity || 1) + Number(item.quantity || 1)),
      });
    }
  }

  return Array.from(merged.values());
}

export function persistedCartEquals(a: unknown, b: unknown) {
  const left = normalizePersistedCart(a);
  const right = normalizePersistedCart(b);
  if (left.length !== right.length) return false;

  for (let i = 0; i < left.length; i += 1) {
    const x = left[i];
    const y = right[i];
    if (
      x.id !== y.id ||
      x.name !== y.name ||
      Number(x.price || 0) !== Number(y.price || 0) ||
      Number(x.quantity || 1) !== Number(y.quantity || 1)
    ) {
      return false;
    }
  }

  return true;
}

export function toPersistedCartProducts(items: unknown): Product[] {
  return normalizePersistedCart(items).map((item) => ({
    _id: item._id || item.id,
    id: item.id,
    name: item.name,
    brand: item.brand || undefined,
    merchantSlug: item.merchantSlug,
    merchantName: item.merchantName,
    category: item.category || "General",
    price: Number(item.price || 0),
    quantity: Math.max(1, Number(item.quantity || 1)),
    stockQuantity: item.stockQuantity,
    isAvailable: item.isAvailable,
    imageUrl: item.imageUrl || undefined,
  }));
}
