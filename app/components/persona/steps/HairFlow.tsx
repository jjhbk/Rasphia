"use client";

import React, { useState, useRef } from "react";
import { X, UploadCloud, Camera, Loader2 } from "lucide-react";
import { compressImage } from "@/utils/compressImage";
import CameraCapture from "../../analysis/CameraInput";

type Step = "upload" | "analyzing" | "confirm";

export default function HairFlow({
  onClose, // wizard-controlled, do not call manually
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
      form.append("type", "hair");

      const res = await fetch("/api/persona/analyze-image", {
        method: "POST",
        body: form,
      });

      const json = await res.json();
      if (!json?.persona) throw new Error("Invalid analysis");

      setAnalysis(json.persona);
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
      hair: {
        hairTypeGuess: analysis?.hairTypeGuess,
        scalpCondition: analysis?.scalpCondition,
        issuesObserved: analysis?.issuesObserved ?? [],
        productImplications: analysis?.productImplications ?? [],
        confidence: analysis?.confidence ?? 0,
        photoUrls: analysis?.photoUrls ?? [],
        analysisSummaries: analysis?.summary ? [analysis.summary] : [],
        updatedAt: new Date().toISOString(),
      },
    });

    // DO NOT call onClose(); wizard will auto-advance
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
            <h2 className="text-lg font-semibold">Hair Profile</h2>
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
                Take a clear photo of your hair & scalp. Natural light
                preferred.
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
                    alt="Hair preview"
                    className="h-40 w-40 object-cover rounded-xl border"
                  />
                </div>
              )}

              <button
                disabled={!file}
                onClick={analyze}
                className="mt-6 w-full py-3 rounded-full bg-amber-600 text-white disabled:opacity-40"
              >
                Analyze hair
              </button>
            </div>
          )}

          {/* STEP 2 — Analyzing */}
          {step === "analyzing" && (
            <div className="py-16 text-center">
              <Loader2 className="h-10 w-10 animate-spin mx-auto text-amber-600" />
              <p className="mt-4 text-sm text-stone-600">
                Understanding scalp condition, texture & density…
              </p>
            </div>
          )}

          {/* STEP 3 — Confirm (Guaranteed signal only) */}
          {step === "confirm" && (
            <>
              <p className="text-sm text-stone-600 mb-4">
                Here’s what we can clearly see:
              </p>

              <div className="space-y-2 text-sm">
                {analysis?.hairTypeGuess && (
                  <div>
                    <strong>Hair type:</strong> {analysis.hairTypeGuess}
                  </div>
                )}

                {analysis?.scalpCondition && (
                  <div>
                    <strong>Scalp condition:</strong> {analysis.scalpCondition}
                  </div>
                )}

                {analysis?.issuesObserved?.length > 0 && (
                  <div>
                    <strong>Visible issues:</strong>{" "}
                    {analysis.issuesObserved.join(", ")}
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
            </>
          )}
        </div>
      </div>
    </>
  );
}
