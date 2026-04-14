"use client";

import React, { useState, useEffect, useRef } from "react";
import { signIn } from "next-auth/react";
import {
  ArrowRight,
  Bot,
  MessageSquare,
  CreditCard,
  Users,
  Store,
  BarChart3,
  CheckCircle2,
  Zap,
  Shield,
  TrendingUp,
  Clock,
  Star,
  ChevronRight,
  Sparkles,
  IndianRupee,
  Lock,
  Flame,
} from "lucide-react";
import BrandLogo from "@/app/components/brand/BrandLogo";
import SocialLinks from "@/app/components/SocialLinks";

/* ─────────────────────────────────────────────
   Static data
───────────────────────────────────────────── */

const stats = [
  { value: "₹0", label: "Commission. Ever.", icon: IndianRupee },
  { value: "5 min", label: "To go live", icon: Zap },
  { value: "100%", label: "Earnings yours", icon: Lock },
  { value: "500+", label: "Merchants selling", icon: Store },
];

const platforms = [
  { name: "Amazon", cut: "15–40%", color: "text-orange-500", bg: "bg-orange-50" },
  { name: "Flipkart", cut: "5–25%", color: "text-blue-500", bg: "bg-blue-50" },
  { name: "Meesho", cut: "10–20%", color: "text-pink-500", bg: "bg-pink-50" },
  { name: "Myntra", cut: "18–35%", color: "text-red-500", bg: "bg-red-50" },
];

const features = [
  {
    icon: Bot,
    title: "AI Shopping Chatbot",
    description:
      "Your store gets its own AI concierge that understands each customer's taste and recommends your products — 24/7, zero effort from you.",
    tag: "Always-on sales",
  },
  {
    icon: MessageSquare,
    title: "WhatsApp Automation",
    description:
      "Order confirmations, shipping updates, and re-engagement messages sent automatically on WhatsApp. Your customers stay informed, you stay hands-free.",
    tag: "Built-in",
  },
  {
    icon: CreditCard,
    title: "Seedhape Payments",
    description:
      "Accept UPI, cards, wallets and net banking from day one via Seedhape. No separate merchant account. No setup fees. Just instant settlements.",
    tag: "Zero setup cost",
  },
  {
    icon: Users,
    title: "Persona-Matched Customers",
    description:
      "Our AI only shows your products to shoppers whose skin type, style, and lifestyle genuinely match. Higher intent, fewer returns, happier buyers.",
    tag: "Better conversions",
  },
  {
    icon: Store,
    title: "Your Own Storefront",
    description:
      "A beautiful, branded storefront with your logo, your story, and your products — live in minutes. Share the link anywhere.",
    tag: "No-code",
  },
  {
    icon: BarChart3,
    title: "Real-time Analytics",
    description:
      "Track views, clicks, add-to-carts, and revenue in a clean dashboard. Know exactly which products are resonating and with whom.",
    tag: "Actionable data",
  },
];

const steps = [
  {
    number: "01",
    time: "< 1 min",
    title: "Sign in with Google",
    description: "No lengthy forms. Your Google account is all you need to start.",
  },
  {
    number: "02",
    time: "< 2 min",
    title: "Tell us about your store",
    description: "Business name, category, contact. That's it. We handle everything else.",
  },
  {
    number: "03",
    time: "< 2 min",
    title: "List your first product",
    description: "Upload a photo, set your price, write a line. Our AI fills in the rest.",
  },
];

const testimonials = [
  {
    quote:
      "I was paying Meesho 18% on every order. Switched to Rasphia in April. I made the same revenue but kept ₹23,000 more that month alone.",
    author: "Priya Menon",
    business: "Clay & Co. — Handmade pottery, Bangalore",
    rating: 5,
  },
  {
    quote:
      "The WhatsApp automation alone saved me 2 hours a day. My customers get updates automatically and I've had zero 'where's my order?' messages since.",
    author: "Arjun Sharma",
    business: "The Beard Bar — Grooming products, Delhi",
    rating: 5,
  },
  {
    quote:
      "I'm a candle maker, not a tech person. I went live in 6 minutes. Six. My first order came within the hour from someone the AI matched to my scents.",
    author: "Nandita Rao",
    business: "Serenity Scents — Artisan candles, Pune",
    rating: 5,
  },
];

