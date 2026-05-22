import {
  FaceLandmarker,
  FilesetResolver,
  DrawingUtils
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/vision_bundle.mjs";

import { filtersConfig, categoriesConfig } from "./js/config/filters-data.js";
import { getFaceBounds } from "./js/core/face-utils.js";
import { loadFilterImages, drawSimpleFilter } from "./js/render/filters-renderer.js";

const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const statusText = document.getElementById("status");
const currentFilterText = document.getElementById("currentFilter");
const filtersCatalog = document.getElementById("filtersCatalog");
const favoriteFiltersCatalog = document.getElementById("favoriteFiltersCatalog");
const cameraToggleBtn = document.getElementById("cameraToggleBtn");
const landmarksToggleBtn = document.getElementById("landmarksToggleBtn");
const themeToggleBtn = document.getElementById("themeToggleBtn");
const suggestionInput = document.getElementById("suggestionInput");
const submitSuggestionBtn = document.getElementById("submitSuggestionBtn");
const suggestionMessage = document.getElementById("suggestionMessage");
const suggestionsList = document.getElementById("suggestionsList");
const clearSuggestionsBtn = document.getElementById("clearSuggestionsBtn");
const capturePhotoBtn = document.getElementById("capturePhotoBtn");
const downloadPhotoBtn = document.getElementById("downloadPhotoBtn");
const photoPreview = document.getElementById("photoPreview");
const photoMessage = document.getElementById("photoMessage");
const filtersPrevBtn = document.getElementById("filtersPrevBtn");
const filtersNextBtn = document.getElementById("filtersNextBtn");
const filtersCategories = document.getElementById("filtersCategories");
const downloadPhotoTopBtn = document.getElementById("downloadPhotoTopBtn");

let filterImages = {};
let faceLandmarker = null;
let drawingUtils = null;
let lastVideoTime = -1;
let selectedFilters = new Set();
let cameraStream = null;
let cameraActive = false;
let showLandmarks = true;
let capturedPhotoDataUrl = "";
let selectedCategory = "all";

function getFavoriteFilters() {
  const savedFavorites = localStorage.getItem("favoriteFilters");
  return savedFavorites ? JSON.parse(savedFavorites) : [];
}

function saveFavoriteFilters(favorites) {
  localStorage.setItem("favoriteFilters", JSON.stringify(favorites));
}

function isFavoriteFilter(filterId) {
  return getFavoriteFilters().includes(filterId);
}

function toggleFavoriteFilter(filterId) {
  if (filterId === "none") return;

  const favorites = getFavoriteFilters();

  if (favorites.includes(filterId)) {
    const updatedFavorites = favorites.filter((id) => id !== filterId);
    saveFavoriteFilters(updatedFavorites);
  } else {
    favorites.push(filterId);
    saveFavoriteFilters(favorites);
  }

  renderFiltersCatalog();
  renderFavoriteFiltersCatalog();
}

function applyTheme(theme) {
  document.body.classList.toggle("dark-mode", theme === "dark");
  localStorage.setItem("themeMode", theme);
  themeToggleBtn.textContent = theme === "dark" ? "Modo claro" : "Modo escuro";
}

function toggleTheme() {
  const isDark = document.body.classList.contains("dark-mode");
  applyTheme(isDark ? "light" : "dark");
}

function updateFilterLabel() {
  if (selectedFilters.size === 0) {
    currentFilterText.textContent = "Filtros selecionados: Sem filtro";
    return;
  }

  const selectedNames = filtersConfig
    .filter((filter) => selectedFilters.has(filter.id))
    .map((filter) => filter.name);

  currentFilterText.textContent = `Filtros selecionados: ${selectedNames.join(" + ")}`;
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
  } else {
    if (selectedFilters.has(filterId)) {
      selectedFilters.delete(filterId);
    } else {
      selectedFilters.add(filterId);
    }
  }

  updateFilterLabel();
  updateCatalogSelection();
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
  filtersCatalog.innerHTML = "";

  getVisibleFilters().forEach((filter) => {
    const card = document.createElement("div");
    card.className = "filter-card";
    card.dataset.filter = filter.id;

    const favoriteClass = isFavoriteFilter(filter.id)
      ? "favorite active"
      : "favorite";

    if (filter.thumbnail) {
      card.innerHTML = `
        <button class="${favoriteClass}" data-favorite="${filter.id}" title="Marcar como favorito">★</button>
        <img src="${filter.thumbnail}" alt="${filter.name}">
        <div class="filter-card-name">${filter.name}</div>
      `;
    } else {
      card.innerHTML = `
        <div class="filter-card-placeholder">🚫</div>
        <div class="filter-card-name">${filter.name}</div>
      `;
    }

    const favoriteButton = card.querySelector("[data-favorite]");

    if (favoriteButton) {
      favoriteButton.addEventListener("click", (event) => {
        event.stopPropagation();
        toggleFavoriteFilter(filter.id);
      });
    }

    card.addEventListener("click", () => {
      toggleFilterSelection(filter.id);
    });

    filtersCatalog.appendChild(card);
  });

  updateCatalogSelection();
}

