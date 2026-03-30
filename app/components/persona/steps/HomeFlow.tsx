"use client";

import React, { useState, useRef } from "react";
import { X, UploadCloud, Camera, Loader2 } from "lucide-react";
import CameraCapture from "../../analysis/CameraInput";
import { compressImage } from "@/utils/compressImage";

/* -----------------------------
   TYPES
----------------------------- */
type Status = "queued" | "processing" | "analyzing" | "done" | "error";

/* -----------------------------
   VISUAL PRESETS (FAST PATH)
----------------------------- */
const HOME_PRESETS = [
  {
    id: "modern-minimal",
    label: "Modern Minimal",
    emoji: "🧘",
    values: {
      aesthetic: ["modern", "minimal"],
      materials: ["wood", "glass"],
      colors: ["white", "beige"],
      decorElements: ["minimal furniture"],
      lightingStyle: "neutral",
      budget: "medium",
    },
  },
  {
    id: "warm-cozy",
    label: "Warm & Cozy",
    emoji: "🕯️",
    values: {
      aesthetic: ["rustic", "boho"],
      materials: ["wood", "cotton"],
      colors: ["earthy", "beige"],
      decorElements: ["plants", "rugs"],
      lightingStyle: "warm",
      budget: "medium",
    },
  },
  {
    id: "industrial",
    label: "Industrial",
    emoji: "🏗️",
    values: {
      aesthetic: ["industrial"],
      materials: ["metal", "wood"],
      colors: ["black", "grey"],
      decorElements: ["artwork"],
      lightingStyle: "cool",
      budget: "medium",
    },
  },
  {
    id: "luxury",
    label: "Luxury",
    emoji: "💎",
    values: {
      aesthetic: ["luxury"],
      materials: ["leather", "glass", "stone"],
      colors: ["black", "white"],
      decorElements: ["accent lighting", "artwork"],
      lightingStyle: "warm",
      budget: "high",
    },
  },
];

