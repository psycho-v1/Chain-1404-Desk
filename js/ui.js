/**
 * Shared chrome: navbar, footer, theme, copy, toasts, badges.
 * Every HTML page stays short by calling DeskUI.injectNav() + injectFooter().
 */
(function (global) {
  const PAGES = {
    "index.html": "Home",
    "inspect.html": "Inspect",
    "monitor.html": "Monitor",
    "networks.html": "Networks",
    "evidence.html": "Evidence",
    "status.html": "RPC status",
    "guide.html": "User guide",
    "faq.html": "FAQ",
    "about.html": "About",
    "terms.html": "Terms",
    "disclaimer.html": "Disclaimer",
    "privacy.html": "Privacy",
    "security.html": "Security"
  };

  function currentFile() {
    const parts = (location.pathname || "").split("/").filter(Boolean);
    const last = parts[parts.length - 1] || "index.html";
    return last.indexOf(".html") === -1 ? "index.html" : last;
  }

  function applyTheme(theme) {
    const next = theme === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem(DeskConfig.STORAGE_KEYS.theme, next); } catch (_) {}
    const btn = document.getElementById("themeToggle");
    if (btn) {
      btn.setAttribute("aria-pressed", next === "dark" ? "true" : "false");
      btn.innerHTML = next === "dark"
        ? '<i class="fa-solid fa-sun" aria-hidden="true"></i><span class="d-none d-lg-inline ms-1">Light</span>'
        : '<i class="fa-solid fa-moon" aria-hidden="true"></i><span class="d-none d-lg-inline ms-1">Dark</span>';
    }
  }

  function initTheme() {
    let stored = "light";
    try { stored = localStorage.getItem(DeskConfig.STORAGE_KEYS.theme) || "light"; } catch (_) {}
    applyTheme(stored);
  }

  function agreedStamp() {
    try { return localStorage.getItem(DeskConfig.STORAGE_KEYS.agreed) || ""; } catch (_) { return ""; }
  }

  function injectNav() {
    const file = currentFile();
    const agreed = agreedStamp();
    const host = document.getElementById("nav-root");
    if (!host) return;
    host.innerHTML = `
<nav class="navbar navbar-expand-lg navbar-desk fixed-top" aria-label="Primary">
  <div class="container">
    <a class="navbar-brand d-flex align-items-center gap-2" href="index.html">
      <img class="brand-mark" src="assets/logo.svg" width="28" height="28" alt="">
      <i class="fa-solid fa-shield-halved" aria-hidden="true"></i>
      <span>1404 Desk</span>
    </a>
    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#deskNav" aria-controls="deskNav" aria-expanded="false" aria-label="Open menu">
      <span class="navbar-toggler-icon"></span>
    </button>
    <div class="collapse navbar-collapse" id="deskNav">
      <ul class="navbar-nav me-auto mb-2 mb-lg-0">
        <li class="nav-item dropdown">
          <a class="nav-link dropdown-toggle" href="#" data-bs-toggle="dropdown">Tools</a>
          <ul class="dropdown-menu">
            <li><a class="dropdown-item" href="inspect.html"><i class="fa-solid fa-magnifying-glass me-2"></i>Inspect address</a></li>
            <li><a class="dropdown-item" href="monitor.html"><i class="fa-solid fa-snowflake me-2"></i>Freeze &amp; admin monitor</a></li>
            <li><a class="dropdown-item" href="networks.html"><i class="fa-solid fa-network-wired me-2"></i>Add networks to wallet</a></li>
            <li><a class="dropdown-item" href="evidence.html"><i class="fa-solid fa-box-archive me-2"></i>Evidence locker</a></li>
            <li><a class="dropdown-item" href="status.html"><i class="fa-solid fa-clock me-2"></i>RPC status</a></li>
          </ul>
        </li>
        <li class="nav-item dropdown">
          <a class="nav-link dropdown-toggle" href="#" data-bs-toggle="dropdown">Learn</a>
          <ul class="dropdown-menu">
            <li><a class="dropdown-item" href="guide.html"><i class="fa-solid fa-book-open me-2"></i>User guide</a></li>
            <li><a class="dropdown-item" href="faq.html">FAQ</a></li>
            <li><a class="dropdown-item" href="about.html#cannot">What this cannot do</a></li>
            <li><a class="dropdown-item" href="about.html#histories">How the two histories differ</a></li>
          </ul>
        </li>
        <li class="nav-item dropdown">
          <a class="nav-link dropdown-toggle" href="#" data-bs-toggle="dropdown">Legal</a>
          <ul class="dropdown-menu">
            <li><a class="dropdown-item" href="terms.html">Terms of use</a></li>
            <li><a class="dropdown-item" href="disclaimer.html">Disclaimer</a></li>
            <li><a class="dropdown-item" href="privacy.html">Privacy</a></li>
            <li><a class="dropdown-item" href="SECURITY.md">Security</a></li>
          </ul>
        </li>
      </ul>
      <div class="d-flex flex-wrap align-items-center gap-2">
        <span class="pill ${agreed ? "pill-ok" : "pill-warn"} agree-badge" title="${agreed ? "Accepted " + agreed : "Terms not accepted"}">
          <i class="fa-solid ${agreed ? "fa-circle-check" : "fa-triangle-exclamation"}"></i>
          ${agreed ? "I accept terms" : "Terms pending"}
        </span>
        <button type="button" class="btn btn-ghost btn-sm" id="themeToggle" aria-label="Toggle colour theme"></button>
        <a class="btn btn-ghost btn-sm" href="https://github.com" rel="noopener noreferrer" id="githubLink" title="Source repository">
          <i class="fa-solid fa-link" aria-hidden="true"></i>
          <span class="d-none d-lg-inline">GitHub</span>
        </a>
      </div>
    </div>
  </div>
</nav>`;
    document.querySelectorAll("#deskNav .dropdown-item, #deskNav .navbar-brand").forEach((el) => {
      const href = (el.getAttribute("href") || "").split("#")[0];
      if (href === file) el.classList.add("active");
    });
    const toggle = document.getElementById("themeToggle");
    if (toggle) toggle.addEventListener("click", () => {
      const now = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      applyTheme(now);
    });
    applyTheme(document.documentElement.getAttribute("data-theme") || "light");
  }

  function injectFooter() {
    const host = document.getElementById("footer-root");
    if (!host) return;
    const build = DeskConfig.BUILD;
    host.innerHTML = `
<footer class="footer-desk">
  <div class="container">
    <p class="mb-2"><strong>1404 Desk</strong> · MIT License · Not legal advice. Not a BlockDAG product.</p>
    <p class="mb-2">Not affiliated with BlockDAG, bdagscan, or any RPC operator. Read-only public RPC tool.</p>
    <p class="mb-2">Build ${build.version} · stamp ${build.stamp} UTC ·
      <a href="https://github.com" id="footerSource">raw GitHub source</a> ·
      <button type="button" class="btn btn-link p-0 align-baseline" id="reviewAgreements">Review agreements</button> ·
      <button type="button" class="btn btn-link p-0 align-baseline" id="clearLocal">Clear local data</button>
    </p>
    <p class="small mb-0">localStorage keys: desk-theme, desk-agreed, desk-last-review, desk-contract-overrides. No cookies. No analytics.</p>
  </div>
</footer>
<div class="toast-host" id="toastHost" aria-live="polite"></div>`;
    const review = document.getElementById("reviewAgreements");
    if (review) review.addEventListener("click", () => {
      if (global.DeskAgree && DeskAgree.open) DeskAgree.open(true);
    });
    const clear = document.getElementById("clearLocal");
    if (clear) clear.addEventListener("click", clearLocalData);
  }

  function clearLocalData() {
    const keys = Object.values(DeskConfig.STORAGE_KEYS);
    keys.forEach((k) => localStorage.removeItem(k));
    sessionStorage.removeItem("desk-current-review");
    toast("Local data cleared. Reload to see the agreement gate again.");
  }

  function toast(message) {
    const host = document.getElementById("toastHost");
    if (!host) return;
    const el = document.createElement("div");
    el.className = "desk-toast";
    el.textContent = message;
    host.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      toast("Copied");
      return true;
    } catch {
      toast("Copy failed");
      return false;
    }
  }

  function hexWithCopy(value) {
    if (!value) return "—";
    const safe = String(value);
    return `<span class="copy-wrap"><code class="hex">${escapeHtml(safe)}</code>
      <button type="button" class="btn btn-ghost copy-btn" data-copy="${escapeAttr(safe)}" aria-label="Copy value">
        <i class="fa-solid fa-copy"></i>
      </button></span>`;
  }

  function bindCopies(root) {
    (root || document).querySelectorAll("[data-copy]").forEach((btn) => {
      btn.addEventListener("click", () => copyText(btn.getAttribute("data-copy") || ""));
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function escapeAttr(s) { return escapeHtml(s).replace(/`/g, ""); }

  function badge(kind, label) {
    const map = { ok: "pill-ok", warn: "pill-warn", danger: "pill-danger", info: "pill-info", mute: "pill-mute" };
    return `<span class="status-pill ${map[kind] || "pill-mute"}">${label}</span>`;
  }

  function utcNowIso() {
    return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  }

  function formatWei(weiHexOrBig) {
    try {
      const v = typeof weiHexOrBig === "bigint" ? weiHexOrBig : BigInt(weiHexOrBig || "0");
      const whole = v / 10n ** 18n;
      const frac = (v % 10n ** 18n).toString().padStart(18, "0").replace(/0+$/, "");
      return { bdag: frac ? whole.toString() + "." + frac.slice(0, 8) : whole.toString(), wei: v.toString() };
    } catch {
      return { bdag: "—", wei: String(weiHexOrBig || "") };
    }
  }

  global.DeskUI = {
    PAGES, currentFile, initTheme, applyTheme, injectNav, injectFooter,
    toast, copyText, hexWithCopy, bindCopies, escapeHtml, badge, utcNowIso,
    formatWei, agreedStamp, clearLocalData
  };
})(window);
