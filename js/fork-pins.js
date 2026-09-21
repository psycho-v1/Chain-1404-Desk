/** Overlay published 316002 hashes onto DeskConfig without rewriting the contract map. */
(function () {
  if (!window.DeskConfig || !DeskConfig.FORK) return;
  DeskConfig.FORK.community316002 =
    DeskConfig.FORK.community316002 ||
    "0xcd4d2568e9cba6725329e8cf6d96217ace7acb03d71d9b519c8b2560bb6bb781";
  DeskConfig.FORK.gk316002 =
    DeskConfig.FORK.gk316002 ||
    "0xe2c7a9b0ff6206e6ac93f2cceead3992e081a4be64f5a5975d6e2158cc02a824";
  DeskConfig.FORK.rejectHosts = DeskConfig.FORK.rejectHosts || [
    "bdagscan.com", "rpc.bdagscan.com", "blockdag.works", "rpc.blockdag.works"
  ];
  if (DeskConfig.BUILD) {
    DeskConfig.BUILD.version = "0.2.0";
    DeskConfig.BUILD.splitkit = "https://github.com/psycho-v1/splitkit";
  }
})();
