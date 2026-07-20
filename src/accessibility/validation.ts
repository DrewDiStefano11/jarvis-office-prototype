import type {
  AccessibilityValidationResult,
  AccessibilityValidationIssue,
  KeyboardCommand,
  FocusTarget,
  AnnouncementDescriptor,
} from "./types";

export function validateKeyboardCommands(
  commands: readonly KeyboardCommand[]
): AccessibilityValidationResult {
  const issues: AccessibilityValidationIssue[] = [];
  const idSet = new Set<string>();
  const shortcutSet = new Set<string>();

  for (const command of commands) {
    if (!command.id || command.id.trim() === "") {
      issues.push({
        code: "MISSING_COMMAND_ID",
        severity: "error",
        message: "Keyboard command is missing a valid ID.",
        field: "id",
      });
    } else {
      if (idSet.has(command.id)) {
        issues.push({
          code: "DUPLICATE_COMMAND_ID",
          severity: "error",
          message: `Duplicate keyboard command ID found: ${command.id}.`,
          commandId: command.id,
          field: "id",
        });
      }
      idSet.add(command.id);
    }

    if (!command.label || command.label.trim() === "") {
      issues.push({
        code: "MISSING_READABLE_LABEL",
        severity: "error",
        message: `Command "${command.id || 'unknown'}" is missing a readable label.`,
        commandId: command.id,
        field: "label",
      });
    }

    if (command.defaultShortcut) {
      if (shortcutSet.has(command.defaultShortcut)) {
        issues.push({
          code: "SHORTCUT_CONFLICT",
          severity: "error",
          message: `Shortcut conflict detected for "${command.defaultShortcut}".`,
          commandId: command.id,
          field: "defaultShortcut",
        });
      }
      shortcutSet.add(command.defaultShortcut);
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

export function validateFocusTargets(
  targets: readonly FocusTarget[],
  activeId?: string
): AccessibilityValidationResult {
  const issues: AccessibilityValidationIssue[] = [];
  const idSet = new Set<string>();

  for (const target of targets) {
    if (!target.id || target.id.trim() === "") {
      issues.push({
        code: "EMPTY_FOCUS_TARGET_ID",
        severity: "error",
        message: "Focus target has an empty or whitespace-only ID.",
        field: "id",
      });
    } else {
      if (idSet.has(target.id)) {
        issues.push({
          code: "DUPLICATE_FOCUS_TARGET_ID",
          severity: "error",
          message: `Duplicate focus target ID found: ${target.id}.`,
          targetId: target.id,
          field: "id",
        });
      }
      idSet.add(target.id);
    }
  }

  if (activeId !== undefined && activeId !== null) {
    if (!idSet.has(activeId)) {
      issues.push({
        code: "UNKNOWN_FOCUS_TARGET",
        severity: "error",
        message: `Active focus target ID "${activeId}" is not in the target list.`,
        targetId: activeId,
      });
    } else {
      const activeTarget = targets.find(t => t.id === activeId);
      if (activeTarget && activeTarget.disabled) {
        issues.push({
          code: "DISABLED_ACTIVE_TARGET",
          severity: "error",
          message: `Active focus target ID "${activeId}" is disabled.`,
          targetId: activeId,
        });
      }
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

export function validateAnnouncements(
  announcements: readonly AnnouncementDescriptor[]
): AccessibilityValidationResult {
  const issues: AccessibilityValidationIssue[] = [];
  const idSet = new Set<string>();

  for (const ann of announcements) {
    if (idSet.has(ann.id)) {
      issues.push({
        code: "DUPLICATE_COMMAND_ID",
        severity: "error",
        message: `Duplicate announcement ID found: ${ann.id}.`,
        commandId: ann.id,
      });
    }
    idSet.add(ann.id);

    if (!["off", "polite", "assertive"].includes(ann.politeness)) {
      issues.push({
        code: "INVALID_ANNOUNCEMENT_PRIORITY",
        severity: "error",
        message: `Announcement "${ann.id}" has invalid politeness level: ${ann.politeness}.`,
        commandId: ann.id,
      });
    }

    if (!ann.messageTemplate || ann.messageTemplate.trim() === "") {
      issues.push({
        code: "MISSING_ACCESSIBLE_DESCRIPTION",
        severity: "error",
        message: `Announcement "${ann.id}" is missing a message template.`,
        commandId: ann.id,
      });
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

export function requireValidAccessibilityConfiguration(
  result: AccessibilityValidationResult
): void {
  if (!result.isValid) {
    const messages = result.issues.map(i => i.message).join(" | ");
    throw new Error(`Accessibility validation failed: ${messages}`);
  }
}
