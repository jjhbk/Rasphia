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

  const toggle = (v: string, setter: any, prev: string[]) => {
    setter(prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]);
  };

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

        <div className="space-y-4">
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
              ].map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => toggle(g, setGiftingStyle, giftingStyle)}
                  className={`px-3 py-1 rounded-full text-xs border ${
                    giftingStyle.includes(g)
                      ? "bg-amber-600 text-white border-amber-600"
                      : "bg-white text-stone-600 border-stone-300"
                  }`}
                >
                  {g}
                </button>
              ))}
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
              ].map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => toggle(h, setHomeAesthetic, homeAesthetic)}
                  className={`px-3 py-1 rounded-full text-xs border ${
                    homeAesthetic.includes(h)
                      ? "bg-amber-600 text-white border-amber-600"
                      : "bg-white text-stone-600 border-stone-300"
                  }`}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>

          {/* SCENTS */}
          <div>
            <label className="text-xs text-stone-600">Preferred Scents</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {["woody", "fresh", "citrus", "spicy", "aquatic", "sweet"].map(
                (s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggle(s, setScents, scents)}
                    className={`px-3 py-1 rounded-full text-xs border ${
                      scents.includes(s)
                        ? "bg-amber-600 text-white border-amber-600"
                        : "bg-white text-stone-600 border-stone-300"
                    }`}
                  >
                    {s}
                  </button>
                )
              )}
            </div>
          </div>

          {/* MATERIALS */}
          <div>
            <label className="text-xs text-stone-600">Material Taste</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {["leather", "cotton", "linen", "wood", "metal", "glass"].map(
                (m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => toggle(m, setMaterials, materials)}
                    className={`px-3 py-1 rounded-full text-xs border ${
                      materials.includes(m)
                        ? "bg-amber-600 text-white border-amber-600"
                        : "bg-white text-stone-600 border-stone-300"
                    }`}
                  >
                    {m}
                  </button>
                )
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
