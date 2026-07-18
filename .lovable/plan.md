# Splash Screens & Cinematic Stores Landing

Elevate Taylor into a "high-end shopping app" feel with two coordinated moments: a branded **PWA splash** users see when launching from the home screen, and an **animated landing sequence** on `/stores` (the sign-in destination).

## 1. Design language

Locked to existing Tria9 tokens — no new palette:
- **Deep Navy** `#0F1B3D` background, **Vivid Green** `#22c55e` accent, warm ivory text.
- Motion vocabulary: soft parallax, staggered fade-up, marquee ticker, Ken-Burns hero pans. SF Pro display italic for headlines (already loaded).
- Reduced-motion respected everywhere (`prefers-reduced-motion` → instant fade only).

## 2. PWA splash (native launch)

When installed to a home screen, the browser shows a splash built from the manifest. Today `manifest.webmanifest` only has a favicon, so users see a blank flash.

Additions:
- **Maskable + monochrome icons** at 192, 512, 1024 (Taylor "T" mark on navy with green accent ring).
- **Apple splash images** — pre-rendered PNGs for iPhone/iPad sizes (iOS ignores manifest splash) referenced via `apple-touch-startup-image` `<link>`s in `__root.tsx`.
- Manifest `background_color` → `#0F1B3D`, `theme_color` → `#0F1B3D`, plus `screenshots` array so Chrome shows a richer install card.
- Assets uploaded through `lovable-assets` (kept out of repo).

## 3. In-app splash / first-paint boot screen

A lightweight overlay that plays for ~900ms on first visit per session, then fades:
- Full-bleed navy canvas, centered Taylor wordmark scaling in from 0.9 → 1 with a green underline sweeping left-to-right.
- Subtitle "Your shopping, intelligently curated" fades in beneath.
- Component: `src/components/SplashOverlay.tsx`, mounted from `__root.tsx`, guarded by `sessionStorage` so route changes don't re-trigger it.
- Auto-dismisses; user can tap to skip.

## 4. Cinematic Stores landing (`/stores`)

Rework the current header + ads block into a staged sequence while keeping all existing data (subscriptions, `listFeaturedAds`, join-code form) intact.

Sequence on mount:
1. **Greeting curtain** — "Good evening, {firstName}" slides up in display italic; time-of-day aware. Falls back to "Welcome back" when signed-out state slips through.
2. **Hero ad card** — the first featured ad becomes a full-width 16:9 cinematic tile with Ken-Burns zoom on the background image, gradient scrim, and a "Featured today" eyebrow. CTA pill pulses subtly.
3. **Rotating ad rail** — remaining ads become a horizontal snap rail below the hero (current carousel logic reused, redesigned as edge-to-edge cards with parallax on scroll).
4. **Followed stores** — cards fade-up in a stagger (framer-motion `whileInView`), logos get a soft ring, city gains a small pin-drop animation.
5. **Live ticker strip** — thin marquee under the header showing "🟢 3 new deals from Woolworths · Recipe of the day: …" pulled from active promotions/recipes; pauses on hover.
6. **Empty states** — when no subs, an animated QR illustration nudges the user to scan, replacing the current static card.

Interaction polish:
- Bottom-nav Stores icon gets a green dot when new ads arrived since last visit (`localStorage` timestamp).
- Pull-to-refresh feel: subtle spring on the header when `subs.refetch()` fires.
- All animations gated by `useReducedMotion()`.

## 5. Technical notes

- Add **`framer-motion`** (`bun add framer-motion`) — not currently installed; used for orchestrated stagger + `AnimatePresence` on splash.
- New files:
  - `src/components/SplashOverlay.tsx`
  - `src/components/StoresHero.tsx` (hero ad tile)
  - `src/components/StoresTicker.tsx` (marquee)
  - `src/assets/taylor-mark-*.png.asset.json` (icons + Apple splashes)
- Edited files:
  - `public/manifest.webmanifest` — colors, icons, screenshots.
  - `src/routes/__root.tsx` — Apple splash links, mount `SplashOverlay`.
  - `src/routes/stores.tsx` — replace header/ads composition with staged sequence; keep queries and unfollow mutation unchanged.
- No backend, RLS, or server-function changes.

## 6. Out of scope (call out if you want them)

- Redesign of `/taylor`, `/deals`, `/recipes` landings.
- Video splash (kept to PNG + CSS motion to protect launch perf and bundle size).
- Onboarding tour overlays.

```text
Boot flow:
  install → OS splash (manifest+apple images)
         → app loads
         → SplashOverlay (900ms, once/session)
         → /stores staged reveal (greeting → hero → rail → stores → ticker)
```
