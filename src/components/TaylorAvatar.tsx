import { useEffect, useRef } from "react";
import taylorClip from "@/assets/taylor-talking.mp4.asset.json";
import taylorPoster from "@/assets/taylor-talking-poster.jpg.asset.json";

/**
 * Taylor's live avatar. Plays a short looping clip of Taylor while she is
 * responding, so it feels like she is talking back. Otherwise she rests on a
 * still frame.
 */
export function TaylorAvatar({
  speaking = false,
  className = "",
  size = "size-8",
}: {
  speaking?: boolean;
  className?: string;
  size?: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (speaking) {
      void el.play().catch(() => {});
    } else {
      el.pause();
      el.currentTime = 0;
    }
  }, [speaking]);

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
        playsInline
        preload="metadata"
        disablePictureInPicture
        aria-hidden="true"
        className="size-full object-cover"
      />
      {speaking && (
        <span className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-primary/40" />
      )}
    </div>
  );
}

export default TaylorAvatar;
