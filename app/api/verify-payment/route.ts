import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import {
  getSeedhapeOrderStatusWithConfig,
  isSeedhapePaidStatus,
} from "@/app/lib/seedhape";
import { finalizeOrderAsPaid } from "@/app/lib/order-payment";
import { getMerchantSeedhapeConfig } from "@/app/lib/merchant-seedhape";

type CustomerPayload = {
  email?: string;
  name?: string;
  phone?: string;
  address?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      seedhape_order_id?: string;
      orderId?: string;
      internal_order_id?: string;
      app_order_id?: string;
      customer?: CustomerPayload;
    };
    const seedhapeOrderId = String(
      body.seedhape_order_id || body.orderId || ""
    ).trim();
    const internalOrderId = String(body.internal_order_id || "").trim();
    const appOrderId = String(body.app_order_id || "").trim();

    if (!seedhapeOrderId && !internalOrderId && !appOrderId) {
      return NextResponse.json(
        {
          status: "error",
          message:
            "Missing order identifiers. Provide seedhape_order_id, internal_order_id, or app_order_id.",
        },
        { status: 400 }
      );
    }

    const order = await resolveOrderForVerification({
      seedhapeOrderId,
      internalOrderId,
      appOrderId,
    });
    if (!order) {
      return NextResponse.json(
        { status: "error", message: "Order not found" },
        { status: 404 }
      );
    }

    if (order.status === "paid") {
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    const merchantConfig = await resolveOrderMerchantSeedhapeConfig(order);
    const providerStatus = await getSeedhapeOrderStatusWithConfig(order.orderId, {
      apiKey: merchantConfig.apiKey,
      baseUrl: merchantConfig.baseUrl,
    });

    if (isSeedhapePaidStatus(providerStatus.status)) {
      const finalizeResult = await finalizeOrderAsPaid({
        orderId: order.orderId,
        paymentId: order.paymentId || `seedhape_${order.orderId}`,
        by: body.customer?.email || "system",
        note: `SeedhaPe payment ${providerStatus.status.toLowerCase()}`,
        verifiedAt: providerStatus.verifiedAt
          ? new Date(providerStatus.verifiedAt)
          : new Date(),
      });

      if (!finalizeResult.ok && finalizeResult.reason === "not_found") {
        return NextResponse.json(
          { status: "error", message: "Order not found" },
          { status: 404 }
        );
      }

      if (body.customer?.email) {
        await upsertCustomerProfile(body.customer);
      }

      return NextResponse.json({
        status: "ok",
        providerStatus: providerStatus.status,
        verifiedAt: providerStatus.verifiedAt || null,
        mapping: {
          internalOrderId: order.id,
          appOrderId: order.receipt || null,
          seedhapeOrderId: order.orderId,
        },
      });
    }

    if (
      providerStatus.status === "EXPIRED" ||
      providerStatus.status === "REJECTED"
    ) {
      return NextResponse.json({
        status: "expired",
        providerStatus: providerStatus.status,
      });
    }

    return NextResponse.json({
      status: "pending",
      providerStatus: providerStatus.status,
      mapping: {
        internalOrderId: order.id,
        appOrderId: order.receipt || null,
        seedhapeOrderId: order.orderId,
      },
    });
  } catch (error) {
    console.error("❌ Error verifying SeedhaPe payment:", error);
    const message =
      error instanceof Error ? error.message : "Payment verification failed";
    return NextResponse.json(
      { status: "error", message },
      { status: 500 }
    );
  }
}

async function resolveOrderForVerification(input: {
  seedhapeOrderId?: string;
  internalOrderId?: string;
  appOrderId?: string;
}) {
  if (input.seedhapeOrderId) {
    const bySeedhape = await prisma.order.findUnique({
      where: { orderId: input.seedhapeOrderId },
    });
    if (bySeedhape) return bySeedhape;
  }
  if (input.internalOrderId) {
    const byInternal = await prisma.order.findUnique({
      where: { id: input.internalOrderId },
    });
    if (byInternal) return byInternal;
  }
  if (input.appOrderId) {
    const byApp = await prisma.order.findFirst({
      where: { receipt: input.appOrderId },
      orderBy: { createdAt: "desc" },
    });
    if (byApp) return byApp;
  }
  return null;
}

async function upsertCustomerProfile(customer: CustomerPayload) {
  if (!customer.email) return;

  const email = customer.email;
  const addressEntry = {
    name: String(customer.name || "").trim(),
    phone: String(customer.phone || "").trim(),
    addressLine1: String(customer.addressLine1 || "").trim(),
    addressLine2: String(customer.addressLine2 || "").trim(),
    city: String(customer.city || "").trim(),
    state: String(customer.state || "").trim(),
    zipCode: String(customer.zipCode || "").trim(),
    address: String(customer.address || "").trim(),
  };

  await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
    },
    update: {
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      updatedAt: new Date(),
    },
  });

  const existingProfile = await prisma.userProfile.findUnique({
    where: { email },
    select: { addressBook: true },
  });
  const existingAddressBook = Array.isArray(existingProfile?.addressBook)
    ? existingProfile.addressBook
    : [];
  const mergedAddressBook = existingAddressBook.some(
    (entry: any) => entry.address === addressEntry.address
  )
    ? existingAddressBook.map((entry: any) =>
        entry.address === addressEntry.address ? addressEntry : entry
      )
    : [addressEntry, ...existingAddressBook];

  await prisma.userProfile.upsert({
    where: { email },
    create: {
      email,
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      addressBook: mergedAddressBook,
      credits: 0,
    },
    update: {
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      addressBook: mergedAddressBook,
      updatedAt: new Date(),
    },
  });
}

async function resolveOrderMerchantSeedhapeConfig(order: {
  merchantId: string | null;
  products: unknown;
}) {
  let merchantId = String(order.merchantId || "").trim();
  if (!merchantId && Array.isArray(order.products) && order.products.length > 0) {
    const firstProductId = String(
      (order.products[0] as { productId?: string })?.productId || ""
    ).trim();
    if (firstProductId) {
      const product = await prisma.product.findUnique({
        where: { id: firstProductId },
        select: { merchantId: true },
      });
      merchantId = String(product?.merchantId || "").trim();
    }
  }
  if (!merchantId) {
    throw new Error("Merchant missing on order. Cannot verify provider status.");
  }
  return getMerchantSeedhapeConfig(merchantId);
}
