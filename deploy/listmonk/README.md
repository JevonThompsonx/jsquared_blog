# Listmonk deployment (gaia LXC 152)

This is the reproducible source for the self-hosted newsletter. It intentionally
contains **no secrets**; copy `.env.example` to `.env` on the host, fill it, and
keep it mode `0600`.

See [`docs/runbooks/listmonk.md`](../../docs/runbooks/listmonk.md) for operations.

## Services

- `listmonk/listmonk` (pin the digest after the first pull)
- `postgres:17-alpine` (named volume)
- Listmonk is bound to the LXC overlay `10.50.2.152:9000`; gaia's cloudflared
  tunnel publishes it at `listmonk.jsquaredadventures.com`.
- Cloudflare Access protects `/admin*`, `/api*`, and `/subscription/form`.
  `/subscription/optin/*` must stay public for double opt-in.
