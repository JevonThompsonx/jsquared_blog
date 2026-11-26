#!/usr/bin/env bash
# Verify that the live templetonbak host matches the versioned contract in
# deploy/blog/. Read-only: it never writes to /srv/blog, systemd, or the repo.
#
# Usage: sudo deploy/blog/verify-host.sh
set -euo pipefail

if [[ ${EUID} -ne 0 ]]; then
  echo "verify-host.sh must run as root (reads /srv/blog and systemd state)." >&2
  exit 1
fi

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
FAILURES=0

fail() {
  echo "FAIL: $*" >&2
  FAILURES=$((FAILURES + 1))
}

check_file() {
  local source=$1
  local target=$2
  local expected_mode=$3
  local expected_owner=$4

  if [[ ! -f $target ]]; then
    fail "missing $target"
    return
  fi
  if ! cmp -s "$source" "$target"; then
    fail "content differs: $target"
  fi

  local actual_mode actual_owner
  actual_mode=$(stat -c '%a' "$target")
  actual_owner=$(stat -c '%U:%G' "$target")
  [[ $actual_mode == "$expected_mode" ]] ||
    fail "$target mode is $actual_mode, expected $expected_mode"
  [[ $actual_owner == "$expected_owner" ]] ||
    fail "$target owner is $actual_owner, expected $expected_owner"
}

check_path() {
  local target=$1
  local expected_mode=$2
  local expected_owner=$3

  if [[ ! -e $target ]]; then
    fail "missing $target"
    return
  fi

  local actual_mode actual_owner
  actual_mode=$(stat -c '%a' "$target")
  actual_owner=$(stat -c '%U:%G' "$target")
  [[ $actual_mode == "$expected_mode" ]] ||
    fail "$target mode is $actual_mode, expected $expected_mode"
  [[ $actual_owner == "$expected_owner" ]] ||
    fail "$target owner is $actual_owner, expected $expected_owner"
}

# systemd units and the backup helper are copied byte-for-byte.
check_file "$SCRIPT_DIR/jsquared-blog.service" \
  /etc/systemd/system/jsquared-blog.service 644 root:root
check_file "$SCRIPT_DIR/jsquared-blog-publish.service" \
  /etc/systemd/system/jsquared-blog-publish.service 644 root:root
check_file "$SCRIPT_DIR/jsquared-blog-publish.timer" \
  /etc/systemd/system/jsquared-blog-publish.timer 644 root:root
check_file "$SCRIPT_DIR/jsquared-blog-backup.service" \
  /etc/systemd/system/jsquared-blog-backup.service 644 root:root
check_file "$SCRIPT_DIR/jsquared-blog-backup.timer" \
  /etc/systemd/system/jsquared-blog-backup.timer 644 root:root
check_file "$SCRIPT_DIR/jsquared-blog-backup" \
  /usr/local/bin/jsquared-blog-backup 755 root:root

# Release, shared state, and secret file ownership.
check_path /srv/blog 750 root:blog
check_path /srv/blog/releases 750 root:blog
check_path /srv/blog/shared 770 blog:blog
check_path /srv/blog/shared/.env 600 blog:blog
check_path /srv/blog/shared/media 775 blog:blog
check_path /srv/blog/shared/backups 700 blog:blog

if [[ -L /srv/blog/current ]]; then
  target=$(readlink -f /srv/blog/current)
  case $target in
    /srv/blog/releases/*) ;;
    *) fail "/srv/blog/current resolves outside /srv/blog/releases: $target" ;;
  esac

  release_owner=$(stat -c '%U:%G' "$target")
  [[ $release_owner == root:blog ]] ||
    fail "$target owner is $release_owner, expected root:blog"
  release_mode=$(stat -c '%A' "$target")
  [[ ${release_mode:5:1} != w && ${release_mode:8:1} != w ]] ||
    fail "$target is group/other writable ($release_mode)"

  cache_dir=$target/web/.next/cache
  if [[ -d $cache_dir ]]; then
    cache_owner=$(stat -c '%U:%G' "$cache_dir")
    [[ $cache_owner == blog:blog ]] ||
      fail "$cache_dir owner is $cache_owner, expected blog:blog"
    cache_mode=$(stat -c '%A' "$cache_dir")
    [[ ${cache_mode:2:1} == w ]] ||
      fail "$cache_dir is not writable by its owner ($cache_mode)"
  else
    fail "missing $cache_dir"
  fi
else
  fail "/srv/blog/current is missing or not a symlink"
fi

for timer in jsquared-blog-publish.timer jsquared-blog-backup.timer; do
  systemctl is-enabled --quiet "$timer" || fail "$timer is not enabled"
  systemctl is-active --quiet "$timer" || fail "$timer is not active"
done

service_user=$(systemctl show -p User --value jsquared-blog.service)
[[ $service_user == blog ]] ||
  fail "jsquared-blog.service User is '${service_user}', expected 'blog'"

if [[ $FAILURES -ne 0 ]]; then
  echo "Host verification failed with $FAILURES finding(s)." >&2
  exit 1
fi

echo "Host verification passed: units, scripts, ownership, modes, timers, and service user match deploy/blog/."
