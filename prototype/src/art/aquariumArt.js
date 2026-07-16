import { plantGrowthScale, plantTypes } from "../data/plantData.js";
import { customerCount } from "../data/customerData.js";
import { ensureSnailResidents, snailGrowthScale, snailPosition } from "../systems/tankSystem.js";
import { dayNightConfig } from "../config/behaviorConfig.js";
import { waterConfig } from "../config/waterConfig.js";
import { plantConfig } from "../config/plantConfig.js";

const decorFiles = {
  vallisneria: "plant_vallisneria.png",
  anubias: "plant_anubias.png",
  redLudwigia: "plant_red_ludwigia.png",
  glowFern: "plant_glow_fern.png",
  floatingPlant: "floating_plant.png",
  vallisneriaPart: "part_vallisneria_leaf_v2.png",
};
const decorImages = new Map();
for (const [key, file] of Object.entries(decorFiles)) {
  const image = new Image(); image.src = `./assets/decor/${file}`; decorImages.set(key, image);
}
const plantVisualProfiles = [
  { width: 1, height: 1, lean: 0, fullness: 0 },
  { width: 0.84, height: 1.1, lean: -0.035, fullness: -1 },
  { width: 1.2, height: 0.94, lean: 0.025, fullness: 1 },
  { width: 1.04, height: 1.04, lean: 0.075, fullness: 0 },
];
const algaeMaskCache = new WeakMap();
const bottomImage = new Image();
bottomImage.src = "./assets/decor/aquarium_bottom.png";
const quarantineBottomImage = new Image();
quarantineBottomImage.src = "./assets/decor/quarantine_bottom.png";
const nurseryBottomImage = new Image();
nurseryBottomImage.src = "./assets/decor/nursery_bottom.png";
const snailImage = new Image();
snailImage.src = "./assets/creatures/ampullaria.png";
let snailBodyImage = null;
snailImage.addEventListener("load", () => {
  const body = document.createElement("canvas");
  body.width = snailImage.naturalWidth; body.height = snailImage.naturalHeight;
  const bodyCtx = body.getContext("2d");
  bodyCtx.drawImage(snailImage, 0, 0);
  bodyCtx.globalCompositeOperation = "destination-out";
  bodyCtx.strokeStyle = "#000";
  bodyCtx.lineWidth = 3;
  bodyCtx.beginPath(); bodyCtx.moveTo(15, 18); bodyCtx.lineTo(13, 10); bodyCtx.lineTo(17, 1); bodyCtx.stroke();
  bodyCtx.beginPath(); bodyCtx.moveTo(10, 25); bodyCtx.lineTo(1, 28); bodyCtx.stroke();
  snailBodyImage = body;
});
const filterImages = [null, new Image(), new Image()];
filterImages[1].src = "./assets/equipment/filter_1.png";
filterImages[2].src = "./assets/equipment/filter_2.png";
const customerEyePositions = [];
const customerOriginalImages = [];
const fallbackCustomerEyes = [
  [[53, 71], [82, 69]],
  [[52, 50], [76, 50]],
  [[50, 54], [72, 51]],
  [[50, 60], [71, 57]],
];
const customerImages = Array.from({ length: customerCount }, (_, index) => {
  const image = new Image();
  const original = new Image();
  customerOriginalImages[index] = original;
  const updateEyePositions = () => {
    if (!image.complete || !image.naturalWidth || !original.complete || !original.naturalWidth) return;
    customerEyePositions[index] = findEyeHoles(image, original) ?? fallbackCustomerEyes[index];
  };
  image.addEventListener("load", updateEyePositions);
  original.addEventListener("load", updateEyePositions);
  image.src = `./assets/customers/customer_${index}_eye_mask.png`;
  original.src = `./assets/customers/customer_${index}.png`;
  return image;
});

function findEyeHoles(image, original) {
  const sample = document.createElement("canvas");
  sample.width = image.naturalWidth;
  sample.height = image.naturalHeight;
  const sampleCtx = sample.getContext("2d", { willReadFrequently: true });
  sampleCtx.drawImage(image, 0, 0);
  const { data } = sampleCtx.getImageData(0, 0, sample.width, sample.height);
  sampleCtx.clearRect(0, 0, sample.width, sample.height);
  sampleCtx.drawImage(original, 0, 0);
  const originalData = sampleCtx.getImageData(0, 0, sample.width, sample.height).data;
  const visited = new Uint8Array(sample.width * sample.height);
  const holes = [];
  for (let y = 1; y < sample.height - 1; y += 1) {
    for (let x = 1; x < sample.width - 1; x += 1) {
      const start = y * sample.width + x;
      if (visited[start] || data[start * 4 + 3] > 32 || originalData[start * 4 + 3] < 96) continue;
      const queue = [start];
      visited[start] = 1;
      let head = 0, touchesEdge = false, sumX = 0, sumY = 0, count = 0;
      while (head < queue.length) {
        const pixel = queue[head++];
        const px = pixel % sample.width;
        const py = Math.floor(pixel / sample.width);
        sumX += px; sumY += py; count += 1;
        if (px === 0 || py === 0 || px === sample.width - 1 || py === sample.height - 1) touchesEdge = true;
        for (const next of [pixel - 1, pixel + 1, pixel - sample.width, pixel + sample.width]) {
          if (next < 0 || next >= visited.length || visited[next] || data[next * 4 + 3] > 32 || originalData[next * 4 + 3] < 96) continue;
          visited[next] = 1; queue.push(next);
        }
      }
      const centerX = sumX / count;
      const centerY = sumY / count;
      if (!touchesEdge && count <= 160 && centerX > 28 && centerX < 100 && centerY > 32 && centerY < 82) holes.push({ x: centerX, y: centerY, count });
    }
  }
  const mergeSide = (parts) => {
    const weight = parts.reduce((sum, part) => sum + part.count, 0);
    if (!weight) return null;
    return [
      parts.reduce((sum, part) => sum + part.x * part.count, 0) / weight,
      parts.reduce((sum, part) => sum + part.y * part.count, 0) / weight,
    ];
  };
  const leftEye = mergeSide(holes.filter((hole) => hole.x < sample.width / 2));
  const rightEye = mergeSide(holes.filter((hole) => hole.x >= sample.width / 2));
  return leftEye && rightEye ? [leftEye, rightEye] : null;
}

export function drawAquarium(ctx, view, plants, tankId = "main", tank = null) {
  if (tankId === "sale") drawCustomers(ctx, view, tank);
  const glass = getGlassBounds(view);
  const surfaceY = getSurfaceY(view, tank);
  ctx.save();
  ctx.beginPath();
  // Rostliny na hladině mají listy i nad vodou. Samotná voda se stále kreslí
  // až od surfaceY, ale obsah nádrže smí využít i suchou část uvnitř skla.
  ctx.rect(glass.left, glass.top, glass.width, view.height - glass.top - 16);
  ctx.clip();
  drawWater(ctx, view, tankId, tank);
  drawTankFilter(ctx, view, tank);
  drawPlants(ctx, view, plants, tank);
  if (tankId === "nursery" && tank?.spawning?.eggs) drawEggClutch(ctx, view, tank.spawning.eggs);
  drawTankDirt(ctx, view, tank);
  drawSnails(ctx, view, tank);
  drawBubbles(ctx, view, tank);
  ctx.restore();
  drawWaterChangeGuide(ctx, view, tank);
}

