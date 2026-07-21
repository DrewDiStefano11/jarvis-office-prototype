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
    originalMotionAllowed = false;
    durationMs = 0;
    continuous = false;
    flashing = false;
    parallax = false;
    appliedReasons.push("DECORATIVE_MOTION_DISABLED");
  }

  if (request.flashing && policy.disableFlashing) {
    originalMotionAllowed = false;
    flashing = false;
    appliedReasons.push("FLASHING_DISABLED");
  }

  if (request.parallax && policy.disableParallax) {
    originalMotionAllowed = false;
    parallax = false;
    appliedReasons.push("PARALLAX_DISABLED");
  }

  if (request.continuous && policy.replaceContinuousMovement) {
    originalMotionAllowed = false;
    continuous = false;
    appliedReasons.push("CONTINUOUS_MOTION_REPLACED");
  }

  if (request.essential && policy.preserveEssentialProgressFeedback) {
    // We do not let essential re-enable original decorative motion, but we can preserve essential feedback.
    if (policy.simplifyTransitions && durationMs > policy.maximumTransitionDurationMs) {
      durationMs = policy.maximumTransitionDurationMs;
      appliedReasons.push("ESSENTIAL_FEEDBACK_PRESERVED");
    } else if (!originalMotionAllowed) {
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
