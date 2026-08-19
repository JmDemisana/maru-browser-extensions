// generate-icons.js
// Run with: node generate-icons.js
// Requires: npm install canvas
// OR just use the JPG image from the artifact dir resized manually.

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
  ctx.fillStyle = '#1a237e';
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();

  // Inner circle
  ctx.fillStyle = '#283593';
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.42, 0, Math.PI * 2);
  ctx.fill();

  // Text "文A"
  ctx.fillStyle = '#ffffff';
  const fz = Math.round(size * 0.38);
  ctx.font = `bold ${fz}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('文', size * 0.42, size * 0.46);

  const fz2 = Math.round(size * 0.22);
  ctx.font = `bold ${fz2}px sans-serif`;
  ctx.fillText('A', size * 0.68, size * 0.65);

  const buffer = canvas.toBuffer('image/png');
  const outPath = path.join(OUT_DIR, `icon${size}.png`);
  fs.writeFileSync(outPath, buffer);
  console.log(`✓ icons/icon${size}.png`);
}

console.log('Done! Icons written to ./icons/');
