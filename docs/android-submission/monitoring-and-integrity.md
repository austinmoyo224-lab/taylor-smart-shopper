# Crashlytics + Play Integrity

Both are wired in `android/app/build.gradle` and activate automatically once
`android/app/google-services.json` exists. This file is mandatory for a release:
native push notifications depend on the same configuration and are loaded when
the Android process starts. The release script rejects a missing, invalid, or
wrong-package configuration rather than producing an app that can crash at launch.

## 1. Firebase project
1. https://console.firebase.google.com → Add project → link it to the same Google account as Play.
2. Add Android app, package name **heytaylor.co.za**.
3. Add SHA-256 fingerprints (upload key + Play App Signing key).
4. Download `google-services.json` → place at `android/app/google-services.json` (gitignored — keep it local/CI secret).
5. Confirm the Android app in that file uses package name **heytaylor.co.za**.

## 2. Crashlytics
- Firebase Console → Crashlytics → Enable.
- Rebuild and run the app once; force a test crash to confirm reporting.
- Mapping files upload automatically on release builds (`firebaseCrashlytics { mappingFileUploadEnabled true }`).
- JS errors already flow through the app's own error boundary; Crashlytics adds native/ANR coverage.

## 3. Play Integrity API
- Play Console → **Test and release → App integrity → Play Integrity API → Settings**: turn on, link the Firebase/GCP project.
- Recommended verdict policy: block when
  - `appRecognitionVerdict != PLAY_RECOGNIZED` (modified or sideloaded build), or
  - `appLicensingVerdict != LICENSED`, or
  - `deviceRecognitionVerdict` lacks `MEETS_DEVICE_INTEGRITY`.
- Client requests a token with a server-generated nonce, sends it to your backend; the backend decodes it (Play Integrity decode endpoint or local decryption keys) and rejects requests failing the policy.
- Suggested rollout: log-only for 1–2 weeks, then enforce on write endpoints (orders, coupon redemption, rider actions) so you don't lock out legitimate users during tuning.
