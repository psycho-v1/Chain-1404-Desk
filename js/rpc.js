/**
 * Read-only JSON-RPC helper.
 *
 * Every outbound call is eth_* read or net_peerCount / web3_clientVersion.
 * This module never calls eth_sendTransaction and never touches private keys.
 *
 * Pattern for auditors:
 *  1. POST {"jsonrpc":"2.0","id":n,"method":"…","params":[…]} to the labelled URL
 *  2. 8 second abort
 *  3. Record raw result or error on the Review.traces array
 *  4. Promise.allSettled so one dead RPC cannot hide the others
 */
(function (global) {
  const TIMEOUT = () => (DeskConfig && DeskConfig.RPC_TIMEOUT_MS) || 8000;

  async function rawCall(url, method, params, traceBucket) {
    const started = performance.now();
    const body = { jsonrpc: "2.0", id: Date.now() % 1e9, method, params: params || [] };
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT());
    const entry = {
      url, method, params, at: new Date().toISOString().replace(/\.\d{3}Z$/, "Z")
    };
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: ctrl.signal
      });
      const json = await res.json();
      entry.ms = Math.round(performance.now() - started);
      entry.httpStatus = res.status;
      entry.result = json.result;
      entry.error = json.error || null;
      if (traceBucket) traceBucket.push(entry);
      if (json.error) throw new Error(json.error.message || JSON.stringify(json.error));
      if (!res.ok) throw new Error("HTTP " + res.status);
      return json.result;
    } catch (err) {
      entry.ms = Math.round(performance.now() - started);
      entry.thrown = err.name === "AbortError" ? "timeout " + TIMEOUT() + "ms" : String(err.message || err);
      if (traceBucket) traceBucket.push(entry);
      throw new Error(entry.thrown || String(err));
    } finally {
      clearTimeout(timer);
    }
  }

  function provider(url) {
    if (!global.ethers) throw new Error("ethers.js failed to load from CDN");
    return new ethers.JsonRpcProvider(url, DeskConfig.CHAIN_ID, { staticNetwork: true });
  }

  /**
   * Head snapshot used by Inspect and Status.
   * eth_chainId, eth_blockNumber, eth_getBlockByNumber("latest", false),
   * optional net_peerCount / web3_clientVersion.
   */
  async function probeEndpoint(rpc, traces) {
    const out = {
      id: rpc.id,
      label: rpc.label,
      url: rpc.url,
      family: rpc.family,
      explorer: rpc.explorer || "",
      ok: false,
      error: null,
      latencyMs: null,
      chainId: null,
      blockNumber: null,
      headHash: null,
      stateRoot: null,
      parentHash: null,
      timestamp: null,
      miner: null,
      peerCount: null,
      client: null
    };
    const t0 = performance.now();
    try {
      const [chainId, blockHex] = await Promise.all([
        rawCall(rpc.url, "eth_chainId", [], traces),
        rawCall(rpc.url, "eth_blockNumber", [], traces)
      ]);
      out.chainId = Number(BigInt(chainId));
      out.blockNumber = Number(BigInt(blockHex));
      const block = await rawCall(rpc.url, "eth_getBlockByNumber", [blockHex, false], traces);
      if (block) {
        out.headHash = block.hash || null;
        out.stateRoot = block.stateRoot || null;
        out.parentHash = block.parentHash || null;
        out.timestamp = block.timestamp ? Number(BigInt(block.timestamp)) : null;
        out.miner = block.miner || block.author || null;
      }
      try { out.peerCount = Number(BigInt(await rawCall(rpc.url, "net_peerCount", [], traces))); } catch (_) {}
      try { out.client = await rawCall(rpc.url, "web3_clientVersion", [], traces); } catch (_) {}
      out.ok = true;
    } catch (err) {
      out.error = String(err.message || err);
    }
    out.latencyMs = Math.round(performance.now() - t0);
    return out;
  }

  async function getBlock(url, blockNumber, traces) {
    const hex = "0x" + Number(blockNumber).toString(16);
    // eth_getBlockByNumber(blockHex, false) — header only, no tx list
    const block = await rawCall(url, "eth_getBlockByNumber", [hex, false], traces);
    if (!block) throw new Error("empty block " + blockNumber);
    return {
      number: Number(BigInt(block.number || hex)),
      hash: block.hash || null,
      stateRoot: block.stateRoot || null,
      parentHash: block.parentHash || null,
      timestamp: block.timestamp ? Number(BigInt(block.timestamp)) : null
    };
  }

  async function getBalance(url, address, traces) {
    // eth_getBalance(address, "latest") — native BDAG in wei
    return await rawCall(url, "eth_getBalance", [address, "latest"], traces);
  }

  async function getNonce(url, address, traces) {
    // eth_getTransactionCount(address, "latest") — confirmed nonce
    return await rawCall(url, "eth_getTransactionCount", [address, "latest"], traces);
  }

  async function getCode(url, address, traces) {
    // eth_getCode(address, "latest") — empty 0x means EOA (or missing account)
    return await rawCall(url, "eth_getCode", [address, "latest"], traces);
  }

  async function getStorageAt(url, address, slot, traces) {
    // eth_getStorageAt — used for ERC-1967 implementation slot
    return await rawCall(url, "eth_getStorageAt", [address, slot, "latest"], traces);
  }

  async function ethCall(url, to, data, traces) {
    // eth_call — simulated read. Never mined. Never spends gas from a key.
    return await rawCall(url, "eth_call", [{ to, data }, "latest"], traces);
  }

  function encodeFn(sig, args) {
    const iface = new ethers.Interface([sig]);
    const name = sig.slice(9, sig.indexOf("("));
    return iface.encodeFunctionData(name, args || []);
  }

  function decodeFn(sig, data) {
    const iface = new ethers.Interface([sig]);
    const name = sig.slice(9, sig.indexOf("("));
    return iface.decodeFunctionResult(name, data);
  }

  async function callBool(url, to, sig, args, traces) {
    const data = encodeFn(sig, args);
    const raw = await ethCall(url, to, data, traces);
    const decoded = decodeFn(sig, raw);
    return Boolean(decoded[0]);
  }

  async function callAddress(url, to, sig, args, traces) {
    const data = encodeFn(sig, args);
    const raw = await ethCall(url, to, data, traces);
    const decoded = decodeFn(sig, raw);
    return decoded[0];
  }

  async function settleAll(jobs) {
    const settled = await Promise.allSettled(jobs);
    return settled.map((s) => s.status === "fulfilled" ? { ok: true, value: s.value } : { ok: false, error: String(s.reason && s.reason.message || s.reason) });
  }

  global.DeskRPC = {
    rawCall, provider, probeEndpoint, getBlock, getBalance, getNonce, getCode,
    getStorageAt, ethCall, encodeFn, decodeFn, callBool, callAddress, settleAll
  };
})(window);
