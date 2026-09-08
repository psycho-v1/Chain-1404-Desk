/**
 * Entry script. Pages set data-page on <body>.
 * Boots theme, nav, footer, agreement gate, then the page module.
 */
(function () {
  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  ready(function () {
    if (window.DeskUI) {
      DeskUI.initTheme();
      DeskUI.injectNav();
      DeskUI.injectFooter();
    }
    if (window.DeskAgree) DeskAgree.boot();

    const page = document.body.getAttribute("data-page") || "";
    if (page === "inspect" && window.DeskInspect) DeskInspect.boot();
    if (page === "monitor" && window.DeskMonitor) DeskMonitor.boot();
    if (page === "networks" && window.DeskNetworks) DeskNetworks.boot();
    if (page === "evidence" && window.DeskEvidence) DeskEvidence.boot();
    if (page === "status") bootStatus();
    if (page === "home") bootHome();
  });

  async function bootHome() {
    const mount = document.getElementById("homeStatus");
    if (!mount || !window.DeskRPC) return;
    const sample = [
      DeskConfig.COMMUNITY_RPCS[0],
      DeskConfig.COMMUNITY_RPCS[1],
      DeskConfig.SCAN_RPCS[0],
      DeskConfig.SCAN_RPCS[1]
    ].map((r) => Object.assign({ family: r === DeskConfig.SCAN_RPCS[0] || r === DeskConfig.SCAN_RPCS[1] ? "scan" : "community" }, r));
    // Force family labels cleanly
    sample[0].family = sample[1].family = "community";
    sample[2].family = sample[3].family = "scan";
    mount.innerHTML = "<p class=\"small\">Probing four labelled RPCs…</p>";
    const rows = await Promise.all(sample.map((r) => DeskRPC.probeEndpoint(r, [])));
    mount.innerHTML = `<div class="table-responsive"><table class="table table-desk table-sm mb-0">
      <thead><tr><th>RPC</th><th>Family</th><th>ms</th><th>height</th><th>result</th></tr></thead>
      <tbody>${rows.map((r) => `<tr>
        <td>${DeskUI.escapeHtml(r.label)}</td>
        <td>${r.family}</td>
        <td>${r.latencyMs ?? "—"}</td>
        <td>${r.blockNumber ?? "—"}</td>
        <td>${r.ok ? DeskUI.badge("ok", "ok") : DeskUI.badge("danger", DeskUI.escapeHtml(r.error || "error"))}</td>
      </tr>`).join("")}</tbody></table></div>`;
  }

  let statusTimer = null;
  let paused = false;

  async function tickStatus() {
    const tbody = document.getElementById("statusBody");
    if (!tbody) return;
    const rpcs = DeskConfig.allRpcs();
    const results = await Promise.all(rpcs.map((r) => DeskRPC.probeEndpoint(r, [])));
    tbody.innerHTML = results.map((r) => `<tr>
      <td>${DeskUI.escapeHtml(r.label)}<div class="small hex">${DeskUI.escapeHtml(r.url)}</div></td>
      <td>${r.family}</td>
      <td>${r.latencyMs ?? "—"}</td>
      <td>${r.chainId ?? "—"}</td>
      <td>${r.blockNumber ?? "—"}</td>
      <td>${r.peerCount ?? "—"}</td>
      <td>${r.ok ? DeskUI.badge("ok", "ok") : DeskUI.badge("danger", "error")}<div class="small">${DeskUI.escapeHtml(r.error || r.headHash || "")}</div></td>
    </tr>`).join("");
    document.getElementById("statusStamp").textContent = "Updated " + DeskUI.utcNowIso();
  }

  function bootStatus() {
    const pauseBtn = document.getElementById("pauseStatus");
    tickStatus();
    statusTimer = setInterval(() => { if (!paused) tickStatus(); }, 60000);
    pauseBtn?.addEventListener("click", () => {
      paused = !paused;
      pauseBtn.textContent = paused ? "Resume auto-refresh" : "Pause auto-refresh";
      pauseBtn.setAttribute("aria-pressed", paused ? "true" : "false");
    });
    document.getElementById("refreshStatus")?.addEventListener("click", tickStatus);
  }
})();
