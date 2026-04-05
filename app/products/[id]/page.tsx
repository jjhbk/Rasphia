import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/app/lib/prisma";

export default async function PublicProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      imageUrl: true,
      category: true,
      price: true,
      stockQuantity: true,
      isAvailable: true,
      brand: true,
    },
  });

  if (!product) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-brand-cream p-4 sm:p-8">
      <div className="mx-auto max-w-3xl rounded-3xl border border-brand-sand/40 bg-white p-4 sm:p-6 shadow-soft-md">
        <div className="mb-3 flex items-center justify-between gap-3">
          <Link href="/" className="text-sm text-brand-stone underline">
            Home
          </Link>
          <p className="text-xs text-brand-stone">Product ID: {product.id}</p>
        </div>

        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-72 w-full rounded-2xl object-cover"
          />
        ) : null}

        <h1 className="mt-4 text-2xl font-heading text-brand-charcoal">{product.name}</h1>
        <p className="mt-1 text-sm text-brand-stone">{product.brand || "Unknown brand"}</p>
        <p className="mt-2 text-lg font-semibold text-brand-charcoal">₹{product.price || 0}</p>
        <p className="mt-2 text-sm text-brand-stone">Category: {product.category || "General"}</p>
        <p className="text-sm text-brand-stone">Stock: {product.stockQuantity}</p>
        <p className="text-sm text-brand-stone">
          Availability: {product.isAvailable ? "Available" : "Unavailable"}
        </p>

        {product.description ? (
          <p className="mt-4 text-sm leading-relaxed text-brand-charcoal">{product.description}</p>
        ) : (
          <p className="mt-4 text-sm text-brand-stone">No description available.</p>
        )}
      </div>
    </main>
  );
}
