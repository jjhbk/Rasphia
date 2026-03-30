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
  ChevronRight,
} from "lucide-react";

const SECTIONS = [
  { key: "home",      label: "Home",      sublabel: "Space & décor",   icon: Home },
  { key: "skin",      label: "Skin",      sublabel: "Care routine",     icon: Camera },
  { key: "hair",      label: "Hair",      sublabel: "Type & needs",     icon: Wand2 },
  { key: "body",      label: "Body",      sublabel: "Fit & form",       icon: User },
  { key: "style",     label: "Style",     sublabel: "Aesthetic",        icon: Layers },
  { key: "taste",     label: "Taste",     sublabel: "What you love",    icon: Heart },
  { key: "lifestyle", label: "Lifestyle", sublabel: "How you live",     icon: MapPin },
];

function isSectionComplete(section: any): boolean {
  if (!section || typeof section !== "object") return false;
  if (section.updatedAt) return true;
  return Object.values(section).some(
    (v) => v !== null && v !== "" && !(Array.isArray(v) && v.length === 0)
  );
}

export default function PersonaSidebar({
  persona,
  onOpenFlow,
}: {
  persona: any;
  onOpenFlow: (type: string) => void;
}) {
  const completedCount = SECTIONS.filter((s) =>
    isSectionComplete(persona?.[s.key])
  ).length;

  const progress = Math.round((completedCount / SECTIONS.length) * 100);

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* Header */}
      <div>
        <h3 className="text-xs font-medium uppercase tracking-[0.25em] text-brand-stone/60">
          Taste Graph
        </h3>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-sm text-brand-charcoal font-medium">
            {completedCount === SECTIONS.length
              ? "Profile complete"
              : `${completedCount}/${SECTIONS.length} sections`}
          </p>
          <span className="text-xs text-brand-terracotta font-medium">
            {progress}%
          </span>
        </div>
        {/* Progress bar */}
        <div className="mt-2 h-1 w-full rounded-full bg-brand-sand/40 overflow-hidden">
          <div
            className="h-full rounded-full bg-brand-terracotta transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-1">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          const done = isSectionComplete(persona?.[s.key]);
          return (
            <button
              key={s.key}
              onClick={() => onOpenFlow(s.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${
                done
                  ? "bg-white border border-brand-sand/40 shadow-soft"
                  : "hover:bg-white/60 border border-transparent"
              }`}
            >
              <div
                className={`h-8 w-8 flex items-center justify-center rounded-lg flex-shrink-0 transition-colors ${
                  done ? "bg-brand-parchment" : "bg-brand-sand/30"
                }`}
              >
                <Icon
                  className={`h-3.5 w-3.5 ${
                    done ? "text-brand-terracotta" : "text-brand-stone/50"
                  }`}
                />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p
                  className={`text-xs font-medium truncate ${
                    done ? "text-brand-charcoal" : "text-brand-stone/70"
                  }`}
                >
                  {s.label}
                </p>
                <p className="text-[10px] text-brand-stone/50">{s.sublabel}</p>
              </div>
              <div className="flex-shrink-0">
                {done ? (
                  <div className="h-1.5 w-1.5 rounded-full bg-brand-terracotta" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-brand-stone/30 group-hover:text-brand-stone/60 transition-colors" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* View full profile link */}
      <a
        href="/persona"
        className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-brand-sand/50 text-xs font-medium text-brand-terracotta hover:bg-brand-parchment/60 transition-colors"
      >
        <Eye className="h-3.5 w-3.5" />
        View full profile
      </a>
    </div>
  );
}
