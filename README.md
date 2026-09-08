# 1404 Desk

A read-only, mobile-friendly static dApp that helps Chain ID 1404 (BDAG) holders inspect **both** divergent histories, see freeze and admin state, add clearly labelled wallet networks, and export a signed evidence pack.

**Not affiliated with BlockDAG, bdagscan, or any RPC operator.**

Live Pages URL pattern: `https://<github-username>.github.io/chain1404-desk/`

![logo](assets/logo.svg)

## What it is

Static HTML + CSS + JS. CDN copies of Bootstrap 5.3.3, Font Awesome 6, ethers v6, and JSZip. No backend, no npm build for v0.1.

It queries labelled public RPCs in parallel. If one fails, the error stays on screen. If the two families disagree at block 316,002 it shows **DIVERGENT**. It never picks a canonical chain.

## Screenshots

Placeholder — take these after first Pages deploy:

- Home hero with four tool cards
- Inspect two-column compare
- Monitor owner / code cards
- Evidence locker dropzone

## Feature list

- First-visit agreement modal
- Inspect address on community + scan families
- Shareable `?address=0x…` links
- Family-split warning
- Freeze and admin monitor with override fields for truncated dossier addresses
- `wallet_addEthereumChain` presets + manual copy fields
- Evidence ZIP (`review.json`, `files/`, letters, `SHA256SUMS.txt`)
- Optional `personal_sign(documentId)`
- RPC status table with 60s refresh
- Non-technical user guide and FAQ
- Light / dark theme (`desk-theme`)
- Clear local data

## What it will never do

- Call `eth_sendTransaction`
- Ask for a seed or private key
- Deploy a claim, unfreeze, wrap, or payout contract
- Crown one RPC family

## RPC list (labels only)

Community family (also extra operator endpoints):

- https://rpc.blockdag.engineering
- https://rpc.welshdag.trade
- https://rpc.capedag.com
- https://rpc.dvdmining.com
- https://rpc.bdag-us.org
- https://rpc.east.bdag-us.org
- https://rpc.west.bdag-us.org
- https://rms-bdag-rpc.de/api/rpc-live
- https://rms-bdag-rpc.de/api/rpc-wallet

Scan family:

- https://rpc.bdagscan.com
- https://rpc.blockdag.works

Chain ID 1404 (`0x57c`). Native symbol BDAG, 18 decimals.

Documented fork context: shared genesis and block 316001; hashes / state roots diverge at block 316002 (17 Feb 2026 22:03:01 UTC).

## How to run locally

```bash
git clone https://github.com/<user>/chain1404-desk.git
cd chain1404-desk
python3 -m http.server 8080
```

Open http://127.0.0.1:8080/

Any other static server works (`npx serve`, Caddy, nginx).

## How to verify

1. Read `js/config.js` and `js/rpc.js`. Comments describe every RPC method.
2. Confirm there is no `eth_sendTransaction` string in `js/`.
3. Run Inspect and watch failed RPCs remain visible.
4. Compare checkpoint hashes at 0 / 316001 / 316002 yourself.

## Disclaimer

Not legal, financial, or tax advice. RPC answers change. Truncated addresses must be verified. Freeze ≠ confiscation. EOA ≠ identified person. See `disclaimer.html`.

## License

MIT. See `LICENSE`.

## Credits

- [Bootstrap 5](https://getbootstrap.com/)
- [Font Awesome Free 6](https://fontawesome.com/)
- [ethers.js](https://docs.ethers.org/)
- [JSZip](https://stuk.github.io/jszip/)
- Inter via Google Fonts

Not affiliated with BlockDAG, bdagscan, or any RPC operator.
