import { fishSpriteParts, speciesSpriteDefaults, spriteConfig } from "./assetManifest.js";
import { attachmentOffset, bodyAnatomy, dorsalFinAnatomy, tailAnatomy, ventralFinAnatomy } from "./fishAnatomy.js";
import { eelVisualAnimationConfig } from "../config/fishConfig.js";

const cache = new Map();
const tintedCache = new Map();
const clippedPatternCache = new Map();
const proceduralPatternCache = new Map();
const wholeFishBoundsCache = new Map();
let eelRenderCanvas = null;
let wholeFishRenderCanvas = null;
let wholeFishOverlayCanvas = null;

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
  if (item.specialSprite) return drawFishSpritesFlat(ctx, item, options);
  if (item.body !== "eel" && usesWholeFishPattern(item)) return drawFishWithWholeOverlay(ctx, item, options);
  if (item.body !== "eel") return drawFishSpritesFlat(ctx, item, options);
  if (!eelRenderCanvas) {
    eelRenderCanvas = document.createElement("canvas");
    eelRenderCanvas.width = 256;
    eelRenderCanvas.height = 112;
  }
  const eelCtx = eelRenderCanvas.getContext("2d");
  eelCtx.clearRect(0, 0, eelRenderCanvas.width, eelRenderCanvas.height);
  eelCtx.save();
  eelCtx.translate(eelRenderCanvas.width / 2, eelRenderCanvas.height / 2);
  const wholePattern = usesWholeFishPattern(item);
  const drawn = drawFishSpritesFlat(eelCtx, item, { ...options, wholePattern });
  eelCtx.restore();
  if (!drawn) return false;
  if (wholePattern) applyWholeFishOverlay(eelRenderCanvas, item, options.palette);

  const centerX = eelRenderCanvas.width / 2;
  const centerY = eelRenderCanvas.height / 2;
  const motion = eelVisualAnimationConfig;
  const motionPhase = item.phase * motion.phaseSpeed;
  for (let sourceX = 0; sourceX < eelRenderCanvas.width; sourceX += 1) {
    const localX = sourceX - centerX;
    const rearInfluence = Math.max(motion.minimumRearInfluence, Math.min(1, (42 - localX) / 92));
    const lateralWave = Math.sin(localX * motion.waveLength + motionPhase);
    const secondaryWave = Math.sin(localX * motion.waveLength * 0.48 + motionPhase * 0.62 + 1.8);
    const offsetY = lateralWave * motion.centerlineAmplitude * rearInfluence
      + secondaryWave * motion.secondaryAmplitude * rearInfluence;
    const sideExposure = Math.abs(Math.cos(localX * motion.waveLength + motionPhase));
    const travelingHighlight = Math.max(0, Math.cos(localX * motion.waveLength * 0.82 + motionPhase * 1.18));
    const profileScale = 1 - sideExposure * motion.profileCompression * rearInfluence;
    const destinationHeight = eelRenderCanvas.height * profileScale;
    const destinationY = -centerY + offsetY + (eelRenderCanvas.height - destinationHeight) / 2;
    ctx.drawImage(eelRenderCanvas, sourceX, 0, 1, eelRenderCanvas.height,
      localX, destinationY, 1, destinationHeight);
    if (travelingHighlight > motion.shimmerThreshold) {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = (travelingHighlight - motion.shimmerThreshold)
        / (1 - motion.shimmerThreshold) * motion.shimmerAlpha;
      ctx.drawImage(eelRenderCanvas, sourceX, 0, 1, eelRenderCanvas.height,
        localX, destinationY, 1, destinationHeight);
      ctx.restore();
    }
  }
  return true;
}

function drawFishWithWholeOverlay(ctx, item, options) {
  ensureWholeFishCanvases();
  const renderCtx = wholeFishRenderCanvas.getContext("2d");
  renderCtx.clearRect(0, 0, wholeFishRenderCanvas.width, wholeFishRenderCanvas.height);
  renderCtx.save();
  renderCtx.translate(wholeFishRenderCanvas.width / 2, wholeFishRenderCanvas.height / 2);
  const drawn = drawFishSpritesFlat(renderCtx, item, { ...options, wholePattern: true });
  renderCtx.restore();
  if (!drawn) return false;
  applyWholeFishOverlay(wholeFishRenderCanvas, item, options.palette);
  ctx.drawImage(wholeFishRenderCanvas,
    -wholeFishRenderCanvas.width / 2, -wholeFishRenderCanvas.height / 2);
  return true;
}

