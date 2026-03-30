"use client";

import React, { useState, useRef } from "react";
import { X, UploadCloud, Camera, Loader2 } from "lucide-react";
import { compressImage } from "@/utils/compressImage";
import CameraCapture from "../../analysis/CameraInput";

export default function SkinFlow({
  onClose,
  onSave,
  userEmail,
}: {
  onClose: () => void;
  onSave: (payload: any) => Promise<void>;
  userEmail: string | null;
}) {
  // ---------------------------
  // IMAGE STATE
  // ---------------------------
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  type Status = "queued" | "processing" | "analyzing" | "done" | "error";

  const [statuses, setStatuses] = useState<Status[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [openCamera, setOpenCamera] = useState(false);
  const filePicker = useRef<HTMLInputElement | null>(null);
  const [isProcessingAll, setIsProcessingAll] = useState(false);

  // ---------------------------
  // PERSONA FIELDS
  // ---------------------------
  const [skinType, setSkinType] = useState("normal");
  const [concerns, setConcerns] = useState<string[]>([]);
  const [sensitivity, setSensitivity] = useState("normal");
  const [fitzpatrick, setFitzpatrick] = useState("IV");
  const [climate, setClimate] = useState("mixed");
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [brands, setBrands] = useState("");
  const [budget, setBudget] = useState("medium");
  const [notes, setNotes] = useState("");

  // ---------------------------
  // FILE ADDING
  // ---------------------------
  function addFiles(newFiles: File[]) {
    setFiles((p) => [...p, ...newFiles]);
    setPreviews((p) => [...p, ...newFiles.map((f) => URL.createObjectURL(f))]);
    setStatuses((p) => [...p, ...newFiles.map(() => "queued" as Status)]);
    setResults((p) => [...p, ...newFiles.map(() => ({}))]);
  }

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const arr = Array.from(e.target.files || []);
    if (arr.length) addFiles(arr);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const arr = Array.from(e.dataTransfer.files || []);
    if (arr.length) addFiles(arr);
  }

  function handleCapture(file: File) {
    addFiles([file]);
    setOpenCamera(false);
  }

  // ---------------------------
  // UPDATE STATUS / RESULT
  // ---------------------------
  function updateStatus(i: number, status: any) {
    setStatuses((prev) => {
      const copy = [...prev];
      copy[i] = status;
      return copy;
    });
  }

  function updateResult(i: number, result: any) {
    setResults((prev) => {
      const copy = [...prev];
      copy[i] = result;
      return copy;
    });
  }

  // ---------------------------
  // ANALYZE ALL
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
        form.append("type", "skin");

        const res = await fetch("/api/persona/analyze-image", {
          method: "POST",
          body: form,
        });

        const json = await res.json();
        if (!json?.persona) throw new Error("Invalid response");

        updateStatus(i, "done");

        updateResult(i, {
          summary: json.persona.summary,
          skinType: json.persona.skinType,
          concerns: json.persona.concerns,
          sensitivity: json.persona.sensitivity,
          fitzpatrickType: json.persona.fitzpatrickType,
          climateContext: json.persona.climateContext,
          fileUrl: json.persona.photoUrls?.[0] || null,
        });

        if (i === 0) {
          if (json.persona.skinType) setSkinType(json.persona.skinType);
          if (json.persona.concerns) setConcerns(json.persona.concerns);
          if (json.persona.sensitivity)
            setSensitivity(json.persona.sensitivity);
          if (json.persona.fitzpatrickType)
            setFitzpatrick(json.persona.fitzpatrickType);
          if (json.persona.climateContext)
            setClimate(json.persona.climateContext);
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
  // SAVE TO DB
  // ---------------------------
  async function handleSave() {
    const payload = {
      skin: {
        photoUrls: results.map((r) => r.fileUrl).filter(Boolean),
        skinType,
        concerns,
        sensitivity,
        fitzpatrickType: fitzpatrick,
        climateContext: climate,
        ingredientPreferences: ingredients,
        brandPreferences: brands
          .split(",")
          .map((b) => b.trim())
          .filter(Boolean),
        productBudget: budget,
        notes,
        analysisSummaries: results.map((r) => r.summary).filter(Boolean),
        updatedAt: new Date().toISOString(),
      },
    };

    await onSave(payload);
    onClose();
  }

  // ---------------------------
  // UI START
  // ---------------------------
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
            <h2 className="text-lg font-semibold font-heading text-brand-charcoal">Skin Analysis</h2>
            <button
              onClick={onClose}
              className="h-8 w-8 flex items-center justify-center rounded-xl border border-brand-sand/40 text-brand-stone hover:bg-brand-parchment transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* UPLOAD */}
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => filePicker.current?.click()}
              className="flex-1 rounded-xl border border-dashed border-brand-sand p-4 bg-brand-parchment/40 text-brand-stone hover:bg-brand-parchment transition-colors text-center text-sm"
            >
              <UploadCloud className="h-5 w-5 mx-auto mb-1" />
              Upload Images
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
                "Analyze Images"
              )}
            </button>
          }

          {/* FORM AFTER ANALYSIS */}
          {
            <div className="mt-6 space-y-4">
              <h3 className="font-semibold font-heading text-brand-charcoal">Refine Your Skin Profile</h3>

              {/* SKIN TYPE */}
              <div>
                <label className="text-xs text-brand-stone/60">Skin Type</label>
                <select
                  value={skinType}
                  onChange={(e) => setSkinType(e.target.value)}
                  className="w-full p-3 bg-brand-parchment/50 border border-brand-sand/50 rounded-xl text-sm text-brand-charcoal focus:outline-none"
                >
                  <option value="dry">Dry</option>
                  <option value="normal">Normal</option>
                  <option value="oily">Oily</option>
                  <option value="combination">Combination</option>
                </select>
              </div>

              {/* CONCERNS (FIXED WITH CHECKBOX PILLS) */}
              <div>
                <label className="text-xs text-brand-stone/60">Skin Concerns</label>

                <div className="flex flex-wrap gap-2 mt-1">
                  {["acne", "pigmentation", "texture", "sensitivity"].map(
                    (c) => {
                      const selected = concerns.includes(c);

                      return (
                        <label
                          key={c}
                          className={`px-3 py-1 rounded-full text-xs border cursor-pointer select-none ${
                            selected
                              ? "bg-brand-terracotta text-brand-cream border-brand-terracotta"
                              : "bg-white text-brand-stone border-brand-sand/50 hover:border-brand-sand"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() =>
                              setConcerns((prev) =>
                                prev.includes(c)
                                  ? prev.filter((x) => x !== c)
                                  : [...prev, c]
                              )
                            }
                            className="hidden"
                          />
                          {c}
                        </label>
                      );
                    }
                  )}
                </div>
              </div>

              {/* SENSITIVITY */}
              <div>
                <label className="text-xs text-brand-stone/60">Sensitivity</label>
                <select
                  value={sensitivity}
                  onChange={(e) => setSensitivity(e.target.value)}
                  className="w-full p-3 bg-brand-parchment/50 border border-brand-sand/50 rounded-xl text-sm text-brand-charcoal focus:outline-none"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                </select>
              </div>

              {/* FITZPATRICK */}
              <div>
                <label className="text-xs text-brand-stone/60">
                  Fitzpatrick Type
                </label>
                <select
                  value={fitzpatrick}
                  onChange={(e) => setFitzpatrick(e.target.value)}
                  className="w-full p-3 bg-brand-parchment/50 border border-brand-sand/50 rounded-xl text-sm text-brand-charcoal focus:outline-none"
                >
                  <option value="I">I – Very fair</option>
                  <option value="II">II – Fair</option>
                  <option value="III">III – Medium</option>
                  <option value="IV">IV – Olive/Brown</option>
                  <option value="V">V – Dark Brown</option>
                  <option value="VI">VI – Deep Dark</option>
                </select>
              </div>

              {/* CLIMATE */}
              <div>
                <label className="text-xs text-brand-stone/60">
                  Climate Context
                </label>
                <select
                  value={climate}
                  onChange={(e) => setClimate(e.target.value)}
                  className="w-full p-3 bg-brand-parchment/50 border border-brand-sand/50 rounded-xl text-sm text-brand-charcoal focus:outline-none"
                >
                  <option value="humid">Humid</option>
                  <option value="dry">Dry</option>
                  <option value="hot">Hot</option>
                  <option value="cold">Cold</option>
                  <option value="mixed">Mixed/Seasonal</option>
                </select>
              </div>

              {/* INGREDIENTS (FIXED EXACTLY LIKE LIFESTYLE/TASTE) */}
              <div>
                <label className="text-xs text-brand-stone/60">
                  Ingredient Preferences
                </label>

                <div className="flex flex-wrap gap-2 mt-1">
                  {[
                    "fragrance-free",
                    "no alcohol",
                    "minimal actives",
                    "non-comedogenic",
                    "gentle formula",
                  ].map((p) => {
                    const selected = ingredients.includes(p);

                    return (
                      <label
                        key={p}
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
                            setIngredients((prev) =>
                              prev.includes(p)
                                ? prev.filter((x) => x !== p)
                                : [...prev, p]
                            )
                          }
                          className="hidden"
                        />
                        {p}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* BRANDS */}
              <div>
                <label className="text-xs text-brand-stone/60">
                  Brand Preferences
                </label>
                <input
                  value={brands}
                  onChange={(e) => setBrands(e.target.value)}
                  className="w-full p-3 bg-brand-parchment/50 border border-brand-sand/50 rounded-xl text-sm text-brand-charcoal focus:outline-none"
                  placeholder="The Ordinary, Minimalist…"
                />
              </div>

              {/* BUDGET */}
              <div>
                <label className="text-xs text-brand-stone/60">Budget</label>
                <select
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full p-3 bg-brand-parchment/50 border border-brand-sand/50 rounded-xl text-sm text-brand-charcoal focus:outline-none"
                >
                  <option value="low">Affordable</option>
                  <option value="medium">Mid-range</option>
                  <option value="high">Premium</option>
                </select>
              </div>

              {/* NOTES */}
              <div>
                <label className="text-xs text-brand-stone/60">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-3 bg-brand-parchment/50 border border-brand-sand/50 rounded-xl text-sm text-brand-charcoal focus:outline-none"
                />
              </div>

              {/* SAVE */}
              <button
                onClick={handleSave}
                className="w-full mt-3 py-3 rounded-xl bg-brand-terracotta text-brand-cream"
              >
                Save Skin Profile
              </button>
            </div>
          }
        </div>
      </div>
    </>
  );
}
