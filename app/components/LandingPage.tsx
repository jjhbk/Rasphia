import React, { useState } from "react";
import {
  Sparkles,
  MessageCircle,
  ArrowRight,
  ArrowDown,
  CheckCircle2,
} from "lucide-react";
import SocialLinks from "./SocialLinks";
import BrandLogo from "./brand/BrandLogo";
import Link from "next/link";

interface LandingPageProps {
  onLogin: () => void;
}

const navLinks = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Why Rasphia", href: "#why-rasphia" },
  { label: "Meet the makers", href: "#makers" },
  { label: "WhatsApp shopping", href: "#whatsapp-shopping" },
];

const vibeTiles = [
  {
    mood: "Handmade Home",
    hint: "Candles, ceramics, thoughtful decor",
    gradient: "from-[#E8D5C4] to-[#D4A574]",
  },
  {
    mood: "Skincare That Fits",
    hint: "Skin-type aware independent labels",
    gradient: "from-[#C5CEBC] to-[#8B9D83]",
  },
  {
    mood: "Gifts With Story",
    hint: "Maker-made, personal, values-aligned",
    gradient: "from-[#D4C5B5] to-[#A39B93]",
  },
  {
    mood: "Everyday Local Finds",
    hint: "No marketplace clutter, just your vibe",
    gradient: "from-[#E8947A] to-[#C75C3A]",
  },
];

const whyRasphia = [
  {
    title: "Real makers, not marketplaces",
    description:
      "Every product comes directly from an independent Indian seller. No middlemen, no inflated platform pricing, no mass-market sameness.",
  },
  {
    title: "AI that gets your taste",
    description:
      "Tell Rasphia your skin type, style, budget, and values. The concierge learns what fits and cuts the sponsored clutter.",
  },
  {
    title: "Shop entirely on WhatsApp",
    description:
      "Discover, buy, pay, and track orders without leaving chat. UPI checkout, WhatsApp updates, and direct conversations with makers.",
  },
];

const howItWorksSteps = [
  {
    step: "01",
    title: "Tell Rasphia what you love",
    description:
      "Start with a 60-second web quiz or WhatsApp chat. Share your style, budget, needs, and preferences.",
  },
  {
    step: "02",
    title: "Get matched to makers who fit",
    description:
      "Our AI surfaces real independent brands that match your taste, not algorithm-boosted listings.",
  },
  {
    step: "03",
    title: "Buy and chat directly",
    description:
      "Checkout with UPI, get WhatsApp updates, and connect with real humans on the other end.",
  },
];

const makerTiles = [
  "Onboarding independent makers now — join the waitlist to be first to browse.",
  "Onboarding independent makers now — join the waitlist to be first to browse.",
  "Onboarding independent makers now — join the waitlist to be first to browse.",
];

const previewSuggestions = [
  {
    name: "Candle set from a Jaipur maker",
    notes: "Hand-poured • Small batch",
    price: "From ₹699",
  },
  {
    name: "Ceramic cup duo by studio potter",
    notes: "Wheel-thrown • Gift-ready",
    price: "From ₹1,099",
  },
  {
    name: "Clean skincare starter ritual",
    notes: "By indie formulation lab",
    price: "From ₹899",
  },
];

const WHATSAPP_NUMBER = "+91 6301304257";
const WHATSAPP_LINK = "https://wa.me/916301304257?text=Hi%2C%20I%20want%20to%20shop";

