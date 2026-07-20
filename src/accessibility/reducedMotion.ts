import type { ReducedMotionPolicy, MotionRequest, ResolvedMotionPresentation, ReducedMotionReason } from "./types";

export function resolveMotionPresentation(
  policy: ReducedMotionPolicy,
  request: MotionRequest
): ResolvedMotionPresentation {
  if (!policy.enabled) {
    return {
      originalMotionAllowed: true,
      replacementAllowed: false,
      durationMs: request.durationMs,
      continuous: request.continuous,
      flashing: request.flashing,
      parallax: request.parallax,
      fallbackPresentation: "none",
      appliedReasons: ["FULL_MOTION_ALLOWED"],
    };
  }

  let originalMotionAllowed = true;
  let durationMs = request.durationMs;
  let continuous = request.continuous;
  let flashing = request.flashing;
  let parallax = request.parallax;
  let fallbackPresentation = request.fallbackPresentation;

  const appliedReasons: ReducedMotionReason[] = [];

  if (request.purpose === "decorative" && policy.disableDecorativeMovement) {
    return {
      originalMotionAllowed: false,
      replacementAllowed: false, // decorative motion implies it can just be dropped
      durationMs: 0,
      continuous: false,
      flashing: false,
      parallax: false,
      fallbackPresentation: fallbackPresentation,
      appliedReasons: ["DECORATIVE_MOTION_DISABLED"],
    };
  }

  if (flashing && policy.disableFlashing) {
    originalMotionAllowed = false;
    flashing = false;
    appliedReasons.push("FLASHING_DISABLED");
  }

  if (parallax && policy.disableParallax) {
    originalMotionAllowed = false;
    parallax = false;
    appliedReasons.push("PARALLAX_DISABLED");
  }

  if (continuous && policy.replaceContinuousMovement) {
    originalMotionAllowed = false;
    continuous = false;
    appliedReasons.push("CONTINUOUS_MOTION_REPLACED");
  }

  if (request.essential && policy.preserveEssentialProgressFeedback) {
    // If essential, we don't clear the fallback or let it get suppressed entirely.
    // If it's already modified (e.g. continuous replaced), the original motion is NOT allowed,
    // but a replacement / simplified version is.
    if (policy.simplifyTransitions && durationMs > policy.maximumTransitionDurationMs) {
      durationMs = policy.maximumTransitionDurationMs;
      appliedReasons.push("ESSENTIAL_FEEDBACK_PRESERVED");
    } else if (!originalMotionAllowed) {
       // If it was modified by another rule, we just note that essential feedback is preserved.
       appliedReasons.push("ESSENTIAL_FEEDBACK_PRESERVED");
    }
  } else if (policy.simplifyTransitions && durationMs > policy.maximumTransitionDurationMs) {
    durationMs = policy.maximumTransitionDurationMs;
    appliedReasons.push("TRANSITION_SIMPLIFIED");
  }

  if (appliedReasons.length === 0) {
    appliedReasons.push("FULL_MOTION_ALLOWED");
    fallbackPresentation = "none";
  }

  // Set replacementAllowed to true if originalMotionAllowed is false AND we are preserving essential feedback
  const replacementAllowed = !originalMotionAllowed && appliedReasons.includes("ESSENTIAL_FEEDBACK_PRESERVED");

  return {
    originalMotionAllowed,
    replacementAllowed,
    durationMs,
    continuous,
    flashing,
    parallax,
    fallbackPresentation,
    appliedReasons,
  };
}
