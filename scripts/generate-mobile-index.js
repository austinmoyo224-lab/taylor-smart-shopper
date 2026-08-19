import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const assetsDir = join(process.cwd(), "dist/client/assets");
const htmlPath = join(process.cwd(), "dist/client/index.html");

function findChunk(prefix, ext) {
  const files = readdirSync(assetsDir);
  const match = files.find((f) => f.startsWith(`${prefix}-`) && f.endsWith(`.${ext}`));
  return match ? `/assets/${match}` : null;
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
console.log(`Generated ${htmlPath} with entry ${jsEntry}`);
