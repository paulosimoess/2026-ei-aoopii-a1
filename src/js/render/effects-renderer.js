import {
  getPixelPoints,
  getBoundsFromPoints,
  FACE_OVAL_INDICES
} from "../core/face-utils.js";

const fireParticles = [];
const matrixColumns = [];

let lastMatrixWidth = 0;
let lastMatrixHeight = 0;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getAdjustment(filterId, filterAdjustments) {
  return {
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    rotation: 0,
    ...(filterAdjustments[filterId] || {})
  };
}

function getFaceBounds(landmarks, canvas) {
  const ovalPoints = getPixelPoints(landmarks, FACE_OVAL_INDICES, canvas);
  return getBoundsFromPoints(ovalPoints);
}

function getExpandedBounds(bounds, paddingX, paddingY) {
  return {
    x: bounds.minX - paddingX,
    y: bounds.minY - paddingY,
    width: bounds.width + paddingX * 2,
    height: bounds.height + paddingY * 2
  };
}

function drawGlitchEffect(ctx, canvas, video, landmarks, filterAdjustments) {
  if (!video || video.readyState < 2) return;

  const adjustment = getAdjustment("glitch", filterAdjustments);
  const bounds = getFaceBounds(landmarks, canvas);

  const intensity = clamp(adjustment.scale, 0.5, 1.8);
  const amount = clamp(intensity / 1.8, 0.25, 1);

  const area = getExpandedBounds(
    bounds,
    bounds.width * 0.18,
    bounds.height * 0.12
  );

  const x = area.x + adjustment.offsetX;
  const y = area.y + adjustment.offsetY;
  const w = area.width;
  const h = area.height;

  const sourceScaleX = video.videoWidth / canvas.width;
  const sourceScaleY = video.videoHeight / canvas.height;

  const slices = Math.floor(5 + amount * 10);

  for (let i = 0; i < slices; i++) {
    if (Math.random() > amount * 0.75) continue;

    const sliceY = y + Math.random() * h;
    const sliceH = 2 + Math.random() * (h / slices);
    const offsetX = (Math.random() - 0.5) * bounds.width * amount * 0.45;

    const sx = clamp(x, 0, canvas.width) * sourceScaleX;
    const sy = clamp(sliceY, 0, canvas.height) * sourceScaleY;
    const sw = clamp(w, 1, canvas.width) * sourceScaleX;
    const sh = clamp(sliceH, 1, canvas.height) * sourceScaleY;

    ctx.save();
    ctx.drawImage(
      video,
      sx,
      sy,
      sw,
      sh,
      x + offsetX,
      sliceY,
      w,
      sliceH
    );
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.35 * amount;
    ctx.fillStyle =
      Math.random() > 0.5
        ? "rgba(255, 0, 70, 0.65)"
        : "rgba(0, 255, 255, 0.65)";
    ctx.fillRect(x + offsetX, sliceY, w, sliceH);
    ctx.restore();
  }

  ctx.save();
  ctx.globalAlpha = 0.12 * amount;

  for (let scanY = y; scanY < y + h; scanY += 4) {
    ctx.fillStyle = "#000000";
    ctx.fillRect(x, scanY, w, 2);
  }

  ctx.restore();
}

