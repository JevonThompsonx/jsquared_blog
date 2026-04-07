import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import { readEnvFileValue, writeEnvFileValues } from "@/lib/e2e/env-file";

const tempDirectories: string[] = [];

async function makeTempEnvFile(initialContents?: string) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "jsquared-e2e-env-"));
  tempDirectories.push(directory);

  const filePath = path.join(directory, ".env.test.local");
  if (typeof initialContents === "string") {
    await writeFile(filePath, initialContents, "utf8");
  }

  return filePath;
}

describe("e2e env-file helpers", () => {
  afterEach(async () => {
    await Promise.all(tempDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
  });

  it("returns null for missing env files", () => {
    const missingPath = path.join(os.tmpdir(), "jsquared-missing", ".env.test.local");
    expect(readEnvFileValue(missingPath, "E2E_PUBLIC_EMAIL")).toBeNull();
  });

  it("ignores blank comment and malformed lines while preserving values after the first equals", async () => {
    const filePath = await makeTempEnvFile([
      "",
      "# comment",
      "NOT_A_REAL_ENTRY",
      "E2E_PUBLIC_EMAIL=reader@example.com",
      "E2E_PUBLIC_ENV_METADATA={\"a\":1,\"b\":\"x=y\"}",
      "",
    ].join("\n"));

    expect(readEnvFileValue(filePath, "E2E_PUBLIC_EMAIL")).toBe("reader@example.com");
    expect(readEnvFileValue(filePath, "E2E_PUBLIC_ENV_METADATA")).toBe('{"a":1,"b":"x=y"}');
    expect(readEnvFileValue(filePath, "NOT_A_REAL_ENTRY")).toBeNull();
  });

  it("writes sorted keys with a trailing newline", async () => {
    const filePath = await makeTempEnvFile();

    await writeEnvFileValues(filePath, [
      ["Z_KEY", "z-value"],
      ["A_KEY", "a-value"],
    ]);

    expect(await readFile(filePath, "utf8")).toBe("A_KEY=a-value\nZ_KEY=z-value\n");
  });

  it("updates one key while preserving unrelated entries", async () => {
    const filePath = await makeTempEnvFile(["A_KEY=keep", "B_KEY=replace-me", "C_KEY=also-keep"].join("\n"));

    await writeEnvFileValues(filePath, [["B_KEY", "replaced"]]);

    expect(await readFile(filePath, "utf8")).toBe("A_KEY=keep\nB_KEY=replaced\nC_KEY=also-keep\n");
  });
});
