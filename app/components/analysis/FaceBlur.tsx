"use client";

import React, { useEffect, useRef, useState } from "react";
import { X, UploadCloud, Camera, Loader2, EyeOff } from "lucide-react";
import CameraCapture from "./CameraInput";
import { compressImage } from "@/utils/compressImage";
import * as faceapi from "face-api.js";

/**
 * Types
 */
type Region = {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

/**
 * Helpers
 */
const expandBox = (
  box: { x: number; y: number; w: number; h: number },
  scale = 1.25
) => {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const w = box.w * scale;
  const h = box.h * scale;
  return { x: Math.max(0, cx - w / 2), y: Math.max(0, cy - h / 2), w, h };
};

const landmarkToBox = (points: { x: number; y: number }[]) => {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  const w = Math.max(...xs) - x;
  const h = Math.max(...ys) - y;
  return { x, y, w, h };
};

/**
 * Pixelate: scale down region to small canvas and upsample back
 */
function applyPixelateToRegion(
  ctx: CanvasRenderingContext2D,
  srcCanvas: HTMLCanvasElement,
  r: Region,
  pixelSize = 12
) {
  const sx = Math.round(r.x);
  const sy = Math.round(r.y);
  const sw = Math.max(1, Math.round(r.w));
  const sh = Math.max(1, Math.round(r.h));

  // small canvas
  const small = document.createElement("canvas");
  const smallW = Math.max(1, Math.floor(sw / pixelSize));
  const smallH = Math.max(1, Math.floor(sh / pixelSize));
  small.width = smallW;
  small.height = smallH;
  const sctx = small.getContext("2d")!;
  // draw scaled down
  sctx.drawImage(srcCanvas, sx, sy, sw, sh, 0, 0, smallW, smallH);
  // draw scaled up back onto a temp canvas
  const temp = document.createElement("canvas");
  temp.width = sw;
  temp.height = sh;
  const tctx = temp.getContext("2d")!;
  // upscale using imageSmoothingEnabled = false to keep pixelation
  tctx.imageSmoothingEnabled = false;
  tctx.drawImage(small, 0, 0, smallW, smallH, 0, 0, sw, sh);

  // paste back
  ctx.drawImage(temp, sx, sy);
}

/**
 * Apply gaussian-like blur using ctx.filter
 */
function applyBlurToRegion(
  ctx: CanvasRenderingContext2D,
  srcCanvas: HTMLCanvasElement,
  r: Region,
  blurPx = 20
) {
  // temp canvas copy
  const temp = document.createElement("canvas");
  temp.width = srcCanvas.width;
  temp.height = srcCanvas.height;
  const tctx = temp.getContext("2d")!;
  tctx.drawImage(srcCanvas, 0, 0);
  // apply filter and draw
  tctx.filter = `blur(${blurPx}px)`;
  tctx.drawImage(temp, 0, 0);
  // clip and draw blurred area
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
  ctx.drawImage(temp, 0, 0);
  ctx.restore();
}

/**
 * Main component
 */
interface AnalysisUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAnalysisComplete: (analysis: any) => void;
  userEmail: string | null;
  type: string | null;
}

