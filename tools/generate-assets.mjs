import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

const outDir = new URL("../assets/", import.meta.url);
mkdirSync(outDir, { recursive: true });

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c >>> 0;
}

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type);
  const length = Buffer.alloc(4);
  const crc = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 0);
  return Buffer.concat([length, typeBytes, data, crc]);
}

function png(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 4 + 1);
    raw[row] = 0;
    rgba.copy(raw, row + 1, y * width * 4, (y + 1) * width * 4);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function seeded(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0xffffffff;
  };
}

function clamp(value, min = 0, max = 255) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function paperTexture() {
  const width = 680;
  const height = 900;
  const data = Buffer.alloc(width * height * 4);
  const random = seeded(1911);
  const stains = [
    { x: 542, y: 116, r: 118, color: [118, 72, 36], alpha: 0.11 },
    { x: 122, y: 714, r: 150, color: [93, 68, 42], alpha: 0.09 },
    { x: 610, y: 790, r: 82, color: [157, 46, 47], alpha: 0.08 },
  ];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const grain = (random() - 0.5) * 18;
      let r = 247 + grain;
      let g = 244 + grain;
      let b = 233 + grain;

      if (y % 32 === 0 || y % 32 === 1) {
        r = r * 0.9 + 74 * 0.1;
        g = g * 0.9 + 125 * 0.1;
        b = b * 0.9 + 156 * 0.1;
      }

      for (const stain of stains) {
        const dx = x - stain.x;
        const dy = y - stain.y;
        const falloff = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / stain.r) ** 2;
        const amount = falloff * stain.alpha;
        r = r * (1 - amount) + stain.color[0] * amount;
        g = g * (1 - amount) + stain.color[1] * amount;
        b = b * (1 - amount) + stain.color[2] * amount;
      }

      data[i] = clamp(r);
      data[i + 1] = clamp(g);
      data[i + 2] = clamp(b);
      data[i + 3] = 255;
    }
  }

  writeFileSync(new URL("notebook-texture.png", outDir), png(width, height, data));
}

function setPixel(data, width, height, x, y, rgba) {
  if (x < 0 || y < 0 || x >= width || y >= height) return;
  const i = (Math.floor(y) * width + Math.floor(x)) * 4;
  const alpha = rgba[3] / 255;
  data[i] = clamp(data[i] * (1 - alpha) + rgba[0] * alpha);
  data[i + 1] = clamp(data[i + 1] * (1 - alpha) + rgba[1] * alpha);
  data[i + 2] = clamp(data[i + 2] * (1 - alpha) + rgba[2] * alpha);
  data[i + 3] = clamp(data[i + 3] + rgba[3] * (1 - data[i + 3] / 255));
}

function drawLine(data, width, height, x1, y1, x2, y2, rgba, thickness = 3) {
  const steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1) * 1.8);
  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps;
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t;
    for (let yy = -thickness; yy <= thickness; yy += 1) {
      for (let xx = -thickness; xx <= thickness; xx += 1) {
        if (xx * xx + yy * yy <= thickness * thickness) {
          setPixel(data, width, height, x + xx, y + yy, rgba);
        }
      }
    }
  }
}

function drawCircle(data, width, height, cx, cy, radius, rgba, thickness = 3) {
  const steps = Math.ceil(radius * 8);
  for (let i = 0; i < steps; i += 1) {
    const a = (Math.PI * 2 * i) / steps;
    const x = cx + Math.cos(a) * radius;
    const y = cy + Math.sin(a) * radius;
    for (let t = 0; t < thickness; t += 1) setPixel(data, width, height, x + t - thickness / 2, y, rgba);
  }
}

function occultStamp() {
  const width = 512;
  const height = 512;
  const data = Buffer.alloc(width * height * 4);
  const ink = [126, 24, 28, 215];
  const cx = width / 2;
  const cy = height / 2;

  drawCircle(data, width, height, cx, cy, 202, ink, 6);
  drawCircle(data, width, height, cx, cy, 143, [126, 24, 28, 135], 4);

  const points = Array.from({ length: 5 }, (_, i) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * i) / 5;
    return [cx + Math.cos(angle) * 150, cy + Math.sin(angle) * 150];
  });
  const order = [0, 2, 4, 1, 3, 0];
  for (let i = 0; i < order.length - 1; i += 1) {
    const a = points[order[i]];
    const b = points[order[i + 1]];
    drawLine(data, width, height, a[0], a[1], b[0], b[1], ink, 4);
  }

  drawLine(data, width, height, cx, 68, cx, 444, [126, 24, 28, 125], 2);
  drawLine(data, width, height, 68, cy, 444, cy, [126, 24, 28, 125], 2);

  const random = seeded(777);
  for (let i = 0; i < 2800; i += 1) {
    const x = Math.floor(random() * width);
    const y = Math.floor(random() * height);
    const p = (y * width + x) * 4;
    if (data[p + 3] > 0 && random() > 0.54) data[p + 3] = Math.floor(data[p + 3] * (0.4 + random() * 0.45));
  }

  writeFileSync(new URL("occult-stamp.png", outDir), png(width, height, data));
}

paperTexture();
occultStamp();
