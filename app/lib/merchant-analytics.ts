import { prisma } from "@/app/lib/prisma";
import { normalizePersistedCart } from "@/app/lib/cart-persistence";
import { Prisma } from "@prisma/client";

const SALES_STATUSES = new Set(["paid", "Processing", "Shipped", "Delivered"]);
const LOW_STOCK_THRESHOLD = 5;

type MerchantOrderProduct = {
  productId?: string;
  name?: string;
  quantity?: number;
  price?: number;
};

export type MerchantAnalyticsSummary = {
  totals: {
    salesToday: number;
    salesYesterday: number;
    salesThisMonth: number;
    salesLastMonth: number;
    paidOrdersToday: number;
    paidOrdersThisMonth: number;
  };
  topProducts: Array<{
    productId: string;
    name: string;
    unitsSold: number;
    revenue: number;
  }>;
  restockItems: Array<{
    productId: string;
    name: string;
    stockQuantity: number;
    isAvailable: boolean;
  }>;
  activeCartUsers: Array<{
    email: string;
    name: string;
    itemCount: number;
    quantity: number;
    updatedAt: string;
    items: string[];
  }>;
};

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfPreviousMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() - 1, 1);
}

function toOrderProducts(raw: unknown): MerchantOrderProduct[] {
  return Array.isArray(raw) ? (raw as MerchantOrderProduct[]) : [];
}

function isSuccessfulOrder(order: {
  status: string;
  verifiedAt: Date | null;
}) {
  return SALES_STATUSES.has(String(order.status || "")) || Boolean(order.verifiedAt);
}

function orderEventDate(order: {
  verifiedAt: Date | null;
  createdAt: Date;
}) {
  return order.verifiedAt || order.createdAt;
}

function orderBelongsToMerchant(args: {
  order: {
    merchantId: string | null;
    products: unknown;
  };
  merchantId: string;
  productIds: Set<string>;
  productNames: Set<string>;
}) {
  if (args.order.merchantId === args.merchantId) return true;
  return toOrderProducts(args.order.products).some((product) => {
    if (typeof product.productId === "string" && args.productIds.has(product.productId)) {
      return true;
    }
    if (typeof product.name === "string" && args.productNames.has(product.name)) {
      return true;
    }
    return false;
  });
}

function formatIso(date: Date) {
  return date.toISOString();
}

export async function getMerchantAnalyticsSummary(args: {
  merchantId: string;
  merchantEmail: string;
}) {
  const [products, orders, userProfiles] = await Promise.all([
    prisma.product.findMany({
      where: {
        OR: [{ merchantId: args.merchantId }, { merchantEmail: args.merchantEmail }],
      },
      select: {
        id: true,
        name: true,
        stockQuantity: true,
        isAvailable: true,
        updatedAt: true,
      },
      orderBy: [{ stockQuantity: "asc" }, { updatedAt: "desc" }],
    }),
    prisma.order.findMany({
      where: {
        OR: [{ merchantId: args.merchantId }, { status: { in: Array.from(SALES_STATUSES).concat(["created", "Cancelled", "Refunded", "Replacement"]) } }],
      },
      select: {
        orderId: true,
        merchantId: true,
        amount: true,
        status: true,
        verifiedAt: true,
        createdAt: true,
        products: true,
      },
      orderBy: { createdAt: "desc" },
      take: 2000,
    }),
    prisma.userProfile.findMany({
      where: { metadata: { not: Prisma.JsonNull } },
      select: {
        email: true,
        name: true,
        updatedAt: true,
        metadata: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 1000,
    }),
  ]);

  const productIds = new Set(products.map((product) => product.id));
  const productNames = new Set(
    products
      .map((product) => product.name)
      .filter((name): name is string => Boolean(name && name.trim()))
  );

  const merchantOrders = orders.filter((order) =>
    orderBelongsToMerchant({
      order,
      merchantId: args.merchantId,
      productIds,
      productNames,
    })
  );
  const successfulOrders = merchantOrders.filter(isSuccessfulOrder);

  const now = new Date();
  const todayStart = startOfDay(now);
  const tomorrowStart = endOfDay(now);
  const yesterdayStart = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  const monthStart = startOfMonth(now);
  const lastMonthStart = startOfPreviousMonth(now);

  const totals = {
    salesToday: 0,
    salesYesterday: 0,
    salesThisMonth: 0,
    salesLastMonth: 0,
    paidOrdersToday: 0,
    paidOrdersThisMonth: 0,
  };

  const topProductsMap = new Map<string, { productId: string; name: string; unitsSold: number; revenue: number }>();

  for (const order of successfulOrders) {
    const eventDate = orderEventDate(order);
    const amount = Number(order.amount || 0);

    if (eventDate >= todayStart && eventDate < tomorrowStart) {
      totals.salesToday += amount;
      totals.paidOrdersToday += 1;
    }
    if (eventDate >= yesterdayStart && eventDate < todayStart) {
      totals.salesYesterday += amount;
    }
    if (eventDate >= monthStart) {
      totals.salesThisMonth += amount;
      totals.paidOrdersThisMonth += 1;
    }
    if (eventDate >= lastMonthStart && eventDate < monthStart) {
      totals.salesLastMonth += amount;
    }

    for (const item of toOrderProducts(order.products)) {
      const productId =
        typeof item.productId === "string" && item.productId.trim()
          ? item.productId
          : `name:${String(item.name || "unknown").trim().toLowerCase()}`;
      const name = String(item.name || "Unnamed item").trim() || "Unnamed item";
      const quantity = Math.max(1, Number(item.quantity || 1));
      const revenue = Number(item.price || 0) * quantity;
      const existing = topProductsMap.get(productId);
      if (existing) {
        existing.unitsSold += quantity;
        existing.revenue += revenue;
      } else {
        topProductsMap.set(productId, {
          productId,
          name,
          unitsSold: quantity,
          revenue,
        });
      }
    }
  }

  const restockItems = products
    .filter((product) => product.stockQuantity <= LOW_STOCK_THRESHOLD || !product.isAvailable)
    .slice(0, 12)
    .map((product) => ({
      productId: product.id,
      name: product.name,
      stockQuantity: product.stockQuantity,
      isAvailable: product.isAvailable,
    }));

  const activeCartUsers = userProfiles
    .map((profile) => {
      const metadata =
        profile.metadata && typeof profile.metadata === "object"
          ? (profile.metadata as Record<string, unknown>)
          : null;
      const cart = normalizePersistedCart(metadata?.cart);
      const merchantItems = cart.filter((item) => {
        if (item._id && productIds.has(item._id)) return true;
        if (item.id && productIds.has(item.id)) return true;
        return productNames.has(item.name);
      });
      if (!merchantItems.length) return null;
      return {
        email: profile.email,
        name: profile.name || profile.email,
        itemCount: merchantItems.length,
        quantity: merchantItems.reduce((sum, item) => sum + Math.max(1, Number(item.quantity || 1)), 0),
        updatedAt: formatIso(profile.updatedAt),
        items: merchantItems.map((item) => item.name).slice(0, 5),
      };
    })
    .filter(
      (profile): profile is NonNullable<typeof profile> => Boolean(profile)
    )
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    .slice(0, 12);

  const topProducts = Array.from(topProductsMap.values())
    .sort((left, right) => {
      if (right.unitsSold !== left.unitsSold) return right.unitsSold - left.unitsSold;
      return right.revenue - left.revenue;
    })
    .slice(0, 10);

  return {
    totals,
    topProducts,
    restockItems,
    activeCartUsers,
  } satisfies MerchantAnalyticsSummary;
}