function ensureWholeFishCanvases() {
  if (!wholeFishRenderCanvas) {
    wholeFishRenderCanvas = document.createElement("canvas");
    wholeFishRenderCanvas.width = 192;
    wholeFishRenderCanvas.height = 112;
  }
  if (!wholeFishOverlayCanvas) {
    wholeFishOverlayCanvas = document.createElement("canvas");
    wholeFishOverlayCanvas.width = 192;
    wholeFishOverlayCanvas.height = 112;
  }
}

function applyWholeFishOverlay(renderCanvas, item, palette) {
  ensureWholeFishCanvases();
  if (wholeFishOverlayCanvas.width !== renderCanvas.width || wholeFishOverlayCanvas.height !== renderCanvas.height) {
    wholeFishOverlayCanvas.width = renderCanvas.width;
    wholeFishOverlayCanvas.height = renderCanvas.height;
  }
  const overlayCtx = wholeFishOverlayCanvas.getContext("2d");
  const renderCtx = renderCanvas.getContext("2d");
  const width = renderCanvas.width;
  const height = renderCanvas.height;
  overlayCtx.clearRect(0, 0, width, height);
  const colors = palette[item.patternColor] ?? palette[item.color] ?? palette.blue;
  const accentColors = palette[item.accentColor] ?? colors;
  const seed = hashString(`${item.id ?? item.name ?? "fish"}:whole-overlay`);
  const sourcePixels = renderCtx.getImageData(0, 0, width, height);
  const rawBounds = opaqueBounds(sourcePixels, width, height);
  const bounds = stableWholeFishBounds(item, rawBounds, width, height);
  if (!bounds) return;
  if (item.pattern && item.pattern !== "plain" && item.pattern !== "eyespot") {
    if (item.pattern === "spots") paintWholeFishGradient(overlayCtx, renderCanvas, bounds, colors, seed);
    else paintWholeFishPattern(overlayCtx, sourcePixels, width, height, bounds, item, colors, accentColors, seed);
    compositeWholeFishLayer(renderCtx, item.pattern === "spots" ? "overlay"
      : (item.pattern === "banner" || item.pattern === "neon") ? "source-over" : "hard-light",
    item.pattern === "spots" ? 0.78 : item.pattern === "banner" ? 0.9 : item.pattern === "neon" ? 0.94 : 0.84);
  }
  if (item.overlayPattern && item.overlayPattern !== "none") {
    overlayCtx.clearRect(0, 0, width, height);
    paintSecondaryPattern(overlayCtx, sourcePixels, width, height, bounds, item, colors, accentColors, seed);
    compositeWholeFishLayer(renderCtx, item.overlayPattern === "rainbow" ? "overlay" : "source-over",
      item.overlayPattern === "rainbow" ? 0.78 : 0.88);
  }
  if (item.finPattern === "edge") {
    overlayCtx.clearRect(0, 0, width, height);
    paintFinEdge(overlayCtx, sourcePixels, width, height, bounds, accentColors);
    compositeWholeFishLayer(renderCtx, "source-over", 0.9);
  }
}

function compositeWholeFishLayer(renderCtx, mode, alpha) {
  renderCtx.save();
  renderCtx.globalCompositeOperation = mode;
  renderCtx.globalAlpha = alpha;
  renderCtx.drawImage(wholeFishOverlayCanvas, 0, 0);
  renderCtx.restore();
}

function stableWholeFishBounds(item, rawBounds, canvasWidth, canvasHeight) {
  if (!rawBounds) return null;
  const key = [item.body, item.tail, item.dorsalFin, item.ventralFin].join(":");
  if (wholeFishBoundsCache.has(key)) return wholeFishBoundsCache.get(key);
  const padding = 3;
  const left = Math.max(0, rawBounds.left - padding);
  const right = Math.min(canvasWidth - 1, rawBounds.right + padding);
  const top = Math.max(0, rawBounds.top - padding);
  const bottom = Math.min(canvasHeight - 1, rawBounds.bottom + padding);
  const stable = { left, right, top, bottom, width: right - left + 1, height: bottom - top + 1 };
  wholeFishBoundsCache.set(key, stable);
  return stable;
}

