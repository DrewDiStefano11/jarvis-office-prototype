import type { CharacterAppearanceDefinition } from '../domain/building/types';
import type { EffectsMode } from './viewState';

export const STANDING_SPRITE_SIZE = { width: 24, height: 34 } as const;
export const SEATED_SPRITE_SIZE = { width: 24, height: 30 } as const;
export const OCCUPANT_RENDER_SCALE = 1.24;
export const OCCUPANT_FLOOR_ANCHOR = { x: 0.5, standingY: 0.91, seatedY: 0.88 } as const;
export const OCCUPANT_SELECTION_SIZE = { width: 32, height: 16 } as const;
export const OCCUPANT_HOVER_SIZE = { width: 30, height: 15 } as const;

const safe = (value: string): string => value.replace(/[^a-z0-9-]/gi, '-').toLowerCase();

export function occupantTextureKey(appearance: CharacterAppearanceDefinition, frame = 0): string {
    return safe([
        'pixel-character', appearance.bodySilhouette, appearance.heightVariant, appearance.skinTone, appearance.hairStyle,
        appearance.hairColor, appearance.facialHair, appearance.glasses, appearance.clothing, appearance.primaryPalette,
        appearance.secondaryPalette, appearance.departmentAccent, appearance.badge, appearance.accessory, appearance.pose,
        appearance.facing, appearance.seatType, appearance.shadow, frame,
    ].join('-'));
}

export const isSeatedAppearance = (appearance: CharacterAppearanceDefinition): boolean => appearance.pose.startsWith('seated-');

export const shouldAnimateAppearance = (appearance: CharacterAppearanceDefinition, effects: EffectsMode): boolean =>
    effects === 'on' && appearance.animationProfile !== 'static' && appearance.stableSeed % 4 === 0;