export function drawDayNightOverlay(ctx, view, lightLevel, period, tank = null) {
  const surfaceY = getSurfaceY(view, tank);
  const darkness = Math.max(0, Math.min(dayNightConfig.nightOverlayMax, (1 - lightLevel) * dayNightConfig.nightOverlayMax));
  if (darkness > 0.01) {
    const overlayTop = surfaceY - 22;
    const gradient = ctx.createLinearGradient(0, overlayTop, 0, view.height);
    gradient.addColorStop(0, "rgba(13, 25, 57, 0)");
    gradient.addColorStop(0.055, `rgba(13, 25, 57, ${darkness * 0.72})`);
    gradient.addColorStop(1, `rgba(4, 10, 29, ${darkness})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, overlayTop, view.width, view.height - overlayTop);
  }
  if (period === "svitani" || period === "soumrak") {
    const glow = ctx.createLinearGradient(0, surfaceY, view.width, surfaceY);
    glow.addColorStop(0, "rgba(222, 153, 84, 0)");
    glow.addColorStop(0.5, "rgba(222, 153, 84, 0.11)");
    glow.addColorStop(1, "rgba(222, 153, 84, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, surfaceY, view.width, view.height - surfaceY);
  }
}

function drawTankFilter(ctx, view, tank) {
  const level = Math.max(0, Math.min(2, tank?.filterLevel ?? 1));
  const image = filterImages[level];
  if (!image?.complete || image.naturalWidth === 0) return;
  const glass = getGlassBounds(view);
  const size = level >= 2 ? 96 : 76;
  const x = glass.right - size - 34;
  const y = view.height - 46 - size;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, x, y, size, size);
  const time = performance.now() / (level >= 2 ? 620 : 850);
  ctx.strokeStyle = "rgba(190, 236, 239, 0.52)";
  for (let bubble = 0; bubble < level + 2; bubble += 1) {
    const rise = (time * (13 + bubble * 3) + bubble * 19) % 78;
    const bx = x + size * 0.52 + Math.sin(time + bubble * 2.1) * 5;
    const by = y + size * 0.22 - rise;
    drawPixelBubble(ctx, bx, by, 2 + bubble % 2, 0.52, false, bubble + 31);
  }
  if (tank?.aerator) {
    const stoneX = x - 34;
    ctx.fillStyle = "#26383b";
    ctx.fillRect(stoneX - 12, y + size - 9, 25, 7);
    ctx.strokeStyle = "rgba(190, 236, 239, 0.65)";
    for (let bubble = 0; bubble < 6; bubble += 1) {
      const rise = (time * (22 + bubble * 2) + bubble * 17) % 105;
      const bx = stoneX + Math.sin(time * 1.4 + bubble) * 9;
      const by = y + size - 12 - rise;
      drawPixelBubble(ctx, bx, by, 1.5 + bubble % 2, 0.62, false, bubble + 47);
    }
  }
}

function drawCustomers(ctx, view, tank) {
  const visitors = tank?.sales?.visitors ?? [];
  const glass = getGlassBounds(view);
  const innerLeft = glass.left + glass.wall + 1;
  const innerRight = glass.right - glass.wall - 1;
  ctx.save();
  ctx.beginPath();
  ctx.rect(innerLeft, 0, innerRight - innerLeft, view.height - 20);
  ctx.clip();
  for (const visitor of visitors) {
    const image = customerImages[visitor.type];
    const original = customerOriginalImages[visitor.type];
    if (!original?.complete || original.naturalWidth === 0) continue;
    const x = visitor.x * view.width;
    const width = 320;
    const height = 400;
    const bottom = view.height + 68;
    const top = bottom - height;
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.imageSmoothingEnabled = false;
    const eyeMaskReady = image?.complete && image.naturalWidth > 0 && customerEyePositions[visitor.type]?.length === 2;
    if (eyeMaskReady) {
      // 1) bile pozadi, 2) zornice, 3) maskovany sprite postavy navrchu.
      drawCustomerEyes(ctx, visitor, x, top, width, height);
      ctx.drawImage(image, x - width / 2, top, width, height);
    } else {
      // Nova postava funguje i predtim, nez pro ni vznikne rucne upravena maska oci.
      ctx.drawImage(original, x - width / 2, top, width, height);
    }
    ctx.restore();
  }
  ctx.restore();
}

function drawCustomerEyes(ctx, visitor, centerX, top, width, height) {
  const eyePixels = customerEyePositions[visitor.type] ?? fallbackCustomerEyes[visitor.type];
  const scaleX = width / 128;
  const scaleY = height / 160;
  const eyes = eyePixels.map(([x, y]) => ({ x: centerX - width / 2 + x * scaleX, y: top + y * scaleY }));
  const baseY = (eyes[0].y + eyes[1].y) / 2;
  const hasTarget = Number.isFinite(visitor.lookX) && Number.isFinite(visitor.lookY);
  const targetDx = hasTarget ? visitor.lookX - centerX : 0;
  const targetDy = hasTarget ? visitor.lookY - baseY : 0;
  const length = Math.max(1, Math.hypot(targetDx, targetDy));
  const offsetX = targetDx / length * 2.2;
  const offsetY = targetDy / length * 1.5;
  // Bila plocha tesne za oblastí obou oci; sprite ji prekryje mimo alfa masku.
  ctx.fillStyle = "#f0ecd4";
  const eyeBandLeft = Math.min(...eyes.map((eye) => eye.x)) - 15;
  const eyeBandRight = Math.max(...eyes.map((eye) => eye.x)) + 15;
  const eyeBandTop = Math.min(...eyes.map((eye) => eye.y)) - 12;
  const eyeBandBottom = Math.max(...eyes.map((eye) => eye.y)) + 12;
  ctx.fillRect(Math.round(eyeBandLeft), Math.round(eyeBandTop), Math.round(eyeBandRight - eyeBandLeft), Math.round(eyeBandBottom - eyeBandTop));
  ctx.fillStyle = "#171311";
  for (const eye of eyes) ctx.fillRect(Math.round(eye.x + offsetX - 3), Math.round(eye.y + offsetY - 3), 10,10);
  ctx.fillStyle = "#e8dfc9";
  for (const eye of eyes) ctx.fillRect(Math.round(eye.x + offsetX - 1), Math.round(eye.y + offsetY - 2), 2, 2);
}

export function drawSaleEffects(ctx, tank) {
  const effects = tank?.sales?.effects ?? [];
  for (const effect of effects) {
    const progress = 1 - effect.timer / 3.2;
    ctx.save();
    ctx.globalAlpha = Math.max(0, effect.timer / 3.2);
    for (let i = 0; i < 10; i += 1) {
      const angle = i / 10 * Math.PI * 2 + progress * 1.4;
      const radius = 18 + progress * 34;
      const x = effect.x + Math.cos(angle) * radius;
      const y = effect.y + Math.sin(angle) * radius - progress * 12;
      ctx.fillStyle = i % 2 ? "#f4dc82" : "#d49b42";
      ctx.fillRect(Math.round(x), Math.round(y), 4, 4);
    }
    ctx.fillStyle = "#fff0b0";
    ctx.font = "bold 13px Consolas";
    ctx.textAlign = "center";
    ctx.fillText(`+${effect.price} penez`, effect.x, effect.y - 34 - progress * 16);
    ctx.restore();
  }
}

function drawTankDirt(ctx, view, tank) {
  if (!tank) return;
  const glass = getGlassBounds(view);
  const bottom = view.height - 22;
  const debris = tank.debris ?? 0;
  const brown = tank.brownWater ?? 0;
  const algae = tank.algae ?? 0;


  if (brown > 0.02) {
    const gradient = ctx.createLinearGradient(0, bottom - 145, 0, bottom);
    gradient.addColorStop(0, "rgba(105, 65, 30, 0)");
    gradient.addColorStop(1, `rgba(105, 65, 30, ${Math.min(0.42, brown * 0.5)})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(glass.left, bottom - 145, glass.width, 145);
  }

  const debrisCount = Math.floor(debris * 95);
  if (Array.isArray(tank.debrisMap)) {
    const cellWidth = glass.width / tank.debrisMap.length;
    ctx.fillStyle = "rgba(63, 46, 27, 0.88)";
    ctx.beginPath(); ctx.moveTo(glass.left, bottom);
    tank.debrisMap.forEach((level, index) => {
      const neighbors = [tank.debrisMap[index - 1] ?? level, level, tank.debrisMap[index + 1] ?? level];
      const smoothed = neighbors.reduce((sum, value) => sum + value, 0) / neighbors.length;
      const x = glass.left + (index + 0.5) * cellWidth;
      const ridge = ((index * 13) % 5) - 2;
      ctx.lineTo(x, bottom - Math.max(1, smoothed * 25 + ridge));
    });
    ctx.lineTo(glass.right, bottom); ctx.closePath(); ctx.fill();
    tank.debrisMap.forEach((level, index) => {
      const specks = Math.floor(level * 11);
      for (let speck = 0; speck < specks; speck += 1) {
        const x = glass.left + index * cellWidth + ((speck * 7 + index * 3) % Math.max(2, cellWidth));
        const y = bottom - 3 - ((speck * 11 + index * 5) % Math.max(4, 8 + level * 25));
        ctx.fillStyle = speck % 4 === 0 ? "#87603a" : speck % 3 === 0 ? "#513a25" : "#2f2b1e";
        ctx.fillRect(Math.round(x), Math.round(y), 2 + (speck % 2), 2);
      }
    });
  }
  for (let i = 0; i < debrisCount; i += 1) {
    const x = glass.left + 14 + ((i * 79) % Math.max(20, glass.width - 28));
    const y = bottom - 8 - ((i * 17) % 26);
    ctx.fillStyle = i % 4 === 0 ? "#75502d" : i % 3 === 0 ? "#49351f" : "#2d291b";
    ctx.fillRect(Math.round(x), Math.round(y), 2 + (i % 3), 2);
  }

  const patches = Math.floor(algae * 30);
  ctx.globalAlpha = Math.min(0.72, 0.22 + algae * 0.6);
  for (let i = 0; i < patches; i += 1) {
    const sideX = i % 2 ? glass.right - 8 - (i % 3) * 3 : glass.left + 5 + (i % 3) * 3;
    const y = getSurfaceY(view) + 35 + ((i * 53) % Math.max(30, view.height - getSurfaceY(view) - 105));
    ctx.fillStyle = i % 3 ? "#426b38" : "#6d8338";
    ctx.fillRect(Math.round(sideX), Math.round(y), 5 + (i % 4), 7 + (i % 5));
  }
  ctx.globalAlpha = 1;
}

export function drawGlassAlgae(ctx, view, tank) {
  const algae = tank?.algae ?? 0;
  if (algae <= 0.04) return;
  const glass = getGlassBounds(view);
  const map = tank.algaeMap;
  const mapColumns = waterConfig.dirt.algaeMapColumns;
  const mapRows = waterConfig.dirt.algaeMapRows;
  if (Array.isArray(map) && map.length === mapColumns * mapRows) {
    const fixedGlassTop = getSurfaceY(view);
    const top = fixedGlassTop + 5;
    const width = glass.width - 10;
    const substrateTop = view.height - 56;
    const height = Math.max(40, substrateTop - top);
    const signature = algaeMapSignature(map);
    let cached = algaeMaskCache.get(tank);
    if (!cached || cached.signature !== signature) {
      cached = { signature, mask: createAlgaeMask(map, mapColumns, mapRows) };
      algaeMaskCache.set(tank, cached);
    }
    const mask = cached.mask;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(mask, glass.left + 5, top, width, height);
    for (let candidate = 0; candidate < 72; candidate += 1) {
      const normalizedX = 0.015 + stableVisualNoise(candidate, 21.4) * 0.97;
      const normalizedY = 0.018 + stableVisualNoise(candidate, 36.7) * 0.94;
      const level = sampleAlgaeMap(map, normalizedX * (mapColumns - 1), normalizedY * (mapRows - 1), mapColumns, mapRows);
      const visibility = stableVisualNoise(candidate, 52.3);
      if (level < 0.5 || visibility > Math.min(0.92, level * 1.08)) continue;
      const x = glass.left + 5 + normalizedX * width;
      const y = top + normalizedY * height;
      const radius = 1.3 + stableVisualNoise(candidate, 68.1) * 4.2 + level * 0.7;
      drawPixelBubble(ctx, x, y, radius, 0.24 + level * 0.5, true, candidate + 101);
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

function sampleAlgaeMap(map, x, y, columns, rows) {
  const x0 = Math.max(0, Math.min(columns - 1, Math.floor(x)));
  const y0 = Math.max(0, Math.min(rows - 1, Math.floor(y)));
  const x1 = Math.min(columns - 1, x0 + 1);
  const y1 = Math.min(rows - 1, y0 + 1);
  const tx = x - x0;
  const ty = y - y0;
  const top = map[y0 * columns + x0] * (1 - tx) + map[y0 * columns + x1] * tx;
  const bottom = map[y1 * columns + x0] * (1 - tx) + map[y1 * columns + x1] * tx;
  return top * (1 - ty) + bottom * ty;
}

function algaeMapSignature(map) {
  let signature = 17;
  for (const level of map) signature = (signature * 31 + Math.round(level * 4096)) | 0;
  return signature;
}

function createAlgaeMask(map, mapColumns, mapRows) {
  const mask = document.createElement("canvas");
  mask.width = 160; mask.height = 90;
  const maskCtx = mask.getContext("2d");
  const pixels = maskCtx.createImageData(mask.width, mask.height);
  for (let pixelY = 0; pixelY < mask.height; pixelY += 1) {
    for (let pixelX = 0; pixelX < mask.width; pixelX += 1) {
      const mapX = pixelX / (mask.width - 1) * (mapColumns - 1);
      const mapY = pixelY / (mask.height - 1) * (mapRows - 1);
      const level = sampleAlgaeMap(map, mapX, mapY, mapColumns, mapRows);
      if (level < 0.018) continue;
      const broadNoise = Math.sin(pixelX * 0.19 + pixelY * 0.11)
        + Math.sin(pixelX * 0.071 - pixelY * 0.16 + 1.7)
        + Math.sin(pixelX * 0.037 + pixelY * 0.049 + 4.1);
      const fineNoise = Math.sin(pixelX * 1.73 + pixelY * 2.17) * 0.5;
      const organicLevel = Math.max(0, Math.min(1, level + broadNoise * 0.025 + fineNoise * 0.012));
      const variation = Math.max(-1, Math.min(1, broadNoise / 3));
      const upperEdge = Math.max(0,
        2.2
        + Math.sin(pixelX * 0.115 + 0.7) * 1.35
        + Math.sin(pixelX * 0.037 + 2.4) * 1.1
        + Math.sin(pixelX * 0.29) * 0.45);
      const lowerEdge = mask.height - 1 - Math.max(0,
        2.4
        + Math.sin(pixelX * 0.097 + 1.2) * 1.55
        + Math.sin(pixelX * 0.031 + 4.5) * 1.15
        + Math.sin(pixelX * 0.24 + 2.1) * 0.55);
      const upperOpacity = Math.max(0, Math.min(1, (pixelY - upperEdge + 1.2) / 3.2));
      const lowerOpacity = Math.max(0, Math.min(1, (lowerEdge - pixelY + 1.2) / 3.2));
      const edgeOpacity = Math.min(upperOpacity, lowerOpacity);
      const offset = (pixelY * mask.width + pixelX) * 4;
      pixels.data[offset] = Math.round(55 + variation * 16 + organicLevel * 17);
      pixels.data[offset + 1] = Math.round(94 + variation * 21 + organicLevel * 24);
      pixels.data[offset + 2] = Math.round(43 + variation * 11);
      pixels.data[offset + 3] = Math.round(255 * Math.min(0.94, Math.pow(organicLevel, 1.12) * 0.98) * edgeOpacity);
    }
  }
  maskCtx.putImageData(pixels, 0, 0);
  return mask;
}

function drawSnails(ctx, view, tank) {
  if (!tank) return;
  const snailResidents = ensureSnailResidents(tank);
  if (!snailResidents.length) return;
  const glass = getGlassBounds(view);
  // Sneci lezou po skle, ne po vodnim sloupci. Pri odpousteni proto zustavaji na miste.
  const surfaceY = getSurfaceY(view);
  const waterHeight = view.height - surfaceY - 100;
  for (let i = 0; i < snailResidents.length; i += 1) {
    const now = Date.now();
    const position = snailPosition(i, now);
    const previous = snailPosition(i, now - 1200);
    const x = glass.left + 22 + position.x * (glass.width - 44);
    const y = surfaceY + 40 + position.y * waterHeight;
    if (snailImage.complete && snailImage.naturalWidth > 0) {
      const snail = snailResidents[i];
      const growth = snailGrowthScale(snail);
      const size = waterConfig.snails.adultSize * growth;
      ctx.save();
      ctx.translate(x, y);
      const dx = position.x - previous.x;
      const dy = position.y - previous.y;
      ctx.rotate(Math.atan2(dy, dx) - Math.PI);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(snailBodyImage ?? snailImage, -size / 2, -size / 2, size, size);
      drawSnailAntennae(ctx, snail, size, now);
      ctx.restore();
    }
  }
}

function drawSnailAntennae(ctx, snail, size, now) {
  const unit = size / 40;
  const phase = (snail.antennaPhase ?? 0) + now * waterConfig.snails.antennaSpeed;
  const upperWave = Math.sin(phase) * 2.2 + Math.sin(phase * 0.37 + 1.1) * 1.2;
  const lowerWave = Math.sin(phase * 0.71 + 2.4) * 2 + Math.sin(phase * 0.29) * 1.1;
  ctx.strokeStyle = "#ead879";
  ctx.lineWidth = Math.max(1, unit);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-8 * unit, -1 * unit);
  ctx.quadraticCurveTo(-14 * unit, (-8 + upperWave) * unit, (-13 + upperWave * 0.45) * unit, -17 * unit * waterConfig.snails.antennaReach);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-9 * unit, 2 * unit);
  ctx.quadraticCurveTo(-15 * unit, (1 + lowerWave) * unit, -20 * unit * waterConfig.snails.antennaReach, (5 + lowerWave) * unit);
  ctx.stroke();
  ctx.lineCap = "butt";
}

function drawEggClutch(ctx, view, eggs) {
  const baseX = view.width * 0.48;
  const baseY = view.height - 78;
  ctx.fillStyle = "#d9e6c4";
  for (let i = 0; i < Math.max(8, eggs.count * 5); i += 1) {
    const x = baseX + ((i * 17) % 64) - 32;
    const y = baseY + ((i * 11) % 25) - 12;
    ctx.fillStyle = "#708676";
    ctx.fillRect(Math.round(x - 1), Math.round(y - 1), 9, 9);
    ctx.fillStyle = i % 3 === 0 ? "#7d947e" : "#d9e6c4";
    ctx.fillRect(Math.round(x), Math.round(y), 7, 7);
    ctx.fillStyle = "#eef3d4";
    ctx.fillRect(Math.round(x + 1), Math.round(y + 1), 2, 2);
  }
}

export function drawFood(ctx, view, foodPulse) {
  ctx.fillStyle = "#d39d47";
  for (let i = 0; i < 28; i += 1) {
    const x = view.width * 0.48 + Math.sin(i * 14.1) * 70;
    const y = view.height * 0.24 + ((foodPulse * 35 + i * 13) % 120);
    ctx.fillRect(x, y, 3, 3);
  }
}

export function drawFoodParticles(ctx, foodParticles) {
  ctx.fillStyle = "#d39d47";
  for (const particle of foodParticles) {
    ctx.globalAlpha = Math.max(0, Math.min(1, particle.life / 10));
    ctx.fillRect(particle.x - 2, particle.y - 2, 4, 4);
    ctx.fillStyle = "#f0c16a";
    ctx.fillRect(particle.x - 1, particle.y - 2, 2, 1);
    ctx.fillStyle = "#d39d47";
  }
  ctx.globalAlpha = 1;
}

export function drawLiquidClouds(ctx, liquidClouds) {
  for (const cloud of liquidClouds) {
    if (cloud.settling) {
      const alpha = Math.max(0, Math.min(0.82, cloud.life / Math.min(2.5, cloud.maxLife)));
      ctx.fillStyle = `rgba(${cloud.color}, ${alpha})`;
      ctx.fillRect(Math.round(cloud.x), Math.round(cloud.y), cloud.radius, cloud.radius);
      continue;
    }
    const alpha = Math.max(0, Math.min(0.34, cloud.life / cloud.maxLife));
    const radius = cloud.radius;
    const gradient = ctx.createRadialGradient(cloud.x, cloud.y, 0, cloud.x, cloud.y, radius);
    gradient.addColorStop(0, `rgba(${cloud.color}, ${alpha})`);
    gradient.addColorStop(0.55, `rgba(${cloud.color}, ${alpha * 0.42})`);
    gradient.addColorStop(1, `rgba(${cloud.color}, 0)`);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cloud.x, cloud.y, radius, 0, Math.PI * 2);
    ctx.fill();
    if (cloud.sediment) {
      ctx.fillStyle = `rgba(91, 57, 29, ${alpha * 1.8})`;
      for (let speck = 0; speck < 5; speck += 1) {
        const angle = speck * 2.17 + cloud.x * 0.03;
        ctx.fillRect(Math.round(cloud.x + Math.cos(angle) * radius * 0.55), Math.round(cloud.y + Math.sin(angle) * radius * 0.35), 2, 2);
      }
    }
  }
}

export function drawGlass(ctx, view) {
  const glass = getGlassBounds(view);
  const left = glass.left;
  const right = glass.right;
  // Skleněné stěny sahají až k horní liště okna. Hladina je samostatná
  // hodnota, takže nad ní zůstává otevřená, prázdná část akvária.
  const top = glass.top;
  const bottom = view.height - 20;
  const r = Math.min(16, (right - left) / 2, (bottom - top) / 2);

  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(left, bottom - r);
  ctx.quadraticCurveTo(left, bottom, left + r, bottom);
  ctx.lineTo(right - r, bottom);
  ctx.quadraticCurveTo(right, bottom, right, bottom - r);
  ctx.lineTo(right, top);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.strokeStyle = "rgba(226, 252, 246, 0.65)";
  ctx.lineWidth = 11;
  ctx.stroke();
}

export function maskAquariumEdges(ctx, view) {
  const glass = getGlassBounds(view);
  const innerLeft = glass.left + glass.wall + 1;
  const innerRight = glass.right - glass.wall - 1;
  // Posledni nepruhledna hranicni maska odstrani cokoli, co se vykreslilo
  // mimo vnitrni sklo. Ram se kresli az potom a prekryje cisty rez.
  ctx.clearRect(0, 0, innerLeft, view.height);
  ctx.clearRect(innerRight, 0, Math.max(0, view.width - innerRight), view.height);
}

export function getSurfaceY(view, tank = null) {
  const fullSurface = Math.max(90, Math.min(140, view.height * 0.24));
  const fraction = Math.max(0, Math.min(0.5, tank?.waterRemoved ?? 0));
  return fullSurface + (view.height - 52 - fullSurface) * fraction;
}

export function getGlassBounds(view) {
  const left = 10;
  const right = view.width - 10;
  return {
    left,
    right,
    width: right - left,
    top: 4,
    bottomInset: 0,
    wall: 5,
  };
}

function drawWaterChangeGuide(ctx, view, tank) {
  if (!tank?.waterChangeActive && !(tank?.waterRemoved > 0)) return;
  const glass = getGlassBounds(view);
  const fullSurface = getSurfaceY(view);
  const depth = view.height - 52 - fullSurface;
  const marks = [[0.25, "25 %"], [0.35, "35 %"], [0.5, "MAX"]];
  ctx.save();
  ctx.font = "bold 9px Consolas, monospace";
  ctx.textAlign = "right";
  for (const [fraction, label] of marks) {
    const y = fullSurface + depth * fraction;
    const recommended = fraction <= 0.35;
    ctx.strokeStyle = recommended ? "rgba(225, 204, 124, .72)" : "rgba(190, 104, 104, .72)";
    ctx.fillStyle = recommended ? "rgba(244, 226, 159, .9)" : "rgba(225, 143, 143, .9)";
    ctx.setLineDash([4, 5]);
    ctx.beginPath(); ctx.moveTo(glass.right - 92, y); ctx.lineTo(glass.right - 14, y); ctx.stroke();
    ctx.fillText(label, glass.right - 18, y - 4);
  }
  ctx.restore();
}


function drawWater(ctx, view, tankId, tank) {
  const surfaceY = getSurfaceY(view, tank);
  const glass = getGlassBounds(view);
  const gradient = ctx.createLinearGradient(0, surfaceY, 0, view.height);
  const water = tankId === "quarantine"
    ? ["rgba(105, 202, 220, 0.58)", "rgba(42, 126, 158, 0.56)", "rgba(20, 66, 96, 0.7)"]
    : tankId === "nursery"
      ? ["rgba(126, 216, 205, 0.56)", "rgba(46, 157, 151, 0.54)", "rgba(18, 92, 101, 0.68)"]
      : ["rgba(79, 206, 225, 0.62)", "rgba(20, 152, 188, 0.58)", "rgba(8, 88, 126, 0.68)"];
  gradient.addColorStop(0, water[0]); gradient.addColorStop(0.55, water[1]); gradient.addColorStop(1, water[2]);
  ctx.fillStyle = gradient;
  const surfaceTime = performance.now() / 5200;
  const rippleNow = performance.now();
  const ripples = (tank?.surfaceRipples ?? []).filter((ripple) =>
    (rippleNow - ripple.createdAt) / 1000 < waterConfig.maintenance.refillRippleLifetime);
  if (tank?.surfaceRipples) tank.surfaceRipples = ripples;
  const waveAt = (x) => {
    const across = (x - glass.left) / Math.max(1, glass.width);
    let y = surfaceY
      + Math.sin(across * Math.PI * 6.2 + surfaceTime) * 3.2
      + Math.sin(across * Math.PI * 3.4 - surfaceTime * 0.63 + 0.8) * 1.7
      + Math.sin(across * Math.PI * 10.5 + surfaceTime * 0.31 + 2.1) * 0.7;
    for (const ripple of ripples) {
      const age = (rippleNow - ripple.createdAt) / 1000;
      const life = Math.max(0, 1 - age / waterConfig.maintenance.refillRippleLifetime);
      const distance = Math.abs(x - ripple.x);
      const front = waterConfig.maintenance.refillRippleSpeed * age;
      const fromFront = distance - front;
      const envelope = Math.exp(-(fromFront * fromFront) / (2 * waterConfig.maintenance.refillRippleWidth ** 2));
      y += Math.sin(fromFront * 0.2) * waterConfig.maintenance.refillRippleAmplitude * ripple.strength * life * envelope;
    }
    return y;
  };
  const highlightAt = (x) => {
    const across = (x - glass.left) / Math.max(1, glass.width);
    return waveAt(x) + 1.7 + Math.sin(across * Math.PI * 4.6 - surfaceTime * 0.48 + 1.1) * 2.4;
  };

  ctx.beginPath();
  traceWaterSurface(ctx, glass, waveAt, 3);
  ctx.lineTo(glass.right, view.height - glass.bottomInset);
  ctx.lineTo(glass.left, view.height - glass.bottomInset);
  ctx.closePath();
  ctx.fill();

  // Tenká souvislá hrana drží hladinu čitelnou. Jednotlivé světelné úseky
  // nad ní mají různou šířku, takže nepůsobí jako dokonale rovná UI linka.
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(35, 132, 175, 0.72)";
  ctx.lineWidth = 7;
  ctx.beginPath(); traceWaterSurface(ctx, glass, waveAt, 1); ctx.stroke();
  ctx.strokeStyle = "rgba(198, 236, 237, 0.66)";
  ctx.lineWidth = 2.4;
  ctx.beginPath(); traceWaterSurface(ctx, glass, highlightAt, 1.5); ctx.stroke();
  ctx.fillStyle = "rgba(255, 255, 246, 0.96)";
  drawVariableSurfaceHighlight(ctx, glass, highlightAt, (x) => {
    const across = (x - glass.left) / Math.max(1, glass.width);
    const crest = Math.max(-1, Math.min(1, (surfaceY - waveAt(x)) / 5.5));
    const crestRelation = Math.sin(surfaceTime * 0.78 + 0.4);
    const driftingPattern = Math.sin(across * Math.PI * 5.1 - surfaceTime * 1.22)
      + Math.sin(across * Math.PI * 11.7 + surfaceTime * 0.63 + 1.8) * 0.55
      + Math.sin(across * Math.PI * 2.4 - surfaceTime * 0.31) * 0.35;
    const energy = Math.max(0, Math.min(1, 0.4 + driftingPattern * 0.38 + crest * crestRelation * 0.46));
    return 0.04 + Math.pow(energy, 1.7) * 7.8;
  });
  ctx.restore();

  drawBottomDecor(ctx, view, tankId);
}

function traceWaterSurface(ctx, glass, waveAt, offset = 0) {
  ctx.moveTo(glass.left, waveAt(glass.left) + offset);
  for (let x = glass.left + 8; x < glass.right; x += 8) ctx.lineTo(x, waveAt(x) + offset);
  ctx.lineTo(glass.right, waveAt(glass.right) + offset);
}

function drawVariableSurfaceHighlight(ctx, glass, waveAt, thicknessAt) {
  const points = [];
  for (let x = glass.left; x < glass.right; x += 4) points.push({ x, y: waveAt(x), thickness: thicknessAt(x) });
  points.push({ x: glass.right, y: waveAt(glass.right), thickness: thicknessAt(glass.right) });
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y - points[0].thickness * 0.5);
  for (let index = 1; index < points.length; index += 1) {
    const point = points[index];
    ctx.lineTo(point.x, point.y - point.thickness * 0.5);
  }
  for (let index = points.length - 1; index >= 0; index -= 1) {
    const point = points[index];
    ctx.lineTo(point.x, point.y + point.thickness * 0.5);
  }
  ctx.closePath();
  ctx.fill();
}

