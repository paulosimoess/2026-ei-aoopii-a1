export const filtersConfig = [
  {
    id: "none",
    name: "Sem filtro",
    thumbnail: null,
    asset: null,
    anchor: "none",
    category: "all"
  },
  {
    id: "hat",
    name: "Chapéu",
    thumbnail: "./assets/thumbnails/hat.png",
    asset: "./assets/filters/hat.png",
    anchor: "head",
    category: "halloween"
  },
  {
    id: "glasses",
    name: "Óculos",
    thumbnail: "./assets/thumbnails/glasses.png",
    asset: "./assets/filters/glasses.png",
    anchor: "eyes",
    category: "fun"
  },
  {
    id: "mask",
    name: "Máscara",
    thumbnail: "./assets/thumbnails/mask.png",
    asset: "./assets/filters/mask.png",
    anchor: "mouth",
    category: "halloween"
  },
  {
    id: "crown",
    name: "Coroa",
    thumbnail: "./assets/thumbnails/crown.png",
    asset: "./assets/filters/crown.png",
    anchor: "head",
    category: "fun"
  },
  {
    id: "mustache",
    name: "Bigode",
    thumbnail: "./assets/thumbnails/mustache.png",
    asset: "./assets/filters/mustache.png",
    anchor: "mouth",
    category: "fun"
  },
  {
    id: "santa_hat",
    name: "Gorro de Natal",
    thumbnail: "./assets/thumbnails/santa_hat.webp",
    asset: "./assets/filters/santa_hat.webp",
    anchor: "head",
    category: "christmas"
  },
  {
    id: "witch_hat",
    name: "Chapéu de Bruxa",
    thumbnail: "./assets/thumbnails/witch_hat.png",
    asset: "./assets/filters/witch_hat.png",
    anchor: "head",
    category: "halloween"
  },
  {
    id: "sunglasses",
    name: "Óculos de Sol",
    thumbnail: "./assets/thumbnails/sunglasses.webp",
    asset: "./assets/filters/sunglasses.webp",
    anchor: "eyes",
    category: "fun"
  },
  {
    id: "glasses3d",
    name: "Óculos 3D",
    thumbnail: null,
    emoji: "🥽",
    asset: null,
    model: "./assets/models3d/glasses.glb",
    anchor: "eyes3d",
    category: "3d",
    type: "3d"
  },
  {
    id: "hat3d",
    name: "Chapéu 3D",
    thumbnail: null,
    emoji: "🎩",
    asset: null,
    model: "./assets/models3d/hat.glb",
    anchor: "head3d",
    category: "3d",
    type: "3d"
  },
  {
    id: "glitch",
    name: "Glitch",
    thumbnail: null,
    emoji: "⚡",
    asset: null,
    anchor: "effect",
    category: "effects",
    type: "effect"
  },
  {
    id: "inferno",
    name: "Inferno",
    thumbnail: null,
    emoji: "🔥",
    asset: null,
    anchor: "effect",
    category: "effects",
    type: "effect"
  },
  {
    id: "matrix",
    name: "Matrix",
    thumbnail: null,
    emoji: "🟩",
    asset: null,
    anchor: "effect",
    category: "effects",
    type: "effect"
  },
  {
    id: "pixel_glasses",
    name: "Pixel Glasses",
    thumbnail: null,
    emoji: "🕶️",
    asset: null,
    anchor: "eyes",
    category: "effects",
    type: "canvas"
  },
  {
    id: "neon_mask",
    name: "Neon Mask",
    thumbnail: null,
    emoji: "💠",
    asset: null,
    anchor: "fullface",
    category: "effects",
    type: "canvas"
  },
];

export const categoriesConfig = [
  { id: "all", label: "Todos" },
  { id: "christmas", label: "Natal" },
  { id: "halloween", label: "Halloween" },
  { id: "fun", label: "Divertidos" },
  { id: "3d", label: "3D" },
  { id: "effects", label: "Efeitos" }
];