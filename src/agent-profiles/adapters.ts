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

export function createAgentProfileMap(
  profiles: readonly AgentProfile[]
): ReadonlyMap<StableAgentId, AgentProfile> {
  const map = new Map<StableAgentId, AgentProfile>();
  for (const profile of profiles) {
    map.set(profile.stableAgentId, profile);
  }
  return map;
}