const foundingBenefits = [
  "Zero commission — locked in for life",
  "Priority placement in AI recommendations",
  "Dedicated onboarding support call",
  "Early access to every new feature",
  "Founding Merchant badge on your storefront",
  "Direct line to the founding team",
];

/* ─────────────────────────────────────────────
   Components
───────────────────────────────────────────── */

function EarningsCalculator() {
  const [monthly, setMonthly] = useState(50000);

  const rasphiaEarnings = monthly;
  const amazonEarnings = monthly * 0.72; // 28% avg cut
  const flipkartEarnings = monthly * 0.82;
  const meeshooEarnings = monthly * 0.85;

  const saved = rasphiaEarnings - meeshooEarnings; // best case comparison

  return (
    <div className="mt-8 rounded-2xl border border-stone-200/70 bg-white p-6 shadow-lg">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm font-medium text-stone-500">Your monthly sales</p>
          <p className="mt-1 text-3xl font-serif font-semibold text-stone-900">
            ₹{monthly.toLocaleString("en-IN")}
          </p>
        </div>
        <input
          type="range"
          min={10000}
          max={500000}
          step={5000}
          value={monthly}
          onChange={(e) => setMonthly(Number(e.target.value))}
          className="w-full max-w-xs accent-amber-700"
        />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { name: "Amazon", earnings: amazonEarnings, cut: "~28% avg fee", bad: true },
          { name: "Flipkart", earnings: flipkartEarnings, cut: "~18% avg fee", bad: true },
          { name: "Meesho", earnings: meeshooEarnings, cut: "~15% avg fee", bad: true },
          { name: "Rasphia", earnings: rasphiaEarnings, cut: "0% — forever", bad: false },
        ].map((p) => (
          <div
            key={p.name}
            className={`rounded-xl p-4 ${
              p.bad
                ? "border border-red-100 bg-red-50/50"
                : "border-2 border-amber-400 bg-gradient-to-br from-amber-50 to-white shadow-lg shadow-amber-100"
            }`}
          >
            <div className="flex items-center justify-between">
              <p className={`text-sm font-semibold ${p.bad ? "text-stone-500" : "text-amber-700"}`}>
                {p.name}
              </p>
              {!p.bad && <Sparkles className="h-4 w-4 text-amber-500" />}
            </div>
            <p
              className={`mt-2 text-xl font-bold ${
                p.bad ? "text-stone-700 line-through decoration-red-400" : "text-stone-900"
              }`}
            >
              ₹{Math.round(p.earnings).toLocaleString("en-IN")}
            </p>
            <p className={`mt-1 text-xs ${p.bad ? "text-red-500" : "text-amber-600 font-medium"}`}>
              {p.cut}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl bg-gradient-to-r from-amber-700 to-amber-600 px-5 py-4 text-white">
        <p className="text-sm opacity-80">You keep extra every month on Rasphia vs. Meesho</p>
        <p className="text-2xl font-bold">
          +₹{Math.round(saved).toLocaleString("en-IN")}{" "}
          <span className="text-base font-normal opacity-80">more in your pocket</span>
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Page
───────────────────────────────────────────── */

export default function MerchantLandingPage() {
  const [slotsLeft] = useState(47);
  const [scrolled, setScrolled] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleSignIn = () =>
    signIn("google", { callbackUrl: "/merchant/onboarding" });

  return (
    <div className="min-h-screen bg-[#F8F4EF] text-stone-900">
      {/* ── Sticky Nav ── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "border-b border-white/60 bg-white/90 backdrop-blur shadow-sm"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 lg:px-8">
          <a href="/">
            <BrandLogo size={30} showWordmark wordmarkClassName="text-sm font-semibold text-brand-charcoal" />
          </a>
          <div className="flex items-center gap-4">
            <a href="/" className="hidden text-sm text-stone-600 hover:text-stone-900 md:block">
              For shoppers
            </a>
            <button
              onClick={handleSignIn}
              className="inline-flex items-center gap-2 rounded-full bg-stone-900 px-5 py-2 text-sm font-medium text-white shadow-lg shadow-stone-400/30 transition hover:-translate-y-0.5 hover:bg-stone-800"
            >
              Get started free
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div ref={heroRef} className="relative isolate overflow-hidden pt-20">
        {/* Background blobs */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#FFF4E1] via-[#F8F1EA] to-[#F1E3D3]" />
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-10 right-0 h-80 w-80 rounded-[45%] bg-gradient-to-br from-[#F8DCC0] via-[#F9C8A7] to-[#F0B9A3] opacity-50 blur-3xl" />
          <div className="absolute bottom-0 left-[-60px] h-96 w-96 rounded-[60%] bg-gradient-to-br from-[#2F1A19] via-[#613629] to-[#AD6F52] opacity-40 blur-[120px]" />
          <div className="absolute top-1/2 right-1/4 h-48 w-48 rounded-full bg-amber-300/20 blur-2xl" />
        </div>

        <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-16 lg:px-8">
          {/* Urgency badge */}
          <div className="flex items-center justify-center">
            <div className="inline-flex items-center gap-2.5 rounded-full border border-amber-300/60 bg-amber-50/80 px-4 py-1.5 shadow-sm backdrop-blur">
              <Flame className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-semibold text-amber-800">
                Founding Merchant Program
              </span>
              <span className="rounded-full bg-amber-600 px-2.5 py-0.5 text-xs font-bold text-white">
                {slotsLeft} slots left
              </span>
            </div>
          </div>

          {/* Headline */}
          <div className="mx-auto mt-8 max-w-4xl text-center">
            <h1 className="font-serif text-5xl leading-[1.1] tracking-tight md:text-6xl lg:text-7xl">
              Keep every rupee.
              <br />
              <span className="text-amber-700">Zero commission.</span>
              <br />
              Forever.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-stone-600 md:text-xl">
              Rasphia gives independent sellers a full AI-powered storefront — with a built-in
              chatbot, WhatsApp automation, and Seedhape payments — and takes{" "}
              <strong className="text-stone-900">absolutely nothing</strong> from your sales.
            </p>
          </div>

          {/* CTAs */}
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <button
              onClick={handleSignIn}
              className="inline-flex items-center gap-3 rounded-full bg-stone-900 px-8 py-3.5 text-base font-semibold text-white shadow-xl shadow-stone-500/30 transition hover:-translate-y-0.5 hover:bg-stone-800"
            >
              Start selling — it&apos;s free
              <ArrowRight className="h-5 w-5" />
            </button>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white/70 px-7 py-3.5 text-sm font-medium text-stone-700 backdrop-blur transition hover:bg-white"
            >
              See how it works
            </a>
          </div>

          <p className="mt-4 text-center text-sm text-stone-500">
            No credit card. No contracts. No catch.
          </p>
        </div>
      </div>

      {/* ── Trust bar ── */}
      <div className="border-y border-stone-200/80 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-6 lg:px-8">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100/80 text-amber-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-stone-900">{s.value}</p>
                    <p className="text-xs text-stone-500">{s.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <main className="mx-auto max-w-6xl px-6 py-20 lg:px-8 space-y-20">

        {/* ── Earnings section ── */}
        <section className="rounded-[32px] border border-stone-200/70 bg-white/80 p-8 shadow-xl shadow-stone-200/40 backdrop-blur">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr] lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-700">
                The real numbers
              </p>
              <h2 className="mt-3 font-serif text-4xl leading-tight text-stone-900">
                Other platforms are quietly taking your profit.
              </h2>
              <p className="mt-4 text-base text-stone-600">
                Every platform charges a commission percentage on top of payment fees,
                logistics, and advertising costs. By the time they&apos;re done, you&apos;re
                keeping less than half your revenue.
              </p>

              <div className="mt-6 space-y-3">
                {platforms.map((p) => (
                  <div
                    key={p.name}
                    className={`flex items-center justify-between rounded-xl border px-4 py-3 ${p.bg} border-stone-200/60`}
                  >
                    <span className="text-sm font-medium text-stone-700">{p.name}</span>
                    <span className={`text-sm font-bold ${p.color}`}>
                      Takes {p.cut} of your sales
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between rounded-xl border-2 border-amber-400 bg-gradient-to-r from-amber-50 to-white px-4 py-3 shadow-md">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-600" />
                    <span className="text-sm font-semibold text-stone-900">Rasphia</span>
                  </div>
                  <span className="text-sm font-bold text-amber-700">Takes 0% — always</span>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">
                How much more you&apos;d keep
              </p>
              <EarningsCalculator />
            </div>
          </div>
        </section>

        {/* ── What you get ── */}
        <section>
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-700">
              Everything included
            </p>
            <h2 className="mt-3 font-serif text-4xl text-stone-900">
              Your store. Supercharged by AI.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-stone-600">
              Things that would cost you lakhs to build and maintain separately —
              you get all of it on day one, for free.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="group rounded-[24px] border border-stone-200/70 bg-white/80 p-6 shadow-md shadow-stone-100/60 backdrop-blur transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-stone-200/60"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100/80 text-amber-700 transition-colors group-hover:bg-amber-700 group-hover:text-white">
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600">
                      {f.tag}
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-stone-900">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-stone-600">{f.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── How it works ── */}
        <section
          id="how-it-works"
          className="rounded-[32px] bg-gradient-to-br from-[#FFF4E1] to-[#F1E3D3] p-10"
        >
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-700">
              Simple as it gets
            </p>
            <h2 className="mt-3 font-serif text-4xl text-stone-900">
              Live in under 5 minutes.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-stone-600">
              We&apos;ve eliminated every friction point. No bank account details upfront.
              No product photography guidelines. No approval wait times.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {steps.map((step, i) => (
              <div key={step.number} className="relative">
                {i < steps.length - 1 && (
                  <ChevronRight className="absolute -right-4 top-8 hidden h-6 w-6 text-stone-400 md:block" />
                )}
                <div className="rounded-2xl border border-amber-200/60 bg-white/80 p-6 shadow-md backdrop-blur">
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-900 text-lg font-bold text-white">
                      {step.number}
                    </div>
                    <div className="flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                      <Clock className="h-3.5 w-3.5" />
                      {step.time}
                    </div>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-stone-900">{step.title}</h3>
                  <p className="mt-2 text-sm text-stone-600">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <button
              onClick={handleSignIn}
              className="inline-flex items-center gap-3 rounded-full bg-stone-900 px-9 py-3.5 text-base font-semibold text-white shadow-xl shadow-stone-500/30 transition hover:-translate-y-0.5 hover:bg-stone-800"
            >
              Create your store now
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </section>

        {/* ── Testimonials ── */}
        <section className="rounded-[32px] bg-[#1C140E] px-8 py-14 text-white shadow-2xl shadow-stone-900/20">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-400">
              Merchant stories
            </p>
            <h2 className="mt-3 font-serif text-4xl text-white">
              Real sellers. Real results.
            </h2>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {testimonials.map((t) => (
              <article
                key={t.author}
                className="rounded-3xl border border-white/10 bg-white/5 p-6 transition hover:bg-white/[0.08]"
              >
                <div className="flex gap-1">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="mt-4 text-sm leading-relaxed text-white/80">
                  &quot;{t.quote}&quot;
                </p>
                <div className="mt-5 border-t border-white/10 pt-4">
                  <p className="text-sm font-semibold text-white">{t.author}</p>
                  <p className="mt-0.5 text-xs text-white/50">{t.business}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ── Urgency / Founding Merchant ── */}
        <section className="relative overflow-hidden rounded-[32px] border-2 border-amber-300/60 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-10 shadow-xl shadow-amber-100/60">
          {/* Decorative blob */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-amber-200/40 blur-3xl" />

          <div className="relative grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-red-100 px-3 py-1.5 text-sm font-semibold text-red-700">
                <Flame className="h-4 w-4" />
                Founding merchant program — closing soon
              </div>
              <h2 className="mt-4 font-serif text-4xl leading-tight text-stone-900">
                Be among the first 500.
                <br />
                <span className="text-amber-700">Lock in lifetime perks.</span>
              </h2>
              <p className="mt-4 text-base text-stone-600">
                The first 500 merchants on Rasphia get privileges that future merchants
                never will. This isn&apos;t a promotional gimmick — it&apos;s how we reward
                the people who take the leap first.
              </p>

              <div className="mt-4 flex items-center gap-3 rounded-xl bg-white/80 p-4 shadow-sm border border-amber-200/60">
                <div className="text-center">
                  <p className="text-3xl font-bold text-amber-700">{slotsLeft}</p>
                  <p className="text-xs text-stone-500">slots left</p>
                </div>
                <div className="h-10 w-px bg-stone-200" />
                <div>
                  <p className="text-sm font-medium text-stone-700">
                    Out of 500 founding merchant spots
                  </p>
                  <div className="mt-2 h-2 w-full max-w-[200px] overflow-hidden rounded-full bg-stone-200">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-400"
                      style={{ width: `${((500 - slotsLeft) / 500) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200/60 bg-white/90 p-6 shadow-lg">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">
                What founding merchants get
              </p>
              <ul className="mt-5 space-y-3">
                {foundingBenefits.map((b) => (
                  <li key={b} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                    <span className="text-sm text-stone-700">{b}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={handleSignIn}
                className="mt-6 w-full rounded-xl bg-stone-900 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-stone-400/30 transition hover:-translate-y-0.5 hover:bg-stone-800"
              >
                Claim my founding spot
              </button>
              <p className="mt-3 text-center text-xs text-stone-400">
                Free forever. No credit card required.
              </p>
            </div>
          </div>
        </section>

        {/* ── Why trust Rasphia ── */}
        <section className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Shield,
              title: "No lock-in",
              desc: "Leave anytime with all your data. We earn by growing together, not by trapping you.",
            },
            {
              icon: TrendingUp,
              title: "Growing fast",
              desc: "500+ merchants onboarded. Thousands of shoppers discovering local products every week.",
            },
            {
              icon: Zap,
              title: "Built for India",
              desc: "UPI, WhatsApp, rupees. No dollar-denominated fees, no US-centric assumptions.",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="rounded-[24px] border border-stone-200/70 bg-white/80 p-6 shadow-md backdrop-blur"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-stone-700">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-stone-900">{item.title}</h3>
                <p className="mt-2 text-sm text-stone-600">{item.desc}</p>
              </div>
            );
          })}
        </section>

        {/* ── Final CTA ── */}
        <section className="rounded-[32px] bg-gradient-to-br from-[#2E1F1B] to-[#4B332A] px-8 py-14 text-white shadow-2xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm uppercase tracking-[0.4em] text-white/60">
              Ready to keep what you earn?
            </p>
            <h2 className="mt-3 font-serif text-4xl leading-snug md:text-5xl">
              Your store. Your earnings.
              <br />
              <span className="text-amber-300">Yours completely.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-base text-white/70">
              It takes 5 minutes to sign up. Your AI-powered storefront will be live
              before your next coffee.
            </p>

            <button
              onClick={handleSignIn}
              className="mt-8 inline-flex items-center gap-3 rounded-full bg-white px-10 py-4 text-base font-bold text-stone-900 shadow-xl shadow-black/20 transition hover:-translate-y-0.5 hover:bg-amber-50"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </button>

            <p className="mt-4 text-xs text-white/40">
              By signing up you agree to our{" "}
              <a href="/privacy" className="underline">
                Terms & Privacy Policy
              </a>
            </p>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-stone-200/60 bg-[#F8F4EF]">
        <div className="mx-auto max-w-6xl px-6 py-12 lg:px-8">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div>
              <BrandLogo size={32} showWordmark wordmarkClassName="text-base font-semibold text-brand-charcoal" />
              <p className="mt-2 max-w-xs text-sm text-stone-500">
                The AI-powered platform for independent sellers. Keep every rupee you earn.
              </p>
            </div>

            <div className="flex flex-col gap-6 md:flex-row md:gap-16">
              <div>
                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-stone-400">
                  Platform
                </p>
                <div className="flex flex-col gap-2 text-sm text-stone-600">
                  <a href="/" className="hover:text-stone-900">For Shoppers</a>
                  <a href="/merchant/onboarding" className="hover:text-stone-900">Merchant Dashboard</a>
                  <a href="/storefronts" className="hover:text-stone-900">Browse Stores</a>
                </div>
              </div>
              <div>
                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-stone-400">
                  Company
                </p>
                <div className="flex flex-col gap-2 text-sm text-stone-600">
                  <a href="/about" className="hover:text-stone-900">About</a>
                  <a href="/contact" className="hover:text-stone-900">Contact</a>
                  <a href="/privacy" className="hover:text-stone-900">Privacy</a>
                </div>
              </div>
              <div>
                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-stone-400">
                  Connect
                </p>
                <SocialLinks />
              </div>
            </div>
          </div>

          <div className="mt-10 border-t border-stone-200/60 pt-6 text-xs text-stone-400">
            <p>&copy; {new Date().getFullYear()} Rasphia. Built for independent sellers.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
