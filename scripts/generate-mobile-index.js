import { readdirSync, readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const clientDir = join(ROOT, "dist/client");
const distDir = join(ROOT, "dist");

// Depending on the build target, Vite/Nitro may emit the browser bundle to
// dist/client, .output/public or dist/public. Find whichever exists and make
// sure dist/client (the Capacitor webDir) ends up containing it.
const CANDIDATES = ["dist/client", ".output/public", "dist/public", "dist"];

function hasAssets(dir) {
  const a = join(ROOT, dir, "assets");
  return existsSync(a) && statSync(a).isDirectory() && readdirSync(a).some((f) => f.endsWith(".js"));
}

function copyDir(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const s = join(src, entry.name);
    const d = join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else copyFileSync(s, d);
  }
}

const source = CANDIDATES.find(hasAssets);

if (!source) {
  console.error(
    "ERROR: no built browser assets found.\n" +
      `Looked for an "assets" folder inside: ${CANDIDATES.join(", ")}\n` +
      "The web build must run first and finish successfully:\n" +
      "  npx vite build --mode mobile"
  );
  process.exit(1);
}

if (relative(ROOT, join(ROOT, source)) !== "dist/client") {
  console.log(`Copying ${source} -> dist/client`);
  copyDir(join(ROOT, source), clientDir);
}

const assetsDir = join(clientDir, "assets");
const htmlPath = join(clientDir, "index.html");

function findChunk(prefixes, ext) {
  const files = readdirSync(assetsDir);
  for (const prefix of prefixes) {
    const match = files.find((f) => f.startsWith(`${prefix}-`) && f.endsWith(`.${ext}`));
    if (match) return `/assets/${match}`;
  }
  const any = files.find((f) => f.endsWith(`.${ext}`));
  return any ? `/assets/${any}` : null;
}

// Copy generated service worker files from dist/ into dist/client so Capacitor
// can serve them when running the local app shell.
function copySWFiles() {
  if (!existsSync(distDir)) return;
  const files = readdirSync(distDir);
  const swFiles = files.filter((f) => f === "sw.js" || f.startsWith("workbox-"));
  for (const file of swFiles) {
    const src = join(distDir, file);
    const dest = join(clientDir, file);
    if (existsSync(src) && statSync(src).isFile()) {
      copyFileSync(src, dest);
      console.log(`Copied ${src} -> ${dest}`);
    }
  }
}

const jsEntry = findChunk(["index", "client", "main", "entry"], "js");
const cssEntry = findChunk(["styles", "index", "main"], "css");

if (!jsEntry) {
  console.error("Could not find a main JS entry chunk in dist/client/assets");
  process.exit(1);
}

const cssLink = cssEntry ? `<link rel="stylesheet" href="${cssEntry}" />` : "";

const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#0F1B3D" />
    <title>Hey Taylor</title>
    ${cssLink}
    <link rel="manifest" href="/manifest.webmanifest" />
    <link rel="icon" type="image/png" href="/favicon.png" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="${jsEntry}"></script>
  </body>
</html>
`;

writeFileSync(htmlPath, html);
copySWFiles();
console.log(`Generated ${htmlPath} with entry ${jsEntry}`);
