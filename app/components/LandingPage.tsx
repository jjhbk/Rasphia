"use client";

import React, { useState } from "react";
import { ArrowRight, ArrowDown } from "lucide-react";
import SocialLinks from "./SocialLinks";

interface LandingPageProps {
  onLogin: () => void;
}

/* ── Vibe tiles for the hook section ── */
const vibeTiles = [
  {
    mood: "Cozy Sunday",
    hint: "Candles, throws, warm drinks",
    gradient: "from-[#E8D5C4] to-[#D4A574]",
  },
  {
    mood: "Gift for someone hard to shop for",
    hint: "Thoughtful, unexpected finds",
    gradient: "from-[#C5CEBC] to-[#8B9D83]",
  },
  {
    mood: "Refresh my desk",
    hint: "Clean lines, quiet objects",
    gradient: "from-[#D4C5B5] to-[#A39B93]",
  },
  {
    mood: "Something unexpected",
    hint: "Surprise me with taste",
    gradient: "from-[#E8947A] to-[#C75C3A]",
  },
];

/* ── Contrast section data ── */
const contrasts = [
  { old: "You search for products", vibe: "Products find you" },
  { old: "Same storefront for everyone", vibe: "Built just for you" },
  { old: "Decision fatigue from 100s of options", vibe: "Calm confidence from curated picks" },
  { old: "Mega-warehouses, faceless brands", vibe: "Your neighborhood's best makers" },
];

/* ── How persona graph works ── */
const personaSteps = [
  {
    step: "01",
    title: "Tell us a feeling",
    description: "Not a category. A mood, an occasion, a season of life. That's all we need to start.",
  },
  {
    step: "02",
    title: "Your taste blooms",
    description: "A few simple inputs evolve into a living map of your aesthetic, lifestyle, and sensibility.",
  },
  {
    step: "03",
    title: "The right 6, not 600",
    description: "Every visit surfaces products that genuinely fit — not trending, not sponsored, just right for you.",
  },
];

/* ── Testimonials ── */
const testimonials = [
  {
    quote: "It felt like the store was built just for me. I didn't search for anything — it just knew.",
    author: "Medha A.",
    detail: "Hyderabad",
  },
  {
    quote: "I stopped scrolling through 40 pages of moisturizers. Rasphia showed me three. All perfect.",
    author: "Kabir L.",
    detail: "Pune",
  },
  {
    quote: "The gift I bought through Rasphia made my sister cry. She said it was the most 'her' thing she'd ever received.",
    author: "Sahana V.",
    detail: "Bangalore",
  },
];

