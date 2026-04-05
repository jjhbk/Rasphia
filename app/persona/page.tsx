"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Camera,
  Wand2,
  User,
  Heart,
  MapPin,
  Layers,
  CheckCircle2,
  ArrowLeft,
  Pencil,
} from "lucide-react";
import Navbar from "@/app/components/Navbar";
import Link from "next/link";

type SectionKey = "skin" | "hair" | "body" | "style" | "taste" | "lifestyle";

const SECTIONS: { key: SectionKey; label: string; icon: React.ElementType; color: string; bg: string }[] = [
  { key: "skin",      label: "Skin",      icon: Camera,   color: "text-rose-600",    bg: "bg-rose-50 border-rose-200" },
  { key: "hair",      label: "Hair",      icon: Wand2,    color: "text-violet-600",  bg: "bg-violet-50 border-violet-200" },
  { key: "body",      label: "Body",      icon: User,     color: "text-blue-600",    bg: "bg-blue-50 border-blue-200" },
  { key: "style",     label: "Style",     icon: Layers,   color: "text-amber-600",   bg: "bg-amber-50 border-amber-200" },
  { key: "taste",     label: "Taste",     icon: Heart,    color: "text-pink-600",    bg: "bg-pink-50 border-pink-200" },
  { key: "lifestyle", label: "Lifestyle", icon: MapPin,   color: "text-teal-600",    bg: "bg-teal-50 border-teal-200" },
];

