import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

import { filtersConfig } from "../config/filters-data.js";
import { getEyeCenters } from "../core/face-utils.js";

const GLASSES_3D_FILTER_ID = "glasses3d";

let renderer = null;
let scene = null;
let camera = null;
let glassesGroup = null;
let threeCanvasRef = null;
let isModelLoaded = false;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getAdjustment(filterId, filterAdjustments) {
  return {
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    rotation: 0,
    rotationX: 0,
    rotationY: 0,
    ...(filterAdjustments[filterId] || {})
  };
}

function getPixelPoint(landmarks, index, canvas) {
  return {
    x: landmarks[index].x * canvas.width,
    y: landmarks[index].y * canvas.height,
    z: landmarks[index].z || 0
  };
}

function canvasToThreeCoords(x, y, canvas) {
  return {
    x: x - canvas.width / 2,
    y: canvas.height / 2 - y
  };
}

function normalizeModel(model) {
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();

  box.getSize(size);
  box.getCenter(center);

  const biggestSize = Math.max(size.x, size.y, size.z);

  if (biggestSize > 0) {
    const normalizeScale = 1 / biggestSize;

    model.scale.setScalar(normalizeScale);

    model.position.set(
      -center.x * normalizeScale,
      -center.y * normalizeScale,
      -center.z * normalizeScale
    );
  }

  console.log("Modelo 3D normalizado:", {
    width: size.x,
    height: size.y,
    depth: size.z,
    centerX: center.x,
    centerY: center.y,
    centerZ: center.z,
    biggestSize
  });
}

function prepareModelMaterials(model) {
  let meshCount = 0;

  model.traverse((child) => {
    if (child.isMesh) {
      meshCount++;

      child.visible = true;
      child.frustumCulled = false;
      child.renderOrder = 1000;

      child.material = new THREE.MeshStandardMaterial({
        color: 0x111827,
        roughness: 0.35,
        metalness: 0.2,
        side: THREE.DoubleSide,
        depthTest: false,
        depthWrite: false
      });
    }
  });

  console.log("Meshes encontrados no modelo 3D:", meshCount);
}

function createLights() {
  const ambientLight = new THREE.AmbientLight(0xffffff, 2.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 2.4);
  directionalLight.position.set(0, 0, 1000);
  scene.add(directionalLight);

  const sideLight = new THREE.DirectionalLight(0xffffff, 1.2);
  sideLight.position.set(500, 200, 600);
  scene.add(sideLight);
}

function updateCameraSize(width, height) {
  if (!camera) return;

  camera.left = -width / 2;
  camera.right = width / 2;
  camera.top = height / 2;
  camera.bottom = -height / 2;
  camera.near = 0.1;
  camera.far = 5000;

  camera.position.set(0, 0, 1000);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
}

function loadGlassesModel() {
  const glassesFilter = filtersConfig.find(
    (filter) => filter.id === GLASSES_3D_FILTER_ID
  );

  console.log("Filtro 3D encontrado:", glassesFilter);

  if (!glassesFilter || !glassesFilter.model) {
    console.warn("Filtro Óculos 3D não encontrado no filters-data.js");
    return;
  }

  const loader = new GLTFLoader();

  loader.load(
    glassesFilter.model,
    (gltf) => {
      console.log("Modelo 3D carregado com sucesso:", gltf);

      const model = gltf.scene;

      normalizeModel(model);
      prepareModelMaterials(model);

      model.rotation.set(0, Math.PI / 2, Math.PI);

      model.position.x -= 0.5;
      model.position.y = 0.25; 

      glassesGroup = new THREE.Group();
      glassesGroup.add(model);
      glassesGroup.visible = false;

      scene.add(glassesGroup);

      isModelLoaded = true;

      console.log("Óculos 3D prontos para renderizar.");
    },
    (progress) => {
      if (progress.total) {
        const percent = Math.round((progress.loaded / progress.total) * 100);
        console.log(`A carregar modelo 3D: ${percent}%`);
      }
    },
    (error) => {
      console.error("Erro ao carregar o modelo 3D dos óculos:", error);
    }
  );
}