/* -----------------------------
   COMPONENT
----------------------------- */
export default function HomeFlow({
  onClose,
  onSave,
  userEmail,
  existingPersona,
}: {
  onClose: () => void;
  onSave: (payload: any) => Promise<void>;
  userEmail: string | null;
  existingPersona?: any;
}) {
  /* -----------------------------
     PERSONA STATE
  ----------------------------- */
  const [aesthetic, setAesthetic] = useState<string[]>(
    existingPersona?.aesthetic || []
  );
  const [materials, setMaterials] = useState<string[]>(
    existingPersona?.materials || []
  );
  const [colors, setColors] = useState<string[]>(existingPersona?.colors || []);
  const [decorElements, setDecorElements] = useState<string[]>(
    existingPersona?.decorElements || []
  );
  const [lightingStyle, setLightingStyle] = useState(
    existingPersona?.lightingStyle || "warm"
  );
  const [budget, setBudget] = useState(existingPersona?.budget || "medium");
  const [notes, setNotes] = useState(existingPersona?.notes || "");

  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  /* -----------------------------
     IMAGE STATE (ADVANCED)
  ----------------------------- */
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [isProcessingAll, setIsProcessingAll] = useState(false);

  const filePicker = useRef<HTMLInputElement | null>(null);
  const [openCamera, setOpenCamera] = useState(false);

  /* -----------------------------
     HELPERS
  ----------------------------- */
  const toggle = (value: string, setter: any) => {
    setter((prev: string[]) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const setStatusAt = (i: number, status: Status) => {
    setStatuses((prev) => {
      const next = [...prev];
      next[i] = status;
      return next;
    });
  };

  function applyPreset(preset: any) {
    setSelectedPreset(preset.id);
    setAesthetic(preset.values.aesthetic);
    setMaterials(preset.values.materials);
    setColors(preset.values.colors);
    setDecorElements(preset.values.decorElements);
    setLightingStyle(preset.values.lightingStyle);
    setBudget(preset.values.budget);
  }

  /* -----------------------------
     FILE HANDLERS
  ----------------------------- */
  function addFiles(newFiles: File[]) {
    setFiles((p) => [...p, ...newFiles]);
    setPreviews((p) => [...p, ...newFiles.map((f) => URL.createObjectURL(f))]);
    setStatuses((p) => [...p, ...newFiles.map(() => "queued" as Status)]);
    setResults((p) => [...p, ...newFiles.map(() => ({}))]);
  }

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = Array.from(e.target.files || []);
    if (f.length) addFiles(f);
  }

  function handleCapture(file: File) {
    addFiles([file]);
    setOpenCamera(false);
  }

  /* -----------------------------
     ANALYZE IMAGES (ADVANCED)
  ----------------------------- */
  async function analyzeAll() {
    if (!files.length || !userEmail) return;
    setIsProcessingAll(true);

    for (let i = 0; i < files.length; i++) {
      try {
        setStatusAt(i, "processing");

        const compressed = await compressImage(files[i]);

        setStatusAt(i, "analyzing");

        const form = new FormData();
        form.append("files", compressed);
        form.append("email", userEmail);
        form.append("type", "home");

        const res = await fetch("/api/persona/analyze-image", {
          method: "POST",
          body: form,
        });

        const json = await res.json();
        if (!json?.persona) throw new Error("Invalid response");

        setStatusAt(i, "done");

        setResults((r) => {
          const next = [...r];
          next[i] = json.persona;
          return next;
        });

        if (i === 0) {
          json.persona.aesthetic && setAesthetic(json.persona.aesthetic);
          json.persona.materials && setMaterials(json.persona.materials);
          json.persona.colors && setColors(json.persona.colors);
          json.persona.decorElements &&
            setDecorElements(json.persona.decorElements);
          json.persona.lightingStyle &&
            setLightingStyle(json.persona.lightingStyle);
          json.persona.summary && setNotes(json.persona.summary);
        }
      } catch {
        setStatusAt(i, "error");
      }
    }

    setIsProcessingAll(false);
  }

  /* -----------------------------
     SAVE
  ----------------------------- */
  async function handleSave() {
    await onSave({
      home: {
        photoUrls: [
          ...(existingPersona?.photoUrls || []),
          ...results.map((r) => r?.photoUrls?.[0]).filter(Boolean),
        ],
        aesthetic,
        materials,
        colors,
        decorElements,
        lightingStyle,
        budget,
        notes,
        analysisSummaries: [
          ...(existingPersona?.analysisSummaries || []),
          ...results.map((r) => r?.summary).filter(Boolean),
        ],
        updatedAt: new Date().toISOString(),
      },
    });

    onClose();
  }

  /* -----------------------------
     UI
  ----------------------------- */
  return (
    <>
      {openCamera && (
        <CameraCapture
          onCapture={handleCapture}
          onClose={() => setOpenCamera(false)}
        />
      )}

      <div className="fixed inset-0 bg-brand-warm-black/20 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
        <div className="bg-white w-full max-w-xl rounded-3xl shadow-soft-xl border border-brand-sand/30 p-5 max-h-[90vh] overflow-auto custom-scrollbar">
          {/* HEADER */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-heading font-semibold text-brand-charcoal">Home Profile</h2>
            <button
              onClick={onClose}
              className="h-8 w-8 flex items-center justify-center rounded-xl border border-brand-sand/40 text-brand-stone hover:bg-brand-parchment transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* PRESETS */}
          <p className="text-sm text-brand-stone mb-3">
            Pick the closest match to your home
          </p>

          <div className="grid grid-cols-2 gap-3">
            {HOME_PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => applyPreset(p)}
                className={`rounded-2xl border p-4 text-left transition ${
                  selectedPreset === p.id
                    ? "border-brand-terracotta ring-2 ring-brand-terracotta/30"
                    : "border-brand-sand/50 hover:border-brand-sand"
                }`}
              >
                <div className="text-2xl mb-1">{p.emoji}</div>
                <div className="text-sm font-medium text-brand-charcoal">{p.label}</div>
              </button>
            ))}
          </div>

          {/* ADVANCED */}
          <button
            onClick={() => setAdvancedOpen((v) => !v)}
            className="mt-5 text-xs text-brand-stone/60 underline"
          >
            Refine & analyze photos
          </button>

          {advancedOpen && (
            <div className="mt-5">
              <div className="flex gap-3">
                <button
                  onClick={() => filePicker.current?.click()}
                  className="flex-1 rounded-xl border border-dashed border-brand-sand p-4 text-center bg-brand-parchment/40 text-brand-stone hover:bg-brand-parchment transition-colors"
                >
                  <UploadCloud className="mx-auto mb-1 h-5 w-5" />
                  <span className="text-sm">Upload Photos</span>
                </button>

                <button
                  onClick={() => setOpenCamera(true)}
                  className="flex-1 rounded-xl border border-dashed border-brand-sand p-4 text-center bg-brand-parchment/40 text-brand-stone hover:bg-brand-parchment transition-colors"
                >
                  <Camera className="mx-auto mb-1 h-5 w-5" />
                  <span className="text-sm">Camera</span>
                </button>

                <input
                  ref={filePicker}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleSelect}
                />
              </div>

              {files.length > 0 && (
                <button
                  onClick={analyzeAll}
                  disabled={isProcessingAll}
                  className="w-full mt-3 py-3 rounded-xl bg-brand-charcoal text-brand-cream text-sm font-medium hover:bg-brand-warm-black transition-colors disabled:opacity-40"
                >
                  {isProcessingAll ? (
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  ) : (
                    "Analyze Home Images"
                  )}
                </button>
              )}
            </div>
          )}

          {/* SAVE */}
          <button
            onClick={handleSave}
            className="w-full mt-6 py-3 rounded-xl bg-brand-charcoal text-brand-cream text-sm font-medium hover:bg-brand-warm-black transition-colors"
          >
            Save Home Profile
          </button>
        </div>
      </div>
    </>
  );
}
