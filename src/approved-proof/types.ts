import type { AccessLevel, Point2D } from '../domain/building/types';

export type ApprovedProofRoomId = 'executive' | 'nexus' | 'engineering' | 'release-review' | 'focus' | 'public-entry' | 'sandbox-vestibule' | 'sandbox-cell';
export type ApprovedProofFurnitureType = 'engineering-desk' | 'executive-desk' | 'reception-desk' | 'security-desk' | 'ergonomic-chair' | 'executive-chair' | 'conference-chair' | 'waiting-chair' | 'technical-chair' | 'nexus-console' | 'release-table' | 'side-table' | 'shelf' | 'archive-cabinet' | 'equipment-rack' | 'monitor' | 'wall-display' | 'whiteboard' | 'printer' | 'plant-tall' | 'plant-table' | 'checkpoint-gate' | 'badge-reader' | 'containment-pod' | 'lamp';
export type ApprovedProofMaterial = 'executive-wood' | 'nexus-metal' | 'engineering-carpet' | 'project-wood' | 'focus-carpet' | 'public-stone' | 'containment-metal';
export type ApprovedProofFacing = 'front-left' | 'front-right' | 'rear-left' | 'rear-right';
export type ApprovedProofPose = 'standing' | 'seated-desk' | 'seated-console' | 'seated-meeting' | 'waiting' | 'contained';

export interface ApprovedProofPalette {
    readonly floor: number;
    readonly floorLight: number;
    readonly wall: number;
    readonly wallSide: number;
    readonly trim: number;
    readonly accent: number;
    readonly screen: number;
    readonly wood: number;
    readonly fabric: number;
}

export interface ApprovedProofRoom {
    readonly id: ApprovedProofRoomId;
    readonly title: string;
    readonly subtitle: string;
    readonly sign: string;
    readonly accessLevel: AccessLevel;
    readonly material: ApprovedProofMaterial;
    readonly palette: ApprovedProofPalette;
    readonly polygon: readonly Point2D[];
    readonly capacity: number;
}

export interface ApprovedProofDoor {
    readonly id: string;
    readonly roomId: ApprovedProofRoomId;
    readonly connectsTo: ApprovedProofRoomId | 'controlled-network' | 'exterior';
    readonly position: Point2D;
    readonly facing: ApprovedProofFacing;
    readonly accessLevel: AccessLevel;
    readonly width: number;
    readonly clearance: { readonly width: number; readonly depth: number };
    readonly visualType: 'glass-office' | 'standard' | 'checkpoint' | 'containment';
}

export interface ApprovedProofFurniture {
    readonly id: string;
    readonly roomId: ApprovedProofRoomId;
    readonly type: ApprovedProofFurnitureType;
    readonly position: Point2D;
    readonly facing: ApprovedProofFacing;
    readonly scale?: number;
    readonly blocksMovement?: boolean;
    readonly detail?: 'overview' | 'medium' | 'close';
}

export interface ApprovedProofCharacter {
    readonly id: string;
    readonly name: string;
    readonly role: string;
    readonly roomId: ApprovedProofRoomId;
    readonly position: Point2D;
    readonly facing: ApprovedProofFacing;
    readonly pose: ApprovedProofPose;
    readonly skin: number;
    readonly skinShadow: number;
    readonly hair: number;
    readonly hairLight: number;
    readonly hairStyle: number;
    readonly jacket: number;
    readonly jacketLight: number;
    readonly shirt: number;
    readonly accent: number;
    readonly pants: number;
    readonly accessory: 'tablet' | 'coffee' | 'headset' | 'clipboard' | 'badge' | 'none';
    readonly silhouette: 'narrow' | 'standard' | 'broad' | 'tall';
}

export interface ApprovedProofRoute {
    readonly id: string;
    readonly accessLevel: AccessLevel;
    readonly points: readonly Point2D[];
    readonly width: number;
}

export interface ApprovedProofPreferences {
    readonly labels: 'auto' | 'on' | 'minimal';
    readonly effects: 'on' | 'reduced' | 'off';
    readonly showMovement: boolean;
    readonly showDoors: boolean;
    readonly showFurnitureBounds: boolean;
}

export interface ApprovedProofSelection {
    readonly id: string;
    readonly title: string;
    readonly subtitle: string;
    readonly kind: 'room' | 'character';
}
