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
  // ---------------------------
  // FILE + PREVIEW STATE
  // ---------------------------
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const [results, setResults] = useState<any[]>([]);

  const [openCamera, setOpenCamera] = useState(false);
  const filePicker = useRef<HTMLInputElement | null>(null);

  // ---------------------------
  // PERSONA FIELDS
  // ---------------------------
  const [hairType, setHairType] = useState("");
  const [density, setDensity] = useState("");
  const [scalpType, setScalpType] = useState("");
  const [hairGoals, setHairGoals] = useState<string[]>([]);
  const [lifestyle, setLifestyle] = useState<string[]>([]);
  const [stylingHabits, setStylingHabits] = useState("");

  const [notes, setNotes] = useState("");

  const [isProcessingAll, setIsProcessingAll] = useState(false);
  type Status = "queued" | "processing" | "analyzing" | "done" | "error";

  const [statuses, setStatuses] = useState<Status[]>([]);
  // ---------------------------
  // FILE HANDLING
  // ---------------------------
  function addFiles(newFiles: File[]) {
    const n = newFiles.map((f) => URL.createObjectURL(f));

    setFiles((prev) => [...prev, ...newFiles]);
    setPreviews((prev) => [...prev, ...n]);
    setStatuses((prev) => [...prev, ...newFiles.map(() => "queued" as Status)]);
    setResults((prev) => [...prev, ...newFiles.map(() => ({}))]);
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

  function handleCapture(f: File) {
    addFiles([f]);
    setOpenCamera(false);
  }

  function updateStatus(i: number, s: any) {
    setStatuses((prev) => {
      const copy = [...prev];
      copy[i] = s;
      return copy;
    });
  }

  function updateResult(i: number, r: any) {
    setResults((prev) => {
      const copy = [...prev];
      copy[i] = r;
      return copy;
    });
  }

  // ---------------------------
  // RUN ANALYSIS FOR ALL IMAGES
  // ---------------------------
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
        if (!json?.persona) throw new Error("Invalid AI response");

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

        // Autofill persona fields from FIRST analysis
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

  // ---------------------------
  // SAVE TO PERSONA DB
  // ---------------------------
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

  // ---------------------------
  // UI RENDER
  // ---------------------------
  return (
    <>
      {openCamera && (
        <CameraCapture
          onCapture={handleCapture}
          onClose={() => setOpenCamera(false)}
        />
      )}

      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl w-full max-w-xl shadow-xl p-5 max-h-[90vh] overflow-auto">
          {/* HEADER */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Hair Analysis</h2>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-stone-100"
            >
              <X />
            </button>
          </div>

          {/* UPLOAD BAR */}
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => filePicker.current?.click()}
              className="flex-1 rounded-xl border border-dashed p-4 text-center text-sm bg-stone-50"
            >
              <UploadCloud className="h-5 w-5 mx-auto mb-1" />
              Upload Hair Photos
            </button>

            <button
              onClick={() => setOpenCamera(true)}
              className="flex-1 rounded-xl border border-dashed p-4 text-center text-sm bg-stone-50"
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

          {/* PREVIEW LIST */}
          {previews.map((src, i) => (
            <div key={i} className="mb-3 p-3 border rounded-xl bg-stone-50">
              <div className="flex gap-3">
                <img src={src} className="w-20 h-20 rounded-lg object-cover" />

                <div className="flex-1">
                  <div className="text-xs text-stone-500 mb-1">
                    Status:{" "}
                    <span className="font-medium text-stone-800">
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
          {files.length > 0 && (
            <button
              disabled={isProcessingAll}
              onClick={analyzeAll}
              className="w-full py-3 mt-2 rounded-full bg-amber-600 text-white disabled:opacity-50"
            >
              {isProcessingAll ? (
                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
              ) : (
                "Analyze Hair Images"
              )}
            </button>
          )}

          {/* PERSONA FORM */}
          {results.length > 0 && (
            <div className="mt-6 space-y-4">
              <h3 className="font-semibold">Refine Hair Profile</h3>

              {/* Hair Type */}
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

              {/* Density */}
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

              {/* Scalp Type */}
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

              {/* Hair Goals */}
              <div>
                <label className="text-xs text-stone-600">Hair Goals</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {["volume", "frizz-control", "growth", "shine", "repair"].map(
                    (g) => (
                      <button
                        type="button"
                        key={g}
                        onClick={() =>
                          setHairGoals((prev) =>
                            prev.includes(g)
                              ? prev.filter((x) => x !== g)
                              : [...prev, g]
                          )
                        }
                        className={`px-3 py-1 rounded-full text-xs border ${
                          hairGoals.includes(g)
                            ? "bg-amber-600 text-white border-amber-600"
                            : "bg-white text-stone-600 border-stone-300"
                        }`}
                      >
                        {g}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Lifestyle Factors */}
              <div>
                <label className="text-xs text-stone-600">
                  Lifestyle Factors
                </label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {["gym sweat", "swimming", "bike helmet", "outdoor sun"].map(
                    (l) => (
                      <button
                        type="button"
                        key={l}
                        onClick={() =>
                          setLifestyle((prev) =>
                            prev.includes(l)
                              ? prev.filter((x) => x !== l)
                              : [...prev, l]
                          )
                        }
                        className={`px-3 py-1 rounded-full text-xs border ${
                          lifestyle.includes(l)
                            ? "bg-amber-600 text-white border-amber-600"
                            : "bg-white text-stone-600 border-stone-300"
                        }`}
                      >
                        {l}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Styling Habits */}
              <div>
                <label className="text-xs text-stone-600">Styling Habits</label>
                <input
                  value={stylingHabits}
                  onChange={(e) => setStylingHabits(e.target.value)}
                  className="w-full p-3 bg-stone-50 rounded-xl"
                  placeholder="E.g., blowdrying, heat styling, wax, gel..."
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
          )}
        </div>
      </div>
    </>
  );
}