function drawBottomDecor(ctx, view, tankId) {
  const gl = getGlassBounds(view);
  const bottom = view.height - 44;

  const selectedBottom = tankId === "quarantine" || tankId === "sale" ? quarantineBottomImage : tankId === "nursery" ? nurseryBottomImage : bottomImage;
  if (selectedBottom.complete && selectedBottom.naturalWidth > 0) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(selectedBottom, gl.left, view.height - 150, gl.width, 150);
    return;
  }

  // Base substrate — fills all the way to canvas bottom so no gap with glass wall
  ctx.fillStyle = "rgba(32, 18, 9, 0.98)";
  ctx.fillRect(gl.left, view.height - 62, gl.width, 62);

  // Mid substrate layer
  ctx.fillStyle = "rgba(72, 44, 26, 0.96)";
  ctx.fillRect(gl.left, view.height - 54, gl.width, 18);

  // Surface gravel layer
  ctx.fillStyle = "rgba(98, 62, 38, 0.92)";
  ctx.fillRect(gl.left, view.height - 50, gl.width, 10);

  // Individual pebbles with color variation
  for (let x = gl.left + 4; x < gl.right - 4; x += 11) {
    const yOff = (x * 7 + 3) % 7;
    const base = 88 + ((x * 17) % 52);
    ctx.fillStyle = `rgba(${base}, ${Math.round(base * 0.54)}, ${Math.round(base * 0.3)}, 0.9)`;
    ctx.fillRect(x, view.height - 48 + yOff, 7, 3);
  }

  // Rocks
  drawRock(ctx, gl.left + 70, bottom - 4, 58, "#b86c48");
  drawRock(ctx, gl.left + 148, bottom - 8, 76, "#c87840");
  drawRock(ctx, gl.right - 185, bottom - 10, 90, "#a05840");
  drawRock(ctx, gl.right - 88, bottom - 5, 62, "#c87048");

  // Coral
  drawCoral(ctx, gl.left + 224, bottom, "#c8485a");
  drawCoral(ctx, gl.right - 244, bottom, "#d84e58");
  drawCoral(ctx, gl.right - 64, bottom, "#be3c52");
}

