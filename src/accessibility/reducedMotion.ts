import type { ReducedMotionPolicy, MotionRequest, ResolvedMotionPresentation } from "./types";

export function resolveMotionPresentation(
  policy: ReducedMotionPolicy,
  request: MotionRequest
): ResolvedMotionPresentation {
  if (!policy.enabled) {
    return {
      motionAllowed: true,
      durationMs: request.durationMs,
      continuous: request.continuous,
      flashing: request.flashing,
      parallax: request.parallax,
      fallbackPresentation: "none",
      reason: "FULL_MOTION_ALLOWED",
    };
  }

  if (request.purpose === "decorative" && policy.disableDecorativeMovement) {
    return {
      motionAllowed: false,
      durationMs: 0,
      continuous: false,
      flashing: false,
      parallax: false,
      fallbackPresentation: request.fallbackPresentation,
      reason: "DECORATIVE_MOTION_DISABLED",
    };
  }

  let motionAllowed = true;
  let durationMs = request.durationMs;
  let continuous = request.continuous;
  let flashing = request.flashing;
  let parallax = request.parallax;
  let fallbackPresentation = request.fallbackPresentation;
  let reason: ResolvedMotionPresentation["reason"] = "FULL_MOTION_ALLOWED";

  if (flashing && policy.disableFlashing) {
    motionAllowed = false;
    flashing = false;
    reason = "FLASHING_DISABLED";
  }

  if (parallax && policy.disableParallax) {
    motionAllowed = false;
    parallax = false;
    reason = "PARALLAX_DISABLED";
  }

  if (continuous && policy.replaceContinuousMovement) {
    motionAllowed = false;
    continuous = false;
    durationMs = 0;
    reason = "CONTINUOUS_MOTION_REPLACED";
  }

  if (request.essential && policy.preserveEssentialProgressFeedback) {
    if (policy.simplifyTransitions && request.durationMs > policy.maximumTransitionDurationMs) {
      motionAllowed = true; // Essential progress might override full disabled state
      durationMs = policy.maximumTransitionDurationMs;
      reason = "ESSENTIAL_FEEDBACK_PRESERVED";
    }
  } else if (policy.simplifyTransitions && durationMs > policy.maximumTransitionDurationMs) {
    durationMs = policy.maximumTransitionDurationMs;
    // If not already disabled, we say it's simplified.
    if (motionAllowed) {
      reason = "TRANSITION_SIMPLIFIED";
    }
  }

  if (reason === "FULL_MOTION_ALLOWED") {
    fallbackPresentation = "none";
  }

  return {
    motionAllowed,
    durationMs,
    continuous,
    flashing,
    parallax,
    fallbackPresentation,
    reason,
  };
}
