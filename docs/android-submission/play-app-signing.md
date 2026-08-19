# Google Play App Signing + Upload Key (step by step)

## Concepts
- **Upload key** = `android/app/heytaylor-release.keystore.jks` (the one already generated). You sign every AAB with it.
- **App signing key** = held by Google after you enrol. Google re-signs the APKs delivered to devices.
- Devices therefore see **Google's** SHA-256, not yours. `assetlinks.json` must contain **both**.

## Steps
1. Play Console → **Create app** → name "Hey Taylor", app, free, accept declarations.
2. Left nav → **Test and release → Setup → App signing** (or you'll hit it during your first release).
3. Choose **"Let Google create and manage my app signing key"** (default, recommended). Do NOT upload your own signing key — your `.jks` stays as the upload key only.
4. Left nav → **Production → Create new release**.
5. Upload `android/app/build/outputs/bundle/release/app-release.aab`.
   - Play detects the signature and registers it as your **upload key certificate** automatically. There is no separate "choose upload key" dropdown on the first release — the first AAB you upload defines it.
   - If Play asks you to choose: pick **"Use the key from a previously uploaded APK/AAB"**, never "Export and upload a key from Java keystore".
6. After upload, go back to **App signing**. You'll now see two certificates:
   - *App signing key certificate* → SHA-256 (Google's)
   - *Upload key certificate* → SHA-256 (yours)
7. Copy the **App signing key SHA-256** into `public/.well-known/assetlinks.json`, replacing `<GOOGLE_PLAY_APP_SIGNING_SHA256_FINGERPRINT>`. Keep your upload SHA-256 there too (needed for sideloaded/internal builds).
8. Publish the site so `https://heytaylor.co.za/.well-known/assetlinks.json` serves both fingerprints, then verify:
   `https://developers.google.com/digital-asset-links/tools/generator`
9. Complete Play Console content: store listing, data safety, content rating, target audience, privacy policy URL (`https://heytaylor.co.za/legal/privacy`).
10. Roll out to **Internal testing** first, install from the Play link, confirm deep links open the app, then promote to Production.

## If you ever lose the upload key
Play Console → App signing → **Request upload key reset**. Your app is not lost, because Google holds the real signing key. That is why enrolling in Play App Signing matters.
