import { describe, it, expect } from 'vitest';
import { agentProfiles, agentThemes } from '../profiles';
import { validateAgentProfiles } from '../validation';
import { getAgentProfileByAgentId, requireAgentProfileByAgentId, createAgentProfileMap } from '../adapters';

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

  it('profile IDs are unique', () => {
    const ids = new Set(agentProfiles.map(p => p.profileId));
    expect(ids.size).toBe(agentProfiles.length);
  });

  it('agent IDs are unique', () => {
    const ids = new Set(agentProfiles.map(p => p.stableAgentId));
    expect(ids.size).toBe(agentProfiles.length);
  });

  it('every profile has an accessible description', () => {
    agentProfiles.forEach(p => {
      expect(p.accessibleDescription).toBeDefined();
      expect(p.accessibleDescription.length).toBeGreaterThan(0);
    });
  });

  it('every theme reference resolves', () => {
    const themeIds = new Set(agentThemes.map(t => t.id));
    agentProfiles.forEach(p => {
      expect(themeIds.has(p.themeId)).toBe(true);
    });
  });

  it('validates default profiles successfully', () => {
    const result = validateAgentProfiles({
      profiles: agentProfiles,
      themes: agentThemes,
      knownWorkspaceIds,
      knownSpriteIds
    });
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
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
    expect(result.errors).toContain(`Unknown theme reference: unknown_theme in profile ${invalidProfile.profileId}`);
    expect(result.errors).toContain(`Unknown workspace reference: unknown_workspace in profile ${invalidProfile.profileId}`);
    expect(result.errors).toContain(`Unknown sprite reference: unknown_sprite in profile ${invalidProfile.profileId}`);
  });

  it('duplicate profiles are rejected', () => {
    const duplicateProfile = { ...agentProfiles[0] };
    const result = validateAgentProfiles({
      profiles: [agentProfiles[0], duplicateProfile],
      themes: agentThemes,
      knownWorkspaceIds
    });

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(`Duplicate profile ID found: ${duplicateProfile.profileId}`);
    expect(result.errors).toContain(`Duplicate stable agent ID found: ${duplicateProfile.stableAgentId} in profile ${duplicateProfile.profileId}`);
  });

  it('repeated loading returns equivalent data', () => {
    const result1 = validateAgentProfiles({ profiles: agentProfiles, themes: agentThemes, knownWorkspaceIds });
    const result2 = validateAgentProfiles({ profiles: agentProfiles, themes: agentThemes, knownWorkspaceIds });
    expect(result1.isValid).toEqual(result2.isValid);
    expect(result1.errors).toEqual(result2.errors);
  });

  it('helpers do not mutate their inputs', () => {
    const profilesCopy = [...agentProfiles];
    validateAgentProfiles({
      profiles: agentProfiles,
      themes: agentThemes,
      knownWorkspaceIds
    });
    expect(agentProfiles).toEqual(profilesCopy);
  });

  it('runtime state is not embedded in profile fixtures', () => {
    agentProfiles.forEach(p => {
      const untypedProfile = p as unknown as Record<string, unknown>;
      expect(untypedProfile.currentStatus).toBeUndefined();
      expect(untypedProfile.progress).toBeUndefined();
      expect(untypedProfile.currentTaskId).toBeUndefined();

      p.supportedActivities.forEach(a => {
        expect(a.label).not.toMatch(/\d+%/);
        // Exclude 'idle' which often legitimately describes current state generically.
        if (a.id !== 'idle') {
           expect(a.label.toLowerCase()).not.toContain('task');
        }
      });
    });
  });

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
    expect(result.errors).toContain(`Unknown activity ID found: jumping in profile ${invalidProfile.profileId}`);
  });

  describe('Adapters', () => {
    it('getAgentProfileByAgentId returns correct profile or undefined', () => {
      const jarvisProfile = getAgentProfileByAgentId(agentProfiles, 'jarvis');
      expect(jarvisProfile).toBeDefined();
      expect(jarvisProfile?.stableAgentId).toBe('jarvis');

      const unknownProfile = getAgentProfileByAgentId(agentProfiles, 'unknown');
      expect(unknownProfile).toBeUndefined();
    });

    it('requireAgentProfileByAgentId returns profile or throws', () => {
      const atlasProfile = requireAgentProfileByAgentId(agentProfiles, 'atlas');
      expect(atlasProfile).toBeDefined();
      expect(atlasProfile.stableAgentId).toBe('atlas');

      expect(() => requireAgentProfileByAgentId(agentProfiles, 'unknown')).toThrow('Agent profile not found for agent ID: unknown');
    });

    it('createAgentProfileMap returns a valid map', () => {
      const map = createAgentProfileMap(agentProfiles);
      expect(map.size).toBe(5);
      expect(map.get('scout')?.stableAgentId).toBe('scout');
      expect(map.get('unknown')).toBeUndefined();
    });

    it('createAgentProfileMap does not silently overwrite duplicates', () => {
      const duplicateProfiles = [agentProfiles[0], { ...agentProfiles[0], profileId: 'another_id' }];
      expect(() => createAgentProfileMap(duplicateProfiles)).toThrow(/Duplicate stable agent ID found during map creation: /);
    });
  });
});