function renderFavoriteFiltersCatalog() {
  favoriteFiltersCatalog.innerHTML = "";

  const favoriteIds = getFavoriteFilters();
  const favoriteFilters = filtersConfig.filter((filter) =>
    favoriteIds.includes(filter.id)
  );

  if (favoriteFilters.length === 0) {
    favoriteFiltersCatalog.innerHTML = `
      <div class="filter-card">
        <div class="filter-card-placeholder">☆</div>
        <div class="filter-card-name">Sem favoritos</div>
      </div>
    `;
    return;
  }

  favoriteFilters.forEach((filter) => {
    const card = document.createElement("div");
    card.className = "filter-card";
    card.dataset.filter = filter.id;

    card.innerHTML = `
      <button class="favorite active" data-favorite="${filter.id}" title="Remover dos favoritos">★</button>
      <img src="${filter.thumbnail}" alt="${filter.name}">
      <div class="filter-card-name">${filter.name}</div>
    `;

    const favoriteButton = card.querySelector("[data-favorite]");

    if (favoriteButton) {
      favoriteButton.addEventListener("click", (event) => {
        event.stopPropagation();
        toggleFavoriteFilter(filter.id);
      });
    }

    card.addEventListener("click", () => {
      toggleFilterSelection(filter.id);
    });

    favoriteFiltersCatalog.appendChild(card);
  });

  updateCatalogSelection();
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

    getFaceBounds(landmarks, canvas);
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

function getStoredSuggestions() {
  const savedSuggestions = localStorage.getItem("filterSuggestions");
  return savedSuggestions ? JSON.parse(savedSuggestions) : [];
}

function saveSuggestions(suggestions) {
  localStorage.setItem("filterSuggestions", JSON.stringify(suggestions));
}

function renderSuggestions() {
  const suggestions = getStoredSuggestions();
  suggestionsList.innerHTML = "";

  if (suggestions.length === 0) {
    suggestionsList.innerHTML = "<li>Ainda não existem sugestões.</li>";
    return;
  }

  suggestions.slice().reverse().forEach((suggestion) => {
    const li = document.createElement("li");
    li.textContent = suggestion;
    suggestionsList.appendChild(li);
  });
}

function submitSuggestion() {
  const suggestion = suggestionInput.value.trim();

  if (!suggestion) {
    suggestionMessage.textContent = "Escreve uma sugestão antes de enviar.";
    return;
  }

  const suggestions = getStoredSuggestions();
  suggestions.push(suggestion);

  saveSuggestions(suggestions);
  renderSuggestions();

  suggestionInput.value = "";
  suggestionMessage.textContent = "Sugestão enviada com sucesso.";
}

function clearSuggestions() {
  localStorage.removeItem("filterSuggestions");
  renderSuggestions();
  suggestionMessage.textContent = "Sugestões removidas com sucesso.";
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
  photoMessage.textContent = "Foto capturada com sucesso.";

  if (downloadPhotoTopBtn) {
    downloadPhotoTopBtn.disabled = false;
  }

  if (downloadPhotoBtn) {
    downloadPhotoBtn.disabled = false;
  }
}

function downloadPhoto() {
  if (!capturedPhotoDataUrl) return;

  const link = document.createElement("a");
  link.href = capturedPhotoDataUrl;
  link.download = `ar-face-filters-${Date.now()}.png`;
  link.click();
}

function scrollFilters(direction) {
  const scrollAmount = 140;

  filtersCatalog.scrollBy({
    left: direction * scrollAmount,
    behavior: "smooth"
  });
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

themeToggleBtn.addEventListener("click", () => {
  toggleTheme();
});

submitSuggestionBtn.addEventListener("click", () => {
  submitSuggestion();
});

suggestionInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && event.ctrlKey) {
    submitSuggestion();
  }
});

clearSuggestionsBtn.addEventListener("click", () => {
  clearSuggestions();
});

capturePhotoBtn.addEventListener("click", () => {
  capturePhoto();
});

if (downloadPhotoTopBtn) {
  downloadPhotoTopBtn.addEventListener("click", () => {
    downloadPhoto();
  });
}

if (downloadPhotoBtn) {
  downloadPhotoBtn.addEventListener("click", () => {
    downloadPhoto();
  });
}

filtersPrevBtn.addEventListener("click", () => {
  scrollFilters(-1);
});

filtersNextBtn.addEventListener("click", () => {
  scrollFilters(1);
});

window.addEventListener("resize", resizeCanvas);

async function init() {
  try {
    const savedTheme = localStorage.getItem("themeMode") || "light";
    applyTheme(savedTheme);

    updateFilterLabel();
    updateCameraButton();
    updateLandmarksButton();
    renderSuggestions();

    statusText.textContent = "A carregar deteção facial...";
    await createFaceLandmarker();

    statusText.textContent = "A carregar filtros...";
    filterImages = await loadFilterImages();

    renderCategoriesBar();
    renderFiltersCatalog();
    renderFavoriteFiltersCatalog();

    statusText.textContent = "A iniciar webcam...";
    await startWebcam();

    renderLoop();
  } catch (error) {
    console.error(error);
    statusText.textContent = "Erro ao iniciar a deteção facial";
  }
}

init();