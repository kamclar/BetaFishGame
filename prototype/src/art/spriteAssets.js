import { fishSpriteParts, speciesSpriteDefaults, spriteConfig } from "./assetManifest.js";
import { attachmentOffset, bodyAnatomy, dorsalFinAnatomy, tailAnatomy, ventralFinAnatomy } from "./fishAnatomy.js";

const cache = new Map();
const tintedCache = new Map();
const clippedPatternCache = new Map();
const proceduralPatternCache = new Map();
const patternAccents = ["#f2c14e", "#f26d4f", "#42d6c5", "#7657e8", "#e64f9b", "#4f8ff2"];

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
    const image = item.specialSprite === "cthulhu"
      ? getTintedLayer(file, "base", options.palette[item.color])
      : cache.get(file);
    const imageWidth = image?.naturalWidth ?? image?.width ?? 0;
    if (!image || image.complete === false || imageWidth === 0) return false;
    const frameCount = Math.max(1, Math.floor(imageWidth / spriteConfig.frameWidth));
    const animationSpeed = item.spriteAnimationSpeed ?? 1;
    const frame = Math.floor(item.phase * animationSpeed) % frameCount;
    ctx.drawImage(image, frame * spriteConfig.frameWidth, 0, spriteConfig.frameWidth, spriteConfig.frameHeight,
      -spriteConfig.frameWidth / 2, -spriteConfig.frameHeight / 2, spriteConfig.frameWidth, spriteConfig.frameHeight);
    return true;
  }
  const defaults = speciesSpriteDefaults[item.species] || speciesSpriteDefaults["Sklenena strelka"];
  const frame = Math.floor(item.phase * 2) % spriteConfig.frameCount;
  const finsKey = activeSymptoms.includes("clampedFins") ? "clamped" : defaults.fins;
  const body = bodyAnatomy[item.body ?? defaults.body] ?? bodyAnatomy.slender;
  const tail = tailAnatomy[item.tail] ?? tailAnatomy.short;
  const dorsalFin = dorsalFinAnatomy[item.dorsalFin ?? finsKey] ?? dorsalFinAnatomy.normal;
  const ventralFin = ventralFinAnatomy[item.ventralFin ?? finsKey] ?? ventralFinAnatomy.normal;
  const advancedEldritch = (item.eldritchStage ?? 0) >= 4;
  const colors = options.palette[item.color];
  const tailScale = tail.scale * body.partScales.tail * (advancedEldritch ? 1.28 : 1);
  if (!drawAttachedPart(ctx, tail.file, "shadow", frame, body.anchors.tail, tail.socket, tailScale, colors)) return false;
  if (item.pattern === "eyespot"
    && !drawTailEyespot(ctx, tail.file, frame, body.anchors.tail, tail.socket, tailScale, item, colors)) return false;
  // Attachment roots belong behind the body. Drawing the body last hides the
  // hard socket edges and makes the independently animated parts read as one fish.
  if (!drawAttachedPart(ctx, dorsalFin.file, "shadow", frame, body.anchors.dorsal, dorsalFin.socket, dorsalFin.scale * body.partScales.dorsal * (advancedEldritch ? 1.18 : 1), colors)) return false;
  if (!drawAttachedPart(ctx, ventralFin.file, "shadow", frame, body.anchors.ventral, ventralFin.socket, ventralFin.scale * body.partScales.ventral * (advancedEldritch ? 1.75 : 1), colors)) return false;
  if (!drawAttachedPart(ctx, body.file, "base", 0, [0, 0], [0, 0], body.scale, colors)) return false;

  if (item.pattern && item.pattern !== "plain") {
    const pattern = getProceduralPattern(body.file, item, colors);
    if (!pattern) return false;
    ctx.drawImage(pattern, 0, 0, spriteConfig.frameWidth, spriteConfig.frameHeight,
      -spriteConfig.frameWidth / 2, -spriteConfig.frameHeight / 2, spriteConfig.frameWidth, spriteConfig.frameHeight);
  }

  const overlays = [
    ...activeSymptoms.map((symptomId) => ({ file: fishSpriteParts.symptoms[symptomId], frame })),
  ].filter((layer) => layer.file);
  for (const layer of overlays) {
    const image = getClippedLayer(layer.file, body.file, layer.frame);
    if (!image) return false;
    ctx.drawImage(image, 0, 0, spriteConfig.frameWidth, spriteConfig.frameHeight,
      -spriteConfig.frameWidth / 2, -spriteConfig.frameHeight / 2, spriteConfig.frameWidth, spriteConfig.frameHeight);
  }

  return true;
}

