import QRCode from "qrcode";

/** Builds a branded PNG that contains the store logo, name, QR code and the
 *  invitation link, then triggers a download. Falls back gracefully when the
 *  logo can't be fetched (e.g. CORS) — the QR block is still emitted. */
export async function downloadBrandedStoreQr(opts: {
  storeName: string;
  joinUrl: string;
  logoUrl?: string | null;
  qrCode: string;
  filename?: string;
}) {
  const W = 720;
  const H = 960;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // Top navy band
  ctx.fillStyle = "#0F1B3D";
  ctx.fillRect(0, 0, W, 140);
  ctx.fillStyle = "#22c55e";
  ctx.fillRect(0, 140, W, 6);

  // Try to draw logo (top-left of white area) — safe-await, ignore CORS fails
  const logo = await loadImage(opts.logoUrl).catch(() => null);
  if (logo) {
    const size = 96;
    const x = 40;
    const y = 170;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(logo, x, y, size, size);
    ctx.restore();
  }

  // Header text (in navy band)
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 20px -apple-system, 'SF Pro Display', 'Segoe UI', sans-serif";
  ctx.fillText("TAYLOR INTELLIGENCE", 40, 55);
  ctx.font = "400 14px -apple-system, 'SF Pro Display', 'Segoe UI', sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.fillText("Follow this store and unlock personalised specials", 40, 82);

  // Store name
  ctx.fillStyle = "#0F1B3D";
  ctx.font = "600 34px -apple-system, 'SF Pro Display', 'Segoe UI', sans-serif";
  wrapText(ctx, opts.storeName, logo ? 160 : 40, 220, W - 200, 38);

  ctx.fillStyle = "#64748b";
  ctx.font = "400 15px -apple-system, 'SF Pro Display', 'Segoe UI', sans-serif";
  ctx.fillText("Scan with your phone camera to follow", logo ? 160 : 40, 260);

  // QR
  const qrDataUrl = await QRCode.toDataURL(opts.joinUrl, {
    width: 520,
    margin: 1,
    color: { dark: "#0F1B3D", light: "#ffffff" },
  });
  const qrImg = await loadImage(qrDataUrl);
  if (qrImg) {
    const qrSize = 480;
    const qrX = (W - qrSize) / 2;
    const qrY = 310;
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 2;
    roundRect(ctx, qrX - 16, qrY - 16, qrSize + 32, qrSize + 32, 24, true, true);
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
  }

  // Store code / short slug (last URL segment)
  const slug = opts.joinUrl.split("/").pop() ?? "";
  ctx.fillStyle = "#22c55e";
  ctx.font = "700 22px 'SF Mono', ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.fillText(slug.toUpperCase(), W / 2, 850);

  // Join URL
  ctx.fillStyle = "#0F1B3D";
  ctx.font = "500 16px -apple-system, 'SF Pro Display', 'Segoe UI', sans-serif";
  ctx.fillText(opts.joinUrl, W / 2, 890);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "400 12px -apple-system, sans-serif";
  ctx.fillText("heytaylor.co.za", W / 2, 925);
  ctx.textAlign = "left";

  const out = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = out;
  link.download = opts.filename ?? `taylor-qr-${slug || "store"}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return out;
}

function loadImage(src: string | null | undefined): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(/\s+/);
  let line = "";
  let cy = y;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cy);
      line = w;
      cy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, cy);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: boolean,
  stroke: boolean,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}