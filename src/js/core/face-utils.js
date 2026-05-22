import { FaceLandmarker } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/vision_bundle.mjs";

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Erro ao carregar imagem: ${src}`));
    img.src = src;
  });
}

export function drawRotatedImage(ctx, img, x, y, width, height, angle = 0) {
  if (!img) return;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, -1);
  ctx.rotate(angle);
  ctx.drawImage(img, -width / 2, -height / 2, width, height);
  ctx.restore();
}

function extractIndicesFromConnections(connections) {
  const indices = new Set();

  for (const connection of connections) {
    if (Array.isArray(connection)) {
      indices.add(connection[0]);
      indices.add(connection[1]);
    } else {
      indices.add(connection.start);
      indices.add(connection.end);
    }
  }

  return [...indices];
}

export const LEFT_EYE_INDICES = extractIndicesFromConnections(
  FaceLandmarker.FACE_LANDMARKS_LEFT_EYE
);

export const RIGHT_EYE_INDICES = extractIndicesFromConnections(
  FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE
);

export const LIPS_INDICES = extractIndicesFromConnections(
  FaceLandmarker.FACE_LANDMARKS_LIPS
);

export const FACE_OVAL_INDICES = extractIndicesFromConnections(
  FaceLandmarker.FACE_LANDMARKS_FACE_OVAL
);

export function getPixelPoints(landmarks, indices, canvas) {
  return indices.map((index) => ({
    x: landmarks[index].x * canvas.width,
    y: landmarks[index].y * canvas.height
  }));
}

export function getCenterFromPoints(points) {
  const total = points.reduce(
    (acc, point) => {
      acc.x += point.x;
      acc.y += point.y;
      return acc;
    },
    { x: 0, y: 0 }
  );

  return {
    x: total.x / points.length,
    y: total.y / points.length
  };
}

export function getBoundsFromPoints(points) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const point of points) {
    if (point.x < minX) minX = point.x;
    if (point.y < minY) minY = point.y;
    if (point.x > maxX) maxX = point.x;
    if (point.y > maxY) maxY = point.y;
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY
  };
}

export function getEyeCenters(landmarks, canvas) {
  const leftEyePoints = getPixelPoints(landmarks, LEFT_EYE_INDICES, canvas);
  const rightEyePoints = getPixelPoints(landmarks, RIGHT_EYE_INDICES, canvas);

  return {
    leftEyeCenter: getCenterFromPoints(leftEyePoints),
    rightEyeCenter: getCenterFromPoints(rightEyePoints)
  };
}

export function getFaceBounds(landmarks, canvas) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const point of landmarks) {
    const x = point.x * canvas.width;
    const y = point.y * canvas.height;

    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY
  };
}