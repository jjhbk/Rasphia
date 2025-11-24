// /app/about/page.tsx
export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#F8F4EF] text-stone-900">
      <div className="relative isolate overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FFF4E1] via-[#F8F1EA] to-[#F1E3D3]" />
        <div className="relative mx-auto max-w-5xl px-6 py-20 lg:px-8">
          <h1 className="font-serif text-5xl text-stone-900">About Rasphia</h1>
          <p className="mt-6 text-lg leading-relaxed text-stone-700">
            Rasphia is your AI-powered personal shopping concierge. Our vision
            is simple— make shopping feel like a natural conversation. No
            endless scrolling, no decision fatigue. Just effortless discovery.
          </p>
          <p className="mt-4 text-lg leading-relaxed text-stone-700">
            Whether you're exploring skincare, fragrances, décor, accessories,
            or everyday essentials, Rasphia curates personalized selections
            based on your tastes, needs, and budget. Every interaction becomes
            smoother, smarter, and beautifully intuitive.
          </p>
          <p className="mt-4 text-lg leading-relaxed text-stone-700">
            Powered by next‑generation AI, Rasphia continues to evolve—bringing
            human‑like understanding to digital shopping.
          </p>
        </div>
      </div>
    </div>
  );
}
