import { filtersConfig } from "../config/filters-data.js";
import {
  loadImage,
  drawRotatedImage,
  getPixelPoints,
  getCenterFromPoints,
  getBoundsFromPoints,
  getEyeCenters,
  LIPS_INDICES,
  FACE_OVAL_INDICES
} from "../core/face-utils.js";

export async function loadFilterImages() {
  const filterImages = {};
  const filtersToLoad = filtersConfig.filter((filter) => filter.asset);

  const loadedImages = await Promise.all(
    filtersToLoad.map(async (filter) => {
      const image = await loadImage(filter.asset);
      return { id: filter.id, image };
    })
  );

  loadedImages.forEach(({ id, image }) => {
    filterImages[id] = image;
  });

  return filterImages;
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

function drawAdjustedFilter(
  ctx,
  filterImages,
  filterId,
  x,
  y,
  width,
  height,
  angle,
  filterAdjustments
) {
  const image = filterImages[filterId];

  if (!image) return;

  const adjustment = getAdjustment(filterId, filterAdjustments);

  const adjustedX = x + adjustment.offsetX;
  const adjustedY = y + adjustment.offsetY;
  const adjustedWidth = width * adjustment.scale;
  const adjustedHeight = height * adjustment.scale;
  const adjustedAngle = angle + (adjustment.rotation * Math.PI) / 180;

  drawRotatedImage(
    ctx,
    image,
    adjustedX,
    adjustedY,
    adjustedWidth,
    adjustedHeight,
    adjustedAngle
  );
}

function drawPixelGlasses(ctx, eyesCenterX, eyesCenterY, eyesDistance, angle, filterAdjustments) {
  const adjustment = getAdjustment("pixel_glasses", filterAdjustments);

  const width = eyesDistance * 2.4 * adjustment.scale;
  const height = width * 0.32;
  const pixel = width / 14;

  const x = eyesCenterX + adjustment.offsetX;
  const y = eyesCenterY + adjustment.offsetY;
  const adjustedAngle = -angle + (adjustment.rotation * Math.PI) / 180;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(adjustedAngle);

  ctx.fillStyle = "#111827";

  // lente esquerda
  ctx.fillRect(-width * 0.52, -height * 0.5, width * 0.42, height);
  ctx.fillRect(-width * 0.46, height * 0.5, width * 0.30, pixel);

  // lente direita
  ctx.fillRect(width * 0.10, -height * 0.5, width * 0.42, height);
  ctx.fillRect(width * 0.16, height * 0.5, width * 0.30, pixel);

  // ponte
  ctx.fillRect(-width * 0.12, -pixel * 0.5, width * 0.24, pixel);

  // brilho pixel
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillRect(-width * 0.46, -height * 0.35, pixel * 2, pixel);
  ctx.fillRect(width * 0.16, -height * 0.35, pixel * 2, pixel);

  // contorno neon
  ctx.strokeStyle = "#00f5ff";
  ctx.lineWidth = Math.max(2, pixel * 0.35);
  ctx.strokeRect(-width * 0.52, -height * 0.5, width * 0.42, height);
  ctx.strokeRect(width * 0.10, -height * 0.5, width * 0.42, height);

  ctx.restore();
}

function drawNeonMask(ctx, landmarks, canvas, angle, filterAdjustments) {
  const adjustment = getAdjustment("neon_mask", filterAdjustments);

  const points = getPixelPoints(landmarks, FACE_OVAL_INDICES, canvas);
  const bounds = getBoundsFromPoints(points);

  const centerX = bounds.minX + bounds.width / 2 + adjustment.offsetX;
  const centerY = bounds.minY + bounds.height / 2 + adjustment.offsetY;

  const scale = adjustment.scale;
  const rotation = -angle + (adjustment.rotation * Math.PI) / 180;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(rotation);
  ctx.scale(scale, scale);

  ctx.shadowBlur = 14;
  ctx.shadowColor = "#00f5ff";
  ctx.strokeStyle = "#00f5ff";
  ctx.lineWidth = 3;

  // contorno principal
  ctx.beginPath();
  ctx.ellipse(0, 0, bounds.width * 0.46, bounds.height * 0.52, 0, 0, Math.PI * 2);
  ctx.stroke();

  // linhas laterais
  ctx.strokeStyle = "#ff2bd6";
  ctx.shadowColor = "#ff2bd6";

  ctx.beginPath();
  ctx.moveTo(-bounds.width * 0.30, -bounds.height * 0.10);
  ctx.lineTo(-bounds.width * 0.14, bounds.height * 0.02);
  ctx.lineTo(-bounds.width * 0.28, bounds.height * 0.16);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(bounds.width * 0.30, -bounds.height * 0.10);
  ctx.lineTo(bounds.width * 0.14, bounds.height * 0.02);
  ctx.lineTo(bounds.width * 0.28, bounds.height * 0.16);
  ctx.stroke();

  // olhos cyber
  ctx.strokeStyle = "#e8ff47";
  ctx.shadowColor = "#e8ff47";

  ctx.beginPath();
  ctx.moveTo(-bounds.width * 0.28, -bounds.height * 0.12);
  ctx.lineTo(-bounds.width * 0.08, -bounds.height * 0.08);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(bounds.width * 0.28, -bounds.height * 0.12);
  ctx.lineTo(bounds.width * 0.08, -bounds.height * 0.08);
  ctx.stroke();

  // linha central
  ctx.strokeStyle = "#00f5ff";
  ctx.shadowColor = "#00f5ff";

  ctx.beginPath();
  ctx.moveTo(0, -bounds.height * 0.28);
  ctx.lineTo(0, bounds.height * 0.26);
  ctx.stroke();

  ctx.restore();
}

export function drawSimpleFilter(ctx, canvas, landmarks, selectedFilters, filterImages, filterAdjustments = {}) {
  if (selectedFilters.size === 0) return;

  const { leftEyeCenter, rightEyeCenter } = getEyeCenters(landmarks, canvas);

  const dx = rightEyeCenter.x - leftEyeCenter.x;
  const dy = rightEyeCenter.y - leftEyeCenter.y;
  const angle = -Math.atan2(dy, dx);
  const eyesDistance = Math.hypot(dx, dy);

  const eyesCenterX = (leftEyeCenter.x + rightEyeCenter.x) / 2;
  const eyesCenterY = (leftEyeCenter.y + rightEyeCenter.y) / 2;

  const lipsPoints = getPixelPoints(landmarks, LIPS_INDICES, canvas);
  const lipsCenter = getCenterFromPoints(lipsPoints);

  const ovalPoints = getPixelPoints(landmarks, FACE_OVAL_INDICES, canvas);
  const ovalBounds = getBoundsFromPoints(ovalPoints);

  const faceCenterX = eyesCenterX;

  if (selectedFilters.has("hat")) {
    const hatX = eyesCenterX;
    const hatY = ovalBounds.minY - ovalBounds.height * 0.04;
    const hatWidth = ovalBounds.width * 1.75;
    const hatHeight = hatWidth * 0.70;

    drawAdjustedFilter(ctx, filterImages, "hat", hatX, hatY, hatWidth, hatHeight, angle, filterAdjustments);
  }

  if (selectedFilters.has("glasses")) {
    const glassesX = eyesCenterX;
    const glassesY = eyesCenterY;
    const glassesWidth = eyesDistance * 4.2;
    const glassesHeight = glassesWidth * 0.55;

    drawAdjustedFilter(ctx, filterImages, "glasses", glassesX, glassesY, glassesWidth, glassesHeight, angle, filterAdjustments);
  }

  if (selectedFilters.has("mask")) {
    const maskX = lipsCenter.x;
    const maskY = lipsCenter.y + ovalBounds.height * 0.02;
    const maskWidth = ovalBounds.width * 0.8;
    const maskHeight = maskWidth * 0.55;

    drawAdjustedFilter(ctx, filterImages, "mask", maskX, maskY, maskWidth, maskHeight, angle, filterAdjustments);
  }

  if (selectedFilters.has("crown")) {
    const crownX = eyesCenterX;
    const crownY = ovalBounds.minY - ovalBounds.height * 0.45;
    const crownWidth = ovalBounds.width * 2.10;
    const crownHeight = crownWidth * 0.75;

    drawAdjustedFilter(ctx, filterImages, "crown", crownX, crownY, crownWidth, crownHeight, angle, filterAdjustments);
  }

  if (selectedFilters.has("santa_hat")) {
    const santaHatX = eyesCenterX;
    const santaHatY = ovalBounds.minY - ovalBounds.height * 0.45;
    const santaHatWidth = ovalBounds.width * 2.10;
    const santaHatHeight = santaHatWidth * 0.75;

    drawAdjustedFilter(ctx, filterImages, "santa_hat", santaHatX, santaHatY, santaHatWidth, santaHatHeight, angle, filterAdjustments);
  }

  if (selectedFilters.has("witch_hat")) {
    const witchHatX = eyesCenterX;
    const witchHatY = ovalBounds.minY - ovalBounds.height * 0.55;
    const witchHatWidth = ovalBounds.width * 2.10;
    const witchHatHeight = witchHatWidth * 0.75;

    drawAdjustedFilter(ctx, filterImages, "witch_hat", witchHatX, witchHatY, witchHatWidth, witchHatHeight, angle, filterAdjustments);
  }

  if (selectedFilters.has("sunglasses")) {
    const sunglassesX = eyesCenterX;
    const sunglassesY = eyesCenterY;
    const sunglassesWidth = eyesDistance * 2.5;
    const sunglassesHeight = sunglassesWidth * 0.50;

    drawAdjustedFilter(ctx, filterImages, "sunglasses", sunglassesX, sunglassesY, sunglassesWidth, sunglassesHeight, angle, filterAdjustments);
  }

  if (selectedFilters.has("mustache")) {
    const mustacheX = eyesCenterX;
    const mustacheY = eyesCenterY + (lipsCenter.y - eyesCenterY) * 0.74;
    const mustacheWidth = eyesDistance * 1.25;
    const mustacheHeight = mustacheWidth * 0.32;

    drawAdjustedFilter(ctx, filterImages, "mustache", mustacheX, mustacheY, mustacheWidth, mustacheHeight, angle, filterAdjustments);
  }

  if (selectedFilters.has("pixel_glasses")) {
    drawPixelGlasses(
      ctx,
      eyesCenterX,
      eyesCenterY,
      eyesDistance,
      angle,
      filterAdjustments
    );
  }

  if (selectedFilters.has("neon_mask")) {
    drawNeonMask(ctx, landmarks, canvas, angle, filterAdjustments);
  }
}