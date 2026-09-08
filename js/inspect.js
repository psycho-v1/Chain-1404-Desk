/**
 * Inspect page — read both histories for one address.
 * Writes a Review object to sessionStorage + localStorage (size-guarded).
 */
(function (global) {
  function isAddress(v) {
    try { return ethers.isAddress(v); } catch { return false; }
  }

  function emptyFamily() {
    return { rpcs: [], checkpoints: {}, split: false, errors: [] };
  }

  async function reviewOneRpc(rpc, address, traces) {
    const row = {
      id: rpc.id, label: rpc.label, url: rpc.url, family: rpc.family,
      ok: false, error: null, height: null, headHash: null, stateRoot: null,
      balanceWei: null, balanceBdag: null, nonce: null,
      blocked: null, restricted: null, chainId: null
    };
    try {
      const probe = await DeskRPC.probeEndpoint(rpc, traces);
      row.chainId = probe.chainId;
      row.height = probe.blockNumber;
      row.headHash = probe.headHash;
      row.stateRoot = probe.stateRoot;
      if (!probe.ok) throw new Error(probe.error || "probe failed");
      const [bal, nonce] = await Promise.all([
        DeskRPC.getBalance(rpc.url, address, traces),
        DeskRPC.getNonce(rpc.url, address, traces)
      ]);
      const fmt = DeskUI.formatWei(bal);
      row.balanceWei = fmt.wei;
      row.balanceBdag = fmt.bdag;
      row.nonce = Number(BigInt(nonce));

      const bl = DeskConfig.resolveContract("BLOCKLIST_ADDRESS");
      if (bl.pinned) {
        try {
          row.blocked = await DeskRPC.callBool(rpc.url, bl.address, "function isBlocked(address account) view returns (bool)", [address], traces);
        } catch (e) { row.blockedError = String(e.message || e); }
      } else {
        row.blockedError = "blocklist address not fully pinned";
      }
      const sel = DeskConfig.resolveContract("SELECTIVE_BLOCKLIST_ADDRESS");
      if (sel.pinned) {
        try {
          row.restricted = await DeskRPC.callBool(rpc.url, sel.address, "function isRestricted(address account) view returns (bool)", [address], traces);
        } catch (e) {
          try {
            row.restricted = await DeskRPC.callBool(rpc.url, sel.address, "function isBlocked(address account) view returns (bool)", [address], traces);
          } catch (e2) { row.restrictedError = String(e2.message || e2); }
        }
      } else {
        row.restrictedError = "selective list address not fully pinned";
      }
      row.ok = true;
    } catch (err) {
      row.error = String(err.message || err);
    }
    return row;
  }

  async function checkpointsFor(rpc, traces) {
    const blocks = [0, DeskConfig.FORK.sharedThroughBlock, DeskConfig.FORK.divergeAtBlock];
    const out = {};
    for (const n of blocks) {
      try { out[n] = await DeskRPC.getBlock(rpc.url, n, traces); }
      catch (e) { out[n] = { number: n, error: String(e.message || e) }; }
    }
    return out;
  }

  function familySplit(rows) {
    const ok = rows.filter((r) => r.ok && r.headHash);
    if (ok.length < 2) return false;
    return ok.some((r) => r.headHash !== ok[0].headHash);
  }

  function checkpointSplit(a, b, block) {
    const ha = a && a[block] && a[block].hash;
    const hb = b && b[block] && b[block].hash;
    if (!ha || !hb) return null;
    return ha.toLowerCase() !== hb.toLowerCase();
  }

  function summarise(review) {
    const comm = review.community.rpcs.filter((r) => r.ok);
    const scan = review.scan.rpcs.filter((r) => r.ok);
    const c0 = comm[0];
    const s0 = scan[0];
    const parts = [];
    if (!c0 && !s0) return "No RPC answered. See the error list. This is not a balance of zero — it is a failed read.";
    if (c0) {
      parts.push("On community RPCs this address holds " + c0.balanceBdag + " BDAG" +
        (c0.blocked === true ? " and is blocked" : c0.blocked === false ? " and is not blocked" : "") + ".");
    } else parts.push("Community-family RPCs did not return a usable balance.");
    if (s0) {
      parts.push("On scan-family RPCs the balance is " + s0.balanceBdag + " BDAG" +
        (s0.blocked === true ? " and the address is blocked" : s0.blocked === false ? " and the address is not blocked" : "") + ".");
    } else parts.push("Scan-family RPCs did not return a usable balance.");
    if (review.divergent) parts.push("The histories diverged at block 316,002.");
    else if (review.divergent === false) parts.push("At block 316,002 the hashes this run could read did not differ.");
    else parts.push("Block 316,002 could not be compared on both families in this run.");
    if (review.community.split) parts.push("Community RPCs disagree with each other (FAMILY SPLIT).");
    if (review.scan.split) parts.push("Scan-family RPCs disagree with each other (FAMILY SPLIT).");
    return parts.join(" ");
  }

  async function runReview(form) {
    const address = (form.address || "").trim();
    if (!isAddress(address)) throw new Error("Enter a valid 0x address.");
    const traces = [];
    const communityJobs = DeskConfig.COMMUNITY_RPCS.map((r) => reviewOneRpc(Object.assign({ family: "community" }, r), address, traces));
    const scanJobs = DeskConfig.SCAN_RPCS.map((r) => reviewOneRpc(Object.assign({ family: "scan" }, r), address, traces));
    const [communityRows, scanRows] = await Promise.all([
      Promise.all(communityJobs),
      Promise.all(scanJobs)
    ]);

    const firstOk = (rows) => rows.find((r) => r.ok);
    let commCp = {};
    let scanCp = {};
    const cOk = firstOk(communityRows);
    const sOk = firstOk(scanRows);
    if (cOk) {
      try { commCp = await checkpointsFor(DeskConfig.COMMUNITY_RPCS.find((r) => r.id === cOk.id), traces); }
      catch (e) { commCp = { error: String(e.message || e) }; }
    }
    if (sOk) {
      try { scanCp = await checkpointsFor(DeskConfig.SCAN_RPCS.find((r) => r.id === sOk.id), traces); }
      catch (e) { scanCp = { error: String(e.message || e) }; }
    }

    const divergent = checkpointSplit(commCp, scanCp, DeskConfig.FORK.divergeAtBlock);
    const review = {
      schema: "1404desk.review.v1",
      capturedAt: DeskUI.utcNowIso(),
      address: ethers.getAddress(address),
      label: form.label || "",
      exchangeUid: form.exchangeUid || "",
      depositAddress: form.depositAddress || "",
      txHash: form.txHash || "",
      chainId: DeskConfig.CHAIN_ID,
      fork: DeskConfig.FORK,
      community: { rpcs: communityRows, checkpoints: commCp, split: familySplit(communityRows) },
      scan: { rpcs: scanRows, checkpoints: scanCp, split: familySplit(scanRows) },
      divergent,
      contracts: {
        blocklist: DeskConfig.resolveContract("BLOCKLIST_ADDRESS"),
        selective: DeskConfig.resolveContract("SELECTIVE_BLOCKLIST_ADDRESS")
      },
      traces,
      tool: DeskConfig.BUILD
    };
    review.summary = summarise(review);
    persist(review);
    return review;
  }

  function persist(review) {
    const json = JSON.stringify(review);
    sessionStorage.setItem("desk-current-review", json);
    if (json.length <= DeskConfig.LAST_REVIEW_MAX_BYTES) {
      try { localStorage.setItem(DeskConfig.STORAGE_KEYS.lastReview, json); }
      catch { DeskUI.toast("Could not save last review locally (quota)."); }
    } else {
      DeskUI.toast("Review larger than 5 MB guard — not stored in localStorage.");
    }
  }

  function loadLast() {
    try {
      return JSON.parse(sessionStorage.getItem("desk-current-review") || localStorage.getItem(DeskConfig.STORAGE_KEYS.lastReview) || "null");
    } catch { return null; }
  }

  function renderRpcCard(row) {
    const bits = [];
    if (!row.ok) bits.push(DeskUI.badge("danger", "ERROR"));
    else bits.push(DeskUI.badge("ok", "OK"));
    if (row.blocked === true) bits.push(DeskUI.badge("info", '<i class="fa-solid fa-snowflake"></i> FROZEN ON THIS HISTORY'));
    if (row.restricted === true) bits.push(DeskUI.badge("warn", "RESTRICTED"));
    if (row.chainId && row.chainId !== DeskConfig.CHAIN_ID) bits.push(DeskUI.badge("danger", "chainId " + row.chainId));
    return `<div class="desk-card p-3 mb-3">
      <div class="d-flex justify-content-between flex-wrap gap-2">
        <strong>${DeskUI.escapeHtml(row.label)}</strong>
        <div>${bits.join(" ")}</div>
      </div>
      <p class="small text-break mb-2">${DeskUI.escapeHtml(row.url)}</p>
      ${row.error ? `<p class="mb-1">${DeskUI.badge("danger", "RPC error")} ${DeskUI.escapeHtml(row.error)}</p>` : ""}
      <dl class="row small mb-0">
        <dt class="col-4">height</dt><dd class="col-8">${row.height ?? "—"}</dd>
        <dt class="col-4">head hash</dt><dd class="col-8">${DeskUI.hexWithCopy(row.headHash)}</dd>
        <dt class="col-4">state root</dt><dd class="col-8">${DeskUI.hexWithCopy(row.stateRoot)}</dd>
        <dt class="col-4">balance</dt><dd class="col-8">${row.balanceBdag ? DeskUI.escapeHtml(row.balanceBdag) + " BDAG" : "—"}<div class="hex">${row.balanceWei ? DeskUI.escapeHtml(row.balanceWei) + " wei" : ""}</div></dd>
        <dt class="col-4">nonce</dt><dd class="col-8">${row.nonce ?? "—"}</dd>
        <dt class="col-4">blocked</dt><dd class="col-8">${row.blocked == null ? DeskUI.escapeHtml(row.blockedError || "n/a") : row.blocked}</dd>
        <dt class="col-4">restricted</dt><dd class="col-8">${row.restricted == null ? DeskUI.escapeHtml(row.restrictedError || "n/a") : row.restricted}</dd>
      </dl>
    </div>`;
  }

  function renderCheckpoints(review) {
    const blocks = [0, 316001, 316002];
    const rows = blocks.map((n) => {
      const c = review.community.checkpoints[n] || {};
      const s = review.scan.checkpoints[n] || {};
      const diverge = c.hash && s.hash && c.hash.toLowerCase() !== s.hash.toLowerCase();
      return `<tr>
        <td>${n === 0 ? "genesis (0)" : n}</td>
        <td>${c.error ? DeskUI.escapeHtml(c.error) : DeskUI.hexWithCopy(c.hash)}</td>
        <td>${c.stateRoot ? DeskUI.hexWithCopy(c.stateRoot) : "—"}</td>
        <td>${s.error ? DeskUI.escapeHtml(s.error) : DeskUI.hexWithCopy(s.hash)}</td>
        <td>${s.stateRoot ? DeskUI.hexWithCopy(s.stateRoot) : "—"}</td>
        <td>${n === 316002 && diverge ? DeskUI.badge("danger", "DIVERGENT") : n === 316002 && c.hash && s.hash ? DeskUI.badge("ok", "match") : "—"}</td>
      </tr>`;
    }).join("");
    return `<div class="table-responsive"><table class="table table-desk table-sm">
      <thead><tr><th>Block</th><th>Community hash</th><th>Community state</th><th>Scan hash</th><th>Scan state</th><th>Flag</th></tr></thead>
      <tbody>${rows}</tbody></table></div>`;
  }

  function render(review, mount) {
    const flags = [];
    if (review.divergent) flags.push(DeskUI.badge("danger", "DIVERGENT"));
    if (review.community.split) flags.push(DeskUI.badge("warn", "FAMILY SPLIT · community"));
    if (review.scan.split) flags.push(DeskUI.badge("warn", "FAMILY SPLIT · scan"));
    const frozen = [...review.community.rpcs, ...review.scan.rpcs].some((r) => r.blocked === true);
    if (frozen) flags.push(DeskUI.badge("info", '<i class="fa-solid fa-snowflake"></i> FROZEN ON AT LEAST ONE HISTORY'));
    mount.innerHTML = `
      <div class="desk-card p-3 mb-3">
        <div class="d-flex flex-wrap gap-2 mb-2">${flags.join(" ") || DeskUI.badge("mute", "no flags")}</div>
        <p class="mb-1">${DeskUI.escapeHtml(review.summary)}</p>
        <p class="small mb-0">Captured ${DeskUI.escapeHtml(review.capturedAt)} · address ${DeskUI.hexWithCopy(review.address)}</p>
      </div>
      <div class="compare-grid mb-3">
        <div><h2 class="h5">Community family</h2>${review.community.rpcs.map(renderRpcCard).join("")}</div>
        <div><h2 class="h5">Scan family</h2>${review.scan.rpcs.map(renderRpcCard).join("")}</div>
      </div>
      <div class="desk-card p-3">
        <h2 class="h5">Checkpoints</h2>
        ${renderCheckpoints(review)}
      </div>`;
    DeskUI.bindCopies(mount);
  }

  function resultsText(review) {
    return JSON.stringify(review, null, 2);
  }

  async function boot() {
    const form = document.getElementById("inspectForm");
    if (!form) return;
    const params = new URLSearchParams(location.search);
    if (params.get("address") && !form.address.value) form.address.value = params.get("address");
    const out = document.getElementById("inspectResults");
    const last = loadLast();
    if (last && last.address) render(last, out);

    async function go() {
      const payload = {
        address: form.address.value,
        label: form.label.value,
        exchangeUid: form.exchangeUid.value,
        depositAddress: form.depositAddress.value,
        txHash: form.txHash.value
      };
      out.innerHTML = `<p>${DeskUI.badge("info", "Running")} Reading public RPCs… errors will be shown, not hidden.</p>`;
      try {
        const review = await runReview(payload);
        render(review, out);
        const url = new URL(location.href);
        url.searchParams.set("address", review.address);
        history.replaceState({}, "", url);
      } catch (e) {
        out.innerHTML = `<p>${DeskUI.badge("danger", "Failed")} ${DeskUI.escapeHtml(e.message || e)}</p>`;
      }
    }

    form.addEventListener("submit", (e) => { e.preventDefault(); go(); });
    document.getElementById("btnCopyResults")?.addEventListener("click", () => {
      const r = loadLast();
      if (!r) return DeskUI.toast("No results yet");
      DeskUI.copyText(resultsText(r));
    });
    document.getElementById("btnToEvidence")?.addEventListener("click", () => {
      const r = loadLast();
      if (!r) return DeskUI.toast("Run a review first");
      sessionStorage.setItem("desk-current-review", JSON.stringify(r));
      location.href = "evidence.html";
    });
    DeskUI.bindCopies(document);
  }

  global.DeskInspect = { boot, runReview, loadLast, render };
})(window);
