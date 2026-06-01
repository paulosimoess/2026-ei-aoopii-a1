import {
  FaceLandmarker,
  FilesetResolver,
  DrawingUtils
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/vision_bundle.mjs";

import { filtersConfig, categoriesConfig } from "./js/config/filters-data.js";
import { loadFilterImages, drawSimpleFilter } from "./js/render/filters-renderer.js";

import {
  initThreeRenderer,
  resizeThreeRenderer,
  renderThreeFilters,
  clearThreeRenderer
} from "./js/render/three-renderer.js";

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
const threeCanvas = document.getElementById("threeCanvas");

const FILTER_ADJUSTMENTS_STORAGE_KEY = "ar_face_filter_adjustments";
const FILTER_PRESETS_STORAGE_KEY = "ar_face_filter_presets";

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
let filterAdjustments = {};
let filterPresets = [];

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

function getDefaultAdjustment() {
  return {
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    rotation: 0,
    rotationX: 0,
    rotationY: 0
  };
}

function createDefaultFilterAdjustments() {
  const defaults = {};

  filtersConfig.forEach((filter) => {
    if (filter.id !== "none") {
      defaults[filter.id] = getDefaultAdjustment();
    }
  });

  return defaults;
}

function loadFilterAdjustments() {
  const defaults = createDefaultFilterAdjustments();

  try {
    const saved = localStorage.getItem(FILTER_ADJUSTMENTS_STORAGE_KEY);

    if (!saved) {
      return defaults;
    }

    const parsed = JSON.parse(saved);

    Object.keys(defaults).forEach((filterId) => {
      defaults[filterId] = {
        ...defaults[filterId],
        ...(parsed[filterId] || {})
      };
    });

    return defaults;
  } catch (error) {
    console.error("Erro ao carregar ajustes dos filtros:", error);
    return defaults;
  }
}

function saveFilterAdjustments() {
  localStorage.setItem(
    FILTER_ADJUSTMENTS_STORAGE_KEY,
    JSON.stringify(filterAdjustments)
  );
}

function getFilterAdjustment(filterId) {
  if (!filterAdjustments[filterId]) {
    filterAdjustments[filterId] = getDefaultAdjustment();
  }

  return filterAdjustments[filterId];
}

function updateAdjustValueLabels(filterId) {
  const adjustment = getFilterAdjustment(filterId);

  const scaleValue = document.querySelector('[data-adjust-value="scale"]');
  const offsetXValue = document.querySelector('[data-adjust-value="offsetX"]');
  const offsetYValue = document.querySelector('[data-adjust-value="offsetY"]');
  const rotationValue = document.querySelector('[data-adjust-value="rotation"]');
  const rotationXValue = document.querySelector('[data-adjust-value="rotationX"]');
  const rotationYValue = document.querySelector('[data-adjust-value="rotationY"]');

  if (scaleValue) scaleValue.textContent = `${adjustment.scale.toFixed(2)}x`;
  if (offsetXValue) offsetXValue.textContent = `${adjustment.offsetX}px`;
  if (offsetYValue) offsetYValue.textContent = `${adjustment.offsetY}px`;
  if (rotationValue) rotationValue.textContent = `${adjustment.rotation}°`;
  if (rotationXValue) rotationXValue.textContent = `${adjustment.rotationX || 0}°`;
  if (rotationYValue) rotationYValue.textContent = `${adjustment.rotationY || 0}°`;
}

function loadFilterPresets() {
  try {
    const saved = localStorage.getItem(FILTER_PRESETS_STORAGE_KEY);

    if (!saved) {
      return [];
    }

    return JSON.parse(saved);
  } catch (error) {
    console.error("Erro ao carregar presets:", error);
    return [];
  }
}

function saveFilterPresets() {
  localStorage.setItem(
    FILTER_PRESETS_STORAGE_KEY,
    JSON.stringify(filterPresets)
  );
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getSelectedFilterIds() {
  return Array.from(selectedFilters).filter((filterId) => filterId !== "none");
}

function getFilterName(filterId) {
  const filter = filtersConfig.find((item) => item.id === filterId);
  return filter ? filter.name : filterId;
}

function getPresetsHtml() {
  if (filterPresets.length === 0) {
    return `
      <p class="preset-empty">
        Ainda não existem presets guardados.
      </p>
    `;
  }

  return `
    <div class="presets-list">
      ${filterPresets
        .map((preset) => {
          const filterNames = preset.filters
            .map((filterId) => getFilterName(filterId))
            .join(" + ");

          return `
            <div class="preset-item">
              <div class="preset-info">
                <strong>${escapeHtml(preset.name)}</strong>
                <span>${escapeHtml(filterNames)}</span>
              </div>

              <div class="preset-actions">
                <button class="preset-mini-btn preset-apply-btn" data-preset-id="${preset.id}">
                  Aplicar
                </button>

                <button class="preset-mini-btn preset-delete-btn" data-preset-id="${preset.id}">
                  Apagar
                </button>
              </div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function saveCurrentPreset() {
  const filterIds = getSelectedFilterIds();

  if (filterIds.length === 0) {
    alert("Seleciona pelo menos um filtro antes de guardar um preset.");
    return;
  }

  const defaultName =
    filterIds.length === 1
      ? `Preset ${getFilterName(filterIds[0])}`
      : `Preset ${filterIds.length} filtros`;

  const presetName = prompt("Nome do preset:", defaultName);

  if (presetName === null) {
    return;
  }

  const cleanName = presetName.trim() || defaultName;
  const presetAdjustments = {};

  filterIds.forEach((filterId) => {
    presetAdjustments[filterId] = {
      ...getFilterAdjustment(filterId)
    };
  });

  const newPreset = {
    id: String(Date.now()),
    name: cleanName,
    filters: filterIds,
    adjustments: presetAdjustments,
    createdAt: new Date().toISOString()
  };

  filterPresets.unshift(newPreset);
  saveFilterPresets();
  updateAdjustPanel();
}

function applyPreset(presetId) {
  const preset = filterPresets.find((item) => item.id === presetId);

  if (!preset) {
    return;
  }

  selectedFilters.clear();

  preset.filters.forEach((filterId) => {
    selectedFilters.add(filterId);

    filterAdjustments[filterId] = {
      ...getDefaultAdjustment(),
      ...(preset.adjustments[filterId] || {})
    };
  });

  lastSelectedFilterId = preset.filters.length > 0 ? preset.filters[0] : "none";

  saveFilterAdjustments();
  updateFilterLabel();
  updateCatalogSelection();
  updateAdjustPanel();
}

function deletePreset(presetId) {
  filterPresets = filterPresets.filter((item) => item.id !== presetId);
  saveFilterPresets();
  updateAdjustPanel();
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

  if (!selectedFilter) {
    filterAdjustPanel.innerHTML = `
      <p class="adjust-placeholder">
        Não foi possível encontrar o filtro selecionado.
      </p>
    `;
    return;
  }

  const adjustment = getFilterAdjustment(lastSelectedFilterId);

  const is3DFilter = selectedFilter.type === "3d";

  const extra3DRotationControls = is3DFilter
    ? `
      <div class="adjust-control">
        <div class="adjust-label">
          <span>Inclinação frente/trás</span>
          <strong data-adjust-value="rotationX">${adjustment.rotationX || 0}°</strong>
        </div>
        <input
          type="range"
          min="-45"
          max="45"
          step="1"
          value="${adjustment.rotationX || 0}"
          data-adjust="rotationX"
        />
      </div>

      <div class="adjust-control">
        <div class="adjust-label">
          <span>Virar esquerda/direita 3D</span>
          <strong data-adjust-value="rotationY">${adjustment.rotationY || 0}°</strong>
        </div>
        <input
          type="range"
          min="-45"
          max="45"
          step="1"
          value="${adjustment.rotationY || 0}"
          data-adjust="rotationY"
        />
      </div>
    `
    : "";

  filterAdjustPanel.innerHTML = `
    <div class="adjust-title">
      <span>Filtro atual</span>
      <strong>${escapeHtml(selectedFilter.name)}</strong>
    </div>

    <div class="adjust-control">
      <div class="adjust-label">
        <span>Tamanho</span>
        <strong data-adjust-value="scale">${adjustment.scale.toFixed(2)}x</strong>
      </div>
      <input
        type="range"
        min="0.50"
        max="1.80"
        step="0.05"
        value="${adjustment.scale}"
        data-adjust="scale"
      />
    </div>

    <div class="adjust-control">
      <div class="adjust-label">
        <span>Posição horizontal</span>
        <strong data-adjust-value="offsetX">${adjustment.offsetX}px</strong>
      </div>
      <input
        type="range"
        min="-120"
        max="120"
        step="1"
        value="${adjustment.offsetX}"
        data-adjust="offsetX"
      />
    </div>

    <div class="adjust-control">
      <div class="adjust-label">
        <span>Posição vertical</span>
        <strong data-adjust-value="offsetY">${adjustment.offsetY}px</strong>
      </div>
      <input
        type="range"
        min="-120"
        max="120"
        step="1"
        value="${adjustment.offsetY}"
        data-adjust="offsetY"
      />
    </div>

    <div class="adjust-control">
      <div class="adjust-label">
        <span>Rotação Lateral</span>
        <strong data-adjust-value="rotation">${adjustment.rotation}°</strong>
      </div>
      <input
        type="range"
        min="-45"
        max="45"
        step="1"
        value="${adjustment.rotation}"
        data-adjust="rotation"
      />
    </div>

    ${extra3DRotationControls}

    <div class="adjust-actions">
      <button id="resetAdjustmentsBtn" class="panel-btn panel-btn-secondary">
        Repor ajustes
      </button>

      <button id="savePresetBtn" class="panel-btn">
        Guardar preset
      </button>
    </div>

    <div class="preset-section">
      <div class="preset-section-title">
        <strong>Presets guardados</strong>
      </div>

      ${getPresetsHtml()}
    </div>
  `;

  const inputs = filterAdjustPanel.querySelectorAll("[data-adjust]");

  inputs.forEach((input) => {
    input.addEventListener("input", () => {
      const key = input.dataset.adjust;
      const value = Number(input.value);

      filterAdjustments[lastSelectedFilterId][key] = value;

      saveFilterAdjustments();
      updateAdjustValueLabels(lastSelectedFilterId);
    });
  });

  const resetButton = document.getElementById("resetAdjustmentsBtn");

  if (resetButton) {
    resetButton.addEventListener("click", () => {
      filterAdjustments[lastSelectedFilterId] = getDefaultAdjustment();
      saveFilterAdjustments();
      updateAdjustPanel();
    });
  }

  const savePresetButton = document.getElementById("savePresetBtn");

  if (savePresetButton) {
    savePresetButton.addEventListener("click", () => {
      saveCurrentPreset();
    });
  }

  const applyPresetButtons = filterAdjustPanel.querySelectorAll(".preset-apply-btn");

  applyPresetButtons.forEach((button) => {
    button.addEventListener("click", () => {
      applyPreset(button.dataset.presetId);
    });
  });

  const deletePresetButtons = filterAdjustPanel.querySelectorAll(".preset-delete-btn");

  deletePresetButtons.forEach((button) => {
    button.addEventListener("click", () => {
      deletePreset(button.dataset.presetId);
    });
  });
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
    } else if (filter.emoji) {
      card.innerHTML = `
        <div class="filter-card-placeholder filter-card-emoji">${filter.emoji}</div>
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
  resizeThreeRenderer(canvas.width, canvas.height);
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
  clearThreeRenderer();
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
    outputFacialTransformationMatrixes: true
  });

  drawingUtils = new DrawingUtils(ctx);
}

function drawResults(results) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!results.faceLandmarks || results.faceLandmarks.length === 0) {
    statusText.textContent = "À procura de rosto...";
    clearThreeRenderer();
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

    renderThreeFilters(canvas, landmarks, selectedFilters, filterAdjustments);
    drawSimpleFilter(ctx, canvas, landmarks, selectedFilters, filterImages, filterAdjustments);
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

  if (threeCanvas) {
    exportCtx.save();
    exportCtx.translate(width, 0);
    exportCtx.scale(-1, 1);
    exportCtx.drawImage(threeCanvas, 0, 0, width, height);
    exportCtx.restore();
  }

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
    clearThreeRenderer();
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
    filterAdjustments = loadFilterAdjustments();
    filterPresets = loadFilterPresets();

    updateFilterLabel();
    updateCameraButton();
    updateLandmarksButton();
    updateAdjustPanel();

    statusText.textContent = "A carregar deteção facial...";
    await createFaceLandmarker();

    statusText.textContent = "A carregar filtros...";
    filterImages = await loadFilterImages();

    initThreeRenderer(threeCanvas);

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