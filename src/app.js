const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const statusText = document.getElementById("status");
const currentFilterText = document.getElementById("currentFilter");
const filterButtons = document.querySelectorAll(".filter-btn");

let selectedFilter = "none";

const hatImage = new Image();
hatImage.src = "assets/hat.png";

async function startWebcam() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false
    });

    video.srcObject = stream;

    video.addEventListener("loadedmetadata", () => {
      resizeCanvas();
      drawPlaceholderFilter();
      statusText.textContent = "Webcam ativa";
    });

    window.addEventListener("resize", () => {
      resizeCanvas();
      drawPlaceholderFilter();
    });
  } catch (error) {
    console.error("Erro ao aceder à webcam:", error);
    statusText.textContent = "Não foi possível aceder à webcam";
  }
}

function resizeCanvas() {
  canvas.width = video.videoWidth || video.clientWidth;
  canvas.height = video.videoHeight || video.clientHeight;
}

function drawPlaceholderFilter() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  ctx.save();
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);

  if (selectedFilter === "hat") {
    if (hatImage.complete) {
      ctx.drawImage(hatImage, centerX - 120, centerY - 220, 240, 120);
    }
  }

  if (selectedFilter === "glasses") {
    ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
    ctx.lineWidth = 6;
    ctx.strokeRect(centerX - 100, centerY - 40, 70, 45);
    ctx.strokeRect(centerX + 30, centerY - 40, 70, 45);

    ctx.beginPath();
    ctx.moveTo(centerX - 30, centerY - 18);
    ctx.lineTo(centerX + 30, centerY - 18);
    ctx.stroke();
  }

  if (selectedFilter === "mask") {
    ctx.fillStyle = "rgba(255, 120, 120, 0.45)";
    ctx.fillRect(centerX - 85, centerY - 10, 170, 90);
  }

  ctx.restore();
}

hatImage.onload = () => {
  drawPlaceholderFilter();
};

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    filterButtons.forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");

    selectedFilter = button.dataset.filter;

    const labels = {
      none: "Sem filtro",
      hat: "Chapéu",
      glasses: "Óculos",
      mask: "Máscara"
    };

    currentFilterText.textContent = `Filtro selecionado: ${labels[selectedFilter]}`;
    drawPlaceholderFilter();
  });
});

startWebcam();