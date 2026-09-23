// ============================================================
// settings.js — settings drawer: dark/light theme, display
// currency preference, and a duplicate API-key box.
// ============================================================

(function () {
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("yakton_theme", theme);
    document.querySelectorAll("#themeSwitch button").forEach((b) => {
      b.classList.toggle("active", b.dataset.theme === theme);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    const openBtn = document.getElementById("settingsOpenBtn");
    const closeBtn = document.getElementById("settingsCloseBtn");
    const overlay = document.getElementById("settingsOverlay");
    if (!overlay) return;

    applyTheme(localStorage.getItem("yakton_theme") || "dark");

    openBtn.addEventListener("click", () => overlay.classList.add("open"));
    closeBtn.addEventListener("click", () => overlay.classList.remove("open"));
    overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.classList.remove("open"); });

    document.querySelectorAll("#themeSwitch button").forEach((b) => {
      b.addEventListener("click", () => applyTheme(b.dataset.theme));
    });

    const currencyEl = document.getElementById("displayCurrency");
    currencyEl.value = localStorage.getItem("yakton_display_currency") || "USD";
    currencyEl.addEventListener("change", () => {
      localStorage.setItem("yakton_display_currency", currencyEl.value);
    });

    const apiInput = document.getElementById("apiKeyInputSettings");
    const apiSave = document.getElementById("apiKeySaveSettings");
    apiInput.value = localStorage.getItem("yakton_api_key") || "";
    apiSave.addEventListener("click", () => {
      const key = apiInput.value.trim();
      if (key) localStorage.setItem("yakton_api_key", key);
      else localStorage.removeItem("yakton_api_key");
      apiSave.textContent = "Saved";
      setTimeout(() => (apiSave.textContent = "Save"), 1200);
      // keep the on-page stocks key box in sync
      const other = document.getElementById("apiKeyInput");
      if (other) other.value = key;
    });
  });

  // apply saved theme immediately (before DOMContentLoaded paints) to avoid a flash
  const saved = localStorage.getItem("yakton_theme");
  if (saved) document.documentElement.setAttribute("data-theme", saved);
})();