function drawPlants(ctx, view, plants, tank) {
  const surfaceY = getSurfaceY(view, tank);
  const plantedSurfaceY = getSurfaceY(view);
  for (const plant of plants) {
    const baseY = view.height - 46;
    const type = plantTypes[plant.type] ?? plantTypes.vallisneria;
    const growthScale = plantGrowthScale(plant);
    const sprite = decorImages.get(plant.type);
    if (type.shape === "floating") {
      drawFloatingPlant(ctx, sprite, plant, surfaceY, view);
      continue;
    }
    // Korenujici rostliny maji velikost podle pevne vysky nadrze, nikoli podle prave odpustene vody.
    const availableHeight = Math.max(40, baseY - plantedSurfaceY - 14);
    const matureHeight = Math.max(plant.h, availableHeight * (type.heightPotential ?? 0.72));
    const currentHeight = Math.min(availableHeight, matureHeight * growthScale);
    const topY = Math.max(plantedSurfaceY + 18, baseY - currentHeight);
    const time = performance.now() / 1400 + plant.sway;
    const stage = Math.max(0.05, Math.min(1, plant.growthStage ?? 0.12));
    if (type.shape === "ribbon" && drawModularBottomPlant(ctx, plant, type, baseY, currentHeight, stage, time)) continue;
    if (drawStagedOriginalPlant(ctx, sprite, plant, type, baseY, availableHeight, stage, time)) continue;
    if (type.shape === "ribbon") drawRibbonPlant(ctx, plant.x, baseY, topY, time, type.colors, stage);
    if (type.shape === "broad") drawBroadPlant(ctx, plant.x, baseY, currentHeight, time, type.colors, stage);
    if (type.shape === "stem") drawStemPlant(ctx, plant.x, baseY, topY, time, type.colors, stage);
    if (type.shape === "fern") drawFernPlant(ctx, plant.x, baseY, topY, time, type.colors, stage);
  }
}

