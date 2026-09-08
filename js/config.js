/**
 * 1404 Desk — pinned public configuration.
 *
 * Addresses that arrived truncated in source dossiers stay placeholders.
 * Do not treat a prefix as a callable contract. The UI must show
 * “unverified address” until a full checksummed value is pasted.
 *
 * Values below that look complete were taken from public community pages
 * and MUST be re-verified live (eth_getCode + method probes) before any
 * operational conclusion. This file does not crown a chain.
 */
(function (global) {
  const CHAIN_ID = 1404;
  const CHAIN_ID_HEX = "0x57c";

  const FORK = {
    sharedThroughBlock: 316001,
    divergeAtBlock: 316002,
    divergeAtUtc: "2026-02-17T22:03:01Z",
    genesisSweepWindowUtc: "2026-02-11T08:07:00Z–2026-02-11T08:28:00Z",
    note: "Shared genesis and block 316001. Hashes and state roots are documented as diverging at block 316002. Sweep window is context only; this app does not accuse anyone."
  };

  /**
   * Community-family public RPCs. Label only — none is “the” chain.
   * Extra endpoints from operator lists are included so Status can show them.
   */
  const COMMUNITY_RPCS = [
    { id: "eng", label: "rpc.blockdag.engineering", url: "https://rpc.blockdag.engineering", explorer: "https://explorer.blockdag.engineering" },
    { id: "welsh", label: "rpc.welshdag.trade", url: "https://rpc.welshdag.trade", explorer: "https://scan.welshdag.trade" },
    { id: "cape", label: "rpc.capedag.com", url: "https://rpc.capedag.com", explorer: "" },
    { id: "dvd", label: "rpc.dvdmining.com", url: "https://rpc.dvdmining.com", explorer: "" },
    { id: "bdagus", label: "rpc.bdag-us.org", url: "https://rpc.bdag-us.org", explorer: "" },
    { id: "east", label: "rpc.east.bdag-us.org", url: "https://rpc.east.bdag-us.org", explorer: "https://explorer.east.bdag-us.org" },
    { id: "west", label: "rpc.west.bdag-us.org", url: "https://rpc.west.bdag-us.org", explorer: "" },
    { id: "rms-live", label: "rms-bdag-rpc.de live", url: "https://rms-bdag-rpc.de/api/rpc-live", explorer: "" },
    { id: "rms-wallet", label: "rms-bdag-rpc.de wallet", url: "https://rms-bdag-rpc.de/api/rpc-wallet", explorer: "" }
  ];

  /**
   * Scan-family public RPCs. Same chain ID, documented different history
   * after 316002. Label only.
   */
  const SCAN_RPCS = [
    { id: "bdagscan", label: "rpc.bdagscan.com", url: "https://rpc.bdagscan.com", explorer: "https://bdagscan.com" },
    { id: "works", label: "rpc.blockdag.works", url: "https://rpc.blockdag.works", explorer: "https://explorer.blockdag.works" }
  ];

  /**
   * Contract map. pinned=true only when a full 20-byte address is present.
   * Prefix-only values MUST NOT be eth_call targets.
   *
   * Public sources matching the dossier prefixes (verify live):
   *  - Full blocklist 0xe628… published on community blocklist-check pages
   *  - Observed owner EOA 0xe9ce34ed… on the same pages
   *  - Staking proxy 0x08Bd… published on bdag.community
   */
  const CONTRACTS = {
    BLOCKLIST_ADDRESS: {
      key: "BLOCKLIST_ADDRESS",
      label: "Full blocklist",
      prefix: "0xe628",
      address: "0xe628505d5cB6F5F4f9a25Cd5c80Caa198cc645a0",
      pinned: true,
      source: "Public community blocklist-check pages. Verify with eth_getCode + isBlocked probe.",
      methods: ["isBlocked(address)", "owner()"]
    },
    SELECTIVE_BLOCKLIST_ADDRESS: {
      key: "SELECTIVE_BLOCKLIST_ADDRESS",
      label: "Selective blocklist",
      prefix: "0xc0a42A43",
      address: "",
      pinned: false,
      source: "Dossier prefix only. TODO: paste verified checksummed address.",
      methods: ["isRestricted(address)", "isBlocked(address)", "owner()"]
    },
    OBSERVED_OWNER_EOA: {
      key: "OBSERVED_OWNER_EOA",
      label: "Observed owner EOA",
      prefix: "0xe9ce34ed",
      address: "0xe9ce34eda6a4554420ca871d7057edaec32e9e9c",
      pinned: true,
      source: "Public community pages list this as owner() of the full blocklist. EOA ≠ identified person.",
      methods: []
    },
    STAKING_PROXY: {
      key: "STAKING_PROXY",
      label: "Staking proxy",
      prefix: "0x08Bd",
      address: "0x08Bd519F611556dC148e7BfFE8d6f078F23a8EF7",
      pinned: true,
      source: "Published on bdag.community as native staking contract. Treat as proxy; read ERC-1967 slot.",
      methods: ["owner()"]
    },
    GOVERNANCE_ADMIN_A: {
      key: "GOVERNANCE_ADMIN_A",
      label: "Governance / admin related A",
      prefix: "0x1000…0005",
      address: "",
      pinned: false,
      source: "Truncated in source PDFs. TODO: paste verified address.",
      methods: ["owner()"]
    },
    GOVERNANCE_ADMIN_B: {
      key: "GOVERNANCE_ADMIN_B",
      label: "Governance / admin related B",
      prefix: "0x3655",
      address: "",
      pinned: false,
      source: "Truncated in source PDFs. TODO: paste verified address.",
      methods: ["owner()"]
    }
  };

  const ABI = {
    ownable: ["function owner() view returns (address)"],
    blocklist: [
      "function isBlocked(address account) view returns (bool)",
      "function owner() view returns (address)"
    ],
    selective: [
      "function isRestricted(address account) view returns (bool)",
      "function isBlocked(address account) view returns (bool)",
      "function owner() view returns (address)"
    ]
  };

  const ERC1967_IMPLEMENTATION_SLOT =
    "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";

  const STORAGE_KEYS = {
    theme: "desk-theme",
    agreed: "desk-agreed",
    lastReview: "desk-last-review",
    overrides: "desk-contract-overrides"
  };

  const BUILD = {
    name: "1404 Desk",
    version: "0.1.0",
    stamp: "2026-09-08T00:00:00Z",
    repo: "chain1404-desk",
    pagesHint: "https://<user>.github.io/chain1404-desk/"
  };

  const RPC_TIMEOUT_MS = 8000;
  const LAST_REVIEW_MAX_BYTES = 5 * 1024 * 1024;

  function loadOverrides() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.overrides) || "{}") || {};
    } catch {
      return {};
    }
  }

  function saveOverrides(map) {
    localStorage.setItem(STORAGE_KEYS.overrides, JSON.stringify(map || {}));
  }

  function resolveContract(key) {
    const base = CONTRACTS[key];
    if (!base) return null;
    const over = loadOverrides()[key];
    const address = (over || base.address || "").trim();
    const pinned = /^0x[0-9a-fA-F]{40}$/.test(address);
    return Object.assign({}, base, { address, pinned, overridden: Boolean(over) });
  }

  function allRpcs() {
    return [
      ...COMMUNITY_RPCS.map((r) => Object.assign({ family: "community" }, r)),
      ...SCAN_RPCS.map((r) => Object.assign({ family: "scan" }, r))
    ];
  }

  function verifyBanner() {
    const missing = Object.values(CONTRACTS).filter((c) => !resolveContract(c.key).pinned);
    if (!missing.length) {
      return {
        level: "ok",
        text: "Configured contract addresses look complete (40 hex chars). Still verify live with eth_getCode before trusting a call result."
      };
    }
    return {
      level: "warn",
      text:
        "Address not fully pinned — paste a verified address. Incomplete: " +
        missing.map((c) => c.label + " (" + c.prefix + ")").join(", ") +
        ". Truncated prefixes are not callable."
    };
  }

  global.DeskConfig = {
    CHAIN_ID,
    CHAIN_ID_HEX,
    NATIVE: { symbol: "BDAG", decimals: 18 },
    FORK,
    COMMUNITY_RPCS,
    SCAN_RPCS,
    CONTRACTS,
    ABI,
    ERC1967_IMPLEMENTATION_SLOT,
    STORAGE_KEYS,
    BUILD,
    RPC_TIMEOUT_MS,
    LAST_REVIEW_MAX_BYTES,
    loadOverrides,
    saveOverrides,
    resolveContract,
    allRpcs,
    verifyBanner
  };
})(window);
