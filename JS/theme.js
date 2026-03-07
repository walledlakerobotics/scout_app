function applyTheme(theme) {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
}

function toggleTheme() {
  const root = document.documentElement;
  const currentTheme = root.getAttribute("data-theme");
  applyTheme(currentTheme === "dark" ? "light" : "dark");
}

function loadTheme() {
  const savedTheme = localStorage.getItem("theme") || "dark";
  applyTheme(savedTheme);
}

loadTheme();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadTheme);
}