function usesWholeFishPattern(item) {
  const mainPattern = item.pattern && item.pattern !== "plain" && item.pattern !== "eyespot";
  return Boolean(mainPattern || (item.overlayPattern && item.overlayPattern !== "none")
    || (item.finPattern && item.finPattern !== "none"));
}

function opaqueBounds(imageData, width, height) {
  let left = width, right = -1, top = height, bottom = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (imageData.data[(y * width + x) * 4 + 3] < 12) continue;
      left = Math.min(left, x); right = Math.max(right, x);
      top = Math.min(top, y); bottom = Math.max(bottom, y);
    }
  }
  return right < left ? null : { left, right, top, bottom, width: right - left + 1, height: bottom - top + 1 };
}

function paintWholeFishGradient(ctx, renderCanvas, bounds, colors, seed) {
  const vertical = (seed & 1) === 0;
  const gradient = vertical
    ? ctx.createLinearGradient(0, bounds.top, 0, bounds.bottom)
    : ctx.createLinearGradient(bounds.left, 0, bounds.right, 0);
  gradient.addColorStop(0, colors[1]);
  gradient.addColorStop(0.5, colors[0]);
  gradient.addColorStop(1, colors[2]);
  ctx.fillStyle = gradient;
  ctx.fillRect(bounds.left, bounds.top, bounds.width, bounds.height);
  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(renderCanvas, 0, 0);
  ctx.globalCompositeOperation = "source-over";
}

function paintWholeFishPattern(ctx, sourcePixels, width, height, bounds, item, colors, accentColors, seed) {
  const pixels = ctx.createImageData(width, height);
  const dark = hexToRgb(colors[1]);
  const light = hexToRgb(colors[2]);
  const accent = hexToRgb(accentColors[0]);
  for (let y = bounds.top; y <= bounds.bottom; y += 1) {
    for (let x = bounds.left; x <= bounds.right; x += 1) {
      const pixel = (y * width + x) * 4;
      const sourceAlpha = sourcePixels.data[pixel + 3];
      if (sourceAlpha < 12) continue;
      const localX = (x - bounds.left) / Math.max(1, bounds.width - 1) * 80;
      const localY = (y - bounds.top) / Math.max(1, bounds.height - 1) * 56;
      const broad = valueNoise(localX / 18, localY / 15, seed);
      const detail = valueNoise(localX / 8, localY / 7, seed + 7919);
      const sample = proceduralPatternSample(item.pattern, localX, localY,
        broad * 0.78 + detail * 0.22, seed, dark, light, accent);
      if (!sample) continue;
      pixels.data[pixel] = sample.color.r;
      pixels.data[pixel + 1] = sample.color.g;
      pixels.data[pixel + 2] = sample.color.b;
      pixels.data[pixel + 3] = Math.min(sourceAlpha, sample.alpha);
    }
  }
  ctx.putImageData(pixels, 0, 0);
}

function paintSecondaryPattern(ctx, sourcePixels, width, height, bounds, item, colors, accentColors, seed) {
  if (item.overlayPattern === "lateralLine") {
    paintNaturalLateralLine(ctx, sourcePixels, width, height, bounds, seed);
    return;
  }
  const pixels = ctx.createImageData(width, height);
  const dark = hexToRgb(colors[1]);
  const light = hexToRgb(colors[2]);
  const accent = hexToRgb(accentColors[0]);
  for (let y = bounds.top; y <= bounds.bottom; y += 1) {
    for (let x = bounds.left; x <= bounds.right; x += 1) {
      const pixel = (y * width + x) * 4;
      const sourceAlpha = sourcePixels.data[pixel + 3];
      if (sourceAlpha < 12) continue;
      const localX = (x - bounds.left) / Math.max(1, bounds.width - 1) * 80;
      const localY = (y - bounds.top) / Math.max(1, bounds.height - 1) * 56;
      const sample = secondaryPatternSample(item.overlayPattern, localX, localY, seed, dark, light, accent);
      if (!sample) continue;
      pixels.data[pixel] = sample.color.r;
      pixels.data[pixel + 1] = sample.color.g;
      pixels.data[pixel + 2] = sample.color.b;
      pixels.data[pixel + 3] = Math.min(sourceAlpha, sample.alpha);
    }
  }
  ctx.putImageData(pixels, 0, 0);
}

