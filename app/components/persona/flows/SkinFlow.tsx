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
  // FILE + PREVIEW STATE
  // ---------------------------
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  type Status = "queued" | "processing" | "analyzing" | "done" | "error";

  const [statuses, setStatuses] = useState<Status[]>([]);
  const [results, setResults] = useState<any[]>([]);

  const [openCamera, setOpenCamera] = useState(false);
  const filePicker = useRef<HTMLInputElement | null>(null);

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

  const [isProcessingAll, setIsProcessingAll] = useState(false);

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
  // RUN ANALYSIS FOR ALL FILES
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

        // autofill persona from FIRST result
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
  // FINAL SAVE TO DB
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

  // ---------------------------------------------------------------------
  // RENDER UI
  // ---------------------------------------------------------------------
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
            <h2 className="text-lg font-semibold">Skin Analysis</h2>
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
              Upload Images
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

          {/* FILE PREVIEW LIST */}
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
                "Analyze Images"
              )}
            </button>
          )}

          {/* PERSONA FORM */}
          {results.length > 0 && (
            <div className="mt-6 space-y-4">
              <h3 className="font-semibold">Refine Your Skin Profile</h3>

              {/* SKIN TYPE */}
              <div>
                <label className="text-xs text-stone-600">Skin Type</label>
                <select
                  value={skinType}
                  onChange={(e) => setSkinType(e.target.value)}
                  className="w-full p-3 bg-stone-50 rounded-xl"
                >
                  <option value="dry">Dry</option>
                  <option value="normal">Normal</option>
                  <option value="oily">Oily</option>
                  <option value="combination">Combination</option>
                </select>
              </div>

              {/* CONCERNS */}
              <div>
                <label className="text-xs text-stone-600">Skin Concerns</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {["acne", "pigmentation", "texture", "sensitivity"].map(
                    (c) => (
                      <button
                        key={c}
                        onClick={() =>
                          setConcerns((prev) =>
                            prev.includes(c)
                              ? prev.filter((x) => x !== c)
                              : [...prev, c]
                          )
                        }
                        className={`px-3 py-1 rounded-full text-xs border ${
                          concerns.includes(c)
                            ? "bg-amber-600 text-white border-amber-600"
                            : "bg-white text-stone-600 border-stone-300"
                        }`}
                      >
                        {c}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* SENSITIVITY */}
              <div>
                <label className="text-xs text-stone-600">Sensitivity</label>
                <select
                  value={sensitivity}
                  onChange={(e) => setSensitivity(e.target.value)}
                  className="w-full p-3 bg-stone-50 rounded-xl"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                </select>
              </div>

              {/* FITZPATRICK */}
              <div>
                <label className="text-xs text-stone-600">
                  Fitzpatrick Type
                </label>
                <select
                  value={fitzpatrick}
                  onChange={(e) => setFitzpatrick(e.target.value)}
                  className="w-full p-3 bg-stone-50 rounded-xl"
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
                <label className="text-xs text-stone-600">
                  Climate Context
                </label>
                <select
                  value={climate}
                  onChange={(e) => setClimate(e.target.value)}
                  className="w-full p-3 bg-stone-50 rounded-xl"
                >
                  <option value="humid">Humid</option>
                  <option value="dry">Dry</option>
                  <option value="hot">Hot</option>
                  <option value="cold">Cold</option>
                  <option value="mixed">Mixed/Seasonal</option>
                </select>
              </div>

              {/* INGREDIENT PREFERENCES */}
              <div>
                <label className="text-xs text-stone-600">
                  Ingredient Preferences
                </label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {[
                    "fragrance-free",
                    "no alcohol",
                    "minimal actives",
                    "non-comedogenic",
                    "gentle formula",
                  ].map((p) => (
                    <button
                      key={p}
                      onClick={() =>
                        setIngredients((prev) =>
                          prev.includes(p)
                            ? prev.filter((x) => x !== p)
                            : [...prev, p]
                        )
                      }
                      className={`px-3 py-1 rounded-full text-xs border ${
                        ingredients.includes(p)
                          ? "bg-amber-600 text-white border-amber-600"
                          : "bg-white text-stone-600 border-stone-300"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* BRAND PREFERENCES */}
              <div>
                <label className="text-xs text-stone-600">
                  Brand Preferences
                </label>
                <input
                  value={brands}
                  onChange={(e) => setBrands(e.target.value)}
                  className="w-full p-3 bg-stone-50 rounded-xl"
                  placeholder="The Ordinary, Minimalist, Cetaphil..."
                />
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

              {/* SAVE BUTTON */}
              <button
                onClick={handleSave}
                className="w-full mt-3 py-3 rounded-full bg-amber-600 text-white"
              >
                Save Skin Profile
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
