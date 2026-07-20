import { describe, it, expect } from "vitest";
import { resolveMotionPresentation } from "../reducedMotion";
import type { ReducedMotionPolicy, MotionRequest } from "../types";

describe("Reduced Motion Policy", () => {
  const basePolicy: ReducedMotionPolicy = {
    enabled: true,
    disableDecorativeMovement: true,
    replaceContinuousMovement: true,
    simplifyTransitions: true,
    disableParallax: true,
    disableFlashing: true,
    preserveEssentialProgressFeedback: true,
    maximumTransitionDurationMs: 200,
  };

  const disabledPolicy: ReducedMotionPolicy = {
    ...basePolicy,
    enabled: false,
  };

  const createRequest = (overrides: Partial<MotionRequest> = {}): MotionRequest => ({
    id: "m1",
    purpose: "navigation",
    durationMs: 500,
    continuous: false,
    flashing: false,
    parallax: false,
    essential: false,
    fallbackPresentation: "none",
    ...overrides,
  });

  it("allows full motion when policy is disabled", () => {
    const req = createRequest({ flashing: true, parallax: true });
    const res = resolveMotionPresentation(disabledPolicy, req);
    expect(res.originalMotionAllowed).toBe(true);
    expect(res.flashing).toBe(true);
    expect(res.parallax).toBe(true);
    expect(res.appliedReasons).toContain("FULL_MOTION_ALLOWED");
  });

  it("disables decorative movement", () => {
    const req = createRequest({ purpose: "decorative", fallbackPresentation: "fade" });
    const res = resolveMotionPresentation(basePolicy, req);
    expect(res.originalMotionAllowed).toBe(false);
    expect(res.appliedReasons).toContain("DECORATIVE_MOTION_DISABLED");
    expect(res.fallbackPresentation).toBe("fade");
  });

  it("disables flashing", () => {
    const req = createRequest({ flashing: true, fallbackPresentation: "static-indicator" });
    const res = resolveMotionPresentation(basePolicy, req);
    expect(res.originalMotionAllowed).toBe(false);
    expect(res.flashing).toBe(false);
    expect(res.appliedReasons).toContain("FLASHING_DISABLED");
  });

  it("disables parallax", () => {
    const req = createRequest({ parallax: true });
    const res = resolveMotionPresentation(basePolicy, req);
    expect(res.originalMotionAllowed).toBe(false);
    expect(res.parallax).toBe(false);
    expect(res.appliedReasons).toContain("PARALLAX_DISABLED");
  });

  it("replaces continuous movement", () => {
    const req = createRequest({ continuous: true, fallbackPresentation: "text-update" });
    const res = resolveMotionPresentation(basePolicy, req);
    expect(res.originalMotionAllowed).toBe(false);
    expect(res.continuous).toBe(false);
    expect(res.appliedReasons).toContain("CONTINUOUS_MOTION_REPLACED");
    expect(res.fallbackPresentation).toBe("text-update");
  });

  it("preserves essential feedback with simplified transition", () => {
    const req = createRequest({ essential: true, durationMs: 1000, fallbackPresentation: "fade" });
    const res = resolveMotionPresentation(basePolicy, req);
    expect(res.originalMotionAllowed).toBe(true);
    expect(res.durationMs).toBe(basePolicy.maximumTransitionDurationMs);
    expect(res.appliedReasons).toContain("ESSENTIAL_FEEDBACK_PRESERVED");
  });

  it("simplifies transitions exceeding max duration", () => {
    const req = createRequest({ durationMs: 500 });
    const res = resolveMotionPresentation(basePolicy, req);
    expect(res.originalMotionAllowed).toBe(true);
    expect(res.durationMs).toBe(basePolicy.maximumTransitionDurationMs);
    expect(res.appliedReasons).toContain("TRANSITION_SIMPLIFIED");
  });

  it("allows normal motion if it doesn't violate rules (e.g. short transition)", () => {
    const req = createRequest({ durationMs: 100 });
    const res = resolveMotionPresentation(basePolicy, req);
    expect(res.originalMotionAllowed).toBe(true);
    expect(res.durationMs).toBe(100);
    expect(res.appliedReasons).toContain("FULL_MOTION_ALLOWED");
  });

  it("combines continuous and flashing restrictions but preserves essential fallback", () => {
    const req = createRequest({ essential: true, continuous: true, flashing: true, fallbackPresentation: "text-update" });
    const res = resolveMotionPresentation(basePolicy, req);
    expect(res.originalMotionAllowed).toBe(false);
    expect(res.replacementAllowed).toBe(true); // essential fallback allowed
    expect(res.continuous).toBe(false);
    expect(res.flashing).toBe(false);
    expect(res.appliedReasons).toContain("CONTINUOUS_MOTION_REPLACED");
    expect(res.appliedReasons).toContain("FLASHING_DISABLED");
    expect(res.appliedReasons).toContain("ESSENTIAL_FEEDBACK_PRESERVED");
  });

  it("is deterministic", () => {
    const req = createRequest({ durationMs: 500 });
    const res1 = resolveMotionPresentation(basePolicy, req);
    const res2 = resolveMotionPresentation(basePolicy, req);
    expect(res1).toEqual(res2);
  });
});