function paintNaturalLateralLine(ctx, sourcePixels, width, height, bounds, seed) {
  const pixels = ctx.createImageData(width, height);
  for (let x = bounds.left; x <= bounds.right; x += 1) {
    const run = longestOpaqueColumnRun(sourcePixels, width, x, bounds.top, bounds.bottom);
    if (!run || run.length < 3) continue;
    const localX = (x - bounds.left) / Math.max(1, bounds.width - 1) * 80;
    if (localX < 21 || localX > 66) continue;
    const progress = (localX - 21) / 45;
    const tailFade = smoothStep(Math.min(1, progress * 2.15));
    const gillFade = smoothStep(Math.min(1, (1 - progress) * 5.5));
    const segmentOffset = (hashNoise(Math.floor(localX / 13), 2, seed + 5303) - 0.5) * 0.8;
    const center = run.start + run.length * 0.53 + segmentOffset;
    const halfWidth = 0.52;
    const yStart = Math.max(run.start, Math.round(center));
    const yEnd = Math.min(run.end, yStart + (hashNoise(Math.floor(localX / 17), 7, seed) > 0.82 ? 1 : 0));
    for (let y = yStart; y <= yEnd; y += 1) {
      const pixel = (y * width + x) * 4;
      const sourceAlpha = sourcePixels.data[pixel + 3];
      if (sourceAlpha < 12) continue;
      const distance = Math.abs(y - center);
      if (distance > halfWidth) continue;
      const sourceLuminance = sourcePixels.data[pixel] * 0.2126
        + sourcePixels.data[pixel + 1] * 0.7152 + sourcePixels.data[pixel + 2] * 0.0722;
      const darkBody = sourceLuminance < 105;
      pixels.data[pixel] = darkBody ? 154 : 18;
      pixels.data[pixel + 1] = darkBody ? 190 : 27;
      pixels.data[pixel + 2] = darkBody ? 198 : 35;
      pixels.data[pixel + 3] = Math.min(sourceAlpha, Math.round((darkBody ? 112 : 142) * tailFade * gillFade));
    }
  }
  ctx.putImageData(pixels, 0, 0);
}

function longestOpaqueColumnRun(sourcePixels, width, x, top, bottom) {
  let best = null;
  let start = null;
  for (let y = top; y <= bottom + 1; y += 1) {
    const opaque = y <= bottom && sourcePixels.data[(y * width + x) * 4 + 3] >= 18;
    if (opaque && start == null) start = y;
    if (opaque || start == null) continue;
    const run = { start, end: y - 1, length: y - start };
    if (!best || run.length > best.length) best = run;
    start = null;
  }
  return best;
}

function secondaryPatternSample(type, x, y, seed, dark, light, accent) {
  const bodyDistance = ((x - 42) / 31) ** 2 + ((y - 28) / 18) ** 2;
  if (type === "rainbow") {
    if (bodyDistance > 1) return null;
    const rainbow = [
      { r: 244, g: 91, b: 70 }, { r: 245, g: 185, b: 55 },
      { r: 83, g: 210, b: 137 }, { r: 68, g: 190, b: 235 }, { r: 118, g: 98, b: 225 },
    ];
    const position = Math.max(0, Math.min(0.999, (x - 10) / 65)) * (rainbow.length - 1);
    const index = Math.floor(position);
    return { color: mixRgb(rainbow[index], rainbow[index + 1] ?? rainbow[index], position - index), alpha: 165 };
  }
  if (type === "shoulderPatch") {
    const dx = (x - 18) / 11;
    const dy = (y - 28) / 14;
    const irregular = (valueNoise(x / 8, y / 8, seed + 6101) - 0.5) * 0.24;
    return dx * dx + dy * dy < 0.9 + irregular ? { color: accent, alpha: 220 } : null;
  }
  if (type === "verticalWedges") {
    if (bodyDistance > 1.05) return null;
    const downward = Math.max(0, Math.min(1, (y - 10) / 40));
    const spread = 0.58 + downward * 0.8;
    const phase = positiveModulo((x + Math.sin(y * 0.16 + seed) * 1.5) / spread, 13);
    return phase < 4.2 ? { color: dark, alpha: 205 } : null;
  }
  return null;
}

