import { AssetManifest, AssetManifestEntry } from './types';

const agentAnimations = [
    { name: 'idle-down', frameRange: [0, 0] as readonly [number, number], frameRate: 1, repeat: -1 },
    { name: 'walk-down', frameRange: [1, 2] as readonly [number, number], frameRate: 8, repeat: -1 },
    { name: 'idle-up', frameRange: [3, 3] as readonly [number, number], frameRate: 1, repeat: -1 },
    { name: 'walk-up', frameRange: [4, 5] as readonly [number, number], frameRate: 8, repeat: -1 },
    { name: 'idle-left', frameRange: [6, 6] as readonly [number, number], frameRate: 1, repeat: -1 },
    { name: 'walk-left', frameRange: [7, 8] as readonly [number, number], frameRate: 8, repeat: -1 },
    { name: 'idle-right', frameRange: [9, 9] as readonly [number, number], frameRate: 1, repeat: -1 },
    { name: 'walk-right', frameRange: [10, 11] as readonly [number, number], frameRate: 8, repeat: -1 }
];

export const assetEntries: readonly AssetManifestEntry[] = [
    {
        id: 'sprite-agent-jarvis',
        filePath: 'assets/office/agents/jarvis-placeholder.png',
        category: 'agent',
        frameWidth: 32,
        frameHeight: 32,
        scale: 1,
        defaultFacingDirection: 'down',
        isPlaceholder: true,
        animations: agentAnimations
    },
    {
        id: 'sprite-agent-atlas',
        filePath: 'assets/office/agents/atlas-placeholder.png',
        category: 'agent',
        frameWidth: 32,
        frameHeight: 32,
        scale: 1,
        defaultFacingDirection: 'down',
        isPlaceholder: true,
        animations: agentAnimations
    },
    {
        id: 'sprite-agent-scout',
        filePath: 'assets/office/agents/scout-placeholder.png',
        category: 'agent',
        frameWidth: 32,
        frameHeight: 32,
        scale: 1,
        defaultFacingDirection: 'down',
        isPlaceholder: true,
        animations: agentAnimations
    },
    {
        id: 'sprite-agent-archive',
        filePath: 'assets/office/agents/archive-placeholder.png',
        category: 'agent',
        frameWidth: 32,
        frameHeight: 32,
        scale: 1,
        defaultFacingDirection: 'down',
        isPlaceholder: true,
        animations: agentAnimations
    },
    {
        id: 'sprite-agent-sentinel',
        filePath: 'assets/office/agents/sentinel-placeholder.png',
        category: 'agent',
        frameWidth: 32,
        frameHeight: 32,
        scale: 1,
        defaultFacingDirection: 'down',
        isPlaceholder: true,
        animations: agentAnimations
    },
    {
        id: 'sprite-desk',
        filePath: 'assets/office/furniture/desk-placeholder.png',
        category: 'furniture',
        frameWidth: 64,
        frameHeight: 32,
        scale: 1,
        defaultFacingDirection: 'down',
        isPlaceholder: true,
        animations: []
    },
    {
        id: 'sprite-meeting-table',
        filePath: 'assets/office/furniture/meeting-table-placeholder.png',
        category: 'furniture',
        frameWidth: 96,
        frameHeight: 64,
        scale: 1,
        defaultFacingDirection: 'down',
        isPlaceholder: true,
        animations: []
    },
    {
        id: 'sprite-filing-cabinet',
        filePath: 'assets/office/furniture/filing-cabinet-placeholder.png',
        category: 'furniture',
        frameWidth: 32,
        frameHeight: 32,
        scale: 1,
        defaultFacingDirection: 'down',
        isPlaceholder: true,
        animations: []
    },
    {
        id: 'sprite-door',
        filePath: 'assets/office/environment/door-placeholder.png',
        category: 'door',
        frameWidth: 32,
        frameHeight: 32,
        scale: 1,
        defaultFacingDirection: 'down',
        isPlaceholder: true,
        animations: [
            { name: 'open', frameRange: [0, 2], frameRate: 5, repeat: 0 },
            { name: 'close', frameRange: [2, 0], frameRate: 5, repeat: 0 }
        ]
    },
    {
        id: 'sprite-plant',
        filePath: 'assets/office/decoration/plant-placeholder.png',
        category: 'decoration',
        frameWidth: 32,
        frameHeight: 32,
        scale: 1,
        defaultFacingDirection: 'down',
        isPlaceholder: true,
        animations: []
    },
    {
        id: 'sprite-status-marker',
        filePath: 'assets/office/indicators/status-marker-placeholder.png',
        category: 'indicator',
        frameWidth: 16,
        frameHeight: 16,
        scale: 1,
        defaultFacingDirection: 'down',
        isPlaceholder: true,
        animations: [
            { name: 'pulse', frameRange: [0, 3], frameRate: 4, repeat: -1 }
        ]
    },
    {
        id: 'sprite-floor-tile',
        filePath: 'assets/office/tiles/floor-tile-placeholder.png',
        category: 'tile',
        frameWidth: 32,
        frameHeight: 32,
        scale: 1,
        defaultFacingDirection: 'down',
        isPlaceholder: true,
        animations: []
    }
];

export const defaultAssetManifest: AssetManifest = {
    entries: assetEntries
};
