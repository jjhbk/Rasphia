"use client";

import React, { useState } from "react";
import { X } from "lucide-react";

/**
 * Visual lifestyle presets
 * These are opinionated shortcuts, NOT final truth
 */
const LIFESTYLE_PRESETS = [
  {
    id: "urban-professional",
    label: "Urban Professional",
    emoji: "🏙️",
    values: {
      work: "office",
      diet: "mixed",
      fitness: ["gym"],
      travelFrequency: "occasional",
      climateContext: "mixed",
      sleepQuality: "average",
      stressLevel: "medium",
      dailyHabits: ["scrolling"],
    },
  },
  {
    id: "fitness-focused",
    label: "Fitness Focused",
    emoji: "💪",
    values: {
      work: "hybrid",
      diet: "veg",
      fitness: ["gym", "running"],
      travelFrequency: "rarely",
      climateContext: "mixed",
      sleepQuality: "good",
      stressLevel: "low",
      dailyHabits: ["meditation"],
    },
  },
  {
    id: "creative-wfh",
    label: "Creative / WFH",
    emoji: "🎨",
    values: {
      work: "wfh",
      diet: "mixed",
      fitness: ["yoga", "walking"],
      travelFrequency: "occasional",
      climateContext: "mixed",
      sleepQuality: "average",
      stressLevel: "medium",
      dailyHabits: ["reading", "journaling"],
    },
  },
  {
    id: "frequent-traveler",
    label: "Frequent Traveler",
    emoji: "✈️",
    values: {
      work: "hybrid",
      diet: "mixed",
      fitness: ["walking"],
      travelFrequency: "frequent",
      climateContext: "mixed",
      sleepQuality: "poor",
      stressLevel: "high",
      dailyHabits: ["scrolling"],
    },
  },
];

export default function LifestyleFlow({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (payload: any) => Promise<void>;
}) {
  // -----------------------------
  // CORE PERSONA STATE
  // -----------------------------
  const [work, setWork] = useState("office");
  const [diet, setDiet] = useState("veg");
  const [fitness, setFitness] = useState<string[]>([]);
  const [travel, setTravel] = useState("occasional");
  const [climate, setClimate] = useState("mixed");
  const [sleep, setSleep] = useState("average");
  const [stress, setStress] = useState("medium");
  const [habits, setHabits] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  // -----------------------------
  // UI STATE
  // -----------------------------
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // -----------------------------
  // HELPERS
  // -----------------------------
  function applyPreset(preset: any) {
    setSelectedPreset(preset.id);

    setWork(preset.values.work);
    setDiet(preset.values.diet);
    setFitness(preset.values.fitness);
    setTravel(preset.values.travelFrequency);
    setClimate(preset.values.climateContext);
    setSleep(preset.values.sleepQuality);
    setStress(preset.values.stressLevel);
    setHabits(preset.values.dailyHabits);
  }

  const toggle = (value: string, setter: any) => {
    setter((prev: string[]) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  async function handleSave() {
    await onSave({
      lifestyle: {
        work,
        diet,
        fitness,
        travelFrequency: travel,
        climateContext: climate,
        sleepQuality: sleep,
        stressLevel: stress,
        dailyHabits: habits,
        notes,
        updatedAt: new Date().toISOString(),
      },
    });

    // wizard controls what happens next
  }

  const pill =
    "px-3 py-1 rounded-full text-xs border cursor-pointer select-none";

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div className="max-h-[80vh] overflow-y-auto px-1">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Lifestyle</h2>
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-stone-100"
        >
          <X />
        </button>
      </div>

      {/* VISUAL PICKER */}
      <div>
        <p className="text-sm text-stone-600 mb-3">
          Pick what best matches your lifestyle
        </p>

        <div className="grid grid-cols-2 gap-3">
          {LIFESTYLE_PRESETS.map((preset) => (
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
      </div>

      {/* ADVANCED TOGGLE */}
      <button
        onClick={() => setAdvancedOpen((v) => !v)}
        className="mt-5 text-xs text-stone-500 underline"
      >
        Refine lifestyle details
      </button>

      {/* ADVANCED FORM (UNCHANGED POWER USER MODE) */}
      {advancedOpen && (
        <div className="mt-4 space-y-4">
          <div>
            <label className="text-xs text-stone-600">Work Setup</label>
            <select
              value={work}
              onChange={(e) => setWork(e.target.value)}
              className="w-full p-3 bg-stone-50 rounded-xl"
            >
              <option value="office">Office</option>
              <option value="wfh">Work From Home</option>
              <option value="hybrid">Hybrid</option>
              <option value="on-field">On Field</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-stone-600">Diet</label>
            <select
              value={diet}
              onChange={(e) => setDiet(e.target.value)}
              className="w-full p-3 bg-stone-50 rounded-xl"
            >
              <option value="veg">Vegetarian</option>
              <option value="non-veg">Non-Vegetarian</option>
              <option value="vegan">Vegan</option>
              <option value="keto">Keto</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-stone-600">Fitness</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {["gym", "running", "cycling", "yoga", "sports", "walking"].map(
                (f) => (
                  <button
                    key={f}
                    onClick={() => toggle(f, setFitness)}
                    className={`${pill} ${
                      fitness.includes(f)
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
        Save Lifestyle
      </button>
    </div>
  );
}
