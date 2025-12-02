"use client";
import React, { useState, useRef } from "react";

export default function ImageCaptureUpload({
  onImagesReady,
}: {
  onImagesReady: (images: string[]) => void;
}) {
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    const uploads: string[] = [];

    for (const file of Array.from(files)) {
      // Preview
      const preview = URL.createObjectURL(file);
      setPreviewUrls((prev) => [...prev, preview]);

      // Upload to Vercel Blob via your API
      const form = new FormData();
      form.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: form,
      });

      const json = await res.json();
      if (json?.url) uploads.push(json.url);
    }

    onImagesReady(uploads);
  }

  function triggerGallery() {
    fileRef.current?.click();
  }

  async function handleCameraCapture() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const track = stream.getVideoTracks()[0];
      const imageCapture = new ImageCapture(track);
      const blob = await imageCapture.takePhoto();

      const preview = URL.createObjectURL(blob);
      setPreviewUrls((prev) => [...prev, preview]);

      const form = new FormData();
      form.append("file", blob);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: form,
      });

      const json = await res.json();
      if (json?.url) onImagesReady([json.url]);

      track.stop();
    } catch (err) {
      console.error("Camera error:", err);
      alert("Camera not available");
    }
  }

  return (
    <div className="space-y-4">
      {/* Buttons */}
      <div className="flex gap-3">
        <button
          onClick={triggerGallery}
          className="px-4 py-2 bg-stone-100 rounded-xl"
        >
          Upload Images
        </button>

        <button
          onClick={handleCameraCapture}
          className="px-4 py-2 bg-amber-600 text-white rounded-xl"
        >
          Take Photo
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Preview */}
      <div className="grid grid-cols-3 gap-2">
        {previewUrls.map((url, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={url}
            className="rounded-xl h-24 w-full object-cover"
          />
        ))}
      </div>
    </div>
  );
}
