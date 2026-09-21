/**
 * Vendored from psycho-v1/splitkit browser/splitkit.js — keep in lockstep.
 */
(function (global) {
  "use strict";
  function hostOf(url) {
    try { return new URL(url).hostname.toLowerCase(); }
    catch (e) { throw new Error("Invalid RPC URL: " + url); }
  }
  function DeniedHostError(url, matched) {
    var err = new Error('RPC host denied by pin: ' + url + ' matched "' + matched + '"');
    err.name = "DeniedHostError"; err.url = url; err.matched = matched; return err;
  }
  function assertAllowed(url, deniedHostSubstrings) {
    var host = hostOf(url);
    var list = deniedHostSubstrings || [];
    for (var i = 0; i < list.length; i++) {
      var needle = String(list[i] || "").toLowerCase();
      if (needle && host.indexOf(needle) !== -1) throw DeniedHostError(url, list[i]);
    }
  }
  function filterAllowed(endpoints, deniedHostSubstrings) {
    var allowed = [], denied = [];
    (endpoints || []).forEach(function (endpoint) {
      try { assertAllowed(endpoint.url, deniedHostSubstrings); allowed.push(endpoint); }
      catch (err) {
        if (err && err.name === "DeniedHostError") denied.push({ endpoint: endpoint, matched: err.matched });
        else throw err;
      }
    });
    return { allowed: allowed, denied: denied };
  }
  function hashesEqual(a, b) {
    return String(a || "").toLowerCase() === String(b || "").toLowerCase();
  }
  function normalizeHash(hash) {
    var h = String(hash || "").toLowerCase();
    if (!/^0x[0-9a-f]{64}$/.test(h)) throw new Error("Not a 32-byte hex hash: " + hash);
    return h;
  }
  function detectSplit(height, samples, pinned) {
    var byHash = {};
    (samples || []).forEach(function (sample) {
      if (!sample || !sample.ok || !sample.result || !sample.result.hash) return;
      var hash = String(sample.result.hash).toLowerCase();
      if (!byHash[hash]) byHash[hash] = [];
      var ep = sample.endpoint || {};
      byHash[hash].push((ep.family || "?") + ":" + (ep.name || "?"));
    });
    var hashes = Object.keys(byHash);
    var matchesPin = pinned ? hashes.length === 1 && hashesEqual(hashes[0], pinned) : hashes.length <= 1;
    return { height: height, byHash: byHash, pinned: pinned, matchesPin: matchesPin };
  }
  global.Splitkit = {
    version: "0.1.0",
    hostOf: hostOf, assertAllowed: assertAllowed, filterAllowed: filterAllowed,
    hashesEqual: hashesEqual, normalizeHash: normalizeHash, detectSplit: detectSplit
  };
})(typeof window !== "undefined" ? window : globalThis);
