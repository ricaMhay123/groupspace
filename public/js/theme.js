/**
 * GroupSpace — Global Theme Manager
 * Persists dark/light mode across all pages via localStorage.
 *
 * Add to EVERY page's <head> FIRST (before stylesheets where possible):
 *   <script src="/js/theme.js"></script>
 *
 * To add a toggle button anywhere, give it: id="themeToggleBtn"
 * It will be wired up automatically.
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'gs_dark';
  const ROOT = document.documentElement; // <html>

  /* ── 1. Apply theme immediately (prevents flash of wrong theme) ── */
  function getPreference() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) return stored === '1';
    // Fall back to OS preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  let dark = getPreference();

  function applyTheme() {
    ROOT.classList.toggle('dark', dark);
    localStorage.setItem(STORAGE_KEY, dark ? '1' : '0');
    // Update all toggle button icons on the page
    document.querySelectorAll('[data-theme-moon]').forEach(el => {
      el.style.display = dark ? 'none' : '';
    });
    document.querySelectorAll('[data-theme-sun]').forEach(el => {
      el.style.display = dark ? '' : 'none';
    });
    // Update aria-label on all toggle buttons
    document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
      btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
      btn.setAttribute('title', dark ? 'Switch to light mode' : 'Switch to dark mode');
    });
  }

  // Apply immediately on script load (before DOM is ready)
  applyTheme();

  /* ── 2. Wire up buttons once DOM is ready ── */
  function toggle() {
    dark = !dark;
    applyTheme();
  }

  // Expose globally so inline onclick handlers can call it
  window.gsToggleTheme = toggle;

  function wireButtons() {
    document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
      // Avoid double-binding
      if (btn.dataset.themeBound) return;
      btn.dataset.themeBound = '1';
      btn.addEventListener('click', toggle);
    });
    // Sync icons now that DOM is fully available
    applyTheme();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireButtons);
  } else {
    wireButtons();
  }
})();
