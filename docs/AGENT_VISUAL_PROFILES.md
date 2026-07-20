# Agent Visual Profiles Foundation

## Overview
This document describes the structure and usage of the Agent Visual Profiles foundation within the Jarvis Office Prototype.

The goal of this foundation is to provide a framework-independent identity and visual-profile metadata for the five permanent Jarvis agents (`jarvis`, `atlas`, `scout`, `archive`, `sentinel`).

## Separation of Concerns: Profiles vs. Runtime State
Visual Profiles are strictly descriptive metadata for UI and layout use. The profile package **must not** become the authoritative source for runtime behavior.

- **Visual Profiles:** Define static data such as `displayName`, `roleTitle`, `themeId`, `spriteId`, `workspaceId`, `accessibleDescription`, and `supportedActivities`. They exist independently of the active task-simulation branch.
- **Runtime Agents:** Define mutable runtime state such as `currentStatus`, `progress`, `currentTaskId`, `queueCount`, `isTemporary`, and location coordinates.

Future UI components should fetch the static visual profile using the provided adapter, and merge or combine it with the runtime agent's data for rendering, rather than attempting to embed runtime state into the profiles or vice-versa.

## Stable ID Conventions
- **Agent IDs (`StableAgentId`):** Lowercase unique identifiers corresponding to the permanent agents (e.g., `jarvis`, `atlas`). These act as the primary foreign keys.
- **Profile IDs (`AgentProfileId`):** Prefixed with `profile_` (e.g., `profile_jarvis`).
- **Theme IDs (`ThemeId`):** Prefixed with `theme_` (e.g., `theme_jarvis`).
- **Workspace IDs (`WorkspaceId`):** Represent the canonical identifier of an office location where the agent works (e.g., `jarvis_desk`, `atlas_desk`).
- **Sprite IDs (`SpriteId`):** Canonical references for Phaser asset keys (e.g., `sprite-agent-jarvis`, `sprite-agent-atlas`).

## Profile Fields
Each `AgentProfile` contains:
- `profileId`: Unique ID for the profile record.
- `stableAgentId`: The unique ID of the agent (maps to `Agent.id` in the runtime).
- `displayName`: Human-readable name (e.g., "Jarvis").
- `roleTitle`: The title describing the agent's overall job.
- `shortDescription`: A one-line summary of what the agent does.
- `detailedResponsibilities`: A detailed explanation of the agent's tasks.
- `spriteId`: Reference to the Phaser sprite (`sprite-agent-*`).
- `workspaceId`: Reference to the primary location/desk in the office layout (`*_desk`).
- `themeId`: Reference to the `VisualTheme`.
- `iconId`: Reference to a generic icon.
- `accessibleDescription`: Text specifically formatted for screen readers.
- `supportedActivities`: A list of valid activities (`AgentActivityLabel`) specific to this agent.
- `defaultGreeting`: A short string the agent uses to greet users.
- `visualState`: Denotes whether the visuals are "placeholder" or "production-ready".

## Theme Fields
Each `VisualTheme` contains:
- `id`: Unique identifier for the theme.
- `cssTokenRefs`: References to CSS variables mapping to the agent's primary, accent, and background colors.
- `badgeStyle`: The CSS class or style token for badge elements.
- `avatarFrameStyle`: The CSS class or style token for the avatar border/frame.
- `workspaceAccentRef`: Semantic token reference for coloring the agent's workspace.
- `indicatorIcon`: An icon representing the theme/agent's department.
- `accessibleThemeLabel`: Descriptive text of the theme's colors for accessibility.

## Accessibility Requirements
Every profile must include an `accessibleDescription`, detailing both the agent's identity and visual theme for visually impaired users or screen readers. The theme itself has an `accessibleThemeLabel`.

## References and Integration
- **Office Layout Assignments:** When determining where an agent sits or belongs, the office layout manager should map the `workspaceId` found in the visual profile to the corresponding node in the active node graph.
- **Sprites:** The `spriteId` directly corresponds to the texture key needed by Phaser. The scene should request the profile for an agent, look up `spriteId`, and instantiate the sprite.
- **React and Phaser Consumption:** React components and Phaser scenes should use the adapter (e.g., `getAgentProfileByAgentId(agentProfiles, 'jarvis')`) to fetch profile data.

### Exclusions / Deferred Work
The current implementation intentionally defers and excludes:
- AI or model integrations.
- Task execution logic, workflow state, or simulation changes.
- Persistence, WebSockets, or backend connectivity.
- Final character artwork implementations.
- Modifying the existing React task panels or Phaser scene to adopt these profiles. That will happen in future PRs.
