"use client";

import React, { useState, useRef } from "react";
import { X, UploadCloud, Camera, Loader2 } from "lucide-react";
import { compressImage } from "@/utils/compressImage";
import CameraCapture from "../../analysis/CameraInput";

export default function HairFlow({
  onClose,
  onSave,
  userEmail,
}: {
  onClose: () => void;
  onSave: (payload: any) => Promise<void>;
  userEmail: string | null;
}) {
  // -------------------------------------------
  // FILE + PREVIEW STATE
  // -------------------------------------------
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [openCamera, setOpenCamera] = useState(false);
  const filePicker = useRef<HTMLInputElement | null>(null);

  type Status = "queued" | "processing" | "analyzing" | "done" | "error";
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [isProcessingAll, setIsProcessingAll] = useState(false);

  // -------------------------------------------
  // PERSONA FIELDS
  // -------------------------------------------
  const [hairType, setHairType] = useState("");
  const [density, setDensity] = useState("");
  const [scalpType, setScalpType] = useState("");
  const [hairGoals, setHairGoals] = useState<string[]>([]);
  const [lifestyle, setLifestyle] = useState<string[]>([]);
  const [stylingHabits, setStylingHabits] = useState("");
  const [notes, setNotes] = useState("");

  // -------------------------------------------
  // FILE HANDLERS
  // -------------------------------------------
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

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = Array.from(e.dataTransfer.files || []);
    if (f.length) addFiles(f);
  }

  function handleCapture(file: File) {
    addFiles([file]);
    setOpenCamera(false);
  }

  function updateStatus(i: number, status: Status) {
    setStatuses((prev) => {
      const next = [...prev];
      next[i] = status;
      return next;
    });
  }

  function updateResult(i: number, r: any) {
    setResults((prev) => {
      const next = [...prev];
      next[i] = r;
      return next;
    });
  }

  // -------------------------------------------
  // ANALYZE ALL FILES
  // -------------------------------------------
  async function analyzeAll() {
    if (!files.length || !userEmail) return;

    setIsProcessingAll(true);

    for (let i = 0; i < files.length; i++) {
      try {
        updateStatus(i, "processing");

        const compressed = await compressImage(files[i]);

        updateStatus(i, "analyzing");

        const form = new FormData();
        form.append("files", compressed);
        form.append("email", userEmail);
        form.append("type", "hair");

        const res = await fetch("/api/persona/analyze-image", {
          method: "POST",
          body: form,
        });

        const json = await res.json();
        if (!json?.persona) throw new Error("Invalid response");

        updateStatus(i, "done");

        updateResult(i, {
          summary: json.persona.summary,
          hairType: json.persona.hairType,
          density: json.persona.density,
          scalpType: json.persona.scalpType,
          goals: json.persona.goals,
          lifestyle: json.persona.lifestyle,
          stylingHabits: json.persona.stylingHabits,
          fileUrl: json.persona.photoUrls?.[0] || null,
        });

        // Autofill from FIRST image
        if (i === 0) {
          if (json.persona.hairType) setHairType(json.persona.hairType);
          if (json.persona.density) setDensity(json.persona.density);
          if (json.persona.scalpType) setScalpType(json.persona.scalpType);
          if (json.persona.goals) setHairGoals(json.persona.goals);
          if (json.persona.lifestyle) setLifestyle(json.persona.lifestyle);
          if (json.persona.stylingHabits)
            setStylingHabits(json.persona.stylingHabits);
          if (json.persona.summary) setNotes(json.persona.summary);
        }
      } catch (err) {
        console.error(err);
        updateStatus(i, "error");
      }
    }

    setIsProcessingAll(false);
  }

  // -------------------------------------------
  // SAVE TO DB
  // -------------------------------------------
  async function handleSave() {
    const payload = {
      hair: {
        photoUrls: results.map((r) => r.fileUrl).filter(Boolean),
        hairType,
        density,
        scalpType,
        goals: hairGoals,
        lifestyle,
        stylingHabits,
        notes,
        analysisSummaries: results.map((r) => r.summary).filter(Boolean),
        updatedAt: new Date().toISOString(),
      },
    };

    await onSave(payload);
    onClose();
  }

  // -------------------------------------------
  // UI RENDER
  // -------------------------------------------
  return (
    <>
      {openCamera && (
        <CameraCapture
          onCapture={handleCapture}
          onClose={() => setOpenCamera(false)}
        />
      )}

      <div className="fixed inset-0 bg-brand-warm-black/20 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl w-full max-w-xl shadow-soft-xl border border-brand-sand/30 p-5 max-h-[90vh] overflow-auto">
          {/* HEADER */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold font-heading text-brand-charcoal">Hair Analysis</h2>
            <button
              onClick={onClose}
              className="h-8 w-8 flex items-center justify-center rounded-xl border border-brand-sand/40 text-brand-stone hover:bg-brand-parchment transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* UPLOAD BAR */}
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => filePicker.current?.click()}
              className="flex-1 rounded-xl border border-dashed border-brand-sand p-4 bg-brand-parchment/40 text-brand-stone hover:bg-brand-parchment transition-colors text-center text-sm"
            >
              <UploadCloud className="h-5 w-5 mx-auto mb-1" />
              Upload Hair Photos
            </button>

            <button
              onClick={() => setOpenCamera(true)}
              className="flex-1 rounded-xl border border-dashed border-brand-sand p-4 bg-brand-parchment/40 text-brand-stone hover:bg-brand-parchment transition-colors text-center text-sm"
            >
              <Camera className="h-5 w-5 mx-auto mb-1" />
              Use Camera
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

          {/* PREVIEWS */}
          {previews.map((src, i) => (
            <div key={i} className="mb-3 p-3 border border-brand-sand/50 rounded-xl bg-brand-parchment/50">
              <div className="flex gap-3">
                <img src={src} className="w-20 h-20 rounded-lg object-cover" />

                <div className="flex-1">
                  <div className="text-xs text-brand-stone/60 mb-1">
                    Status:{" "}
                    <span className="font-medium text-brand-charcoal">
                      {statuses[i]}
                    </span>
                  </div>

                  {results[i]?.summary && (
                    <div className="text-xs bg-white p-2 rounded-lg border">
                      <strong className="text-stone-700">Summary:</strong>{" "}
                      {results[i].summary}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* ANALYZE BUTTON */}
          {
            <button
              disabled={isProcessingAll}
              onClick={analyzeAll}
              className="w-full py-3 mt-2 rounded-xl bg-brand-terracotta text-brand-cream disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessingAll ? (
                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
              ) : (
                "Analyze Hair Images"
              )}
            </button>
          }

          {/* PERSONA FORM */}
          {
            <div className="mt-6 space-y-4">
              <h3 className="font-semibold font-heading text-brand-charcoal">Refine Hair Profile</h3>

              {/* HAIR TYPE */}
              <div>
                <label className="text-xs text-stone-600">Hair Type</label>
                <select
                  value={hairType}
                  onChange={(e) => setHairType(e.target.value)}
                  className="w-full p-3 bg-stone-50 rounded-xl"
                >
                  <option value="straight">Straight</option>
                  <option value="wavy">Wavy</option>
                  <option value="curly">Curly</option>
                  <option value="coily">Coily</option>
                </select>
              </div>

              {/* DENSITY */}
              <div>
                <label className="text-xs text-stone-600">Density</label>
                <select
                  value={density}
                  onChange={(e) => setDensity(e.target.value)}
                  className="w-full p-3 bg-stone-50 rounded-xl"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              {/* SCALP TYPE */}
              <div>
                <label className="text-xs text-stone-600">Scalp Type</label>
                <select
                  value={scalpType}
                  onChange={(e) => setScalpType(e.target.value)}
                  className="w-full p-3 bg-stone-50 rounded-xl"
                >
                  <option value="dry">Dry</option>
                  <option value="normal">Normal</option>
                  <option value="oily">Oily</option>
                  <option value="dandruff">Dandruff-prone</option>
                </select>
              </div>

              {/* HAIR GOALS (FIXED CHECKBOX PILLS) */}
              <div>
                <label className="text-xs text-stone-600">Hair Goals</label>

                <div className="flex flex-wrap gap-2 mt-1">
                  {["volume", "frizz-control", "growth", "shine", "repair"].map(
                    (goal) => {
                      const selected = hairGoals.includes(goal);

                      return (
                        <label
                          key={goal}
                          className={`px-3 py-1 rounded-full text-xs border cursor-pointer select-none ${
                            selected
                              ? "bg-amber-600 text-white border-amber-600"
                              : "bg-white text-stone-600 border-stone-300"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() =>
                              setHairGoals((prev) =>
                                prev.includes(goal)
                                  ? prev.filter((x) => x !== goal)
                                  : [...prev, goal]
                              )
                            }
                            className="hidden"
                          />
                          {goal}
                        </label>
                      );
                    }
                  )}
                </div>
              </div>

              {/* LIFESTYLE (FIXED CHECKBOX PILLS) */}
              <div>
                <label className="text-xs text-stone-600">
                  Lifestyle Factors
                </label>

                <div className="flex flex-wrap gap-2 mt-1">
                  {["gym sweat", "swimming", "bike helmet", "outdoor sun"].map(
                    (item) => {
                      const selected = lifestyle.includes(item);

                      return (
                        <label
                          key={item}
                          className={`px-3 py-1 rounded-full text-xs border cursor-pointer select-none ${
                            selected
                              ? "bg-amber-600 text-white border-amber-600"
                              : "bg-white text-stone-600 border-stone-300"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() =>
                              setLifestyle((prev) =>
                                prev.includes(item)
                                  ? prev.filter((x) => x !== item)
                                  : [...prev, item]
                              )
                            }
                            className="hidden"
                          />
                          {item}
                        </label>
                      );
                    }
                  )}
                </div>
              </div>

              {/* STYLING HABITS */}
              <div>
                <label className="text-xs text-stone-600">Styling Habits</label>
                <input
                  value={stylingHabits}
                  onChange={(e) => setStylingHabits(e.target.value)}
                  className="w-full p-3 bg-stone-50 rounded-xl"
                  placeholder="E.g., heat styling, wax, gel, blowdrying…"
                />
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
                className="w-full mt-3 py-3 rounded-full bg-amber-600 text-white"
              >
                Save Hair Profile
              </button>
            </div>
          }
        </div>
      </div>
    </>
  );
}
