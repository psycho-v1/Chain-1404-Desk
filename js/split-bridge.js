/**
 * Maps 1404 Desk config + inspect checkpoints onto Splitkit.
 * Desk still talks to both families. Splitkit only scores the pin.
 */
(function (global) {
  "use strict";
  function communityPin() {
    var fork = DeskConfig.FORK;
    return {
      chainId: DeskConfig.CHAIN_ID,
      deniedHostSubstrings: [],
      heights: [{ height: fork.divergeAtBlock, blockHash: fork.community316002 }]
    };
  }
  function sendPin() {
    var fork = DeskConfig.FORK;
    return {
      chainId: DeskConfig.CHAIN_ID,
      deniedHostSubstrings: fork.rejectHosts || ["bdagscan.com", "blockdag.works"],
      heights: [{ height: fork.divergeAtBlock, blockHash: fork.community316002 }]
    };
  }
  function sample(family, name, block) {
    if (!block || !block.hash) return null;
    return {
      endpoint: { name: name || family, url: "", family: family },
      ok: true,
      result: {
        number: block.number,
        hash: block.hash,
        parentHash: block.parentHash || ("0x" + "11".repeat(32)),
        stateRoot: block.stateRoot || ("0x" + "22".repeat(32)),
        timestamp: block.timestamp || 0
      },
      ms: 0
    };
  }
  function compareCheckpoints(review) {
    if (!global.Splitkit) return null;
    var height = DeskConfig.FORK.divergeAtBlock;
    var samples = [];
    var c = review.community && review.community.checkpoints ? review.community.checkpoints[height] : null;
    var s = review.scan && review.scan.checkpoints ? review.scan.checkpoints[height] : null;
    var cs = sample("community", "community-ok", c);
    var ss = sample("scan", "scan-ok", s);
    if (cs) samples.push(cs);
    if (ss) samples.push(ss);
    return Splitkit.detectSplit(height, samples, DeskConfig.FORK.community316002);
  }
  global.DeskSplit = { communityPin: communityPin, sendPin: sendPin, compareCheckpoints: compareCheckpoints };
})(window);
