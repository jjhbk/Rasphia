"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
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
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri("/models"),
        ]);
        setModelsReady(true);
      } catch (e) {
        console.error("Failed to load face-api models", e);
      }
    })();
  }, []);

  const setNewImage = (f: File) => {
    const url = URL.createObjectURL(f);
    setFile(f);
    setPreview(url);
  };

  // Map type to image and label (From Origin/Main)
  const { imageSrc, label, description } = useMemo(() => {
    switch (type) {
      case "skin":
        return { 
          imageSrc: "/Skin.png", 
          label: "Skin Analysis", 
          description: "Upload a clear close-up for personalized skincare advice." 
        };
      case "hair":
        return { 
          imageSrc: "/Hair.png", 
          label: "Hair Care", 
          description: "Share a photo of your hair texture to find the best products." 
        };
      case "body":
        return { 
          imageSrc: "/Body.png", 
          label: "Body Fit", 
          description: "Get size and style recommendations based on your profile." 
        };
      case "similar":
        return { 
          imageSrc: "/Match.png", 
          label: "Visual Match", 
          description: "Find similar items from our catalog instantly." 
        };
      default:
        return { 
          imageSrc: "/Match.png", 
          label: "Analysis Tool", 
          description: "Upload an image to start the analysis." 
        };
    }
  }, [type]);

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
    img.crossOrigin = "anonymous"; // Safe for local blobs

    img.onload = async () => {
      const canvas = canvasRef.current!;
      // Adjust canvas size to image, but consider max display width
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);

      if (modelsReady) {
        try {
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
        } catch (e) {
          console.error("Face detection failed:", e);
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
      // Use processed canvas if we are blurring, otherwise original
      const processed = blurFace ? await makeProcessedFile() : file;
      const compressed = await compressImage(processed);

      const form = new FormData();
      form.append("file", compressed);
      form.append("tool", type || "general");
      form.append("blurSensitive", blurFace ? "true" : "false");

      const res = await fetch("/api/tools/create-analysis", {
        method: "POST",
        headers: { "x-user-email": userEmail || "" },
        body: form,
      });

      const data = await res.json();
      if (data.analysis) {
        onAnalysisComplete(data.analysis);
        onClose();
      } else {
        alert("Analysis failed. Please try again.");
      }
    } catch (err) {
      console.error(err);
      alert("Error processing image.");
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

      <div className="fixed inset-0 bg-stone-900/20 backdrop-blur-sm flex items-center justify-center z-[999] px-4 animate-in fade-in duration-200">
        <div className="w-full max-w-md bg-white/90 backdrop-blur-xl rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white/60 overflow-hidden flex flex-col max-h-[90vh] scale-100 animate-in zoom-in-95 duration-200">
          
          {/* Header Section */}
          <div className="relative p-5 pb-2">
             <button 
                onClick={onClose}
                className="absolute top-3 right-3 h-10 w-10 p-0 inline-flex items-center justify-center rounded-full hover:bg-stone-100/50 text-stone-500 hover:text-stone-800 transition-colors z-10"
              >
                <X className="h-5 w-5" />
              </button>
             
             <div className="flex items-end gap-4">
                 <div className="w-[60%] flex-shrink-0">
                     <img 
                        src={imageSrc} 
                        alt={label} 
                        className="w-full h-auto max-h-40 rounded-2xl shadow-md border border-white/80 object-cover"
                     />
                 </div>
                 <div className="flex-1 min-w-0 text-left">
                    <h2 className="font-serif text-lg text-stone-900 font-semibold leading-tight">
                          {label}
                       </h2>
                       <p className="text-xs text-stone-500 mt-2 leading-relaxed">
                          {description}
                       </p>
                 </div>
             </div>
          </div>

          {/* Body */}
          <div className="px-5 py-3 overflow-y-auto custom-scrollbar">
            {!preview ? (
              <div className="flex gap-3">
                {/* Upload Option */}
                <div
                  className="flex-1 group relative border border-dashed border-amber-200 bg-amber-50/50 rounded-2xl h-28 flex flex-col items-center justify-center gap-2 text-center cursor-pointer hover:border-amber-300 hover:bg-amber-50 transition-all active:scale-[0.98]"
                  onClick={() => filePickerRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                >
                  <div className="h-9 w-9 bg-amber-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                     <UploadCloud className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-stone-800 font-medium text-xs">Upload Image</p>
                    <p className="text-stone-400 text-[10px]">Drag & Drop</p>
                  </div>
                </div>

                {/* Camera Option */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenCamera(true);
                  }}
                  className="flex-1 group border border-dashed border-stone-200 bg-stone-50/50 rounded-2xl h-28 flex flex-col items-center justify-center gap-2 text-center cursor-pointer hover:border-amber-300 hover:bg-stone-50 transition-all active:scale-[0.98]"
                >
                  <div className="h-9 w-9 bg-white border border-stone-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform group-hover:border-amber-100">
                    <Camera className="h-4 w-4 text-stone-500 group-hover:text-amber-600 transition-colors" />
                  </div>
                  <div>
                     <p className="text-stone-800 font-medium text-xs">Use Camera</p>
                     <p className="text-stone-400 text-[10px]">Take Photo</p>
                  </div>
                </button>

                <div className="text-xs mt-3 text-stone-500 hidden">
                  {modelsReady ? "Face model loaded" : "Loading models…"}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl overflow-hidden bg-stone-50 border border-stone-100 shadow-sm">
                <div className="relative w-full bg-stone-100 flex justify-center">
                   <canvas
                    ref={canvasRef}
                    style={{
                      maxWidth: "100%",
                      height: "auto",
                      display: "block",
                    }}
                  />
                </div>

                <div className="flex items-center justify-between px-3 py-2 bg-white border-t border-stone-100">
                  <div
                    className="flex gap-2 items-center cursor-pointer select-none"
                    onClick={() => setBlurFace(!blurFace)}
                  >
                    <div className={`p-1 rounded-full ${blurFace ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-400'}`}>
                       <EyeOff className="h-3 w-3" />
                    </div>
                    <span className={`text-[10px] font-medium ${blurFace ? 'text-amber-800' : 'text-stone-500'}`}>Blur sensitive</span>
                  </div>

                  <button
                    onClick={() => {
                      setFile(null);
                      setPreview(null);
                    }}
                    className="text-[10px] font-medium text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-full transition-colors"
                  >
                    Change
                  </button>
                </div>
                
                {/* Advanced Controls (Visible only if blur is active) */}
                {blurFace && (
                   <div className="px-3 py-2 bg-stone-50 border-t border-stone-100 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                         <label className="text-[10px] text-stone-500 font-medium">Effect</label>
                         <div className="flex bg-white rounded-md border border-stone-200 p-0.5">
                            <button 
                               onClick={() => setModePixelate(false)}
                               className={`px-2 py-0.5 text-[9px] rounded ${!modePixelate ? 'bg-stone-800 text-white' : 'text-stone-500'}`}
                            >Blur</button>
                            <button 
                               onClick={() => setModePixelate(true)}
                               className={`px-2 py-0.5 text-[9px] rounded ${modePixelate ? 'bg-stone-800 text-white' : 'text-stone-500'}`}
                            >Pixelate</button>
                         </div>
                      </div>
                      <div className="flex items-center gap-2">
                         <label className="text-[10px] text-stone-500 font-medium w-8">Level</label>
                         <input
                            type="range"
                            min={2}
                            max={modePixelate ? 30 : 40}
                            value={modePixelate ? pixelSize : blurStrength}
                            onChange={(e) => modePixelate ? setPixelSize(Number(e.target.value)) : setBlurStrength(Number(e.target.value))}
                            className="flex-1 h-1 bg-stone-200 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-stone-400"
                         />
                      </div>
                   </div>
                )}
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

          {/* Footer */}
          <div className="p-5 pt-2 pb-6 bg-gradient-to-t from-white via-white to-transparent">
            <button
              disabled={!file || isProcessing}
              onClick={handleProcess}
              className="w-full py-3.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-sm font-medium shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-amber-100" /> Analyzing...
                </>
              ) : (
                "Run Analysis"
              )}
            </button>
            <p className="text-center text-[10px] text-stone-400 mt-2.5">
               Images are processed securely and deleted after analysis.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
