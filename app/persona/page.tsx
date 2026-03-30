"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  Camera,
  Wand2,
  User,
  Heart,
  MapPin,
  Layers,
  Home,
} from "lucide-react";

const ICONS: Record<string, any> = {
  home: Home,
  skin: Camera,
  hair: Wand2,
  body: User,
  style: Layers,
  taste: Heart,
  lifestyle: MapPin,
};

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

  if (!persona)
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-cream">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-brand-charcoal flex items-center justify-center">
            <span className="font-heading text-lg text-brand-cream">R</span>
          </div>
          <p className="text-sm text-brand-stone font-body">Loading your taste graph…</p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-brand-cream font-body">
      {/* HEADER */}
      <div className="sticky top-0 z-10 bg-brand-cream/80 backdrop-blur-md border-b border-brand-sand/30">
        <div className="mx-auto max-w-3xl px-4 h-14 flex items-center gap-3">
          <a
            href="/"
            className="p-2 rounded-xl hover:bg-brand-parchment text-brand-stone hover:text-brand-charcoal transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </a>
          <span className="text-sm font-semibold text-brand-charcoal font-heading">
            Taste Graph
          </span>
        </div>
      </div>

      {/* HERO SECTION */}
      <div className="mx-auto max-w-3xl px-4 pt-8">
        <div className="relative rounded-3xl overflow-hidden bg-brand-parchment border border-brand-sand/40">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-parchment via-brand-cream to-brand-sand/30 pointer-events-none" />
          <div className="relative p-8 flex flex-col items-center text-center">
            <img
              src={session?.user?.image || ""}
              className="h-20 w-20 rounded-full object-cover border-4 border-white shadow-soft-md"
              alt={session?.user?.name || "Profile"}
            />
            <h1 className="text-2xl font-semibold mt-4 text-brand-charcoal font-heading">
              {session?.user?.name}
            </h1>
            <p className="text-brand-stone mt-2 text-sm max-w-sm leading-relaxed">
              Your personalized identity across skin, style, body and lifestyle.
            </p>
            <p className="mt-4 text-xs text-brand-stone/60 italic font-heading">
              "This is the most authentic version of you — decoded."
            </p>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        {Object.entries(persona || {}).map(([key, data]) => (
          <PersonaSection key={key} title={capitalize(key)} icon={ICONS[key]}>
            <PersonaContent data={data} />
          </PersonaSection>
        ))}
      </div>
    </div>
  );
}

function PersonaSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: any;
  children: any;
}) {
  return (
    <div className="bg-white/70 rounded-2xl p-6 shadow-soft border border-brand-sand/30 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-parchment/20 to-white pointer-events-none" />
      <div className="relative">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-9 w-9 flex items-center justify-center rounded-xl bg-brand-parchment text-brand-terracotta flex-shrink-0">
            {Icon && <Icon className="h-4 w-4" />}
          </div>
          <h2 className="text-base font-semibold text-brand-charcoal font-heading">{title}</h2>
        </div>
        <div className="space-y-5">{children}</div>
      </div>
    </div>
  );
}

function PersonaContent({ data }: { data: any }) {
  return (
    <div className="space-y-5">
      {data.photoUrls?.length > 0 && (
        <div className="flex gap-3 overflow-x-auto py-1">
          {data.photoUrls.map((url: string, idx: number) => (
            <div
              key={idx}
              className="flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden border border-brand-sand/40 rotate-[-1deg] shadow-soft"
            >
              <img src={url} className="w-full h-full object-cover" alt="persona photo" />
            </div>
          ))}
        </div>
      )}

      {Object.entries(data)
        .filter(([key]) => key !== "photoUrls")
        .filter(([key]) => key !== "analysisSummaries")
        .map(([key, value]) => (
          <Field key={key} label={pretty(key)} value={value} />
        ))}
    </div>
  );
}

function Field({ label, value }: { label: string; value: any }) {
  if (!value) return null;

  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    return (
      <div>
        <div className="text-[10px] uppercase tracking-widest font-medium text-brand-stone/60 mb-2">{label}</div>
        <div className="flex flex-wrap gap-2">
          {value.map((v, i) => (
            <span
              key={i}
              className="px-3 py-1 text-xs rounded-full bg-brand-parchment text-brand-terracotta border border-brand-sand/50"
            >
              {v}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-between items-center text-sm border-b border-brand-sand/30 pb-2.5">
      <span className="text-brand-stone/70">{label}</span>
      <span className="font-medium text-brand-charcoal">{value}</span>
    </div>
  );
}

function pretty(s: string) {
  return s
    .replace(/([A-Z])/g, " $1")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
