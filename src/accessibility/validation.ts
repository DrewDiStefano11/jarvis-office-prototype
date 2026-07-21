import type {
  AccessibilityValidationResult,
  AccessibilityValidationIssue,
  KeyboardCommand,
  FocusTarget,
  AnnouncementDescriptor,
} from "./types";
import { normalizeShortcut } from "./shortcut";

import type { MotionRequest } from "./types";

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

    if (command.essential && !command.label?.trim() && !command.description?.trim()) {
      issues.push({
        code: "MISSING_NON_VISUAL_ALTERNATIVE",
        severity: "error",
        message: `Essential command "${command.id}" is missing a readable non-visual alternative (label or description).`,
        commandId: command.id,
      });
    }

    if (command.defaultShortcut) {
      const normRes = normalizeShortcut(command.defaultShortcut);
      if (!normRes.isValid || !normRes.normalized) {
         issues.push({
          code: "INVALID_SHORTCUT",
          severity: "error",
          message: `Invalid shortcut "${command.defaultShortcut}": ${normRes.error}`,
          commandId: command.id,
          field: "defaultShortcut",
        });
      } else {
        if (shortcutSet.has(normRes.normalized)) {
          issues.push({
            code: "SHORTCUT_CONFLICT",
            severity: "error",
            message: `Shortcut conflict detected for normalized shortcut "${normRes.normalized}" (original: "${command.defaultShortcut}").`,
            commandId: command.id,
            field: "defaultShortcut",
          });
        }
        shortcutSet.add(normRes.normalized);
      }
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
    if (!ann.id || ann.id.trim() === "") {
      issues.push({
        code: "MISSING_ANNOUNCEMENT_ID",
        severity: "error",
        message: "Announcement is missing a valid ID.",
      });
    } else {
      if (idSet.has(ann.id)) {
        issues.push({
          code: "DUPLICATE_ANNOUNCEMENT_ID",
          severity: "error",
          message: `Duplicate announcement ID found: ${ann.id}.`,
          announcementId: ann.id,
        });
      }
      idSet.add(ann.id);
    }

    if (!["off", "polite", "assertive"].includes(ann.politeness)) {
      issues.push({
        code: "INVALID_ANNOUNCEMENT_PRIORITY",
        severity: "error",
        message: `Announcement "${ann.id}" has invalid politeness level: ${ann.politeness}.`,
        announcementId: ann.id,
      });
    }

    if (!ann.deduplicationKey || ann.deduplicationKey.trim() === "") {
      issues.push({
        code: "MISSING_DEDUPLICATION_KEY",
        severity: "error",
        message: `Announcement "${ann.id}" is missing a deduplication key.`,
        announcementId: ann.id,
      });
    }

    if (!ann.messageTemplate || ann.messageTemplate.trim() === "") {
      issues.push({
        code: "MISSING_ACCESSIBLE_DESCRIPTION",
        severity: "error",
        message: `Announcement "${ann.id}" is missing a message template.`,
        announcementId: ann.id,
      });
    }

    // Validate template parameters
    const templateParams = new Set<string>();
    let malformed = false;
    const regex = /\{([^}]*)\}/g;
    const placeholderNameGrammar = /^[a-z][a-zA-Z0-9]*$/;

    // Extract placeholders from both messageTemplate and deduplicationKey
    const extractPlaceholders = (template: string) => {
      let match;
      while ((match = regex.exec(template)) !== null) {
        const paramName = match[1];
        if (paramName === "") {
          malformed = true; // empty placeholder {}
        } else if (!placeholderNameGrammar.test(paramName)) {
           issues.push({
            code: "INVALID_TEMPLATE_PARAMETER",
            severity: "error",
            message: `Announcement "${ann.id}" uses invalid placeholder format {${paramName}}.`,
            announcementId: ann.id,
          });
        } else {
          templateParams.add(paramName);
        }
      }
    };

    if (ann.messageTemplate) extractPlaceholders(ann.messageTemplate);
    if (ann.deduplicationKey) extractPlaceholders(ann.deduplicationKey);

    const openBraces = (ann.messageTemplate?.match(/\{/g) || []).length;
    const closeBraces = (ann.messageTemplate?.match(/\}/g) || []).length;
    if (openBraces !== closeBraces) {
      malformed = true;
    }

    const dedupOpen = (ann.deduplicationKey?.match(/\{/g) || []).length;
    const dedupClose = (ann.deduplicationKey?.match(/\}/g) || []).length;
    if (dedupOpen !== dedupClose) {
      malformed = true;
    }

    if (malformed) {
       issues.push({
          code: "MALFORMED_TEMPLATE",
          severity: "error",
          message: `Announcement "${ann.id}" has malformed template braces.`,
          announcementId: ann.id,
       });
    }

    const reqSet = new Set<string>();
    for (const req of ann.requiredParameters) {
      if (!req || req.trim() === "") {
        issues.push({
           code: "MISSING_TEMPLATE_PARAMETER",
           severity: "error",
           message: `Announcement "${ann.id}" has an empty required parameter name.`,
           announcementId: ann.id,
        });
      } else if (reqSet.has(req)) {
        issues.push({
          code: "DUPLICATE_REQUIRED_PARAMETER",
          severity: "error",
          message: `Announcement "${ann.id}" has duplicate required parameter: ${req}.`,
          announcementId: ann.id,
        });
      }
      reqSet.add(req);
    }

    for (const tParam of templateParams) {
      if (!reqSet.has(tParam)) {
         issues.push({
          code: "UNKNOWN_TEMPLATE_PARAMETER",
          severity: "error",
          message: `Announcement "${ann.id}" uses unknown placeholder {${tParam}} in its templates.`,
          announcementId: ann.id,
        });
      }
    }

    for (const rParam of reqSet) {
      if (!templateParams.has(rParam)) {
        issues.push({
          code: "MISSING_TEMPLATE_PARAMETER",
          severity: "error",
          message: `Announcement "${ann.id}" declares required parameter "${rParam}" but does not use it in either template.`,
          announcementId: ann.id,
        });
      }
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

export function validateMotionRequests(
  requests: readonly MotionRequest[]
): AccessibilityValidationResult {
  const issues: AccessibilityValidationIssue[] = [];

  for (const req of requests) {
    if (req.purpose === "decorative" && req.essential) {
      issues.push({
        code: "CONTRADICTORY_MOTION_PURPOSE",
        severity: "error",
        message: `Motion request "${req.id}" is marked as both decorative and essential.`,
      });
    }

    if (req.essential && (!req.fallbackPresentation || req.fallbackPresentation === "none")) {
      issues.push({
        code: "MISSING_NON_MOTION_ALTERNATIVE",
        severity: "error",
        message: `Essential motion request "${req.id}" is missing a safe non-motion fallback presentation.`,
        field: "fallbackPresentation",
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
