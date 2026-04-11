import React, { useEffect, useRef, useState } from "react";
import {
  Sparkles,
  MessageCircle,
  ArrowRight,
  ArrowDown,
  UserRound,
} from "lucide-react";
import SocialLinks from "./SocialLinks";
import BrandLogo from "./brand/BrandLogo";

interface LandingPageProps {
  onLogin: () => void;
}

const navLinks = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Why Rasphia", href: "#contrast" },
  { label: "Stories", href: "#stories" },
];

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

const contrasts = [
  { old: "You search for products", vibe: "Products find you" },
  { old: "Same storefront for everyone", vibe: "Built just for you" },
  {
    old: "Decision fatigue from 100s of options",
    vibe: "Calm confidence from curated picks",
  },
  {
    old: "Mega-warehouses, faceless brands",
    vibe: "Your neighborhood's best makers",
  },
];

const personaSteps = [
  {
    step: "01",
    title: "Tell us a feeling",
    description:
      "Not a category. A mood, an occasion, a season of life. That's all we need to start.",
  },
  {
    step: "02",
    title: "Your taste blooms",
    description:
      "A few simple inputs evolve into a living map of your aesthetic, lifestyle, and sensibility.",
  },
  {
    step: "03",
    title: "The right 6, not 600",
    description:
      "Every visit surfaces products that genuinely fit - not trending, not sponsored, just right for you.",
  },
];

const testimonials = [
  {
    quote:
      "It felt like the store was built just for me. I didn't search for anything - it just knew.",
    author: "Medha A.",
    detail: "Hyderabad",
  },
  {
    quote:
      "I stopped scrolling through 40 pages of moisturizers. Rasphia showed me three. All perfect.",
    author: "Kabir L.",
    detail: "Pune",
  },
  {
    quote:
      "The gift I bought through Rasphia made my sister cry. She said it was the most 'her' thing she'd ever received.",
    author: "Sahana V.",
    detail: "Bangalore",
  },
];

const partnerLogos = [
  "Clay Studio",
  "Serenity Scents",
  "GlowLab",
  "EverHome",
  "UrbanGroom",
];

const previewSuggestions = [
  {
    name: "Niacinamide 10% Serum",
    notes: "Acne • Oil control",
    price: "₹399",
  },
  {
    name: "Oud Wood Pocket Perfume",
    notes: "Rich & long-lasting",
    price: "₹250",
  },
  {
    name: "Pastel Ceramic Vase",
    notes: "Room decor",
    price: "₹550",
  },
];

const HOMEPAGE_DEMO_VIDEO_URL =
  "https://mmml2bafriznrxgn.public.blob.vercel-storage.com/Merchant%20Onboarding%20%281%29.mp4";

