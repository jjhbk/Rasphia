import { NextRequest, NextResponse } from "next/server";
import { authGuard } from "@/app/lib/auth-guard";
import { prisma } from "@/app/lib/prisma";

type AddressBookEntry = {
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zipCode: string;
  address: string;
};

export async function POST(req: NextRequest) {
  try {
    // 1️⃣ Authenticate user
    const { sessionEmail, body, errorResponse } = await authGuard(req);
    if (errorResponse) return errorResponse;

    // Extract allowed fields
    const { name, phone, address, wishlist, addressBook } = body;

    const existing = await prisma.userProfile.findUnique({
      where: { email: sessionEmail },
      select: { addressBook: true },
    });
    const currentAddressBook: AddressBookEntry[] = Array.isArray(
      existing?.addressBook
    )
      ? (existing?.addressBook as AddressBookEntry[])
      : [];

    const incomingAddressBook: AddressBookEntry[] = Array.isArray(addressBook)
      ? (addressBook as AddressBookEntry[])
      : [];

    const mergedAddressBook = [...currentAddressBook];
    for (const entry of incomingAddressBook) {
      if (
        entry &&
        typeof entry.address === "string" &&
        entry.address.trim() &&
        !mergedAddressBook.some((x) => x.address === entry.address)
      ) {
        mergedAddressBook.push(entry);
      }
    }

    await prisma.userProfile.upsert({
      where: { email: sessionEmail },
      create: {
        email: sessionEmail,
        name: name ?? "",
        phone: phone ?? "",
        address: address ?? "",
        wishlist: wishlist ?? [],
        addressBook: mergedAddressBook,
        credits: 0,
      },
      update: {
        ...(name !== undefined && { name }),
        ...(phone !== undefined && { phone }),
        ...(address !== undefined && { address }),
        ...(wishlist !== undefined && { wishlist }),
        ...(addressBook !== undefined && { addressBook: mergedAddressBook }),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ update-profile error:", err);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
