export type AgentProfileId = string;
export type StableAgentId = string;
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