const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
  const [hoveredVibe, setHoveredVibe] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[#F8F4EF] text-stone-900">
      <div className="relative isolate overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FFF4E1] via-[#F8F1EA] to-[#F1E3D3]" />
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-10 right-0 h-72 w-72 rounded-[45%] bg-gradient-to-br from-[#F8DCC0] via-[#F9C8A7] to-[#F0B9A3] opacity-60 blur-3xl" />
          <div className="absolute bottom-[-60px] left-[-40px] h-96 w-96 rounded-[60%] bg-gradient-to-br from-[#2F1A19] via-[#613629] to-[#AD6F52] opacity-50 blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-6xl px-6 py-8 lg:px-8">
          <nav className="flex flex-wrap items-center justify-between gap-4 rounded-full border border-white/50 bg-white/50 px-5 py-3 shadow-[0_10px_40px_rgba(0,0,0,0.05)] backdrop-blur">
            <div className="flex items-center gap-2">
              <BrandLogo size={34} showWordmark wordmarkClassName="text-base font-semibold text-brand-charcoal" />
            </div>

            <div className="hidden md:flex items-center gap-6 text-sm text-stone-600">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="rounded-full px-3 py-1 transition-colors hover:bg-white/80 hover:text-stone-900"
                >
                  {link.label}
                </a>
              ))}
              <Link href="/merchant" className="rounded-full px-3 py-1 transition-colors hover:bg-white/80 hover:text-stone-900">
                Become a Merchant
              </Link>
            </div>

            <button
              onClick={onLogin}
              className="hidden md:inline-flex items-center gap-2 rounded-full bg-stone-900 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-stone-400/40 transition hover:-translate-y-0.5 hover:bg-stone-800"
            >
              Sign in
              <ArrowRight className="h-4 w-4" />
            </button>
          </nav>

          <header className="mt-16 grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16 lg:pl-6">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-1 text-sm font-medium text-stone-600">
                <Sparkles className="h-4 w-4" /> Vibe shopping, powered by your taste
              </p>

              <h1 className="mt-6 font-serif text-5xl leading-tight md:text-6xl">
                Shop the vibe.
                <br />
                <span className="text-amber-700">Skip the marketplace.</span>
              </h1>

              <p className="mt-5 text-lg text-stone-600">
                Discover India&apos;s best independent makers - candles, ceramics, skincare,
                handmade everything. Our AI learns your taste and matches you to brands that
                actually fit. Shop on the web or entirely through WhatsApp.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
                <button
                  onClick={onLogin}
                  className="inline-flex h-12 w-full shrink-0 items-center justify-center gap-3 whitespace-nowrap rounded-full border-0 bg-stone-900 px-8 py-3 font-medium text-white shadow-lg shadow-stone-300/60 transition hover:-translate-y-0.5 hover:bg-stone-800 sm:h-auto sm:w-auto"
                >
                  Start shopping
                  <ArrowRight className="h-5 w-5" />
                </button>

                <a
                  href={WHATSAPP_LINK}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-12 w-full shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-stone-300 bg-white/60 px-7 py-3 text-sm font-medium text-stone-800 transition hover:bg-white sm:h-auto sm:w-auto"
                >
                  Chat with Rasphia on WhatsApp - send &quot;hi&quot; to {WHATSAPP_NUMBER}
                </a>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center gap-2 py-2 text-sm text-stone-600 transition hover:text-stone-900 sm:px-2 sm:py-3"
                >
                  See how it works
                  <ArrowDown className="h-4 w-4" />
                </a>
              </div>

            </div>

            <div className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/90 p-6 shadow-2xl lg:ml-10 xl:ml-14">
              <div className="relative rounded-2xl bg-white/95 p-5 backdrop-blur">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-stone-400">
                  <MessageCircle className="h-4 w-4 text-amber-600" />
                  Concierge preview
                </div>

                <div className="mt-4 space-y-4 text-sm">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl rounded-bl-sm bg-gradient-to-br from-[#2C1A13] via-[#3F2B22] to-[#6C4C3C] px-4 py-3 text-white shadow-lg">
                      Hi, I want to shop.
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-900">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div className="rounded-2xl rounded-tl-sm bg-gradient-to-r from-white via-stone-50 to-amber-50 px-4 py-3 text-stone-800 shadow-md">
                      Perfect. Tell me your vibe and budget. I&apos;ll match you with independent Indian makers.
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative mt-5 rounded-2xl border border-white/40 bg-gradient-to-br from-white/95 via-[#FFF6EA]/90 to-white/70 p-4 backdrop-blur">
                <div className="relative flex items-center justify-between text-sm font-semibold text-stone-600">
                  <p>Suggested items</p>
                  <span className="text-xs uppercase tracking-[0.3em] text-amber-600">
                    curated
                  </span>
                </div>
                <div className="relative mt-4 grid gap-3">
                  {previewSuggestions.map((s) => (
                    <div
                      key={s.name}
                      className="flex items-center justify-between rounded-2xl border border-stone-100/60 bg-white/85 px-4 py-3 shadow-sm"
                    >
                      <div>
                        <p className="text-sm font-semibold">{s.name}</p>
                        <p className="text-xs text-stone-500">{s.notes}</p>
                      </div>
                      <p className="text-sm font-medium">{s.price}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </header>

          <section className="mt-16">
            <p className="text-xs uppercase tracking-[0.35em] text-stone-500">
              What do you want to shop today?
            </p>
            <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
              {vibeTiles.map((tile, i) => (
                <button
                  key={tile.mood}
                  onMouseEnter={() => setHoveredVibe(i)}
                  onMouseLeave={() => setHoveredVibe(null)}
                  onClick={onLogin}
                  className={`group relative overflow-hidden rounded-3xl border border-white/60 p-5 text-left backdrop-blur transition-all duration-300 ${
                    hoveredVibe === i
                      ? "scale-[1.02] shadow-lg shadow-stone-300/50"
                      : "shadow-md shadow-stone-200/60"
                  }`}
                >
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${tile.gradient} opacity-30 transition-opacity group-hover:opacity-45`}
                  />
                  <div className="relative">
                    <p className="font-serif text-lg leading-tight text-stone-900">
                      {tile.mood}
                    </p>
                    <p className="mt-1 text-xs text-stone-700">{tile.hint}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="mt-16 border-t border-white/50 py-8 text-center">
            <p className="text-sm text-stone-600">
              Built for Indian shoppers. UPI payments, WhatsApp updates, direct from the maker&apos;s hands to yours.
            </p>
          </section>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-6 py-20 lg:px-8">
        <section
          id="why-rasphia"
          className="rounded-[32px] border border-stone-200/70 bg-white/80 p-8 shadow-xl shadow-stone-200/40 backdrop-blur"
        >
          <p className="text-xs uppercase tracking-[0.35em] text-amber-700">
            Why Rasphia
          </p>
          <h2 className="mt-3 font-serif text-4xl text-stone-900">
            Shop the vibe, not the clutter.
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-stone-600">
            Rasphia helps you move away from algorithmic noise and toward independent makers
            who actually match your taste.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {whyRasphia.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-stone-200/70 bg-white p-6"
              >
                <h3 className="text-xl font-semibold text-stone-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section
          id="how-it-works"
          className="mt-16 rounded-[32px] bg-white p-8 shadow-xl shadow-stone-200/50"
        >
          <h2 className="font-serif text-4xl text-stone-900">
            How it works
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-stone-600">
            Fast, personal, and built around independent makers.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {howItWorksSteps.map((step) => (
              <div
                key={step.step}
                className="rounded-2xl border border-stone-100 p-6 transition-all hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100/60 text-lg font-semibold text-amber-800">
                  {step.step}
                </div>
                <h3 className="text-xl font-semibold text-stone-900">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm text-stone-600">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section
          id="makers"
          className="mt-20 rounded-[32px] bg-gradient-to-br from-[#FFF4E1] to-[#F1E3D3] p-10"
        >
          <div className="flex flex-col items-start gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-700">
                Meet the makers
              </p>
              <h2 className="mt-2 font-serif text-4xl">
                Independent brands, curated with care.
              </h2>
              <p className="mt-4 max-w-xl text-lg text-stone-600">
                Onboarding independent makers now - join the waitlist to be first to browse.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {makerTiles.map((text, idx) => (
              <article key={idx} className="rounded-3xl border border-stone-200/70 bg-white/85 p-6 shadow-md">
                <div className="h-36 rounded-2xl border border-dashed border-stone-300 bg-stone-100/60" />
                <p className="mt-4 text-sm text-stone-600">{text}</p>
                <div className="mt-5">
                  <button
                    onClick={onLogin}
                    className="inline-flex items-center gap-2 rounded-full bg-stone-900 px-5 py-2 text-sm font-medium text-white"
                  >
                    Join waitlist to shop
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section
          id="whatsapp-shopping"
          className="mt-20 rounded-[32px] bg-[#1C140E] px-8 py-12 text-white shadow-2xl shadow-stone-900/20"
        >
          <h2 className="font-serif text-4xl">
            Your personal shopper lives in WhatsApp.
          </h2>
          <p className="mt-4 max-w-3xl text-white/80">
            Message {WHATSAPP_NUMBER} and browse, buy, pay, and track orders entirely in chat.
            Perfect if you hate app clutter or want a more personal shopping flow.
          </p>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="rounded-2xl border border-white/15 bg-white/5 p-6">
              <p className="text-sm text-white/85">WhatsApp shopping flow</p>
              <div className="mt-4 space-y-3 text-sm">
                {[
                  "Send: Hi, I want to shop",
                  "Share your vibe, budget, and what you need",
                  "Get matched picks from independent makers",
                  "Pay by UPI and track updates in WhatsApp",
                ].map((line) => (
                  <div key={line} className="flex items-start gap-2 text-white/80">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                    <span>{line}</span>
                  </div>
                ))}
              </div>
            </div>
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-3 rounded-full bg-white px-9 py-3 font-semibold text-stone-900 shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-amber-50"
            >
              Try it now on WhatsApp
              <ArrowRight className="h-5 w-5" />
            </a>
          </div>
        </section>

        <section className="mt-20 rounded-[32px] bg-gradient-to-br from-[#2E1F1B] to-[#4B332A] px-8 py-12 text-white">
          <div className="grid gap-6 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm uppercase tracking-[0.4em] text-white/60">
                Ready to shop differently?
              </p>
              <h2 className="mt-2 font-serif text-4xl leading-snug">
                Start with your vibe.
                <br />
                Shop your values.
              </h2>
              <p className="mt-3 max-w-xl text-white/75">
                Discover products from independent Indian makers, with WhatsApp-native shopping when you want it.
              </p>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
              <Link
                href="/storefronts"
                className="inline-flex items-center justify-center gap-3 rounded-full border-0 bg-white px-9 py-3 font-semibold text-stone-900 shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-amber-50"
              >
                Browse stores
              </Link>
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-3 rounded-full border border-white/40 bg-white/10 px-9 py-3 font-semibold text-white transition hover:bg-white/20"
              >
                Chat on WhatsApp
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-brand-sand/40 bg-brand-cream">
        <div className="mx-auto max-w-6xl px-6 py-14 lg:px-8">
          <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="font-heading text-2xl text-brand-charcoal">Rasphia</p>
              <p className="mt-2 max-w-xs text-sm text-brand-stone">
                Shop the vibe with independent Indian makers, on web or WhatsApp.
              </p>
            </div>

            <div className="flex flex-col gap-6 md:flex-row md:gap-16">
              <div>
                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-brand-stone/60">
                  Company
                </p>
                <div className="flex flex-col gap-2 text-sm text-brand-stone">
                  <a href="/about" className="hover:text-brand-charcoal">
                    About
                  </a>
                  <a href="/contact" className="hover:text-brand-charcoal">
                    Contact
                  </a>
                  <a href="/privacy" className="hover:text-brand-charcoal">
                    Privacy
                  </a>
                </div>
              </div>
              <div>
                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-brand-stone/60">
                  Connect
                </p>
                <SocialLinks />
              </div>
            </div>
          </div>

          <div className="mt-12 border-t border-brand-sand/30 pt-6 text-xs text-brand-stone/60">
            <p>&copy; {new Date().getFullYear()} Rasphia. Shop the vibe.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
