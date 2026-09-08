/**
 * Evidence locker — hashes files in the browser, never uploads them.
 * Optional wallet use: personal_sign of a document ID only. Never a typed transfer.
 */
(function (global) {
  const files = [];

  async function sha256Hex(buf) {
    const hash = await crypto.subtle.digest("SHA-256", buf);
    return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  async function sha256Text(text) {
    return sha256Hex(new TextEncoder().encode(text));
  }

  function loadReview() {
    try { return JSON.parse(sessionStorage.getItem("desk-current-review") || localStorage.getItem(DeskConfig.STORAGE_KEYS.lastReview) || "null"); }
    catch { return null; }
  }

  async function addFile(file) {
    const buf = await file.arrayBuffer();
    const hash = await sha256Hex(buf);
    files.push({ name: file.name, size: file.size, type: file.type || "application/octet-stream", hash, buffer: buf });
    renderFiles();
  }

  function renderFiles() {
    const el = document.getElementById("fileList");
    if (!files.length) { el.innerHTML = "<p class=\"small\">No files yet. Nothing leaves this device unless you download the ZIP.</p>"; return; }
    el.innerHTML = `<ul class="list-unstyled mb-0">${files.map((f) =>
      `<li class="mb-2"><strong>${DeskUI.escapeHtml(f.name)}</strong> · ${f.size} bytes<br><span class="hex">${f.hash}</span></li>`
    ).join("")}</ul>`;
  }

  async function documentId(review) {
    const fileHashCat = files.map((f) => f.hash).sort().join("");
    const reviewJson = review ? JSON.stringify(review) : "";
    const reviewHash = reviewJson ? await sha256Text(reviewJson) : "";
    const material = (review && review.address || "") + (review && review.capturedAt || "") + fileHashCat + reviewHash;
    return sha256Text(material);
  }

  function fillLetter(template, review, extra) {
    const map = {
      "{{address}}": review && review.address || "",
      "{{capturedAt}}": review && review.capturedAt || "",
      "{{summary}}": review && review.summary || "",
      "{{label}}": review && review.label || "",
      "{{exchangeUid}}": review && review.exchangeUid || "",
      "{{depositAddress}}": review && review.depositAddress || "",
      "{{txHash}}": review && review.txHash || "",
      "{{documentId}}": extra && extra.documentId || "",
      "{{signature}}": extra && extra.signature || "",
      "{{signer}}": extra && extra.signer || ""
    };
    let out = template;
    Object.keys(map).forEach((k) => { out = out.split(k).join(map[k]); });
    return out;
  }

  async function fetchTemplate(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error("Missing " + path);
    return res.text();
  }

  async function buildZip(opts) {
    if (!global.JSZip) throw new Error("JSZip failed to load");
    const review = loadReview();
    const docId = await documentId(review);
    const extra = { documentId: docId, signature: opts.signature || "", signer: opts.signer || "" };
    const [exLetter, authLetter] = await Promise.all([
      fetchTemplate("templates/letter-exchange.txt"),
      fetchTemplate("templates/letter-authority.txt")
    ]);
    const zip = new JSZip();
    if (review) zip.file("review.json", JSON.stringify(review, null, 2));
    zip.file("letter-exchange.txt", fillLetter(exLetter, review, extra));
    zip.file("letter-authority.txt", fillLetter(authLetter, review, extra));
    const folder = zip.folder("files");
    const sums = [];
    if (review) sums.push((await sha256Text(JSON.stringify(review))) + "  review.json");
    for (const f of files) {
      folder.file(f.name, f.buffer);
      sums.push(f.hash + "  files/" + f.name);
    }
    sums.push((await sha256Text(fillLetter(exLetter, review, extra))) + "  letter-exchange.txt");
    sums.push((await sha256Text(fillLetter(authLetter, review, extra))) + "  letter-authority.txt");
    sums.push("# documentId sha256(address + capturedAt + concatenated file hashes + review json hash) = " + docId);
    if (extra.signature) sums.push("# personal_sign signature = " + extra.signature);
    if (extra.signer) sums.push("# signer = " + extra.signer);
    zip.file("SHA256SUMS.txt", sums.join("\n") + "\n");
    const blob = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "1404-desk-evidence-" + (review && review.address ? review.address.slice(0, 10) : "pack") + ".zip";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function signDocumentId() {
    const eth = window.ethereum;
    if (!eth) throw new Error("No injected wallet.");
    const review = loadReview();
    const docId = await documentId(review);
    const accounts = await eth.request({ method: "eth_requestAccounts" });
    const signer = accounts[0];
    // personal_sign — signs the document ID string only. Not a transfer. Not a typed data spend.
    const signature = await eth.request({
      method: "personal_sign",
      params: [ethers.hexlify(ethers.toUtf8Bytes(docId)), signer]
    });
    return { signer, signature, documentId: docId };
  }

  function boot() {
    const review = loadReview();
    const box = document.getElementById("reviewPreview");
    if (review) {
      box.innerHTML = `<p>${DeskUI.badge("ok", "Inspect review loaded")}</p>
        <p class="mb-1">${DeskUI.escapeHtml(review.summary || "")}</p>
        <p class="small mb-0">${DeskUI.hexWithCopy(review.address)} · ${DeskUI.escapeHtml(review.capturedAt)}</p>`;
      DeskUI.bindCopies(box);
    } else {
      box.innerHTML = `<p>No Inspect review in session. Run <a href="inspect.html">Inspect</a> first if you want balances in the ZIP.</p>`;
    }

    const drop = document.getElementById("dropzone");
    const input = document.getElementById("fileInput");
    drop.addEventListener("click", () => input.click());
    drop.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") input.click(); });
    input.addEventListener("change", async () => {
      for (const f of input.files) await addFile(f);
      input.value = "";
    });
    ["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("drag"); }));
    ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("drag"); }));
    drop.addEventListener("drop", async (e) => {
      for (const f of e.dataTransfer.files) await addFile(f);
    });

    let signed = { signature: "", signer: "", documentId: "" };
    document.getElementById("btnSign")?.addEventListener("click", async () => {
      try {
        signed = await signDocumentId();
        document.getElementById("signOut").innerHTML =
          `<p>documentId <span class="hex">${signed.documentId}</span></p>
           <p>signer ${DeskUI.hexWithCopy(signed.signer)}</p>
           <p>signature <span class="hex">${DeskUI.escapeHtml(signed.signature)}</span></p>
           <p class="small">This signature covers the document ID only. It is not a transfer.</p>`;
        DeskUI.bindCopies(document.getElementById("signOut"));
      } catch (e) { DeskUI.toast(String(e.message || e)); }
    });
    document.getElementById("btnZip")?.addEventListener("click", async () => {
      try { await buildZip(signed); }
      catch (e) { DeskUI.toast(String(e.message || e)); }
    });
    document.getElementById("btnPrint")?.addEventListener("click", () => window.print());
    renderFiles();
  }

  global.DeskEvidence = { boot };
})(window);
