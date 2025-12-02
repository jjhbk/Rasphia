"use client";

import React, { useState } from "react";
import { X } from "lucide-react";

export default function LifestyleFlow({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (payload: any) => Promise<void>;
}) {
  // PERSONA FIELDS
  const [work, setWork] = useState("office");
  const [diet, setDiet] = useState("veg");
  const [fitness, setFitness] = useState<string[]>([]);
  const [travel, setTravel] = useState("occasional");
  const [climate, setClimate] = useState("mixed");
  const [sleep, setSleep] = useState("average");
  const [stress, setStress] = useState("medium");
  const [habits, setHabits] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  // MULTI-SELECT HANDLER
  const toggle = (value: string, setter: any, prev: string[]) => {
    if (prev.includes(value)) {
      setter(prev.filter((v) => v !== value));
    } else {
      setter([...prev, value]);
    }
  };

  // SAVE
  async function handleSave() {
    const payload = {
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
    };

    await onSave(payload);
    onClose();
  }

  return (
    <div className="max-h-[80vh] overflow-y-auto px-1">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Lifestyle Profile</h2>
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-stone-100"
        >
          <X />
        </button>
      </div>

      <div className="space-y-4">
        {/* WORK SETUP */}
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

        {/* DIET */}
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

        {/* FITNESS */}
        <div>
          <label className="text-xs text-stone-600">Fitness Habits</label>
          <div className="flex flex-wrap gap-2 mt-2">
            {["gym", "running", "cycling", "yoga", "sports", "walking"].map(
              (item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggle(item, setFitness, fitness)}
                  className={`px-3 py-1 rounded-full text-xs border ${
                    fitness.includes(item)
                      ? "bg-amber-600 text-white border-amber-600"
                      : "bg-white text-stone-600 border-stone-300"
                  }`}
                >
                  {item}
                </button>
              )
            )}
          </div>
        </div>

        {/* TRAVEL */}
        <div>
          <label className="text-xs text-stone-600">Travel Frequency</label>
          <select
            value={travel}
            onChange={(e) => setTravel(e.target.value)}
            className="w-full p-3 bg-stone-50 rounded-xl"
          >
            <option value="rarely">Rarely</option>
            <option value="occasional">Occasionally</option>
            <option value="frequent">Frequently</option>
            <option value="monthly">Every Month</option>
          </select>
        </div>

        {/* CLIMATE */}
        <div>
          <label className="text-xs text-stone-600">Local Climate</label>
          <select
            value={climate}
            onChange={(e) => setClimate(e.target.value)}
            className="w-full p-3 bg-stone-50 rounded-xl"
          >
            <option value="hot">Hot</option>
            <option value="cold">Cold</option>
            <option value="humid">Humid</option>
            <option value="dry">Dry</option>
            <option value="mixed">Mixed/Seasonal</option>
          </select>
        </div>

        {/* SLEEP */}
        <div>
          <label className="text-xs text-stone-600">Sleep Quality</label>
          <select
            value={sleep}
            onChange={(e) => setSleep(e.target.value)}
            className="w-full p-3 bg-stone-50 rounded-xl"
          >
            <option value="poor">Poor</option>
            <option value="average">Average</option>
            <option value="good">Good</option>
          </select>
        </div>

        {/* STRESS */}
        <div>
          <label className="text-xs text-stone-600">Stress Level</label>
          <select
            value={stress}
            onChange={(e) => setStress(e.target.value)}
            className="w-full p-3 bg-stone-50 rounded-xl"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        {/* DAILY HABITS */}
        <div>
          <label className="text-xs text-stone-600">Daily Habits</label>
          <div className="flex flex-wrap gap-2 mt-2">
            {[
              "reading",
              "meditation",
              "gaming",
              "scrolling",
              "cooking",
              "journaling",
            ].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => toggle(item, setHabits, habits)}
                className={`px-3 py-1 rounded-full text-xs border ${
                  habits.includes(item)
                    ? "bg-amber-600 text-white border-amber-600"
                    : "bg-white text-stone-600 border-stone-300"
                }`}
              >
                {item}
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

        <button
          onClick={handleSave}
          className="w-full py-3 rounded-full bg-amber-600 text-white mt-2"
        >
          Save Lifestyle Profile
        </button>
      </div>
    </div>
  );
}
