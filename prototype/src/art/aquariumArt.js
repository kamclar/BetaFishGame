import { plantGrowthScale, plantTypes } from "../data/plantData.js";
import { customerCount } from "../data/customerData.js";
import { snailPosition } from "../systems/tankSystem.js";
import { dayNightConfig } from "../config/behaviorConfig.js";

const decorFiles = {
  vallisneria: "plant_vallisneria.png",
  anubias: "plant_anubias.png",
  redLudwigia: "plant_red_ludwigia.png",
  glowFern: "plant_glow_fern.png",
};
const decorImages = new Map();
for (const [key, file] of Object.entries(decorFiles)) {
  const image = new Image(); image.src = `./assets/decor/${file}`; decorImages.set(key, image);
}
const bottomImage = new Image();
bottomImage.src = "./assets/decor/aquarium_bottom.png";
const quarantineBottomImage = new Image();
quarantineBottomImage.src = "./assets/decor/quarantine_bottom.png";
const nurseryBottomImage = new Image();
nurseryBottomImage.src = "./assets/decor/nursery_bottom.png";
const snailImage = new Image();
snailImage.src = "./assets/creatures/ampullaria.png";
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
  ctx.rect(glass.left, surfaceY - 4, glass.width, view.height - surfaceY - 16);
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
    const gradient = ctx.createLinearGradient(0, surfaceY, 0, view.height);
    gradient.addColorStop(0, `rgba(13, 25, 57, ${darkness * 0.72})`);
    gradient.addColorStop(1, `rgba(4, 10, 29, ${darkness})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, surfaceY - 5, view.width, view.height - surfaceY + 5);
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
    ctx.beginPath(); ctx.arc(bx, by, 2 + bubble % 2, 0, Math.PI * 2); ctx.stroke();
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
      ctx.beginPath(); ctx.arc(bx, by, 1.5 + bubble % 2, 0, Math.PI * 2); ctx.stroke();
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
    tank.debrisMap.forEach((level, index) => {
      const x = glass.left + index * cellWidth;
      const ridge = ((index * 13) % 7) - 3;
      const height = Math.max(0, Math.floor(level * 42) + ridge);
      if (height <= 0) return;
      ctx.fillStyle = x % 4 ? "rgba(69, 48, 27, 0.9)" : "rgba(91, 61, 31, 0.9)";
      ctx.fillRect(x, bottom - height, Math.ceil(cellWidth + 1), height);
      ctx.fillStyle = "rgba(121, 82, 40, 0.8)";
      ctx.fillRect(x, bottom - height, Math.ceil(cellWidth), 2);
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
  if (Array.isArray(map) && map.length === 32 * 18) {
    const top = getSurfaceY(view, tank) + 5;
    const width = glass.width - 10;
    const height = view.height - getSurfaceY(view, tank) - 30;
    const mask = document.createElement("canvas");
    mask.width = 32; mask.height = 18;
    const maskCtx = mask.getContext("2d");
    map.forEach((level, index) => {
      if (level < 0.025) return;
      const column = index % 32, row = Math.floor(index / 32);
      maskCtx.fillStyle = `rgba(54, 113, 45, ${Math.min(0.58, Math.pow(level, 1.18) * 0.62)})`;
      maskCtx.fillRect(column, row, 1, 1);
    });
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(mask, glass.left + 5, top, width, height);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

function drawSnails(ctx, view, tank) {
  const count = tank?.snails ?? 0;
  if (!count) return;
  const glass = getGlassBounds(view);
  const waterHeight = view.height - getSurfaceY(view) - 100;
  for (let i = 0; i < count; i += 1) {
    const now = Date.now();
    const position = snailPosition(i, now);
    const previous = snailPosition(i, now - 1200);
    const x = glass.left + 22 + position.x * (glass.width - 44);
    const y = getSurfaceY(view) + 40 + position.y * waterHeight;
    if (snailImage.complete && snailImage.naturalWidth > 0) {
      ctx.save();
      ctx.translate(x, y);
      const dx = position.x - previous.x;
      const dy = position.y - previous.y;
      ctx.rotate(Math.atan2(dy, dx) - Math.PI);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(snailImage, -20, -20, 40, 40);
      ctx.restore();
    }
  }
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
  const surfaceY = getSurfaceY(view);
  const glass = getGlassBounds(view);
  const left = glass.left;
  const right = glass.right;
  const top = surfaceY;
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
  ctx.fillRect(glass.left, surfaceY, glass.width, view.height - surfaceY - glass.bottomInset);

  ctx.strokeStyle = "rgba(235, 255, 250, 0.86)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(glass.left, surfaceY);
  for (let x = glass.left; x <= glass.right; x += 18) {
    const wave = Math.sin(performance.now() / 950 + x * 0.025) * 2;
    ctx.lineTo(x, surfaceY + wave);
  }
  ctx.stroke();

  drawBottomDecor(ctx, view, tankId);
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
  for (const plant of plants) {
    const baseY = view.height - 46;
    const type = plantTypes[plant.type] ?? plantTypes.vallisneria;
    const growthScale = plantGrowthScale(plant);
    const currentHeight = plant.h * growthScale;
    const sprite = decorImages.get(plant.type);
    if (sprite?.complete && sprite.naturalWidth > 0) {
      const scale = currentHeight / 160;
      const width = 96 * scale;
      const sway = Math.sin(performance.now() / 1500 + plant.sway) * 0.025;
      ctx.save();
      ctx.translate(plant.x, baseY);
      ctx.rotate(sway);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(sprite, -width / 2, -currentHeight, width, currentHeight);
      ctx.restore();
      continue;
    }
    const topY = Math.max(surfaceY + 18, baseY - currentHeight);
    const time = performance.now() / 1400 + plant.sway;
    if (type.shape === "ribbon") drawRibbonPlant(ctx, plant.x, baseY, topY, time, type.colors);
    if (type.shape === "broad") drawBroadPlant(ctx, plant.x, baseY, currentHeight, time, type.colors);
    if (type.shape === "stem") drawStemPlant(ctx, plant.x, baseY, topY, time, type.colors);
    if (type.shape === "fern") drawFernPlant(ctx, plant.x, baseY, topY, time, type.colors);
  }
}

function drawRibbonPlant(ctx, x, baseY, topY, time, colors) {
  for (let leaf = 0; leaf < 7; leaf += 1) {
    const offset = (leaf - 3) * 5;
    const sway = Math.sin(time + leaf * 0.7) * (5 + leaf % 3);
    ctx.strokeStyle = colors[leaf % colors.length];
    ctx.lineWidth = 3 + (leaf % 2);
    ctx.beginPath();
    ctx.moveTo(x + offset, baseY);
    ctx.bezierCurveTo(x + offset - sway, baseY - 28, x + sway, topY + 28, x + sway, topY);
    ctx.stroke();
  }
}

function drawBroadPlant(ctx, x, baseY, height, time, colors) {
  ctx.strokeStyle = colors[0];
  ctx.lineWidth = 4;
  for (let leaf = 0; leaf < 6; leaf += 1) {
    const angle = -1.25 + leaf * 0.5;
    const length = height * (0.55 + (leaf % 3) * 0.12);
    const endX = x + Math.cos(angle) * length * 0.48 + Math.sin(time + leaf) * 2;
    const endY = baseY - Math.sin(-angle) * 8 - length * 0.72;
    ctx.beginPath(); ctx.moveTo(x, baseY); ctx.lineTo(endX, endY); ctx.stroke();
    ctx.fillStyle = colors[1 + leaf % 2];
    ctx.beginPath(); ctx.ellipse(endX, endY, 11, 5, angle, 0, Math.PI * 2); ctx.fill();
  }
}

function drawStemPlant(ctx, x, baseY, topY, time, colors) {
  for (let stem = -1; stem <= 1; stem += 1) {
    const sx = x + stem * 10;
    const sway = Math.sin(time + stem) * 5;
    ctx.strokeStyle = colors[0]; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(sx, baseY); ctx.quadraticCurveTo(sx - sway, (baseY + topY) / 2, sx + sway, topY + Math.abs(stem) * 10); ctx.stroke();
    for (let y = baseY - 18; y > topY + 5; y -= 17) {
      const side = ((y / 17 + stem) | 0) % 2 ? -1 : 1;
      ctx.fillStyle = colors[1 + Math.abs(stem) % 2];
      ctx.beginPath(); ctx.ellipse(sx + sway * 0.5 + side * 8, y, 8, 4, side * 0.45, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function drawFernPlant(ctx, x, baseY, topY, time, colors) {
  const sway = Math.sin(time) * 5;
  ctx.strokeStyle = colors[0]; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(x, baseY); ctx.quadraticCurveTo(x - sway, (baseY + topY) / 2, x + sway, topY); ctx.stroke();
  const steps = 7;
  for (let i = 1; i <= steps; i += 1) {
    const t = i / (steps + 1);
    const y = baseY + (topY - baseY) * t;
    const width = 18 * (1 - t * 0.55);
    ctx.strokeStyle = i % 3 === 0 ? colors[2] : colors[1]; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - width + sway * t, y - 8); ctx.moveTo(x, y); ctx.lineTo(x + width + sway * t, y - 8); ctx.stroke();
  }
}

function drawBubbles(ctx, view, tank) {
  const now = performance.now() / 900;
  const surfaceY = getSurfaceY(view, tank);
  ctx.strokeStyle = "rgba(190, 236, 239, 0.42)";
  for (let i = 0; i < 22; i += 1) {
    const x = 40 + ((i * 97) % Math.max(80, view.width - 80));
    const waterHeight = view.height - surfaceY - 26;
    const y = view.height - 24 - (((now * (18 + (i % 5) * 8) + i * 41) % waterHeight));
    const r = 2 + (i % 4);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
  }
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