export function initThreeRenderer(threeCanvas) {
  if (!threeCanvas) {
    console.warn("threeCanvas não encontrado no HTML.");
    return;
  }

  threeCanvasRef = threeCanvas;

  scene = new THREE.Scene();

  camera = new THREE.OrthographicCamera(
    -1,
    1,
    1,
    -1,
    0.1,
    5000
  );

  renderer = new THREE.WebGLRenderer({
    canvas: threeCanvas,
    alpha: true,
    antialias: true
  });

  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.autoClear = true;

  createLights();
  loadGlassesModel();

  console.log("Three Renderer iniciado.");
}

export function resizeThreeRenderer(width, height) {
  if (!renderer || !threeCanvasRef) return;

  threeCanvasRef.width = width;
  threeCanvasRef.height = height;

  renderer.setSize(width, height, false);
  updateCameraSize(width, height);

  console.log("Three Renderer redimensionado:", width, height);
}

export function clearThreeRenderer() {
  if (!renderer || !scene || !camera) return;

  if (glassesGroup) {
    glassesGroup.visible = false;
  }

  renderer.clear();
}

export function renderThreeFilters(
  canvas,
  landmarks,
  selectedFilters,
  filterAdjustments
) {
  if (!renderer || !scene || !camera) return;

  renderer.clear();

  if (!selectedFilters.has(GLASSES_3D_FILTER_ID)) {
    if (glassesGroup) {
      glassesGroup.visible = false;
    }

    return;
  }

  if (!isModelLoaded || !glassesGroup) {
    return;
  }

  const adjustment = getAdjustment(GLASSES_3D_FILTER_ID, filterAdjustments);

  const { leftEyeCenter, rightEyeCenter } = getEyeCenters(landmarks, canvas);

  const dx = rightEyeCenter.x - leftEyeCenter.x;
  const dy = rightEyeCenter.y - leftEyeCenter.y;

  const eyesDistance = Math.hypot(dx, dy);

  if (!eyesDistance) return;

  const eyesCenterX = (leftEyeCenter.x + rightEyeCenter.x) / 2;
  const eyesCenterY = (leftEyeCenter.y + rightEyeCenter.y) / 2;

  const nose = getPixelPoint(landmarks, 1, canvas);

  const roll = -Math.atan2(dy, dx);

  const yawRaw = clamp((nose.x - eyesCenterX) / eyesDistance, -0.65, 0.65);
  const yaw = yawRaw * 1.05;

  const pitch =
    clamp((nose.y - eyesCenterY) / eyesDistance - 0.75, -0.4, 0.4) * 0.45;

  const sideOffsetX = yawRaw * eyesDistance * 0.25;
  const sideOffsetY = Math.abs(yawRaw) * eyesDistance * 0.08;

  const adjustedX = eyesCenterX + adjustment.offsetX + sideOffsetX;
  const adjustedY =
    eyesCenterY +
    adjustment.offsetY +
    eyesDistance * 0.25 +
    sideOffsetY;

  const position = canvasToThreeCoords(adjustedX, adjustedY, canvas);

  const baseScale = eyesDistance * 2.3;

  const yawCompensation = 1 + Math.abs(yaw) * 0.55;

  const finalScale = baseScale * adjustment.scale * yawCompensation;

  glassesGroup.visible = true;

  glassesGroup.position.set(position.x, position.y, 0);

  glassesGroup.scale.set(finalScale, finalScale, finalScale);

  const manualRotationZ = (adjustment.rotation * Math.PI) / 180;
  const manualRotationX = ((adjustment.rotationX || 0) * Math.PI) / 180;
  const manualRotationY = ((adjustment.rotationY || 0) * Math.PI) / 180;

  glassesGroup.rotation.set(
    pitch + manualRotationX,
    yaw + manualRotationY,
    roll + manualRotationZ
  );

  renderer.render(scene, camera);
}