function drawInfernoEffect(ctx, canvas, landmarks, filterAdjustments) {
  const adjustment = getAdjustment("inferno", filterAdjustments);
  const bounds = getFaceBounds(landmarks, canvas);

  const intensity = clamp(adjustment.scale, 0.5, 1.8);
  const spawnCount = Math.floor(4 + intensity * 5);

  const startX = bounds.minX - bounds.width * 0.12 + adjustment.offsetX;
  const endX = bounds.minX + bounds.width * 1.12 + adjustment.offsetX;
  const startY = bounds.minY + bounds.height * 0.08 + adjustment.offsetY;

  for (let i = 0; i < spawnCount; i++) {
    fireParticles.push({
      x: startX + Math.random() * (endX - startX),
      y: startY,
      vx: (Math.random() - 0.5) * bounds.width * 0.015,
      vy:
        -(
          Math.random() * bounds.height * 0.025 +
          bounds.height * 0.012
        ) * intensity,
      life: 1,
      size: Math.random() * bounds.width * 0.07 + bounds.width * 0.035
    });
  }

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  for (let i = fireParticles.length - 1; i >= 0; i--) {
    const particle = fireParticles[i];

    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy *= 0.965;
    particle.vx *= 0.975;
    particle.life -= 0.035;
    particle.size *= 0.985;

    if (particle.life <= 0 || particle.size <= 1) {
      fireParticles.splice(i, 1);
      continue;
    }

    const life = particle.life;
    const green = Math.floor(80 + 170 * life);
    const yellow = Math.floor(80 + 120 * life);

    const gradient = ctx.createRadialGradient(
      particle.x,
      particle.y,
      0,
      particle.x,
      particle.y,
      particle.size
    );

    gradient.addColorStop(0, `rgba(255, 255, ${yellow}, ${0.95 * life})`);
    gradient.addColorStop(0.35, `rgba(255, ${green}, 0, ${0.75 * life})`);
    gradient.addColorStop(1, "rgba(180, 0, 0, 0)");

    ctx.globalAlpha = life;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  ctx.restore();

  if (fireParticles.length > 450) {
    fireParticles.splice(0, fireParticles.length - 450);
  }
}

function createMatrixColumn(height) {
  return {
    y: Math.random() * height,
    speed: 1 + Math.random() * 3,
    chars: Array.from({ length: 22 }, () =>
      String.fromCharCode(0x30a0 + Math.random() * 96)
    )
  };
}

function drawMatrixEffect(ctx, canvas, landmarks, filterAdjustments) {
  const adjustment = getAdjustment("matrix", filterAdjustments);
  const bounds = getFaceBounds(landmarks, canvas);

  const density = clamp(adjustment.scale, 0.5, 1.8);

  const area = getExpandedBounds(
    bounds,
    bounds.width * 0.18,
    bounds.height * 0.16
  );

  const x = area.x + adjustment.offsetX;
  const y = area.y + adjustment.offsetY;
  const w = area.width;
  const h = area.height;

  const columnWidth = 14;
  const columnsNeeded = Math.max(
    4,
    Math.floor((w / columnWidth) * density * 0.75)
  );

  if (canvas.width !== lastMatrixWidth || canvas.height !== lastMatrixHeight) {
    matrixColumns.length = 0;
    lastMatrixWidth = canvas.width;
    lastMatrixHeight = canvas.height;
  }

  while (matrixColumns.length < columnsNeeded) {
    matrixColumns.push(createMatrixColumn(h));
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  ctx.font = `${columnWidth}px monospace`;
  ctx.textBaseline = "top";

  matrixColumns.slice(0, columnsNeeded).forEach((column, index) => {
    const columnX = x + (index / columnsNeeded) * w;

    column.y += column.speed;

    if (column.y > h + columnWidth * column.chars.length) {
      column.y = 0;
      column.speed = 1 + Math.random() * 3;
      column.chars = column.chars.map(() =>
        String.fromCharCode(0x30a0 + Math.random() * 96)
      );
    }

    column.chars.forEach((char, charIndex) => {
      const charY = column.y - charIndex * columnWidth;

      if (charY < 0 || charY > h) return;

      const alpha = Math.max(0, 1 - charIndex * 0.065);

      ctx.globalAlpha = alpha * 0.85;
      ctx.fillStyle = charIndex === 0 ? "#d9ffd9" : "#00ff41";
      ctx.fillText(char, columnX, y + charY);
    });
  });

  ctx.restore();
  ctx.globalAlpha = 1;
}

export function clearEffectStates() {
  fireParticles.length = 0;
  matrixColumns.length = 0;
}

export function drawEffectFilters(
  ctx,
  canvas,
  video,
  landmarks,
  selectedFilters,
  filterAdjustments = {}
) {
  if (selectedFilters.has("glitch")) {
    drawGlitchEffect(ctx, canvas, video, landmarks, filterAdjustments);
  }

  if (selectedFilters.has("inferno")) {
    drawInfernoEffect(ctx, canvas, landmarks, filterAdjustments);
  }

  if (selectedFilters.has("matrix")) {
    drawMatrixEffect(ctx, canvas, landmarks, filterAdjustments);
  }
}