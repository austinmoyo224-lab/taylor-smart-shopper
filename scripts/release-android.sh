#!/usr/bin/env bash
set -euo pipefail

# One command: build web bundle -> sync Capacitor -> build & sign AAB -> verify SHA-256 vs assetlinks.json
# Usage: bun run release:android
# Requires: bun, node, npx, Java 17+, Android SDK, android/app/signing.properties + keystore

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"

PROPS="android/app/signing.properties"
ASSETLINKS="public/.well-known/assetlinks.json"

[[ -f "$PROPS" ]] || { echo "ERROR: $PROPS missing (copy signing.properties.example)."; exit 1; }

STORE_FILE=$(grep -E '^STORE_FILE=' "$PROPS" | cut -d= -f2-)
STORE_PASSWORD=$(grep -E '^STORE_PASSWORD=' "$PROPS" | cut -d= -f2-)
KEY_ALIAS=$(grep -E '^KEY_ALIAS=' "$PROPS" | cut -d= -f2-)
KEYSTORE="android/app/${STORE_FILE}"
[[ -f "$KEYSTORE" ]] || { echo "ERROR: keystore not found at $KEYSTORE"; exit 1; }

echo "==> 1/5 Building mobile web bundle"
bun run build:mobile

echo "==> 2/5 Syncing Capacitor (android)"
npx cap sync android

echo "==> 3/5 Building signed release AAB"
( cd android && ./gradlew --no-daemon bundleRelease )
AAB="android/app/build/outputs/bundle/release/app-release.aab"
[[ -f "$AAB" ]] || { echo "ERROR: AAB not produced"; exit 1; }

echo "==> 4/5 Reading upload key SHA-256"
UPLOAD_SHA=$(keytool -list -v -keystore "$KEYSTORE" -alias "$KEY_ALIAS" -storepass "$STORE_PASSWORD" \
  | grep -m1 'SHA256:' | sed 's/.*SHA256: *//' | tr -d '[:space:]' | tr 'a-f' 'A-F')
echo "    upload key SHA-256: $UPLOAD_SHA"

echo "==> 5/5 Verifying assetlinks.json"
if grep -qi "$UPLOAD_SHA" "$ASSETLINKS"; then
  echo "    OK: upload key fingerprint present in $ASSETLINKS"
else
  echo "    WARNING: fingerprint NOT found in $ASSETLINKS — add it:"
  echo "      \"$UPLOAD_SHA\""
fi
if grep -q '<GOOGLE_PLAY_APP_SIGNING_SHA256_FINGERPRINT>' "$ASSETLINKS"; then
  echo "    TODO: after the first upload, paste Play Console's App signing key SHA-256"
  echo "          (Test and release > Setup > App signing) into $ASSETLINKS and republish the site."
fi

echo ""
echo "Done: $AAB"
ls -lh "$AAB"
