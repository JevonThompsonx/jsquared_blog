#!/usr/bin/env bash
# Build, migrate, verify, and switch the blog release on templetonbak.
#
# Usage: sudo deploy/blog/deploy.sh <git-ref> [--reconcile]
#
# --reconcile applies the one-time migration ledger reconciliation before
# migrations. Use it only when a legacy hash or missing ledger row is known.
#
# Preconditions:
#   - clean worktree, HEAD already checked out at <git-ref>
#   - pnpm dependencies installed in web/
#   - /srv/blog/shared/.env present (never read into logs)
#
# The release is assembled under /srv/blog/releases/<UTC timestamp>. Migrations
# and schema verification run against the live database *before* the `current`
# symlink moves; any failure aborts with the previous release still active.
set -euo pipefail

if [[ $# -lt 1 || $# -gt 2 ]]; then
  echo "Usage: sudo $0 <git-ref> [--reconcile]" >&2
  exit 2
fi

REF=""
RECONCILE=0
for argument in "$@"; do
  case $argument in
    --reconcile) RECONCILE=1 ;;
    -*) echo "Unknown option: $argument" >&2; exit 2 ;;
    *)
      if [[ -n $REF ]]; then
        echo "Unexpected argument: $argument" >&2
        exit 2
      fi
      REF=$argument
      ;;
  esac
done

if [[ -z $REF ]]; then
  echo "Usage: sudo $0 <git-ref> [--reconcile]" >&2
  exit 2
fi

REPO_ROOT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$REPO_ROOT"

if [[ ${EUID} -ne 0 ]]; then
  echo "deploy.sh must run as root (switches /srv/blog/current and restarts systemd)." >&2
  exit 1
fi

GIT=(git -c safe.directory="$REPO_ROOT" -C "$REPO_ROOT")
RELEASES_DIR=/srv/blog/releases
ENV_FILE=/srv/blog/shared/.env
HEALTH_PORT=3010
HEALTH_URL="http://127.0.0.1:${HEALTH_PORT}/api/health"
SERVICE_NAME=jsquared-blog.service
SERVICE_USER=blog
SERVICE_GROUP=blog
BACKUP_HELPER=/usr/local/bin/jsquared-blog-backup
BACKUP_DB_PATH=/srv/blog/shared/blog.db
BACKUP_DIR=/srv/blog/shared/backups
SWITCHED=0
RELEASE_DIR=""

# Root must not rewrite the builder's git index. Run repo commands as the
# owner, exactly like the build and packaging steps.
OWNER=$(stat -c '%U' "$REPO_ROOT")
run_as_builder() {
  if [[ $EUID -eq 0 && $OWNER != root ]] && command -v runuser >/dev/null; then
    runuser -u "$OWNER" -- env PATH="${NODE_DIR:+$NODE_DIR:}$PATH" "$@"
  else
    "$@"
  fi
}
run_as_service_user() {
  if [[ $EUID -eq 0 ]] && command -v runuser >/dev/null; then
    runuser -u "$SERVICE_USER" -- env PATH="$NODE_DIR:$PATH" "$@"
  else
    "$@"
  fi
}

cleanup() {
  if [[ $SWITCHED -eq 0 && -n ${RELEASE_DIR:-} && -d $RELEASE_DIR ]]; then
    echo "Removing incomplete release $RELEASE_DIR" >&2
    rm -rf -- "${RELEASE_DIR:?}"
  fi
}
trap cleanup EXIT

if [[ -n $(run_as_builder "${GIT[@]}" status --porcelain) ]]; then
  echo "Refusing to deploy: the worktree is dirty. Commit or stash first." >&2
  exit 1
fi

if ! SHA=$(run_as_builder "${GIT[@]}" rev-parse --verify "${REF}^{commit}" 2>/dev/null); then
  echo "Refusing to deploy: '$REF' is not a committed ref." >&2
  exit 1
fi

HEAD_SHA=$(run_as_builder "${GIT[@]}" rev-parse HEAD)
if [[ $SHA != "$HEAD_SHA" ]]; then
  echo "Refusing to deploy: HEAD ($HEAD_SHA) is not '$REF' ($SHA). Check out the ref first." >&2
  exit 1
fi

for binary in node curl systemctl runuser sqlite3; do
  command -v "$binary" >/dev/null || {
    echo "Missing required command: $binary" >&2
    exit 1
  }
done

