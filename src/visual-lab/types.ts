export type VisualLabCandidateId = 'baseline' | 'candidate-a' | 'candidate-b' | 'candidate-c' | 'candidate-d' | 'candidate-e';
export type VisualLabMode = VisualLabCandidateId | 'comparison';
export type VisualLabLabelMode = 'auto' | 'minimal' | 'on';
export type VisualLabEffectsMode = 'on' | 'reduced' | 'off';
export type VisualLabParticleMode = 'on' | 'reduced' | 'off';
export type VisualLabRole = 'permanent' | 'seated' | 'operations' | 'executive' | 'security' | 'audit' | 'engineering' | 'platform' | 'project' | 'knowledge' | 'quality' | 'temporary' | 'visitor' | 'escort' | 'sandbox' | 'meeting' | 'presenter';
export type VisualLabFacing = 'front-left' | 'front-right';
export type VisualLabFurnitureType = 'desk' | 'temporary-desk' | 'engineering-desk' | 'research-desk' | 'security-desk' | 'reception-desk' | 'executive-desk' | 'chair' | 'ergonomic-chair' | 'technical-chair' | 'executive-chair' | 'meeting-chair' | 'waiting-chair' | 'research-chair' | 'meeting-table' | 'planning-table' | 'side-table' | 'console' | 'equipment-rack' | 'shelf' | 'archive-cabinet' | 'storage' | 'printer' | 'plant' | 'monitor' | 'secure-reader' | 'door';

export interface VisualLabDimensions {
    readonly suiteWidth: number;
    readonly suiteDepth: number;
    readonly usableAreaIncrease: number;
    readonly aisleWidth: number;
    readonly workstationClearance: number;
    readonly doorClearance: number;
    readonly deskSpacing: number;
    readonly chairClearance: number;
    readonly personSpacing: number;
    readonly circulationWidth: number;
    readonly mainCorridorWidth: number;
    readonly secondaryCorridorWidth: number;
    readonly secureCorridorWidth: number;
    readonly movementClearanceArea: number;
    readonly wallThickness: number;
}
export interface VisualLabAssetProfile {
    readonly standing: { readonly width: number; readonly height: number };
    readonly seated: { readonly width: number; readonly height: number };
    readonly furniture: number;
    readonly architecture: number;
    readonly renderScale: number;
    readonly animationFrame: { readonly width: number; readonly height: number };
}

export interface VisualLabPalette {
    readonly floor: number;
    readonly floorLight: number;
    readonly wall: number;
    readonly wallSide: number;
    readonly trim: number;
    readonly accent: number;
    readonly screen: number;
    readonly wood: number;
    readonly upholstery: number;
}

export interface VisualLabProfile {
    readonly id: VisualLabCandidateId;
    readonly shortName: string;
    readonly title: string;
    readonly description: string;
    readonly detailLevel: 0 | 1 | 2 | 3 | 4 | 5;
    readonly dimensions: VisualLabDimensions;
    readonly assets: VisualLabAssetProfile;
    readonly lightingDepth: number;
    readonly propDensity: number;
    readonly materialProfileCount: number;
    readonly departmentThemeCount: number;
    readonly particleProfileCount: number;
    readonly lightingProfileCount: number;
    readonly migrationEffort: 'existing' | 'low' | 'medium' | 'high';
    readonly performanceRisk: 'existing' | 'low' | 'moderate' | 'higher' | 'premium';
}

export interface VisualLabPreferences {
    readonly labels: VisualLabLabelMode;
    readonly effects: VisualLabEffectsMode;
    readonly particles: VisualLabParticleMode;
    readonly lighting: boolean;
    readonly showDimensions: boolean;
    readonly showAnchors: boolean;
    readonly showBounds: boolean;
    readonly showMovementClearance: boolean;
    readonly showCirculationRoutes: boolean;
    readonly showFurnitureBounds: boolean;
    readonly showInteractionBounds: boolean;
}

export interface VisualLabSelection {
    readonly id: string;
    readonly title: string;
    readonly subtitle: string;
}
