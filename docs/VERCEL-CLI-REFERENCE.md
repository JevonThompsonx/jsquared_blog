# Vercel CLI Reference

Repo-specific Vercel CLI notes for the J\u00b2 Adventures app in `web/`.

## What I installed

- Local CLI dependency: `vercel@50.42.0`
- Verify it with `bunx vercel --version`
- The CLI is available through the repo, so no global install is required

## Current status

- CLI is installed and runnable from this repo
- This machine is not authenticated with Vercel yet
- Until auth is set up, commands like `vercel whoami`, `vercel project ls`, `vercel list`, `vercel logs`, and `vercel inspect` will fail

Authenticate with one of these:

```bash
bunx vercel login
```

Or for non-interactive use:

```bash
VERCEL_TOKEN=... bunx vercel whoami
```

## What the Vercel CLI is useful for

Based on the current Vercel CLI docs, the commands most relevant to this repo are:

- `vercel link`: connect a local directory to a Vercel project
- `vercel pull`: cache remote project settings and env vars under `.vercel/` for `vercel build` and `vercel dev`
- `vercel env ls|pull|add|update|rm`: inspect and manage project environment variables
- `vercel build`: run a Vercel-style local build
- `vercel deploy`: create preview or production deployments
- `vercel list`: list recent deployments
- `vercel inspect --logs --wait`: inspect a deployment and wait for completion
- `vercel logs`: query request logs or stream runtime logs
- `vercel redeploy`: rebuild and redeploy a previous deployment
- `vercel open`: jump to the project in the dashboard

## Repo conventions

- The deployed Next.js app lives in `web/`
- Root `vercel.json` and `web/vercel.json` intentionally keep cron schedules aligned
- `web/vercel.json` is the app-level config for framework, install, build, output, and cron settings
- `.vercel/` is gitignored and safe for local project linkage/cache data

For operational commands, prefer running from `web/` or use `--cwd web`.

## Recommended workflow

### 1. Authenticate

```bash
bunx vercel login
```

Check auth:

```bash
bunx vercel whoami
```

### 2. Link `web/` to the correct Vercel project

```bash
bunx vercel link --cwd web
```

This should create local linkage inside `web/.vercel/` or use the existing project mapping if already linked.

### 3. Pull remote settings when needed

`vercel pull` is useful when using `vercel build` or `vercel dev` locally.

```bash
bunx vercel pull --cwd web --environment=preview
bunx vercel pull --cwd web --environment=production
```

Important:

- `vercel pull` writes cached env/settings under `.vercel/`
- If you want an `.env`-style file instead, use `vercel env pull`
- If you are only using `bun run build`, `vercel pull` is optional

### 4. Troubleshoot builds locally

First try the app's normal build:

```bash
bun run build
```

Then compare with a Vercel-style local build:

```bash
bunx vercel build --cwd web
```

Use `vercel build` when the local Bun build passes but Vercel still fails, or when you want to reproduce Vercel-specific build behavior more closely.

### 5. Create a preview deployment manually

```bash
bunx vercel --cwd web
```

Useful options:

```bash
bunx vercel --cwd web --logs
bunx vercel --cwd web --force
bunx vercel --cwd web --target=preview
```

Notes:

- Preview deploys are the safest manual deploy path for troubleshooting
- `stdout` returns the deployment URL
- `--logs` prints build logs during deploy
- `--force` bypasses build cache

### 6. Inspect a deployment after it starts

```bash
bunx vercel inspect <deployment-url-or-id> --logs --wait
```

This is one of the best commands for diagnosing failed or hanging deployments.

### 7. Query runtime/request logs

Examples:

```bash
bunx vercel logs --cwd web --environment production --since 1h --level error
bunx vercel logs --cwd web --environment preview --since 30m --status-code 5xx
bunx vercel logs --cwd web --follow
```

Useful filters from the current CLI:

- `--environment production|preview`
- `--level error|warning|info|fatal`
- `--status-code 500|5xx`
- `--query "timeout"`
- `--since 1h`
- `--follow`
- `--json`

### 8. Inspect recent deployments

```bash
bunx vercel list --cwd web
```

Then inspect a specific one:

```bash
bunx vercel inspect <deployment-url-or-id> --logs
```

### 9. Redeploy a known deployment

```bash
bunx vercel redeploy <deployment-url-or-id>
```

This is useful when the code is known-good and you want to retry infrastructure/build behavior without creating a new git commit.

## Production operations

Production deploy:

```bash
bunx vercel --cwd web --prod
```

Safer staged production flow:

```bash
bunx vercel --cwd web --prod --skip-domain
```

Then promote later if the deployment looks healthy.

Use extra care with production commands because this repo is already linked to GitHub-based Vercel deploys. In normal operation, git-driven deploys should remain the default path, and manual production deploys should be reserved for troubleshooting or urgent recovery.

## Environment variable operations

List env vars:

```bash
bunx vercel env ls --cwd web
```

Pull env vars into a file:

```bash
bunx vercel env pull web/.env.vercel.preview.local --cwd web
```

Run a command with Vercel env vars:

```bash
bunx vercel env run --cwd web -- bun run build
```

Do not commit pulled env files.

## Practical troubleshooting sequence

When a Vercel build or deployment fails, use this order:

1. Run `bun run build` from the repo root.
2. If local build passes, run `bunx vercel build --cwd web`.
3. If auth is available, inspect recent deploys with `bunx vercel list --cwd web`.
4. Inspect the failing deployment with `bunx vercel inspect <deployment> --logs --wait`.
5. Check request/runtime issues with `bunx vercel logs --cwd web --environment production --since 1h --level error`.
6. If the failure may be cache-related, retry with `bunx vercel --cwd web --force --logs`.
7. If the deployment artifact is good but the live deploy needs to be retried, use `bunx vercel redeploy <deployment>`.

## Current blocker for live monitoring

The only active blocker is authentication. Current output:

```text
Error: No existing credentials found. Please run `vercel login` or pass "--token"
```

Once auth is configured, the CLI can be used to:

- inspect linked project settings
- list and inspect preview/production deployments
- stream logs during incidents
- compare local and Vercel build behavior
- manually create preview deploys from this repo when needed

## Useful commands cheat sheet

```bash
# verify CLI
bunx vercel --version

# authenticate
bunx vercel login
bunx vercel whoami

# link app directory
bunx vercel link --cwd web

# inspect envs/settings cache
bunx vercel pull --cwd web --environment=preview
bunx vercel env ls --cwd web

# reproduce builds
bun run build
bunx vercel build --cwd web

# manual deploys
bunx vercel --cwd web --logs
bunx vercel --cwd web --prod

# deployment debugging
bunx vercel list --cwd web
bunx vercel inspect <deployment> --logs --wait
bunx vercel logs --cwd web --environment production --since 1h --level error
bunx vercel redeploy <deployment>
```
