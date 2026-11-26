import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const deployDir = path.resolve(process.cwd(), "..", "deploy", "blog");

const unitFiles = [
  "jsquared-blog.service",
  "jsquared-blog-publish.service",
  "jsquared-blog-publish.timer",
  "jsquared-blog-backup.service",
  "jsquared-blog-backup.timer",
];

function read(name: string): string {
  return readFileSync(path.join(deployDir, name), "utf8");
}

describe("versioned host contract", () => {
  it("ships every service, timer, script, and the operator README", () => {
    for (const name of [
      ...unitFiles,
      "jsquared-blog-backup",
      "deploy.sh",
      "verify-host.sh",
      "README.md",
    ]) {
      expect(existsSync(path.join(deployDir, name)), name).toBe(true);
    }
  });

  it("keeps the app service hardened and bound to the blog user", () => {
    const unit = read("jsquared-blog.service");

    expect(unit).toContain("User=blog");
    expect(unit).toContain("Group=blog");
    expect(unit).toContain("EnvironmentFile=/srv/blog/shared/.env");
    expect(unit).toContain("NoNewPrivileges=true");
    expect(unit).toContain("ProtectSystem=full");
    expect(unit).toContain("ReadWritePaths=/srv/blog");
    expect(unit).toContain(
      "ExecStart=/usr/local/bin/node /srv/blog/current/web/server.js",
    );
  });

  it("runs the cron units as the unprivileged blog user", () => {
    expect(read("jsquared-blog-publish.service")).toContain("User=blog");
    expect(read("jsquared-blog-publish.timer")).toContain(
      "OnCalendar=*-*-* *:00/5:00 UTC",
    );
    expect(read("jsquared-blog-backup.timer")).toContain(
      "OnCalendar=*-*-* 03:30:00 UTC",
    );
  });

  it("copies the backup script byte-for-byte from the live contract", () => {
    const script = read("jsquared-blog-backup");

    expect(script).toContain("set -euo pipefail");
    expect(script).toContain("umask 077");
    expect(script).toContain("sqlite3");
    expect(script).toContain('chmod 600 "$DIR/blog-$STAMP.db"');
    expect(script).toContain("-mtime +14 -delete");
  });

  it("never embeds credentials in the host contract", () => {
    for (const name of [
      ...unitFiles,
      "jsquared-blog-backup",
      "deploy.sh",
      "verify-host.sh",
      "README.md",
    ]) {
      const content = read(name);
      expect(content).not.toMatch(/TURSO_AUTH_TOKEN\s*=/);
      expect(content).not.toMatch(/WORKOS_COOKIE_PASSWORD\s*=/);
      expect(content).not.toMatch(/CRON_SECRET\s*=/);
    }
  });

  it("passes shell syntax checks", () => {
    for (const name of [
      "deploy.sh",
      "verify-host.sh",
      "jsquared-blog-backup",
    ]) {
      expect(() =>
        execFileSync("bash", ["-n", path.join(deployDir, name)], {
          stdio: "pipe",
        }),
      ).not.toThrow();
    }
  });

  it("deploy.sh refuses dirty trees and gates the switch behind migrate/verify", () => {
    const script = read("deploy.sh");

    expect(script).toContain("status --porcelain");
    expect(script).toContain("rev-parse --verify");
    expect(script).toContain("migrate-database.mjs");
    expect(script).toContain("verify-schema.mjs");
    expect(script).toContain("reconcile-migration-ledger.mjs");
    expect(script).toContain("jsquared-blog-backup");
    expect(script).toContain("SERVICE_NAME=jsquared-blog.service");
    expect(script).toContain('systemctl restart "$SERVICE_NAME"');
    expect(script).toContain("RELEASE.json");
    expect(script).toContain("/api/health");
    expect(script).toContain("PNPM_BIN");
    expect(script).toContain(
      "NEXT_PUBLIC_SITE_URL=https://jsquaredadventures.com",
    );
    expect(script).toContain(
      "NEXT_PUBLIC_WORKOS_REDIRECT_URI=https://jsquaredadventures.com/callback",
    );
    // Runtime env must be preflighted before building or switching.
    expect(script).toContain("Refusing to deploy: CRON_SECRET");
    expect(script).toContain("ADMIN_ALLOWED_EMAILS must contain at least one");
    expect(script).toContain("missing executable backup helper");
    expect(script).toContain("run_as_service_user");
    expect(script).toContain('chown -R root:"$SERVICE_GROUP" "$RELEASE_DIR"');
    expect(script).toContain(
      'chown -R "$SERVICE_USER:$SERVICE_GROUP" "$RELEASE_DIR/web/.next/cache"',
    );
    expect(script).toContain("pragma quick_check");
    expect(script).toContain("RATE_LIMIT_DRIVER must be");
    expect(script).toContain("LOCAL_MEDIA_ROOT is required");
    expect(script).toContain("PORT must match the health-check port");
    expect(script).toContain("Rollback could not be verified");
    expect(script).toContain("ln -sfn");
    // Migration must precede the symlink switch.
    expect(script.indexOf("verify-schema.mjs")).toBeLessThan(
      script.indexOf("ln -sfn"),
    );
  });

  it("verify-host.sh compares content, modes, ownership, timers, and User", () => {
    const script = read("verify-host.sh");

    expect(script).toContain("cmp -s");
    expect(script).toContain("stat -c '%a'");
    expect(script).toContain("stat -c '%U:%G'");
    expect(script).toContain("root:blog");
    expect(script).toContain("systemctl is-enabled");
    expect(script).toContain("systemctl show -p User");
    expect(script).toContain("/srv/blog/shared/.env");
  });
});
