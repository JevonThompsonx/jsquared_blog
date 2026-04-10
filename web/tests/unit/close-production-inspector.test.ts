import { describe, expect, it, vi } from "vitest";

import { closeProductionInspectorIfNeeded } from "@/lib/runtime/close-production-inspector";

describe("closeProductionInspectorIfNeeded", () => {
  it("closes an active inspector", () => {
    const close = vi.fn();

    closeProductionInspectorIfNeeded({
      inspector: {
        close,
        url: () => "ws://127.0.0.1:9229/test",
      },
    });

    expect(close).toHaveBeenCalledTimes(1);
  });

  it("does not close the inspector when no inspector session is active", () => {
    const close = vi.fn();

    closeProductionInspectorIfNeeded({
      inspector: {
        close,
        url: () => undefined,
      },
    });

    expect(close).not.toHaveBeenCalled();
  });
});