const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
  const [hoveredVibe, setHoveredVibe] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-brand-cream text-brand-charcoal">
      {/* ══════════════════════════════════════════════════
          NAVIGATION
      ══════════════════════════════════════════════════ */}
      <nav className="sticky top-0 z-50 border-b border-brand-sand/60 bg-brand-cream/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-charcoal font-heading text-lg text-brand-cream">
              R
            </div>
            <div>
              <p className="font-heading text-lg tracking-wide text-brand-charcoal">
                Rasphia
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm text-brand-stone">
            <a href="#how-it-works" className="hover:text-brand-charcoal transition-colors">
              How it works
            </a>
            <a href="#neighborhood" className="hover:text-brand-charcoal transition-colors">
              Local
            </a>
            <a href="#stories" className="hover:text-brand-charcoal transition-colors">
              Stories
            </a>
            <a
              href="/merchant/onboarding"
              className="text-brand-terracotta font-medium hover:text-brand-coral transition-colors"
            >
              For Merchants
            </a>
            <a
              href="/storefronts"
              className="font-medium hover:text-brand-charcoal transition-colors"
            >
              Explore Stores
            </a>
          </div>

          <button
            onClick={onLogin}
            className="rounded-full bg-brand-charcoal px-6 py-2.5 text-sm font-medium text-brand-cream shadow-soft hover:bg-brand-warm-black transition-colors"
          >
            Sign in
          </button>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════
          HERO — THE HOOK
      ══════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-brand-hero">
        {/* Subtle warm orbs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 right-[-10%] h-[500px] w-[500px] rounded-full bg-brand-sand/40 blur-[120px]" />
          <div className="absolute bottom-[-20%] left-[-5%] h-[400px] w-[400px] rounded-full bg-brand-clay/20 blur-[100px]" />
        </div>

        <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-24 lg:px-8 lg:pt-32">
          <div className="max-w-3xl">
            <h1 className="font-heading text-5xl leading-[1.1] tracking-tight md:text-7xl lg:text-[5.5rem]">
              You don't need
              <br />
              more products.
              <br />
              <span className="text-brand-terracotta">You need the right ones.</span>
            </h1>

            <p className="mt-8 max-w-xl text-lg leading-relaxed text-brand-stone md:text-xl">
              Rasphia is <em>Vibe Shopping</em> — a store built around your taste,
              not a catalog. Tell us how you feel. We'll do the rest.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
              <button
                onClick={onLogin}
                className="inline-flex items-center justify-center gap-3 rounded-full bg-brand-charcoal px-8 py-4 text-base font-medium text-brand-cream shadow-soft-lg hover:bg-brand-warm-black transition-all hover:-translate-y-0.5"
              >
                Start discovering
                <ArrowRight className="h-5 w-5" />
              </button>
              <a
                href="/storefronts"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-brand-sand bg-white/70 px-6 py-3 text-sm text-brand-charcoal hover:bg-white transition-colors"
              >
                Browse Merchant Stores
              </a>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 text-sm text-brand-stone hover:text-brand-charcoal transition-colors"
              >
                See how it works
                <ArrowDown className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* VIBE TILES */}
          <div className="mt-20">
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-brand-stone/70 mb-6">
              What's your vibe today?
            </p>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {vibeTiles.map((tile, i) => (
                <button
                  key={tile.mood}
                  onMouseEnter={() => setHoveredVibe(i)}
                  onMouseLeave={() => setHoveredVibe(null)}
                  onClick={onLogin}
                  className={`group relative overflow-hidden rounded-3xl p-6 text-left transition-all duration-300 ${
                    hoveredVibe === i ? "scale-[1.03] shadow-soft-lg" : "shadow-soft"
                  }`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${tile.gradient} opacity-30 group-hover:opacity-50 transition-opacity`} />
                  <div className="relative">
                    <p className="font-heading text-lg text-brand-charcoal">
                      {tile.mood}
                    </p>
                    <p className="mt-1 text-xs text-brand-stone/80">
                      {tile.hint}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          THE CONTRAST — OLD WAY VS VIBE SHOPPING
      ══════════════════════════════════════════════════ */}
      <section className="bg-brand-cream py-24">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-brand-terracotta mb-4">
            A different kind of shopping
          </p>
          <h2 className="font-heading text-4xl leading-tight md:text-5xl max-w-2xl">
            Shopping shouldn't feel like work.
          </h2>
          <p className="mt-4 max-w-xl text-brand-stone text-lg">
            Traditional e-commerce gives you search bars and filters — tools for people
            who already know what they want. But most of the time, you don't have a list.
            You have a feeling.
          </p>

          <div className="mt-16 grid gap-4 md:grid-cols-2">
            {contrasts.map((c) => (
              <div
                key={c.old}
                className="flex items-stretch rounded-2xl border border-brand-sand/60 overflow-hidden"
              >
                <div className="flex-1 bg-brand-parchment/60 p-6">
                  <p className="text-xs uppercase tracking-wider text-brand-stone/60 mb-2">
                    Traditional
                  </p>
                  <p className="text-sm text-brand-stone line-through decoration-brand-sand">
                    {c.old}
                  </p>
                </div>
                <div className="flex-1 bg-white p-6">
                  <p className="text-xs uppercase tracking-wider text-brand-terracotta/80 mb-2">
                    Vibe Shopping
                  </p>
                  <p className="text-sm font-medium text-brand-charcoal">
                    {c.vibe}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          HOW IT WORKS — THE PERSONA GRAPH
      ══════════════════════════════════════════════════ */}
      <section id="how-it-works" className="bg-white py-24">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-brand-sage mb-4">
            Your style fingerprint
          </p>
          <h2 className="font-heading text-4xl leading-tight md:text-5xl max-w-3xl">
            A few inputs. A universe of perfect picks.
          </h2>
          <p className="mt-4 max-w-2xl text-brand-stone text-lg">
            Your persona graph is a living, evolving map of your taste — not just
            what you buy, but what you're drawn to, what your life looks like,
            what season you're in.
          </p>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {personaSteps.map((s) => (
              <div key={s.step} className="group">
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-parchment text-brand-terracotta font-heading text-xl transition-colors group-hover:bg-brand-terracotta group-hover:text-white">
                  {s.step}
                </div>
                <h3 className="font-heading text-2xl text-brand-charcoal">
                  {s.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-brand-stone">
                  {s.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          HYPERLOCAL — YOUR NEIGHBORHOOD
      ══════════════════════════════════════════════════ */}
      <section id="neighborhood" className="bg-brand-parchment py-24">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.3em] text-brand-terracotta mb-4">
                Hyperlocal
              </p>
              <h2 className="font-heading text-4xl leading-tight md:text-5xl">
                Discover what's been around the corner all along.
              </h2>
              <p className="mt-6 text-brand-stone text-lg leading-relaxed">
                The baker three streets away. The ceramicist in the next neighbourhood.
                The family-run spice shop. Every purchase on Rasphia has a face behind it.
              </p>

              <div className="mt-10 space-y-5">
                {[
                  { label: "Money stays in the community", icon: "circle" },
                  { label: "Delivery is faster because it's closer", icon: "circle" },
                  { label: "Every purchase has a face behind it", icon: "circle" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-4">
                    <div className="h-2 w-2 rounded-full bg-brand-terracotta flex-shrink-0" />
                    <p className="text-sm text-brand-charcoal">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { name: "Clay Studio", type: "Ceramics", area: "Jubilee Hills" },
                { name: "Serenity Scents", type: "Fragrances", area: "Banjara Hills" },
                { name: "GlowLab", type: "Skincare", area: "Madhapur" },
                { name: "EverHome", type: "Home Decor", area: "Kondapur" },
              ].map((shop) => (
                <div
                  key={shop.name}
                  className="rounded-2xl bg-white p-5 shadow-soft transition-all hover:shadow-soft-md hover:-translate-y-0.5"
                >
                  <div className="h-20 w-full rounded-xl bg-gradient-to-br from-brand-sand/50 to-brand-parchment mb-4" />
                  <p className="font-medium text-sm text-brand-charcoal">{shop.name}</p>
                  <p className="text-xs text-brand-stone">{shop.type}</p>
                  <p className="text-xs text-brand-terracotta mt-1">{shop.area}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          MERCHANT HINT
      ══════════════════════════════════════════════════ */}
      <section className="bg-brand-charcoal py-16">
        <div className="mx-auto max-w-6xl px-6 lg:px-8 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-brand-clay/70 mb-4">
            For makers & shops
          </p>
          <h2 className="font-heading text-3xl text-white md:text-4xl max-w-2xl mx-auto">
            We partner with independent makers, local shops, and neighborhood businesses.
          </h2>
          <a
            href="/merchant/onboarding"
            className="mt-8 inline-flex items-center gap-3 rounded-full bg-white px-8 py-3 text-sm font-medium text-brand-charcoal shadow-soft-lg hover:-translate-y-0.5 transition-all"
          >
            Become a merchant
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          STORIES / TESTIMONIALS
      ══════════════════════════════════════════════════ */}
      <section id="stories" className="bg-white py-24">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-brand-sage mb-4">
            Stories
          </p>
          <h2 className="font-heading text-4xl md:text-5xl max-w-2xl">
            Shopping that feels like it was meant for you.
          </h2>

          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {testimonials.map((t) => (
              <article
                key={t.author}
                className="flex flex-col rounded-2xl border border-brand-sand/50 p-8 transition-all hover:shadow-soft-md"
              >
                <blockquote className="flex-1 text-brand-charcoal leading-relaxed">
                  "{t.quote}"
                </blockquote>
                <div className="mt-6 pt-4 border-t border-brand-sand/40">
                  <p className="text-sm font-medium text-brand-charcoal">{t.author}</p>
                  <p className="text-xs text-brand-stone">{t.detail}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          CLOSING CTA
      ══════════════════════════════════════════════════ */}
      <section className="bg-brand-dark py-24">
        <div className="mx-auto max-w-6xl px-6 lg:px-8 text-center">
          <h2 className="font-heading text-4xl text-white md:text-5xl lg:text-6xl max-w-3xl mx-auto leading-tight">
            Tell us what you like.
            <br />
            <span className="text-brand-clay">We'll do the rest.</span>
          </h2>
          <p className="mt-6 text-brand-stone/80 text-lg max-w-xl mx-auto">
            A simple taste quiz — not a registration form. Pick a few images,
            answer a couple of questions, and watch your storefront come to life.
          </p>
          <button
            onClick={onLogin}
            className="mt-10 inline-flex items-center gap-3 rounded-full bg-white px-10 py-4 text-base font-medium text-brand-charcoal shadow-soft-xl hover:-translate-y-1 transition-all"
          >
            Show me what's good
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════ */}
      <footer className="border-t border-brand-sand/40 bg-brand-cream">
        <div className="mx-auto max-w-6xl px-6 py-14 lg:px-8">
          <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="font-heading text-2xl text-brand-charcoal">Rasphia</p>
              <p className="mt-2 text-sm text-brand-stone max-w-xs">
                Shopping that knows you. Persona-driven discovery for the things
                that fit your life.
              </p>
            </div>

            <div className="flex flex-col gap-6 md:flex-row md:gap-16">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-brand-stone/60 mb-3">
                  Company
                </p>
                <div className="flex flex-col gap-2 text-sm text-brand-stone">
                  <a href="/about" className="hover:text-brand-charcoal">About</a>
                  <a href="/contact" className="hover:text-brand-charcoal">Contact</a>
                  <a href="/privacy" className="hover:text-brand-charcoal">Privacy</a>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-brand-stone/60 mb-3">
                  Connect
                </p>
                <SocialLinks />
              </div>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-brand-sand/30 text-xs text-brand-stone/60">
            <p>&copy; {new Date().getFullYear()} Rasphia. Shop the vibe.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
