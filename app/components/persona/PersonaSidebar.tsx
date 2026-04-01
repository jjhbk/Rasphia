"use client";
import React from "react";
import {
  Camera,
  Wand2,
  User,
  Heart,
  MapPin,
  Layers,
  Eye,
  Home,
} from "lucide-react";

const SECTIONS = [
  { key: "home", label: "Home Profile", icon: Home },
  { key: "skin", label: "Skin Profile", icon: Camera },
  { key: "hair", label: "Hair Profile", icon: Wand2 },
  { key: "body", label: "Body Profile", icon: User },
  { key: "style", label: "Style", icon: Layers },
  { key: "taste", label: "Taste", icon: Heart },
  { key: "lifestyle", label: "Lifestyle", icon: MapPin },
];

export default function PersonaSidebar({
  persona,
  onOpenFlow,
}: {
  persona: any;
  onOpenFlow: (type: string) => void;
}) {
  function isPersonaSectionComplete(section: any): boolean {
    if (!section || typeof section !== "object") return false;

    // if updatedAt exists and is not null → section is completed at least once
    if (section.updatedAt) return true;

    // otherwise check if any field has meaningful content
    return Object.values(section).some((value) => {
      if (value === null) return false;
      if (value === "") return false;
      if (Array.isArray(value) && value.length === 0) return false;
      return true;
    });
  }

  return (
    <div className="p-4 flex flex-col gap-3 h-full">
      <h3 className="text-xs uppercase tracking-widest text-stone-500">
        Your Persona
      </h3>

      <div className="mt-2 space-y-2">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          const done = isPersonaSectionComplete(persona?.[s.key]);

          return (
            <button
              key={s.key}
              onClick={() => onOpenFlow(s.key)}
              className={`w-full flex items-center justify-between p-3 rounded-2xl transition 
                ${
                  done
                    ? "bg-white/80 border border-white/60 shadow-md"
                    : "bg-white/40 border border-white/30"
                }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-50">
                  <Icon className="h-5 w-5 text-amber-600" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold text-stone-800">
                    {s.label}
                  </div>
                  <div className="text-[11px] text-stone-500">
                    {done ? "Completed" : "Tap to complete"}
                  </div>
                </div>
              </div>

              <div
                className={`h-2 w-2 rounded-full ${
                  done ? "bg-amber-600" : "bg-stone-300"
                }`}
              />
            </button>
          );
        })}

        {/* 🎉 NEW “View Persona” BUTTON */}
        <a
          href="/persona"
          className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl bg-brand-charcoal text-brand-cream text-sm font-semibold mt-4 ring-1 ring-brand-warm-black/15 shadow-soft-md hover:bg-brand-warm-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-charcoal/45"
        >
          <Eye className="h-4 w-4" />
          View Complete Persona
        </a>
      </div>

      <div className="mt-auto text-[11px] text-stone-400">
        Your persona powers personalized picks across fashion, grooming and
        lifestyle.
      </div>
    </div>
  );
}
