import { AgentProfile, StableAgentId, AgentProfileValidationIssue } from './types';

export function getAgentProfileByAgentId(
  profiles: readonly AgentProfile[],
  agentId: StableAgentId
): AgentProfile | undefined {
  return profiles.find(profile => profile.stableAgentId === agentId);
}

export function requireAgentProfileByAgentId(
  profiles: readonly AgentProfile[],
  agentId: StableAgentId
): AgentProfile {
  const profile = getAgentProfileByAgentId(profiles, agentId);
  if (!profile) {
    throw new Error(`Agent profile not found for agent ID: ${agentId}`);
  }
  return profile;
}

export class DuplicateAgentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DuplicateAgentError';
  }
}

export type CreateAgentProfileMapResult =
  | {
      readonly ok: true;
      readonly value: ReadonlyMap<StableAgentId, AgentProfile>;
    }
  | {
      readonly ok: false;
      readonly issues: readonly AgentProfileValidationIssue[];
    };

export function createAgentProfileMap(
  profiles: readonly AgentProfile[]
): CreateAgentProfileMapResult {
  const map = new Map<StableAgentId, AgentProfile>();
  const issues: AgentProfileValidationIssue[] = [];

  for (const profile of profiles) {
    if (map.has(profile.stableAgentId)) {
      issues.push({
        code: 'DUPLICATE_AGENT_ID',
        severity: 'error',
        message: `Duplicate stable agent ID found during map creation: ${profile.stableAgentId}`,
        profileId: profile.profileId,
        stableAgentId: profile.stableAgentId
      });
    } else {
      map.set(profile.stableAgentId, profile);
    }
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return { ok: true, value: map };
}

export function createAgentProfileMapStrict(
  profiles: readonly AgentProfile[]
): ReadonlyMap<StableAgentId, AgentProfile> {
  const result = createAgentProfileMap(profiles);
  if (!result.ok) {
    const errorMessages = result.issues.map(i => i.message).join(', ');
    throw new DuplicateAgentError(`Failed to create strict map. Issues: ${errorMessages}`);
  }
  return result.value;
}
