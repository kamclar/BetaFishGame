import { fishSpriteParts, speciesSpriteDefaults, spriteConfig } from "./assetManifest.js";

const cache = new Map();
const tintedCache = new Map();
const clippedPatternCache = new Map();

export function loadFishSpriteAssets() {
  const files = collectFishSpriteFiles();
  for (const file of files) {
    const image = new Image();
    image.src = `${spriteConfig.basePath}/${file}.png`;
    cache.set(file, image);
  }
}

export function hasLoadedFishSprites() {
  for (const image of cache.values()) {
    if (!image.complete || image.naturalWidth === 0) return false;
  }
  return cache.size > 0;
}

export function drawFishSprites(ctx, item, options) {
  if (!hasLoadedFishSprites()) return false;

  const { activeSymptoms } = options;
  if (item.specialSprite) {
    const file = fishSpriteParts.special[item.specialSprite];
    const image = cache.get(file);
    if (!image || !image.complete || image.naturalWidth === 0) return false;
    const frameCount = Math.max(1, Math.floor(image.naturalWidth / spriteConfig.frameWidth));
    const animationSpeed = item.spriteAnimationSpeed ?? 1;
    const frame = Math.floor(item.phase * animationSpeed) % frameCount;
    ctx.drawImage(image, frame * spriteConfig.frameWidth, 0, spriteConfig.frameWidth, spriteConfig.frameHeight,
      -spriteConfig.frameWidth / 2, -spriteConfig.frameHeight / 2, spriteConfig.frameWidth, spriteConfig.frameHeight);
    return true;
  }
  const defaults = speciesSpriteDefaults[item.species] || speciesSpriteDefaults["Sklenena strelka"];
  const frame = Math.floor(item.phase * 2) % spriteConfig.frameCount;
  const finsKey = activeSymptoms.includes("clampedFins") ? "clamped" : defaults.fins;
  const bodyFile = fishSpriteParts.body[defaults.body];
  const layers = [
    { file: fishSpriteParts.tail[item.tail], tint: "shadow", frame },
    { file: bodyFile, tint: "base", frame },
    { file: fishSpriteParts.fins[finsKey], tint: "shadow", frame: 0 },
    { file: fishSpriteParts.pattern[item.pattern], tint: null, frame: 0, clipTo: bodyFile },
    ...activeSymptoms.map((symptomId) => ({ file: fishSpriteParts.symptoms[symptomId], tint: null, frame, clipTo: bodyFile })),
  ].filter((layer) => layer.file);

  for (const layer of layers) {
    const image = layer.clipTo
      ? getClippedLayer(layer.file, layer.clipTo, layer.frame)
      : getTintedLayer(layer.file, layer.tint, options.palette[item.color]);
    if (!image) return false;
    ctx.drawImage(
      image,
      layer.clipTo ? 0 : layer.frame * spriteConfig.frameWidth,
      0,
      spriteConfig.frameWidth,
      spriteConfig.frameHeight,
      -spriteConfig.frameWidth / 2,
      -spriteConfig.frameHeight / 2,
      spriteConfig.frameWidth,
      spriteConfig.frameHeight
    );
  }

  return true;
}

function getClippedLayer(file, bodyFile, frame) {
  const pattern = cache.get(file);
  const body = cache.get(bodyFile);
  if (!pattern || !body || !pattern.complete || !body.complete) return null;
  if (pattern.naturalWidth === 0 || body.naturalWidth === 0) return null;

  const key = `${file}:${bodyFile}:${frame}`;
  if (clippedPatternCache.has(key)) return clippedPatternCache.get(key);

  const canvas = document.createElement("canvas");
  canvas.width = spriteConfig.frameWidth;
  canvas.height = spriteConfig.frameHeight;
  const ctx = canvas.getContext("2d");
  const sx = frame * spriteConfig.frameWidth;

  ctx.drawImage(pattern, sx, 0, spriteConfig.frameWidth, spriteConfig.frameHeight, 0, 0, spriteConfig.frameWidth, spriteConfig.frameHeight);
  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(body, sx, 0, spriteConfig.frameWidth, spriteConfig.frameHeight, 0, 0, spriteConfig.frameWidth, spriteConfig.frameHeight);
  ctx.globalCompositeOperation = "source-over";

  clippedPatternCache.set(key, canvas);
  return canvas;
}

function getTintedLayer(file, tint, colors) {
  if (!tint) {
    const image = cache.get(file);
    if (!image || !image.complete || image.naturalWidth === 0) return null;
    return image;
  }

  const source = cache.get(file);
  if (!source || !source.complete || source.naturalWidth === 0) return null;

  const key = `${file}:${colors.join("|")}`;
  if (tintedCache.has(key)) return tintedCache.get(key);

  const canvas = document.createElement("canvas");
  canvas.width = source.naturalWidth;
  canvas.height = source.naturalHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(source, 0, 0);
  recolorMaskPixels(ctx, canvas.width, canvas.height, colors);
  tintedCache.set(key, canvas);
  return canvas;
}

function recolorMaskPixels(ctx, width, height, colors) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  let changed = 0;
  const shadow = hexToRgb(colors[1]);
  const base = hexToRgb(colors[0]);
  const highlight = hexToRgb(colors[2]);

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha === 0) continue;

    const red = data[i];
    const green = data[i + 1];
    const blue = data[i + 2];
    const key = `${red},${green},${blue}`;
    const target = getPaletteReplacement(key, colors);
    if (!target) continue;

    data[i] = target.r;
    data[i + 1] = target.g;
    data[i + 2] = target.b;
    changed += 1;
  }

  if (changed === 0) {
    recolorByLuminance(data, shadow, base, highlight);
  }
  ctx.putImageData(imageData, 0, 0);
}

function recolorByLuminance(data, shadow, base, highlight) {
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha === 0) continue;

    const red = data[i];
    const green = data[i + 1];
    const blue = data[i + 2];
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const saturation = max === 0 ? 0 : (max - min) / max;
    if (saturation < 0.05 && max > 35) continue;

    const luminance = (red * 0.2126 + green * 0.7152 + blue * 0.0722) / 255;
    const target = mixThree(shadow, base, highlight, luminance);
    const detail = 0.7 + luminance * 0.58;
    data[i] = clamp(target.r * detail);
    data[i + 1] = clamp(target.g * detail);
    data[i + 2] = clamp(target.b * detail);
  }
}

function mixThree(shadow, base, highlight, t) {
  if (t < 0.5) return mixRgb(shadow, base, t / 0.5);
  return mixRgb(base, highlight, (t - 0.5) / 0.5);
}

function mixRgb(a, b, t) {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

function clamp(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function getPaletteReplacement(rgb, colors) {
  const map = {
    "64,64,64": colors[1],
    "128,128,128": colors[0],
    "192,192,192": colors[2],
    "48,48,48": colors[1],
    "160,160,160": colors[0],
    "224,224,224": colors[2],
  };
  const value = map[rgb];
  if (!value) return null;
  return hexToRgb(value);
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function collectFishSpriteFiles() {
  const files = new Set();

  for (const group of Object.values(fishSpriteParts)) {
    for (const file of Object.values(group)) {
      if (file) files.add(file);
    }
  }

  return [...files];
}
