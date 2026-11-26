# Public reader auth

This runbook is superseded by [`workos-auth.md`](./workos-auth.md).

Readers now use WorkOS AuthKit in keyless PKCE mode. The former local Better Auth
tables and environment variables remain for one code-rollback cycle, but the
Better Auth endpoints and client are removed.
