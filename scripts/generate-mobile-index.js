import { readdirSync, readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const assetsDir = join(process.cwd(), "dist/client/assets");
const clientDir = join(process.cwd(), "dist/client");
const distDir = join(process.cwd(), "dist");
const htmlPath = join(clientDir, "index.html");

function findChunk(prefix, ext) {
  const files = readdirSync(assetsDir);
  const match = files.find((f) => f.startsWith(`${prefix}-`) && f.endsWith(`.${ext}`));
  return match ? `/assets/${match}` : null;
}

// Copy generated service worker files from dist/ into dist/client so Capacitor
// can serve them when running the local app shell.
function copySWFiles() {
  const files = readdirSync(distDir);
  const swFiles = files.filter((f) => f === "sw.js" || f.startsWith("workbox-"));
  for (const file of swFiles) {
    const src = join(distDir, file);
    const dest = join(clientDir, file);
    if (existsSync(src)) {
      copyFileSync(src, dest);
      console.log(`Copied ${src} -> ${dest}`);
    }
  }
}

const jsEntry = findChunk("index", "js");
const cssEntry = findChunk("styles", "css");

if (!jsEntry) {
  console.error("Could not find main JS entry chunk in dist/client/assets");
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
