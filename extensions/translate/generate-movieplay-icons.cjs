const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const SIZES = [16, 48, 128];
const OUT_DIR = path.join('D:\\projects\\movieplay-extension', 'icons');

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

for (const size of SIZES) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#7c3aed';
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();

  // Inner glow
  ctx.fillStyle = '#9333ea';
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.44, 0, Math.PI * 2);
  ctx.fill();

  // Play triangle + clapper lines
  ctx.fillStyle = '#ffffff';
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.22;

  ctx.beginPath();
  ctx.moveTo(cx - r * 0.7, cy - r);
  ctx.lineTo(cx + r * 1.1, cy);
  ctx.lineTo(cx - r * 0.7, cy + r);
  ctx.closePath();
  ctx.fill();

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(OUT_DIR, `icon${size}.png`), buffer);
  console.log(`✓ icons/icon${size}.png`);
}

console.log('MoviePlay icons ready');
