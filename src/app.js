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
const filterButtons = document.querySelectorAll(".filter-btn");

let faceLandmarker = null;
let drawingUtils = null;
let lastVideoTime = -1;
let selectedFilter = "none";

function updateFilterLabel() {
  const labels = {
    none: "Sem filtro",
    hat: "Chapéu",
    glasses: "Óculos",
    mask: "Máscara"
  };

  currentFilterText.textContent = `Filtro selecionado: ${labels[selectedFilter]}`;
}

function resizeCanvas() {
  canvas.width = video.videoWidth || video.clientWidth;
  canvas.height = video.videoHeight || video.clientHeight;
}

async function startWebcam() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: false
  });

  video.srcObject = stream;

  await new Promise((resolve) => {
    video.onloadedmetadata = () => {
      video.play();
      resolve();
    };
  });

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
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

function drawSimpleFilter(bounds) {
  if (selectedFilter === "none") return;

  ctx.save();

  if (selectedFilter === "hat") {
    const hatWidth = bounds.width * 0.75;
    const hatHeight = bounds.height * 0.22;
    const hatX = bounds.minX + bounds.width * 0.125;
    const hatY = bounds.minY - bounds.height * 0.22;

    const brimWidth = bounds.width * 1.05;
    const brimHeight = bounds.height * 0.06;
    const brimX = bounds.minX - bounds.width * 0.025;
    const brimY = hatY + hatHeight - 6;

    ctx.fillStyle = "rgba(70, 90, 220, 0.75)";
    ctx.fillRect(hatX, hatY, hatWidth, hatHeight);

    ctx.fillStyle = "rgba(40, 55, 170, 0.85)";
    ctx.fillRect(brimX, brimY, brimWidth, brimHeight);
  }

  if (selectedFilter === "glasses") {
    const y = bounds.minY + bounds.height * 0.32;
    const frameWidth = bounds.width * 0.28;
    const frameHeight = bounds.height * 0.18;
    const gap = bounds.width * 0.10;

    const leftX = bounds.minX + bounds.width * 0.17;
    const rightX = leftX + frameWidth + gap;

    ctx.strokeStyle = "rgba(20, 20, 20, 0.9)";
    ctx.lineWidth = 5;

    ctx.strokeRect(leftX, y, frameWidth, frameHeight);
    ctx.strokeRect(rightX, y, frameWidth, frameHeight);

    ctx.beginPath();
    ctx.moveTo(leftX + frameWidth, y + frameHeight / 2);
    ctx.lineTo(rightX, y + frameHeight / 2);
    ctx.stroke();
  }

  if (selectedFilter === "mask") {
    const maskX = bounds.minX + bounds.width * 0.16;
    const maskY = bounds.minY + bounds.height * 0.48;
    const maskWidth = bounds.width * 0.68;
    const maskHeight = bounds.height * 0.28;

    ctx.fillStyle = "rgba(255, 120, 120, 0.45)";
    ctx.strokeStyle = "rgba(180, 60, 60, 0.8)";
    ctx.lineWidth = 2;

    ctx.fillRect(maskX, maskY, maskWidth, maskHeight);
    ctx.strokeRect(maskX, maskY, maskWidth, maskHeight);
  }

  ctx.restore();
}

function drawResults(results) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!results.faceLandmarks || results.faceLandmarks.length === 0) {
    statusText.textContent = "À procura de rosto...";
    return;
  }

  statusText.textContent = "Rosto detetado";

  for (const landmarks of results.faceLandmarks) {
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

    const bounds = getFaceBounds(landmarks);
    drawSimpleFilter(bounds);
  }
}

function renderLoop() {
  if (video.readyState >= 2 && faceLandmarker) {
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

async function init() {
  try {
    statusText.textContent = "A iniciar webcam...";
    updateFilterLabel();

    await startWebcam();

    statusText.textContent = "A carregar deteção facial...";
    await createFaceLandmarker();

    statusText.textContent = "Deteção facial ativa";
    renderLoop();
  } catch (error) {
    console.error(error);
    statusText.textContent = "Erro ao iniciar a deteção facial";
  }
}

init();