export default function AboutPage() {
  return (
    <div className="min-h-screen bg-brand-cream text-brand-charcoal font-body">
      {/* Hero */}
      <div className="relative overflow-hidden bg-brand-parchment border-b border-brand-sand/40">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-parchment via-brand-cream to-brand-sand/20 pointer-events-none" />
        <div className="relative mx-auto max-w-4xl px-6 py-20 lg:px-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-sand/50 border border-brand-sand text-xs text-brand-stone uppercase tracking-widest mb-6">
            Our Story
          </div>
          <h1 className="font-heading text-5xl lg:text-6xl text-brand-charcoal leading-tight">
            About Rasphia
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-brand-stone max-w-2xl">
            Rasphia is your AI-powered personal shopping concierge. Our vision is
            simple — make shopping feel like a natural conversation. No endless
            scrolling, no decision fatigue. Just effortless discovery.
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-4xl px-6 py-16 lg:px-8 space-y-12">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white/60 border border-brand-sand/30 rounded-2xl p-8 shadow-soft">
            <h2 className="font-heading text-xl text-brand-charcoal mb-4">What we do</h2>
            <p className="text-brand-stone leading-relaxed">
              Whether you're exploring skincare, fragrances, décor, accessories, or
              everyday essentials, Rasphia curates personalized selections based on
              your tastes, needs, and budget. Every interaction becomes smoother,
              smarter, and beautifully intuitive.
            </p>
          </div>
          <div className="bg-white/60 border border-brand-sand/30 rounded-2xl p-8 shadow-soft">
            <h2 className="font-heading text-xl text-brand-charcoal mb-4">How we do it</h2>
            <p className="text-brand-stone leading-relaxed">
              Powered by next‑generation AI, Rasphia builds a deep understanding of
              who you are — your skin type, style archetype, lifestyle preferences —
              and uses that to recommend things that genuinely fit your life.
            </p>
          </div>
        </div>

        <div className="bg-brand-charcoal rounded-3xl p-10 text-brand-cream text-center">
          <p className="font-heading text-2xl leading-snug max-w-xl mx-auto">
            "Shopping should feel like asking a friend who knows you perfectly."
          </p>
          <p className="mt-4 text-brand-stone text-sm">— The Rasphia Team</p>
        </div>

        <div className="text-center">
          <a
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-brand-charcoal text-brand-cream text-sm font-medium hover:bg-brand-warm-black transition-colors shadow-soft"
          >
            Try Rasphia
          </a>
        </div>
      </div>
    </div>
  );
}
