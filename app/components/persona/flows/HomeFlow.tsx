"use client";

import React, { useState, useRef } from "react";
import { X, UploadCloud, Camera, Loader2 } from "lucide-react";
import CameraCapture from "../../analysis/CameraInput";
import { compressImage } from "@/utils/compressImage";

export default function HomeFlow({
  onClose,
  onSave,
  userEmail,
  existingPersona,
}: {
  onClose: () => void;
  onSave: (payload: any) => Promise<void>;
  userEmail: string | null;
  existingPersona?: any; // pass existing persona to append photos + summaries
}) {
  // -------------------------------
  // FILE + PREVIEW STATE
  // -------------------------------
  type Status = "queued" | "processing" | "analyzing" | "done" | "error";

  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [isProcessingAll, setIsProcessingAll] = useState(false);

  const filePicker = useRef<HTMLInputElement | null>(null);
  const [openCamera, setOpenCamera] = useState(false);

  // -------------------------------
  // PERSONA FIELDS
  // -------------------------------
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

  // -------------------------------
  // UTIL — MULTI SELECT TOGGLE
  // -------------------------------
  const toggle = (value: string, setter: any) => {
    setter((prev: string[]) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  // -------------------------------
  // FILE HANDLERS
  // -------------------------------
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

  function updateStatus(i: number, status: any) {
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

  // -------------------------------
  // ANALYZE ALL IMAGES
  // -------------------------------
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
        form.append("type", "home");

        const res = await fetch("/api/persona/analyze-image", {
          method: "POST",
          body: form,
        });

        const json = await res.json();
        if (!json?.persona) throw new Error("Invalid response");

        updateStatus(i, "done");
        updateResult(i, json.persona);

        // Autofill from FIRST image
        if (i === 0) {
          if (json.persona.aesthetic) setAesthetic(json.persona.aesthetic);
          if (json.persona.materials) setMaterials(json.persona.materials);
          if (json.persona.colors) setColors(json.persona.colors);
          if (json.persona.decorElements)
            setDecorElements(json.persona.decorElements);
          if (json.persona.lightingStyle)
            setLightingStyle(json.persona.lightingStyle);
          if (json.persona.notes) setNotes(json.persona.notes);
        }
      } catch (err) {
        console.error(err);
        updateStatus(i, "error");
      }
    }

    setIsProcessingAll(false);
  }

  // -------------------------------
  // SAVE (APPENDS IMAGES + RESULTS)
  // -------------------------------
  async function handleSave() {
    const payload = {
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
    };

    await onSave(payload);
    onClose();
  }

  // -------------------------------
  // UI
  // -------------------------------
  return (
    <>
      {openCamera && (
        <CameraCapture
          onCapture={handleCapture}
          onClose={() => setOpenCamera(false)}
        />
      )}

      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[200] flex justify-center items-center p-4">
        <div className="bg-white w-full max-w-xl rounded-3xl shadow-xl p-5 max-h-[92vh] overflow-auto">
          {/* HEADER */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Home Decor Profile</h2>
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
              className="flex-1 rounded-xl border border-dashed p-4 text-center bg-stone-50 text-sm"
            >
              <UploadCloud className="h-5 w-5 mx-auto mb-1" />
              Upload Home Photos
            </button>

            <button
              onClick={() => setOpenCamera(true)}
              className="flex-1 rounded-xl border border-dashed p-4 text-center bg-stone-50 text-sm"
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
            <div key={i} className="mb-3 p-3 rounded-xl border bg-stone-50">
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
                    <div className="text-xs p-2 rounded-lg bg-white border">
                      <strong>Summary:</strong> {results[i].summary}
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
              className="w-full py-3 rounded-full bg-amber-600 text-white mt-2 disabled:opacity-50"
            >
              {isProcessingAll ? (
                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
              ) : (
                "Analyze Home Images"
              )}
            </button>
          }

          {/* PERSONA FIELDS */}
          {
            <div className="mt-6 space-y-5">
              {/* AESTHETIC */}
              <div>
                <label className="text-xs text-stone-600">Interior Style</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {[
                    "minimal",
                    "modern",
                    "industrial",
                    "rustic",
                    "boho",
                    "luxury",
                    "scandinavian",
                  ].map((item) => {
                    const selected = aesthetic.includes(item);
                    return (
                      <label
                        key={item}
                        className={`px-3 py-1 rounded-full text-xs border cursor-pointer ${
                          selected
                            ? "bg-amber-600 text-white border-amber-600"
                            : "bg-white text-stone-600 border-stone-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={selected}
                          onChange={() => toggle(item, setAesthetic)}
                        />
                        {item}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* MATERIALS */}
              <div>
                <label className="text-xs text-stone-600">Materials</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {["wood", "metal", "glass", "stone", "cotton", "leather"].map(
                    (item) => {
                      const selected = materials.includes(item);
                      return (
                        <label
                          key={item}
                          className={`px-3 py-1 rounded-full text-xs border cursor-pointer ${
                            selected
                              ? "bg-amber-600 text-white border-amber-600"
                              : "bg-white text-stone-600 border-stone-300"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={selected}
                            onChange={() => toggle(item, setMaterials)}
                          />
                          {item}
                        </label>
                      );
                    }
                  )}
                </div>
              </div>

              {/* COLORS */}
              <div>
                <label className="text-xs text-stone-600">Color Palette</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {["white", "black", "beige", "earthy", "pastel", "bold"].map(
                    (item) => {
                      const selected = colors.includes(item);
                      return (
                        <label
                          key={item}
                          className={`px-3 py-1 rounded-full text-xs border cursor-pointer ${
                            selected
                              ? "bg-amber-600 text-white border-amber-600"
                              : "bg-white text-stone-600 border-stone-300"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={selected}
                            onChange={() => toggle(item, setColors)}
                          />
                          {item}
                        </label>
                      );
                    }
                  )}
                </div>
              </div>

              {/* DECOR ELEMENTS */}
              <div>
                <label className="text-xs text-stone-600">Decor Elements</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {[
                    "plants",
                    "artwork",
                    "minimal furniture",
                    "bookshelf",
                    "rugs",
                    "accent lighting",
                  ].map((item) => {
                    const selected = decorElements.includes(item);
                    return (
                      <label
                        key={item}
                        className={`px-3 py-1 rounded-full text-xs border cursor-pointer ${
                          selected
                            ? "bg-amber-600 text-white border-amber-600"
                            : "bg-white text-stone-600 border-stone-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={selected}
                          onChange={() => toggle(item, setDecorElements)}
                        />
                        {item}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* LIGHTING STYLE */}
              <div>
                <label className="text-xs text-stone-600">Lighting Style</label>
                <select
                  value={lightingStyle}
                  onChange={(e) => setLightingStyle(e.target.value)}
                  className="w-full p-3 rounded-xl bg-stone-50"
                >
                  <option value="warm">Warm</option>
                  <option value="neutral">Neutral</option>
                  <option value="cool">Cool</option>
                </select>
              </div>

              {/* BUDGET */}
              <div>
                <label className="text-xs text-stone-600">Budget</label>
                <select
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full p-3 rounded-xl bg-stone-50"
                >
                  <option value="low">Affordable</option>
                  <option value="medium">Mid-range</option>
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
                className="w-full mt-3 py-3 rounded-full bg-amber-600 text-white"
              >
                Save Home Profile
              </button>
            </div>
          }
        </div>
      </div>
    </>
  );
}
