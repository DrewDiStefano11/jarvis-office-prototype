import { describe, it, expect } from "vitest";
import { normalizeShortcut } from "../shortcut";

describe("Shortcut Normalization", () => {
  it("normalizes canonical order and capitalization", () => {
    const res = normalizeShortcut("shift + ctrl + p");
    expect(res.isValid).toBe(true);
    expect(res.normalized).toBe("Ctrl+Shift+P");
  });

  it("handles case insensitivity", () => {
    const res = normalizeShortcut("CTRL+SHIFT+P");
    expect(res.isValid).toBe(true);
    expect(res.normalized).toBe("Ctrl+Shift+P");
  });

  it("handles single-letter shortcuts", () => {
    const res = normalizeShortcut("p");
    expect(res.isValid).toBe(true);
    expect(res.normalized).toBe("P");
  });

  it("handles title case for special keys", () => {
    const res = normalizeShortcut("enter");
    expect(res.isValid).toBe(true);
    expect(res.normalized).toBe("Enter");
  });

  it("rejects empty shortcuts", () => {
    const res = normalizeShortcut("   ");
    expect(res.isValid).toBe(false);
    expect(res.error).toBe("Shortcut cannot be empty or whitespace-only.");
  });

  it("rejects duplicate modifiers", () => {
    const res = normalizeShortcut("ctrl+ctrl+p");
    expect(res.isValid).toBe(false);
    expect(res.error).toContain("Duplicate modifier");
  });

  it("rejects missing final key", () => {
    const res = normalizeShortcut("ctrl+shift");
    expect(res.isValid).toBe(false);
    expect(res.error).toBe("Shortcut is missing a final key.");
  });

  it("rejects multiple keys", () => {
    const res = normalizeShortcut("ctrl+p+s");
    expect(res.isValid).toBe(false);
    expect(res.error).toBe("Shortcut contains more than one non-modifier key.");
  });

  it("rejects malformed separators", () => {
    const res = normalizeShortcut("ctrl++p");
    expect(res.isValid).toBe(false);
    expect(res.error).toContain("malformed separators");
  });
});