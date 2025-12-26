import Image from "next/image";
import type { Metadata } from "next";

/* -------------------------------------------
   Dynamic SEO / Social metadata
-------------------------------------------- */
export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const imageUrl = `https://blob.vercel-storage.com/tryons/${params.id}.png`;

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
      title: "AI Outfit Try-On | Rasphia",
      description:
        "See how this outfit looks using Rasphia’s AI virtual try-on.",
      images: [imageUrl],
    },
  };
}

/* -------------------------------------------
   Page UI
-------------------------------------------- */
export default function TryOnSharePage({ params }: { params: { id: string } }) {
  const imageUrl = `https://blob.vercel-storage.com/tryons/${params.id}.png`;

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0e0e11] via-[#14141a] to-black text-white flex items-center justify-center px-4">
      <div className="max-w-xl w-full text-center">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <Image
            src="/icons/icon-128.png"
            alt="Rasphia"
            width={36}
            height={36}
          />
          <span className="text-lg font-semibold tracking-wide">Rasphia</span>
        </div>

        {/* Headline */}
        <h1 className="text-2xl md:text-3xl font-semibold mb-3">
          AI Virtual Try-On
        </h1>

        <p className="text-gray-400 mb-6">
          See how this outfit looks — powered by Rasphia’s AI stylist.
        </p>

        {/* Image */}
        <div className="relative rounded-2xl overflow-hidden shadow-2xl mb-8 border border-white/10">
          <img
            src={imageUrl}
            alt="AI Outfit Try-On"
            className="w-full h-auto"
          />
        </div>

        {/* CTA */}
        <a
          href="/"
          className="inline-flex items-center justify-center gap-2 bg-white text-black px-6 py-3 rounded-xl font-medium hover:bg-gray-200 transition"
        >
          Try your own outfit
        </a>

        {/* Footer */}
        <p className="text-xs text-gray-500 mt-6">
          Generated using Rasphia — Your AI personal stylist
        </p>
      </div>
    </main>
  );
}
