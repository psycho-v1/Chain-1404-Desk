/**
 * First-visit agreement gate.
 * Backdrop click does not dismiss. Accept stores desk-agreed = ISO timestamp.
 */
(function (global) {
  const MODAL_ID = "agreeModal";

  function accepted() {
    try { return Boolean(localStorage.getItem(DeskConfig.STORAGE_KEYS.agreed)); } catch { return false; }
  }

  function markup() {
    return `
<div class="modal fade" id="${MODAL_ID}" tabindex="-1" aria-labelledby="agreeTitle" aria-modal="true" role="dialog">
  <div class="modal-dialog modal-dialog-centered modal-lg">
    <div class="modal-content">
      <div class="modal-header">
        <h2 class="modal-title h5" id="agreeTitle">Before you use 1404 Desk</h2>
      </div>
      <div class="modal-body">
        <ul>
          <li>This tool only reads public RPC data.</li>
          <li>It cannot unfreeze coins, deliver miners, or choose the real chain.</li>
          <li>Two networks share chain ID 1404. Sending to the wrong RPC can lose funds.</li>
          <li>Do not enter a seed phrase. Ever.</li>
          <li>Not financial, legal, or tax advice.</li>
        </ul>
        <p class="small">Read <a href="terms.html">Terms of use</a>, <a href="disclaimer.html">Disclaimer</a>, and <a href="privacy.html">Privacy</a> before you accept.</p>
        <div class="form-check">
          <input class="form-check-input" type="checkbox" id="agreeCheck">
          <label class="form-check-label" for="agreeCheck">I understand this is an unofficial read-only tool.</label>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-ghost" id="agreeDecline">Decline</button>
        <button type="button" class="btn btn-accent" id="agreeAccept" disabled>Accept</button>
      </div>
    </div>
  </div>
</div>
<div id="refusal-screen" class="d-none">
  <div class="container py-5">
    <div class="desk-card p-4">
      <h1 class="h3">1404 Desk was not accepted</h1>
      <p>You declined the terms. The live tools stay closed on this browser until you accept.</p>
      <p>You can still read the <a href="guide.html">user guide</a>, <a href="disclaimer.html">disclaimer</a>, and source files.</p>
      <button type="button" class="btn btn-accent" id="agreeRetry">Review agreements</button>
    </div>
  </div>
</div>`;
  }

  let modal;

  function open(force) {
    if (!modal) return;
    modal.show();
    if (force) document.getElementById("refusal-screen").classList.add("d-none");
  }

  function showRefusal() {
    const screen = document.getElementById("refusal-screen");
    const main = document.getElementById("page-main");
    if (screen) screen.classList.remove("d-none");
    if (main) main.classList.add("d-none");
    if (modal) modal.hide();
  }

  function hideRefusal() {
    const screen = document.getElementById("refusal-screen");
    const main = document.getElementById("page-main");
    if (screen) screen.classList.add("d-none");
    if (main) main.classList.remove("d-none");
  }

  function boot() {
    const mount = document.getElementById("agree-root") || document.body;
    const wrap = document.createElement("div");
    wrap.innerHTML = markup();
    mount.appendChild(wrap);
    const el = document.getElementById(MODAL_ID);
    modal = new bootstrap.Modal(el, { backdrop: "static", keyboard: false });
    const check = document.getElementById("agreeCheck");
    const accept = document.getElementById("agreeAccept");
    check.addEventListener("change", () => { accept.disabled = !check.checked; });
    accept.addEventListener("click", () => {
      const ts = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
      localStorage.setItem(DeskConfig.STORAGE_KEYS.agreed, ts);
      hideRefusal();
      modal.hide();
      DeskUI.injectNav();
      DeskUI.toast("Terms accepted at " + ts);
    });
    document.getElementById("agreeDecline").addEventListener("click", showRefusal);
    document.getElementById("agreeRetry").addEventListener("click", () => open(true));
    if (!accepted()) open(false);
  }

  global.DeskAgree = { boot, open, accepted };
})(window);
