"use client";

import React, { useState } from "react";
import { X } from "lucide-react";

/**
 * Visual taste presets
 * Opinionated shortcuts, not hard locks
 */
const TASTE_PRESETS = [
  {
    id: "minimal-modern",
    label: "Minimal & Modern",
    emoji: "🧘",
    values: {
      giftingStyle: ["minimalist", "practical"],
      homeAesthetic: ["modern", "minimal"],
      scentPreferences: ["fresh", "woody"],
      materialPreferences: ["wood", "cotton", "metal"],
      priceComfort: "medium",
    },
  },
  {
    id: "warm-luxury",
    label: "Warm Luxury",
    emoji: "🕯️",
    values: {
      giftingStyle: ["luxury", "thoughtful"],
      homeAesthetic: ["luxury", "modern"],
      scentPreferences: ["woody", "spicy"],
      materialPreferences: ["leather", "wood", "glass"],
      priceComfort: "high",
    },
  },
  {
    id: "cozy-homebody",
    label: "Cozy Homebody",
    emoji: "🏡",
    values: {
      giftingStyle: ["emotional", "thoughtful"],
      homeAesthetic: ["rustic", "boho"],
      scentPreferences: ["sweet", "woody"],
      materialPreferences: ["linen", "cotton", "wood"],
      priceComfort: "medium",
    },
  },
  {
    id: "fun-expressive",
    label: "Fun & Expressive",
    emoji: "🎨",
    values: {
      giftingStyle: ["fun", "emotional"],
      homeAesthetic: ["boho", "industrial"],
      scentPreferences: ["citrus", "fresh"],
      materialPreferences: ["metal", "glass"],
      priceComfort: "medium",
    },
  },
];

export default function TasteFlow({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (payload: any) => Promise<void>;
}) {
  // -------------------------
  // PERSONA STATE
  // -------------------------
  const [giftingStyle, setGiftingStyle] = useState<string[]>([]);
  const [homeAesthetic, setHomeAesthetic] = useState<string[]>([]);
  const [scents, setScents] = useState<string[]>([]);
  const [materials, setMaterials] = useState<string[]>([]);
  const [budget, setBudget] = useState("medium");
  const [notes, setNotes] = useState("");

  // UI state
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // -------------------------
  // HELPERS
  // -------------------------
  function applyPreset(preset: any) {
    setSelectedPreset(preset.id);

    setGiftingStyle(preset.values.giftingStyle);
    setHomeAesthetic(preset.values.homeAesthetic);
    setScents(preset.values.scentPreferences);
    setMaterials(preset.values.materialPreferences);
    setBudget(preset.values.priceComfort);
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
      taste: {
        giftingStyle,
        homeAesthetic,
        scentPreferences: scents,
        materialPreferences: materials,
        priceComfort: budget,
        notes,
        updatedAt: new Date().toISOString(),
      },
    });
  }

  // -------------------------
  // UI
  // -------------------------
  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex justify-center items-center z-[200] p-4">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-xl p-5 max-h-[90vh] overflow-auto">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Taste</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-stone-100"
          >
            <X />
          </button>
        </div>

        {/* VISUAL PRESETS */}
        <p className="text-sm text-stone-600 mb-3">
          Pick what best matches your taste
        </p>

        <div className="grid grid-cols-2 gap-3">
          {TASTE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              className={`rounded-2xl border p-4 text-left transition ${
                selectedPreset === preset.id
                  ? "border-amber-600 ring-2 ring-amber-600"
                  : "border-stone-200"
              }`}
            >
              <div className="text-2xl mb-2">{preset.emoji}</div>
              <div className="font-medium text-sm">{preset.label}</div>
            </button>
          ))}
        </div>

        {/* ADVANCED TOGGLE */}
        <button
          onClick={() => setAdvancedOpen((v) => !v)}
          className="mt-5 text-xs text-stone-500 underline"
        >
          Refine taste details
        </button>

        {/* ADVANCED (POWER USER MODE) */}
        {advancedOpen && (
          <div className="mt-4 space-y-4">
            {/* GIFTING STYLE */}
            <div>
              <label className="text-xs text-stone-600">Gifting Style</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {[
                  "practical",
                  "luxury",
                  "emotional",
                  "fun",
                  "minimalist",
                  "thoughtful",
                ].map((v) => (
                  <button
                    key={v}
                    onClick={() => toggle(v, setGiftingStyle)}
                    className={`${pill} ${
                      giftingStyle.includes(v)
                        ? "bg-amber-600 text-white border-amber-600"
                        : "bg-white text-stone-600 border-stone-300"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* NOTES */}
            <div>
              <label className="text-xs text-stone-600">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-3 bg-stone-50 rounded-xl"
              />
            </div>
          </div>
        )}

        {/* SAVE */}
        <button
          onClick={handleSave}
          className="w-full py-3 rounded-full bg-amber-600 text-white mt-6"
        >
          Save Taste
        </button>
      </div>
    </div>
  );
}
