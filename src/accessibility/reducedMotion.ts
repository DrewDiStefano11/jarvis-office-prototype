import type { ReducedMotionPolicy, MotionRequest, ResolvedMotionPresentation, ReducedMotionReason } from "./types";

function hasSafeFallback(fallback: MotionRequest["fallbackPresentation"]): boolean {
  if (fallback === "instant" || fallback === "fade" || fallback === "static-indicator" || fallback === "text-update") {
    return true;
  }
  return false;
}

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

  let replacementAllowed = false;

  if (request.essential && policy.preserveEssentialProgressFeedback) {
    if (policy.simplifyTransitions && durationMs > policy.maximumTransitionDurationMs) {
      durationMs = policy.maximumTransitionDurationMs;
      // We simplified the transition, so we preserved essential feedback.
      // If original motion is allowed, replacement is false, but we add TRANSITION_SIMPLIFIED below instead of ESSENTIAL_FEEDBACK_PRESERVED to avoid false positives.
    }

    if (!originalMotionAllowed && hasSafeFallback(request.fallbackPresentation)) {
      appliedReasons.push("ESSENTIAL_FEEDBACK_PRESERVED");
      replacementAllowed = true;
    }
  }

  if (policy.simplifyTransitions && durationMs > policy.maximumTransitionDurationMs) {
    durationMs = policy.maximumTransitionDurationMs;
    appliedReasons.push("TRANSITION_SIMPLIFIED");
  } else if (request.essential && policy.preserveEssentialProgressFeedback && policy.simplifyTransitions && request.durationMs > policy.maximumTransitionDurationMs) {
    // If it was already set to max duration above by the essential block
    appliedReasons.push("TRANSITION_SIMPLIFIED");
  }

  if (appliedReasons.length === 0) {
    appliedReasons.push("FULL_MOTION_ALLOWED");
    fallbackPresentation = "none";
  }

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
