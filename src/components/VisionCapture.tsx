import { useRef, useState, useEffect, useCallback } from "react";
import { Camera, ImagePlus, X, RefreshCw, ScanLine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getWrapper, isNativeApp } from "@/lib/appbuild";

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
  const [liveUnavailable, setLiveUnavailable] = useState(false);
  const [hasLiveFrame, setHasLiveFrame] = useState(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setHasLiveFrame(false);
  }, []);

  useEffect(() => {
    return () => stopStream();
  }, [stopStream]);

  function openNativeCameraFallback(message?: string) {
    stopStream();
    setLiveUnavailable(true);
    setState("idle");
    if (message) setError(message);
    requestAnimationFrame(() => fileInputRef.current?.click());
  }

  async function waitForUsableVideo(video: HTMLVideoElement): Promise<void> {
    await video.play();
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0) return;

    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        cleanup();
        reject(new Error("Camera opened, but no live picture was received"));
      }, 2500);

      function cleanup() {
        window.clearTimeout(timeout);
        video.removeEventListener("loadedmetadata", onReady);
        video.removeEventListener("loadeddata", onReady);
        video.removeEventListener("canplay", onReady);
      }

      function onReady() {
        if (video.videoWidth === 0) return;
        cleanup();
        resolve();
      }

      video.addEventListener("loadedmetadata", onReady);
      video.addEventListener("loadeddata", onReady);
      video.addEventListener("canplay", onReady);
    });
  }

  async function startCamera() {
    setError(null);
    setState("requesting");
    setHasLiveFrame(false);

    // In the Capacitor native app, use the native camera plugin directly.
    if (isNativeApp()) {
      try {
        const photo = await CapacitorCamera.getPhoto({
          resultType: CameraResultType.Uri,
          source: CameraSource.Camera,
          quality: 80,
          allowEditing: false,
          saveToGallery: false,
        });
        if (photo.webPath) {
          setState("uploading");
          const blob = await fetch(photo.webPath).then((r) => r.blob());
          const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
          const { path, url } = await resizeAndUpload(file);
          setPreviewUrl(url);
          onCapture(path, url);
          return;
        }
      } catch (err) {
        console.warn("[vision] native camera failed", err);
        setError(err instanceof Error ? err.message : "Camera was cancelled");
        setState("idle");
        return;
      }
    }

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera API not available in this context");
      }
      stopStream();
      const stream = await navigator.mediaDevices
        .getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        })
        .catch(() => navigator.mediaDevices.getUserMedia({ video: true, audio: false }));
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await waitForUsableVideo(videoRef.current);
      }
      setHasLiveFrame(true);
      setState("preview");
    } catch (err) {
      console.warn("[vision] getUserMedia failed, falling back to native camera", err);
      // Fallback: trigger the device's native camera app via the file input.
      // Because this whole call originated inside a user click (Start scan
      // / Capture photo), the browser still treats the click as a user
      // gesture, so the picker actually opens — this works inside iframes
      // (like the Lovable preview) and on browsers that don't grant
      // getUserMedia to embedded contexts.
      openNativeCameraFallback("Live camera preview was blocked. Opening your device camera instead.");
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
    <div className="bg-background">
      <canvas ref={canvasRef} className="hidden" />

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <ScanLine className="size-5 text-primary" />
          <h2 className="text-lg font-semibold">Scan with camera</h2>
        </div>
        <button
          type="button"
          onClick={() => {
            stopStream();
            onCancel?.();
          }}
          className="flex size-9 items-center justify-center rounded-full border-2 border-primary text-primary"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Viewfinder */}
      <div className="relative mx-4 overflow-hidden rounded-2xl bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onLoadedData={() => setHasLiveFrame(true)}
          onCanPlay={() => setHasLiveFrame(true)}
          className={`aspect-[3/4] w-full object-cover ${
            state === "preview" && hasLiveFrame ? "block" : "absolute inset-0 opacity-0"
          }`}
        />

        {state !== "preview" && (
          <button
            type="button"
            onClick={() =>
              liveUnavailable ? fileInputRef.current?.click() : void startCamera()
            }
            className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-3 text-white/80"
          >
            {state === "requesting" ? (
              <RefreshCw className="size-8 animate-spin" />
            ) : (
              <>
                <Camera className="size-10" />
                <span className="text-sm font-medium">
                  {liveUnavailable ? "Open camera" : "Tap to start camera"}
                </span>
              </>
            )}
          </button>
        )}

        {state === "preview" && !hasLiveFrame && (
          <div className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-3 text-primary-foreground">
            <RefreshCw className="size-8 animate-spin" />
            <span className="text-sm font-medium">Starting camera…</span>
          </div>
        )}

        {/* Framed overlay with corner brackets */}
        <div className="pointer-events-none absolute inset-4 rounded-2xl border border-white/70">
          <span className="absolute -left-0.5 -top-0.5 size-6 rounded-tl-2xl border-l-2 border-t-2 border-white" />
          <span className="absolute -right-0.5 -top-0.5 size-6 rounded-tr-2xl border-r-2 border-t-2 border-white" />
          <span className="absolute -bottom-0.5 -left-0.5 size-6 rounded-bl-2xl border-b-2 border-l-2 border-white" />
          <span className="absolute -bottom-0.5 -right-0.5 size-6 rounded-br-2xl border-b-2 border-r-2 border-white" />
        </div>

        {error && (
          <div className="absolute inset-x-0 top-0 bg-destructive/90 p-3 text-center text-xs text-destructive-foreground">
            {error}
          </div>
        )}
      </div>

      {/* Hint + actions */}
      <p className="mt-5 px-6 text-center text-sm text-muted">
        Point your camera at a QR code, your pantry, or a receipt.
      </p>

      <div className="px-4 pt-4 pb-6">
        <button
          type="button"
          onClick={
            state === "preview"
              ? capture
              : liveUnavailable
                ? () => fileInputRef.current?.click()
                : () => void startCamera()
          }
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/30 active:scale-[0.99]"
        >
          <Camera className="size-5" />
          {state === "preview" ? "Capture photo" : "Start scan"}
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="mt-3 flex w-full items-center justify-center gap-2 text-sm font-medium text-primary"
        >
          <ImagePlus className="size-4" />
          Choose from gallery
        </button>
      </div>

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
