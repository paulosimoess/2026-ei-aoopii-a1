export function getFavoriteFilters() {
  const savedFavorites = localStorage.getItem("favoriteFilters");
  return savedFavorites ? JSON.parse(savedFavorites) : [];
}

export function saveFavoriteFilters(favorites) {
  localStorage.setItem("favoriteFilters", JSON.stringify(favorites));
}