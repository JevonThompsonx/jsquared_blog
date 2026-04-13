import { afterEach, describe, expect, it, vi } from "vitest";

type MockSpawnResult = {
  status?: number | null;
  error?: Error;
};

type MockRmSync = ReturnType<typeof vi.fn>;

type PrepareBuildScriptResult = {
  spawnSync: ReturnType<typeof vi.fn>;
  exitSpy: ReturnType<typeof vi.spyOn>;
  rmSync: MockRmSync;
  loadPromise: Promise<unknown>;
};

function prepareBuildScript({
  nodeOptions,
  extraEnv,
  platform,
  rmSyncImpl,
  spawnResult = { status: 0 },
}: {
  nodeOptions?: string;
  extraEnv?: Record<string, string | undefined>;
  platform?: NodeJS.Platform;
  rmSyncImpl?: Parameters<typeof vi.fn>[0];
  spawnResult?: MockSpawnResult;
} = {}): PrepareBuildScriptResult {
  vi.resetModules();

  const spawnSync = vi.fn(() => spawnResult);
  vi.doMock("node:child_process", () => ({ spawnSync }));

  const rmSync = vi.fn(rmSyncImpl);
  vi.doMock("node:fs", async () => {
    const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
    return {
      ...actual,
      rmSync,
    };
  });

  if (platform) {
    vi.doMock("node:process", async () => {
      const actual = (await vi.importActual("node:process")) as typeof import("node:process") & {
        default?: typeof process;
      };
      const actualProcess = actual.default ?? (actual as unknown as typeof process);

      return {
        ...actual,
        default: {
          ...actualProcess,
          platform,
        },
        platform,
      };
    });
  }

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
    rmSync,
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

  it("cleans the Turbopack build output before spawning next build", async () => {
    const { loadPromise, rmSync, spawnSync } = prepareBuildScript();

    await loadPromise;

    const buildCallIndex = rmSync.mock.calls.findIndex(([target]) => /[\\/]\.next[\\/]build$/.test(String(target)));

    expect(buildCallIndex).toBeGreaterThanOrEqual(0);
    expect(rmSync.mock.calls[buildCallIndex]).toEqual([
      expect.stringMatching(/[\\/]\.next[\\/]build$/),
      {
        force: true,
        recursive: true,
      },
    ]);
    expect(rmSync.mock.invocationCallOrder[buildCallIndex]).toBeLessThan(spawnSync.mock.invocationCallOrder[0]);
  });

  it("throws the child process error instead of swallowing it", async () => {
    const { loadPromise, exitSpy } = prepareBuildScript({
      spawnResult: { error: new Error("spawn failed") },
    });

    await expect(loadPromise).rejects.toThrow("spawn failed");
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("cleans the static build output on Windows before spawning next build", async () => {
    const { loadPromise, rmSync, spawnSync } = prepareBuildScript({
      platform: "win32",
    });

    await loadPromise;

    const staticCallIndex = rmSync.mock.calls.findIndex(([target]) => /[\\/]\.next[\\/]static$/.test(String(target)));

    expect(staticCallIndex).toBeGreaterThanOrEqual(0);
    expect(rmSync.mock.calls[staticCallIndex]).toEqual([
      expect.stringMatching(/[\\/]\.next[\\/]static$/),
      {
        force: true,
        recursive: true,
      },
    ]);
    expect(rmSync.mock.invocationCallOrder[staticCallIndex]).toBeLessThan(spawnSync.mock.invocationCallOrder[0]);
  });

  it("retries one transient Windows EPERM cleanup failure before building", async () => {
    const epermError = Object.assign(new Error("locked"), { code: "EPERM" });
    const rmSyncImpl = vi
      .fn()
      .mockImplementationOnce(() => {
        throw epermError;
      })
      .mockImplementationOnce(() => undefined);

    const { loadPromise, rmSync, spawnSync } = prepareBuildScript({
      platform: "win32",
      rmSyncImpl,
    });

    await loadPromise;

    expect(rmSync).toHaveBeenCalledTimes(3);
    expect(spawnSync).toHaveBeenCalledTimes(1);
  });

  it("surfaces non-EPERM cleanup failures instead of hiding them", async () => {
    const cleanupError = Object.assign(new Error("denied"), { code: "EACCES" });
    const { loadPromise, spawnSync } = prepareBuildScript({
      platform: "win32",
      rmSyncImpl: () => {
        throw cleanupError;
      },
    });

    await expect(loadPromise).rejects.toThrow("denied");
    expect(spawnSync).not.toHaveBeenCalled();
  });
});