function getProceduralPattern(bodyFile, item, colors) {
  const body = cache.get(bodyFile);
  if (!body || !body.complete || body.naturalWidth === 0) return null;
  const type = item.pattern ?? "plain";
  const seed = `${item.id ?? item.name ?? "fish"}:${item.genotype?.pattern?.join("|") ?? type}`;
  const key = `${bodyFile}:${type}:${seed}:${colors.join("|")}`;
  if (proceduralPatternCache.has(key)) return proceduralPatternCache.get(key);

  const canvas = document.createElement("canvas");
  canvas.width = spriteConfig.frameWidth;
  canvas.height = spriteConfig.frameHeight;
  const patternCtx = canvas.getContext("2d");
  const pixels = patternCtx.createImageData(canvas.width, canvas.height);
  const dark = hexToRgb(colors[1]);
  const light = hexToRgb(colors[2]);
  const seedNumber = hashString(seed);
  const accent = hexToRgb(patternAccents[seedNumber % patternAccents.length]);
  const spots = createPatternSpots(seedNumber);
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      // The face remains readable even on fish with very dense markings.
      if (x < 11 || x > 70 + Math.round(hashNoise(y, 3, seedNumber) * 3)) continue;
      const broad = valueNoise(x / 18, y / 15, seedNumber);
      const detail = valueNoise(x / 8, y / 7, seedNumber + 7919);
      const noise = broad * 0.78 + detail * 0.22;
      const sample = proceduralPatternSample(type, x, y, noise, seedNumber, spots, dark, light, accent);
      if (!sample) continue;
      const offset = (y * canvas.width + x) * 4;
      pixels.data[offset] = sample.color.r;
      pixels.data[offset + 1] = sample.color.g;
      pixels.data[offset + 2] = sample.color.b;
      pixels.data[offset + 3] = sample.alpha;
    }
  }
  patternCtx.putImageData(pixels, 0, 0);
  patternCtx.globalCompositeOperation = "destination-in";
  patternCtx.drawImage(body, 0, 0, spriteConfig.frameWidth, spriteConfig.frameHeight, 0, 0, spriteConfig.frameWidth, spriteConfig.frameHeight);
  patternCtx.globalCompositeOperation = "source-over";
  proceduralPatternCache.set(key, canvas);
  return canvas;
}

function proceduralPatternSample(type, x, y, noise, seed, spots, dark, light, accent) {
  if (type === "spots") {
    const spot = spots.find((candidate) => {
      const dx = (x - candidate.x) / candidate.rx;
      const dy = (y - candidate.y) / candidate.ry;
      const edgeNoise = hashNoise(x + candidate.index * 7, y, seed) * 0.28;
      return dx * dx + dy * dy <= 0.86 + edgeNoise;
    });
    if (!spot) return null;
    const normalizedY = (y - spot.y) / spot.ry;
    const color = normalizedY > 0.18 ? dark : (spot.light ? light : accent);
    return { color, alpha: normalizedY > 0.18 ? 225 : 210 };
  }
  if (type === "stripe") {
    const spacing = 9 + seed % 4;
    const slope = ((seed >>> 5) % 7) - 3;
    const warp = (valueNoise(x / 13, y / 9, seed + 313) - 0.5) * 8
      + Math.sin(y * 0.22 + seed * 0.01) * 2.3;
    const phase = positiveModulo(x + y * slope * 0.14 + warp + seed % spacing, spacing);
    const width = 1.15 + noise * 1.65;
    const faded = valueNoise(x / 7, y / 6, seed + 1877) < 0.2;
    return phase < width && !faded ? { color: dark, alpha: 195 + Math.round(noise * 30) } : null;
  }
  if (type === "bands") {
    const spacing = 15 + seed % 5;
    const irregularX = x + (noise - 0.5) * 7 + Math.sin(y * 0.24 + seed) * 1.8;
    const phase = positiveModulo(irregularX + seed % spacing, spacing);
    return phase < 6 ? { color: phase < 1.3 ? light : accent, alpha: phase < 1.3 ? 180 : 220 } : null;
  }
  if (type === "blotches" || type === "koi") {
    if (noise > 0.57) return { color: type === "koi" ? accent : dark, alpha: Math.min(225, 105 + Math.round((noise - 0.57) * 760)) };
    if (type === "koi" && noise < 0.29) return { color: light, alpha: 185 };
    return null;
  }
  if (type === "reticulated") {
    return isScaleArc(x, y, seed) ? { color: dark, alpha: 145 } : null;
  }
  if (type === "zoned") {
    const frontBoundary = 54 + Math.sin(y * 0.31 + seed) * 3;
    const rearBoundary = 27 + Math.sin(y * 0.27 + seed * 0.01) * 4;
    if (x > frontBoundary) return { color: light, alpha: 195 };
    if (x < rearBoundary) return { color: accent, alpha: 215 };
    return null;
  }
  if (type === "maze") {
    const field = Math.sin(x * 0.29 + Math.sin(y * 0.21) * 2.2 + seed)
      + Math.sin(y * 0.34 + Math.sin(x * 0.17 + seed) * 1.8);
    return Math.abs(field) < 0.28 ? { color: light, alpha: 210 } : null;
  }
  if (type === "eyespot") {
    return eyespotSample(x, y, seed, dark, light, accent);
  }
  if (type === "glow") {
    const wave = Math.abs(positiveModulo(x + Math.sin(y * 0.31 + seed) * 4, 12) - 6);
    return wave < 1.15 ? { color: light, alpha: 225 } : null;
  }
  return null;
}

