/**
 * Freeze & admin monitor — facts only.
 * Looks up owner(), eth_getCode, ERC-1967 implementation, isBlocked / isRestricted.
 * Does not name a person. EOA ≠ identified holder of a key.
 */
(function (global) {
  function slotToAddress(word) {
    if (!word || word === "0x") return "";
    const hex = word.replace(/^0x/, "").padStart(64, "0");
    return ethers.getAddress("0x" + hex.slice(-40));
  }

  async function inspectContract(rpcUrl, key, traces) {
    const cfg = DeskConfig.resolveContract(key);
    const row = {
      key, label: cfg.label, prefix: cfg.prefix, address: cfg.address,
      pinned: cfg.pinned, unverified: !cfg.pinned, source: cfg.source,
      code: null, isContract: null, owner: null, ownerCode: null, ownerIsEoa: null,
      implementation: null, error: null
    };
    if (!cfg.pinned) {
      row.error = "Address not fully pinned — paste verified address. Prefix " + cfg.prefix + " is not callable.";
      return row;
    }
    try {
      row.code = await DeskRPC.getCode(rpcUrl, cfg.address, traces);
      row.isContract = Boolean(row.code && row.code !== "0x" && row.code !== "0x0");
      try {
        row.owner = await DeskRPC.callAddress(rpcUrl, cfg.address, "function owner() view returns (address)", [], traces);
        if (row.owner && row.owner !== ethers.ZeroAddress) {
          row.ownerCode = await DeskRPC.getCode(rpcUrl, row.owner, traces);
          row.ownerIsEoa = !row.ownerCode || row.ownerCode === "0x" || row.ownerCode === "0x0";
        }
      } catch (e) { row.ownerError = String(e.message || e); }
      try {
        const raw = await DeskRPC.getStorageAt(rpcUrl, cfg.address, DeskConfig.ERC1967_IMPLEMENTATION_SLOT, traces);
        const impl = slotToAddress(raw);
        if (impl && impl !== ethers.ZeroAddress) row.implementation = impl;
      } catch (e) { row.implError = String(e.message || e); }
    } catch (e) {
      row.error = String(e.message || e);
    }
    return row;
  }

  function renderContract(row) {
    const warn = row.unverified
      ? DeskUI.badge("warn", "unverified address")
      : row.isContract ? DeskUI.badge("ok", "contract code present") : row.isContract === false ? DeskUI.badge("info", "eth_getCode empty") : "";
    return `<div class="desk-card p-3 mb-3">
      <div class="d-flex justify-content-between flex-wrap gap-2">
        <h3 class="h6 mb-0">${DeskUI.escapeHtml(row.label)}</h3>
        ${warn}
      </div>
      <p class="small mb-1">Configured prefix ${DeskUI.escapeHtml(row.prefix)}</p>
      <p class="mb-1">Address ${row.address ? DeskUI.hexWithCopy(row.address) : "—"}</p>
      ${row.error ? `<p class="mb-1">${DeskUI.badge("danger", "error")} ${DeskUI.escapeHtml(row.error)}</p>` : ""}
      <p class="small mb-1">${DeskUI.escapeHtml(row.source)}</p>
      ${row.owner ? `<p class="mb-1">owner() ${DeskUI.hexWithCopy(row.owner)} ${row.ownerIsEoa ? DeskUI.badge("info", "EOA") : row.ownerIsEoa === false ? DeskUI.badge("ok", "contract owner") : ""}</p>` : ""}
      ${row.ownerIsEoa ? `<p class="small">EOA means no on-chain multisig. It does not prove one named person holds the key.</p>` : ""}
      ${row.implementation ? `<p class="mb-0">ERC-1967 implementation ${DeskUI.hexWithCopy(row.implementation)}</p>` : ""}
    </div>`;
  }

  async function lookupFlags(rpcUrl, address, traces) {
    const out = { blocked: null, restricted: null, errors: [] };
    const bl = DeskConfig.resolveContract("BLOCKLIST_ADDRESS");
    const sel = DeskConfig.resolveContract("SELECTIVE_BLOCKLIST_ADDRESS");
    if (bl.pinned) {
      try { out.blocked = await DeskRPC.callBool(rpcUrl, bl.address, "function isBlocked(address account) view returns (bool)", [address], traces); }
      catch (e) { out.errors.push("isBlocked: " + (e.message || e)); }
    } else out.errors.push("Full blocklist not pinned.");
    if (sel.pinned) {
      try { out.restricted = await DeskRPC.callBool(rpcUrl, sel.address, "function isRestricted(address account) view returns (bool)", [address], traces); }
      catch (e) { out.errors.push("isRestricted: " + (e.message || e)); }
    } else out.errors.push("Selective list not pinned — paste verified address.");
    return out;
  }

  function saveOverrideFromForm() {
    const map = DeskConfig.loadOverrides();
    document.querySelectorAll("[data-override-key]").forEach((input) => {
      const key = input.getAttribute("data-override-key");
      const val = input.value.trim();
      if (/^0x[0-9a-fA-F]{40}$/.test(val)) map[key] = val;
      else if (!val) delete map[key];
    });
    DeskConfig.saveOverrides(map);
    DeskUI.toast("Overrides saved in localStorage (desk-contract-overrides)");
  }

  async function boot() {
    const banner = DeskConfig.verifyBanner();
    const banEl = document.getElementById("verifyBanner");
    if (banEl) {
      banEl.className = "alert-strip p-3 mb-3";
      banEl.innerHTML = `<strong>${banner.level === "warn" ? "Address not fully pinned — paste verified address." : "Verify live."}</strong> ${DeskUI.escapeHtml(banner.text)}`;
    }
    const formWrap = document.getElementById("overrideFields");
    if (formWrap) {
      formWrap.innerHTML = Object.values(DeskConfig.CONTRACTS).map((c) => {
        const live = DeskConfig.resolveContract(c.key);
        return `<div class="mb-2">
          <label class="form-label" for="ov-${c.key}">${DeskUI.escapeHtml(c.label)} (${DeskUI.escapeHtml(c.prefix)})</label>
          <input class="form-control mono" id="ov-${c.key}" data-override-key="${c.key}" placeholder="0x… 40 hex chars" value="${live.address || ""}">
        </div>`;
      }).join("") + `<button type="button" class="btn btn-ghost" id="saveOverrides">Save addresses on this device</button>`;
      document.getElementById("saveOverrides").addEventListener("click", saveOverrideFromForm);
    }

    const rpcSelect = document.getElementById("monitorRpc");
    DeskConfig.allRpcs().forEach((r) => {
      const opt = document.createElement("option");
      opt.value = r.url;
      opt.textContent = r.family + " · " + r.label;
      rpcSelect.appendChild(opt);
    });

    async function refreshAdmin() {
      const url = rpcSelect.value;
      const traces = [];
      const keys = ["BLOCKLIST_ADDRESS", "SELECTIVE_BLOCKLIST_ADDRESS", "STAKING_PROXY", "GOVERNANCE_ADMIN_A", "GOVERNANCE_ADMIN_B"];
      const mount = document.getElementById("adminCards");
      mount.innerHTML = "<p>Reading owner and code…</p>";
      const rows = [];
      for (const key of keys) rows.push(await inspectContract(url, key, traces));
      const ownerKey = DeskConfig.resolveContract("OBSERVED_OWNER_EOA");
      let ownerCard = "";
      if (ownerKey.pinned) {
        try {
          const code = await DeskRPC.getCode(url, ownerKey.address, traces);
          const empty = !code || code === "0x" || code === "0x0";
          ownerCard = `<div class="desk-card p-3 mb-3">
            <h3 class="h6">Observed owner EOA</h3>
            <p>${DeskUI.hexWithCopy(ownerKey.address)} ${empty ? DeskUI.badge("info", "eth_getCode empty") : DeskUI.badge("warn", "code present")}</p>
            <p class="small mb-0">EOA means no on-chain multisig. It does not prove one named person holds the key.</p>
          </div>`;
        } catch (e) {
          ownerCard = `<div class="desk-card p-3 mb-3"><h3 class="h6">Observed owner EOA</h3><p>${DeskUI.escapeHtml(e.message || e)}</p></div>`;
        }
      }
      mount.innerHTML = ownerCard + rows.map(renderContract).join("");
      document.getElementById("lastPoll").textContent = "Last successful poll: " + DeskUI.utcNowIso();
      DeskUI.bindCopies(mount);
    }

    document.getElementById("refreshAdmin")?.addEventListener("click", refreshAdmin);
    rpcSelect.addEventListener("change", refreshAdmin);

    document.getElementById("lookupForm")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const addr = document.getElementById("lookupAddress").value.trim();
      const box = document.getElementById("lookupOut");
      if (!ethers.isAddress(addr)) { box.textContent = "Need a valid address."; return; }
      try {
        const flags = await lookupFlags(rpcSelect.value, ethers.getAddress(addr), []);
        box.innerHTML = `<p>isBlocked: <strong>${flags.blocked == null ? "n/a" : flags.blocked}</strong>
          ${flags.blocked === true ? DeskUI.badge("info", '<i class="fa-solid fa-snowflake"></i> FROZEN ON THIS HISTORY') : ""}</p>
          <p>isRestricted: <strong>${flags.restricted == null ? "n/a" : flags.restricted}</strong></p>
          ${flags.errors.map((x) => `<p class="small mb-1">${DeskUI.badge("warn", "note")} ${DeskUI.escapeHtml(x)}</p>`).join("")}`;
      } catch (err) {
        box.textContent = String(err.message || err);
      }
    });

    document.getElementById("frozenNote").innerHTML =
      "<p>Frozen-supply panel is <strong>head-state lookup only</strong>. Public RPCs often disable <code>eth_getLogs</code>, so this page cannot enumerate every listed address from events. A live <code>isBlocked</code> read is a fact about one address on one RPC head, not a complete census.</p>";

    refreshAdmin().catch((e) => {
      document.getElementById("adminCards").innerHTML = `<p>${DeskUI.badge("danger", "error")} ${DeskUI.escapeHtml(e.message || e)}</p>`;
    });
  }

  global.DeskMonitor = { boot };
})(window);
