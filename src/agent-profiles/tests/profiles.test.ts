import { describe, it, expect } from 'vitest';
import { agentProfiles, agentThemes } from '../profiles';
import { validateAgentProfiles } from '../validation';
import { getAgentProfileByAgentId, requireAgentProfileByAgentId, createAgentProfileMap, createAgentProfileMapStrict } from '../adapters';

describe('Agent Profiles Foundation', () => {
  const knownWorkspaceIds = [
    'jarvis_desk', 'atlas_desk', 'scout_desk', 'archive_desk', 'sentinel_desk'
  ];

  const knownSpriteIds = [
    'sprite-agent-jarvis', 'sprite-agent-atlas', 'sprite-agent-scout', 'sprite-agent-archive', 'sprite-agent-sentinel'
  ];

  it('exactly one profile exists for each permanent agent', () => {
    expect(agentProfiles.length).toBe(5);
    const stableIds = agentProfiles.map(p => p.stableAgentId);
    expect(stableIds).toContain('jarvis');
    expect(stableIds).toContain('atlas');
    expect(stableIds).toContain('scout');
    expect(stableIds).toContain('archive');
    expect(stableIds).toContain('sentinel');
  });

  it('all canonical workspace and sprite IDs are used', () => {
    const usedWorkspaces = new Set(agentProfiles.map(p => p.workspaceId));
    knownWorkspaceIds.forEach(id => expect(usedWorkspaces.has(id)).toBe(true));

    const usedSprites = new Set(agentProfiles.map(p => p.spriteId));
    knownSpriteIds.forEach(id => expect(usedSprites.has(id)).toBe(true));
  });

  it('profile IDs are unique', () => {
    const ids = new Set(agentProfiles.map(p => p.profileId));
    expect(ids.size).toBe(agentProfiles.length);
  });

  it('agent IDs are unique', () => {
    const ids = new Set(agentProfiles.map(p => p.stableAgentId));
    expect(ids.size).toBe(agentProfiles.length);
  });

  it('every profile and theme has an accessible description', () => {
    agentProfiles.forEach(p => {
      expect(p.accessibleDescription).toBeDefined();
      expect(p.accessibleDescription.length).toBeGreaterThan(0);
    });

    agentThemes.forEach(t => {
      expect(t.accessibleThemeLabel).toBeDefined();
      expect(t.accessibleThemeLabel.length).toBeGreaterThan(0);
    });
  });

  it('validates default profiles successfully', () => {
    const result = validateAgentProfiles({
      profiles: agentProfiles,
      themes: agentThemes,
      knownWorkspaceIds,
      knownSpriteIds,
      requiredAgentIds: ['jarvis', 'atlas', 'scout', 'archive', 'sentinel']
    });
    expect(result.isValid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('partial profile collection does not trigger permanent-agent completeness', () => {
    const partialProfiles = [agentProfiles[0], agentProfiles[1]];
    const result = validateAgentProfiles({
      profiles: partialProfiles,
      themes: agentThemes,
      knownWorkspaceIds,
      knownSpriteIds
    });
    // It should be valid since we omit requiredAgentIds
    expect(result.isValid).toBe(true);
  });

  it('removing jarvis emits MISSING_PERMANENT_AGENT', () => {
    const partialProfiles = agentProfiles.filter(p => p.stableAgentId !== 'jarvis');
    const result = validateAgentProfiles({
      profiles: partialProfiles,
      themes: agentThemes,
      knownWorkspaceIds,
      knownSpriteIds,
      requiredAgentIds: ['jarvis', 'atlas', 'scout', 'archive', 'sentinel']
    });

    expect(result.isValid).toBe(false);
    expect(result.issues.some(i => i.code === 'MISSING_PERMANENT_AGENT' && i.stableAgentId === 'jarvis')).toBe(true);
  });

  it('adding an extra profile emits UNEXPECTED_PERMANENT_AGENT', () => {
    const unexpectedProfile = {
      ...agentProfiles[0],
      profileId: 'profile_temporary',
      stableAgentId: 'temporary-agent' as unknown as import('../types').StableAgentId
    };

    const result = validateAgentProfiles({
      profiles: [...agentProfiles, unexpectedProfile],
      themes: agentThemes,
      knownWorkspaceIds,
      knownSpriteIds,
      requiredAgentIds: ['jarvis', 'atlas', 'scout', 'archive', 'sentinel']
    });

    expect(result.isValid).toBe(false);
    expect(result.issues.some(i => i.code === 'UNEXPECTED_PERMANENT_AGENT' && i.stableAgentId === 'temporary-agent')).toBe(true);
  });

  it('two unexpected profiles produce two separate issues', () => {
    const unexpected1 = { ...agentProfiles[0], profileId: 'profile_temp1', stableAgentId: 'temp-1' as unknown as import('../types').StableAgentId };
    const unexpected2 = { ...agentProfiles[0], profileId: 'profile_temp2', stableAgentId: 'temp-2' as unknown as import('../types').StableAgentId };

    const result = validateAgentProfiles({
      profiles: [...agentProfiles, unexpected1, unexpected2],
      themes: agentThemes,
      knownWorkspaceIds,
      knownSpriteIds,
      requiredAgentIds: ['jarvis', 'atlas', 'scout', 'archive', 'sentinel']
    });

    expect(result.isValid).toBe(false);
    const unexpectedIssues = result.issues.filter(i => i.code === 'UNEXPECTED_PERMANENT_AGENT');
    expect(unexpectedIssues.length).toBe(2);
    expect(unexpectedIssues.some(i => i.stableAgentId === 'temp-1')).toBe(true);
    expect(unexpectedIssues.some(i => i.stableAgentId === 'temp-2')).toBe(true);
  });

  it('invalid references are rejected', () => {
    const invalidProfile = {
      ...agentProfiles[0],
      themeId: 'unknown_theme',
      workspaceId: 'unknown_workspace',
      spriteId: 'unknown_sprite'
    };

    const result = validateAgentProfiles({
      profiles: [invalidProfile],
      themes: agentThemes,
      knownWorkspaceIds,
      knownSpriteIds
    });

    expect(result.isValid).toBe(false);
    expect(result.issues.some(i => i.code === 'UNKNOWN_THEME_ID')).toBe(true);
    expect(result.issues.some(i => i.code === 'UNKNOWN_WORKSPACE_ID')).toBe(true);
    expect(result.issues.some(i => i.code === 'UNKNOWN_SPRITE_ID')).toBe(true);
  });

  it('duplicate profiles are rejected', () => {
    const duplicateProfile = { ...agentProfiles[0] };
    const result = validateAgentProfiles({
      profiles: [agentProfiles[0], duplicateProfile],
      themes: agentThemes,
      knownWorkspaceIds
    });

    expect(result.isValid).toBe(false);
    expect(result.issues.some(i => i.code === 'DUPLICATE_PROFILE_ID')).toBe(true);
    expect(result.issues.some(i => i.code === 'DUPLICATE_AGENT_ID')).toBe(true);
  });

  it('invalid visual states are rejected', () => {
    const invalidProfile = {
      ...agentProfiles[0],
      visualState: 'working' as 'placeholder'
    };
    const result = validateAgentProfiles({
      profiles: [invalidProfile],
      themes: agentThemes,
      knownWorkspaceIds
    });
    expect(result.isValid).toBe(false);
    expect(result.issues.some(i => i.code === 'INVALID_VISUAL_STATE')).toBe(true);
  });

  it('missing icons are rejected', () => {
    const invalidProfile = { ...agentProfiles[0], iconId: '' };
    const result = validateAgentProfiles({ profiles: [invalidProfile], themes: agentThemes, knownWorkspaceIds });
    expect(result.isValid).toBe(false);
    expect(result.issues.some(i => i.code === 'MISSING_ICON_ID')).toBe(true);
  });

  it('missing accessible theme label detected', () => {
    const invalidTheme = { ...agentThemes[0], accessibleThemeLabel: '' };
    const result = validateAgentProfiles({ profiles: agentProfiles, themes: [invalidTheme], knownWorkspaceIds });
    expect(result.isValid).toBe(false);
    expect(result.issues.some(i => i.code === 'MISSING_ACCESSIBLE_THEME_LABEL')).toBe(true);
  });

  it('repeated loading returns deeply equal validation results', () => {
    const result1 = validateAgentProfiles({ profiles: agentProfiles, themes: agentThemes, knownWorkspaceIds });
    const result2 = validateAgentProfiles({ profiles: agentProfiles, themes: agentThemes, knownWorkspaceIds });
    expect(result1).toEqual(result2);
  });

  it('helpers do not mutate their inputs (deep freeze)', () => {
    function deepFreeze<T>(obj: T): T {
      if (obj && typeof obj === 'object') {
        Object.freeze(obj);
        Object.values(obj).forEach(prop => deepFreeze(prop));
      }
      return obj;
    }

    const profilesCopy = JSON.parse(JSON.stringify(agentProfiles));
    const themesCopy = JSON.parse(JSON.stringify(agentThemes));
    const workspacesCopy = [...knownWorkspaceIds];
    const spritesCopy = [...knownSpriteIds];

    // Test that our deep freeze is actually effective without validate mutating
    const options = deepFreeze({
      profiles: agentProfiles,
      themes: agentThemes,
      knownWorkspaceIds,
      knownSpriteIds,
      requiredAgentIds: ['jarvis', 'atlas', 'scout', 'archive', 'sentinel'] as const
    });

    // Should not throw
    const result1 = validateAgentProfiles(options);
    expect(result1.isValid).toBe(true);

    // Deep structural check against original stringified versions
    expect(JSON.parse(JSON.stringify(agentProfiles))).toEqual(profilesCopy);
    expect(JSON.parse(JSON.stringify(agentThemes))).toEqual(themesCopy);
    expect(knownWorkspaceIds).toEqual(workspacesCopy);
    expect(knownSpriteIds).toEqual(spritesCopy);
  });

  describe('Theme validation', () => {
    it('empty theme ID produces MISSING_THEME_ID', () => {
      const invalidTheme = { ...agentThemes[0], id: '' };
      const result = validateAgentProfiles({
        profiles: agentProfiles,
        themes: [invalidTheme, ...agentThemes.slice(1)],
        knownWorkspaceIds
      });
      expect(result.isValid).toBe(false);
      const missingIssues = result.issues.filter(i => i.code === 'MISSING_THEME_ID');
      expect(missingIssues.length).toBeGreaterThan(0);
      expect(missingIssues[0].field).toBe('id');
    });

    it('whitespace-only theme ID produces MISSING_THEME_ID', () => {
      const invalidTheme = { ...agentThemes[0], id: '   ' };
      const result = validateAgentProfiles({
        profiles: agentProfiles,
        themes: [invalidTheme, ...agentThemes.slice(1)],
        knownWorkspaceIds
      });
      expect(result.isValid).toBe(false);
      expect(result.issues.some(i => i.code === 'MISSING_THEME_ID')).toBe(true);
    });

    it('invalid blank theme cannot satisfy a profile reference', () => {
      const blankThemeId = '';
      const invalidTheme = { ...agentThemes[0], id: blankThemeId };
      const invalidProfile = { ...agentProfiles[0], themeId: blankThemeId };

      const result = validateAgentProfiles({
        profiles: [invalidProfile, ...agentProfiles.slice(1)],
        themes: [invalidTheme, ...agentThemes.slice(1)],
        knownWorkspaceIds
      });
      expect(result.isValid).toBe(false);
      expect(result.issues.some(i => i.code === 'MISSING_THEME_ID')).toBe(true);
      expect(result.issues.some(i => i.code === 'UNKNOWN_THEME_ID' && i.profileId === invalidProfile.profileId)).toBe(true);
    });

    it('duplicate valid theme ID produces DUPLICATE_THEME_ID without MISSING_THEME_ID', () => {
      const duplicateTheme = { ...agentThemes[0] }; // already has a valid ID
      const result = validateAgentProfiles({
        profiles: agentProfiles,
        themes: [agentThemes[0], duplicateTheme, ...agentThemes.slice(1)],
        knownWorkspaceIds
      });
      expect(result.isValid).toBe(false);
      expect(result.issues.some(i => i.code === 'DUPLICATE_THEME_ID')).toBe(true);
      expect(result.issues.some(i => i.code === 'MISSING_THEME_ID')).toBe(false);
    });
  });

  it('runtime state is not embedded in profile fixtures', () => {
    agentProfiles.forEach(p => {
      const keys = Object.keys(p);
      expect(keys).not.toContain('currentStatus');
      expect(keys).not.toContain('progress');
      expect(keys).not.toContain('currentTaskId');
      expect(keys).not.toContain('queueCount');
      expect(keys).not.toContain('isTemporary');

      p.supportedActivities.forEach(a => {
        expect(a.label).not.toMatch(/\d+%/);
        if (a.id !== 'idle') {
           expect(a.label.toLowerCase()).not.toContain('task');
        }
      });
    });
  });

  describe('Activity validation', () => {
    it('rejects unknown activity IDs at runtime', () => {
      const invalidProfile = {
        ...agentProfiles[0],
        supportedActivities: [
          { id: 'jumping' as unknown as import('./../types').AgentActivityId, label: 'Jumping around' }
        ]
      };

      const result = validateAgentProfiles({
        profiles: [invalidProfile],
        themes: agentThemes,
        knownWorkspaceIds
      });

      expect(result.isValid).toBe(false);
      expect(result.issues.some(i => i.code === 'UNKNOWN_ACTIVITY_ID')).toBe(true);
    });

    it('rejects duplicate activity IDs', () => {
      const invalidProfile = {
        ...agentProfiles[0],
        supportedActivities: [
          { id: 'idle' as const, label: 'Idle' },
          { id: 'idle' as const, label: 'Still idle' }
        ]
      };
      const result = validateAgentProfiles({ profiles: [invalidProfile], themes: agentThemes, knownWorkspaceIds });
      expect(result.isValid).toBe(false);
      expect(result.issues.some(i => i.code === 'DUPLICATE_ACTIVITY_ID')).toBe(true);
    });

    it('rejects invalid activity labels', () => {
      const invalidProfile = {
        ...agentProfiles[0],
        supportedActivities: [
          { id: 'idle' as const, label: '   ' }
        ]
      };
      const result = validateAgentProfiles({ profiles: [invalidProfile], themes: agentThemes, knownWorkspaceIds });
      expect(result.isValid).toBe(false);
      expect(result.issues.some(i => i.code === 'INVALID_ACTIVITY_LABEL')).toBe(true);
    });

    it('rejects invalid activity format (uppercase)', () => {
      const invalidProfile = {
        ...agentProfiles[0],
        supportedActivities: [
          { id: 'IDLE' as unknown as import('./../types').AgentActivityId, label: 'Idle' }
        ]
      };
      const result = validateAgentProfiles({ profiles: [invalidProfile], themes: agentThemes, knownWorkspaceIds });
      expect(result.isValid).toBe(false);
      expect(result.issues.some(i => i.code === 'INVALID_ACTIVITY_ID_FORMAT')).toBe(true);
    });
  });

  describe('Adapters', () => {
    it('getAgentProfileByAgentId returns correct profile or undefined', () => {
      const jarvisProfile = getAgentProfileByAgentId(agentProfiles, 'jarvis');
      expect(jarvisProfile).toBeDefined();
      expect(jarvisProfile?.stableAgentId).toBe('jarvis');

      const unknownProfile = getAgentProfileByAgentId(agentProfiles, 'unknown' as unknown as import('../types').StableAgentId);
      expect(unknownProfile).toBeUndefined();
    });

    it('requireAgentProfileByAgentId returns profile or throws', () => {
      const atlasProfile = requireAgentProfileByAgentId(agentProfiles, 'atlas');
      expect(atlasProfile).toBeDefined();
      expect(atlasProfile.stableAgentId).toBe('atlas');

      expect(() => requireAgentProfileByAgentId(agentProfiles, 'unknown' as unknown as import('../types').StableAgentId)).toThrow('Agent profile not found for agent ID: unknown');
    });

    it('safe map result succeeds', () => {
      const result = createAgentProfileMap(agentProfiles);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.size).toBe(5);
        expect(result.value.get('scout')?.stableAgentId).toBe('scout');
      }
    });

    it('safe map does not throw and returns typed failure on duplicate', () => {
      const duplicateProfiles = [agentProfiles[0], { ...agentProfiles[0], profileId: 'another_id' }];
      const result = createAgentProfileMap(duplicateProfiles);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.issues.length).toBe(1);
        expect(result.issues[0].code).toBe('DUPLICATE_AGENT_ID');
      }
    });

    it('strict map helper throws only when explicitly called', () => {
      const duplicateProfiles = [agentProfiles[0], { ...agentProfiles[0], profileId: 'another_id' }];
      expect(() => createAgentProfileMapStrict(duplicateProfiles)).toThrow(/Failed to create strict map/);

      const map = createAgentProfileMapStrict(agentProfiles);
      expect(map.size).toBe(5);
    });
  });
});
