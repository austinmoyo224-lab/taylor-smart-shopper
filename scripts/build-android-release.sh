#!/usr/bin/env bash
set -euo pipefail

# Hey Taylor Android release build script
# Requires: bun, node, npx, Java 17+, Android SDK
# Requires: android/app/signing.properties and android/app/heytaylor-release.keystore.jks

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

echo "==> Building mobile web bundle..."
bun run build:mobile

echo "==> Syncing Capacitor Android platform..."
npx cap sync android

cd "$PROJECT_ROOT/android"

echo "==> Building release AAB..."
./gradlew bundleRelease

AAB_PATH="$PROJECT_ROOT/android/app/build/outputs/bundle/release/app-release.aab"

echo ""
echo "==> Build complete: $AAB_PATH"
ls -lh "$AAB_PATH"

echo ""
echo "Next steps:"
echo "1. Upload the AAB to Google Play Console."
echo "2. Run the keytool command in docs/android-submission/build-instructions.md to get your SHA256 fingerprint."
echo "3. Update public/.well-known/assetlinks.json and deploy it."
