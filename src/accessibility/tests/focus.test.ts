import { describe, it, expect } from "vitest";
import { getNextFocusTarget, getFirstEnabledTarget, getLastEnabledTarget, getRovingTabIndex } from "../focus";
import type { FocusTarget } from "../types";

describe("Focus Management", () => {
  const targets: readonly FocusTarget[] = [
    { id: "t1" },
    { id: "t2", disabled: true },
    { id: "t3" },
    { id: "t4" },
  ];

  const allDisabled: readonly FocusTarget[] = [
    { id: "t1", disabled: true },
    { id: "t2", disabled: true },
  ];

  it("gets the first enabled target", () => {
    const res = getFirstEnabledTarget(targets);
    expect(res).toEqual({ ok: true, targetId: "t1" });
  });

  it("returns NO_ENABLED_TARGETS if all are disabled (first)", () => {
    const res = getFirstEnabledTarget(allDisabled);
    expect(res).toEqual({
      ok: false,
      code: "NO_ENABLED_TARGETS",
      message: "No enabled focus targets found.",
    });
  });

  it("gets the last enabled target", () => {
    const res = getLastEnabledTarget(targets);
    expect(res).toEqual({ ok: true, targetId: "t4" });
  });

  it("moves to next valid target, skipping disabled", () => {
    const res = getNextFocusTarget(targets, "t1", "next");
    expect(res).toEqual({ ok: true, targetId: "t3" });
  });

  it("moves to previous valid target, skipping disabled", () => {
    const res = getNextFocusTarget(targets, "t3", "previous");
    expect(res).toEqual({ ok: true, targetId: "t1" });
  });

  it("wraps forward by default", () => {
    const res = getNextFocusTarget(targets, "t4", "next");
    expect(res).toEqual({ ok: true, targetId: "t1" });
  });

  it("wraps backward by default", () => {
    const res = getNextFocusTarget(targets, "t1", "previous");
    expect(res).toEqual({ ok: true, targetId: "t4" });
  });

  it("fails to wrap forward when wrap=false", () => {
    const res = getNextFocusTarget(targets, "t4", "next", false);
    expect(res).toEqual({
      ok: false,
      code: "NO_ENABLED_TARGETS",
      message: "Reached the end of the focus list without wrapping.",
    });
  });

  it("returns CURRENT_TARGET_UNKNOWN if currentId is not found", () => {
    const res = getNextFocusTarget(targets, "unknown", "next");
    expect(res).toEqual({
      ok: false,
      code: "CURRENT_TARGET_UNKNOWN",
      message: 'The current target ID "unknown" was not found in the target list.',
    });
  });

  it("returns first enabled when currentId is null and direction is next", () => {
    const res = getNextFocusTarget(targets, null, "next");
    expect(res).toEqual({ ok: true, targetId: "t1" });
  });

  it("roving tab index gets 0 for active valid target", () => {
    expect(getRovingTabIndex(targets, "t3", "t3")).toBe(0);
    expect(getRovingTabIndex(targets, "t3", "t1")).toBe(-1);
  });

  it("roving tab index gets 0 for first valid target when activeId is unknown", () => {
    expect(getRovingTabIndex(targets, "unknown", "t1")).toBe(0);
    expect(getRovingTabIndex(targets, "unknown", "t3")).toBe(-1);
  });

  it("roving tab index gets -1 for disabled target", () => {
    expect(getRovingTabIndex(targets, "t3", "t2")).toBe(-1);
  });

  it("functions do not mutate inputs", () => {
    const original = [...targets];
    getNextFocusTarget(targets, "t1", "next");
    expect(targets).toEqual(original);
  });

  it("repeated calls produce identical results (deterministic)", () => {
    const res1 = getNextFocusTarget(targets, "t3", "next");
    const res2 = getNextFocusTarget(targets, "t3", "next");
    expect(res1).toEqual(res2);
  });
});
