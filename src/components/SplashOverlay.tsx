import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import taylorMark from "@/assets/taylor-mark.png";

const SESSION_KEY = "taylor.splash.shown";

/**
 * First-paint splash: navy full-bleed with the Taylor mark and wordmark.
 * Shows once per browser session, ~1.4s, tap-to-skip. Respects reduced motion.
 */
export function SplashOverlay() {
  const [visible, setVisible] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* private mode — show anyway */
    }
    setVisible(true);
    const t = window.setTimeout(() => setVisible(false), reduce ? 400 : 1500);
    return () => window.clearTimeout(t);
  }, [reduce]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          onClick={() => setVisible(false)}
          className="fixed inset-0 z-[999] flex flex-col items-center justify-center overflow-hidden"
          style={{ backgroundColor: "#0F1B3D" }}
          aria-hidden
        >
          {/* Ambient green glow */}
          <motion.div
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 0.35, scale: 1 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="pointer-events-none absolute h-[520px] w-[520px] rounded-full blur-3xl"
            style={{ backgroundColor: "#22c55e" }}
          />

          {/* Mark */}
          <motion.img
            src={taylorMark}
            alt=""
            width={128}
            height={128}
            initial={{ opacity: 0, scale: 0.85, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="relative size-28 rounded-3xl shadow-2xl"
          />

          {/* Wordmark */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25, ease: "easeOut" }}
            className="relative mt-8 text-center"
          >
            <p
              className="text-4xl italic tracking-tight text-white"
              style={{ fontFamily: "var(--font-display, 'SF Pro Display', serif)" }}
            >
              Taylor
            </p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.35em] text-white/60">
              Intelligence
            </p>
          </motion.div>

          {/* Underline sweep */}
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.4, ease: "easeOut" }}
            className="relative mt-5 h-[2px] w-24 origin-left"
            style={{ backgroundColor: "#22c55e", transformOrigin: "left" }}
          />

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="relative mt-8 max-w-xs px-6 text-center text-xs leading-relaxed text-white/70"
          >
            Your shopping, intelligently curated
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}