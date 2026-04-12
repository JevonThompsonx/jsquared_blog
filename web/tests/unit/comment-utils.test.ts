import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { formatCommentDate } from "@/lib/comment-utils";

describe("formatCommentDate", () => {
  let now: Date;

  beforeEach(() => {
    now = new Date("2025-06-15T12:00:00Z");
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'just now' for a date less than 60 seconds ago", () => {
    const date = new Date(now.getTime() - 30_000); // 30s ago
    expect(formatCommentDate(date.toISOString())).toBe("just now");
  });

  it("returns minutes ago for dates between 1 and 59 minutes ago", () => {
    const date = new Date(now.getTime() - 5 * 60 * 1000); // 5m ago
    expect(formatCommentDate(date.toISOString())).toBe("5m ago");
  });

  it("returns hours ago for dates between 1 and 23 hours ago", () => {
    const date = new Date(now.getTime() - 3 * 3600 * 1000); // 3h ago
    expect(formatCommentDate(date.toISOString())).toBe("3h ago");
  });

  it("returns days ago for dates between 1 and 6 days ago", () => {
    const date = new Date(now.getTime() - 4 * 86400 * 1000); // 4d ago
    expect(formatCommentDate(date.toISOString())).toBe("4d ago");
  });

  it("returns absolute date without time when older than 7 days and includeTime is false (default)", () => {
    const date = new Date("2025-01-01T08:30:00Z");
    const result = formatCommentDate(date.toISOString());
    expect(result).not.toContain("ago");
    // Should contain the year, not a time
    expect(result).toContain("2025");
    expect(result).not.toMatch(/\d+:\d+/); // no HH:MM
  });

  it("returns absolute date WITH time when older than 7 days and includeTime is true", () => {
    const date = new Date("2025-01-01T08:30:00Z");
    const result = formatCommentDate(date.toISOString(), true);
    expect(result).not.toContain("ago");
    expect(result).toContain("2025");
    // The formatted string should include a colon from the time portion
    expect(result).toMatch(/\d+:\d+/);
  });

  it("treats the 59-second boundary as 'just now'", () => {
    const date = new Date(now.getTime() - 59_000);
    expect(formatCommentDate(date.toISOString())).toBe("just now");
  });

  it("treats the 60-second boundary as '1m ago'", () => {
    const date = new Date(now.getTime() - 60_000);
    expect(formatCommentDate(date.toISOString())).toBe("1m ago");
  });
});
