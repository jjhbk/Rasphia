"use client";

import React, { useState } from "react";
import { X } from "lucide-react";

export default function StyleFlow({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (payload: any) => Promise<void>;
}) {
  // -------------------------
  // STYLE PERSONA FIELDS
  // -------------------------
  const [archetypes, setArchetypes] = useState<string[]>([]);
  const [colorsLike, setColorsLike] = useState<string[]>([]);
  const [colorsAvoid, setColorsAvoid] = useState<string[]>([]);
  const [boldness, setBoldness] = useState("medium");
  const [occasions, setOccasions] = useState<string[]>([]);
  const [footwear, setFootwear] = useState<string[]>([]);
  const [accessories, setAccessories] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  // Toggle utility
  const toggle = (v: string, setter: any, prev: string[]) => {
    setter(prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]);
  };

  // Final save
  async function handleSave() {
    const payload = {
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
    };

    await onSave(payload);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex justify-center items-center z-[200] p-4">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-xl p-5 max-h-[90vh] overflow-auto">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Style Profile</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-stone-100"
          >
            <X />
          </button>
        </div>

        {/* STYLE ARCHETYPES */}
        <div className="space-y-4">
          <div>
            <label className="text-xs text-stone-600">Style Archetypes</label>
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
              ].map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => toggle(a, setArchetypes, archetypes)}
                  className={`px-3 py-1 rounded-full text-xs border ${
                    archetypes.includes(a)
                      ? "bg-amber-600 text-white border-amber-600"
                      : "bg-white text-stone-600 border-stone-300"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* COLOR PREFERENCES */}
          <div>
            <label className="text-xs text-stone-600">Preferred Colors</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {[
                "black",
                "white",
                "beige",
                "olive",
                "navy",
                "brown",
                "grey",
                "maroon",
              ].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggle(c, setColorsLike, colorsLike)}
                  className={`px-3 py-1 rounded-full text-xs border ${
                    colorsLike.includes(c)
                      ? "bg-amber-600 text-white border-amber-600"
                      : "bg-white text-stone-600 border-stone-300"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* AVOID COLORS */}
          <div>
            <label className="text-xs text-stone-600">Colors You Avoid</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {["neon", "bright red", "yellow", "pink", "purple"].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggle(c, setColorsAvoid, colorsAvoid)}
                  className={`px-3 py-1 rounded-full text-xs border ${
                    colorsAvoid.includes(c)
                      ? "bg-amber-600 text-white border-amber-600"
                      : "bg-white text-stone-600 border-stone-300"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* BOLDNESS */}
          <div>
            <label className="text-xs text-stone-600">Boldness Level</label>
            <select
              value={boldness}
              onChange={(e) => setBoldness(e.target.value)}
              className="w-full p-3 bg-stone-50 rounded-xl"
            >
              <option value="low">Low (Subtle, muted)</option>
              <option value="medium">Medium (Clean but expressive)</option>
              <option value="high">High (Statement pieces)</option>
            </select>
          </div>

          {/* OCCASIONS */}
          <div>
            <label className="text-xs text-stone-600">Occasions</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {[
                "work",
                "weekend",
                "date",
                "party",
                "travel",
                "gym",
                "dinner",
                "wedding",
              ].map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => toggle(o, setOccasions, occasions)}
                  className={`px-3 py-1 rounded-full text-xs border ${
                    occasions.includes(o)
                      ? "bg-amber-600 text-white border-amber-600"
                      : "bg-white text-stone-600 border-stone-300"
                  }`}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>

          {/* FOOTWEAR */}
          <div>
            <label className="text-xs text-stone-600">
              Footwear Preferences
            </label>
            <div className="flex flex-wrap gap-2 mt-2">
              {["sneakers", "loafers", "boots", "sandals", "formal shoes"].map(
                (f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => toggle(f, setFootwear, footwear)}
                    className={`px-3 py-1 rounded-full text-xs border ${
                      footwear.includes(f)
                        ? "bg-amber-600 text-white border-amber-600"
                        : "bg-white text-stone-600 border-stone-300"
                    }`}
                  >
                    {f}
                  </button>
                )
              )}
            </div>
          </div>

          {/* ACCESSORIES */}
          <div>
            <label className="text-xs text-stone-600">Accessories</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {[
                "watch",
                "bracelets",
                "rings",
                "chains",
                "sunglasses",
                "caps",
              ].map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => toggle(a, setAccessories, accessories)}
                  className={`px-3 py-1 rounded-full text-xs border ${
                    accessories.includes(a)
                      ? "bg-amber-600 text-white border-amber-600"
                      : "bg-white text-stone-600 border-stone-300"
                  }`}
                >
                  {a}
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

          {/* SAVE BUTTON */}
          <button
            onClick={handleSave}
            className="w-full py-3 rounded-full bg-amber-600 text-white mt-2"
          >
            Save Style Profile
          </button>
        </div>
      </div>
    </div>
  );
}
