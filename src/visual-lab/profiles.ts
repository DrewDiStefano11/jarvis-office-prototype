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
    mainCorridorWidth: 64,
    secondaryCorridorWidth: 52,
    secureCorridorWidth: 58,
    movementClearanceArea: 68000,
    wallThickness: 12,
} as const;

export const VISUAL_LAB_PROFILES: readonly VisualLabProfile[] = [
    {
        id: 'baseline', shortName: 'Baseline', title: 'Current production density', detailLevel: 0,
        description: 'Current source-density and compact geometry reconstructed as the representative suite.',
        dimensions: baseDimensions,
        assets: { standing: { width: 24, height: 34 }, seated: { width: 24, height: 30 }, furniture: 32, architecture: 40, renderScale: 1.24, animationFrame: { width: 24, height: 34 } },
        lightingDepth: 1, propDensity: 1, materialProfileCount: 5, departmentThemeCount: 6, particleProfileCount: 0, lightingProfileCount: 1, migrationEffort: 'existing', performanceRisk: 'existing',
    },
    {
        id: 'candidate-a', shortName: 'Candidate A', title: 'Conservative higher-resolution pixel art', detailLevel: 1,
        description: 'A lower-risk migration with visibly larger rooms, clearer silhouettes, and richer 48 px furniture.',
        dimensions: { ...baseDimensions, suiteWidth: 940, suiteDepth: 560, usableAreaIncrease: 25.3, aisleWidth: 76, workstationClearance: 40, doorClearance: 50, deskSpacing: 38, chairClearance: 31, personSpacing: 38, circulationWidth: 70, mainCorridorWidth: 78, secondaryCorridorWidth: 62, secureCorridorWidth: 70, movementClearanceArea: 96000, wallThickness: 16 },
        assets: { standing: { width: 32, height: 48 }, seated: { width: 32, height: 42 }, furniture: 48, architecture: 56, renderScale: 1, animationFrame: { width: 32, height: 48 } },
        lightingDepth: 2, propDensity: 2, materialProfileCount: 7, departmentThemeCount: 6, particleProfileCount: 1, lightingProfileCount: 2, migrationEffort: 'low', performanceRisk: 'low',
    },
    {
        id: 'candidate-b', shortName: 'Candidate B', title: 'Balanced detailed isometric pixel art', detailLevel: 2,
        description: 'The balanced direction: 48×64 characters, 64 px furniture, wider circulation, and readable materials.',
        dimensions: { ...baseDimensions, suiteWidth: 1010, suiteDepth: 602, usableAreaIncrease: 44.8, aisleWidth: 88, workstationClearance: 50, doorClearance: 60, deskSpacing: 50, chairClearance: 40, personSpacing: 48, circulationWidth: 82, mainCorridorWidth: 92, secondaryCorridorWidth: 70, secureCorridorWidth: 82, movementClearanceArea: 128000, wallThickness: 20 },
        assets: { standing: { width: 48, height: 64 }, seated: { width: 48, height: 56 }, furniture: 64, architecture: 72, renderScale: 1, animationFrame: { width: 48, height: 64 } },
        lightingDepth: 3, propDensity: 3, materialProfileCount: 9, departmentThemeCount: 6, particleProfileCount: 2, lightingProfileCount: 3, migrationEffort: 'medium', performanceRisk: 'moderate',
    },
    {
        id: 'candidate-c', shortName: 'Candidate C', title: 'Maximum practical high-detail pixel art', detailLevel: 3,
        description: 'The upper detail boundary: generous negative space, 64×80 characters, 80 px furniture, and showcase depth.',
        dimensions: { ...baseDimensions, suiteWidth: 1095, suiteDepth: 652, usableAreaIncrease: 70, aisleWidth: 104, workstationClearance: 64, doorClearance: 72, deskSpacing: 64, chairClearance: 52, personSpacing: 60, circulationWidth: 96, mainCorridorWidth: 108, secondaryCorridorWidth: 82, secureCorridorWidth: 96, movementClearanceArea: 164000, wallThickness: 24 },
        assets: { standing: { width: 64, height: 80 }, seated: { width: 64, height: 70 }, furniture: 80, architecture: 88, renderScale: 1, animationFrame: { width: 64, height: 80 } },
        lightingDepth: 4, propDensity: 4, materialProfileCount: 12, departmentThemeCount: 6, particleProfileCount: 3, lightingProfileCount: 4, migrationEffort: 'high', performanceRisk: 'higher',
    },
    {
        id: 'candidate-d', shortName: 'Candidate D', title: 'Expansive production-quality pixel art', detailLevel: 4,
        description: 'Movement-ready production scale with a broader seven-zone office suite, 80x112 characters, purpose-built furniture, deeper materials, and restrained functional ambience.',
        dimensions: { ...baseDimensions, suiteWidth: 1280, suiteDepth: 740, usableAreaIncrease: 125.5, aisleWidth: 136, workstationClearance: 82, doorClearance: 92, deskSpacing: 92, chairClearance: 70, personSpacing: 82, circulationWidth: 128, mainCorridorWidth: 136, secondaryCorridorWidth: 92, secureCorridorWidth: 116, movementClearanceArea: 308000, wallThickness: 30 },
        assets: { standing: { width: 80, height: 112 }, seated: { width: 80, height: 98 }, furniture: 112, architecture: 128, renderScale: 1, animationFrame: { width: 80, height: 112 } },
        lightingDepth: 5, propDensity: 6, materialProfileCount: 15, departmentThemeCount: 10, particleProfileCount: 7, lightingProfileCount: 6, migrationEffort: 'high', performanceRisk: 'higher',
    },
    {
        id: 'candidate-e', shortName: 'Candidate E', title: 'Premium maximum-quality pixel art', detailLevel: 5,
        description: 'A premium upper boundary with a generous multi-room footprint, 112x128 characters, 160 px furniture, room-specific decoration, richer lighting, and layered contained ambience.',
        dimensions: { ...baseDimensions, suiteWidth: 1500, suiteDepth: 880, usableAreaIncrease: 214.3, aisleWidth: 160, workstationClearance: 104, doorClearance: 116, deskSpacing: 118, chairClearance: 88, personSpacing: 104, circulationWidth: 148, mainCorridorWidth: 140, secondaryCorridorWidth: 104, secureCorridorWidth: 140, movementClearanceArea: 502000, wallThickness: 36 },
        assets: { standing: { width: 112, height: 128 }, seated: { width: 112, height: 112 }, furniture: 160, architecture: 176, renderScale: 1, animationFrame: { width: 112, height: 128 } },
        lightingDepth: 7, propDensity: 9, materialProfileCount: 15, departmentThemeCount: 10, particleProfileCount: 9, lightingProfileCount: 8, migrationEffort: 'high', performanceRisk: 'premium',
    },
] as const;

