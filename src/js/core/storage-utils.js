export function getFavoriteFilters() {
  const savedFavorites = localStorage.getItem("favoriteFilters");
  return savedFavorites ? JSON.parse(savedFavorites) : [];
}

export function saveFavoriteFilters(favorites) {
  localStorage.setItem("favoriteFilters", JSON.stringify(favorites));
}

export function getStoredSuggestions() {
  const savedSuggestions = localStorage.getItem("filterSuggestions");
  return savedSuggestions ? JSON.parse(savedSuggestions) : [];
}

export function saveSuggestions(suggestions) {
  localStorage.setItem("filterSuggestions", JSON.stringify(suggestions));
}

export function clearStoredSuggestions() {
  localStorage.removeItem("filterSuggestions");
}

export function getStoredTheme() {
  return localStorage.getItem("themeMode") || "light";
}

export function saveTheme(theme) {
  localStorage.setItem("themeMode", theme);
}