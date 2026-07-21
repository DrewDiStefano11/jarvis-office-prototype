import { AgentProfile, VisualTheme } from './types';

export const agentThemes: readonly VisualTheme[] = [
  {
    id: 'theme_jarvis',
    cssTokenRefs: {
      primary: 'var(--theme-jarvis-primary)',
      accent: 'var(--theme-jarvis-accent)',
      background: 'var(--theme-jarvis-bg)',
    },
    badgeStyle: 'badge-executive',
    avatarFrameStyle: 'frame-silver',
    workspaceAccentRef: 'accent-blue-silver',
    indicatorIcon: 'icon-star',
    accessibleThemeLabel: 'Executive blue and silver theme',
  },
  {
    id: 'theme_atlas',
    cssTokenRefs: {
      primary: 'var(--theme-atlas-primary)',
      accent: 'var(--theme-atlas-accent)',
      background: 'var(--theme-atlas-bg)',
    },
    badgeStyle: 'badge-research',
    avatarFrameStyle: 'frame-cyan',
    workspaceAccentRef: 'accent-cyan-teal',
    indicatorIcon: 'icon-book',
    accessibleThemeLabel: 'Research cyan and teal theme',
  },
  {
    id: 'theme_scout',
    cssTokenRefs: {
      primary: 'var(--theme-scout-primary)',
      accent: 'var(--theme-scout-accent)',
      background: 'var(--theme-scout-bg)',
    },
    badgeStyle: 'badge-specialist',
    avatarFrameStyle: 'frame-bright-cyan',
    workspaceAccentRef: 'accent-bright-cyan',
    indicatorIcon: 'icon-search',
    accessibleThemeLabel: 'Specialist bright cyan theme',
  },
  {
    id: 'theme_archive',
    cssTokenRefs: {
      primary: 'var(--theme-archive-primary)',
      accent: 'var(--theme-archive-accent)',
      background: 'var(--theme-archive-bg)',
    },
    badgeStyle: 'badge-operations',
    avatarFrameStyle: 'frame-amber',
    workspaceAccentRef: 'accent-amber',
    indicatorIcon: 'icon-folder',
    accessibleThemeLabel: 'Operations amber theme',
  },
  {
    id: 'theme_sentinel',
    cssTokenRefs: {
      primary: 'var(--theme-sentinel-primary)',
      accent: 'var(--theme-sentinel-accent)',
      background: 'var(--theme-sentinel-bg)',
    },
    badgeStyle: 'badge-security',
    avatarFrameStyle: 'frame-purple',
    workspaceAccentRef: 'accent-purple',
    indicatorIcon: 'icon-shield',
    accessibleThemeLabel: 'Security purple theme',
  }
];

export const agentProfiles: readonly AgentProfile[] = [
  {
    profileId: 'profile_jarvis',
    stableAgentId: 'jarvis',
    displayName: 'Jarvis',
    roleTitle: 'Executive Manager',
    shortDescription: 'Oversees office operations and delegates tasks.',
    detailedResponsibilities: 'Responsible for receiving high-level user requests, breaking them down into manageable tasks, and delegating them to the appropriate specialized agents. Monitors overall progress and reports back.',
    spriteId: 'sprite-agent-jarvis',
    workspaceId: 'jarvis_desk', // Matches id from domain/seed but used here as placeholder text ID until layout is merged
    themeId: 'theme_jarvis',
    iconId: 'icon-jarvis',
    accessibleDescription: 'Jarvis, the Executive Manager, represented by a blue and silver theme.',
    supportedActivities: [
      { id: 'idle', label: 'Awaiting instructions' },
      { id: 'planning', label: 'Formulating plans' },
      { id: 'communicating', label: 'Delegating work' }
    ],
    defaultGreeting: 'Ready for instructions.',
    visualState: 'placeholder'
  },
  {
    profileId: 'profile_atlas',
    stableAgentId: 'atlas',
    displayName: 'Atlas',
    roleTitle: 'Research Manager',
    shortDescription: 'Manages deep research and knowledge retrieval.',
    detailedResponsibilities: 'Coordinates complex research tasks, directs Scout for specific data gathering, and synthesizes information into comprehensive reports.',
    spriteId: 'sprite-agent-atlas',
    workspaceId: 'atlas_desk',
    themeId: 'theme_atlas',
    iconId: 'icon-atlas',
    accessibleDescription: 'Atlas, the Research Manager, represented by a cyan and teal theme.',
    supportedActivities: [
      { id: 'idle', label: 'Ready for research' },
      { id: 'researching', label: 'Synthesizing data' },
      { id: 'communicating', label: 'Coordinating research' }
    ],
    defaultGreeting: 'Ready to research.',
    visualState: 'placeholder'
  },
  {
    profileId: 'profile_scout',
    stableAgentId: 'scout',
    displayName: 'Scout',
    roleTitle: 'Research Specialist',
    shortDescription: 'Gathers specific data points and monitors sources.',
    detailedResponsibilities: 'Executes rapid data retrieval, monitors external sources for updates, and reports findings back to Atlas.',
    spriteId: 'sprite-agent-scout',
    workspaceId: 'scout_desk',
    themeId: 'theme_scout',
    iconId: 'icon-scout',
    accessibleDescription: 'Scout, the Research Specialist, represented by a bright cyan theme.',
    supportedActivities: [
      { id: 'idle', label: 'Monitoring' },
      { id: 'researching', label: 'Gathering data' }
    ],
    defaultGreeting: 'Monitoring sources.',
    visualState: 'placeholder'
  },
  {
    profileId: 'profile_archive',
    stableAgentId: 'archive',
    displayName: 'Archive',
    roleTitle: 'File and Document Specialist',
    shortDescription: 'Organizes and maintains office records.',
    detailedResponsibilities: 'Handles document storage, retrieval, and organization within the office. Ensures all knowledge is correctly cataloged.',
    spriteId: 'sprite-agent-archive',
    workspaceId: 'archive_desk',
    themeId: 'theme_archive',
    iconId: 'icon-archive',
    accessibleDescription: 'Archive, the File and Document Specialist, represented by an amber theme.',
    supportedActivities: [
      { id: 'idle', label: 'Organizing files' },
      { id: 'organizing', label: 'Filing documents' }
    ],
    defaultGreeting: 'Ready to organize.',
    visualState: 'placeholder'
  },
  {
    profileId: 'profile_sentinel',
    stableAgentId: 'sentinel',
    displayName: 'Sentinel',
    roleTitle: 'Security Reviewer',
    shortDescription: 'Reviews actions and maintains security logs.',
    detailedResponsibilities: 'Audits sensitive actions, reviews logs for compliance, and ensures office operations meet security standards.',
    spriteId: 'sprite-agent-sentinel',
    workspaceId: 'sentinel_desk',
    themeId: 'theme_sentinel',
    iconId: 'icon-sentinel',
    accessibleDescription: 'Sentinel, the Security Reviewer, represented by a purple theme.',
    supportedActivities: [
      { id: 'idle', label: 'Reviewing logs' },
      { id: 'reviewing', label: 'Auditing actions' }
    ],
    defaultGreeting: 'Security systems active.',
    visualState: 'placeholder'
  }
];