const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
  const [hoveredVibe, setHoveredVibe] = useState<number | null>(null);
  const demoVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = demoVideoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;

        if (entry.isIntersecting) {
          video.play().catch(() => {
            // Ignore autoplay failures; controls remain available for manual play.
          });
          return;
        }

        video.pause();
      },
      { threshold: 0.5 }
    );

    observer.observe(video);

    return () => observer.disconnect();
  }, []);

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
              <a
                href="/merchant/onboarding"
                className="rounded-full px-3 py-1 transition-colors hover:bg-white/80 hover:text-stone-900"
              >
                Become a Merchant
              </a>
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
                You don&apos;t need more products.
                <br />
                <span className="text-amber-700">You need the right ones.</span>
              </h1>

              <p className="mt-5 text-lg text-stone-600">
                Rasphia is <em>Vibe Shopping</em> - a store built around your taste,
                not a catalog. Tell us how you feel. We&apos;ll do the rest.
              </p>
              <p className="mt-3 text-base text-stone-700">
                We partner with independent makers, local shops, and neighborhood businesses.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
                <button
                  onClick={onLogin}
                  className="inline-flex h-12 w-full shrink-0 items-center justify-center gap-3 whitespace-nowrap rounded-full border-0 bg-stone-900 px-8 py-3 font-medium text-white shadow-lg shadow-stone-300/60 transition hover:-translate-y-0.5 hover:bg-stone-800 sm:h-auto sm:w-auto"
                >
                  Start discovering
                  <ArrowRight className="h-5 w-5" />
                </button>

                <a
                  href="/storefronts"
                  className="inline-flex h-12 w-full shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-stone-300 bg-white/60 px-7 py-3 text-sm font-medium text-stone-800 transition hover:bg-white sm:h-auto sm:w-auto"
                >
                  Browse Merchant Stores
                </a>
                <a
                  href="/merchant/onboarding"
                  className="inline-flex h-12 w-full shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-stone-300 bg-white/60 px-7 py-3 text-sm font-medium text-stone-800 transition hover:bg-white sm:h-auto sm:w-auto"
                >
                  Become a Merchant
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
                  Live preview
                </div>

                <div className="mt-4 space-y-4 text-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-900 text-white">
                      <UserRound className="h-4 w-4" />
                    </div>
                    <div className="rounded-2xl rounded-bl-sm bg-gradient-to-br from-[#2C1A13] via-[#3F2B22] to-[#6C4C3C] px-4 py-3 text-white shadow-lg">
                      I need a thoughtful gift under ₹1000.
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-900">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div className="rounded-2xl rounded-tl-sm bg-gradient-to-r from-white via-stone-50 to-amber-50 px-4 py-3 text-stone-800 shadow-md">
                      Here are the best local picks with strong reviews and quick delivery.
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
              What&apos;s your vibe today?
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
            <p className="text-xs uppercase tracking-[0.4em] text-stone-500">
              Partner brands
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-6 text-sm font-medium text-stone-500">
              {partnerLogos.map((logo) => (
                <span key={logo} className="opacity-70">
                  {logo}
                </span>
              ))}
            </div>
          </section>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-6 py-20 lg:px-8">
        <section
          id="contrast"
          className="rounded-[32px] border border-stone-200/70 bg-white/80 p-8 shadow-xl shadow-stone-200/40 backdrop-blur"
        >
          <p className="text-xs uppercase tracking-[0.35em] text-amber-700">
            A different kind of shopping
          </p>
          <h2 className="mt-3 font-serif text-4xl text-stone-900">
            Shopping shouldn&apos;t feel like work.
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-stone-600">
            Traditional e-commerce gives you search bars and filters. Rasphia
            starts with how you feel, then curates what actually fits.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {contrasts.map((c) => (
              <div
                key={c.old}
                className="grid overflow-hidden rounded-2xl border border-stone-200/70 md:grid-cols-2"
              >
                <div className="bg-[#F6F0E7]/70 p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-stone-500">
                    Traditional
                  </p>
                  <p className="mt-2 text-sm text-black line-through decoration-black">
                    {c.old}
                  </p>
                </div>
                <div className="bg-white p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-amber-700">
                    Vibe Shopping
                  </p>
                  <p className="mt-2 text-sm font-medium text-stone-900">
                    {c.vibe}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section
          id="how-it-works"
          className="mt-16 rounded-[32px] bg-white p-8 shadow-xl shadow-stone-200/50"
        >
          <h2 className="font-serif text-4xl text-stone-900">
            A few inputs. A universe of perfect picks.
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-stone-600">
            Your taste graph evolves with you, so each session gets sharper and
            more personal.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {personaSteps.map((step) => (
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

        <section className="mt-20 rounded-[32px] bg-gradient-to-br from-[#FFF4E1] to-[#F1E3D3] p-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-700">
                For marketplaces & brands
              </p>
              <h2 className="mt-2 font-serif text-4xl">
                Integrate with the future of shopping.
              </h2>
              <p className="mt-4 max-w-2xl text-lg text-stone-600">
                Rasphia is building the AI intelligence layer for commerce.
                Integrate your catalog, reviews, or fulfillment and guide customers
                to better decisions across the open web.
              </p>

              <a
                href="/merchant/onboarding"
                className="mt-6 inline-flex items-center gap-3 rounded-full bg-stone-900 px-8 py-3 font-medium text-white shadow hover:bg-stone-800"
              >
                Become a Merchant
                <ArrowRight className="h-5 w-5" />
              </a>
            </div>

            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">
                Merchant Onboarding Demo
              </p>
              <div className="overflow-hidden rounded-2xl border border-amber-100/70 bg-black shadow-xl shadow-stone-300/40">
                <video
                  ref={demoVideoRef}
                  src={HOMEPAGE_DEMO_VIDEO_URL}
                  className="h-full w-full object-cover"
                  muted
                  loop
                  playsInline
                  controls
                  preload="metadata"
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
          </div>
        </section>

        <section
          id="stories"
          className="mt-20 rounded-[32px] bg-[#1C140E] px-8 py-12 text-white shadow-2xl shadow-stone-900/20"
        >
          <h2 className="font-serif text-4xl">
            Shopping that feels like it was meant for you.
          </h2>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {testimonials.map((t) => (
              <article
                key={t.author}
                className="rounded-3xl border border-white/10 bg-white/5 p-6"
              >
                <p className="text-white/80">&quot;{t.quote}&quot;</p>
                <div className="mt-4 border-t border-white/10 pt-4">
                  <p className="text-sm font-semibold">{t.author}</p>
                  <p className="text-xs text-white/60">{t.detail}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-20 rounded-[32px] bg-gradient-to-br from-[#2E1F1B] to-[#4B332A] px-8 py-12 text-white">
          <div className="grid gap-6 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm uppercase tracking-[0.4em] text-white/60">
                Ready?
              </p>
              <h2 className="mt-2 font-serif text-4xl leading-snug">
                Tell us what you like. We&apos;ll do the rest.
              </h2>
              <p className="mt-3 max-w-xl text-white/75">
                A simple taste quiz, a few signals, and your storefront starts
                feeling personal in minutes.
              </p>
            </div>
            <div className="flex flex-col gap-4">
              <button
                onClick={onLogin}
                className="inline-flex items-center justify-center gap-3 self-start rounded-full border-0 bg-white px-9 py-3 font-semibold text-stone-900 shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-amber-50"
                style={{ borderRadius: "999px" }}
              >
                Show me what&apos;s good
                <ArrowRight className="h-5 w-5" />
              </button>
              <p className="text-sm text-white/70">
                Prefer guidance?{" "}
                <a href="/contact" className="underline decoration-amber-200">
                  Book a live walkthrough
                </a>
                .
              </p>
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
                Shopping that knows you. Persona-driven discovery for the things
                that fit your life.
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
