/**
 * Wallet network helpers.
 * The only write-style wallet call on this page is wallet_addEthereumChain.
 * That registers metadata in the wallet. It does not send BDAG.
 */
(function (global) {
  const PRESETS = [
    {
      id: "community",
      title: "BDAG Community 1404",
      chainName: "BDAG Community 1404",
      rpcUrl: "https://rpc.blockdag.engineering",
      explorer: "https://explorer.blockdag.engineering"
    },
    {
      id: "scan",
      title: "BDAG Scan-family 1404",
      chainName: "BDAG Scan-family 1404",
      rpcUrl: "https://rpc.bdagscan.com",
      explorer: "https://bdagscan.com"
    }
  ];

  function params(p) {
    return {
      chainId: DeskConfig.CHAIN_ID_HEX,
      chainName: p.chainName,
      nativeCurrency: { name: "BDAG", symbol: "BDAG", decimals: 18 },
      rpcUrls: [p.rpcUrl],
      blockExplorerUrls: p.explorer ? [p.explorer] : []
    };
  }

  async function addChain(p) {
    const eth = window.ethereum;
    if (!eth || !eth.request) {
      throw new Error("No injected wallet. Use the manual fields and copy them into MetaMask or Trust Wallet.");
    }
    // wallet_addEthereumChain — asks the wallet to remember this RPC + chain id.
    // Both presets use 0x57c. Wallets key networks by chain ID, so the second add
    // usually overwrites the first rather than creating a parallel live network.
    await eth.request({ method: "wallet_addEthereumChain", params: [params(p)] });
  }

  function boot() {
    document.querySelectorAll("[data-add-network]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-add-network");
        const p = PRESETS.find((x) => x.id === id);
        try {
          await addChain(p);
          DeskUI.toast("Wallet prompt opened for " + p.title);
        } catch (e) {
          DeskUI.toast(String(e.message || e));
        }
      });
    });
    DeskUI.bindCopies(document);
  }

  global.DeskNetworks = { boot, PRESETS, addChain };
})(window);
