"use client";

import React, { useState, useRef } from "react";
import { X, UploadCloud, Camera, Loader2 } from "lucide-react";
import CameraCapture from "../../analysis/CameraInput";
import { compressImage } from "@/utils/compressImage";

type Step = "upload" | "analyzing" | "confirm";

export default function BodyFlow({
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
  // Files + analysis
  // -----------------------------
  const [files, setFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);

  const filePicker = useRef<HTMLInputElement | null>(null);
  const [openCamera, setOpenCamera] = useState(false);

  // -----------------------------
  // Persona (AI-first)
  // -----------------------------
  const [bodyType, setBodyType] = useState("balanced");
  const [proportions, setProportions] = useState<string[]>([]);
  const [fitPreferences, setFitPreferences] = useState<string[]>([]);
  const [activities, setActivities] = useState<string[]>([]);

  // Advanced (optional)
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [heightCm, setHeightCm] = useState<number | "">("");
  const [weightKg, setWeightKg] = useState<number | "">("");

  // -----------------------------
  // Upload handlers
  // -----------------------------
  function addFile(file: File) {
    console.log("BodyFlow file selected:", file);
    setFiles([file]);
    setPreview(URL.createObjectURL(file));
  }

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) addFile(f);
  }

  function handleCapture(file: File) {
    addFile(file);
    setOpenCamera(false);
  }

  // -----------------------------
  // Analyze
  // -----------------------------
  async function analyze() {
    console.log("analyzing ");
    if (!files.length || !userEmail) return;

    setStep("analyzing");

    try {
      const compressed = await compressImage(files[0]);
      const form = new FormData();
      form.append("files", compressed);
      form.append("email", userEmail);
      form.append("type", "body");

      const res = await fetch("/api/persona/analyze-image", {
        method: "POST",
        body: form,
      });

      const json = await res.json();
      if (!json?.persona) throw new Error("Invalid analysis");

      setAnalysis(json.persona);

      // Autofill from AI
      setBodyType(json.persona.bodyType ?? "balanced");
      setProportions(json.persona.proportions ?? []);
      setFitPreferences(json.persona.fitPreferences ?? []);
      setActivities(json.persona.activities ?? []);

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
      body: {
        bodyType,
        proportions,
        fitPreferences,
        activities,
        heightCm,
        weightKg,
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
            <h2 className="text-lg font-semibold">Body Profile</h2>
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
                Take 1 front-facing photo. Normal clothes are fine.
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
                    alt="Selected"
                    className="h-40 w-40 object-cover rounded-xl border"
                  />
                </div>
              )}
              <button
                disabled={!files.length}
                onClick={analyze}
                className="mt-6 w-full py-3 rounded-full bg-amber-600 text-white disabled:opacity-40"
              >
                Analyze photo
              </button>
            </div>
          )}

          {/* STEP 2 — Analyzing */}
          {step === "analyzing" && (
            <div className="py-16 text-center">
              <Loader2 className="h-10 w-10 animate-spin mx-auto text-amber-600" />
              <p className="mt-4 text-sm text-stone-600">
                Understanding proportions & fit…
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
                  <strong>Body type:</strong> {bodyType}
                </div>
                <div>
                  <strong>Silhouette:</strong> {analysis?.silhouette || "—"}
                </div>

                <div>
                  <strong>Body fat range:</strong>{" "}
                  {analysis?.estimatedBodyFatRange || "—"}
                </div>

                {analysis?.fitImplications?.length > 0 && (
                  <div>
                    <strong>Fit implications:</strong>{" "}
                    {analysis.fitImplications.join(", ")}
                  </div>
                )}

                {analysis?.indicatorsUsed?.length > 0 && (
                  <div className="text-xs text-stone-500">
                    Based on: {analysis.indicatorsUsed.join(", ")}
                  </div>
                )}
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
                Add exact measurements (optional)
              </button>

              {advancedOpen && (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <input
                    placeholder="Height (cm)"
                    type="number"
                    value={heightCm}
                    onChange={(e) => setHeightCm(Number(e.target.value))}
                    className="p-3 rounded-xl bg-stone-50"
                  />
                  <input
                    placeholder="Weight (kg)"
                    type="number"
                    value={weightKg}
                    onChange={(e) => setWeightKg(Number(e.target.value))}
                    className="p-3 rounded-xl bg-stone-50"
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