function createPatternSpots(seed) {
  const count = 8 + seed % 5;
  return Array.from({ length: count }, (_, index) => ({
    index,
    x: 12 + hashNoise(index, 11, seed) * 38,
    y: 16 + hashNoise(index, 23, seed) * 32,
    rx: 2.2 + hashNoise(index, 37, seed) * 1.8,
    ry: 1.8 + hashNoise(index, 41, seed) * 1.4,
    light: hashNoise(index, 53, seed) > 0.62,
  }));
}

function eyespotGeometry(seed) {
  return { x: 1 + seed % 5, y: 29 + (seed >>> 4) % 7, inner: 3.4, middle: 7.4, outer: 10.8 };
}

function eyespotSample(x, y, seed, dark, light, accent) {
  const eye = eyespotGeometry(seed);
  const distance = Math.hypot(x - eye.x, y - eye.y);
  const pupil = { r: 12, g: 15, b: 20 };
  if (distance < eye.inner) {
    const glint = Math.hypot(x - (eye.x - 1.2), y - (eye.y - 1.2)) < 0.9;
    return { color: glint ? light : pupil, alpha: 248 };
  }
  if (distance < eye.middle) return { color: accent, alpha: 238 };
  if (distance < eye.outer) return { color: pupil, alpha: 242 };
  return null;
}

function drawTailEyespot(ctx, file, frame, anchor, socket, scale, item, colors) {
  const image = getTailEyespotLayer(file, frame, anchor, socket, scale, item, colors);
  if (!image) return false;
  const offset = attachmentOffset(anchor, socket, scale);
  ctx.drawImage(image, 0, 0, spriteConfig.frameWidth, spriteConfig.frameHeight,
    -spriteConfig.frameWidth / 2 + offset.x,
    -spriteConfig.frameHeight / 2 + offset.y,
    spriteConfig.frameWidth * scale,
    spriteConfig.frameHeight * scale);
  return true;
}

function getTailEyespotLayer(file, frame, anchor, socket, scale, item, colors) {
  const tail = cache.get(file);
  if (!tail || !tail.complete || tail.naturalWidth === 0) return null;
  const seedText = `${item.id ?? item.name ?? "fish"}:${item.genotype?.pattern?.join("|") ?? "eyespot"}`;
  const seed = hashString(seedText);
  const key = `tail-eye:${file}:${frame}:${anchor.join(",")}:${scale.toFixed(3)}:${seed}:${colors.join("|")}`;
  if (proceduralPatternCache.has(key)) return proceduralPatternCache.get(key);
  const canvas = document.createElement("canvas");
  canvas.width = spriteConfig.frameWidth;
  canvas.height = spriteConfig.frameHeight;
  const layerCtx = canvas.getContext("2d");
  const pixels = layerCtx.createImageData(canvas.width, canvas.height);
  const dark = hexToRgb(colors[1]);
  const light = hexToRgb(colors[2]);
  const accent = hexToRgb(patternAccents[seed % patternAccents.length]);
  const offset = attachmentOffset(anchor, socket, scale);
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const sample = eyespotSample(offset.x + x * scale, offset.y + y * scale, seed, dark, light, accent);
      if (!sample) continue;
      const pixel = (y * canvas.width + x) * 4;
      pixels.data[pixel] = sample.color.r;
      pixels.data[pixel + 1] = sample.color.g;
      pixels.data[pixel + 2] = sample.color.b;
      pixels.data[pixel + 3] = sample.alpha;
    }
  }
  layerCtx.putImageData(pixels, 0, 0);
  layerCtx.globalCompositeOperation = "destination-in";
  layerCtx.drawImage(tail, frame * spriteConfig.frameWidth, 0, spriteConfig.frameWidth, spriteConfig.frameHeight,
    0, 0, spriteConfig.frameWidth, spriteConfig.frameHeight);
  layerCtx.globalCompositeOperation = "source-over";
  proceduralPatternCache.set(key, canvas);
  return canvas;
}

