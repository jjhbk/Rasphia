import React from "react";
import {
  Sparkles,
  MessageCircle,
  Gift,
  Clock3,
  Star,
  ArrowRight,
  UserRound,
} from "lucide-react";

interface LandingPageProps {
  onLogin: () => void;
}

const navLinks = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Collections", href: "#collections" },
  { label: "Stories", href: "#stories" },
];

const stats = [
  { label: "Briefs completed", value: "12k+" },
  { label: "Partner ateliers", value: "150+" },
  { label: "Delight score", value: "4.9" },
];

const steps = [
  {
    title: "Share the vibe",
    description: "Tell us who and why in a sentence or two.",
    icon: MessageCircle,
  },
  {
    title: "Review 3 picks",
    description: "Rasphia compares scents and keepsakes side by side.",
    icon: Gift,
  },
  {
    title: "Send with ease",
    description: "Payments, wrapping, and tracking handled quietly.",
    icon: Clock3,
  },
];

const curatedProducts = [
  {
    name: "Velvet Oud Atelier",
    caption: "Night-blooming extrait",
    price: "₹6,800",
    accent: "from-[#3F1E17] via-[#714134] to-[#D9A38A]",
  },
  {
    name: "Auric Brass Keepsake",
    caption: "Hand-hammered bowl",
    price: "₹4,200",
    accent: "from-[#F4D69B] via-[#FBE9C9] to-[#FFF5E7]",
  },
  {
    name: "Monsoon Ink Journal",
    caption: "Indigo deckled notebook",
    price: "₹1,950",
    accent: "from-[#1B263B] via-[#374863] to-[#B6C8E8]",
  },
];

const testimonials = [
  {
    quote:
      "The brief felt like texting a friend who knows every boutique perfumer.",
    author: "Medha A.",
  },
  {
    quote: "Our VIP gifts now feel intentional instead of rushed.",
    author: "Kabir L.",
  },
  {
    quote: "I met three indie makers through one conversation.",
    author: "Sahana V.",
  },
];

const partnerLogos = [
  "Maison Reva",
  "Noir Atelier",
  "Bombay Perfumery",
  "Serein Studio",
  "Ajmal Legacy",
];

const previewSuggestions = [
  {
    name: "Monsoon Memoir extrait",
    notes: "Petrichor • Cardamom",
    price: "₹6,100",
  },
  {
    name: "Kalai Brass Tray",
    notes: "Monogram ready",
    price: "₹4,500",
  },
  {
    name: "Wildflower Syrup Duo",
    notes: "Limited harvest",
    price: "₹1,850",
  },
];

