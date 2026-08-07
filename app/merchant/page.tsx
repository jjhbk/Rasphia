"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  IndianRupee,
  Instagram,
  Link2,
  MessageSquare,
  Shield,
  Sparkles,
  Store,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import BrandLogo from "@/app/components/brand/BrandLogo";
import MetaEmbeddedSignupButton from "@/app/components/MetaEmbeddedSignupButton";
import SocialLinks from "@/app/components/SocialLinks";

const stats = [
  { value: "WhatsApp + Instagram", label: "Primary commerce channels", icon: MessageSquare },
  { value: "1 click", label: "Meta-led business onboarding", icon: Link2 },
  { value: "AI + human", label: "Shared support and selling flow", icon: Bot },
  { value: "0%", label: "Commission on every tier", icon: IndianRupee },
];

const pillars = [
  {
    icon: Link2,
    title: "Connect your Meta assets once",
    description:
      "Use Meta Embedded Signup to connect your WhatsApp business setup and Instagram presence without a long back-and-forth setup flow.",
    tag: "Onboarding",
  },
  {
    icon: MessageSquare,
    title: "Sell where conversations already happen",
    description:
      "Rasphia turns WhatsApp and Instagram into structured commerce channels, not just inboxes for unanswered DMs.",
    tag: "Channels",
  },
  {
    icon: Bot,
    title: "Let an agent qualify, recommend, and route",
    description:
      "Use a Meta-facing AI layer for first response while Rasphia controls catalog, checkout, orders, and merchant operations.",
    tag: "Agent-ready",
  },
  {
    icon: CreditCard,
    title: "Keep checkout and payments deterministic",
    description:
      "Products, cart context, payment links, order status, and post-purchase support stay grounded in Rasphia instead of free-form chat.",
    tag: "Commerce core",
  },
  {
    icon: Store,
    title: "Move shoppers from discovery to conversion",
    description:
      "Instagram handles discovery and interest. WhatsApp handles high-intent buying, payment follow-up, and support continuity.",
    tag: "Full funnel",
  },
  {
    icon: Users,
    title: "Give merchants one conversational command center",
    description:
      "Merchants manage inquiries, product context, re-engagement, and fulfillment across conversational channels with less manual work.",
    tag: "Merchant ops",
  },
];

const steps = [
  {
    number: "01",
    time: "< 1 min",
    title: "Start with Meta Embedded Signup",
    description:
      "Connect your business assets from one button instead of filling out a long merchant onboarding checklist by hand.",
  },
  {
    number: "02",
    time: "< 2 min",
    title: "Sync channels and storefront context",
    description:
      "Rasphia maps your channel identity, commerce data, and storefront details so the conversation layer has real business context.",
  },
  {
    number: "03",
    time: "< 2 min",
    title: "Go live with conversational commerce",
    description:
      "Customers discover on Instagram, convert on WhatsApp, and continue support in the same conversational operating system.",
  },
];

const comparison = {
  legacy: [
    "Answer the same DM questions manually",
    "Patch together Instagram replies, WhatsApp chats, and checkout links",
    "Lose context when a shopper switches channels",
    "Rely on staff memory for follow-ups and order updates",
  ],
  rasphia: [
    "Connect channels with one Meta-led onboarding path",
    "Keep one shared commerce brain behind WhatsApp and Instagram",
    "Guide discovery, qualification, checkout, and support in sequence",
    "Escalate to a human without losing conversation context",
  ],
};

const channelCards = [
  {
    icon: Instagram,
    title: "Instagram for discovery",
    description:
      "Capture interest from posts, stories, and DMs. Use Instagram to qualify shoppers, answer intent, and move high-intent buyers forward.",
    bullets: ["Story and DM entry points", "Lead capture and qualification", "Shortlist and redirect to conversion flow"],
  },
  {
    icon: MessageSquare,
    title: "WhatsApp for conversion",
    description:
      "Use WhatsApp when the buyer is ready to ask, buy, pay, track, or request help. It becomes the deepest transactional rail.",
    bullets: ["Order-ready product conversations", "Hosted checkout and payment follow-up", "Tracking, invoices, refunds, and support"],
  },
  {
    icon: Bot,
    title: "Rasphia for orchestration",
    description:
      "Rasphia stays the system of record while Meta-facing conversational entry points sit on top of deterministic commerce actions.",
    bullets: ["Catalog and inventory context", "Order and payment actions", "Merchant analytics and human handoff"],
  },
];

