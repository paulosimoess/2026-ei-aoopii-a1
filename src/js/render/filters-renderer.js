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

export function drawSimpleFilter(ctx, canvas, landmarks, selectedFilters, filterImages) {
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

    drawRotatedImage(ctx, filterImages.hat, hatX, hatY, hatWidth, hatHeight, angle);
  }

  if (selectedFilters.has("glasses")) {
    const glassesX = eyesCenterX;
    const glassesY = eyesCenterY;
    const glassesWidth = eyesDistance * 4.2;
    const glassesHeight = glassesWidth * 0.55;

    drawRotatedImage(ctx, filterImages.glasses, glassesX, glassesY, glassesWidth, glassesHeight, angle);
  }

  if (selectedFilters.has("mask")) {
    const maskX = lipsCenter.x;
    const maskY = lipsCenter.y + ovalBounds.height * 0.02;
    const maskWidth = ovalBounds.width * 0.8;
    const maskHeight = maskWidth * 0.55;

    drawRotatedImage(ctx, filterImages.mask, maskX, maskY, maskWidth, maskHeight, angle);
  }

  if (selectedFilters.has("crown")) {
    const crownX = eyesCenterX;
    const crownY = ovalBounds.minY - ovalBounds.height * 0.45;
    const crownWidth = ovalBounds.width * 2.10;
    const crownHeight = crownWidth * 0.75;

    drawRotatedImage(ctx, filterImages.crown, crownX, crownY, crownWidth, crownHeight, angle);
  }

  if (selectedFilters.has("santa_hat")) {
    const santaHatX = eyesCenterX;
    const santaHatY = ovalBounds.minY - ovalBounds.height * 0.45;
    const santaHatWidth = ovalBounds.width * 2.10;
    const santaHatHeight = santaHatWidth * 0.75;

    drawRotatedImage(ctx, filterImages.santa_hat, santaHatX, santaHatY, santaHatWidth, santaHatHeight, angle);
  }

  if (selectedFilters.has("witch_hat")) {
    const witchHatX = eyesCenterX;
    const witchHatY = ovalBounds.minY - ovalBounds.height * 0.55;
    const witchHatWidth = ovalBounds.width * 2.10;
    const witchHatHeight = witchHatWidth * 0.75;

    drawRotatedImage(ctx, filterImages.witch_hat, witchHatX, witchHatY, witchHatWidth, witchHatHeight, angle);
  }

  if (selectedFilters.has("reindeer_glasses")) {
    const reindeerX = eyesCenterX;
    const reindeerY = eyesCenterY;
    const reindeerWidth = eyesDistance * 2.5;
    const reindeerHeight = reindeerWidth * 0.55;

    drawRotatedImage(ctx, filterImages.reindeer_glasses, reindeerX, reindeerY, reindeerWidth, reindeerHeight, angle);
  }

  if (selectedFilters.has("sunglasses")) {
    const sunglassesX = eyesCenterX;
    const sunglassesY = eyesCenterY;
    const sunglassesWidth = eyesDistance * 2.5;
    const sunglassesHeight = sunglassesWidth * 0.50;

    drawRotatedImage(ctx, filterImages.sunglasses, sunglassesX, sunglassesY, sunglassesWidth, sunglassesHeight, angle);
  }

  if (selectedFilters.has("mustache")) {
    const mustacheX = eyesCenterX;
    const mustacheY = eyesCenterY + (lipsCenter.y - eyesCenterY) * 0.74;
    const mustacheWidth = eyesDistance * 1.25;
    const mustacheHeight = mustacheWidth * 0.32;

    drawRotatedImage(ctx, filterImages.mustache, mustacheX, mustacheY, mustacheWidth, mustacheHeight, angle);
  }

  if (selectedFilters.has("joker")) {
    const jokerWidth = ovalBounds.width * 1.08;
    const jokerHeight = jokerWidth * 1.30;
    const jokerX = faceCenterX;
    const jokerY = ovalBounds.minY + ovalBounds.height * 0.46;

    drawRotatedImage(ctx, filterImages.joker, jokerX, jokerY, jokerWidth, jokerHeight, angle * 0.35);
  }
}