function drawStagedOriginalPlant(ctx, image, plant, type, baseY, availableHeight, stage, time) {
  if (type.shape === "floating" || type.shape === "ribbon" || !image?.complete || image.naturalWidth === 0) return false;
  const phase = stage < plantConfig.growth.stages.medium ? 0 : stage < plantConfig.growth.stages.adult ? 1 : 2;
  const variant = getPlantVisualVariant(plant);
  const profile = plantVisualProfiles[variant];
  const heightRange = plantConfig.growth.matureHeightFractionByType[plant.type]
    ?? plantConfig.growth.fallbackMatureHeightFraction;
  const matureHeightFraction = heightRange.min
    + (heightRange.max - heightRange.min) * seededPlantValue(plant, 411);
  const matureHeight = availableHeight * matureHeightFraction;
  const smallHeight = Math.min(plant.h, availableHeight * 0.21);
  const phaseHeights = [smallHeight, Math.min(matureHeight * 0.76, smallHeight * 1.32), matureHeight];
  const mainHeight = phase === 2 ? matureHeight : Math.min(matureHeight, phaseHeights[phase] * profile.height);
  const aspect = image.naturalWidth / image.naturalHeight;
  const mainWidth = mainHeight * aspect * (phase === 0 ? 1 : phase === 1 ? 1.08 : 1.16) * profile.width;
  const sway = Math.sin(time * 0.55) * 0.008 + profile.lean;
  const mirrored = variant === 1 || variant === 3;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (phase >= 1) {
    drawOriginalPlantLayer(ctx, image, plant.x - mainWidth * (0.22 + variant * 0.015), baseY + 1, mainWidth * 0.7, mainHeight * 0.72, -0.12 + sway, !mirrored);
    drawOriginalPlantLayer(ctx, image, plant.x + mainWidth * (0.23 + (3 - variant) * 0.012), baseY, mainWidth * 0.68, mainHeight * 0.68, 0.13 + sway, mirrored);
  }
  if (phase >= 2) {
    const side = seededPlantValue(plant, 214) > 0.5 ? 1 : -1;
    drawOriginalPlantLayer(ctx, image, plant.x + side * mainWidth * 0.38, baseY + 2, mainWidth * 0.54, mainHeight * 0.52, side * 0.2 + sway, side < 0);
    if (profile.fullness >= 0) drawOriginalPlantLayer(ctx, image, plant.x - side * mainWidth * 0.16, baseY - 1, mainWidth * 0.48, mainHeight * 0.6, -side * 0.07 + sway, side > 0);
    if (profile.fullness > 0) drawOriginalPlantLayer(ctx, image, plant.x - side * mainWidth * 0.36, baseY + 3, mainWidth * 0.44, mainHeight * 0.46, -side * 0.24 + sway, side < 0);
  }
  drawOriginalPlantLayer(ctx, image, plant.x, baseY, mainWidth, mainHeight, sway, mirrored);
  ctx.restore();
  return true;
}

