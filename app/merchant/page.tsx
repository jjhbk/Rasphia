"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ArrowRight,
  MessageSquare,
  CreditCard,
  Users,
  Store,
  CheckCircle2,
  Zap,
  Shield,
  TrendingUp,
  Clock,
  ChevronRight,
  Sparkles,
  IndianRupee,
  Lock,
} from "lucide-react";
import BrandLogo from "@/app/components/brand/BrandLogo";
import SocialLinks from "@/app/components/SocialLinks";

/* ─────────────────────────────────────────────
   Static data
───────────────────────────────────────────── */

const stats = [
  { value: "WhatsApp", label: "Primary operating system", icon: MessageSquare },
  { value: "5 min", label: "To go live from chat", icon: Zap },
  { value: "0%", label: "Commission on every tier", icon: IndianRupee },
  { value: "No login", label: "Run daily ops in chat", icon: Lock },
];

const features = [
  {
    icon: MessageSquare,
    title: "Set up on WhatsApp",
    description:
      "Message our number, share your store basics in chat, and your storefront is ready in minutes. No dashboard setup flow.",
    tag: "Onboarding in chat",
  },
  {
    icon: Store,
    title: "Sell on WhatsApp",
    description:
      "Customers discover products, ask questions, and place orders directly in WhatsApp with your AI-assisted commerce flow.",
    tag: "Customer flow in chat",
  },
  {
    icon: CheckCircle2,
    title: "Fulfill on WhatsApp",
    description:
      "Automated confirmations, tracking updates, and re-engagement messages keep customers informed without manual follow-ups.",
    tag: "Post-purchase automation",
  },
  {
    icon: IndianRupee,
    title: "Zero commission + ₹999/month",
    description:
      "Transparent pricing that keeps your margin intact: no percentage cuts on your orders, across all plans.",
    tag: "Clear pricing",
  },
  {
    icon: CreditCard,
    title: "UPI via SeedhaPe — zero gateway fees",
    description:
      "Collect payments through SeedhaPe with UPI-first support and no gateway fee surprises eating into your earnings.",
    tag: "Built for India",
  },
  {
    icon: Users,
    title: "AI that works for you",
    description:
      "From chatbot responses to persona matching and product content assistance, AI helps you sell without adding operational load.",
    tag: "Always-on support",
  },
];

const steps = [
  {
    number: "01",
    time: "< 1 min",
    title: "Send “hi” on WhatsApp",
    description: "Message our onboarding number to start instantly. No app install, no forms, no login flow.",
  },
  {
    number: "02",
    time: "< 2 min",
    title: "Share your store basics",
    description: "Business name, category, and product details are collected in chat. We build the structure for you.",
  },
  {
    number: "03",
    time: "< 2 min",
    title: "Go live and test instantly",
    description: "Your storefront is live. Customers can buy, pay, and track orders through WhatsApp right away.",
  },
];

const pricingPlans = [
  {
    name: "Starter",
    price: "₹999/month",
    description: "For merchants starting WhatsApp-first commerce.",
    features: ["0% commission", "WhatsApp setup flow", "Sell, pay, and track in chat"],
  },
  {
    name: "Growth",
    price: "₹2,499/month",
    description: "For stores scaling order volume and repeat customers.",
    features: ["0% commission", "Advanced automation", "Priority onboarding support"],
  },
  {
    name: "Pro",
    price: "₹4,999/month",
    description: "For high-intent brands needing deeper operational support.",
    features: ["0% commission", "Full WhatsApp operations suite", "Dedicated growth support"],
  },
];

const growthLevers = [
  {
    icon: MessageSquare,
    title: "Never miss a 'price?' DM again",
    metric: "AI replies in ~10 seconds, 24/7",
    description:
      "Early merchants report meaningful recovery of inquiries that used to go cold. In many cases, this maps to ~20-30% more DM conversations saved.",
  },
  {
    icon: Users,
    title: "Turn past customers into repeat buyers, automatically",
    metric: "Existing customers often convert 5-10x better than cold traffic",
    description:
      "Send WhatsApp campaigns to your order history in one click. Repeat outreach is typically the fastest path to compounding revenue without extra ad spend.",
  },
  {
    icon: Sparkles,
    title: "Get discovered by shoppers who match your vibe",
    metric: "Intent-matched discovery without ad spend",
    description:
      "Our matching system focuses on shopper taste fit, so the people seeing your products are more likely to care about what you make.",
  },
  {
    icon: Store,
    title: "Replace your Linktree with a real store",
    metric: "One link, full catalog shopping flow",
    description:
      "Turn your Instagram bio link into a proper storefront where shoppers can browse, pay, and track orders instead of bouncing after one post.",
  },
];

const DEMO_VIDEO_URL =
  "https://mmml2bafriznrxgn.public.blob.vercel-storage.com/Merchant%20Onboarding%20%281%29.mp4";
const WHATSAPP_NUMBER = "+91 6301304257";
const WHATSAPP_LINK = "https://wa.me/916301304257?text=hi";

