export interface FocusTarget {
  readonly id: string;
  readonly disabled?: boolean;
}

export type FocusDirection = "next" | "previous" | "first" | "last";

export type FocusResolution =
  | {
      readonly ok: true;
      readonly targetId: string;
    }
  | {
      readonly ok: false;
      readonly code:
        | "CURRENT_TARGET_UNKNOWN"
        | "NO_ENABLED_TARGETS"
        | "EMPTY_TARGET_ID";
      readonly message: string;
    };

export type AccessibilityValidationSeverity = "error" | "warning";

export type AccessibilityValidationCode =
  | "MISSING_COMMAND_ID"
  | "DUPLICATE_COMMAND_ID"
  | "MISSING_READABLE_LABEL"
  | "MISSING_ACCESSIBLE_DESCRIPTION"
  | "UNKNOWN_FOCUS_TARGET"
  | "DUPLICATE_FOCUS_TARGET_ID"
  | "EMPTY_FOCUS_TARGET_ID"
  | "INVALID_SHORTCUT"
  | "SHORTCUT_CONFLICT"
  | "DISABLED_ACTIVE_TARGET"
  | "MISSING_NON_VISUAL_ALTERNATIVE"
  | "MISSING_NON_MOTION_ALTERNATIVE"
  | "INVALID_ANNOUNCEMENT_PRIORITY";

export interface AccessibilityValidationIssue {
  readonly code: AccessibilityValidationCode;
  readonly severity: AccessibilityValidationSeverity;
  readonly message: string;
  readonly commandId?: string;
  readonly targetId?: string;
  readonly field?: string;
}

export interface AccessibilityValidationResult {
  readonly isValid: boolean;
  readonly issues: readonly AccessibilityValidationIssue[];
}

export interface ReducedMotionPolicy {
  readonly enabled: boolean;
  readonly disableDecorativeMovement: boolean;
  readonly replaceContinuousMovement: boolean;
  readonly simplifyTransitions: boolean;
  readonly disableParallax: boolean;
  readonly disableFlashing: boolean;
  readonly preserveEssentialProgressFeedback: boolean;
  readonly maximumTransitionDurationMs: number;
}

export type MotionPurpose =
  | "decorative"
  | "navigation"
  | "status-change"
  | "progress"
  | "attention"
  | "error"
  | "spatial-orientation";

export interface MotionRequest {
  readonly id: string;
  readonly purpose: MotionPurpose;
  readonly durationMs: number;
  readonly continuous: boolean;
  readonly flashing: boolean;
  readonly parallax: boolean;
  readonly essential: boolean;
  readonly fallbackPresentation:
    | "instant"
    | "fade"
    | "static-indicator"
    | "text-update"
    | "none";
}

export interface ResolvedMotionPresentation {
  readonly motionAllowed: boolean;
  readonly durationMs: number;
  readonly continuous: boolean;
  readonly flashing: boolean;
  readonly parallax: boolean;
  readonly fallbackPresentation:
    | "instant"
    | "fade"
    | "static-indicator"
    | "text-update"
    | "none";
  readonly reason:
    | "FULL_MOTION_ALLOWED"
    | "DECORATIVE_MOTION_DISABLED"
    | "CONTINUOUS_MOTION_REPLACED"
    | "FLASHING_DISABLED"
    | "PARALLAX_DISABLED"
    | "TRANSITION_SIMPLIFIED"
    | "ESSENTIAL_FEEDBACK_PRESERVED";
}

export interface AccessibilityPreferences {
  readonly reducedMotion: boolean;
  readonly highContrast: boolean;
  readonly largeText: boolean;
  readonly keyboardNavigation: boolean;
  readonly screenReaderAnnouncementLevel: "off" | "polite" | "assertive";
  readonly soundAlternatives: boolean;
  readonly disableAnimations: boolean;
  readonly disableFlashingEffects: boolean;
  readonly extendedNotificationDuration: boolean;
  readonly simplifiedVisualMode: boolean;
}

export interface KeyboardCommand {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  readonly defaultShortcut?: string;
  readonly essential: boolean;
}

export type AnnouncementPoliteness = "off" | "polite" | "assertive";

export interface AnnouncementDescriptor {
  readonly id: string;
  readonly politeness: AnnouncementPoliteness;
  readonly deduplicationKey: string;
  readonly messageTemplate: string;
  readonly requiredParameters: readonly string[];
}
