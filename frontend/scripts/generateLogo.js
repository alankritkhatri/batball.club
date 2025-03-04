import { createCanvas } from "canvas";
import { writeFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function generateLogo(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  // Set background
  ctx.fillStyle = "#1a1b1e";
  ctx.fillRect(0, 0, size, size);

  // Draw cricket bat
  ctx.fillStyle = "#4a90e2";
  ctx.beginPath();
  ctx.moveTo(size * 0.3, size * 0.2);
  ctx.lineTo(size * 0.7, size * 0.2);
  ctx.lineTo(size * 0.6, size * 0.8);
  ctx.lineTo(size * 0.4, size * 0.8);
  ctx.closePath();
  ctx.fill();

  // Draw ball
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(size * 0.5, size * 0.4, size * 0.15, 0, Math.PI * 2);
  ctx.fill();

  // Draw seam
  ctx.strokeStyle = "#ff4444";
  ctx.lineWidth = size * 0.02;
  ctx.beginPath();
  ctx.arc(size * 0.5, size * 0.4, size * 0.1, 0, Math.PI * 2);
  ctx.stroke();

  return canvas;
}

// Generate logos in different sizes
const sizes = {
  favicon: 64,
  logo192: 192,
  logo512: 512,
};

Object.entries(sizes).forEach(([name, size]) => {
  const canvas = generateLogo(size);
  const buffer = canvas.toBuffer("image/png");
  writeFileSync(join(__dirname, "..", "public", `${name}.png`), buffer);
});

// Generate main logo
const mainLogo = generateLogo(512);
const buffer = mainLogo.toBuffer("image/png");
writeFileSync(
  join(__dirname, "..", "public", "images", "batball-logo.png"),
  buffer
);

console.log("Logo files generated successfully!");
