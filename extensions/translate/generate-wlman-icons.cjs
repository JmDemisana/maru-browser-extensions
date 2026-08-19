const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const SIZES = [16, 48, 128];
const OUT_DIR = path.join(__dirname, 'icons');

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR);

for (const size of SIZES) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#065f46';
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();

  // Inner glow
  ctx.fillStyle = '#10b981';
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.44, 0, Math.PI * 2);
  ctx.fill();

  // Wi-Fi signal icon
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(1.5, size * 0.08);
  ctx.lineCap = 'round';

  const cx = size / 2;
  const cy = size * 0.65;

  // Arc 1 (outer)
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.35, Math.PI * 1.25, Math.PI * 1.75);
  ctx.stroke();

  // Arc 2 (middle)
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.22, Math.PI * 1.25, Math.PI * 1.75);
  ctx.stroke();

  // Dot (center)
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.07, 0, Math.PI * 2);
  ctx.fill();

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(OUT_DIR, `icon${size}.png`), buffer);
  console.log(`✓ icons/icon${size}.png`);
}

console.log('WLMan icons ready');