function drawOriginalPlantLayer(ctx, image, x, baseY, width, height, rotation, mirrored = false) {
  ctx.save();
  ctx.translate(x, baseY);
  ctx.rotate(rotation);
  if (mirrored) ctx.scale(-1, 1);
  ctx.drawImage(image, -width / 2, -height, width, height);
  ctx.restore();
}

function getPlantVisualVariant(plant) {
  const stored = Number.isInteger(plant.visualVariant) ? plant.visualVariant : Math.floor(seededPlantValue(plant, 310) * plantVisualProfiles.length);
  return ((stored % plantVisualProfiles.length) + plantVisualProfiles.length) % plantVisualProfiles.length;
}

function drawModularBottomPlant(ctx, plant, type, baseY, height, stage, time) {
  const partKey = type.shape === "ribbon" ? "vallisneriaPart" : null;
  const image = partKey ? decorImages.get(partKey) : null;
  if (!image?.complete || image.naturalWidth === 0) return false;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (type.shape === "ribbon") drawVallisneriaParts(ctx, image, plant, baseY, height, stage, time);
  ctx.restore();
  return true;
}

function drawVallisneriaParts(ctx, image, plant, baseY, height, stage, time) {
  const profile = plantVisualProfiles[getPlantVisualVariant(plant)];
  const count = Math.max(2, 2 + Math.floor(stage * 5) + profile.fullness);
  for (let leaf = 0; leaf < count; leaf += 1) {
    const spread = (leaf - (count - 1) / 2) * (3.5 + stage * 1.6) * profile.width;
    const variation = seededPlantValue(plant, leaf);
    const leafHeight = Math.min(height * 1.08, height * (0.58 + variation * 0.42) * profile.height);
    const leafWidth = 7 + variation * 4 + stage * 2;
    const rotation = (variation - 0.5) * 0.34 + profile.lean + Math.sin(time + leaf * 0.7) * 0.025;
    drawAnchoredPart(ctx, image, plant.x + spread, baseY, leafWidth, leafHeight, rotation);
  }
}

