import trolleyAsset from "@/assets/trolley-header.png.asset.json";

/**
 * Decorative trolley image tucked in the top-right of screen headers.
 * Sits behind text with soft green wash to warm up the previously all-white
 * headers. Purely presentational — hidden from AT.
 */
export function HeaderTrolley({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={
        "pointer-events-none absolute right-0 top-0 -z-10 h-full w-44 overflow-hidden " +
        className
      }
    >
      <div className="absolute inset-0 bg-gradient-to-l from-primary/10 via-primary/5 to-transparent" />
      <img
        src={trolleyAsset.url}
        alt=""
        loading="lazy"
        width={1024}
        height={768}
        className="absolute -right-4 -top-2 h-[130%] w-auto max-w-none object-contain opacity-90 [mask-image:linear-gradient(to_left,black_55%,transparent_100%)]"
      />
    </div>
  );
}
