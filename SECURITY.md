# Security policy

1404 Desk is a static website. There is no application server and no user database.

## Please report

- Clones that add a seed field, “claim”, “unfreeze”, or any `eth_sendTransaction` path.
- UI that impersonates BlockDAG, bdagscan, or an RPC operator while using this name.
- XSS in our pages (unexpected HTML from RPC responses is a real risk — hex fields must stay escaped).

Open a GitHub issue on the `chain1404-desk` repository or a private security advisory if the host account supports it.

## Please do not

- Send anyone a seed, even when asking for help.
- Ask maintainers to “just push an unfreeze”.
- Expect a bounty programme. This is volunteer software.

## Scope

In scope: the static HTML, CSS, and JS in this repository.

Out of scope: third-party RPC operators, explorers, wallets, and exchange support desks.

## Hard rules for patches

The site may call `wallet_addEthereumChain` and `personal_sign` of a document ID. It must never call `eth_sendTransaction`, never deploy a contract, and never request a private key.
