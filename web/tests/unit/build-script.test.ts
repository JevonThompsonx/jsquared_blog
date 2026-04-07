import { afterEach, describe, expect, it, vi } from "vitest";

type MockSpawnResult = {
  status?: number | null;
  error?: Error;
};

function prepareBuildScript({
  nodeOptions,
  extraEnv,
  spawnResult = { status: 0 },
}: {
  nodeOptions?: string;
  extraEnv?: Record<string, string | undefined>;
  spawnResult?: MockSpawnResult;
} = {}) {
  vi.resetModules();

  const spawnSync = vi.fn(() => spawnResult);
  vi.doMock("node:child_process", () => ({ spawnSync }));

  const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => undefined) as never);

  if (nodeOptions === undefined) {
    delete process.env.NODE_OPTIONS;
  } else {
    process.env.NODE_OPTIONS = nodeOptions;
  }

  for (const [key, value] of Object.entries(extraEnv ?? {})) {
    if (value === undefined) {
      delete process.env[key];
      continue;
    }

    process.env[key] = value;
  }

  return {
    spawnSync,
    exitSpy,
    loadPromise: import("../../scripts/build"),
  };
}

describe("web/scripts/build.ts", () => {
  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    delete process.env.NODE_OPTIONS;
    delete process.env.BUILD_SCRIPT_TEST_ENV;
  });

  it("sanitizes NODE_OPTIONS before spawning next build", async () => {
    const { loadPromise, spawnSync, exitSpy } = prepareBuildScript({
      nodeOptions: "--enable-source-maps --inspect=127.0.0.1:9229 --max-old-space-size=2048",
      extraEnv: { BUILD_SCRIPT_TEST_ENV: "keep-me" },
    });

    await loadPromise;

    expect(spawnSync).toHaveBeenCalledWith(
      "next",
      ["build"],
      expect.objectContaining({
        cwd: process.cwd(),
        shell: true,
        stdio: "inherit",
        env: expect.objectContaining({
          BUILD_SCRIPT_TEST_ENV: "keep-me",
          NODE_OPTIONS: "--enable-source-maps --max-old-space-size=2048",
        }),
      }),
    );
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it("removes NODE_OPTIONS from the spawned env when only inspector flags are present", async () => {
    const { loadPromise, spawnSync } = prepareBuildScript({
      nodeOptions: "--inspect --inspect-port=0",
    });

    await loadPromise;

    expect(spawnSync).toHaveBeenCalledWith(
      "next",
      ["build"],
      expect.objectContaining({
        env: expect.not.objectContaining({
          NODE_OPTIONS: expect.any(String),
        }),
      }),
    );
  });

  it("propagates the child exit code", async () => {
    const { loadPromise, exitSpy } = prepareBuildScript({
      spawnResult: { status: 17 },
    });

    await loadPromise;

    expect(exitSpy).toHaveBeenCalledWith(17);
  });

  it("throws the child process error instead of swallowing it", async () => {
    const { loadPromise, exitSpy } = prepareBuildScript({
      spawnResult: { error: new Error("spawn failed") },
    });

    await expect(loadPromise).rejects.toThrow("spawn failed");
    expect(exitSpy).not.toHaveBeenCalled();
  });
});