# sudo's secure_path often lacks the pnpm shim even though node is present.
PNPM_BIN=${PNPM_BIN:-$(command -v pnpm || true)}
if [[ -z ${PNPM_BIN:-} ]]; then
  for candidate in /opt/node-v26.4.0-linux-x64/bin/pnpm /usr/local/bin/pnpm; do
    if [[ -x $candidate ]]; then
      PNPM_BIN=$candidate
      break
    fi
  done
fi
if [[ -z ${PNPM_BIN:-} ]]; then
  echo "Missing required command: pnpm (set PNPM_BIN to override)" >&2
  exit 1
fi
NODE_DIR=$(dirname "$(command -v node)")
if [[ -d /opt/node-v26.4.0-linux-x64/bin ]]; then
  NODE_DIR=/opt/node-v26.4.0-linux-x64/bin
fi

if [[ ! -r $ENV_FILE ]]; then
  echo "Missing readable environment file: $ENV_FILE" >&2
  exit 1
fi

DB_URL=$(awk -F= '/^TURSO_DATABASE_URL=/{sub(/^[^=]*=/, ""); print; exit}' "$ENV_FILE")
# systemd accepts quoted values; strip a single surrounding quote pair.
DB_URL=${DB_URL%\"}
DB_URL=${DB_URL#\"}
DB_URL=${DB_URL%\'}
DB_URL=${DB_URL#\'}
if [[ $DB_URL != file:* ]]; then
  echo "Refusing to deploy: TURSO_DATABASE_URL must be a file: URL for the local origin." >&2
  exit 1
fi

DB_PATH=${DB_URL#file:}
DB_PATH=${DB_PATH%%\?*}
if [[ $DB_PATH != "$BACKUP_DB_PATH" ]]; then
  echo "Refusing to deploy: TURSO_DATABASE_URL must be file:$BACKUP_DB_PATH so the backup covers the migrated database." >&2
  exit 1
fi
if [[ ! -s $DB_PATH ]]; then
  echo "Refusing to deploy: database file $DB_PATH is missing or empty." >&2
  exit 1
fi

env_value() {
  awk -v key="$1" -F= '$1 == key { sub(/^[^=]*=/, ""); print; exit }' "$ENV_FILE"
}

strip_quotes() {
  local value=$1
  value=${value%\"}
  value=${value#\"}
  value=${value%\'}
  value=${value#\'}
  printf '%s' "$value"
}

# Fail before building or switching when the runtime environment cannot boot
# the release. Only variable names are ever printed.
cron_secret=$(strip_quotes "$(env_value CRON_SECRET)")
admin_emails=$(strip_quotes "$(env_value ADMIN_ALLOWED_EMAILS)")
site_url=$(strip_quotes "$(env_value NEXT_PUBLIC_SITE_URL)")
redirect_uri=$(strip_quotes "$(env_value NEXT_PUBLIC_WORKOS_REDIRECT_URI)")
workos_client_id=$(strip_quotes "$(env_value WORKOS_CLIENT_ID)")
workos_issuer=$(strip_quotes "$(env_value WORKOS_ISSUER)")
workos_cookie_password=$(strip_quotes "$(env_value WORKOS_COOKIE_PASSWORD)")
rate_limit_driver=$(strip_quotes "$(env_value RATE_LIMIT_DRIVER)")
local_media_root=$(strip_quotes "$(env_value LOCAL_MEDIA_ROOT)")
runtime_port=$(strip_quotes "$(env_value PORT)")
runtime_hostname=$(strip_quotes "$(env_value HOSTNAME)")
upstash_url=$(strip_quotes "$(env_value UPSTASH_REDIS_REST_URL)")
upstash_token=$(strip_quotes "$(env_value UPSTASH_REDIS_REST_TOKEN)")

if [[ ${#cron_secret} -lt 16 ]]; then
  echo "Refusing to deploy: CRON_SECRET must be at least 16 characters in $ENV_FILE." >&2
  exit 1
fi

if [[ $site_url != https://* ]]; then
  echo "Refusing to deploy: NEXT_PUBLIC_SITE_URL must be an HTTPS URL in $ENV_FILE." >&2
  exit 1
fi
site_host=${site_url#https://}
site_host=${site_host%%/*}
if [[ $site_host == localhost || $site_host == 127.* || $site_host == "::1" || $site_host == "[::1]" ]]; then
  echo "Refusing to deploy: NEXT_PUBLIC_SITE_URL must not use a loopback host." >&2
  exit 1
fi

if [[ $redirect_uri != https://*/callback ]]; then
  echo "Refusing to deploy: NEXT_PUBLIC_WORKOS_REDIRECT_URI must be an HTTPS /callback URL in $ENV_FILE." >&2
  exit 1
fi

if [[ -z $workos_client_id || $workos_issuer != https://* ]]; then
  echo "Refusing to deploy: WORKOS_CLIENT_ID and WORKOS_ISSUER must be set in $ENV_FILE." >&2
  exit 1
fi

if [[ ${#workos_cookie_password} -lt 32 ]]; then
  echo "Refusing to deploy: WORKOS_COOKIE_PASSWORD must be at least 32 characters in $ENV_FILE." >&2
  exit 1
fi

if [[ $rate_limit_driver != memory && $rate_limit_driver != upstash ]]; then
  echo "Refusing to deploy: RATE_LIMIT_DRIVER must be 'memory' or 'upstash' in $ENV_FILE." >&2
  exit 1
fi
if [[ $rate_limit_driver != memory ]]; then
  if [[ -z $upstash_url || -z $upstash_token ]]; then
    echo "Refusing to deploy: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required unless RATE_LIMIT_DRIVER=memory." >&2
    exit 1
  fi
fi

if [[ -z $local_media_root ]]; then
  echo "Refusing to deploy: LOCAL_MEDIA_ROOT is required in $ENV_FILE." >&2
  exit 1
fi
if [[ -z $runtime_hostname ]]; then
  echo "Refusing to deploy: HOSTNAME is required in $ENV_FILE so the service can bind the health port." >&2
  exit 1
fi

if [[ $runtime_port != "$HEALTH_PORT" ]]; then
  echo "Refusing to deploy: PORT must match the health-check port ($HEALTH_PORT) in $ENV_FILE." >&2
  exit 1
fi

valid_admin=0
admin_entries=()
if [[ -n $admin_emails ]]; then
  read -r -a admin_entries <<<"${admin_emails//,/ }" || true
fi
for entry in "${admin_entries[@]}"; do
  if [[ $entry =~ ^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$ ]]; then
    valid_admin=1
    break
  fi
done
if [[ $valid_admin -ne 1 ]]; then
  echo "Refusing to deploy: ADMIN_ALLOWED_EMAILS must contain at least one valid email in $ENV_FILE." >&2
  exit 1
fi

if systemctl cat "$SERVICE_NAME" >/dev/null 2>&1 && ! systemctl is-active --quiet "$SERVICE_NAME"; then
  echo "Warning: $SERVICE_NAME is not active; migrations still run as $SERVICE_USER and the deploy will restart it." >&2
fi

echo "Building release from $REF ($SHA)..."
(
  cd "$REPO_ROOT/web"
  # NEXT_PUBLIC_* values are inlined at build time. Use the canonical public
  # values here; no secrets or live env values are read into the build shell.
  export NEXT_PUBLIC_SITE_URL=https://jsquaredadventures.com
  export NEXT_PUBLIC_WORKOS_REDIRECT_URI=https://jsquaredadventures.com/callback
  export NEXT_PUBLIC_SENTRY_DSN=
  run_as_builder "$PNPM_BIN" run build:node
)

RELEASE_ID=$(date -u +%Y%m%dT%H%M%S)
RELEASE_DIR="$RELEASES_DIR/$RELEASE_ID"
if [[ -e $RELEASE_DIR ]]; then
  echo "Refusing to overwrite existing release $RELEASE_DIR" >&2
  exit 1
fi

echo "Packaging $RELEASE_DIR..."
install -d -o root -g "$SERVICE_GROUP" -m 0750 "$RELEASES_DIR"
(
  cd "$REPO_ROOT/web"
  node scripts/package-standalone.mjs "$RELEASE_DIR"
)

# The service runs as an unprivileged user: the release stays root-owned and
# readable through the blog group, while only the image/ISR cache is writable.
# A service-account compromise must not be able to edit its own entrypoint.
install -d -o "$SERVICE_USER" -g "$SERVICE_GROUP" -m 0775 "$RELEASE_DIR/web/.next/cache"
chown -R root:"$SERVICE_GROUP" "$RELEASE_DIR"
chown -R "$SERVICE_USER:$SERVICE_GROUP" "$RELEASE_DIR/web/.next/cache"

# The pre-migration snapshot is the database rollback path, so a missing helper,
# a mismatched database path, or an empty snapshot is a hard stop.
if [[ ! -x $BACKUP_HELPER ]]; then
  echo "Refusing to deploy: missing executable backup helper $BACKUP_HELPER." >&2
  exit 1
fi
install -d -o "$SERVICE_USER" -g "$SERVICE_GROUP" -m 0700 "$BACKUP_DIR"
echo "Recording pre-migration database backup..."
run_as_service_user "$BACKUP_HELPER"
mapfile -t recent_backups < <(
  find "$BACKUP_DIR" -maxdepth 1 -type f -name 'blog-*.db' -mmin -5 -printf '%T@ %p\n' | sort -nr
)
latest_backup=""
if ((${#recent_backups[@]} > 0)); then
  latest_backup=${recent_backups[0]#* }
fi
if [[ -z $latest_backup || ! -s $latest_backup ]]; then
  echo "Refusing to deploy: no non-empty backup was written in the last 5 minutes." >&2
  exit 1
fi
if ! sqlite3 "$latest_backup" 'pragma quick_check;' | grep -qx ok; then
  echo "Refusing to deploy: backup $latest_backup failed SQLite quick_check." >&2
  exit 1
fi
echo "Pre-migration backup: $latest_backup"

PREVIOUS_RELEASE=$(readlink -f /srv/blog/current 2>/dev/null || true)

echo "Applying migrations and verifying schema..."
(
  cd "$RELEASE_DIR/web"
  if [[ $RECONCILE -eq 1 ]]; then
    echo "Reconciling the migration ledger (explicit --reconcile)..."
    run_as_service_user env TURSO_DATABASE_URL="$DB_URL" \
      node scripts/reconcile-migration-ledger.mjs --apply
  fi
  run_as_service_user env TURSO_DATABASE_URL="$DB_URL" \
    node scripts/migrate-database.mjs
  run_as_service_user env TURSO_DATABASE_URL="$DB_URL" \
    node scripts/verify-schema.mjs
)

# Emit JSON with node so ref names containing shell metacharacters stay data.
node -e '
const [release, commit, ref, previous] = process.argv.slice(1);
process.stdout.write(
  `${JSON.stringify(
    {
      release,
      commit,
      ref,
      builtAt: new Date().toISOString(),
      migrated: true,
      previous,
    },
    null,
    2,
  )}\n`,
);
' "$RELEASE_ID" "$SHA" "$REF" "${PREVIOUS_RELEASE:-}" >"$RELEASE_DIR/RELEASE.json"
chown root:"$SERVICE_GROUP" "$RELEASE_DIR/RELEASE.json"
chmod 0644 "$RELEASE_DIR/RELEASE.json"

wait_for_health() {
  local attempts=$1
  local attempt
  for ((attempt = 0; attempt < attempts; attempt += 1)); do
    if curl -fsS --max-time 2 "$HEALTH_URL" 2>/dev/null | grep -q '"status":"ok"'; then
      return 0
    fi
    sleep 1
  done
  return 1
}

echo "Switching /srv/blog/current to $RELEASE_ID..."
ln -sfn "$RELEASE_DIR" /srv/blog/current.new
mv -Tf /srv/blog/current.new /srv/blog/current
chown -h root:"$SERVICE_GROUP" /srv/blog/current
SWITCHED=1

if ! systemctl restart "$SERVICE_NAME" || ! wait_for_health 30; then
  echo "Health check failed after switch." >&2
  if [[ -n ${PREVIOUS_RELEASE:-} && -d $PREVIOUS_RELEASE ]]; then
    echo "Rolling back to $PREVIOUS_RELEASE" >&2
    ln -sfn "$PREVIOUS_RELEASE" /srv/blog/current
    if systemctl restart "$SERVICE_NAME" && wait_for_health 30; then
      echo "Rollback complete; $PREVIOUS_RELEASE is healthy." >&2
    else
      echo "Rollback could not be verified; manual intervention required." >&2
    fi
  else
    echo "No previous release is available to roll back to." >&2
  fi
  exit 1
fi

# Keep the three newest releases.
mapfile -t releases < <(
  find "$RELEASES_DIR" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort
)
if ((${#releases[@]} > 3)); then
  current_target=$(readlink -f /srv/blog/current)
  for old in "${releases[@]:0:${#releases[@]}-3}"; do
    if [[ "$RELEASES_DIR/$old" == "$current_target" ]]; then
      continue
    fi
    rm -rf -- "${RELEASES_DIR:?}/$old"
  done
fi

echo "Deployed release $RELEASE_ID (commit $SHA)."
echo "Previous release: ${PREVIOUS_RELEASE:-none}"
