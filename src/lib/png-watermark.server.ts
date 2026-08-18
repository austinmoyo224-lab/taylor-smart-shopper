import { inflateSync, deflateSync } from "node:zlib";

/**
 * Burns a small text watermark into the bottom-right corner of an 8-bit
 * RGB/RGBA PNG, so the mark survives download, share and re-upload.
 * Pure JS (node:zlib only) — no native image libraries in the Worker runtime.
 */

const GLYPHS: Record<string, string[]> = {
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  a: ["00000", "00000", "01110", "00001", "01111", "10001", "01111"],
  e: ["00000", "00000", "01110", "10001", "11111", "10000", "01110"],
  l: ["01100", "00100", "00100", "00100", "00100", "00100", "01110"],
  o: ["00000", "00000", "01110", "10001", "10001", "10001", "01110"],
  r: ["00000", "00000", "10110", "11001", "10000", "10000", "10000"],
  y: ["00000", "00000", "10001", "10001", "01111", "00001", "01110"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
};

const GW = 5;
const GH = 7;

function crc32(buf: Uint8Array): number {
  let c: number;
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]!) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

function paeth(a: number, b: number, c: number) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

export function watermarkPng(png: Uint8Array, text = "Hey Taylor!"): Uint8Array<ArrayBuffer> {
  // ---- parse chunks ----
  const dv = new DataView(png.buffer, png.byteOffset, png.byteLength);
  let pos = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat: Uint8Array[] = [];
  const keep: { type: string; data: Uint8Array }[] = [];
  while (pos + 8 <= png.length) {
    const len = dv.getUint32(pos);
    const type = String.fromCharCode(png[pos + 4]!, png[pos + 5]!, png[pos + 6]!, png[pos + 7]!);
    const data = png.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      width = dv.getUint32(pos + 8);
      height = dv.getUint32(pos + 12);
      bitDepth = png[pos + 16]!;
      colorType = png[pos + 17]!;
      if (png[pos + 20] !== 0) throw new Error("interlaced PNG unsupported");
      keep.push({ type, data: new Uint8Array(data) });
    } else if (type === "IDAT") {
      idat.push(new Uint8Array(data));
    } else if (type === "IEND") {
      break;
    } else {
      keep.push({ type, data: new Uint8Array(data) });
    }
    pos += 12 + len;
  }
  if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6)) {
    throw new Error(`unsupported PNG (depth ${bitDepth}, color ${colorType})`);
  }
  const ch = colorType === 6 ? 4 : 3;

  // ---- inflate + unfilter ----
  const total = idat.reduce((n, c) => n + c.length, 0);
  const joined = new Uint8Array(total);
  let off = 0;
  for (const c of idat) {
    joined.set(c, off);
    off += c.length;
  }
  const raw = new Uint8Array(inflateSync(joined));
  const stride = width * ch;
  const px = new Uint8Array(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]!;
    const rowIn = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    const rowOut = px.subarray(y * stride, y * stride + stride);
    const prev = y > 0 ? px.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const A = x >= ch ? rowOut[x - ch]! : 0;
      const B = prev ? prev[x]! : 0;
      const C = prev && x >= ch ? prev[x - ch]! : 0;
      const v = rowIn[x]!;
      rowOut[x] =
        filter === 0
          ? v
          : filter === 1
            ? (v + A) & 0xff
            : filter === 2
              ? (v + B) & 0xff
              : filter === 3
                ? (v + ((A + B) >> 1)) & 0xff
                : (v + paeth(A, B, C)) & 0xff;
    }
  }

  // ---- draw watermark ----
  const scale = Math.max(2, Math.round(Math.min(width, height) / 190));
  const spacing = 1;
  const chars = [...text];
  const textW = chars.length * (GW + spacing) * scale - spacing * scale;
  const textH = GH * scale;
  const padX = Math.round(4 * scale);
  const padY = Math.round(3 * scale);
  const boxW = textW + padX * 2;
  const boxH = textH + padY * 2;
  const margin = Math.round(Math.min(width, height) * 0.03);
  const boxX = Math.max(0, width - boxW - margin);
  const boxY = Math.max(0, height - boxH - margin);

  const blend = (x: number, y: number, r: number, g: number, b: number, alpha: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = y * stride + x * ch;
    px[i] = Math.round(px[i]! * (1 - alpha) + r * alpha);
    px[i + 1] = Math.round(px[i + 1]! * (1 - alpha) + g * alpha);
    px[i + 2] = Math.round(px[i + 2]! * (1 - alpha) + b * alpha);
    if (ch === 4) px[i + 3] = 255;
  };

  // translucent dark plate
  const radius = Math.round(boxH * 0.3);
  for (let y = boxY; y < boxY + boxH; y++) {
    for (let x = boxX; x < boxX + boxW; x++) {
      const dx = Math.min(x - boxX, boxX + boxW - 1 - x);
      const dy = Math.min(y - boxY, boxY + boxH - 1 - y);
      if (dx < radius && dy < radius) {
        const ddx = radius - dx;
        const ddy = radius - dy;
        if (ddx * ddx + ddy * ddy > radius * radius) continue;
      }
      blend(x, y, 12, 18, 30, 0.42);
    }
  }

  // glyphs (with a soft shadow for contrast)
  let cx = boxX + padX;
  const cy = boxY + padY;
  for (const chr of chars) {
    const g = GLYPHS[chr] ?? GLYPHS[chr.toUpperCase()] ?? GLYPHS[" "]!;
    for (let gy = 0; gy < GH; gy++) {
      const row = g[gy]!;
      for (let gx = 0; gx < GW; gx++) {
        if (row[gx] !== "1") continue;
        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) {
            const x = cx + gx * scale + sx;
            const y = cy + gy * scale + sy;
            blend(x + 1, y + 1, 0, 0, 0, 0.35);
            blend(x, y, 255, 255, 255, 0.95);
          }
        }
      }
    }
    cx += (GW + spacing) * scale;
  }

  // ---- re-filter (none) + deflate ----
  const out = new Uint8Array(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    out[y * (stride + 1)] = 0;
    out.set(px.subarray(y * stride, y * stride + stride), y * (stride + 1) + 1);
  }
  const compressed = new Uint8Array(deflateSync(out, { level: 9 }));

  const parts: Uint8Array[] = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])];
  for (const k of keep) parts.push(chunk(k.type, k.data));
  parts.push(chunk("IDAT", compressed));
  parts.push(chunk("IEND", new Uint8Array(0)));
  const size = parts.reduce((n, p) => n + p.length, 0);
  const final = new Uint8Array(new ArrayBuffer(size));
  let o = 0;
  for (const p of parts) {
    final.set(p, o);
    o += p.length;
  }
  return final;
}