/* ─────────────────────────────────────────────
   Components
───────────────────────────────────────────── */

/* ─────────────────────────────────────────────
   Page
───────────────────────────────────────────── */

export default function MerchantLandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const demoVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = demoVideoRef.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          video.play().catch(() => {});
          return;
        }
        video.pause();
      },
      { threshold: 0.5 }
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
          <Link href="/">
            <BrandLogo size={30} showWordmark wordmarkClassName="text-sm font-semibold text-brand-charcoal" />
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="hidden text-sm text-stone-600 hover:text-stone-900 md:block">
              For shoppers
            </Link>
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-stone-900 px-5 py-2 text-sm font-medium text-white shadow-lg shadow-stone-400/30 transition hover:-translate-y-0.5 hover:bg-stone-800"
            >
              Send &quot;hi&quot; on WhatsApp
              <ArrowRight className="h-4 w-4" />
            </a>
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
          {/* Early-stage badge */}
          <div className="flex items-center justify-center">
            <div className="inline-flex items-center gap-2.5 rounded-full border border-amber-300/60 bg-amber-50/80 px-4 py-1.5 shadow-sm backdrop-blur">
              <Sparkles className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-semibold text-amber-800">
                Early merchants onboarding now
              </span>
            </div>
          </div>

          {/* Headline */}
          <div className="mx-auto mt-8 max-w-4xl text-center">
            <h1 className="font-serif text-5xl leading-[1.1] tracking-tight md:text-6xl lg:text-7xl">
              Run your entire store
              <br />
              <span className="text-amber-700">from WhatsApp.</span>
              <br />
              No dashboard needed.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-stone-600 md:text-xl">
              No dashboard. No app. No logins. Message our number, your store goes live in 5
              minutes. Customers buy, pay, and track orders all on WhatsApp.
            </p>
          </div>

          {/* CTAs */}
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-3 rounded-full bg-stone-900 px-8 py-3.5 text-base font-semibold text-white shadow-xl shadow-stone-500/30 transition hover:-translate-y-0.5 hover:bg-stone-800"
            >
              Try it now — send &quot;hi&quot; to {WHATSAPP_NUMBER}
              <ArrowRight className="h-5 w-5" />
            </a>
            <a
              href="#live-demo"
              className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white/70 px-7 py-3.5 text-sm font-medium text-stone-700 backdrop-blur transition hover:bg-white"
            >
              See how it works
            </a>
          </div>

          <p className="mt-4 text-center text-sm text-stone-500">
            Try the live WhatsApp setup flow before you commit.
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

      {/* ── Sales growth levers ── */}
      <section className="mx-auto max-w-6xl px-6 pt-14 lg:px-8">
        <div className="rounded-[32px] border border-stone-200/70 bg-white/80 p-8 shadow-xl shadow-stone-200/40 backdrop-blur">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-700">
              Growth levers
            </p>
            <h2 className="mt-3 font-serif text-4xl text-stone-900">
              How Rasphia grows your sales
            </h2>
            <p className="mx-auto mt-4 max-w-3xl text-sm text-stone-600">
              These are practical levers we optimize for from day one. Early results vary by category
              and execution, but merchants are seeing meaningful lift.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {growthLevers.map((lever) => {
              const Icon = lever.icon;
              return (
                <article
                  key={lever.title}
                  className="rounded-2xl border border-stone-200/70 bg-white p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100/80 text-amber-700">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700">
                      {lever.metric}
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-stone-900">{lever.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-stone-600">{lever.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Main content ── */}
      <main className="mx-auto max-w-6xl px-6 py-20 lg:px-8 space-y-20">

        {/* ── Positioning section ── */}
        <section className="rounded-[32px] border border-stone-200/70 bg-white/80 p-8 shadow-xl shadow-stone-200/40 backdrop-blur">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr] lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-700">
                WhatsApp-first commerce
              </p>
              <h2 className="mt-3 font-serif text-4xl leading-tight text-stone-900">
                Your customer lives in WhatsApp. Your store should too.
              </h2>
              <p className="mt-4 text-base text-stone-600">
                Most platforms still make you operate from a separate panel, app, and login.
                Rasphia is built differently: commerce operations happen where your customer
                already is.
              </p>
            </div>

            <div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-stone-200/70 bg-stone-50/80 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                    Dashboard-heavy flow
                  </p>
                  <ul className="mt-4 space-y-3">
                    {[
                      "Open separate admin panel",
                      "Jump between tools for ops",
                      "Train team on extra workflows",
                      "Customers still ask updates on WhatsApp",
                    ].map((line) => (
                      <li key={line} className="flex items-start gap-2 text-sm text-stone-600">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-stone-400" />
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl border-2 border-amber-300/70 bg-gradient-to-br from-amber-50 to-white p-5 shadow-md">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                    Rasphia WhatsApp-native flow
                  </p>
                  <ul className="mt-4 space-y-3">
                    {[
                      "Message one number to start",
                      "Set up, sell, and fulfill in chat",
                      "Customers buy, pay, and track in WhatsApp",
                      "No dashboard, no app, no login overhead",
                    ].map((line) => (
                      <li key={line} className="flex items-start gap-2 text-sm text-stone-700">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
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
              Your business stack in one WhatsApp flow.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-stone-600">
              WhatsApp-first by default, with pricing and automation built to keep operations simple.
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
          id="live-demo"
          className="rounded-[32px] bg-gradient-to-br from-[#FFF4E1] to-[#F1E3D3] p-10"
        >
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-700">
              Simple as it gets
            </p>
            <h2 className="mt-3 font-serif text-4xl text-stone-900">
              Try it yourself before signing up.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-stone-600">
              Send &quot;hi&quot; to {WHATSAPP_NUMBER} and set up a test store in 2 minutes.
              No email required.
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

          <div className="mt-10">
            <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">
              See it in action
            </p>
            <div className="overflow-hidden rounded-2xl border border-amber-100/70 bg-black shadow-xl shadow-stone-300/40">
              <video
                ref={demoVideoRef}
                src={DEMO_VIDEO_URL}
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

          <div className="mt-8 text-center">
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-3 rounded-full bg-stone-900 px-9 py-3.5 text-base font-semibold text-white shadow-xl shadow-stone-500/30 transition hover:-translate-y-0.5 hover:bg-stone-800"
            >
              Send &quot;hi&quot; now on WhatsApp
              <ArrowRight className="h-5 w-5" />
            </a>
          </div>
        </section>

        {/* ── Pricing ── */}
        <section className="rounded-[32px] border border-stone-200/70 bg-white/80 p-8 shadow-xl shadow-stone-200/40 backdrop-blur">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-700">
              Honest pricing
            </p>
            <h2 className="mt-3 font-serif text-4xl text-stone-900">
              Built for long-term merchant trust.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-stone-600">
              One-time integration: <strong className="text-stone-900">₹9,999</strong>. Choose
              the monthly plan that fits your stage.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {pricingPlans.map((plan) => (
              <article
                key={plan.name}
                className="rounded-3xl border border-stone-200/70 bg-white p-6 shadow-md shadow-stone-100/60"
              >
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-700">
                  {plan.name}
                </p>
                <p className="mt-3 text-3xl font-bold text-stone-900">{plan.price}</p>
                <p className="mt-2 text-sm text-stone-600">{plan.description}</p>
                <div className="mt-5 border-t border-stone-100 pt-4">
                  <ul className="space-y-2">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm text-stone-700">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ── Social proof (honest framing) ── */}
        <section className="rounded-[32px] bg-[#1C140E] px-8 py-14 text-white shadow-2xl shadow-stone-900/20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-400">
              Early-stage, transparently
            </p>
            <h2 className="mt-3 font-serif text-4xl text-white">
              Early merchants onboarding now.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-white/75">
              Founding cohort pricing available. Onboarding founding merchants — real testimonials
              coming soon.
            </p>
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
              title: "Transparent stage",
              desc: "Early merchant cohort in progress with honest messaging and direct founder support.",
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
              Ready for WhatsApp-first commerce?
            </p>
            <h2 className="mt-3 font-serif text-4xl leading-snug md:text-5xl">
              Message once.
              <br />
              <span className="text-amber-300">Your store goes live.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-base text-white/70">
              No dashboard. No app. No logins. Sell, collect payments, and fulfill through WhatsApp.
            </p>

            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noreferrer"
              className="mt-8 inline-flex items-center gap-3 rounded-full bg-white px-10 py-4 text-base font-bold text-stone-900 shadow-xl shadow-black/20 transition hover:-translate-y-0.5 hover:bg-amber-50"
            >
              Try it now — send &quot;hi&quot; to {WHATSAPP_NUMBER}
              <ArrowRight className="h-5 w-5" />
            </a>

            <p className="mt-4 text-xs text-white/40">
              Try it yourself before signing up. No email required for test setup.
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
                The WhatsApp-first commerce platform for independent sellers.
              </p>
            </div>

            <div className="flex flex-col gap-6 md:flex-row md:gap-16">
              <div>
                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-stone-400">
                  Platform
                </p>
                <div className="flex flex-col gap-2 text-sm text-stone-600">
                  <Link href="/" className="hover:text-stone-900">For Shoppers</Link>
                  <Link href="/merchant/onboarding" className="hover:text-stone-900">Merchant Onboarding</Link>
                  <Link href="/storefronts" className="hover:text-stone-900">Browse Stores</Link>
                </div>
              </div>
              <div>
                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-stone-400">
                  Company
                </p>
                <div className="flex flex-col gap-2 text-sm text-stone-600">
                  <Link href="/about" className="hover:text-stone-900">About</Link>
                  <Link href="/contact" className="hover:text-stone-900">Contact</Link>
                  <Link href="/privacy" className="hover:text-stone-900">Privacy</Link>
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
