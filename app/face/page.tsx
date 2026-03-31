"use client";

import { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import BrandLogo from "@/app/components/brand/BrandLogo";

export default function CameraFaceFeatureBlurTiny() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [photoTaken, setPhotoTaken] = useState(false);

  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = "/models";

      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
      ]);

      setModelsLoaded(true);
    };

    loadModels();
  }, []);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => videoRef.current?.play();
      }
    });
  }, []);

  const expandPolygon = (points: any[], scale = 1.35) => {
    const cx = points.reduce((sum, p) => sum + p.x, 0) / points.length;
    const cy = points.reduce((sum, p) => sum + p.y, 0) / points.length;

    return points.map((p) => {
      const dx = p.x - cx;
      const dy = p.y - cy;
      return {
        x: cx + dx * scale,
        y: cy + dy * scale,
      };
    });
  };

  const blurPolygon = (ctx: CanvasRenderingContext2D, points: any[]) => {
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = ctx.canvas.width;
    tempCanvas.height = ctx.canvas.height;

    const tctx = tempCanvas.getContext("2d")!;
    tctx.drawImage(ctx.canvas, 0, 0);

    tctx.filter = "blur(18px)";
    tctx.drawImage(tempCanvas, 0, 0);

    ctx.save();
    ctx.beginPath();
    points.forEach((pt, i) => {
      i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y);
    });
    ctx.closePath();
    ctx.clip();

    ctx.drawImage(tempCanvas, 0, 0);
    ctx.restore();
  };

  const capturePhoto = async () => {
    const video = videoRef.current!;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.drawImage(video, 0, 0);

    const detection = await faceapi
      .detectSingleFace(
        canvas,
        new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 })
      )
      .withFaceLandmarks(true);

    if (!detection) {
      alert("No face detected");
      return;
    }

    const landmarks = detection.landmarks;
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();
    const nose = landmarks.getNose();
    const mouth = landmarks.getMouth();
    const leftEyebrow = landmarks.getLeftEyeBrow();
    const rightEyebrow = landmarks.getRightEyeBrow();

    blurPolygon(ctx, expandPolygon(leftEye));
    blurPolygon(ctx, expandPolygon(rightEye));
    blurPolygon(ctx, expandPolygon(nose));
    blurPolygon(ctx, expandPolygon(mouth));
    blurPolygon(ctx, expandPolygon(rightEyebrow));
    blurPolygon(ctx, expandPolygon(leftEyebrow));

    setPhotoTaken(true);
  };

  return (
    <div className="min-h-screen bg-brand-hero p-6 font-body">
      <div className="mx-auto max-w-2xl rounded-3xl bg-white/85 border border-brand-sand/40 p-6 shadow-soft-lg space-y-4">
        <div className="flex items-center gap-3">
          <BrandLogo size={38} />
          <div>
            <h1 className="text-xl font-heading text-brand-charcoal">Facial Feature Blur</h1>
            <p className="text-sm text-brand-stone">Capture a face and blur key landmarks for privacy-safe analysis.</p>
          </div>
        </div>

        {!photoTaken && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="border border-brand-sand/50 rounded-2xl w-full bg-brand-parchment"
          />
        )}

        <canvas
          ref={canvasRef}
          className="border border-brand-sand/50 rounded-2xl w-full"
          style={{ display: photoTaken ? "block" : "none" }}
        />

        {modelsLoaded && (
          <button
            onClick={capturePhoto}
            className="px-4 py-2.5 bg-brand-charcoal text-white rounded-xl hover:bg-brand-warm-black transition"
          >
            {photoTaken ? "Retake" : "Capture"}
          </button>
        )}
      </div>
    </div>
  );
}
