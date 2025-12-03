"use client";

import React, { useState } from "react";
import { X } from "lucide-react";

export default function TasteFlow({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (payload: any) => Promise<void>;
}) {
  // PERSONA FIELDS
  const [giftingStyle, setGiftingStyle] = useState<string[]>([]);
  const [homeAesthetic, setHomeAesthetic] = useState<string[]>([]);
  const [scents, setScents] = useState<string[]>([]);
  const [materials, setMaterials] = useState<string[]>([]);
  const [budget, setBudget] = useState("medium");
  const [notes, setNotes] = useState("");

  // StrictMode-safe multi-select
  const toggle = (value: string, setter: any) => {
    setter((prev: string[]) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  // Pill style
  const pillBase =
    "px-3 py-1 rounded-full text-xs border cursor-pointer flex items-center gap-2 select-none";

  const pill = (value: string, selected: boolean, toggleFn: () => void) => (
    <label
      key={value}
      className={`${pillBase} ${
        selected
          ? "bg-amber-600 text-white border-amber-600"
          : "bg-white text-stone-600 border-stone-300"
      }`}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={toggleFn}
        className="hidden"
      />
      {value}
    </label>
  );

  async function handleSave() {
    const payload = {
      taste: {
        giftingStyle,
        homeAesthetic,
        scentPreferences: scents,
        materialPreferences: materials,
        priceComfort: budget,
        notes,
        updatedAt: new Date().toISOString(),
      },
    };

    await onSave(payload);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex justify-center items-center z-[200] p-4">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-xl p-5 max-h-[90vh] overflow-auto">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Taste Profile</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-stone-100"
          >
            <X />
          </button>
        </div>

        <div className="space-y-5">
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
              ].map((v) =>
                pill(v, giftingStyle.includes(v), () =>
                  toggle(v, setGiftingStyle)
                )
              )}
            </div>
          </div>

          {/* HOME AESTHETIC */}
          <div>
            <label className="text-xs text-stone-600">Home Decor Taste</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {[
                "modern",
                "rustic",
                "minimal",
                "boho",
                "luxury",
                "industrial",
              ].map((v) =>
                pill(v, homeAesthetic.includes(v), () =>
                  toggle(v, setHomeAesthetic)
                )
              )}
            </div>
          </div>

          {/* SCENTS */}
          <div>
            <label className="text-xs text-stone-600">Preferred Scents</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {["woody", "fresh", "citrus", "spicy", "aquatic", "sweet"].map(
                (v) => pill(v, scents.includes(v), () => toggle(v, setScents))
              )}
            </div>
          </div>

          {/* MATERIALS */}
          <div>
            <label className="text-xs text-stone-600">Material Taste</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {["leather", "cotton", "linen", "wood", "metal", "glass"].map(
                (v) =>
                  pill(v, materials.includes(v), () => toggle(v, setMaterials))
              )}
            </div>
          </div>

          {/* BUDGET */}
          <div>
            <label className="text-xs text-stone-600">Budget</label>
            <select
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="w-full p-3 bg-stone-50 rounded-xl"
            >
              <option value="low">Affordable</option>
              <option value="medium">Mid-Range</option>
              <option value="high">Premium</option>
            </select>
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

          {/* SAVE */}
          <button
            onClick={handleSave}
            className="w-full py-3 rounded-full bg-amber-600 text-white"
          >
            Save Taste Profile
          </button>
        </div>
      </div>
    </div>
  );
}
