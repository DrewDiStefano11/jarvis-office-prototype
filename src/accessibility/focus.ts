import type { FocusTarget, FocusResolution, FocusDirection, RovingTabIndexResolution } from "./types";

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
): RovingTabIndexResolution {
  const validationError = validateTargets(targets);
  if (validationError) {
    return validationError as RovingTabIndexResolution;
  }

  const activeIdTrimmed = activeId?.trim();
  if (activeId !== undefined && activeId !== null && !activeIdTrimmed) {
     return {
        ok: false,
        code: "EMPTY_TARGET_ID",
        message: "The provided active ID is explicitly empty or whitespace-only.",
     };
  }

  const targetIdTrimmed = targetId?.trim();
  if (!targetIdTrimmed) {
    return {
      ok: false,
      code: "EMPTY_TARGET_ID",
      message: "The provided target ID argument is empty or whitespace-only.",
    };
  }

  const enabledTargets = targets.filter(isFocusTargetEnabled);
  if (enabledTargets.length === 0) {
    return {
      ok: false,
      code: "NO_ENABLED_TARGETS",
      message: "No enabled focus targets found.",
    };
  }

  const target = targets.find((t) => t.id === targetIdTrimmed);
  if (!target) {
    return {
      ok: false,
      code: "CURRENT_TARGET_UNKNOWN",
      message: `The target ID "${targetIdTrimmed}" was not found in the target list.`,
    };
  }

  if (!isFocusTargetEnabled(target)) {
    return { ok: true, tabIndex: -1 };
  }

  // If activeId is valid and enabled, it alone gets 0.
  if (activeIdTrimmed === targetIdTrimmed) {
    return { ok: true, tabIndex: 0 };
  }

  // If active target is absent, null, unknown under a documented fallback, or disabled,
  // the first enabled target receives tabIndex 0.
  const activeTarget = activeIdTrimmed ? targets.find((t) => t.id === activeIdTrimmed) : undefined;
  if (!activeTarget || !isFocusTargetEnabled(activeTarget)) {
    if (enabledTargets[0].id === targetIdTrimmed) {
      return { ok: true, tabIndex: 0 };
    }
  }

  return { ok: true, tabIndex: -1 };
}
