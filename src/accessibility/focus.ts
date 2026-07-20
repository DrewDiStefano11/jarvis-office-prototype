import type { FocusTarget, FocusResolution, FocusDirection } from "./types";

export function isFocusTargetEnabled(target: FocusTarget | undefined | null): boolean {
  if (!target) return false;
  return target.disabled !== true;
}

function validateTargets(targets: readonly FocusTarget[]): FocusResolution | null {
  const seenIds = new Set<string>();
  for (const t of targets) {
    const id = t.id?.trim();
    if (!id) {
      return {
        ok: false,
        code: "EMPTY_TARGET_ID",
        message: "A target in the collection has an empty or whitespace-only ID.",
      };
    }
    if (seenIds.has(id)) {
      return {
        ok: false,
        code: "DUPLICATE_TARGET_ID",
        message: `Duplicate target ID found: "${id}".`,
      };
    }
    seenIds.add(id);
  }
  return null;
}

export function getFirstEnabledTarget(targets: readonly FocusTarget[]): FocusResolution {
  const validationError = validateTargets(targets);
  if (validationError) return validationError;

  const enabledTargets = targets.filter(isFocusTargetEnabled);
  if (enabledTargets.length === 0) {
    return {
      ok: false,
      code: "NO_ENABLED_TARGETS",
      message: "No enabled focus targets found.",
    };
  }
  return { ok: true, targetId: enabledTargets[0].id };
}

export function getLastEnabledTarget(targets: readonly FocusTarget[]): FocusResolution {
  const validationError = validateTargets(targets);
  if (validationError) return validationError;

  const enabledTargets = targets.filter(isFocusTargetEnabled);
  if (enabledTargets.length === 0) {
    return {
      ok: false,
      code: "NO_ENABLED_TARGETS",
      message: "No enabled focus targets found.",
    };
  }
  return { ok: true, targetId: enabledTargets[enabledTargets.length - 1].id };
}

export function getNextFocusTarget(
  targets: readonly FocusTarget[],
  currentId: string | null | undefined,
  direction: FocusDirection,
  wrap: boolean = true
): FocusResolution {
  const validationError = validateTargets(targets);
  if (validationError) return validationError;

  const currentIdTrimmed = currentId?.trim();
  if (currentId !== undefined && currentId !== null && !currentIdTrimmed) {
     return {
        ok: false,
        code: "EMPTY_TARGET_ID",
        message: "The provided current ID is empty or whitespace-only.",
     };
  }

  if (!currentIdTrimmed) {
    if (direction === "previous" || direction === "last") {
      return getLastEnabledTarget(targets);
    }
    return getFirstEnabledTarget(targets);
  }

  const currentIndex = targets.findIndex((t) => t.id === currentIdTrimmed);
  if (currentIndex === -1) {
    return {
      ok: false,
      code: "CURRENT_TARGET_UNKNOWN",
      message: `The current target ID "${currentIdTrimmed}" was not found in the target list.`,
    };
  }

  if (direction === "first") return getFirstEnabledTarget(targets);
  if (direction === "last") return getLastEnabledTarget(targets);

  const step = direction === "next" ? 1 : -1;
  const len = targets.length;

  for (let i = 1; i <= len; i++) {
    const nextIndexRaw = currentIndex + (i * step);
    let nextIndex = nextIndexRaw;

    if (wrap) {
      nextIndex = ((nextIndexRaw % len) + len) % len;
    } else {
      if (nextIndex < 0 || nextIndex >= len) {
        // Did not wrap and went out of bounds.
        return {
          ok: false,
          code: "FOCUS_BOUNDARY_REACHED",
          message: "Reached the end of the focus list without wrapping.",
        };
      }
    }

    const potentialTarget = targets[nextIndex];
    if (isFocusTargetEnabled(potentialTarget)) {
      return { ok: true, targetId: potentialTarget.id };
    }
  }

  return {
    ok: false,
    code: "NO_ENABLED_TARGETS",
    message: "No enabled focus targets found in the given direction.",
  };
}

export function getRovingTabIndex(
  targets: readonly FocusTarget[],
  activeId: string | null | undefined,
  targetId: string
): -1 | 0 {
  const target = targets.find((t) => t.id === targetId);
  if (!isFocusTargetEnabled(target)) {
    return -1;
  }

  const enabledTargets = targets.filter(isFocusTargetEnabled);
  if (enabledTargets.length === 0) {
    return -1;
  }

  // If activeId is valid and enabled, it gets 0.
  if (activeId === targetId) {
    return 0;
  }

  // If activeId is invalid, not found, or disabled, the first enabled target gets 0.
  const activeTarget = activeId ? targets.find((t) => t.id === activeId) : undefined;
  if (!isFocusTargetEnabled(activeTarget)) {
    if (enabledTargets[0].id === targetId) {
      return 0;
    }
  }

  return -1;
}