export default function FaceBlur({
  isOpen,
  onClose,
  onAnalysisComplete,
  userEmail,
  type,
}: AnalysisUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [originalPreview, setOriginalPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [blurFace, setBlurFace] = useState(true);
  const [openCamera, setOpenCamera] = useState(false);
  const [modelsReady, setModelsReady] = useState(false);

  const filePickerRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Regions (eyes, nose, mouth)
  const [regions, setRegions] = useState<Region[]>([]);
  const [activeRegionId, setActiveRegionId] = useState<string | null>(null);

  // UI controls
  const [modePixelate, setModePixelate] = useState(false);
  const [blurStrength, setBlurStrength] = useState(18); // px
  const [pixelSize, setPixelSize] = useState(8); // pixelation block size

  // Load tiny models once
  useEffect(() => {
    let alive = true;
    (async () => {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri("/models"),
      ]);
      if (alive) setModelsReady(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Utility: set preview + originals
  const setNewFileAndPreview = (f: File) => {
    const url = URL.createObjectURL(f);
    setFile(f);
    setOriginalFile(f);
    setPreview(url);
    setOriginalPreview(url);
    // reset regions
    setRegions([]);
  };

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setNewFileAndPreview(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    setNewFileAndPreview(f);
  };

  const handleCaptured = (f: File) => {
    setNewFileAndPreview(f);
    setOpenCamera(false);
  };

  // When preview URL changes, load image into an offscreen Image to get dimensions and draw into canvas
  useEffect(() => {
    if (!preview) return;
    const img = new Image();
    imgRef.current = img;
    img.onload = async () => {
      // draw base image onto canvas
      const canvas = canvasRef.current!;
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      // Try auto-detect landmarks & regions if models ready
      if (modelsReady) {
        try {
          const detection = await faceapi
            .detectSingleFace(
              canvas,
              new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.4 })
            )
            .withFaceLandmarks(true);

          if (detection && detection.landmarks) {
            const lm = detection.landmarks;

            const leftEyeBox = expandBox(landmarkToBox(lm.getLeftEye()), 1.4);
            const rightEyeBox = expandBox(landmarkToBox(lm.getRightEye()), 1.4);
            const noseBox = expandBox(landmarkToBox(lm.getNose()), 1.25);
            const mouthBox = expandBox(landmarkToBox(lm.getMouth()), 1.3);

            const autoRegions: Region[] = [
              {
                id: "leftEye",
                label: "Left Eye",
                x: leftEyeBox.x,
                y: leftEyeBox.y,
                w: leftEyeBox.w,
                h: leftEyeBox.h,
              },
              {
                id: "rightEye",
                label: "Right Eye",
                x: rightEyeBox.x,
                y: rightEyeBox.y,
                w: rightEyeBox.w,
                h: rightEyeBox.h,
              },
              {
                id: "nose",
                label: "Nose",
                x: noseBox.x,
                y: noseBox.y,
                w: noseBox.w,
                h: noseBox.h,
              },
              {
                id: "mouth",
                label: "Mouth",
                x: mouthBox.x,
                y: mouthBox.y,
                w: mouthBox.w,
                h: mouthBox.h,
              },
            ];
            setRegions(autoRegions);
          } else {
            // fallback: clear regions
            setRegions([]);
          }
        } catch (err) {
          console.warn("Landmark detect failed", err);
          setRegions([]);
        }
      }
      // Render preview canvas according to current regions & mode
      requestAnimationFrame(() => renderPreviewCanvas());
    };
    img.src = preview;
    // revoke object URLs on unmount? handled externally — but we keep the preview.
  }, [preview, modelsReady]); // run when preview changes or models loaded

  // Render preview into canvas and apply blur/pixelation in each region
  const renderPreviewCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const img = imgRef.current;
    if (!img) return;

    // Draw base image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);

    if (!blurFace) return; // nothing to apply

    // Create a snapshot copy we will use as source for region processing
    const src = document.createElement("canvas");
    src.width = canvas.width;
    src.height = canvas.height;
    const sctx = src.getContext("2d")!;
    sctx.drawImage(canvas, 0, 0);

    // For each region, apply selected effect
    regions.forEach((r) => {
      if (r.w <= 0 || r.h <= 0) return;
      if (modePixelate) {
        applyPixelateToRegion(ctx, src, r, pixelSize);
      } else {
        applyBlurToRegion(ctx, src, r, blurStrength);
      }
    });
  };

  // Re-render when user changes controls or regions
  useEffect(() => {
    renderPreviewCanvas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regions, modePixelate, blurStrength, pixelSize, blurFace]);

  /**
   * Drag & Resize logic for overlay boxes
   * We'll render the overlay using absolute divs scaled to the canvas displayed size.
   * The canvas may be large — overlay is positioned absolutely over it inside a wrapper.
   */

  // Helper: convert client coords to image canvas coords
  const clientToImageCoords = (clientX: number, clientY: number) => {
    const overlay = overlayRef.current!;
    const rect = overlay.getBoundingClientRect();
    // overlay may be scaled to fit modal width — compute ratio to actual canvas size
    const canvas = canvasRef.current!;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    return { x, y };
  };

  // Pointer state
  const pointerState = useRef<{
    mode: "drag" | "resize" | null;
    regionId: string | null;
    startX: number;
    startY: number;
    origRegion?: Region | null;
    resizeHandle?: string | null;
  }>({
    mode: null,
    regionId: null,
    startX: 0,
    startY: 0,
    origRegion: null,
    resizeHandle: null,
  });

  const onPointerDownRegion = (
    e: React.PointerEvent,
    regionId: string,
    handle: "body" | "nw" | "ne" | "sw" | "se"
  ) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    const { x, y } = clientToImageCoords(e.clientX, e.clientY);
    const r = regions.find((rg) => rg.id === regionId)!;
    pointerState.current = {
      mode: handle === "body" ? "drag" : "resize",
      regionId,
      startX: x,
      startY: y,
      origRegion: { ...r },
      resizeHandle: handle === "body" ? null : handle,
    };
    setActiveRegionId(regionId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointerState.current.mode) return;
    const { x, y } = clientToImageCoords(e.clientX, e.clientY);
    const st = pointerState.current;
    const id = st.regionId;
    if (!id) return;
    setRegions((prev) => {
      const next = prev.map((rg) => ({ ...rg }));
      const idx = next.findIndex((r) => r.id === id);
      if (idx === -1) return prev;
      const r = next[idx];
      const orig = st.origRegion!;
      if (st.mode === "drag") {
        const dx = x - st.startX;
        const dy = y - st.startY;
        r.x = Math.max(
          0,
          Math.min(orig.x + dx, canvasRef.current!.width - r.w)
        );
        r.y = Math.max(
          0,
          Math.min(orig.y + dy, canvasRef.current!.height - r.h)
        );
      } else if (st.mode === "resize" && st.resizeHandle) {
        // Simplified resize logic: supports corner drag (nw, ne, sw, se)
        let nx = orig.x;
        let ny = orig.y;
        let nw = orig.w;
        let nh = orig.h;
        const minSize = 10;
        if (st.resizeHandle === "nw") {
          nx = Math.min(orig.x + orig.w - minSize, x);
          ny = Math.min(orig.y + orig.h - minSize, y);
          nw = orig.x + orig.w - nx;
          nh = orig.y + orig.h - ny;
        }
        if (st.resizeHandle === "ne") {
          ny = Math.min(orig.y + orig.h - minSize, y);
          nw = Math.max(minSize, x - orig.x);
          nh = orig.y + orig.h - ny;
        }
        if (st.resizeHandle === "sw") {
          nx = Math.min(orig.x + orig.w - minSize, x);
          nw = orig.x + orig.w - nx;
          nh = Math.max(minSize, y - orig.y);
        }
        if (st.resizeHandle === "se") {
          nw = Math.max(minSize, x - orig.x);
          nh = Math.max(minSize, y - orig.y);
        }
        r.x = Math.max(0, nx);
        r.y = Math.max(0, ny);
        r.w = Math.max(1, Math.min(nw, canvasRef.current!.width - r.x));
        r.h = Math.max(1, Math.min(nh, canvasRef.current!.height - r.y));
      }
      return next;
    });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (pointerState.current.mode) {
      try {
        (e.target as Element).releasePointerCapture?.(e.pointerId);
      } catch {}
      pointerState.current = {
        mode: null,
        regionId: null,
        startX: 0,
        startY: 0,
        origRegion: null,
        resizeHandle: null,
      };
    }
  };

  // Show unblurred original or blurred preview when toggling
  const handleToggleBlur = async () => {
    const newState = !blurFace;
    setBlurFace(newState);

    // if turning on and we have no regions but models ready: run detection (already attempted on load)
    if (newState && regions.length === 0 && originalFile && modelsReady) {
      // fallback attempt to detect again
      setPreview(originalPreview);
    }
  };

  // When user clicks "Apply preview -> make processed file" we convert canvas to File and store in state file
  const makeProcessedFileFromCanvas = async (): Promise<File | null> => {
    const canvas = canvasRef.current!;
    return await new Promise<File | null>((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(null);
            return;
          }
          const processed = new File(
            [blob],
            originalFile?.name ?? "processed.jpg",
            { type: "image/jpeg" }
          );
          resolve(processed);
        },
        "image/jpeg",
        0.95
      );
    });
  };

  // handle upload
  const handleProcess = async () => {
    if (!originalFile || !type) return;
    setIsProcessing(true);

    try {
      // If blurFace ON -> ensure the file is the processed canvas
      let uploadFile = originalFile;
      if (blurFace) {
        const processed = await makeProcessedFileFromCanvas();
        if (processed) uploadFile = processed;
      }

      // compress after processing
      const compressed = await compressImage(uploadFile);

      const form = new FormData();
      form.append("file", compressed);
      form.append("tool", type);
      form.append("blurSensitive", blurFace ? "true" : "false");

      const res = await fetch("/api/tools/create-analysis", {
        method: "POST",
        headers: { "x-user-email": userEmail as string },
        body: form,
      });

      const data = await res.json();
      onAnalysisComplete(data.analysis);
      onClose();
    } catch (err) {
      console.error(err);
      alert("image processing failed! try again later!");
    } finally {
      setIsProcessing(false);
    }
  };

  // UI: render overlay boxes scaled to modal display size
  const renderOverlayBoxes = () => {
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    if (!canvas || !overlay) return null;
    const rect = overlay.getBoundingClientRect();
    const scaleX = rect.width / canvas.width;
    const scaleY = rect.height / canvas.height;

    return regions.map((r) => {
      const left = r.x * scaleX;
      const top = r.y * scaleY;
      const width = r.w * scaleX;
      const height = r.h * scaleY;
      const isActive = activeRegionId === r.id;

      return (
        <div
          key={r.id}
          style={{
            position: "absolute",
            left,
            top,
            width,
            height,
            border: `2px ${isActive ? "dashed" : "solid"} ${
              isActive ? "#F59E0B" : "rgba(255,255,255,0.6)"
            }`,
            boxShadow: isActive ? "0 0 8px rgba(245,158,11,0.6)" : undefined,
            background: isActive ? "rgba(0,0,0,0.08)" : "transparent",
            touchAction: "none",
            cursor: isActive ? "move" : "pointer",
          }}
          onPointerDown={(e) => onPointerDownRegion(e, r.id, "body")}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          {/* label */}
          <div
            style={{
              position: "absolute",
              left: 4,
              top: 2,
              fontSize: 11,
              color: "#fff",
              background: "rgba(0,0,0,0.45)",
              padding: "2px 6px",
              borderRadius: 6,
            }}
          >
            {r.label}
          </div>

          {/* corners for resizing */}
          {["nw", "ne", "sw", "se"].map((corner) => {
            const styleBase: React.CSSProperties = {
              position: "absolute",
              width: 12,
              height: 12,
              background: "#fff",
              borderRadius: 2,
              border: "1px solid #333",
              transform: "translate(-50%, -50%)",
              touchAction: "none",
            };
            let pos: React.CSSProperties = {};
            if (corner === "nw") pos = { left: 0, top: 0 };
            if (corner === "ne") pos = { right: 0, top: 0 };
            if (corner === "sw") pos = { left: 0, bottom: 0 };
            if (corner === "se") pos = { right: 0, bottom: 0 };

            return (
              <div
                key={corner}
                style={{
                  ...styleBase,
                  ...pos,
                  opacity: isActive ? 1 : 0.6,
                  boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
                }}
                onPointerDown={(e) =>
                  onPointerDownRegion(e, r.id, corner as any)
                }
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
              />
            );
          })}
        </div>
      );
    });
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

      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[999] px-4">
        <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl border overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 bg-stone-50 border-b">
            <h2 className="font-serif text-xl text-stone-900">
              Upload Image for Analysis
            </h2>
            <button onClick={onClose}>
              <X className="h-5 w-5 text-stone-700" />
            </button>
          </div>

          {/* Body */}
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

                <div className="mt-4 inline-flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenCamera(true);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-stone-900 text-white text-sm"
                  >
                    <Camera className="h-4 w-4" /> Use Camera
                  </button>
                  <div className="text-xs text-stone-500 ml-2">
                    {modelsReady
                      ? "Face models loaded"
                      : "Loading face models…"}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden border bg-stone-100 shadow-inner">
                {/* display area: overlay wrapper - scales canvas to fit modal width */}
                <div
                  className="relative w-full bg-black"
                  style={{
                    aspectRatio: "16/9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <div
                    ref={overlayRef}
                    style={{
                      position: "relative",
                      width: "100%",
                      height: "100%",
                      maxHeight: 560,
                      overflow: "hidden",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {/* canvas scaled to fit container width while keeping image aspect. We size canvas to image pixel dims and the overlay will scale it visually. */}
                    <canvas
                      ref={canvasRef}
                      style={{
                        maxWidth: "100%",
                        height: "auto",
                        display: "block",
                      }}
                    />
                    {/* overlay absolutely positioned over canvas container */}
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        right: 0,
                        bottom: 0,
                        pointerEvents: "none",
                      }}
                    >
                      <div
                        style={{
                          position: "relative",
                          width: "100%",
                          height: "100%",
                          pointerEvents: "auto",
                        }}
                      >
                        {renderOverlayBoxes()}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between px-3 py-2 bg-stone-200">
                  <div
                    className="flex gap-2 items-center cursor-pointer"
                    onClick={handleToggleBlur}
                    role="button"
                    tabIndex={0}
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
                      setOriginalFile(null);
                      setOriginalPreview(null);
                      setRegions([]);
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

          {/* Controls */}
          <div className="p-5 border-t bg-white space-y-3">
            <div className="flex gap-3 items-center">
              <label className="text-xs text-stone-600 w-28">Mode</label>
              <div className="flex gap-2">
                <button
                  className={`px-3 py-1 rounded ${
                    !modePixelate ? "bg-stone-900 text-white" : "bg-stone-100"
                  }`}
                  onClick={() => setModePixelate(false)}
                >
                  Blur
                </button>
                <button
                  className={`px-3 py-1 rounded ${
                    modePixelate ? "bg-stone-900 text-white" : "bg-stone-100"
                  }`}
                  onClick={() => setModePixelate(true)}
                >
                  Pixelate
                </button>
              </div>

              <div className="ml-auto text-xs text-stone-500">
                Auto regions (eyes, nose, mouth). Drag boxes to adjust.
              </div>
            </div>

            <div className="flex gap-3 items-center">
              <label className="text-xs text-stone-600 w-28">Intensity</label>
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
              <div className="text-xs w-12 text-right">
                {!modePixelate ? `${blurStrength}px` : `${pixelSize}`}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                disabled={!originalFile || isProcessing}
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
          </div>
        </div>
      </div>
    </>
  );
}
