export type VisualLabCandidateId = 'baseline' | 'candidate-a' | 'candidate-b' | 'candidate-c';
export type VisualLabMode = VisualLabCandidateId | 'comparison';
export type VisualLabLabelMode = 'auto' | 'minimal' | 'on';
export type VisualLabEffectsMode = 'on' | 'reduced' | 'off';
export type VisualLabRole = 'permanent' | 'seated' | 'operations' | 'executive' | 'security' | 'temporary' | 'visitor' | 'sandbox' | 'meeting' | 'presenter';
export type VisualLabFacing = 'front-left' | 'front-right';
export type VisualLabFurnitureType = 'desk' | 'executive-desk' | 'chair' | 'technical-chair' | 'meeting-chair' | 'meeting-table' | 'console' | 'shelf' | 'plant' | 'monitor' | 'secure-reader' | 'door';

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
    readonly detailLevel: 0 | 1 | 2 | 3;
    readonly dimensions: VisualLabDimensions;
    readonly assets: VisualLabAssetProfile;
    readonly lightingDepth: number;
    readonly propDensity: number;
    readonly migrationEffort: 'existing' | 'low' | 'medium' | 'high';
    readonly performanceRisk: 'existing' | 'low' | 'moderate' | 'higher';
}

export interface VisualLabPreferences {
    readonly labels: VisualLabLabelMode;
    readonly effects: VisualLabEffectsMode;
    readonly showDimensions: boolean;
    readonly showAnchors: boolean;
    readonly showBounds: boolean;
}

export interface VisualLabSelection {
    readonly id: string;
    readonly title: string;
    readonly subtitle: string;
}

