import Link from "next/link";
import BrandLogo from "@/app/components/brand/BrandLogo";
import BrandBanner from "@/app/components/brand/BrandBanner";

export default function Stylist() {
  return (
    <div className="min-h-screen bg-brand-hero p-6 font-body">
      <div className="mx-auto max-w-5xl space-y-6">
        <BrandBanner className="hidden md:block" />

        <div className="rounded-3xl border border-brand-sand/40 bg-white/85 p-8 shadow-soft-lg">
          <div className="flex items-center gap-3 mb-5">
            <BrandLogo size={40} showWordmark wordmarkClassName="text-lg" />
          </div>
          <h1 className="font-heading text-4xl text-brand-charcoal">AI Stylist</h1>
          <p className="mt-3 max-w-2xl text-brand-stone">
            This experience is being refreshed with the new Rasphia design system.
            The upcoming version will guide outfit choices from your taste graph and local merchant catalog.
          </p>
          <div className="mt-6">
            <Link
              href="/"
              className="inline-flex rounded-full bg-brand-charcoal px-6 py-2.5 text-sm text-white hover:bg-brand-warm-black transition-colors"
            >
              Back Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