const trustItems = [
  {
    icon: Shield,
    title: "Meta-ready onboarding",
    desc: "Built to support Meta Embedded Signup instead of forcing merchants into a custom setup maze.",
  },
  {
    icon: TrendingUp,
    title: "Designed for channel compounding",
    desc: "Instagram and WhatsApp should reinforce each other, not fragment your customer journey.",
  },
  {
    icon: Zap,
    title: "Built for India",
    desc: "UPI, WhatsApp behavior, merchant-led selling, and conversational support patterns are all first-class.",
  },
];

const DEMO_VIDEO_URL =
  "https://mmml2bafriznrxgn.public.blob.vercel-storage.com/Merchant%20Onboarding%20%281%29.mp4";
const WHATSAPP_NUMBER = "+91 6301304257";
const WHATSAPP_LINK = "https://wa.me/916301304257?text=Hi%2C%20I%20want%20to%20launch%20my%20store%20with%20Rasphia";

export default function MerchantLandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const demoVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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

  return (
    <div className="min-h-screen bg-[#F8F4EF] text-stone-900">
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
          <div className="flex items-center gap-3">
            <Link href="/" className="hidden text-sm text-stone-600 hover:text-stone-900 md:block">
              For shoppers
            </Link>
            <MetaEmbeddedSignupButton className="hidden md:inline-flex" />
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white/75 px-5 py-2 text-sm font-medium text-stone-700 shadow-sm backdrop-blur transition hover:bg-white"
            >
              Talk on WhatsApp
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </nav>

      <div className="relative isolate overflow-hidden pt-20">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FFF4E1] via-[#F8F1EA] to-[#F1E3D3]" />
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-10 right-0 h-80 w-80 rounded-[45%] bg-gradient-to-br from-[#F8DCC0] via-[#F9C8A7] to-[#F0B9A3] opacity-50 blur-3xl" />
          <div className="absolute bottom-0 left-[-60px] h-96 w-96 rounded-[60%] bg-gradient-to-br from-[#2F1A19] via-[#613629] to-[#AD6F52] opacity-40 blur-[120px]" />
          <div className="absolute top-1/2 right-1/4 h-48 w-48 rounded-full bg-amber-300/20 blur-2xl" />
        </div>

        <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-16 lg:px-8">
          <div className="flex items-center justify-center">
            <div className="inline-flex items-center gap-2.5 rounded-full border border-amber-300/60 bg-amber-50/80 px-4 py-1.5 shadow-sm backdrop-blur">
              <Sparkles className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-semibold text-amber-800">
                Meta-ready conversational commerce
              </span>
            </div>
          </div>

          <div className="mx-auto mt-8 max-w-5xl text-center">
            <h1 className="font-serif text-5xl leading-[1.05] tracking-tight md:text-6xl lg:text-7xl">
              Launch on
              <span className="text-amber-700"> WhatsApp and Instagram</span>
              <br />
              with one conversational commerce stack.
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-lg text-stone-600 md:text-xl">
              Rasphia turns Meta messaging channels into a real commerce system. Use Meta Embedded
              Signup to connect faster, let AI handle first-response and qualification, and keep
              catalog, checkout, orders, and support grounded in one merchant operating layer.
            </p>
          </div>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <MetaEmbeddedSignupButton className="px-8 py-3.5 text-base" label="Start with Meta Embedded Signup" />
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white/70 px-7 py-3.5 text-sm font-medium text-stone-700 backdrop-blur transition hover:bg-white"
            >
              See the WhatsApp flow
            </a>
          </div>

          <p className="mt-4 text-center text-sm text-stone-500">
            One-click Meta onboarding when configured. WhatsApp fallback available today at {WHATSAPP_NUMBER}.
          </p>
        </div>
      </div>

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

      <main className="mx-auto max-w-6xl space-y-20 px-6 py-20 lg:px-8">
        <section className="rounded-[32px] border border-stone-200/70 bg-white/80 p-8 shadow-xl shadow-stone-200/40 backdrop-blur">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.35fr] lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-700">
                Channel-first commerce
              </p>
              <h2 className="mt-3 font-serif text-4xl leading-tight text-stone-900">
                Merchants do not need another dashboard. They need a better conversation system.
              </h2>
              <p className="mt-4 text-base text-stone-600">
                Rasphia is shifting the merchant story away from generic storefront tooling and
                toward conversational channels that actually convert: Instagram for discovery,
                WhatsApp for transaction depth, and a shared commerce core underneath both.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-stone-200/70 bg-stone-50/80 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                  Fragmented inbox flow
                </p>
                <ul className="mt-4 space-y-3">
                  {comparison.legacy.map((line) => (
                    <li key={line} className="flex items-start gap-2 text-sm text-stone-600">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-stone-400" />
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border-2 border-amber-300/70 bg-gradient-to-br from-amber-50 to-white p-5 shadow-md">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                  Rasphia conversational stack
                </p>
                <ul className="mt-4 space-y-3">
                  {comparison.rasphia.map((line) => (
                    <li key={line} className="flex items-start gap-2 text-sm text-stone-700">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-700">
              What merchants get
            </p>
            <h2 className="mt-3 font-serif text-4xl text-stone-900">
              One stack for Meta-powered conversational selling.
            </h2>
            <p className="mx-auto mt-4 max-w-3xl text-lg text-stone-600">
              The merchant promise is now simple: connect channels fast, operate from conversation,
              and keep commerce actions deterministic.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {pillars.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <article
                  key={pillar.title}
                  className="group rounded-[24px] border border-stone-200/70 bg-white/80 p-6 shadow-md shadow-stone-100/60 backdrop-blur transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-stone-200/60"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100/80 text-amber-700 transition-colors group-hover:bg-amber-700 group-hover:text-white">
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600">
                      {pillar.tag}
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-stone-900">{pillar.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-stone-600">{pillar.description}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="rounded-[32px] bg-gradient-to-br from-[#FFF4E1] to-[#F1E3D3] p-10">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-700">
              One-click onboarding
            </p>
            <h2 className="mt-3 font-serif text-4xl text-stone-900">
              Start from Meta. Land in Rasphia fully contextualized.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-stone-600">
              The signup story should feel like a channel connect, not a consulting project. Meta
              Embedded Signup is the front door; Rasphia becomes the commerce operating layer behind it.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {steps.map((step, i) => (
              <div key={step.number} className="relative">
                {i < steps.length - 1 ? (
                  <ChevronRight className="absolute -right-4 top-8 hidden h-6 w-6 text-stone-400 md:block" />
                ) : null}
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

          <div className="mt-8 flex flex-col items-center gap-4 text-center">
            <MetaEmbeddedSignupButton className="px-9 py-3.5 text-base" label="Connect my business with Meta" />
            <p className="max-w-2xl text-sm text-stone-500">
              Expected connected assets: business identity, WhatsApp setup, channel context, and the handoff into Rasphia merchant onboarding.
            </p>
          </div>
        </section>

        <section>
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-700">
              Channel roles
            </p>
            <h2 className="mt-3 font-serif text-4xl text-stone-900">
              Treat each channel differently. Keep the commerce brain shared.
            </h2>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {channelCards.map((card) => {
              const Icon = card.icon;
              return (
                <article
                  key={card.title}
                  className="rounded-[28px] border border-stone-200/70 bg-white/85 p-6 shadow-md shadow-stone-100/60 backdrop-blur"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100/80 text-amber-700">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold text-stone-900">{card.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-stone-600">{card.description}</p>
                  <ul className="mt-5 space-y-2">
                    {card.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-2 text-sm text-stone-700">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                        {bullet}
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        </section>

        <section
          id="live-demo"
          className="rounded-[32px] border border-stone-200/70 bg-white/80 p-8 shadow-xl shadow-stone-200/40 backdrop-blur"
        >
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-700">
                Live flow
              </p>
              <h2 className="mt-3 font-serif text-4xl leading-tight text-stone-900">
                See the channel-first onboarding and commerce flow in motion.
              </h2>
              <p className="mt-4 text-base text-stone-600">
                Today, the fastest live demo is still the WhatsApp path. The page is now structured
                so Meta Embedded Signup becomes the cleanest production entry point as soon as
                credentials and backend exchange are enabled.
              </p>

              <div className="mt-6 space-y-3">
                {[
                  "Fastest current path: WhatsApp demo conversation",
                  "Target onboarding path: Meta Embedded Signup",
                  "Shared outcome: one conversational commerce stack behind the scenes",
                ].map((line) => (
                  <div key={line} className="flex items-start gap-2 text-sm text-stone-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                    <span>{line}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <MetaEmbeddedSignupButton label="Start with Meta" />
                <a
                  href={WHATSAPP_LINK}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-3 rounded-full border border-stone-300 bg-white px-7 py-3.5 text-sm font-semibold text-stone-900 transition hover:bg-stone-50"
                >
                  Open WhatsApp demo
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div>
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
          </div>
        </section>

        <section className="rounded-[32px] bg-[#1C140E] px-8 py-14 text-white shadow-2xl shadow-stone-900/20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-400">
              Merchant promise
            </p>
            <h2 className="mt-3 font-serif text-4xl text-white">
              One onboarding path. Two core channels. One commerce operating layer.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-white/75">
              Rasphia is not trying to compete with Meta’s entry points. It is designed to sit
              behind them and make them commercially usable.
            </p>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          {trustItems.map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.title}
                className="rounded-[24px] border border-stone-200/70 bg-white/80 p-6 shadow-md backdrop-blur"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-stone-700">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-stone-900">{item.title}</h3>
                <p className="mt-2 text-sm text-stone-600">{item.desc}</p>
              </article>
            );
          })}
        </section>

        <section className="rounded-[32px] bg-gradient-to-br from-[#2E1F1B] to-[#4B332A] px-8 py-14 text-white shadow-2xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm uppercase tracking-[0.4em] text-white/60">
              Ready to launch channel-first commerce?
            </p>
            <h2 className="mt-3 font-serif text-4xl leading-snug md:text-5xl">
              Connect once.
              <br />
              <span className="text-amber-300">Sell conversationally everywhere that matters.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-base text-white/70">
              Start with Meta Embedded Signup when your configuration is ready, or use the current
              WhatsApp demo flow today.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <MetaEmbeddedSignupButton
                label="Start with Meta Embedded Signup"
                className="bg-white px-10 py-4 text-base font-bold text-stone-900 shadow-xl shadow-black/20 hover:bg-amber-50"
              />
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/10 px-8 py-4 text-base font-semibold text-white backdrop-blur transition hover:bg-white/15"
              >
                Talk on WhatsApp first
                <ArrowRight className="h-5 w-5" />
              </a>
            </div>

            <p className="mt-4 text-xs text-white/40">
              Merchant fallback stays available while Meta signup credentials and code exchange are finalized.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-stone-200/60 bg-[#F8F4EF]">
        <div className="mx-auto max-w-6xl px-6 py-12 lg:px-8">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div>
              <BrandLogo size={32} showWordmark wordmarkClassName="text-base font-semibold text-brand-charcoal" />
              <p className="mt-2 max-w-xs text-sm text-stone-500">
                Conversational commerce infrastructure for WhatsApp and Instagram sellers.
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