function drawAnchoredPart(ctx, image, x, y, width, height, rotation) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rotation);
  ctx.drawImage(image, -width / 2, -height, width, height);
  ctx.restore();
}

function seededPlantValue(plant, index) {
  const seed = (plant.sway ?? 0) * 17.17 + index * 12.9898 + plant.x * 0.031;
  return Math.abs(Math.sin(seed) * 43758.5453) % 1;
}

function drawFloatingPlant(ctx, sprite, plant, surfaceY, view) {
  if (!sprite?.complete || sprite.naturalWidth === 0) return;
  const stage = Math.max(0, Math.min(1, plant.growthStage ?? 0.12));
  const profile = plantVisualProfiles[getPlantVisualVariant(plant)];
  const width = (plantConfig.floating.minWidth
    + (plantConfig.floating.maxWidth - plantConfig.floating.minWidth) * stage) * profile.width;
  const rootRoom = Math.max(80, view.height - 54 - surfaceY);
  const height = Math.min(width * 2 * profile.height, rootRoom * plantConfig.floating.rootDepth);
  const sourceX = plant.flowering ? 865 : 190;
  const bob = Math.sin(performance.now() / 1300 + (plant.sway ?? 0)) * 1.5;
  const drift = Math.sin(performance.now() / 4600 + (plant.flowerPhase ?? 0)) * 5;
  ctx.save();
  ctx.translate(plant.x + drift, surfaceY - 22 + bob);
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = 0.72 + (plant.condition ?? 0.7) * 0.28;
  ctx.drawImage(sprite, sourceX, 50, 460, 920, -width / 2, 0, width, height);
  const daughters = Math.max(0, Math.floor((stage - 0.42) * 5) + profile.fullness);
  for (let daughter = 0; daughter < daughters; daughter += 1) {
    const side = daughter % 2 ? 1 : -1;
    const childWidth = 34 + stage * 12 - daughter * 2;
    const childHeight = Math.min(height * (0.48 + daughter * 0.06), rootRoom * 0.55);
    ctx.drawImage(sprite, 190, 50, 460, 920,
      side * (width * 0.42 + daughter * 8) - childWidth / 2, 7 + daughter * 3, childWidth, childHeight);
  }
  ctx.restore();
}

function drawRibbonPlant(ctx, x, baseY, topY, time, colors, stage) {
  const leafCount = 2 + Math.floor(stage * 7);
  for (let leaf = 0; leaf < leafCount; leaf += 1) {
    const offset = (leaf - (leafCount - 1) / 2) * 5;
    const sway = Math.sin(time + leaf * 0.7) * (5 + leaf % 3);
    const leafTop = baseY - (baseY - topY) * (0.68 + ((leaf * 17) % 29) / 90);
    drawPixelCurve(ctx, colors[leaf % colors.length], 2 + (leaf % 2), 2, (t) => ({
      x: x + offset + sway * t * t + Math.sin(t * Math.PI) * (leaf % 2 ? 4 : -3),
      y: baseY + (leafTop - baseY) * t,
    }));
  }
}

function drawBroadPlant(ctx, x, baseY, height, time, colors, stage) {
  const leafCount = 2 + Math.floor(stage * 7);
  for (let leaf = 0; leaf < leafCount; leaf += 1) {
    const angle = -1.35 + leaf * (2.7 / Math.max(1, leafCount - 1));
    const length = height * (0.55 + (leaf % 3) * 0.12);
    const endX = x + Math.cos(angle) * length * 0.48 + Math.sin(time + leaf) * 2;
    const endY = baseY - Math.sin(-angle) * 8 - length * 0.72;
    drawPixelLine(ctx, x, baseY, endX, endY, colors[0], 3);
    drawPixelLeaf(ctx, endX, endY, 7 + Math.floor(stage * 4), 4 + Math.floor(stage * 2), colors[1 + leaf % 2], angle);
  }
}

