"use client";

import React, { useState, useRef } from "react";
import { X, UploadCloud, Camera, Loader2 } from "lucide-react";
import CameraCapture from "../../analysis/CameraInput";
import { compressImage } from "@/utils/compressImage";

export default function BodyFlow({
  onClose,
  onSave,
  userEmail,
}: {
  onClose: () => void;
  onSave: (payload: any) => Promise<void>;
  userEmail: string | null;
}) {
  // ----------------------------------------------------
  // FILE STATE
  // ----------------------------------------------------
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  type Status = "queued" | "processing" | "analyzing" | "done" | "error";
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [results, setResults] = useState<any[]>([]);

  const filePicker = useRef<HTMLInputElement | null>(null);
  const [openCamera, setOpenCamera] = useState(false);
  const [isProcessingAll, setIsProcessingAll] = useState(false);

  // ----------------------------------------------------
  // PERSONA FIELDS
  // ----------------------------------------------------
  const [bodyType, setBodyType] = useState("balanced");
  const [proportions, setProportions] = useState<string[]>([]);
  const [shoulderWidth, setShoulderWidth] = useState("average");
  const [hipWidth, setHipWidth] = useState("average");
  const [chestShape, setChestShape] = useState("average");
  const [waistShape, setWaistShape] = useState("average");

  const [fitPreference, setFitPreference] = useState<string[]>([]);
  const [activities, setActivities] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  // ----------------------------------------------------
  // UTILITY: StrictMode-safe toggle
  // ----------------------------------------------------
  const toggle = (value: string, setter: any, prev: string[]) => {
    setter(
      prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value]
    );
  };

  // ----------------------------------------------------
  // FILE & PREVIEW HANDLERS
  // ----------------------------------------------------
  function addFiles(newFiles: File[]) {
    setFiles((prev) => [...prev, ...newFiles]);
    setPreviews((prev) => [
      ...prev,
      ...newFiles.map((f) => URL.createObjectURL(f)),
    ]);
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

  function handleCapture(file: File) {
    addFiles([file]);
    setOpenCamera(false);
  }

  function updateStatus(i: number, status: Status) {
    setStatuses((prev) => {
      const c = [...prev];
      c[i] = status;
      return c;
    });
  }

  function updateResult(i: number, r: any) {
    setResults((prev) => {
      const c = [...prev];
      c[i] = r;
      return c;
    });
  }

  // ----------------------------------------------------
  // RUN ANALYSIS
  // ----------------------------------------------------
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
        form.append("type", "body");

        const response = await fetch("/api/persona/analyze-image", {
          method: "POST",
          body: form,
        });

        const json = await response.json();
        if (!json?.persona) throw new Error("Invalid analysis result");

        updateStatus(i, "done");
        updateResult(i, json.persona);

        // Autofill from first
        if (i === 0) {
          if (json.persona.bodyType) setBodyType(json.persona.bodyType);
          if (json.persona.proportions)
            setProportions(json.persona.proportions);
          if (json.persona.fitPreferences)
            setFitPreference(json.persona.fitPreferences);
          if (json.persona.activities) setActivities(json.persona.activities);
          if (json.persona.notes) setNotes(json.persona.notes);
        }
      } catch (err) {
        console.error(err);
        updateStatus(i, "error");
      }
    }

    setIsProcessingAll(false);
  }

  // ----------------------------------------------------
  // FINAL SAVE
  // ----------------------------------------------------
  async function handleSave() {
    const payload = {
      body: {
        photoUrls: results.map((r) => r?.photoUrls?.[0]).filter(Boolean),

        bodyType,
        proportions,
        shoulderWidth,
        hipWidth,
        chestShape,
        waistShape,

        fitPreferences: fitPreference,
        activities,
        notes,

        analysisSummaries: results.map((r) => r?.summary).filter(Boolean),
        updatedAt: new Date().toISOString(),
      },
    };

    await onSave(payload);
    onClose();
  }

  // ----------------------------------------------------
  // UI
  // ----------------------------------------------------
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
            <h2 className="text-lg font-semibold">Body Analysis</h2>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-stone-100"
            >
              <X />
            </button>
          </div>

          {/* UPLOAD */}
          <div className="flex gap-3 mb-4">
            <button
              type="button"
              onClick={() => filePicker.current?.click()}
              className="flex-1 rounded-xl border border-dashed p-4 text-center bg-stone-50"
            >
              <UploadCloud className="h-5 w-5 mx-auto mb-1" />
              Upload Images
            </button>

            <button
              type="button"
              onClick={() => setOpenCamera(true)}
              className="flex-1 rounded-xl border border-dashed p-4 text-center bg-stone-50"
            >
              <Camera className="h-5 w-5 mx-auto mb-1" />
              Use Camera
            </button>

            <input
              type="file"
              multiple
              accept="image/*"
              ref={filePicker}
              className="hidden"
              onChange={handleSelect}
            />
          </div>

          {/* PREVIEWS */}
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
              className="w-full py-3 rounded-full bg-amber-600 text-white disabled:opacity-50"
            >
              {isProcessingAll ? (
                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
              ) : (
                "Analyze Images"
              )}
            </button>
          )}

          {/* BODY FORM */}
          {files.length > 0 && (
            <div className="mt-6 space-y-4">
              <h3 className="font-semibold text-stone-700">
                Refine Body Profile
              </h3>

              {/* BODY TYPE */}
              <div>
                <label className="text-xs text-stone-600">Body Type</label>
                <select
                  value={bodyType}
                  onChange={(e) => setBodyType(e.target.value)}
                  className="w-full p-3 rounded-xl bg-stone-50"
                >
                  <option value="inverted-triangle">Inverted Triangle</option>
                  <option value="triangle">Triangle</option>
                  <option value="rectangle">Rectangle</option>
                  <option value="oval">Oval</option>
                  <option value="hourglass">Hourglass</option>
                  <option value="balanced">Balanced</option>
                </select>
              </div>

              {/* PROPORTIONS — FIXED CHECKBOX PILLS */}
              <div>
                <label className="text-xs text-stone-600">Proportions</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {[
                    "long legs",
                    "short legs",
                    "long torso",
                    "short torso",
                    "broad shoulders",
                    "narrow shoulders",
                    "wide hips",
                    "narrow hips",
                  ].map((item) => {
                    const selected = proportions.includes(item);

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
                            toggle(item, setProportions, proportions)
                          }
                          className="hidden"
                        />
                        {item}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* SHOULDERS */}
              <div>
                <label className="text-xs text-stone-600">Shoulder Width</label>
                <select
                  value={shoulderWidth}
                  onChange={(e) => setShoulderWidth(e.target.value)}
                  className="w-full p-3 rounded-xl bg-stone-50"
                >
                  <option value="narrow">Narrow</option>
                  <option value="average">Average</option>
                  <option value="broad">Broad</option>
                </select>
              </div>

              {/* HIP WIDTH */}
              <div>
                <label className="text-xs text-stone-600">Hip Width</label>
                <select
                  value={hipWidth}
                  onChange={(e) => setHipWidth(e.target.value)}
                  className="w-full p-3 rounded-xl bg-stone-50"
                >
                  <option value="narrow">Narrow</option>
                  <option value="average">Average</option>
                  <option value="wide">Wide</option>
                </select>
              </div>

              {/* FIT PREFERENCES — FIXED CHECKBOX PILLS */}
              <div>
                <label className="text-xs text-stone-600">
                  Fit Preferences
                </label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {["relaxed", "oversized", "tapered", "fitted"].map((item) => {
                    const selected = fitPreference.includes(item);

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
                            toggle(item, setFitPreference, fitPreference)
                          }
                          className="hidden"
                        />
                        {item}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* ACTIVITIES — FIXED CHECKBOX PILLS */}
              <div>
                <label className="text-xs text-stone-600">Activities</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {[
                    "office job",
                    "walking",
                    "gym",
                    "sports",
                    "running",
                    "yoga",
                  ].map((item) => {
                    const selected = activities.includes(item);

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
                            toggle(item, setActivities, activities)
                          }
                          className="hidden"
                        />
                        {item}
                      </label>
                    );
                  })}
                </div>
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
                className="w-full py-3 rounded-full bg-amber-600 text-white"
              >
                Save Body Profile
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
