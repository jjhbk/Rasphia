"use client";

import React, { useState, useRef } from "react";
import { X, UploadCloud, Camera, Loader2 } from "lucide-react";
import { compressImage } from "@/utils/compressImage";
import CameraCapture from "../../analysis/CameraInput";

type Step = "upload" | "analyzing" | "confirm";

export default function SkinFlow({
  onClose,
  onSave,
  userEmail,
}: {
  onClose: () => void;
  onSave: (payload: any) => Promise<void>;
  userEmail: string | null;
}) {
  // -----------------------------
  // Wizard step
  // -----------------------------
  const [step, setStep] = useState<Step>("upload");

  // -----------------------------
  // Image + analysis
  // -----------------------------
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);

  const filePicker = useRef<HTMLInputElement | null>(null);
  const [openCamera, setOpenCamera] = useState(false);

  // -----------------------------
  // AI-derived skin persona
  // -----------------------------
  const [skinType, setSkinType] = useState("normal");
  const [issues, setIssues] = useState<string[]>([]);
  const [confidence, setConfidence] = useState<number>(0);

  // -----------------------------
  // Advanced (optional)
  // -----------------------------
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [ingredientPrefs, setIngredientPrefs] = useState<string[]>([]);
  const [budget, setBudget] = useState("medium");
  const [notes, setNotes] = useState("");

  // -----------------------------
  // Upload handlers
  // -----------------------------
  function addFile(f: File) {
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) addFile(f);
  }

  function handleCapture(f: File) {
    addFile(f);
    setOpenCamera(false);
  }

  // -----------------------------
  // Analyze
  // -----------------------------
  async function analyze() {
    if (!file || !userEmail) return;

    setStep("analyzing");

    try {
      const compressed = await compressImage(file);

      const form = new FormData();
      form.append("files", compressed);
      form.append("email", userEmail);
      form.append("type", "skin");

      const res = await fetch("/api/persona/analyze-image", {
        method: "POST",
        body: form,
      });

      const json = await res.json();
      if (!json?.persona) throw new Error("Invalid analysis");

      setAnalysis(json.persona);

      // Autofill from AI
      setSkinType(json.persona.skinTypeGuess ?? "normal");
      setIssues(json.persona.issuesObserved ?? []);
      setConfidence(json.persona.confidence ?? 0);

      setNotes(json.persona.summary ?? "");

      setStep("confirm");
    } catch (e) {
      console.error(e);
      setStep("upload");
    }
  }

  // -----------------------------
  // Confirm + autosave
  // -----------------------------
  async function handleConfirm() {
    await onSave({
      skin: {
        skinType,
        issuesObserved: issues,
        confidence,
        ingredientPreferences: ingredientPrefs,
        productBudget: budget,
        notes,
        photoUrls: analysis?.photoUrls ?? [],
        analysisSummaries: analysis?.summary ? [analysis.summary] : [],
        updatedAt: new Date().toISOString(),
      },
    });

    onClose();
  }

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <>
      {openCamera && (
        <CameraCapture
          onCapture={handleCapture}
          onClose={() => setOpenCamera(false)}
        />
      )}

      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl w-full max-w-md shadow-xl p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Skin Profile</h2>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-stone-100"
            >
              <X />
            </button>
          </div>

          {/* STEP 1 — Upload */}
          {step === "upload" && (
            <div className="text-center">
              <p className="text-sm text-stone-600 mb-4">
                Take a clear photo in natural light. No filters.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => filePicker.current?.click()}
                  className="flex-1 rounded-xl border border-dashed p-4 bg-stone-50"
                >
                  <UploadCloud className="mx-auto mb-1" />
                  Upload
                </button>

                <button
                  onClick={() => setOpenCamera(true)}
                  className="flex-1 rounded-xl border border-dashed p-4 bg-stone-50"
                >
                  <Camera className="mx-auto mb-1" />
                  Camera
                </button>
              </div>

              <input
                ref={filePicker}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleSelect}
              />

              {preview && (
                <div className="mt-4 flex justify-center">
                  <img
                    src={preview}
                    alt="Skin preview"
                    className="h-40 w-40 object-cover rounded-xl border"
                  />
                </div>
              )}

              <button
                disabled={!file}
                onClick={analyze}
                className="mt-6 w-full py-3 rounded-full bg-amber-600 text-white disabled:opacity-40"
              >
                Analyze skin
              </button>
            </div>
          )}

          {/* STEP 2 — Analyzing */}
          {step === "analyzing" && (
            <div className="py-16 text-center">
              <Loader2 className="h-10 w-10 animate-spin mx-auto text-amber-600" />
              <p className="mt-4 text-sm text-stone-600">
                Understanding texture, oil balance & concerns…
              </p>
            </div>
          )}

          {/* STEP 3 — Confirm */}
          {step === "confirm" && (
            <>
              <p className="text-sm text-stone-600 mb-4">
                Does this look right?
              </p>

              <div className="space-y-2 text-sm">
                <div>
                  <strong>Skin type:</strong> {analysis?.skinTypeGuess || "—"}
                </div>

                {analysis?.issuesObserved?.length > 0 && (
                  <div>
                    <strong>Visible concerns:</strong>{" "}
                    {analysis.issuesObserved.join(", ")}
                  </div>
                )}

                {analysis?.severity && (
                  <div>
                    <strong>Severity:</strong>{" "}
                    {[
                      analysis.severity.oiliness,
                      analysis.severity.dryness,
                      analysis.severity.redness,
                    ]
                      .filter(Boolean)
                      .join(" • ")}
                  </div>
                )}

                {analysis?.productImplications?.length > 0 && (
                  <div>
                    <strong>Product implications:</strong>{" "}
                    {analysis.productImplications.join(", ")}
                  </div>
                )}

                <div className="text-xs text-stone-500">
                  Confidence: {(analysis?.confidence * 100).toFixed(0)}%
                </div>
              </div>

              <button
                onClick={handleConfirm}
                className="mt-6 w-full py-3 rounded-full bg-amber-600 text-white"
              >
                ✅ Looks good — continue
              </button>

              <button
                onClick={() => setAdvancedOpen((v) => !v)}
                className="mt-3 text-xs text-stone-500 underline"
              >
                Customize preferences (optional)
              </button>

              {advancedOpen && (
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="text-xs text-stone-600">
                      Ingredient preferences
                    </label>
                    <input
                      value={ingredientPrefs.join(", ")}
                      onChange={(e) =>
                        setIngredientPrefs(
                          e.target.value
                            .split(",")
                            .map((x) => x.trim())
                            .filter(Boolean)
                        )
                      }
                      className="w-full p-3 bg-stone-50 rounded-xl"
                      placeholder="fragrance-free, gentle…"
                    />
                  </div>

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
            </>
          )}
        </div>
      </div>
    </>
  );
}