function drawStemPlant(ctx, x, baseY, topY, time, colors, stage) {
  const stemCount = 1 + Math.floor(stage * 4);
  for (let stemIndex = 0; stemIndex < stemCount; stemIndex += 1) {
    const stem = stemIndex - (stemCount - 1) / 2;
    const sx = x + stem * 9;
    const sway = Math.sin(time + stem) * 5;
    const stemTop = topY + Math.abs(stem) * 12;
    drawPixelCurve(ctx, colors[0], 3, 2, (t) => ({ x: sx + sway * t * t, y: baseY + (stemTop - baseY) * t }));
    for (let y = baseY - 18; y > topY + 5; y -= 17) {
      const side = ((y / 17 + stem) | 0) % 2 ? -1 : 1;
      if (y < stemTop) continue;
      drawPixelLeaf(ctx, sx + sway * 0.5 + side * 7, y, 7, 3, colors[1 + Math.abs(Math.round(stem)) % 2], side * 0.4);
    }
  }
}

function drawFernPlant(ctx, x, baseY, topY, time, colors, stage) {
  const frondCount = 2 + Math.floor(stage * 5);
  for (let frond = 0; frond < frondCount; frond += 1) {
    const offset = frond - (frondCount - 1) / 2;
    const startX = x + offset * 5;
    const frondTop = topY + Math.abs(offset) * 13;
    const sway = Math.sin(time + frond * 0.8) * (4 + Math.abs(offset));
    drawPixelCurve(ctx, colors[0], 3, 2, (t) => ({ x: startX + sway * t * t, y: baseY + (frondTop - baseY) * t }));
    const steps = Math.max(2, Math.floor((baseY - frondTop) / 16));
    for (let i = 1; i <= steps; i += 1) {
      const t = i / (steps + 1);
      const y = baseY + (frondTop - baseY) * t;
      const width = (8 + stage * 11) * (1 - t * 0.5);
      const centerX = startX + sway * t * t;
      const color = i % 3 === 0 ? colors[2] : colors[1];
      drawPixelLine(ctx, centerX, y, centerX - width, y - 7, color, 2);
      drawPixelLine(ctx, centerX, y, centerX + width, y - 7, color, 2);
    }
  }
}

function drawPixelCurve(ctx, color, size, step, pointAt) {
  ctx.fillStyle = color;
  for (let t = 0; t <= 1; t += 1 / 80) {
    const point = pointAt(t);
    ctx.fillRect(Math.round(point.x / step) * step, Math.round(point.y / step) * step, size, size);
  }
}

function drawPixelLine(ctx, startX, startY, endX, endY, color, size = 2) {
  const distance = Math.max(1, Math.hypot(endX - startX, endY - startY));
  ctx.fillStyle = color;
  for (let traveled = 0; traveled <= distance; traveled += 2) {
    const t = traveled / distance;
    ctx.fillRect(Math.round(startX + (endX - startX) * t), Math.round(startY + (endY - startY) * t), size, size);
  }
}

function drawPixelLeaf(ctx, centerX, centerY, radiusX, radiusY, color, angle = 0) {
  const cosine = Math.cos(angle), sine = Math.sin(angle);
  ctx.fillStyle = color;
  for (let py = -radiusY; py <= radiusY; py += 2) {
    const halfWidth = radiusX * Math.sqrt(Math.max(0, 1 - (py * py) / (radiusY * radiusY)));
    for (let px = -halfWidth; px <= halfWidth; px += 2) {
      const x = centerX + px * cosine - py * sine;
      const y = centerY + px * sine + py * cosine;
      ctx.fillRect(Math.round(x), Math.round(y), 2, 2);
    }
  }
}

function drawBubbles(ctx, view, tank) {
  const now = performance.now() / 900;
  const surfaceY = getSurfaceY(view, tank);
  const glass = getGlassBounds(view);
  for (let i = 0; i < 18; i += 1) {
    const xSeed = stableVisualNoise(i, 3.7);
    const speedSeed = stableVisualNoise(i, 8.1);
    const sizeSeed = stableVisualNoise(i, 12.4);
    const baseX = glass.left + 22 + xSeed * Math.max(40, glass.width - 44);
    const x = baseX + Math.sin(now * (0.28 + speedSeed * 0.45) + i * 1.83) * (2 + speedSeed * 7);
    const waterHeight = view.height - surfaceY - 26;
    const rise = (now * (13 + speedSeed * 36) + stableVisualNoise(i, 17.9) * waterHeight) % waterHeight;
    const y = view.height - 24 - rise;
    const r = sizeSeed > 0.9 ? 5 : sizeSeed > 0.64 ? 3 : sizeSeed > 0.24 ? 2 : 1.5;
    drawPixelBubble(ctx, x, y, r, 0.3 + sizeSeed * 0.26, false, i);
  }
}

function drawPixelBubble(ctx, x, y, radius, alpha, trapped, variant = 0) {
  const px = Math.round(x);
  const py = Math.round(y);
  const r = Math.max(2, Math.round(radius));
  if (trapped) {
    ctx.fillStyle = `rgba(205, 234, 218, ${alpha * 0.16})`;
    ctx.fillRect(px - r + 1, py - r + 1, r * 2 - 2, r * 2 - 2);
  }
  ctx.fillStyle = `rgba(224, 248, 241, ${alpha})`;
  const outlinePoints = 14 + r * 2;
  for (let point = 0; point < outlinePoints; point += 1) {
    if ((point + variant * 3) % 11 === 0) continue;
    const angle = point / outlinePoints * Math.PI * 2;
    const wobble = 1 + (stableVisualNoise(point + variant * 19, 4.2) - 0.5) * 0.18;
    const pointX = px + Math.cos(angle) * r * wobble;
    const pointY = py + Math.sin(angle) * r * (0.88 + wobble * 0.12);
    ctx.fillRect(Math.round(pointX), Math.round(pointY), 1, 1);
  }
  ctx.fillStyle = `rgba(255, 255, 249, ${Math.min(0.95, alpha * 1.45)})`;
  ctx.fillRect(px - Math.max(1, Math.floor(r * 0.45)), py - Math.max(1, Math.floor(r * 0.5)), 1 + (r > 4 ? 1 : 0), 1);
}

function stableVisualNoise(index, salt = 0) {
  const value = Math.sin((index + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function drawRock(ctx, x, y, width, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x - width * 0.5, y + 16);
  ctx.lineTo(x - width * 0.32, y - 3);
  ctx.lineTo(x - width * 0.08, y - 16);
  ctx.lineTo(x + width * 0.22, y - 10);
  ctx.lineTo(x + width * 0.5, y + 16);
  ctx.closePath();
  ctx.fill();
}

function drawCoral(ctx, x, y, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - 34);
  ctx.moveTo(x, y - 20);
  ctx.lineTo(x - 16, y - 34);
  ctx.moveTo(x, y - 24);
  ctx.lineTo(x + 15, y - 40);
  ctx.stroke();
}
