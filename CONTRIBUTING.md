# Contributing

This repository is a read-only comparison desk. Patches that crown one history as canonical will be closed.

## Pin a contract address

1. Collect a full checksummed 20-byte value from two independent public sources or from a live `eth_getCode` you ran yourself.
2. Edit `js/config.js` → `CONTRACTS.<KEY>.address`.
3. Set `pinned: true` only when the value matches `^0x[0-9a-fA-F]{40}$`.
4. Keep the `source` comment honest: who published it, and that it must be verified live.
5. Never treat a truncated prefix as callable.

Settings on the Monitor page already let a user override pins in `localStorage` without a commit.

## Add an RPC

1. Add an object to `COMMUNITY_RPCS` or `SCAN_RPCS` in `js/config.js`.
2. Label the operator. Do not add a “primary” or “official” flag.
3. Record the explorer URL if you have one; leave it empty if you do not.
4. Expect browser CORS failures and leave the error visible.

## Tone

Calm, precise, adult. No “scam” headlines in chrome. No “god wallet” label in the UI.

## How to run locally

Any static server from the repo root:

```bash
python3 -m http.server 8080
```

Open `http://127.0.0.1:8080/`. Injected wallets usually require HTTPS except on localhost.
