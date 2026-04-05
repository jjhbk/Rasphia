import Link from "next/link";
import Navbar from "@/app/components/Navbar";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-brand-cream text-brand-charcoal font-body">
      <Navbar />

      {/* Hero */}
      <div className="relative overflow-hidden bg-brand-hero border-b border-brand-sand/30">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-20 right-[-5%] h-80 w-80 rounded-full bg-brand-clay/15 blur-[90px]" />
          <div className="absolute bottom-[-10%] left-[10%] h-60 w-60 rounded-full bg-brand-sage/12 blur-[80px]" />
        </div>
        <div className="relative mx-auto max-w-4xl px-6 py-20 lg:px-8 animate-fade-up">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-sand/50 border border-brand-sand text-xs text-brand-stone uppercase tracking-widest mb-6">
            Our Story
          </span>
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
        <div className="grid md:grid-cols-2 gap-6 animate-fade-up">
          <div className="glass-card p-8 hover-lift">
            <h2 className="font-heading text-xl text-brand-charcoal mb-4">What we do</h2>
            <p className="text-brand-stone leading-relaxed text-sm">
              Whether you&apos;re exploring skincare, fragrances, décor, accessories, or
              everyday essentials, Rasphia curates personalized selections based on
              your tastes, needs, and budget. Every interaction becomes smoother,
              smarter, and beautifully intuitive.
            </p>
          </div>
          <div className="glass-card p-8 hover-lift">
            <h2 className="font-heading text-xl text-brand-charcoal mb-4">How we do it</h2>
            <p className="text-brand-stone leading-relaxed text-sm">
              Powered by next‑generation AI, Rasphia builds a deep understanding of
              who you are — your skin type, style archetype, lifestyle preferences —
              and uses that to recommend things that genuinely fit your life.
            </p>
          </div>
        </div>

        <div className="bg-brand-charcoal rounded-3xl p-10 text-brand-cream text-center animate-fade-up delay-150">
          <p className="font-heading text-2xl leading-snug max-w-xl mx-auto">
            &ldquo;Shopping should feel like asking a friend who knows you perfectly.&rdquo;
          </p>
          <p className="mt-4 text-brand-stone/80 text-sm">— The Rasphia Team</p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 animate-fade-up delay-225">
          {[
            { number: "6+", label: "Persona dimensions", sub: "Skin, hair, body, style, taste, lifestyle" },
            { number: "AI", label: "Powered matching", sub: "OpenAI + Gemini for personalized curation" },
            { number: "∞", label: "Unique vibes", sub: "Every customer gets their own experience" },
          ].map((stat) => (
            <div key={stat.label} className="panel text-center p-6">
              <p className="font-heading text-4xl text-brand-terracotta">{stat.number}</p>
              <p className="font-semibold text-brand-charcoal mt-1">{stat.label}</p>
              <p className="text-xs text-brand-stone mt-1">{stat.sub}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 animate-fade-up delay-300">
          <Link href="/" className="btn btn-primary btn-lg">
            Try Rasphia
          </Link>
          <Link href="/storefronts" className="btn btn-secondary btn-lg">
            Explore Stores
          </Link>
          <Link href="/contact" className="btn btn-ghost btn-lg">
            Get in Touch
          </Link>
        </div>
      </div>
    </div>
  );
}
