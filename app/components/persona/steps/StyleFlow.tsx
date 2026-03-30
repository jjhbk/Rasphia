"use client";

import React, { useState } from "react";
import { X } from "lucide-react";

/**
 * Visual style presets (archetypes)
 * Opinionated shortcuts, not hard rules
 */
const STYLE_PRESETS = [
  {
    id: "minimalist",
    label: "Minimalist",
    emoji: "⬜",
    values: {
      archetypes: ["minimalist"],
      colorsLike: ["black", "white", "grey", "beige"],
      colorsAvoid: ["neon", "bright red"],
      boldness: "low",
      occasions: ["work", "weekend"],
      footwear: ["sneakers", "loafers"],
      accessories: ["watch"],
    },
  },
  {
    id: "smart-casual",
    label: "Smart Casual",
    emoji: "🧥",
    values: {
      archetypes: ["smart casual", "classic"],
      colorsLike: ["navy", "brown", "olive", "white"],
      colorsAvoid: ["neon"],
      boldness: "medium",
      occasions: ["work", "dinner", "date"],
      footwear: ["loafers", "formal shoes"],
      accessories: ["watch"],
    },
  },
  {
    id: "streetwear",
    label: "Streetwear",
    emoji: "🧢",
    values: {
      archetypes: ["streetwear"],
      colorsLike: ["black", "white", "maroon"],
      colorsAvoid: [],
      boldness: "high",
      occasions: ["weekend", "party", "travel"],
      footwear: ["sneakers"],
      accessories: ["caps", "chains", "rings"],
    },
  },
  {
    id: "sporty",
    label: "Sporty / Active",
    emoji: "🏃",
    values: {
      archetypes: ["sporty"],
      colorsLike: ["black", "navy", "grey"],
      colorsAvoid: [],
      boldness: "medium",
      occasions: ["gym", "travel", "weekend"],
      footwear: ["sneakers"],
      accessories: ["watch", "caps"],
    },
  },
  {
    id: "luxury",
    label: "Luxury",
    emoji: "💎",
    values: {
      archetypes: ["luxury", "classic"],
      colorsLike: ["black", "brown", "navy"],
      colorsAvoid: ["neon", "yellow"],
      boldness: "medium",
      occasions: ["dinner", "wedding", "party"],
      footwear: ["formal shoes", "boots"],
      accessories: ["watch", "rings", "chains"],
    },
  },
];

export default function StyleFlow({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (payload: any) => Promise<void>;
}) {
  // -------------------------
  // STYLE PERSONA STATE
  // -------------------------
  const [archetypes, setArchetypes] = useState<string[]>([]);
  const [colorsLike, setColorsLike] = useState<string[]>([]);
  const [colorsAvoid, setColorsAvoid] = useState<string[]>([]);
  const [boldness, setBoldness] = useState("medium");
  const [occasions, setOccasions] = useState<string[]>([]);
  const [footwear, setFootwear] = useState<string[]>([]);
  const [accessories, setAccessories] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  // UI state
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // -------------------------
  // HELPERS
  // -------------------------
  function applyPreset(preset: any) {
    setSelectedPreset(preset.id);

    setArchetypes(preset.values.archetypes);
    setColorsLike(preset.values.colorsLike);
    setColorsAvoid(preset.values.colorsAvoid);
    setBoldness(preset.values.boldness);
    setOccasions(preset.values.occasions);
    setFootwear(preset.values.footwear);
    setAccessories(preset.values.accessories);
  }

  const toggle = (value: string, setter: any) => {
    setter((prev: string[]) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const pill =
    "px-3 py-1 rounded-full text-xs border cursor-pointer select-none";

  async function handleSave() {
    await onSave({
      style: {
        archetypes,
        colorsLike,
        colorsAvoid,
        boldness,
        occasions,
        footwear,
        accessories,
        notes,
        updatedAt: new Date().toISOString(),
      },
    });
  }

  // -------------------------
  // UI
  // -------------------------
  return (
    <div className="fixed inset-0 bg-brand-warm-black/20 backdrop-blur-sm flex justify-center items-center z-[200] p-4">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-soft-xl border border-brand-sand/30 p-5 max-h-[90vh] overflow-auto custom-scrollbar">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-heading font-semibold text-brand-charcoal">Style</h2>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-xl border border-brand-sand/40 text-brand-stone hover:bg-brand-parchment transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* VISUAL PRESETS */}
        <p className="text-sm text-brand-stone mb-3">
          Pick the style that feels most like you
        </p>

        <div className="grid grid-cols-2 gap-3">
          {STYLE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              className={`rounded-2xl border p-4 text-left transition ${
                selectedPreset === preset.id
                  ? "border-brand-terracotta ring-2 ring-brand-terracotta/30"
                  : "border-brand-sand/50 hover:border-brand-sand"
              }`}
            >
              <div className="text-2xl mb-2">{preset.emoji}</div>
              <div className="font-medium text-sm text-brand-charcoal">{preset.label}</div>
            </button>
          ))}
        </div>

        {/* ADVANCED TOGGLE */}
        <button
          onClick={() => setAdvancedOpen((v) => !v)}
          className="mt-5 text-xs text-brand-stone/60 underline"
        >
          Refine style details
        </button>

        {/* ADVANCED (POWER USER MODE) */}
        {advancedOpen && (
          <div className="mt-4 space-y-4">
            {/* ARCHETYPES */}
            <div>
              <label className="text-xs text-brand-stone/60">Style Archetypes</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {[
                  "minimalist",
                  "streetwear",
                  "classic",
                  "sporty",
                  "bohemian",
                  "edgy",
                  "smart casual",
                  "luxury",
                ].map((item) => (
                  <button
                    key={item}
                    onClick={() => toggle(item, setArchetypes)}
                    className={`${pill} ${
                      archetypes.includes(item)
                        ? "bg-brand-terracotta text-brand-cream border-brand-terracotta"
                        : "bg-white text-brand-stone border-brand-sand"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            {/* NOTES */}
            <div>
              <label className="text-xs text-brand-stone/60">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-3 bg-brand-parchment/50 border border-brand-sand/50 rounded-xl text-sm text-brand-charcoal focus:outline-none resize-none"
              />
            </div>
          </div>
        )}

        {/* SAVE */}
        <button
          onClick={handleSave}
          className="w-full py-3 rounded-xl bg-brand-charcoal text-brand-cream text-sm font-medium hover:bg-brand-warm-black transition-colors mt-6"
        >
          Save Style
        </button>
      </div>
    </div>
  );
}
