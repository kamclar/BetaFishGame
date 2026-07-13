export const fishRenderScale = 0.42;

import { drawFishSprites } from "./spriteAssets.js";

export function drawFish(ctx, item, options) {
  const { palette, getActiveSymptoms, selectedFish } = options;
  const colors = palette[item.color];
  const scale = item.size * (item.growthScale ?? 1) * fishRenderScale;
  const dir = item.dir;
  const wave = Math.round(Math.sin(item.phase) * 2);
  const activeSymptoms = getActiveSymptoms(item);
  const isWeak = (item.visibleHealth ?? item.health) < 62;

  ctx.save();
  ctx.translate(item.x, item.y);
  ctx.scale(dir * scale, scale);
  // Modular parts are opaque masks. Weakness is expressed by symptoms and
  // movement; reducing alpha made the aquarium background show through them.
  if (isWeak && item.specialSprite) ctx.globalAlpha = 0.72;

  const spriteDrawn = drawFishSprites(ctx, item, { activeSymptoms, palette });
  if (!spriteDrawn) {
    drawTail(ctx, item.tail, colors, wave, activeSymptoms);
    drawPixelBody(ctx, colors);
    drawPattern(ctx, item.pattern, colors);
    drawSymptoms(ctx, item, activeSymptoms);
    drawPixelEye(ctx, activeSymptoms, colors);
    drawPixelFins(ctx, colors, activeSymptoms);
    drawHealthOverlays(ctx, item, activeSymptoms);
  }

  if (selectedFish && selectedFish.id === item.id) {
    const glow = ctx.createRadialGradient(0, 0, 8, 0, 0, 50);
    glow.addColorStop(0, "rgba(212, 180, 95, 0.22)");
    glow.addColorStop(1, "rgba(212, 180, 95, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 50, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(212, 180, 95, 0.9)";
    ctx.beginPath();
    ctx.moveTo(-5, -34);
    ctx.lineTo(5, -34);
    ctx.lineTo(0, -27);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

function drawTail(ctx, type, colors, wave, activeSymptoms) {
  const clamp = activeSymptoms.includes("clampedFins") ? 0.45 : 1;
  const top = Math.round((-12 + wave) * clamp);
  const bottom = Math.round((12 - wave) * clamp);
  const rootX = -28;
  ctx.fillStyle = colors[1];

  if (type === "fork") {
    rects(ctx, [
      [rootX - 3, -4, 7, 8],
      [rootX - 12, top + 2, 11, 6],
      [rootX - 23, top - 2, 13, 6],
      [rootX - 14, -3, 12, 6],
      [rootX - 12, bottom - 8, 11, 6],
      [rootX - 23, bottom - 4, 13, 6],
    ]);
    ctx.fillStyle = colors[2];
    rects(ctx, [
      [rootX - 20, top + 1, 6, 2],
      [rootX - 20, bottom - 3, 6, 2],
    ]);
    return;
  }

  if (type === "veil") {
    rects(ctx, [
      [rootX - 3, -5, 7, 10],
      [rootX - 12, -9, 11, 18],
      [rootX - 22, -13, 12, 26],
      [rootX - 31, -16, 11, 32],
      [rootX - 38, -12, 9, 24],
      [rootX - 44, -7, 7, 14],
    ]);
    ctx.fillStyle = colors[2];
    rects(ctx, [
      [rootX - 28, -9, 7, 2],
      [rootX - 34, 0, 8, 2],
      [rootX - 28, 8, 7, 2],
    ]);
    return;
  }

  rects(ctx, [
    [rootX - 3, -5, 7, 10],
    [rootX - 12, top + 1, 11, 8],
    [rootX - 23, top - 1, 11, 10],
    [rootX - 12, bottom - 9, 11, 8],
    [rootX - 23, bottom - 9, 11, 10],
    [rootX - 28, -4, 9, 8],
  ]);
  ctx.fillStyle = colors[2];
  ctx.fillRect(rootX - 22, top + 3, 6, 2);
  ctx.fillRect(rootX - 22, bottom - 5, 6, 2);
}

function drawPixelBody(ctx, colors) {
  ctx.fillStyle = colors[1];
  rects(ctx, [
    [-26, -10, 16, 20],
    [-18, -14, 28, 28],
    [2, -11, 24, 22],
    [21, -7, 12, 14],
  ]);

  ctx.fillStyle = colors[0];
  rects(ctx, [
    [-22, -9, 16, 18],
    [-14, -13, 26, 26],
    [4, -10, 20, 20],
    [20, -5, 10, 10],
  ]);

  ctx.fillStyle = colors[2];
  rects(ctx, [
    [-14, -12, 20, 4],
    [6, -9, 12, 3],
    [-17, 8, 22, 4],
  ]);
}

function drawPixelFins(ctx, colors, activeSymptoms) {
  ctx.fillStyle = colors[1];
  if (activeSymptoms.includes("clampedFins")) {
    rects(ctx, [
      [-2, -9, 12, 4],
      [-1, 10, 10, 4],
    ]);
    return;
  }

  rects(ctx, [
    [-7, -19, 8, 5],
    [0, -18, 13, 6],
    [4, -15, 8, 5],
    [-4, 14, 12, 5],
    [5, 16, 10, 5],
  ]);
  ctx.fillStyle = colors[2];
  rects(ctx, [
    [1, -17, 7, 2],
    [4, 16, 7, 2],
  ]);
}

function drawPixelEye(ctx, activeSymptoms, colors) {
  ctx.fillStyle = colors[2];
  ctx.fillRect(14, -8, 7, 7);
  ctx.fillStyle = "#071011";
  ctx.fillRect(17, -6, 3, 3);
  ctx.fillStyle = "#f6fff9";
  ctx.fillRect(18, -6, 1, 1);
  if (activeSymptoms.includes("cloudyEye")) {
    ctx.fillStyle = "rgba(235, 245, 240, 0.75)";
    ctx.fillRect(14, -8, 7, 7);
  }
}

function drawPattern(ctx, type, colors) {
  if (type === "spots") {
    ctx.fillStyle = colors[1];
    rects(ctx, [
      [-15, -5, 7, 6],
      [-4, 4, 8, 5],
      [8, -4, 6, 5],
      [15, 3, 5, 4],
    ]);
    ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
    rects(ctx, [
      [-14, -5, 3, 2],
      [-3, 4, 3, 2],
    ]);
  }

  if (type === "stripe") {
    ctx.fillStyle = colors[2];
    rects(ctx, [
      [-15, -11, 4, 22],
      [-3, -13, 4, 24],
      [10, -9, 4, 18],
    ]);
  }

  if (type === "glow") {
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = "#92f1d3";
    rects(ctx, [
      [-18, -2, 32, 3],
      [1, -13, 4, 26],
      [15, -4, 4, 8],
    ]);
    ctx.globalAlpha = 1;
  }
}

function drawSymptoms(ctx, item, activeSymptoms) {
  if (!activeSymptoms.includes("whiteSpots")) return;
  const ichCase = item.diseases.find((diseaseCase) => diseaseCase.id === "whiteIch");
  const spotCount = ichCase && ichCase.severity > 34 ? 9 : 3;
  const spots = [
    [-13, -10, 3],
    [-2, -12, 3],
    [9, -8, 2],
    [-20, -3, 2],
    [-7, 4, 2],
    [3, 8, 2],
    [15, 2, 2],
    [-24, 8, 2],
    [20, -5, 2],
  ];
  ctx.fillStyle = "#f2f7ec";
  for (let i = 0; i < spotCount; i += 1) {
    const [x, y, size] = spots[i];
    ctx.fillRect(x, y, size, size);
  }
}

function drawHealthOverlays(ctx, item, activeSymptoms) {
  if (activeSymptoms.includes("paleGills")) {
    ctx.fillStyle = "#d7c3bd";
    ctx.fillRect(18, -5, 3, 12);
  }

  if (activeSymptoms.includes("fastBreathing")) {
    ctx.strokeStyle = "rgba(232, 245, 240, 0.5)";
    ctx.lineWidth = 1;
    const breath = Math.sin(item.phase * 4) * 2;
    ctx.beginPath();
    ctx.arc(24 + breath, 1, 5, -0.7, 0.7);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(29 + breath, 1, 8, -0.6, 0.6);
    ctx.stroke();
  }

  if (activeSymptoms.includes("scratching")) {
    ctx.strokeStyle = "#d6b07a";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-8, 18);
    ctx.lineTo(10, 20);
    ctx.moveTo(-3, 22);
    ctx.lineTo(17, 23);
    ctx.stroke();
  }
}

function rects(ctx, items) {
  for (const [x, y, width, height] of items) {
    ctx.fillRect(x, y, width, height);
  }
}
