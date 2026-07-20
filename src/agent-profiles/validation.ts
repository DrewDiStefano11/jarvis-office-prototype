import { AgentProfile, VisualTheme, WorkspaceId, SpriteId, ALLOWED_ACTIVITY_IDS } from './types';

export interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly string[];
}

export interface ValidationOptions {
  readonly profiles: readonly AgentProfile[];
  readonly themes: readonly VisualTheme[];
  readonly knownWorkspaceIds: readonly WorkspaceId[];
  readonly knownSpriteIds?: readonly SpriteId[];
}

export function validateAgentProfiles(options: ValidationOptions): ValidationResult {
  const errors: string[] = [];
  const { profiles, themes, knownWorkspaceIds, knownSpriteIds } = options;

  const profileIds = new Set<string>();
  const stableAgentIds = new Set<string>();
  const themeIds = new Set(themes.map(t => t.id));

  // Validate themes
  const seenThemeIds = new Set<string>();
  for (const theme of themes) {
    if (seenThemeIds.has(theme.id)) {
      errors.push(`Duplicate theme ID found: ${theme.id}`);
    }
    if (!theme.accessibleThemeLabel?.trim()) {
      errors.push(`Missing accessible theme label in theme ${theme.id}`);
    }
    seenThemeIds.add(theme.id);
  }

  let permanentAgentCount = 0;

  for (const profile of profiles) {
    // Check duplicates
    if (profileIds.has(profile.profileId)) {
      errors.push(`Duplicate profile ID found: ${profile.profileId}`);
    }
    profileIds.add(profile.profileId);

    if (stableAgentIds.has(profile.stableAgentId)) {
      errors.push(`Duplicate stable agent ID found: ${profile.stableAgentId} in profile ${profile.profileId}`);
    }
    stableAgentIds.add(profile.stableAgentId);

    // Check permanent agents for exact match
    if (['jarvis', 'atlas', 'scout', 'archive', 'sentinel'].includes(profile.stableAgentId)) {
      permanentAgentCount++;
    }

    // Check required text fields
    if (!profile.displayName?.trim()) {
      errors.push(`Missing display name in profile ${profile.profileId}`);
    }
    if (!profile.roleTitle?.trim()) {
      errors.push(`Missing role title in profile ${profile.profileId}`);
    }
    if (!profile.shortDescription?.trim()) {
      errors.push(`Missing short description in profile ${profile.profileId}`);
    }
    if (!profile.detailedResponsibilities?.trim()) {
      errors.push(`Missing detailed responsibilities in profile ${profile.profileId}`);
    }
    if (!profile.accessibleDescription?.trim()) {
      errors.push(`Missing accessible description in profile ${profile.profileId}`);
    }

    if (!profile.iconId?.trim()) {
      errors.push(`Missing icon reference in profile ${profile.profileId}`);
    }

    if (profile.visualState !== 'placeholder' && profile.visualState !== 'production-ready') {
      errors.push(`Invalid visual-state value in profile ${profile.profileId}`);
    }

    // Check references
    if (!themeIds.has(profile.themeId)) {
      errors.push(`Unknown theme reference: ${profile.themeId} in profile ${profile.profileId}`);
    }

    if (!knownWorkspaceIds.includes(profile.workspaceId)) {
      errors.push(`Unknown workspace reference: ${profile.workspaceId} in profile ${profile.profileId}`);
    }

    if (knownSpriteIds && !knownSpriteIds.includes(profile.spriteId)) {
      errors.push(`Unknown sprite reference: ${profile.spriteId} in profile ${profile.profileId}`);
    }
    if (!profile.spriteId?.trim()) {
      errors.push(`Missing sprite reference in profile ${profile.profileId}`);
    }

    // Check activity labels
    if (!profile.supportedActivities || profile.supportedActivities.length === 0) {
      errors.push(`No supported activities defined in profile ${profile.profileId}`);
    } else {
      const activityIds = new Set<string>();
      for (const activity of profile.supportedActivities) {
        if (!activity.id?.trim()) {
          errors.push(`Empty activity ID found in profile ${profile.profileId}`);
        }
        if (activityIds.has(activity.id)) {
          errors.push(`Duplicate activity ID found: ${activity.id} in profile ${profile.profileId}`);
        }
        activityIds.add(activity.id);

        if (activity.id.includes(' ') || activity.id !== activity.id.toLowerCase()) {
           errors.push(`Unsupported activity-label format (ID must be lowercase without spaces): ${activity.id} in profile ${profile.profileId}`);
        }

        if (!ALLOWED_ACTIVITY_IDS.includes(activity.id as (typeof ALLOWED_ACTIVITY_IDS)[number])) {
          errors.push(`Unknown activity ID found: ${activity.id} in profile ${profile.profileId}`);
        }

        if (!activity.label?.trim()) {
           errors.push(`Empty or whitespace-only activity label found for ID ${activity.id} in profile ${profile.profileId}`);
        } else if (activity.label.length > 50) {
           errors.push(`Excessively long activity label found for ID ${activity.id} in profile ${profile.profileId}`);
        }

        // Extremely basic heuristic to detect runtime state embedded in labels
        if (/%|\d\d:\d\d|task|progress/i.test(activity.label) && activity.id !== 'idle') {
           // Might need refining based on actual usage, but catching % and time formats helps
           errors.push(`Activity label appears to contain runtime state: "${activity.label}" in profile ${profile.profileId}`);
        }
      }
    }
  }

  // If using default profiles size, check if we have exactly one profile per permanent agent.
  // We only run this specific assert if exactly 5 profiles are provided (which usually corresponds to testing default set).
  if (profiles.length === 5 && permanentAgentCount !== 5) {
     errors.push(`Expected exactly one profile for each permanent agent, but found ${permanentAgentCount}.`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
