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

      <div className="fixed inset-0 bg-brand-warm-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl w-full max-w-md shadow-soft-xl border border-brand-sand/30 p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-heading font-semibold text-brand-charcoal">Body Profile</h2>
            <button
              onClick={onClose}
              className="h-8 w-8 flex items-center justify-center rounded-xl border border-brand-sand/40 text-brand-stone hover:bg-brand-parchment transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* STEP 1 — Upload */}
          {step === "upload" && (
            <div className="text-center">
              <p className="text-sm text-brand-stone mb-4">
                Take 1 front-facing photo. Normal clothes are fine.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => filePicker.current?.click()}
                  className="flex-1 rounded-xl border border-dashed border-brand-sand p-4 bg-brand-parchment/40 text-brand-stone hover:bg-brand-parchment transition-colors"
                >
                  <UploadCloud className="mx-auto mb-1 h-5 w-5" />
                  <span className="text-sm">Upload</span>
                </button>

                <button
                  onClick={() => setOpenCamera(true)}
                  className="flex-1 rounded-xl border border-dashed border-brand-sand p-4 bg-brand-parchment/40 text-brand-stone hover:bg-brand-parchment transition-colors"
                >
                  <Camera className="mx-auto mb-1 h-5 w-5" />
                  <span className="text-sm">Camera</span>
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
                    className="h-40 w-40 object-cover rounded-xl border border-brand-sand/30"
                  />
                </div>
              )}
              <button
                disabled={!files.length}
                onClick={analyze}
                className="mt-6 w-full py-3 rounded-xl bg-brand-charcoal text-brand-cream text-sm font-medium hover:bg-brand-warm-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Analyze photo
              </button>
            </div>
          )}

          {/* STEP 2 — Analyzing */}
          {step === "analyzing" && (
            <div className="py-16 text-center">
              <Loader2 className="h-10 w-10 animate-spin mx-auto text-brand-terracotta" />
              <p className="mt-4 text-sm text-brand-stone">
                Understanding proportions & fit…
              </p>
            </div>
          )}

          {/* STEP 3 — Confirm */}
          {step === "confirm" && (
            <>
              <p className="text-sm text-brand-stone mb-4">
                Does this look right?
              </p>

              <div className="space-y-2 text-sm text-brand-charcoal">
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
                  <div className="text-xs text-brand-stone/60">
                    Based on: {analysis.indicatorsUsed.join(", ")}
                  </div>
                )}
              </div>

              <button
                onClick={handleConfirm}
                className="mt-6 w-full py-3 rounded-xl bg-brand-charcoal text-brand-cream text-sm font-medium hover:bg-brand-warm-black transition-colors"
              >
                Looks good — continue
              </button>

              <button
                onClick={() => setAdvancedOpen((v) => !v)}
                className="mt-3 text-xs text-brand-stone/60 underline"
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
                    className="p-3 rounded-xl bg-brand-parchment/50 border border-brand-sand/50 text-sm text-brand-charcoal focus:outline-none"
                  />
                  <input
                    placeholder="Weight (kg)"
                    type="number"
                    value={weightKg}
                    onChange={(e) => setWeightKg(Number(e.target.value))}
                    className="p-3 rounded-xl bg-brand-parchment/50 border border-brand-sand/50 text-sm text-brand-charcoal focus:outline-none"
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
