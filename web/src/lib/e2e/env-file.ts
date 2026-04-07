import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

function readEnvFileEntries(filePath: string): Map<string, string> {
  if (!existsSync(filePath)) {
    return new Map();
  }

  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
  const values = new Map<string, string>();

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const value = trimmedLine.slice(separatorIndex + 1);
    values.set(key, value);
  }

  return values;
}

export function readEnvFileValue(filePath: string, key: string): string | null {
  return readEnvFileEntries(filePath).get(key) ?? null;
}

export async function writeEnvFileValues(filePath: string, entries: Iterable<readonly [string, string]>): Promise<void> {
  const values = readEnvFileEntries(filePath);

  for (const [key, value] of entries) {
    values.set(key, value);
  }

  const lines = Array.from(values.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([entryKey, entryValue]) => `${entryKey}=${entryValue}`);

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${lines.join("\n")}\n`, "utf8");
}