export default function PersonaPage() {
  const { data: session } = useSession();
  const [persona, setPersona] = useState<any>(null);
  const email = session?.user?.email;

  useEffect(() => {
    async function load() {
      if (!email) return;
      const res = await fetch("/api/persona/get?email=" + email);
      const json = await res.json();
      setPersona(json?.persona || {});
    }
    load();
  }, [email]);

  const completedSections = SECTIONS.filter(
    (s) => persona && persona[s.key] && Object.keys(persona[s.key]).length > 0
  );
  const completionPct = Math.round((completedSections.length / SECTIONS.length) * 100);

  if (!persona)
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center bg-brand-cream">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 rounded-full border-2 border-brand-terracotta/30 border-t-brand-terracotta animate-spin" />
            <p className="text-sm text-brand-stone font-body">Loading your taste graph…</p>
          </div>
        </div>
      </>
    );

  return (
    <div className="min-h-screen bg-brand-hero font-body">
      <Navbar />

      {/* Hero */}
      <div className="relative border-b border-brand-sand/30 bg-brand-parchment/60">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-16 right-[-5%] h-72 w-72 rounded-full bg-brand-clay/12 blur-[80px]" />
          <div className="absolute bottom-0 left-[8%] h-52 w-52 rounded-full bg-brand-sage/10 blur-[70px]" />
        </div>
        <div className="relative mx-auto max-w-4xl px-6 py-10 flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="relative flex-shrink-0">
            {session?.user?.image ? (
              <img
                src={session.user.image}
                className="h-20 w-20 rounded-2xl object-cover border-2 border-white shadow-soft-md"
                alt={session.user.name || "Profile"}
              />
            ) : (
              <div className="h-20 w-20 rounded-2xl bg-brand-terracotta/10 border-2 border-white shadow-soft-md flex items-center justify-center">
                <span className="font-heading text-2xl text-brand-terracotta">
                  {(session?.user?.name?.[0] ?? "?").toUpperCase()}
                </span>
              </div>
            )}
            {completedSections.length === SECTIONS.length && (
              <CheckCircle2 className="absolute -bottom-2 -right-2 h-6 w-6 text-green-500 bg-white rounded-full" />
            )}
          </div>

          <div className="text-center sm:text-left flex-1">
            <p className="text-xs text-brand-stone/60 uppercase tracking-widest mb-1">Taste Graph</p>
            <h1 className="font-heading text-2xl sm:text-3xl text-brand-charcoal">
              {session?.user?.name || "Your Profile"}
            </h1>
            <p className="mt-1.5 text-sm text-brand-stone">
              {completedSections.length} of {SECTIONS.length} sections completed
            </p>

            {/* Progress bar */}
            <div className="mt-4 flex items-center gap-3 max-w-xs mx-auto sm:mx-0">
              <div className="flex-1 h-1.5 bg-brand-sand/40 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-terracotta rounded-full transition-all"
                  style={{ width: `${completionPct}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-brand-charcoal tabular-nums">{completionPct}%</span>
            </div>
          </div>

          <Link
            href="/persona/create"
            className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-brand-charcoal text-brand-cream text-sm font-medium rounded-xl hover:bg-brand-warm-black transition-colors shadow-soft"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit Persona
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-8">
        {/* Section overview grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          {SECTIONS.map((s) => {
            const isDone = persona[s.key] && Object.keys(persona[s.key]).length > 0;
            const Icon = s.icon;
            return (
              <div
                key={s.key}
                className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all ${
                  isDone
                    ? "bg-white/80 border-brand-sand/30 shadow-soft"
                    : "bg-white/30 border-brand-sand/20"
                }`}
              >
                <div className={`h-9 w-9 rounded-xl border flex items-center justify-center flex-shrink-0 ${s.bg}`}>
                  <Icon className={`h-4 w-4 ${s.color}`} />
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-medium ${isDone ? "text-brand-charcoal" : "text-brand-stone/60"}`}>
                    {s.label}
                  </p>
                  <p className="text-[10px] text-brand-stone/40">
                    {isDone ? "Complete" : "Not set"}
                  </p>
                </div>
                {isDone && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto flex-shrink-0" />}
              </div>
            );
          })}
        </div>

        {/* Detailed sections */}
        <div className="space-y-4">
          {SECTIONS.map((s) => {
            const data = persona[s.key];
            const Icon = s.icon;
            if (!data || Object.keys(data).length === 0) return null;
            return (
              <PersonaSection key={s.key} label={s.label} icon={Icon} iconColor={s.color} iconBg={s.bg}>
                <PersonaContent data={data} />
              </PersonaSection>
            );
          })}

          {completedSections.length === 0 && (
            <div className="py-16 text-center">
              <div className="h-16 w-16 rounded-2xl bg-brand-parchment/60 border border-brand-sand/40 flex items-center justify-center mx-auto mb-4">
                <User className="h-7 w-7 text-brand-sand" />
              </div>
              <p className="font-medium text-brand-charcoal mb-2">No persona data yet</p>
              <p className="text-sm text-brand-stone mb-5">Build your taste graph so Rasphia can curate perfectly for you.</p>
              <Link
                href="/persona/create"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-charcoal text-brand-cream text-sm font-medium rounded-xl hover:bg-brand-warm-black transition-colors shadow-soft"
              >
                Build My Taste Graph
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PersonaSection({
  label,
  icon: Icon,
  iconColor,
  iconBg,
  children,
}: {
  label: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white/80 rounded-2xl border border-brand-sand/30 shadow-soft overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-brand-sand/20 bg-brand-parchment/20">
        <div className={`h-8 w-8 rounded-xl border flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
        <h2 className="font-heading text-base text-brand-charcoal">{label}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function PersonaContent({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      {data.photoUrls?.length > 0 && (
        <div className="flex gap-3 overflow-x-auto py-1">
          {data.photoUrls.map((url: string, idx: number) => (
            <div
              key={idx}
              className="flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-brand-sand/40 shadow-soft"
            >
              <img src={url} className="w-full h-full object-cover" alt="persona photo" />
            </div>
          ))}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Object.entries(data)
          .filter(([key]) => key !== "photoUrls" && key !== "analysisSummaries")
          .map(([key, value]) => (
            <Field key={key} label={pretty(key)} value={value} />
          ))}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: any }) {
  if (!value) return null;

  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    return (
      <div className="sm:col-span-2">
        <p className="text-[10px] uppercase tracking-widest font-semibold text-brand-stone/50 mb-2">{label}</p>
        <div className="flex flex-wrap gap-1.5">
          {value.map((v, i) => (
            <span
              key={i}
              className="px-2.5 py-1 text-xs rounded-full bg-brand-parchment text-brand-terracotta border border-brand-sand/50"
            >
              {v}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-widest font-semibold text-brand-stone/50">{label}</span>
      <span className="text-sm font-medium text-brand-charcoal">{String(value)}</span>
    </div>
  );
}

function pretty(s: string) {
  return s
    .replace(/([A-Z])/g, " $1")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
