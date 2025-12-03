"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
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

// ICON MAP FOR SECTIONS
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
      <div className="min-h-screen flex items-center justify-center text-stone-600">
        Loading your persona...
      </div>
    );

  return (
    <div className="min-h-screen bg-[#F8F4EF]">
      {/* HEADER */}
      <div className="p-4 flex items-center gap-2">
        <a
          href="/"
          className="flex items-center gap-2 text-stone-600 hover:text-stone-900 transition"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="text-sm font-medium">Back Home</span>
        </a>
      </div>

      {/* HERO SECTION */}
      <div className="mx-auto max-w-3xl px-4">
        <div className="relative rounded-3xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-100/60 to-stone-200/40 backdrop-blur-xl" />
          <div className="relative p-8 flex flex-col items-center text-center">
            <img
              src={session?.user?.image || ""}
              className="h-24 w-24 rounded-full object-cover border-4 border-white shadow-lg"
            />

            <h1 className="text-2xl font-semibold mt-4 text-stone-900">
              {session?.user?.name}
            </h1>
            <p className="text-stone-600 mt-2">
              Your personalized identity across skin, style, body and lifestyle.
            </p>

            <p className="mt-4 text-sm text-stone-500 italic">
              “This is the most authentic version of you — decoded.”
            </p>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="mx-auto max-w-3xl p-4 space-y-10 mt-8">
        {/* Render each section dynamically */}
        {Object.entries(persona || {}).map(([key, data]) => (
          <PersonaSection key={key} title={capitalize(key)} icon={ICONS[key]}>
            <PersonaContent data={data} />
          </PersonaSection>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    UI                                      */
/* -------------------------------------------------------------------------- */

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
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200 relative overflow-hidden">
      {/* subtle gradient accent */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-50/40 to-white pointer-events-none" />

      <div className="relative">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 rounded-2xl bg-amber-100 text-amber-700 shadow-sm">
            <Icon className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-semibold text-stone-800">{title}</h2>
        </div>

        <div className="space-y-6">{children}</div>
      </div>
    </div>
  );
}

function PersonaContent({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      {/* PHOTO GALLERY */}
      {data.photoUrls?.length > 0 && (
        <div className="flex gap-4 overflow-x-auto py-2">
          {data.photoUrls.map((url: string, idx: number) => (
            <div
              key={idx}
              className="flex-shrink-0 w-28 h-28 rounded-xl overflow-hidden shadow-md border border-stone-200 rotate-[-2deg]"
            >
              <img src={url} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}

      {/* FIELDS */}
      {Object.entries(data)
        .filter(([key]) => key !== "photoUrls")
        .filter(([key]) => key !== "analysisSummaries")
        .map(([key, value]) => (
          <Field key={key} label={pretty(key)} value={value} />
        ))}
    </div>
  );
}

/* FIELD RENDERER (auto-detect array, text, etc.) */
function Field({ label, value }: { label: string; value: any }) {
  if (!value) return null;

  // ARRAY → pill list
  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    return (
      <div>
        <div className="text-xs text-stone-500 mb-1">{label}</div>
        <div className="flex flex-wrap gap-2">
          {value.map((v, i) => (
            <span
              key={i}
              className="px-3 py-1 text-xs rounded-full bg-amber-50 text-amber-700 border border-amber-200 shadow-sm"
            >
              {v}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // STRING → text
  return (
    <div className="flex justify-between text-sm border-b border-stone-100 pb-2">
      <span className="text-stone-500">{label}</span>
      <span className="font-medium text-stone-800">{value}</span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   HELPERS                                  */
/* -------------------------------------------------------------------------- */

function pretty(s: string) {
  return s
    .replace(/([A-Z])/g, " $1")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