const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
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
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-stone-900 to-stone-700 text-xl font-semibold text-[#F8F4EF]">
                R
              </div>
              <div>
                <p className="font-['Playfair_Display',serif] text-lg uppercase tracking-[0.5em] text-stone-700">
                  Rasphia
                </p>
                <p className="text-xs tracking-[0.4em] text-stone-400">
                  Gift Atelier
                </p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-6 text-sm text-stone-600">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="rounded-full px-3 py-1 text-stone-600 transition-colors hover:bg-white/80 hover:text-stone-900"
                >
                  {link.label}
                </a>
              ))}
            </div>
            <button
              onClick={onLogin}
              className="hidden md:inline-flex items-center gap-2 rounded-full bg-stone-900 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-stone-400/40 hover:-translate-y-0.5 hover:bg-stone-800"
              style={{ borderRadius: "999px" }}
            >
              Sign in
              <ArrowRight className="h-4 w-4" />
            </button>
          </nav>

          <header className="mt-16 grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-1 text-sm font-medium text-stone-600">
                <Sparkles className="h-4 w-4" /> Taste meets thought
              </p>
              <h1 className="mt-6 font-serif text-5xl leading-tight text-stone-900 md:text-6xl">
                Gift like you know them deeply.
              </h1>
              <p className="mt-5 text-lg text-stone-600">
                Rasphia is a chat-led curator for perfumes and keepsakes. Speak
                naturally; receive a tight shortlist that feels human.
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <button
                  onClick={onLogin}
                  className="inline-flex items-center justify-center gap-3 rounded-full bg-stone-900 px-9 py-3 font-medium text-white shadow-lg shadow-stone-300/60 hover:-translate-y-0.5 hover:bg-stone-800 transition"
                  style={{ borderRadius: "999px" }}
                >
                  Begin your curation
                  <ArrowRight className="h-5 w-5" />
                </button>
                <a
                  href="#collections"
                  className="inline-flex items-center justify-center rounded-full border border-stone-300 px-9 py-3 text-stone-800 hover:bg-white"
                  style={{ borderRadius: "999px" }}
                >
                  See sample picks
                </a>
              </div>
              <div className="mt-10 grid gap-6 sm:grid-cols-3">
                {stats.map((stat) => (
                  <div key={stat.label}>
                    <p className="text-3xl font-semibold text-stone-900">
                      {stat.value}
                    </p>
                    <p className="text-sm text-stone-500">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/90 p-6 shadow-2xl">
              <div className="pointer-events-none absolute inset-0 opacity-80">
                <div className="absolute -top-16 right-4 h-48 w-48 rounded-full bg-gradient-to-br from-amber-200 via-rose-100 to-white blur-3xl" />
                <div className="absolute bottom-0 left-0 h-56 w-56 rounded-[50%_40%_60%_30%/45%_70%_35%_60%] bg-gradient-to-br from-[#1f120e] via-[#4b2f24] to-[#a4693b] opacity-70 blur-3xl" />
              </div>
              <div className="relative rounded-2xl bg-white/95 p-5 backdrop-blur">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-stone-400">
                  <MessageCircle className="h-4 w-4 text-amber-600" />
                  Live chat preview
                </div>
                <div className="mt-4 space-y-4 text-sm leading-relaxed">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-900 text-white">
                      <UserRound className="h-4 w-4" />
                    </div>
                    <div className="rounded-2xl rounded-bl-sm bg-gradient-to-br from-[#2C1A13] via-[#3F2B22] to-[#6C4C3C] px-4 py-3 text-white shadow-lg shadow-stone-900/30">
                      Looking for something that smells like first rain in Goa
                      for a writer friend.
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-900">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div className="rounded-2xl rounded-tl-sm bg-gradient-to-r from-white via-stone-50 to-amber-50 px-4 py-3 text-stone-800 shadow-md">
                      Got it. Pairing petrichor-forward perfumes with warm brass
                      objects. Here’s a clean shortlist.
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative mt-5 rounded-2xl border border-white/40 bg-gradient-to-br from-white/95 via-[#FFF6EA]/90 to-white/70 p-4 backdrop-blur">
                <div className="pointer-events-none absolute -top-5 left-10 h-16 w-16 rounded-full bg-gradient-to-br from-amber-300 to-rose-200 blur-2xl opacity-70" />
                <div className="pointer-events-none absolute bottom-0 right-0 h-36 w-24 rounded-full bg-gradient-to-b from-[#2D1A13]/30 to-transparent blur-2xl opacity-60" />
                <div className="relative flex items-center justify-between text-sm font-semibold text-stone-600">
                  <p>Suggested items</p>
                  <span className="text-xs uppercase tracking-[0.3em] text-amber-600">
                    curated
                  </span>
                </div>
                <div className="relative mt-4 grid gap-3">
                  {previewSuggestions.map((suggestion) => (
                    <div
                      key={suggestion.name}
                      className="flex items-center justify-between rounded-2xl border border-stone-100/60 bg-white/85 px-4 py-3 shadow-sm shadow-stone-200/50"
                    >
                      <div>
                        <p className="text-sm font-semibold text-stone-900">
                          {suggestion.name}
                        </p>
                        <p className="text-xs text-stone-500">
                          {suggestion.notes}
                        </p>
                      </div>
                      <p className="text-sm font-medium text-stone-700">
                        {suggestion.price}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </header>

          <section className="mt-16 border-t border-white/50 py-8 text-center">
            <p className="text-xs uppercase tracking-[0.4em] text-stone-500">
              Partner ateliers
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
          id="how-it-works"
          className="rounded-[32px] bg-white p-8 shadow-xl shadow-stone-200/50"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-700">
                Flow
              </p>
              <h2 className="mt-2 font-serif text-4xl text-stone-900">
                Three simple beats.
              </h2>
            </div>
            <button
              onClick={onLogin}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-stone-200 px-6 py-3 text-sm font-medium text-stone-800 hover:bg-stone-50"
              style={{ borderRadius: "999px" }}
            >
              Launch Rasphia
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {steps.map((step) => (
              <div
                key={step.title}
                className="rounded-2xl border border-stone-100 p-6 hover:-translate-y-1 hover:shadow-lg transition-all"
              >
                <step.icon className="mb-4 h-6 w-6 text-amber-600" />
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

        <section id="collections" className="mt-20">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-700">
                Preview
              </p>
              <h2 className="mt-1 font-serif text-4xl text-stone-900">
                Fresh pairings this week.
              </h2>
            </div>
            <a
              href="#"
              className="inline-flex items-center gap-1 rounded-full border border-amber-100 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-50 hover:text-amber-600"
            >
              View library →
            </a>
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {curatedProducts.map((product) => (
              <div
                key={product.name}
                className="overflow-hidden rounded-3xl border border-stone-100 bg-white shadow-lg shadow-stone-200/60"
              >
                <div
                  className={`h-56 w-full rounded-[40px] bg-gradient-to-br ${product.accent} p-6 text-white`}
                >
                  <p className="text-xs uppercase tracking-[0.3em] text-white/70">
                    Limited batch
                  </p>
                  <p className="mt-4 text-2xl font-serif">{product.name}</p>
                  <p className="text-sm text-white/80">{product.caption}</p>
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between text-sm">
                    <p className="font-semibold text-stone-900">
                      {product.price}
                    </p>
                    <button
                      className="rounded-full px-5 py-2 text-sm font-medium text-amber-800 transition hover:bg-amber-50"
                      style={{ borderRadius: "999px" }}
                    >
                      Add to brief →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section
          id="stories"
          className="mt-20 rounded-[32px] bg-[#1C140E] px-8 py-12 text-white"
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-white/60">
                Stories
              </p>
              <h2 className="mt-2 font-serif text-4xl leading-tight">
                People come back for the intimacy.
              </h2>
            </div>
            <a
              href="#"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
            >
              Read full stories
              <Star className="h-4 w-4 text-amber-300" />
            </a>
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {testimonials.map((testimonial) => (
              <article
                key={testimonial.author}
                className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white"
              >
                <p className="text-white/80">“{testimonial.quote}”</p>
                <p className="mt-4 text-sm font-semibold">
                  {testimonial.author}
                </p>
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
                Start with a single sentence about who you're gifting.
              </h2>
            </div>
            <div className="flex flex-col gap-4">
              <button
                onClick={onLogin}
                className="inline-flex items-center justify-center gap-3 rounded-full bg-white px-9 py-3 text-stone-900 font-semibold shadow-lg shadow-black/10 hover:-translate-y-0.5 hover:bg-amber-50 transition"
                style={{ borderRadius: "999px" }}
              >
                Start the conversation
                <ArrowRight className="h-5 w-5" />
              </button>
              <p className="text-sm text-white/70">
                Prefer a walkthrough?{" "}
                <a href="#" className="underline decoration-amber-200">
                  Book a live demo
                </a>
                .
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-stone-200 bg-white">
        <div className="mx-auto flex flex-col gap-8 px-6 py-12 text-sm text-stone-500 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <p className="font-serif text-2xl text-stone-900">Rasphia</p>
            <p className="mt-1">Gifting rituals from South Asian ateliers.</p>
          </div>
          <div className="flex flex-wrap gap-6">
            <a href="#how-it-works" className="hover:text-stone-900">
              Product
            </a>
            <a
              href="#collections"
              className="rounded-full px-3 py-1 hover:bg-stone-100 hover:text-stone-900"
            >
              Curation
            </a>
            <a
              href="#stories"
              className="rounded-full px-3 py-1 hover:bg-stone-100 hover:text-stone-900"
            >
              Journal
            </a>
            <a
              href="/contact"
              className="rounded-full px-3 py-1 hover:bg-stone-100 hover:text-stone-900"
            >
              Contact
            </a>
          </div>
          <p className="text-xs text-stone-400">
            © {new Date().getFullYear()} Rasphia. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
