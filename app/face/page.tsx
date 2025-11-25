"use client";

import { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";

export default function CameraFaceFeatureBlurTiny() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [photoTaken, setPhotoTaken] = useState(false);

  // Load tiny models
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

  // Start camera
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => videoRef.current?.play();
      }
    });
  }, []);
  const expandPolygon = (points: any[], scale = 1.35) => {
    // Compute polygon center
    const cx = points.reduce((sum, p) => sum + p.x, 0) / points.length;
    const cy = points.reduce((sum, p) => sum + p.y, 0) / points.length;

    // Push all points outward
    return points.map((p) => {
      const dx = p.x - cx;
      const dy = p.y - cy;
      return {
        x: cx + dx * scale,
        y: cy + dy * scale,
      };
    });
  };

  // Helper: blur any polygon region
  const blurPolygon = (ctx: CanvasRenderingContext2D, points: any[]) => {
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = ctx.canvas.width;
    tempCanvas.height = ctx.canvas.height;

    const tctx = tempCanvas.getContext("2d")!;
    tctx.drawImage(ctx.canvas, 0, 0);

    // apply blur
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

    // Detect face with tiny landmark model
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

    // Get feature sets
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();
    const nose = landmarks.getNose();
    const mouth = landmarks.getMouth();
    const leftEyebrow = landmarks.getLeftEyeBrow();
    const rightEyebrow = landmarks.getRightEyeBrow();
    // Blur each region
    blurPolygon(ctx, expandPolygon(leftEye));
    blurPolygon(ctx, expandPolygon(rightEye));
    blurPolygon(ctx, expandPolygon(nose));
    blurPolygon(ctx, expandPolygon(mouth));
    blurPolygon(ctx, expandPolygon(rightEyebrow));
    blurPolygon(ctx, expandPolygon(leftEyebrow));

    setPhotoTaken(true);
  };

  return (
    <div className="space-y-4">
      {!photoTaken && (
        <video ref={videoRef} autoPlay playsInline className="border w-full" />
      )}

      <canvas
        ref={canvasRef}
        className="border w-full"
        style={{ display: photoTaken ? "block" : "none" }}
      />

      {modelsLoaded && (
        <button
          onClick={capturePhoto}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          {photoTaken ? "Retake" : "Capture"}
        </button>
      )}
    </div>
  );
}
