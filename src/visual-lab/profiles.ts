import type { VisualLabPalette, VisualLabProfile } from './types';

const baseDimensions = {
    suiteWidth: 840,
    suiteDepth: 500,
    usableAreaIncrease: 0,
    aisleWidth: 64,
    workstationClearance: 32,
    doorClearance: 42,
    deskSpacing: 28,
    chairClearance: 24,
    personSpacing: 30,
    circulationWidth: 58,
    wallThickness: 12,
} as const;

export const VISUAL_LAB_PROFILES: readonly VisualLabProfile[] = [
    {
        id: 'baseline', shortName: 'Baseline', title: 'Current production density', detailLevel: 0,
        description: 'Current source-density and compact geometry reconstructed as the representative suite.',
        dimensions: baseDimensions,
        assets: { standing: { width: 24, height: 34 }, seated: { width: 24, height: 30 }, furniture: 32, architecture: 40, renderScale: 1.24, animationFrame: { width: 24, height: 34 } },
        lightingDepth: 1, propDensity: 1, migrationEffort: 'existing', performanceRisk: 'existing',
    },
    {
        id: 'candidate-a', shortName: 'Candidate A', title: 'Conservative higher-resolution pixel art', detailLevel: 1,
        description: 'A lower-risk migration with visibly larger rooms, clearer silhouettes, and richer 48 px furniture.',
        dimensions: { ...baseDimensions, suiteWidth: 940, suiteDepth: 560, usableAreaIncrease: 25.3, aisleWidth: 76, workstationClearance: 40, doorClearance: 50, deskSpacing: 38, chairClearance: 31, personSpacing: 38, circulationWidth: 70, wallThickness: 16 },
        assets: { standing: { width: 32, height: 48 }, seated: { width: 32, height: 42 }, furniture: 48, architecture: 56, renderScale: 1, animationFrame: { width: 32, height: 48 } },
        lightingDepth: 2, propDensity: 2, migrationEffort: 'low', performanceRisk: 'low',
    },
    {
        id: 'candidate-b', shortName: 'Candidate B', title: 'Balanced detailed isometric pixel art', detailLevel: 2,
        description: 'The balanced direction: 48×64 characters, 64 px furniture, wider circulation, and readable materials.',
        dimensions: { ...baseDimensions, suiteWidth: 1010, suiteDepth: 602, usableAreaIncrease: 44.8, aisleWidth: 88, workstationClearance: 50, doorClearance: 60, deskSpacing: 50, chairClearance: 40, personSpacing: 48, circulationWidth: 82, wallThickness: 20 },
        assets: { standing: { width: 48, height: 64 }, seated: { width: 48, height: 56 }, furniture: 64, architecture: 72, renderScale: 1, animationFrame: { width: 48, height: 64 } },
        lightingDepth: 3, propDensity: 3, migrationEffort: 'medium', performanceRisk: 'moderate',
    },
    {
        id: 'candidate-c', shortName: 'Candidate C', title: 'Maximum practical high-detail pixel art', detailLevel: 3,
        description: 'The upper detail boundary: generous negative space, 64×80 characters, 80 px furniture, and showcase depth.',
        dimensions: { ...baseDimensions, suiteWidth: 1095, suiteDepth: 652, usableAreaIncrease: 70, aisleWidth: 104, workstationClearance: 64, doorClearance: 72, deskSpacing: 64, chairClearance: 52, personSpacing: 60, circulationWidth: 96, wallThickness: 24 },
        assets: { standing: { width: 64, height: 80 }, seated: { width: 64, height: 70 }, furniture: 80, architecture: 88, renderScale: 1, animationFrame: { width: 64, height: 80 } },
        lightingDepth: 4, propDensity: 4, migrationEffort: 'high', performanceRisk: 'higher',
    },
] as const;

export const VISUAL_LAB_PROFILE_BY_ID = Object.fromEntries(VISUAL_LAB_PROFILES.map((profile) => [profile.id, profile])) as Readonly<Record<VisualLabProfile['id'], VisualLabProfile>>;

export const LAB_PALETTES: Readonly<Record<'engineering' | 'executive' | 'operations' | 'security' | 'meeting' | 'corridor', VisualLabPalette>> = {
    engineering: { floor: 0x46596a, floorLight: 0x60768a, wall: 0x6f6b68, wallSide: 0x3b3938, trim: 0x83a9c7, accent: 0x5fa9df, screen: 0x48d9ef, wood: 0x916340, upholstery: 0x3f5f78 },
    executive: { floor: 0xb59a76, floorLight: 0xd6bc91, wall: 0x80766c, wallSide: 0x4b423b, trim: 0xd6b56d, accent: 0xd9a648, screen: 0x79c9db, wood: 0x74401f, upholstery: 0x263b55 },
    operations: { floor: 0x263d4c, floorLight: 0x355569, wall: 0x52616b, wallSide: 0x28343b, trim: 0x4eb9cf, accent: 0x34d7e5, screen: 0x43efff, wood: 0x4c4339, upholstery: 0x263f56 },
    security: { floor: 0x493b3f, floorLight: 0x604b51, wall: 0x51494a, wallSide: 0x282426, trim: 0x9a5b59, accent: 0xd26758, screen: 0x76c7d2, wood: 0x4d2f25, upholstery: 0x572e35 },
    meeting: { floor: 0x77655d, floorLight: 0x998176, wall: 0x716963, wallSide: 0x3d3835, trim: 0xb99b77, accent: 0xb980d1, screen: 0x75d8e7, wood: 0x754829, upholstery: 0x563f64 },
    corridor: { floor: 0x706d58, floorLight: 0x8d896c, wall: 0x766f63, wallSide: 0x423e38, trim: 0x829b63, accent: 0x85b86f, screen: 0x7ecbd1, wood: 0x6f4b2e, upholstery: 0x4f654a },
};

export const DEFAULT_VISUAL_LAB_PREFERENCES = {
    labels: 'auto',
    effects: typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduced' : 'on',
    showDimensions: false,
    showAnchors: false,
    showBounds: false,
} as const;
