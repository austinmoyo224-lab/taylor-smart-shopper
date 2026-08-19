#!/usr/bin/env bash
set -euo pipefail

# Hey Taylor Android release build script
# Requires: bun, node, npx, Java 17+, Android SDK
# Requires: android/app/signing.properties and android/app/heytaylor-release.keystore.jks

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

# Validate signing config exists before starting a long build
if [[ ! -f "android/app/signing.properties" ]]; then
    echo "ERROR: android/app/signing.properties not found."
    echo "Copy android/app/signing.properties.example to android/app/signing.properties and fill in your keystore credentials."
    exit 1
fi

if [[ ! -f "android/app/heytaylor-release.keystore.jks" ]]; then
    echo "ERROR: android/app/heytaylor-release.keystore.jks not found."
    echo "Generate your release keystore using the command in docs/android-submission/build-instructions.md."
    exit 1
fi

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
echo "1. Run the keytool command in docs/android-submission/build-instructions.md to get your SHA256 fingerprint."
echo "2. Update public/.well-known/assetlinks.json and deploy it."
echo "3. Upload the AAB to Google Play Console."
