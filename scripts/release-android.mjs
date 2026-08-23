#!/usr/bin/env node
// Cross-platform (Windows / macOS / Linux) release build for Hey Taylor Android.
// Usage: bun run release:android
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const isWin = process.platform === "win32";
const PROPS = path.join(ROOT, "android", "app", "signing.properties");
const ASSETLINKS = path.join(ROOT, "public", ".well-known", "assetlinks.json");

function run(cmd, cwd = ROOT) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { cwd, stdio: "inherit", shell: true });
}

// `npx cap` breaks on some Windows/npm setups ("could not determine executable
// to run"). Call the installed Capacitor CLI entry file with node instead.
function capCli() {
  const candidates = [
    path.join(ROOT, "node_modules", "@capacitor", "cli", "bin", "capacitor"),
    path.join(ROOT, "node_modules", "@capacitor", "cli", "bin", "capacitor.js"),
  ];
  const found = candidates.find((p) => existsSync(p));
  if (!found) {
    fail("@capacitor/cli is not installed. Run `npm install` in this folder first.");
  }
  return `node "${found}"`;
}

function fail(msg) {
  console.error(`ERROR: ${msg}`);
  process.exit(1);
}

if (!existsSync(PROPS)) {
  fail(`android/app/signing.properties missing. Copy signing.properties.example to signing.properties and fill in your keystore credentials.`);
}

const props = Object.fromEntries(
  readFileSync(PROPS, "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const keystore = path.join(ROOT, "android", "app", props.STORE_FILE || "");
if (!props.STORE_FILE || !existsSync(keystore)) {
  fail(`keystore not found at ${keystore}`);
}

console.log("==> 1/5 Building mobile web bundle");
if (!existsSync(path.join(ROOT, "node_modules", "vite"))) {
  fail("dependencies not installed. Run `npm install` (or `bun install`) in this folder first.");
}
// Run the two steps separately so a build failure is reported clearly.
run("npx vite build --mode mobile");
// generate-mobile-index locates the emitted browser bundle (dist/client,
// .output/public or dist/public) and normalises it into dist/client.
run("node scripts/generate-mobile-index.js");
const WEB_INDEX = path.join(ROOT, "dist", "client", "index.html");
if (!existsSync(WEB_INDEX)) {
  fail(
    `the mobile web bundle did not produce ${WEB_INDEX}.\n` +
      `  Delete the dist and .output folders and re-run, e.g.:\n` +
      `    Remove-Item -Recurse -Force dist, .output  (PowerShell)\n` +
      `    npm install\n` +
      `    npm run release:android`
  );
}

console.log("==> 2/5 Syncing Capacitor (android)");
run(`${capCli()} sync android`);

console.log("==> 3/5 Building signed release AAB");
run(isWin ? "gradlew.bat --no-daemon bundleRelease" : "./gradlew --no-daemon bundleRelease", path.join(ROOT, "android"));

const aab = path.join(ROOT, "android", "app", "build", "outputs", "bundle", "release", "app-release.aab");
if (!existsSync(aab)) fail("AAB not produced");

console.log("==> 4/5 Reading upload key SHA-256");
let uploadSha = "";
try {
  const out = execSync(
    `keytool -list -v -keystore "${keystore}" -alias "${props.KEY_ALIAS}" -storepass "${props.STORE_PASSWORD}"`,
    { encoding: "utf8", shell: true }
  );
  const m = out.match(/SHA256:\s*([A-Fa-f0-9:]+)/);
  uploadSha = m ? m[1].toUpperCase() : "";
  console.log(`    upload key SHA-256: ${uploadSha}`);
} catch {
  console.log("    (keytool unavailable — skipping fingerprint check)");
}

console.log("==> 5/5 Verifying assetlinks.json");
if (uploadSha && existsSync(ASSETLINKS)) {
  const links = readFileSync(ASSETLINKS, "utf8");
  if (links.toUpperCase().includes(uploadSha)) {
    console.log("    OK: upload key fingerprint present in assetlinks.json");
  } else {
    console.log(`    WARNING: fingerprint NOT found in assetlinks.json — add it:\n      "${uploadSha}"`);
  }
  if (links.includes("<GOOGLE_PLAY_APP_SIGNING_SHA256_FINGERPRINT>")) {
    console.log("    TODO: after the first upload, paste Play Console's App signing key SHA-256 into assetlinks.json and republish the site.");
  }
}

console.log(`\nDone: ${aab}`);
