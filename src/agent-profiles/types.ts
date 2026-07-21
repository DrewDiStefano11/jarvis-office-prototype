export type AgentProfileId = string;

export const PERMANENT_AGENT_IDS = [
  "jarvis",
  "atlas",
  "scout",
  "archive",
  "sentinel",
] as const;

export type StableAgentId = (typeof PERMANENT_AGENT_IDS)[number];

export type ThemeId = string;
export type WorkspaceId = string;
export type SpriteId = string;
export type IconId = string;

export const ALLOWED_ACTIVITY_IDS = [
  "monitoring",
  "researching",
  "planning",
  "organizing",
  "reviewing",
  "communicating",
  "idle"
] as const;

export type AgentActivityId = typeof ALLOWED_ACTIVITY_IDS[number];

export type AgentProfileValidationCode =
  | "DUPLICATE_PROFILE_ID"
  | "DUPLICATE_AGENT_ID"
  | "DUPLICATE_THEME_ID"
  | "MISSING_REQUIRED_TEXT"
  | "MISSING_ACCESSIBLE_DESCRIPTION"
  | "MISSING_ACCESSIBLE_THEME_LABEL"
  | "MISSING_ICON_ID"
  | "UNKNOWN_THEME_ID"
  | "UNKNOWN_WORKSPACE_ID"
  | "UNKNOWN_SPRITE_ID"
  | "UNKNOWN_ACTIVITY_ID"
  | "DUPLICATE_ACTIVITY_ID"
  | "INVALID_ACTIVITY_ID_FORMAT"
  | "INVALID_ACTIVITY_LABEL"
  | "INVALID_VISUAL_STATE"
  | "MISSING_PERMANENT_AGENT"
  | "UNEXPECTED_PERMANENT_AGENT";

export interface AgentProfileValidationIssue {
  readonly code: AgentProfileValidationCode;
  readonly severity: "error" | "warning";
  readonly message: string;
  readonly profileId?: string;
  readonly stableAgentId?: string;
  readonly themeId?: string;
  readonly field?: string;
}

export interface AgentProfileValidationResult {
  readonly isValid: boolean;
  readonly issues: readonly AgentProfileValidationIssue[];
}

export interface AgentActivityLabel {
  readonly id: AgentActivityId;
  readonly label: string;
}

export interface VisualTheme {
  readonly id: ThemeId;
  readonly cssTokenRefs: {
    readonly primary: string;
    readonly accent: string;
    readonly background: string;
  };
  readonly badgeStyle: string;
  readonly avatarFrameStyle: string;
  readonly workspaceAccentRef: string;
  readonly indicatorIcon: IconId;
  readonly accessibleThemeLabel: string;
}

export interface AgentProfile {
  readonly profileId: AgentProfileId;
  readonly stableAgentId: StableAgentId;
  readonly displayName: string;
  readonly roleTitle: string;
  readonly shortDescription: string;
  readonly detailedResponsibilities: string;
  readonly spriteId: SpriteId;
  readonly workspaceId: WorkspaceId;
  readonly themeId: ThemeId;
  readonly iconId: IconId;
  readonly accessibleDescription: string;
  readonly supportedActivities: readonly AgentActivityLabel[];
  readonly statusLabelOverrides?: Record<string, string>;
  readonly defaultGreeting: string;
  readonly visualState: "placeholder" | "production-ready";
}
