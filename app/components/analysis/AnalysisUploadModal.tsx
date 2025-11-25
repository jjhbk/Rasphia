"use client";

import React, { useEffect, useRef, useState } from "react";
import { X, UploadCloud, Camera, Loader2, EyeOff } from "lucide-react";
import CameraCapture from "./CameraInput";
import { compressImage } from "@/utils/compressImage";
import * as faceapi from "face-api.js";

type Point = { x: number; y: number };
type Polygon = Point[];

interface AnalysisUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAnalysisComplete: (analysis: any) => void;
  userEmail: string | null;
  type: string | null;
}

export default function AnalysisUploadModal({
  isOpen,
  onClose,
  onAnalysisComplete,
  userEmail,
  type,
}: AnalysisUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [openCamera, setOpenCamera] = useState(false);
  const [modelsReady, setModelsReady] = useState(false);

  // Effects
  const [blurFace, setBlurFace] = useState(true);
  const [modePixelate, setModePixelate] = useState(false);
  const [blurStrength, setBlurStrength] = useState(20); // px
  const [pixelSize, setPixelSize] = useState(8); // px blocks

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const filePickerRef = useRef<HTMLInputElement>(null);

  const [polygons, setPolygons] = useState<Polygon[]>([]);

  // Load Models Once
  useEffect(() => {
    (async () => {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri("/models"),
      ]);
      setModelsReady(true);
    })();
  }, []);

  const setNewImage = (f: File) => {
    const url = URL.createObjectURL(f);
    setFile(f);
    setPreview(url);
  };

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setNewImage(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) setNewImage(f);
  };

  const handleCaptured = (f: File) => {
    setNewImage(f);
    setOpenCamera(false);
  };

  // Polygon helpers
  const expandPolygon = (points: Polygon, scale = 1.35): Polygon => {
    const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
    const cy = points.reduce((s, p) => s + p.y, 0) / points.length;
    return points.map((p) => ({
      x: cx + (p.x - cx) * scale,
      y: cy + (p.y - cy) * scale,
    }));
  };

  // Pixelation
  const pixelatePolygon = (
    ctx: CanvasRenderingContext2D,
    src: HTMLCanvasElement,
    poly: Polygon
  ) => {
    const xs = poly.map((p) => p.x);
    const ys = poly.map((p) => p.y);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    const w = Math.max(...xs) - x;
    const h = Math.max(...ys) - y;

    const small = document.createElement("canvas");
    small.width = Math.max(1, w / pixelSize);
    small.height = Math.max(1, h / pixelSize);

    const sctx = small.getContext("2d")!;
    sctx.drawImage(src, x, y, w, h, 0, 0, small.width, small.height);

    const up = document.createElement("canvas");
    up.width = w;
    up.height = h;
    const uctx = up.getContext("2d")!;
    uctx.imageSmoothingEnabled = false;
    uctx.drawImage(small, 0, 0, small.width, small.height, 0, 0, w, h);

    ctx.save();
    ctx.beginPath();
    poly.forEach((pt, i) => {
      i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y);
    });
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(up, x, y);
    ctx.restore();
  };

  // Blur
  const blurPolygon = (
    ctx: CanvasRenderingContext2D,
    src: HTMLCanvasElement,
    poly: Polygon
  ) => {
    const temp = document.createElement("canvas");
    temp.width = src.width;
    temp.height = src.height;
    const tctx = temp.getContext("2d")!;
    tctx.drawImage(src, 0, 0);
    tctx.filter = `blur(${blurStrength}px)`;
    tctx.drawImage(temp, 0, 0);

    ctx.save();
    ctx.beginPath();
    poly.forEach((pt, i) => {
      i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y);
    });
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(temp, 0, 0);
    ctx.restore();
  };

  // Render preview with blur/pixelation
  const renderPreviewCanvas = () => {
    if (!imgRef.current) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    ctx.drawImage(imgRef.current, 0, 0);

    if (!blurFace) return;

    const src = document.createElement("canvas");
    src.width = canvas.width;
    src.height = canvas.height;
    src.getContext("2d")!.drawImage(canvas, 0, 0);

    for (const poly of polygons) {
      if (modePixelate) pixelatePolygon(ctx, src, poly);
      else blurPolygon(ctx, src, poly);
    }
  };

  // Load preview image + run detection
  useEffect(() => {
    if (!preview) return;

    const img = new Image();
    imgRef.current = img;

    img.onload = async () => {
      const canvas = canvasRef.current!;
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);

      if (modelsReady) {
        const det = await faceapi
          .detectSingleFace(
            canvas,
            new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.4 })
          )
          .withFaceLandmarks(true);

        if (det?.landmarks) {
          const lm = det.landmarks;
          const polys = [
            expandPolygon(lm.getLeftEye(), 1.6),
            expandPolygon(lm.getRightEye(), 1.6),
            expandPolygon(lm.getNose(), 1.45),
            expandPolygon(lm.getMouth(), 1.45),
          ];
          setPolygons(polys);
        }
      }

      renderPreviewCanvas();
    };

    img.src = preview;
  }, [preview, modelsReady]);

  // Re-render when settings change
  useEffect(() => {
    renderPreviewCanvas();
  }, [blurFace, blurStrength, pixelSize, modePixelate, polygons]);

  const makeProcessedFile = () => {
    const canvas = canvasRef.current!;
    return new Promise<File>((resolve) => {
      canvas.toBlob(
        (blob) => {
          resolve(new File([blob!], file!.name, { type: "image/jpeg" }));
        },
        "image/jpeg",
        0.95
      );
    });
  };

  const handleProcess = async () => {
    if (!file) return;
    setIsProcessing(true);

    try {
      const processed = await makeProcessedFile();
      const compressed = await compressImage(processed);

      const form = new FormData();
      form.append("file", compressed);
      form.append("tool", type!);
      form.append("blurSensitive", "true");

      const res = await fetch("/api/tools/create-analysis", {
        method: "POST",
        headers: { "x-user-email": userEmail! },
        body: form,
      });

      const data = await res.json();
      onAnalysisComplete(data.analysis);
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {openCamera && (
        <CameraCapture
          onCapture={handleCaptured}
          onClose={() => setOpenCamera(false)}
        />
      )}

      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center px-4 z-[999]">
        <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden">
          {/* HEADER */}
          <div className="flex items-center justify-between px-5 py-4 bg-stone-50 border-b">
            <h2 className="font-serif text-xl text-stone-900">Upload Image</h2>
            <button onClick={onClose}>
              <X className="h-5 w-5 text-stone-700" />
            </button>
          </div>

          {/* BODY */}
          <div className="p-5 space-y-4 overflow-y-auto">
            {!preview ? (
              <div
                className="border-2 border-dashed border-stone-300 rounded-2xl p-10 text-center cursor-pointer hover:border-stone-400 transition"
                onClick={() => filePickerRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
              >
                <UploadCloud className="h-8 w-8 mx-auto text-stone-500 mb-3" />
                <p className="text-stone-600 text-sm">Click to upload</p>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenCamera(true);
                  }}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-stone-900 text-white text-sm"
                >
                  <Camera className="h-4 w-4" /> Use Camera
                </button>

                <div className="text-xs mt-3 text-stone-500">
                  {modelsReady ? "Face model loaded" : "Loading models…"}
                </div>
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden border bg-stone-100 shadow-inner">
                <div className="w-full flex justify-center bg-black">
                  <canvas
                    ref={canvasRef}
                    style={{
                      maxWidth: "100%",
                      height: "auto",
                      display: "block",
                    }}
                  />
                </div>

                <div className="flex items-center justify-between px-3 py-2 bg-stone-200">
                  <div
                    className="flex gap-2 items-center cursor-pointer"
                    onClick={() => setBlurFace(!blurFace)}
                  >
                    <EyeOff
                      className={`h-4 w-4 ${
                        blurFace ? "text-amber-700" : "text-stone-500"
                      }`}
                    />
                    <span className="text-xs">Blur sensitive details</span>
                  </div>

                  <button
                    onClick={() => {
                      setFile(null);
                      setPreview(null);
                    }}
                    className="text-red-600 text-xs"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}

            <input
              type="file"
              accept="image/*"
              ref={filePickerRef}
              className="hidden"
              onChange={handleSelect}
            />
          </div>

          {/* CONTROLS */}
          {preview && (
            <div className="p-5 border-t bg-white space-y-4">
              <div className="flex gap-3 items-center">
                <label className="text-xs w-20 text-stone-600">Mode</label>
                <button
                  onClick={() => setModePixelate(false)}
                  className={`px-3 py-1 rounded ${
                    !modePixelate ? "bg-stone-900 text-white" : "bg-stone-200"
                  }`}
                >
                  Blur
                </button>
                <button
                  onClick={() => setModePixelate(true)}
                  className={`px-3 py-1 rounded ${
                    modePixelate ? "bg-stone-900 text-white" : "bg-stone-200"
                  }`}
                >
                  Pixelate
                </button>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-xs w-20 text-stone-600">Intensity</label>
                {!modePixelate ? (
                  <input
                    type="range"
                    min={2}
                    max={40}
                    value={blurStrength}
                    onChange={(e) => setBlurStrength(Number(e.target.value))}
                    className="w-full"
                  />
                ) : (
                  <input
                    type="range"
                    min={2}
                    max={30}
                    value={pixelSize}
                    onChange={(e) => setPixelSize(Number(e.target.value))}
                    className="w-full"
                  />
                )}
              </div>

              <button
                disabled={!file || isProcessing}
                onClick={handleProcess}
                className="w-full py-3 rounded-full bg-gradient-to-br from-[#2C1A13] to-[#6C4C3C] text-white shadow disabled:bg-stone-400 flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Processing…
                  </>
                ) : (
                  "Run Analysis"
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
