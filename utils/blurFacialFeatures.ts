import * as faceapi from "face-api.js";

export async function blurFacialFeatures(inputFile: File): Promise<File> {
  // Load models ONCE
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
    faceapi.nets.faceLandmark68TinyNet.loadFromUri("/models"),
  ]);

  // Read image
  const img = await new Promise<HTMLImageElement>((resolve) => {
    const url = URL.createObjectURL(inputFile);
    const image = new Image();
    image.onload = () => resolve(image);
    image.src = url;
  });

  // Canvas
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;

  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);

  // Detect with landmarks
  const detection = await faceapi
    .detectSingleFace(
      canvas,
      new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 })
    )
    .withFaceLandmarks(true);

  if (!detection) {
    console.log("No face detected.");
    return inputFile; // fallback to original
  }

  const expandPolygon = (points: any[], scale = 1.35) => {
    const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
    const cy = points.reduce((s, p) => s + p.y, 0) / points.length;
    return points.map((p) => ({
      x: cx + (p.x - cx) * scale,
      y: cy + (p.y - cy) * scale,
    }));
  };

  const blurPolygon = (points: any[]) => {
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;

    const tctx = tempCanvas.getContext("2d")!;
    tctx.drawImage(canvas, 0, 0);

    tctx.filter = "blur(22px)";
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

  const lm = detection.landmarks;

  const features = [
    expandPolygon(lm.getLeftEye()),
    expandPolygon(lm.getRightEye()),
    expandPolygon(lm.getNose()),
    expandPolygon(lm.getMouth()),
  ];

  features.forEach(blurPolygon);

  // Convert canvas → blob → File
  return await new Promise<File>((resolve) => {
    canvas.toBlob(
      (blob) => {
        resolve(new File([blob!], inputFile.name, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.9
    );
  });
}
