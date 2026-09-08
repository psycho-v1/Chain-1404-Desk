# Reviewer checklist

Click through this after a static deploy. Tick in your notes, not in production UI.

## Gate and chrome

- [ ] First visit shows the agreement modal; backdrop click does not close it
- [ ] Decline shows the refusal screen
- [ ] Accept stores `desk-agreed` and reveals tools
- [ ] Footer “Review agreements” re-opens the modal
- [ ] Theme toggle survives reload (`desk-theme`)
- [ ] Every page has the short footer disclaimer
- [ ] Navbar Tools / Learn / Legal all resolve

## Home

- [ ] Four tool cards open the right pages
- [ ] Alert strip mentions block 316,002
- [ ] RPC snapshot shows errors instead of hiding dead rows

## Inspect

- [ ] Invalid address is rejected
- [ ] Valid address queries both families
- [ ] Failed RPC rows display the error text
- [ ] Checkpoint table includes genesis, 316001, 316002
- [ ] DIVERGENT badge appears only when 316002 hashes differ
- [ ] FAMILY SPLIT appears if two RPCs in one family disagree
- [ ] FROZEN badge uses the snowflake and the words “on this history”
- [ ] Copy works on hex values
- [ ] `?address=0x…` fills the form
- [ ] Send to Evidence locker lands on evidence.html with the review

## Monitor

- [ ] Yellow pin banner lists incomplete keys (selective list, governance)
- [ ] Override fields save to `desk-contract-overrides`
- [ ] Truncated prefixes are not called
- [ ] Owner caption includes “EOA means no on-chain multisig…”
- [ ] Frozen-supply note says head-state lookup only

## Networks

- [ ] Warning about duplicate chain ID 1404 is visible
- [ ] Wallet button triggers `wallet_addEthereumChain` only
- [ ] Manual fields have copy buttons
- [ ] No send / claim button exists

## Evidence

- [ ] Dropped file shows name, size, SHA-256
- [ ] ZIP contains review.json (if present), files/, both letters, SHA256SUMS.txt
- [ ] Letters include “This is holder-prepared technical output from 1404 Desk. It is not a finding of breach.”
- [ ] Signature button uses `personal_sign` of the document ID
- [ ] Print stylesheet hides nav

## Status

- [ ] All configured RPCs appear
- [ ] Pause stops the 60s timer
- [ ] Latency and last error columns populate

## Legal / guide

- [ ] Guide has 13 sections each ending with “You should now be able to…”
- [ ] FAQ includes official?, which chain?, unfreeze?, balance, EOA, signing
- [ ] Terms, privacy, disclaimer, SECURITY.md, CONTRIBUTING.md render or download

## Source audit

- [ ] `grep -R eth_sendTransaction js` is empty
- [ ] `grep -R seed js` does not collect a phrase
- [ ] Comments in `js/rpc.js` name each method
- [ ] Placeholders still listed at the bottom of this file if unpinned

## Addresses still placeholder (not callable until pasted)

- SELECTIVE_BLOCKLIST_ADDRESS prefix `0xc0a42A43`
- GOVERNANCE_ADMIN_A prefix `0x1000…0005`
- GOVERNANCE_ADMIN_B prefix `0x3655`
