import { describe, it, expect } from "vitest";
import { getInitials } from "@/lib/display-utils";

describe("getInitials", () => {
  it("returns two uppercase initials for a two-part name", () => {
    expect(getInitials("Jevon Thompson")).toBe("JT");
  });

  it("returns one initial for a single-word name", () => {
    expect(getInitials("Madonna")).toBe("M");
  });

  it("only uses the first two words when name has more than two parts", () => {
    expect(getInitials("Mary Jane Watson")).toBe("MJ");
  });

  it("handles leading/trailing whitespace", () => {
    expect(getInitials("  Alice  ")).toBe("A");
  });

  it("handles multiple internal spaces between words", () => {
    expect(getInitials("Bob   Smith")).toBe("BS");
  });

  it("uppercases lowercase initials", () => {
    expect(getInitials("alice bob")).toBe("AB");
  });

  it("returns empty string for an empty string input", () => {
    expect(getInitials("")).toBe("");
  });

  it("returns empty string for a whitespace-only input", () => {
    expect(getInitials("   ")).toBe("");
  });
});