function isScaleArc(x, y, seed) {
  const spacingX = 6.4;
  const spacingY = 5.1;
  const approximateRow = Math.round((y - 13) / spacingY);
  for (let row = approximateRow - 1; row <= approximateRow + 1; row += 1) {
    const rowJitter = (hashNoise(row, 71, seed) - 0.5) * 1.25;
    const centerY = 13 + row * spacingY + rowJitter;
    const stagger = positiveModulo(row, 2) * spacingX * 0.5;
    const approximateColumn = Math.round((x - 14 - stagger) / spacingX);
    for (let column = approximateColumn - 1; column <= approximateColumn + 1; column += 1) {
      const jitterX = (hashNoise(column, row, seed + 991) - 0.5) * 1.4;
      const jitterY = (hashNoise(column, row, seed + 1871) - 0.5) * 0.8;
      const centerX = 14 + stagger + column * spacingX + jitterX;
      const dx = (x - centerX) / (3.25 + hashNoise(column, row, seed + 43) * 0.55);
      const dy = (y - centerY - jitterY) / (2.65 + hashNoise(column, row, seed + 79) * 0.5);
      const radius = Math.hypot(dx, dy);
      if (dy > -0.72 && Math.abs(radius - 1) < 0.16) return true;
    }
  }
  return false;
}

function positiveModulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

function valueNoise(x, y, seed) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = smoothStep(x - x0);
  const ty = smoothStep(y - y0);
  const top = mixValue(hashNoise(x0, y0, seed), hashNoise(x0 + 1, y0, seed), tx);
  const bottom = mixValue(hashNoise(x0, y0 + 1, seed), hashNoise(x0 + 1, y0 + 1, seed), tx);
  return mixValue(top, bottom, ty);
}

function hashNoise(x, y, seed) {
  let value = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + seed) | 0;
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

function hashString(text) {
  let hash = 2166136261;
  for (const char of text) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return hash >>> 0;
}

function smoothStep(value) {
  return value * value * (3 - 2 * value);
}

function mixValue(a, b, amount) {
  return a + (b - a) * amount;
}

function drawAttachedPart(ctx, file, tint, frame, anchor, socket, scale, colors) {
  const image = getTintedLayer(file, tint, colors);
  if (!image) return false;
  const offset = attachmentOffset(anchor, socket, scale);
  ctx.drawImage(image, frame * spriteConfig.frameWidth, 0, spriteConfig.frameWidth, spriteConfig.frameHeight,
    -spriteConfig.frameWidth / 2 + offset.x,
    -spriteConfig.frameHeight / 2 + offset.y,
    spriteConfig.frameWidth * scale,
    spriteConfig.frameHeight * scale);
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
  const shadow = hexToRgb(colors[1]);
  const base = hexToRgb(colors[0]);
  const highlight = hexToRgb(colors[2]);

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha === 0) continue;

    const red = data[i];
    const green = data[i + 1];
    const blue = data[i + 2];
    if (red >= 250 && green >= 250 && blue >= 250) continue;
    const key = `${red},${green},${blue}`;
    const target = getPaletteReplacement(key, colors);
    if (target) {
      data[i] = target.r;
      data[i + 1] = target.g;
      data[i + 2] = target.b;
      continue;
    }

    const luminance = (red * 0.2126 + green * 0.7152 + blue * 0.0722) / 255;
    // Preserve the almost-black pixel outline; tint every other source shade,
    // including the slightly blue-gray pixels present in the fin sprites.
    if (luminance <= 0.045) continue;
    const mapped = mixThree(shadow, base, highlight, luminance);
    const detail = 0.7 + luminance * 0.58;
    data[i] = clamp(mapped.r * detail);
    data[i + 1] = clamp(mapped.g * detail);
    data[i + 2] = clamp(mapped.b * detail);
  }
  ctx.putImageData(imageData, 0, 0);
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
    "38,38,38": colors[1],
    "92,92,92": colors[1],
    "166,166,166": colors[0],
    "236,236,236": colors[2],
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
