"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, RefreshCw, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface CapturedImage {
  dataUrl: string;
  fileName: string;
  size: number;
  mimeType: string;
}

export function CameraCapture({
  onCapture,
}: {
  onCapture: (img: CapturedImage) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  async function startCamera() {
    setError(null);
    setStarting(true);
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Camera unavailable";
      setError(`${msg}. You can upload a file instead.`);
    } finally {
      setStarting(false);
    }
  }

  function stopCamera() {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
  }

  function snap() {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c) return;
    const w = v.videoWidth || 1280;
    const h = v.videoHeight || 720;
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, w, h);
    const dataUrl = c.toDataURL("image/jpeg", 0.85);
    const size = Math.round((dataUrl.length * 3) / 4);
    onCapture({
      dataUrl,
      fileName: `scan-${Date.now()}.jpg`,
      size,
      mimeType: "image/jpeg",
    });
    stopCamera();
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.currentTarget.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      onCapture({
        dataUrl: String(reader.result),
        fileName: f.name,
        size: f.size,
        mimeType: f.type || "image/jpeg",
      });
    };
    reader.readAsDataURL(f);
    e.currentTarget.value = "";
  }

  useEffect(() => {
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-3">
      {/* Live camera preview */}
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-border bg-bg-base">
        <video
          ref={videoRef}
          className={"size-full object-cover " + (stream ? "" : "hidden")}
          playsInline
          muted
        />
        {!stream && (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <Camera className="size-10 text-fg-tertiary" />
            <div className="text-sm text-fg-secondary">
              Use your camera to scan a document, or upload a file.
            </div>
            {error && (
              <div className="rounded-md bg-status-warning/10 px-3 py-1 text-[11px] text-status-warning ring-1 ring-status-warning/30">
                {error}
              </div>
            )}
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Controls */}
      <div className="grid grid-cols-2 gap-2">
        {!stream ? (
          <Button onClick={startCamera} disabled={starting} variant="primary" size="lg">
            <Camera className="size-4" />
            {starting ? "Starting…" : "Open camera"}
          </Button>
        ) : (
          <Button onClick={snap} variant="primary" size="lg">
            <Camera className="size-4" />
            Capture
          </Button>
        )}
        <Button
          variant="outline"
          size="lg"
          type="button"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="size-4" />
          Upload file
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={onFile}
        />
      </div>
      {stream && (
        <Button variant="ghost" size="sm" onClick={stopCamera}>
          <X className="size-3" /> Cancel camera
        </Button>
      )}
    </div>
  );
}

export function PreviewWithRetake({
  image,
  onRetake,
}: {
  image: CapturedImage;
  onRetake: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-border bg-bg-base">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image.dataUrl} alt="captured" className="size-full object-cover" />
      </div>
      <div className="flex items-center justify-between text-[11px] text-fg-tertiary">
        <span className="font-mono tnum">
          {image.fileName} · {(image.size / 1024).toFixed(0)} KB
        </span>
        <Button variant="ghost" size="sm" onClick={onRetake}>
          <RefreshCw className="size-3" />
          Retake
        </Button>
      </div>
    </div>
  );
}
