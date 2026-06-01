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
    id: "reindeer_glasses",
    name: "Rena",
    thumbnail: "./assets/thumbnails/reindeer_glasses.png",
    asset: "./assets/filters/reindeer_glasses.png",
    anchor: "eyes",
    category: "christmas"
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
    id: "joker",
    name: "Joker",
    thumbnail: "./assets/thumbnails/joker.png",
    asset: "./assets/filters/joker.png",
    anchor: "fullface",
    category: "halloween"
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
];

export const categoriesConfig = [
  { id: "all", label: "Todos" },
  { id: "animals", label: "Animais" },
  { id: "christmas", label: "Natal" },
  { id: "easter", label: "Páscoa" },
  { id: "halloween", label: "Halloween" },
  { id: "fun", label: "Divertidos" },
  { id: "3d", label: "3D" }
];