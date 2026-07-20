import { AgentProfile, StableAgentId } from './types';

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

export function createAgentProfileMap(
  profiles: readonly AgentProfile[]
): ReadonlyMap<StableAgentId, AgentProfile> {
  const map = new Map<StableAgentId, AgentProfile>();
  for (const profile of profiles) {
    if (map.has(profile.stableAgentId)) {
      throw new DuplicateAgentError(`Duplicate stable agent ID found during map creation: ${profile.stableAgentId}`);
    }
    map.set(profile.stableAgentId, profile);
  }
  return map;
}
