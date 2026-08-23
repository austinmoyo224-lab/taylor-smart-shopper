#!/usr/bin/env node
// Cross-platform (Windows / macOS / Linux) release build for Hey Taylor Android.
// Usage: bun run release:android
import { execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
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

// Gradle 8.14 supports JDK 17-24 only. Newer JDKs (25 = class file major 69)
// crash with "Unsupported class file major version". Find a usable JDK.
function javaExe(javaHome) {
  return path.join(javaHome, "bin", isWin ? "java.exe" : "java");
}

function javaMajor(javaHome) {
  const exe = javaExe(javaHome);
  if (!existsSync(exe)) return 0;
  try {
    // `java -version` prints to stderr; capture both streams.
    const res = spawnSync(exe, ["-version"], { encoding: "utf8" });
    const out = `${res.stdout || ""}${res.stderr || ""}`;
    // Matches: version "21.0.5"  |  version "1.8.0_402"  |  version 21
    const m = out.match(/version "?(\d+)(?:\.(\d+))?/);
    if (!m) return 0;
    const major = Number(m[1]);
    return major === 1 ? Number(m[2] || 0) : major;
  } catch {
    return 0;
  }
}

function listDirs(root) {
  try {
    return readdirSync(root).map((d) => path.join(root, d));
  } catch {
    return [];
  }
}

function findJdk() {
  const candidates = [];
  const push = (p) => {
    if (p && !candidates.includes(p)) candidates.push(p);
  };

  push(process.env.HEYTAYLOR_JAVA_HOME);
  push(process.env.JAVA_HOME);
  for (const [k, v] of Object.entries(process.env)) {
    if (/^JAVA_HOME_\d+/.test(k)) push(v);
  }

  if (isWin) {
    const roots = [
      "C:\\Program Files\\Eclipse Adoptium",
      "C:\\Program Files\\Java",
      "C:\\Program Files\\Microsoft",
      "C:\\Program Files\\Amazon Corretto",
      "C:\\Program Files\\Zulu",
      "C:\\Program Files\\BellSoft",
      "C:\\Program Files\\JetBrains",
      "C:\\Program Files\\Android",
      "C:\\Program Files (x86)\\Java",
      path.join(process.env.LOCALAPPDATA || "", "Programs", "Eclipse Adoptium"),
      path.join(process.env.LOCALAPPDATA || "", "Programs", "Java"),
      path.join(process.env.USERPROFILE || "", ".jdks"),
      path.join(process.env.USERPROFILE || "", "scoop", "apps"),
    ];
    for (const root of roots) {
      if (!root || !existsSync(root)) continue;
      for (const dir of listDirs(root)) {
        push(dir);
        // one extra level, e.g. ...\JetBrains\<ide>\jbr or scoop\apps\<pkg>\current
        push(path.join(dir, "jbr"));
        push(path.join(dir, "current"));
        for (const sub of listDirs(dir)) push(sub);
      }
    }
    push("C:\\Program Files\\Android\\Android Studio\\jbr");
  } else {
    for (const dir of listDirs("/usr/lib/jvm")) push(dir);
    for (const dir of listDirs("/Library/Java/JavaVirtualMachines")) {
      push(path.join(dir, "Contents", "Home"));
    }
    push("/opt/homebrew/opt/openjdk@21");
    push("/usr/local/opt/openjdk@21");
  }

  const found = [];
  for (const c of candidates) {
    const major = javaMajor(c);
    if (major) found.push({ home: c, major });
  }
  const usable = found.filter((j) => j.major >= 17 && j.major <= 24);
  // Prefer 21, then the highest usable version.
  usable.sort((a, b) => (b.major === 21) - (a.major === 21) || b.major - a.major);
  return { pick: usable[0] || null, found };
}

const { pick: jdk, found: allJdks } = findJdk();
if (!jdk) {
  const seen = allJdks.length
    ? allJdks.map((j) => `    - JDK ${j.major}: ${j.home}`).join("\n")
    : "    (none)";
  fail(
    `no Gradle-compatible Java found (needs JDK 17-24).\n` +
      `  Java installations detected:\n${seen}\n` +
      `  Install Temurin JDK 21: https://adoptium.net/temurin/releases/?version=21\n` +
      `  Pick the Windows x64 .msi, then re-run: npm run release:android\n` +
      `  Already installed somewhere unusual? Point the build at it, e.g.:\n` +
      `    $env:HEYTAYLOR_JAVA_HOME="C:\\Program Files\\Eclipse Adoptium\\jdk-21.0.5.11-hotspot"`
  );
}
console.log(`    using JDK ${jdk.major} at ${jdk.home}`);


const gradleCmd = isWin ? "gradlew.bat" : "./gradlew";
run(
  `${gradleCmd} --no-daemon -Dorg.gradle.java.home="${jdk.home}" bundleRelease`,
  path.join(ROOT, "android")
);

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
