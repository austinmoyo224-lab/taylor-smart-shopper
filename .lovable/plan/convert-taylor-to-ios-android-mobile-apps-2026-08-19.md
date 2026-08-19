# Convert Taylor to iOS & Android Mobile Apps

## Goal
Package the existing Hey Taylor web app as native iOS and Android apps distributed via the App Store and Google Play, using the fastest, shared-code approach while keeping the web/PWA deployment intact.

## Chosen Approach: Capacitor Wrapper
Use Ionic Capacitor to wrap the existing TanStack Start + Vite web app in native iOS/Android shells. This preserves the current codebase, backend (Supabase), and RLS/security model while unlocking native device APIs.

## Why Capacitor
- One shared web codebase for web, iOS, and Android.
- Works directly with Vite/TanStack Start (no framework rewrite).
- Native plugins available for push, camera, GPS, and offline storage.
- Faster and lower cost than React Native or native Swift/Kotlin builds.

## Technical Plan

### 1. Add Capacitor to the Project
- Install `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/android`.
- Initialize Capacitor with app metadata:
  - App name: "Hey Taylor"
  - Bundle ID: `com.heytaylor.app` (or agreed identifier)
  - Web directory: `dist` (or current build output folder)
- Add iOS and Android platforms.

### 2. Build Pipeline
- Create a dedicated mobile build script (e.g., `build:mobile`) that produces the static bundle Capacitor expects.
- Ensure environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, etc.) are injected at build time for the mobile bundle.
- Add `sync` and `open` scripts for iOS/Android workflows.

### 3. Native Feature Integration

#### Push Notifications
- Install `@capacitor/push-notifications`.
- Configure Firebase Cloud Messaging (FCM) for Android and APNs for iOS.
- Wire Capacitor push events into the existing `savePushSubscription` / `deletePushSubscription` server functions so Taylor can send store/deal/order alerts.

#### Camera Access
- Install `@capacitor/camera`.
- Update `VisionCapture` and chat photo flow to use the native camera when running inside the app, falling back to the browser file picker on web.

#### GPS / Location
- Install `@capacitor/geolocation`.
- Use native geolocation for store finder, restaurant recommendations, and delivery/rider tracking.

#### Offline Mode
- Keep and enhance the existing PWA/service-worker strategy.
- Cache critical app shell, lists, recipes, and recent chat history.
- Queue mutations when offline and replay when connectivity returns.

### 4. Mobile UI/UX Adjustments
- Lock the app to portrait orientation (matches current PWA orientation).
- Configure safe-area insets so the bottom nav and floating Taylor button avoid iPhone/Android gesture bars.
- Update status bar and splash screen branding to match Hey Taylor navy/white identity.
- Disable browser-only install prompts (`InstallPrompt`) inside the native app.

### 5. Deep Linking & Routing
- Configure universal links / app links so shared recipe links, store QR codes, and order links open directly in the app when installed.
- Map routes like `/recipes/:slug`, `/stores/:storeId`, and `/lists` to native app launches.

### 6. App Store Assets
- Generate required iOS icon set and Android adaptive icons from the existing Taylor portrait logo.
- Create splash screens for iOS launch storyboard and Android 12+ splash API.
- Prepare App Store screenshots and feature graphics.

### 7. Submission Prep
- iOS: configure bundle ID, signing certificates, provisioning profiles, and App Store Connect listing.
- Android: configure package name, signing keystore, Play Console listing, and privacy policy link.
- Add required privacy manifest and data-usage disclosures for iOS.
- Ensure the app does not use in-app purchases (payments remain on web, per your decision).

### 8. Testing & Release Workflow
- Local dev: `npm run dev` for web, `npx cap run ios/android` for simulators.
- Internal testing: TestFlight (iOS) and internal/closed tracks (Google Play).
- CI/CD: add build steps to generate the mobile bundle and sync native platforms.

## Out of Scope for This Plan
- Rewriting the app in React Native, Swift, or Kotlin.
- Adding in-app purchase billing.
- Changing the backend/database architecture.

## Deliverables
- Capacitor project configured for iOS and Android.
- Native plugins wired for push, camera, GPS, and offline support.
- Mobile-optimised UI (safe areas, status bar, splash screen, no web install prompt).
- Deep links for recipes, stores, lists, and orders.
- App store assets and submission-ready project structure.
- Updated build scripts and documentation for ongoing mobile releases.