function paintFinEdge(ctx, sourcePixels, width, height, bounds, accentColors) {
  const pixels = ctx.createImageData(width, height);
  const edgeColor = hexToRgb(accentColors[2]);
  for (let y = bounds.top + 1; y < bounds.bottom; y += 1) {
    for (let x = bounds.left + 1; x < bounds.right; x += 1) {
      const pixel = (y * width + x) * 4;
      const alpha = sourcePixels.data[pixel + 3];
      if (alpha < 35) continue;
      const localX = (x - bounds.left) / Math.max(1, bounds.width - 1) * 80;
      const localY = (y - bounds.top) / Math.max(1, bounds.height - 1) * 56;
      const bodyDistance = ((localX - 42) / 31) ** 2 + ((localY - 28) / 18) ** 2;
      if (bodyDistance < 0.96) continue;
      const neighborTransparent = sourcePixels.data[pixel - 4 + 3] < 20
        || sourcePixels.data[pixel + 4 + 3] < 20
        || sourcePixels.data[pixel - width * 4 + 3] < 20
        || sourcePixels.data[pixel + width * 4 + 3] < 20;
      if (!neighborTransparent) continue;
      pixels.data[pixel] = edgeColor.r;
      pixels.data[pixel + 1] = edgeColor.g;
      pixels.data[pixel + 2] = edgeColor.b;
      pixels.data[pixel + 3] = Math.min(alpha, 235);
    }
  }
  ctx.putImageData(pixels, 0, 0);
}

