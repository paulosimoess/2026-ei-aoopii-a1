import {
  FaceLandmarker,
  FilesetResolver,
  DrawingUtils
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/vision_bundle.mjs";

const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const statusText = document.getElementById("status");
const currentFilterText = document.getElementById("currentFilter");
const filterButtons = document.querySelectorAll(".filter-btn[data-filter]");
const cameraToggleBtn = document.getElementById("cameraToggleBtn");
const landmarksToggleBtn = document.getElementById("landmarksToggleBtn");

const filterImages = {};

let faceLandmarker = null;
let drawingUtils = null;
let lastVideoTime = -1;
let selectedFilter = "none";
let cameraStream = null;
let cameraActive = false;
let showLandmarks = true;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Erro ao carregar imagem: ${src}`));
    img.src = src;
  });
}

async function loadFilterImages() {
  const [hat, glasses, mask] = await Promise.all([
    loadImage("./assets/hat.png"),
    loadImage("./assets/glasses.png"),
    loadImage("./assets/mask.png")
  ]);

  filterImages.hat = hat;
  filterImages.glasses = glasses;
  filterImages.mask = mask;
}

function drawRotatedImage(img, x, y, width, height, angle = 0) {
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

const LEFT_EYE_INDICES = extractIndicesFromConnections(
  FaceLandmarker.FACE_LANDMARKS_LEFT_EYE
);

const RIGHT_EYE_INDICES = extractIndicesFromConnections(
  FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE
);

const LIPS_INDICES = extractIndicesFromConnections(
  FaceLandmarker.FACE_LANDMARKS_LIPS
);

const FACE_OVAL_INDICES = extractIndicesFromConnections(
  FaceLandmarker.FACE_LANDMARKS_FACE_OVAL
);

function getPixelPoints(landmarks, indices) {
  return indices.map((index) => ({
    x: landmarks[index].x * canvas.width,
    y: landmarks[index].y * canvas.height
  }));
}

function getCenterFromPoints(points) {
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

function getBoundsFromPoints(points) {
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

function getEyeCenters(landmarks) {
  const leftEyePoints = getPixelPoints(landmarks, LEFT_EYE_INDICES);
  const rightEyePoints = getPixelPoints(landmarks, RIGHT_EYE_INDICES);

  return {
    leftEyeCenter: getCenterFromPoints(leftEyePoints),
    rightEyeCenter: getCenterFromPoints(rightEyePoints)
  };
}

function updateFilterLabel() {
  const labels = {
    none: "Sem filtro",
    hat: "Chapéu",
    glasses: "Óculos",
    mask: "Máscara"
  };

  currentFilterText.textContent = `Filtro selecionado: ${labels[selectedFilter]}`;
}

function updateCameraButton() {
  cameraToggleBtn.textContent = cameraActive ? "Desligar câmara" : "Ligar câmara";
}

function updateLandmarksButton() {
  landmarksToggleBtn.textContent = showLandmarks ? "Ocultar landmarks" : "Mostrar landmarks";
}

function resizeCanvas() {
  canvas.width = video.videoWidth || video.clientWidth || canvas.width;
  canvas.height = video.videoHeight || video.clientHeight || canvas.height;
}

async function startWebcam() {
  cameraStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: false
  });

  video.srcObject = cameraStream;

  await new Promise((resolve) => {
    video.onloadedmetadata = () => {
      video.play();
      resolve();
    };
  });

  resizeCanvas();
  cameraActive = true;
  lastVideoTime = -1;
  updateCameraButton();
  statusText.textContent = "Webcam ativa";
}

function stopWebcam() {
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
    cameraStream = null;
  }

  video.srcObject = null;
  cameraActive = false;
  lastVideoTime = -1;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  updateCameraButton();
  statusText.textContent = "Câmara desligada";
}

async function toggleCamera() {
  if (cameraActive) {
    stopWebcam();
    return;
  }

  try {
    statusText.textContent = "A iniciar webcam...";
    await startWebcam();
  } catch (error) {
    console.error(error);
    statusText.textContent = "Não foi possível iniciar a câmara";
  }
}

async function createFaceLandmarker() {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
  );

  faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: "./models/face_landmarker.task"
    },
    runningMode: "VIDEO",
    numFaces: 1,
    minFaceDetectionConfidence: 0.5,
    minFacePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
    outputFaceBlendshapes: false,
    outputFacialTransformationMatrixes: false
  });

  drawingUtils = new DrawingUtils(ctx);
}

function getFaceBounds(landmarks) {
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

function drawSimpleFilter(bounds, landmarks) {
  if (selectedFilter === "none") return;

  const { leftEyeCenter, rightEyeCenter } = getEyeCenters(landmarks);

  const dx = rightEyeCenter.x - leftEyeCenter.x;
  const dy = rightEyeCenter.y - leftEyeCenter.y;
  const angle = -Math.atan2(dy, dx);
  const eyesDistance = Math.hypot(dx, dy);

  const eyesCenterX = (leftEyeCenter.x + rightEyeCenter.x) / 2;
  const eyesCenterY = (leftEyeCenter.y + rightEyeCenter.y) / 2;

  if (selectedFilter === "hat") {
    const ovalPoints = getPixelPoints(landmarks, FACE_OVAL_INDICES);
    const ovalBounds = getBoundsFromPoints(ovalPoints);

    const hatX = eyesCenterX;
    const hatY = ovalBounds.minY - ovalBounds.height * 0.04;

    const hatWidth = ovalBounds.width * 1.75;
    const hatHeight = hatWidth * 0.60;

    drawRotatedImage(
      filterImages.hat,
      hatX,
      hatY,
      hatWidth,
      hatHeight,
      angle
    );
  }

  if (selectedFilter === "glasses") {
    const glassesX = eyesCenterX;
    const glassesY = eyesCenterY;

    const glassesWidth = eyesDistance * 4.2;
    const glassesHeight = glassesWidth * 0.55;

    drawRotatedImage(
      filterImages.glasses,
      glassesX,
      glassesY,
      glassesWidth,
      glassesHeight,
      angle
    );
  }

  if (selectedFilter === "mask") {
    const lipsPoints = getPixelPoints(landmarks, LIPS_INDICES);
    const ovalPoints = getPixelPoints(landmarks, FACE_OVAL_INDICES);

    const lipsCenter = getCenterFromPoints(lipsPoints);
    const ovalBounds = getBoundsFromPoints(ovalPoints);

    const maskX = lipsCenter.x;
    const maskY = lipsCenter.y + ovalBounds.height * 0.02;

    const maskWidth = ovalBounds.width * 0.8;
    const maskHeight = maskWidth * 0.55;

    drawRotatedImage(
      filterImages.mask,
      maskX,
      maskY,
      maskWidth,
      maskHeight,
      angle
    );
  }
}

function drawResults(results) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!results.faceLandmarks || results.faceLandmarks.length === 0) {
    statusText.textContent = "À procura de rosto...";
    return;
  }

  statusText.textContent = "Rosto detetado";

  for (const landmarks of results.faceLandmarks) {
    if (showLandmarks) {
      drawingUtils.drawConnectors(
        landmarks,
        FaceLandmarker.FACE_LANDMARKS_TESSELATION,
        { color: "rgba(180, 190, 255, 0.35)", lineWidth: 1 }
      );

      drawingUtils.drawConnectors(
        landmarks,
        FaceLandmarker.FACE_LANDMARKS_FACE_OVAL,
        { color: "#2f3dbd", lineWidth: 2 }
      );

      drawingUtils.drawConnectors(
        landmarks,
        FaceLandmarker.FACE_LANDMARKS_LEFT_EYE,
        { color: "#00aa88", lineWidth: 2 }
      );

      drawingUtils.drawConnectors(
        landmarks,
        FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE,
        { color: "#00aa88", lineWidth: 2 }
      );

      drawingUtils.drawConnectors(
        landmarks,
        FaceLandmarker.FACE_LANDMARKS_LIPS,
        { color: "#cc4477", lineWidth: 2 }
      );

      drawingUtils.drawLandmarks(landmarks, {
        color: "#1f2a7a",
        radius: 1.2
      });
    }

    const bounds = getFaceBounds(landmarks);
    drawSimpleFilter(bounds, landmarks);
  }
}

function renderLoop() {
  if (cameraActive && video.readyState >= 2 && faceLandmarker) {
    if (video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime;
      const results = faceLandmarker.detectForVideo(video, performance.now());
      drawResults(results);
    }
  }

  requestAnimationFrame(renderLoop);
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    filterButtons.forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");
    selectedFilter = button.dataset.filter;
    updateFilterLabel();
  });
});

cameraToggleBtn.addEventListener("click", async () => {
  await toggleCamera();
});

landmarksToggleBtn.addEventListener("click", () => {
  showLandmarks = !showLandmarks;
  updateLandmarksButton();

  if (!cameraActive) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
});

window.addEventListener("resize", resizeCanvas);

async function init() {
  try {
    updateFilterLabel();
    updateCameraButton();
    updateLandmarksButton();

    statusText.textContent = "A carregar deteção facial...";
    await createFaceLandmarker();

    statusText.textContent = "A carregar filtros...";
    await loadFilterImages();

    statusText.textContent = "A iniciar webcam...";
    await startWebcam();

    renderLoop();
  } catch (error) {
    console.error(error);
    statusText.textContent = "Erro ao iniciar a deteção facial";
  }
}

init();