export const VISUAL_LAB_PROFILE_BY_ID = Object.fromEntries(VISUAL_LAB_PROFILES.map((profile) => [profile.id, profile])) as Readonly<Record<VisualLabProfile['id'], VisualLabProfile>>;
export const EXPANSIVE_LAB_PROFILES = VISUAL_LAB_PROFILES.filter((profile) => ['candidate-c', 'candidate-d', 'candidate-e'].includes(profile.id));

export const LAB_PALETTES: Readonly<Record<'engineering' | 'executive' | 'operations' | 'security' | 'meeting' | 'corridor' | 'reception' | 'knowledge', VisualLabPalette>> = {
    engineering: { floor: 0x46596a, floorLight: 0x60768a, wall: 0x6f6b68, wallSide: 0x3b3938, trim: 0x83a9c7, accent: 0x5fa9df, screen: 0x48d9ef, wood: 0x916340, upholstery: 0x3f5f78 },
    executive: { floor: 0xb59a76, floorLight: 0xd6bc91, wall: 0x80766c, wallSide: 0x4b423b, trim: 0xd6b56d, accent: 0xd9a648, screen: 0x79c9db, wood: 0x74401f, upholstery: 0x263b55 },
    operations: { floor: 0x263d4c, floorLight: 0x355569, wall: 0x52616b, wallSide: 0x28343b, trim: 0x4eb9cf, accent: 0x34d7e5, screen: 0x43efff, wood: 0x4c4339, upholstery: 0x263f56 },
    security: { floor: 0x493b3f, floorLight: 0x604b51, wall: 0x51494a, wallSide: 0x282426, trim: 0x9a5b59, accent: 0xd26758, screen: 0x76c7d2, wood: 0x4d2f25, upholstery: 0x572e35 },
    meeting: { floor: 0x77655d, floorLight: 0x998176, wall: 0x716963, wallSide: 0x3d3835, trim: 0xb99b77, accent: 0xb980d1, screen: 0x75d8e7, wood: 0x754829, upholstery: 0x563f64 },
    corridor: { floor: 0x706d58, floorLight: 0x8d896c, wall: 0x766f63, wallSide: 0x423e38, trim: 0x829b63, accent: 0x85b86f, screen: 0x7ecbd1, wood: 0x6f4b2e, upholstery: 0x4f654a },
    reception: { floor: 0x8b806e, floorLight: 0xb1a68f, wall: 0x817a70, wallSide: 0x49443e, trim: 0xd4b878, accent: 0x69b893, screen: 0x83d9d2, wood: 0x795234, upholstery: 0x4f6b5f },
    knowledge: { floor: 0x66664f, floorLight: 0x88866b, wall: 0x746f60, wallSide: 0x3e3b33, trim: 0x99ae70, accent: 0xa8bf68, screen: 0x88c6b1, wood: 0x70482d, upholstery: 0x56654a },
};

export const DEFAULT_VISUAL_LAB_PREFERENCES = {
    labels: 'auto',
    effects: typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduced' : 'on',
    particles: typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduced' : 'on',
    lighting: true,
    showDimensions: false,
    showAnchors: false,
    showBounds: false,
    showMovementClearance: false,
    showCirculationRoutes: false,
    showFurnitureBounds: false,
    showInteractionBounds: false,
} as const;
