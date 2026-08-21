import { createContext, useContext, useEffect, useRef } from "react";
import taylorClip from "@/assets/taylor-avatar-loop.mp4.asset.json";
import taylorPoster from "@/assets/taylor-avatar-loop-poster.jpg.asset.json";

/** Pauses every Taylor avatar while the user is typing or recording. */
export const TaylorAvatarPausedContext = createContext(false);

/**
 * Taylor's live avatar. Loops continuously so she feels present, and only
 * freezes while the user is typing or recording a voice note.
 */
export function TaylorAvatar({
  speaking = false,
  paused,
  className = "",
  size = "size-8",
}: {
  speaking?: boolean;
  paused?: boolean;
  className?: string;
  size?: string;
}) {
  const contextPaused = useContext(TaylorAvatarPausedContext);
  const isPaused = paused ?? contextPaused;
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (isPaused) {
      el.pause();
    } else {
      void el.play().catch(() => {});
    }
  }, [isPaused]);

  return (
    <div
      className={`relative ${size} shrink-0 overflow-hidden rounded-full border border-primary/20 bg-primary/10 ${className}`}
    >
      <video
        ref={videoRef}
        src={taylorClip.url}
        poster={taylorPoster.url}
        muted
        loop
        autoPlay
        playsInline
        preload="auto"
        disablePictureInPicture
        aria-hidden="true"
        className="size-full object-cover"
      />
      {speaking && !isPaused && (
        <span className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-primary/40" />
      )}
    </div>
  );
}

export default TaylorAvatar;
