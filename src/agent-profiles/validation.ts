import {
  AgentProfile,
  VisualTheme,
  WorkspaceId,
  SpriteId,
  StableAgentId,
  ALLOWED_ACTIVITY_IDS,
  AgentProfileValidationIssue,
  AgentProfileValidationResult
} from './types';

export interface ValidationOptions {
  readonly profiles: readonly AgentProfile[];
  readonly themes: readonly VisualTheme[];
  readonly knownWorkspaceIds: readonly WorkspaceId[];
  readonly knownSpriteIds?: readonly SpriteId[];
  readonly requiredAgentIds?: readonly StableAgentId[];
}

export function validateAgentProfiles(options: ValidationOptions): AgentProfileValidationResult {
  const issues: AgentProfileValidationIssue[] = [];
  const { profiles, themes, knownWorkspaceIds, knownSpriteIds, requiredAgentIds } = options;

  const profileIds = new Set<string>();
  const stableAgentIds = new Set<string>();
  const themeIds = new Set(themes.map(t => t.id));

  // Validate themes
  const seenThemeIds = new Set<string>();
  for (const theme of themes) {
    if (seenThemeIds.has(theme.id)) {
      issues.push({
        code: 'DUPLICATE_THEME_ID',
        severity: 'error',
        message: `Duplicate theme ID found: ${theme.id}`,
        themeId: theme.id
      });
    }

    // Check required css tokens
    if (!theme.cssTokenRefs?.primary?.trim() || !theme.cssTokenRefs?.accent?.trim() || !theme.cssTokenRefs?.background?.trim()) {
      issues.push({
        code: 'MISSING_REQUIRED_TEXT',
        severity: 'error',
        message: `Missing required CSS tokens in theme ${theme.id}`,
        themeId: theme.id,
        field: 'cssTokenRefs'
      });
    }

    if (!theme.badgeStyle?.trim()) {
       issues.push({
        code: 'MISSING_REQUIRED_TEXT',
        severity: 'error',
        message: `Missing badge style in theme ${theme.id}`,
        themeId: theme.id,
        field: 'badgeStyle'
      });
    }

    if (!theme.avatarFrameStyle?.trim()) {
       issues.push({
        code: 'MISSING_REQUIRED_TEXT',
        severity: 'error',
        message: `Missing avatar frame style in theme ${theme.id}`,
        themeId: theme.id,
        field: 'avatarFrameStyle'
      });
    }

    if (!theme.workspaceAccentRef?.trim()) {
       issues.push({
        code: 'MISSING_REQUIRED_TEXT',
        severity: 'error',
        message: `Missing workspace accent in theme ${theme.id}`,
        themeId: theme.id,
        field: 'workspaceAccentRef'
      });
    }

    if (!theme.indicatorIcon?.trim()) {
       issues.push({
        code: 'MISSING_ICON_ID',
        severity: 'error',
        message: `Missing indicator icon in theme ${theme.id}`,
        themeId: theme.id,
        field: 'indicatorIcon'
      });
    }

    if (!theme.accessibleThemeLabel?.trim()) {
      issues.push({
        code: 'MISSING_ACCESSIBLE_THEME_LABEL',
        severity: 'error',
        message: `Missing accessible theme label in theme ${theme.id}`,
        themeId: theme.id,
        field: 'accessibleThemeLabel'
      });
    }
    seenThemeIds.add(theme.id);
  }

  for (const profile of profiles) {
    // Check duplicates
    if (profileIds.has(profile.profileId)) {
      issues.push({
        code: 'DUPLICATE_PROFILE_ID',
        severity: 'error',
        message: `Duplicate profile ID found: ${profile.profileId}`,
        profileId: profile.profileId
      });
    }
    profileIds.add(profile.profileId);

    if (stableAgentIds.has(profile.stableAgentId)) {
      issues.push({
        code: 'DUPLICATE_AGENT_ID',
        severity: 'error',
        message: `Duplicate stable agent ID found: ${profile.stableAgentId}`,
        profileId: profile.profileId,
        stableAgentId: profile.stableAgentId
      });
    }
    stableAgentIds.add(profile.stableAgentId);

    // Check required text fields
    if (!profile.profileId?.trim()) {
      issues.push({ code: 'MISSING_REQUIRED_TEXT', severity: 'error', message: `Missing profileId`, field: 'profileId' });
    }
    if (!profile.stableAgentId?.trim()) {
      issues.push({ code: 'MISSING_REQUIRED_TEXT', severity: 'error', message: `Missing stableAgentId`, profileId: profile.profileId, field: 'stableAgentId' });
    }
    if (!profile.displayName?.trim()) {
      issues.push({ code: 'MISSING_REQUIRED_TEXT', severity: 'error', message: `Missing display name`, profileId: profile.profileId, stableAgentId: profile.stableAgentId, field: 'displayName' });
    }
    if (!profile.roleTitle?.trim()) {
      issues.push({ code: 'MISSING_REQUIRED_TEXT', severity: 'error', message: `Missing role title`, profileId: profile.profileId, stableAgentId: profile.stableAgentId, field: 'roleTitle' });
    }
    if (!profile.shortDescription?.trim()) {
      issues.push({ code: 'MISSING_REQUIRED_TEXT', severity: 'error', message: `Missing short description`, profileId: profile.profileId, stableAgentId: profile.stableAgentId, field: 'shortDescription' });
    }
    if (!profile.detailedResponsibilities?.trim()) {
      issues.push({ code: 'MISSING_REQUIRED_TEXT', severity: 'error', message: `Missing detailed responsibilities`, profileId: profile.profileId, stableAgentId: profile.stableAgentId, field: 'detailedResponsibilities' });
    }
    if (!profile.defaultGreeting?.trim()) {
      issues.push({ code: 'MISSING_REQUIRED_TEXT', severity: 'error', message: `Missing default greeting`, profileId: profile.profileId, stableAgentId: profile.stableAgentId, field: 'defaultGreeting' });
    }

    if (!profile.accessibleDescription?.trim()) {
      issues.push({
        code: 'MISSING_ACCESSIBLE_DESCRIPTION',
        severity: 'error',
        message: `Missing accessible description`,
        profileId: profile.profileId,
        stableAgentId: profile.stableAgentId,
        field: 'accessibleDescription'
      });
    }

    if (!profile.iconId?.trim()) {
      issues.push({
        code: 'MISSING_ICON_ID',
        severity: 'error',
        message: `Missing icon reference`,
        profileId: profile.profileId,
        stableAgentId: profile.stableAgentId,
        field: 'iconId'
      });
    }

    if (profile.visualState !== 'placeholder' && profile.visualState !== 'production-ready') {
      issues.push({
        code: 'INVALID_VISUAL_STATE',
        severity: 'error',
        message: `Invalid visual-state value`,
        profileId: profile.profileId,
        stableAgentId: profile.stableAgentId,
        field: 'visualState'
      });
    }

    // Check references
    if (!themeIds.has(profile.themeId)) {
      issues.push({
        code: 'UNKNOWN_THEME_ID',
        severity: 'error',
        message: `Unknown theme reference: ${profile.themeId}`,
        profileId: profile.profileId,
        stableAgentId: profile.stableAgentId,
        themeId: profile.themeId,
        field: 'themeId'
      });
    }

    if (!knownWorkspaceIds.includes(profile.workspaceId)) {
      issues.push({
        code: 'UNKNOWN_WORKSPACE_ID',
        severity: 'error',
        message: `Unknown workspace reference: ${profile.workspaceId}`,
        profileId: profile.profileId,
        stableAgentId: profile.stableAgentId,
        field: 'workspaceId'
      });
    }

    if (knownSpriteIds && !knownSpriteIds.includes(profile.spriteId)) {
      issues.push({
        code: 'UNKNOWN_SPRITE_ID',
        severity: 'error',
        message: `Unknown sprite reference: ${profile.spriteId}`,
        profileId: profile.profileId,
        stableAgentId: profile.stableAgentId,
        field: 'spriteId'
      });
    }

    if (!profile.spriteId?.trim()) {
      issues.push({
        code: 'MISSING_REQUIRED_TEXT',
        severity: 'error',
        message: `Missing sprite reference`,
        profileId: profile.profileId,
        stableAgentId: profile.stableAgentId,
        field: 'spriteId'
      });
    }

    // Check activity labels
    if (!profile.supportedActivities || profile.supportedActivities.length === 0) {
      issues.push({
        code: 'MISSING_REQUIRED_TEXT',
        severity: 'error',
        message: `No supported activities defined`,
        profileId: profile.profileId,
        stableAgentId: profile.stableAgentId,
        field: 'supportedActivities'
      });
    } else {
      const activityIds = new Set<string>();
      for (const activity of profile.supportedActivities) {
        if (!activity.id?.trim()) {
          issues.push({
            code: 'INVALID_ACTIVITY_ID_FORMAT',
            severity: 'error',
            message: `Empty activity ID found`,
            profileId: profile.profileId,
            stableAgentId: profile.stableAgentId
          });
        }
        if (activityIds.has(activity.id)) {
          issues.push({
            code: 'DUPLICATE_ACTIVITY_ID',
            severity: 'error',
            message: `Duplicate activity ID found: ${activity.id}`,
            profileId: profile.profileId,
            stableAgentId: profile.stableAgentId
          });
        }
        activityIds.add(activity.id);

        if (activity.id.includes(' ') || activity.id !== activity.id.toLowerCase() || /[^a-z0-9_-]/.test(activity.id)) {
           issues.push({
            code: 'INVALID_ACTIVITY_ID_FORMAT',
            severity: 'error',
            message: `Unsupported activity-label format: ${activity.id}`,
            profileId: profile.profileId,
            stableAgentId: profile.stableAgentId
           });
        }

        if (!ALLOWED_ACTIVITY_IDS.includes(activity.id as (typeof ALLOWED_ACTIVITY_IDS)[number])) {
          issues.push({
            code: 'UNKNOWN_ACTIVITY_ID',
            severity: 'error',
            message: `Unknown activity ID found: ${activity.id}`,
            profileId: profile.profileId,
            stableAgentId: profile.stableAgentId
          });
        }

        if (!activity.label?.trim()) {
           issues.push({
            code: 'INVALID_ACTIVITY_LABEL',
            severity: 'error',
            message: `Empty or whitespace-only activity label found for ID ${activity.id}`,
            profileId: profile.profileId,
            stableAgentId: profile.stableAgentId
           });
        } else if (activity.label.length > 50) {
           issues.push({
            code: 'INVALID_ACTIVITY_LABEL',
            severity: 'error',
            message: `Excessively long activity label found for ID ${activity.id}`,
            profileId: profile.profileId,
            stableAgentId: profile.stableAgentId
           });
        }

        // Extremely basic heuristic to detect runtime state embedded in labels
        if (/%|\d\d:\d\d/.test(activity.label)) {
           issues.push({
            code: 'INVALID_ACTIVITY_LABEL',
            severity: 'error',
            message: `Activity label appears to contain runtime state: "${activity.label}"`,
            profileId: profile.profileId,
            stableAgentId: profile.stableAgentId
           });
        }
      }
    }
  }

  if (requiredAgentIds) {
    for (const requiredId of requiredAgentIds) {
      if (!stableAgentIds.has(requiredId)) {
        issues.push({
          code: 'MISSING_PERMANENT_AGENT',
          severity: 'error',
          message: `Expected permanent agent missing: ${requiredId}`,
          stableAgentId: requiredId
        });
      }
    }
  }

  return {
    isValid: issues.length === 0,
    issues
  };
}
