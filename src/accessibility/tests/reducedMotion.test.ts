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
    expect(res.motionAllowed).toBe(true);
    expect(res.flashing).toBe(true);
    expect(res.parallax).toBe(true);
    expect(res.reason).toBe("FULL_MOTION_ALLOWED");
  });

  it("disables decorative movement", () => {
    const req = createRequest({ purpose: "decorative", fallbackPresentation: "fade" });
    const res = resolveMotionPresentation(basePolicy, req);
    expect(res.motionAllowed).toBe(false);
    expect(res.reason).toBe("DECORATIVE_MOTION_DISABLED");
    expect(res.fallbackPresentation).toBe("fade");
  });

  it("disables flashing", () => {
    const req = createRequest({ flashing: true, fallbackPresentation: "static-indicator" });
    const res = resolveMotionPresentation(basePolicy, req);
    expect(res.motionAllowed).toBe(false); // meaning the full requested motion isn't allowed as is
    expect(res.flashing).toBe(false);
    expect(res.reason).toBe("FLASHING_DISABLED");
  });

  it("disables parallax", () => {
    const req = createRequest({ parallax: true });
    const res = resolveMotionPresentation(basePolicy, req);
    expect(res.motionAllowed).toBe(false);
    expect(res.parallax).toBe(false);
    expect(res.reason).toBe("PARALLAX_DISABLED");
  });

  it("replaces continuous movement", () => {
    const req = createRequest({ continuous: true, fallbackPresentation: "text-update" });
    const res = resolveMotionPresentation(basePolicy, req);
    expect(res.motionAllowed).toBe(false);
    expect(res.continuous).toBe(false);
    expect(res.reason).toBe("CONTINUOUS_MOTION_REPLACED");
    expect(res.fallbackPresentation).toBe("text-update");
  });

  it("preserves essential feedback with simplified transition", () => {
    const req = createRequest({ essential: true, durationMs: 1000, fallbackPresentation: "fade" });
    const res = resolveMotionPresentation(basePolicy, req);
    expect(res.motionAllowed).toBe(true);
    expect(res.durationMs).toBe(basePolicy.maximumTransitionDurationMs);
    expect(res.reason).toBe("ESSENTIAL_FEEDBACK_PRESERVED");
  });

  it("simplifies transitions exceeding max duration", () => {
    const req = createRequest({ durationMs: 500 });
    const res = resolveMotionPresentation(basePolicy, req);
    expect(res.motionAllowed).toBe(true);
    expect(res.durationMs).toBe(basePolicy.maximumTransitionDurationMs);
    expect(res.reason).toBe("TRANSITION_SIMPLIFIED");
  });

  it("allows normal motion if it doesn't violate rules (e.g. short transition)", () => {
    const req = createRequest({ durationMs: 100 });
    const res = resolveMotionPresentation(basePolicy, req);
    expect(res.motionAllowed).toBe(true);
    expect(res.durationMs).toBe(100);
    expect(res.reason).toBe("FULL_MOTION_ALLOWED");
  });

  it("is deterministic", () => {
    const req = createRequest({ durationMs: 500 });
    const res1 = resolveMotionPresentation(basePolicy, req);
    const res2 = resolveMotionPresentation(basePolicy, req);
    expect(res1).toEqual(res2);
  });
});
