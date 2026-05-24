import {
  FaceLandmarker,
  FilesetResolver,
  DrawingUtils
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/vision_bundle.mjs";

import { filtersConfig, categoriesConfig } from "./js/config/filters-data.js";
import { loadFilterImages, drawSimpleFilter } from "./js/render/filters-renderer.js";

const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const statusText = document.getElementById("status");
const currentFilterText = document.getElementById("currentFilter");
const cameraToggleBtn = document.getElementById("cameraToggleBtn");
const landmarksToggleBtn = document.getElementById("landmarksToggleBtn");
const capturePhotoBtn = document.getElementById("capturePhotoBtn");
const downloadPhotoTopBtn = document.getElementById("downloadPhotoTopBtn");
const filtersCategories = document.getElementById("filtersCategories");
const filtersCatalog = document.getElementById("filtersCatalog");
const filterAdjustPanel = document.getElementById("filterAdjustPanel");
const photoPreview = document.getElementById("photoPreview");
const photoMessage = document.getElementById("photoMessage");
const photoModal = document.getElementById("photoModal");
const photoModalImage = document.getElementById("photoModalImage");
const closePhotoModalBtn = document.getElementById("closePhotoModalBtn");

let filterImages = {};
let faceLandmarker = null;
let drawingUtils = null;
let lastVideoTime = -1;
let selectedFilters = new Set();
let selectedCategory = "all";
let lastSelectedFilterId = "none";

let cameraStream = null;
let cameraActive = false;
let showLandmarks = true;
let capturedPhotoDataUrl = "";

function updateFilterLabel() {
  if (!currentFilterText) return;

  if (selectedFilters.size === 0) {
    currentFilterText.textContent = "Filtros selecionados: Sem filtro";
    return;
  }

  const selectedNames = filtersConfig
    .filter((filter) => selectedFilters.has(filter.id))
    .map((filter) => filter.name);

  currentFilterText.textContent = `Filtros selecionados: ${selectedNames.join(" + ")}`;
}

function updateCameraButton() {
  cameraToggleBtn.textContent = cameraActive ? "Desligar câmara" : "Ligar câmara";
}

function updateLandmarksButton() {
  landmarksToggleBtn.textContent = showLandmarks ? "Ocultar landmarks" : "Mostrar landmarks";
}

function updateAdjustPanel() {
  if (!filterAdjustPanel) return;

  if (!lastSelectedFilterId || lastSelectedFilterId === "none") {
    filterAdjustPanel.innerHTML = `
      <p class="adjust-placeholder">
        Seleciona um filtro para ajustar tamanho, posição e rotação.
      </p>
    `;
    return;
  }

  const selectedFilter = filtersConfig.find((filter) => filter.id === lastSelectedFilterId);

  filterAdjustPanel.innerHTML = `
    <p class="adjust-placeholder">
      Filtro atual: <strong>${selectedFilter ? selectedFilter.name : lastSelectedFilterId}</strong><br>
      O painel de ajuste vai ficar aqui na próxima fase.
    </p>
  `;
}

function updateCatalogSelection() {
  const cards = document.querySelectorAll(".filter-card");

  cards.forEach((card) => {
    const filterId = card.dataset.filter;

    if (filterId === "none") {
      card.classList.toggle("active", selectedFilters.size === 0);
    } else {
      card.classList.toggle("active", selectedFilters.has(filterId));
    }
  });
}

function toggleFilterSelection(filterId) {
  if (filterId === "none") {
    selectedFilters.clear();
    lastSelectedFilterId = "none";
  } else {
    if (selectedFilters.has(filterId)) {
      selectedFilters.delete(filterId);

      if (lastSelectedFilterId === filterId) {
        const remaining = Array.from(selectedFilters);
        lastSelectedFilterId = remaining.length > 0 ? remaining[remaining.length - 1] : "none";
      }
    } else {
      selectedFilters.add(filterId);
      lastSelectedFilterId = filterId;
    }
  }

  updateFilterLabel();
  updateCatalogSelection();
  updateAdjustPanel();
}

function updateCategorySelection() {
  const buttons = document.querySelectorAll(".category-chip");

  buttons.forEach((button) => {
    button.classList.toggle("active", button.dataset.category === selectedCategory);
  });
}

function selectCategory(categoryId) {
  selectedCategory = categoryId;
  renderFiltersCatalog();
  updateCategorySelection();
}

function renderCategoriesBar() {
  if (!filtersCategories) return;

  filtersCategories.innerHTML = "";

  categoriesConfig.forEach((category) => {
    const button = document.createElement("button");
    button.className = "category-chip";
    button.dataset.category = category.id;
    button.textContent = category.label;

    button.addEventListener("click", () => {
      selectCategory(category.id);
    });

    filtersCategories.appendChild(button);
  });

  updateCategorySelection();
}

function getVisibleFilters() {
  if (selectedCategory === "all") {
    return filtersConfig;
  }

  return filtersConfig.filter(
    (filter) => filter.id === "none" || filter.category === selectedCategory
  );
}

function renderFiltersCatalog() {
  if (!filtersCatalog) return;

  filtersCatalog.innerHTML = "";

  getVisibleFilters().forEach((filter) => {
    const card = document.createElement("div");
    card.className = "filter-card";
    card.dataset.filter = filter.id;

    if (filter.thumbnail) {
      card.innerHTML = `
        <img src="${filter.thumbnail}" alt="${filter.name}">
        <div class="filter-card-name">${filter.name}</div>
      `;
    } else {
      card.innerHTML = `
        <div class="filter-card-placeholder">🚫</div>
        <div class="filter-card-name">${filter.name}</div>
      `;
    }

    card.addEventListener("click", () => {
      toggleFilterSelection(filter.id);
    });

    filtersCatalog.appendChild(card);
  });

  updateCatalogSelection();
}

function updateViewerFrameSize() {
  const viewerFrame = document.querySelector(".viewer-frame");
  const viewerStage = document.querySelector(".viewer-stage");

  if (!viewerFrame || !viewerStage || !video.videoWidth || !video.videoHeight) {
    return;
  }

  const ratio = video.videoWidth / video.videoHeight;

  const availableHeight = window.innerHeight - 24;
  const maxWidthFromHeight = availableHeight * ratio;
  const stageWidth = viewerStage.clientWidth;

  const finalWidth = Math.min(stageWidth, maxWidthFromHeight);

  viewerFrame.style.aspectRatio = `${video.videoWidth} / ${video.videoHeight}`;
  viewerFrame.style.width = `${finalWidth}px`;
  viewerFrame.style.height = "auto";
}

function resizeCanvas() {
  updateViewerFrameSize();

  const viewerFrame = document.querySelector(".viewer-frame");
  if (!viewerFrame) return;

  const rect = viewerFrame.getBoundingClientRect();

  if (!rect.width || !rect.height) return;

  canvas.width = Math.round(rect.width);
  canvas.height = Math.round(rect.height);
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

  cameraActive = true;
  lastVideoTime = -1;

  resizeCanvas();
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

    drawSimpleFilter(ctx, canvas, landmarks, selectedFilters, filterImages);
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

function capturePhoto() {
  if (!cameraActive || !video.srcObject) {
    photoMessage.textContent = "Liga a câmara antes de tirar uma foto.";
    return;
  }

  const width = video.videoWidth || canvas.width;
  const height = video.videoHeight || canvas.height;

  if (!width || !height) {
    photoMessage.textContent = "Não foi possível capturar a foto.";
    return;
  }

  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = width;
  exportCanvas.height = height;

  const exportCtx = exportCanvas.getContext("2d");

  exportCtx.save();
  exportCtx.translate(width, 0);
  exportCtx.scale(-1, 1);
  exportCtx.drawImage(video, 0, 0, width, height);
  exportCtx.restore();

  exportCtx.save();
  exportCtx.translate(width, 0);
  exportCtx.scale(-1, 1);
  exportCtx.drawImage(canvas, 0, 0, width, height);
  exportCtx.restore();

  capturedPhotoDataUrl = exportCanvas.toDataURL("image/png");

  photoPreview.src = capturedPhotoDataUrl;
  photoPreview.style.display = "block";
  photoMessage.textContent = "Foto capturada com sucesso, clica para ampliar";

  if (downloadPhotoTopBtn) {
    downloadPhotoTopBtn.disabled = false;
  }
}

function openPhotoModal() {
  if (!capturedPhotoDataUrl || !photoModal || !photoModalImage) return;

  photoModalImage.src = capturedPhotoDataUrl;
  photoModal.classList.remove("hidden");
}

function closePhotoModal() {
  if (!photoModal) return;

  photoModal.classList.add("hidden");
}

function downloadPhoto() {
  if (!capturedPhotoDataUrl) return;

  const link = document.createElement("a");
  link.href = capturedPhotoDataUrl;
  link.download = `ar-face-filters-${Date.now()}.png`;
  link.click();
}

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

capturePhotoBtn.addEventListener("click", () => {
  capturePhoto();
});

if (downloadPhotoTopBtn) {
  downloadPhotoTopBtn.addEventListener("click", () => {
    downloadPhoto();
  });
}

window.addEventListener("resize", () => {
  resizeCanvas();
  updateViewerFrameSize();
});

photoPreview.addEventListener("click", () => {
  openPhotoModal();
});

if (closePhotoModalBtn) {
  closePhotoModalBtn.addEventListener("click", () => {
    closePhotoModal();
  });
}

if (photoModal) {
  photoModal.addEventListener("click", (event) => {
    if (event.target === photoModal) {
      closePhotoModal();
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closePhotoModal();
  }
});

async function init() {
  try {
    updateFilterLabel();
    updateCameraButton();
    updateLandmarksButton();
    updateAdjustPanel();

    statusText.textContent = "A carregar deteção facial...";
    await createFaceLandmarker();

    statusText.textContent = "A carregar filtros...";
    filterImages = await loadFilterImages();

    renderCategoriesBar();
    renderFiltersCatalog();

    statusText.textContent = "A iniciar webcam...";
    await startWebcam();

    renderLoop();
  } catch (error) {
    console.error(error);
    statusText.textContent = "Erro ao iniciar a deteção facial";
  }
}

init();