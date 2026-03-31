import type { Metadata } from "next";
import BrandLogo from "@/app/components/brand/BrandLogo";

const BLOB_BASE_URL = process.env.NEXT_PUBLIC_BLOB_BASE_URL;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  if (!BLOB_BASE_URL) return {};

  const imageUrl = `${BLOB_BASE_URL}/tryons/${id}.png`;

  return {
    title: "AI Outfit Try-On | Rasphia",
    description: "See how this outfit looks using Rasphia’s AI virtual try-on.",
    openGraph: {
      title: "AI Outfit Try-On | Rasphia",
      description: "Generated using Rasphia — your AI personal stylist.",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: "Rasphia AI Outfit Try-On",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      images: [imageUrl],
    },
  };
}

export default async function TryOnSharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const imageUrl = BLOB_BASE_URL ? `${BLOB_BASE_URL}/tryons/${id}.png` : "";

  return (
    <main className="min-h-screen bg-brand-dark text-brand-cream flex items-center justify-center px-4 py-10 font-body">
      <div className="max-w-xl w-full text-center rounded-3xl border border-brand-sand/20 bg-brand-charcoal/35 p-6 md:p-8 backdrop-blur-md">
        <div className="flex items-center justify-center mb-6">
          <BrandLogo size={38} showWordmark wordmarkClassName="text-brand-cream text-lg" />
        </div>

        <h1 className="text-2xl md:text-3xl font-heading mb-3">
          AI Virtual Try-On
        </h1>

        <p className="text-brand-sand mb-6">
          See how this outfit looks, powered by Rasphia’s AI stylist.
        </p>

        {imageUrl && (
          <div className="relative rounded-2xl overflow-hidden shadow-soft-xl mb-8 border border-brand-sand/20 bg-brand-cream/10">
            <img
              src={imageUrl}
              alt="AI Outfit Try-On"
              className="w-full h-auto"
            />
          </div>
        )}

        <a
          href="/"
          className="inline-flex items-center justify-center gap-2 bg-white text-brand-charcoal px-6 py-3 rounded-xl font-medium hover:bg-brand-parchment transition"
        >
          Try your own outfit
        </a>

        <p className="text-xs text-brand-sand/70 mt-6">
          Generated using Rasphia, your AI personal stylist
        </p>
      </div>
    </main>
  );
}