function drawFishSpritesFlat(ctx, item, options) {
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
  const bodyFrameCount = body.frameCount ?? 1;
  const bodyFrame = Math.floor(item.phase * (body.animationSpeed ?? 1)) % bodyFrameCount;
  const tailAnchor = bodyFrameAnchor(body, "tail", bodyFrame);
  const dorsalAnchor = bodyFrameAnchor(body, "dorsal", bodyFrame);
  const ventralAnchor = bodyFrameAnchor(body, "ventral", bodyFrame);
  const tail = tailAnatomy[item.tail] ?? tailAnatomy.short;
  const dorsalFin = dorsalFinAnatomy[item.dorsalFin ?? finsKey] ?? dorsalFinAnatomy.normal;
  const ventralFin = ventralFinAnatomy[item.ventralFin ?? finsKey] ?? ventralFinAnatomy.normal;
  const advancedEldritch = (item.eldritchStage ?? 0) >= 4;
  const colors = options.palette[item.color] ?? options.palette.blue;
  const patternColors = options.palette[item.patternColor] ?? colors;
  const accentColors = options.palette[item.accentColor] ?? colors;
  const tailScale = tail.scale * body.partScales.tail * (advancedEldritch ? 1.28 : 1);
  if (!drawAttachedPart(ctx, tail.file, "shadow", frame, tailAnchor, tail.socket, tailScale, accentColors, body.frameWidth)) return false;
  if (item.pattern === "eyespot"
    && !drawTailEyespot(ctx, tail.file, frame, tailAnchor, tail.socket, tailScale, item, patternColors, body.frameWidth)) return false;
  // Attachment roots belong behind the body. Drawing the body last hides the
  // hard socket edges and makes the independently animated parts read as one fish.
  const dorsalSocket = dorsalFin.frameSockets?.[frame] ?? dorsalFin.socket;
  if (!drawAttachedPart(ctx, dorsalFin.file, "shadow", frame, dorsalAnchor, dorsalSocket, dorsalFin.scale * body.partScales.dorsal * (advancedEldritch ? 1.18 : 1), accentColors, body.frameWidth)) return false;
  if (!drawAttachedPart(ctx, ventralFin.file, "shadow", frame, ventralAnchor, ventralFin.socket, ventralFin.scale * body.partScales.ventral * (advancedEldritch ? 1.75 : 1), accentColors, body.frameWidth)) return false;
  if (!drawBodyPart(ctx, body, bodyFrame, colors)) return false;

  if (item.pattern && item.pattern !== "plain" && !options.wholePattern) {
    const pattern = getProceduralPattern(body.file, item, patternColors);
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

function getProceduralPattern(bodyFile, item, patternColors) {
  const body = cache.get(bodyFile);
  if (!body || !body.complete || body.naturalWidth === 0) return null;
  const type = item.pattern ?? "plain";
  const seed = `${item.id ?? item.name ?? "fish"}:${item.genotype?.pattern?.join("|") ?? type}`;
  const key = `${bodyFile}:${type}:${seed}:${patternColors.join("|")}`;
  if (proceduralPatternCache.has(key)) return proceduralPatternCache.get(key);

  const canvas = document.createElement("canvas");
  canvas.width = spriteConfig.frameWidth;
  canvas.height = spriteConfig.frameHeight;
  const patternCtx = canvas.getContext("2d");
  const pixels = patternCtx.createImageData(canvas.width, canvas.height);
  const dark = hexToRgb(patternColors[1]);
  const light = hexToRgb(patternColors[2]);
  const seedNumber = hashString(seed);
  const accent = hexToRgb(patternColors[0]);
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      // The face remains readable even on fish with very dense markings.
      if (x < 11 || x > 70 + Math.round(hashNoise(y, 3, seedNumber) * 3)) continue;
      const broad = valueNoise(x / 18, y / 15, seedNumber);
      const detail = valueNoise(x / 8, y / 7, seedNumber + 7919);
      const noise = broad * 0.78 + detail * 0.22;
      const sample = proceduralPatternSample(type, x, y, noise, seedNumber, dark, light, accent);
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

function proceduralPatternSample(type, x, y, noise, seed, dark, light, accent) {
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
  if (type === "banner") {
    const headBoundary = 18 + Math.sin(y * 0.2 + seed) * 2.2;
    const headPatch = x < headBoundary && y > 15 && y < 43;
    if (headPatch) return { color: accent, alpha: 232 };
    const downward = Math.max(0, Math.min(1, (y - 7) / 48));
    const fanSpread = 0.48 + downward * 0.92;
    const slanted = x + y * 0.58 + (valueNoise(x / 17, y / 14, seed + 1889) - 0.5) * 1.8;
    const phase = positiveModulo(slanted / fanSpread + seed % 15, 20);
    if (phase < 8.1) return { color: light, alpha: 248 };
    if (phase < 9.15) return { color: dark, alpha: 188 };
    return null;
  }
  if (type === "neon") {
    const sideLine = 27 + Math.sin(x * 0.075 + seed * 0.01) * 1.15
      + (valueNoise(x / 18, 2, seed + 2081) - 0.5) * 1.1;
    const lineDistance = Math.abs(y - sideLine);
    if (x > 9 && x < 72 && lineDistance < 1.75) return { color: light, alpha: 252 };
    if (x > 12 && x < 70 && lineDistance < 3.1) return { color: light, alpha: 112 };

    const redStart = 35 + Math.sin(y * 0.18 + seed) * 2.2;
    const lowerBoundary = sideLine + 4.2 + Math.sin(x * 0.11 + seed * 0.02) * 1.1;
    if (x > redStart && y > lowerBoundary && y < 47) {
      const lowerFade = Math.max(0.45, 1 - Math.abs(y - 38) / 16);
      return { color: accent, alpha: Math.round(150 * lowerFade) };
    }
    return null;
  }
  if (type === "blotches" || type === "koi") {
    if (noise > 0.57) return { color: type === "koi" ? accent : dark, alpha: Math.min(225, 105 + Math.round((noise - 0.57) * 760)) };
    if (type === "koi" && noise < 0.29) return { color: light, alpha: 185 };
    return null;
  }
  if (type === "reticulated") {
    return reticulatedSample(x, y, noise, seed, dark, light, accent);
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
    const mainLine = 31 + Math.sin(x * 0.13 + seed * 0.01) * 3.4
      + (valueNoise(x / 15, 2, seed + 421) - 0.5) * 2;
    if (Math.abs(y - mainLine) < 1.15) return { color: light, alpha: 235 };
    const secondLine = 23 + Math.sin(x * 0.105 + seed * 0.017 + 2.1) * 2.6;
    if ((seed & 1) === 0 && x > 23 && x < 61 && Math.abs(y - secondLine) < 0.8) {
      return { color: accent, alpha: 205 };
    }
    const sparkle = hashNoise(Math.floor(x / 7), Math.floor(y / 7), seed + 337) > 0.91;
    return sparkle && x % 7 === 0 && y % 7 === 0 ? { color: light, alpha: 230 } : null;
  }
  return null;
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

function drawTailEyespot(ctx, file, frame, anchor, socket, scale, item, colors, anchorFrameWidth = spriteConfig.frameWidth) {
  const image = getTailEyespotLayer(file, frame, anchor, socket, scale, item, colors);
  if (!image) return false;
  const offset = attachmentOffsetForFrame(anchor, socket, scale, anchorFrameWidth);
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
  const accent = hexToRgb(colors[0]);
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

function reticulatedSample(x, y, noise, seed, dark, light, accent) {
  const bodyDistance = ((x - 43) / 29) ** 2 + ((y - 28) / 18) ** 2;
  if (bodyDistance <= 1) {
    if (!isScaleArc(x, y, seed)) return null;
    const edgeFade = Math.max(0.28, 1 - Math.max(0, bodyDistance - 0.58) * 1.8);
    const highlight = hashNoise(Math.floor(x / 8), Math.floor(y / 7), seed + 3301) > 0.78;
    return {
      color: highlight ? accent : dark,
      alpha: Math.round((highlight ? 105 : 145) * edgeFade),
    };
  }

  // Outside the central body ellipse the same pigment follows fin rays instead
  // of pretending that scales continue over the fins and tail.
  const rayPhase = positiveModulo(x * 0.34 + y + (noise - 0.5) * 5, 9.5);
  const brokenRay = hashNoise(Math.floor(x / 5), Math.floor(y / 4), seed + 4513) > 0.31;
  return rayPhase < 0.72 && brokenRay ? { color: light, alpha: 86 } : null;
}

function isScaleArc(x, y, seed) {
  const spacingX = 10.2;
  const spacingY = 7.4;
  const approximateRow = Math.round((y - 12) / spacingY);
  for (let row = approximateRow - 1; row <= approximateRow + 1; row += 1) {
    const rowJitter = (hashNoise(row, 71, seed) - 0.5) * 2.2;
    const centerY = 12 + row * spacingY + rowJitter;
    const stagger = positiveModulo(row, 2) * spacingX * 0.5;
    const approximateColumn = Math.round((x - 13 - stagger) / spacingX);
    for (let column = approximateColumn - 1; column <= approximateColumn + 1; column += 1) {
      if (hashNoise(column, row, seed + 2711) < 0.24) continue;
      const jitterX = (hashNoise(column, row, seed + 991) - 0.5) * 2.5;
      const jitterY = (hashNoise(column, row, seed + 1871) - 0.5) * 1.5;
      const centerX = 13 + stagger + column * spacingX + jitterX;
      const dx = (x - centerX) / (5.1 + hashNoise(column, row, seed + 43) * 1.15);
      const dy = (y - centerY - jitterY) / (3.6 + hashNoise(column, row, seed + 79) * 0.85);
      const radius = Math.hypot(dx, dy);
      const brokenEdge = hashNoise(Math.floor(x * 0.7), Math.floor(y * 0.8), seed + column * 31 + row) > 0.18;
      if (dy > -0.08 && Math.abs(radius - 1) < 0.13 && brokenEdge) return true;
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

function drawAttachedPart(ctx, file, tint, frame, anchor, socket, scale, colors, anchorFrameWidth = spriteConfig.frameWidth) {
  const image = getTintedLayer(file, tint, colors);
  if (!image) return false;
  const offset = attachmentOffsetForFrame(anchor, socket, scale, anchorFrameWidth);
  ctx.drawImage(image, frame * spriteConfig.frameWidth, 0, spriteConfig.frameWidth, spriteConfig.frameHeight,
    -spriteConfig.frameWidth / 2 + offset.x,
    -spriteConfig.frameHeight / 2 + offset.y,
    spriteConfig.frameWidth * scale,
    spriteConfig.frameHeight * scale);
  return true;
}

function drawBodyPart(ctx, body, frame, colors) {
  const image = getTintedLayer(body.file, "base", colors);
  if (!image) return false;
  const frameWidth = body.frameWidth ?? spriteConfig.frameWidth;
  const frameHeight = body.frameHeight ?? spriteConfig.frameHeight;
  const sourceX = frame * frameWidth;
  const availableWidth = Math.max(0, Math.min(frameWidth, image.width - sourceX));
  if (!availableWidth) return false;
  ctx.drawImage(image, sourceX, 0, availableWidth, frameHeight,
    -frameWidth / 2, -frameHeight / 2, availableWidth * body.scale, frameHeight * body.scale);
  return true;
}

function bodyFrameAnchor(body, key, frame) {
  return body.frameAnchors?.[key]?.[frame] ?? body.anchors[key];
}

function attachmentOffsetForFrame(anchor, socket, partScale, anchorFrameWidth) {
  const offset = attachmentOffset(anchor, socket, partScale);
  offset.x -= (anchorFrameWidth - spriteConfig.frameWidth) / 2;
  return offset;
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
