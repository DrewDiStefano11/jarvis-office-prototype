import { AssetManifest, AssetManifestEntry } from './types';

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
        animations: []
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
        animations: []
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
        animations: []
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
        animations: []
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
        animations: []
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
        id: 'sprite-chair',
        filePath: 'assets/office/furniture/chair-placeholder.png',
        category: 'furniture',
        frameWidth: 32,
        frameHeight: 32,
        scale: 1,
        defaultFacingDirection: 'down',
        isPlaceholder: true,
        animations: []
    },
    {
        id: 'sprite-computer',
        filePath: 'assets/office/furniture/computer-placeholder.png',
        category: 'furniture',
        frameWidth: 32,
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
        animations: []
    },
    {
        id: 'sprite-wall-tile',
        filePath: 'assets/office/environment/wall-tile-placeholder.png',
        category: 'tile',
        frameWidth: 32,
        frameHeight: 32,
        scale: 1,
        defaultFacingDirection: 'down',
        isPlaceholder: true,
        animations: []
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
        animations: []
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
