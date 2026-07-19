import { useRef, useState, useEffect, useCallback } from "react";
import { Camera, ImagePlus, X, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_BUCKET = "vision-uploads";
const MAX_IMAGE_WIDTH = 1024;
const JPEG_QUALITY = 0.8;

type CaptureState = "idle" | "requesting" | "preview" | "uploading";

export function VisionCapture({
  userId,
  onCapture,
  onCancel,
}: {
  userId: string;
  onCapture: (storagePath: string, previewUrl: string) => void;
  onCancel?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [state, setState] = useState<CaptureState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => {
    return () => stopStream();
  }, [stopStream]);

  async function startCamera() {
    setError(null);
    setState("requesting");
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera API not available in this context");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setState("preview");
    } catch (err) {
      console.warn("[vision] getUserMedia failed, falling back to native camera", err);
      // Fallback: trigger the device's native camera app via file input.
      // This works inside iframes (like the Lovable preview) and on browsers
      // that don't grant getUserMedia to embedded contexts.
      setState("idle");
      fileInputRef.current?.click();
    }
  }

  function resizeAndUpload(file: File | Blob): Promise<{ path: string; url: string }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const canvas = canvasRef.current ?? document.createElement("canvas");
        const scale = Math.min(1, MAX_IMAGE_WIDTH / Math.max(img.width, img.height));
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Could not prepare image"));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          async (blob) => {
            if (!blob) return reject(new Error("Could not compress image"));
            const ext = file instanceof File && file.type === "image/png" ? "png" : "jpg";
            const path = `${userId}/${crypto.randomUUID()}.${ext}`;
            const { data, error: upError } = await supabase.storage
              .from(STORAGE_BUCKET)
              .upload(path, blob, { contentType: ext === "png" ? "image/png" : "image/jpeg" });
            if (upError || !data?.path) {
              reject(new Error(upError?.message ?? "Upload failed"));
              return;
            }
            const preview = URL.createObjectURL(blob);
            resolve({ path: data.path, url: preview });
          },
          "image/jpeg",
          JPEG_QUALITY,
        );
      };
      img.onerror = () => reject(new Error("Could not load image"));
      img.src = objectUrl;
    });
  }

  async function capture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== 4) return;

    setState("uploading");
    try {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not capture frame");
      ctx.drawImage(video, 0, 0);
      const blob = await new Promise<Blob | null>((res) =>
        canvas.toBlob(res, "image/jpeg", JPEG_QUALITY),
      );
      if (!blob) throw new Error("Could not capture photo");
      const { path, url } = await resizeAndUpload(blob);
      stopStream();
      setPreviewUrl(url);
      onCapture(path, url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Capture failed");
      setState("preview");
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setState("uploading");
    try {
      const { path, url } = await resizeAndUpload(file);
      setPreviewUrl(url);
      onCapture(path, url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setState("idle");
    }
  }

  if (state === "uploading") {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card p-10 text-center">
        <RefreshCw className="size-8 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted">Uploading photo…</p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-card">
      <canvas ref={canvasRef} className="hidden" />

      {state === "preview" ? (
        <>
          <video ref={videoRef} playsInline muted className="aspect-[4/5] w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/60 to-transparent p-4">
            <button
              type="button"
              onClick={() => {
                stopStream();
                setState("idle");
                setPreviewUrl(null);
              }}
              className="flex size-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm"
              aria-label="Cancel"
            >
              <X className="size-5" />
            </button>
            <button
              type="button"
              onClick={capture}
              className="flex size-14 items-center justify-center rounded-full border-4 border-white/30 bg-primary text-primary-foreground shadow-lg"
              aria-label="Take photo"
            >
              <Camera className="size-6" />
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex size-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm"
              aria-label="Gallery"
            >
              <ImagePlus className="size-5" />
            </button>
          </div>
        </>
      ) : (
        <div className="flex aspect-[4/5] flex-col items-center justify-center bg-surface p-8 text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10">
            <Camera className="size-7 text-primary" />
          </div>
          <p className="text-sm font-medium">Snap your fridge, pantry or receipt</p>
          <p className="mt-2 text-xs text-muted">
            Taylor will identify items and match them to products where possible.
          </p>
          <button
            type="button"
            onClick={startCamera}
            className="mt-6 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
          >
            Open camera
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-3 text-xs font-medium text-primary"
          >
            Or choose from gallery
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="mt-6 text-xs text-muted hover:text-foreground"
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="absolute inset-x-0 top-0 bg-destructive/90 p-3 text-center text-xs text-destructive-foreground">
          {error}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}
