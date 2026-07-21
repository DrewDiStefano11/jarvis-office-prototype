import type {
    CharacterAccessory,
    CharacterAnimationProfile,
    CharacterAppearanceDefinition,
    CharacterBadge,
    CharacterBodySilhouette,
    CharacterClothing,
    CharacterFacing,
    CharacterGlasses,
    CharacterHairColor,
    CharacterHairStyle,
    CharacterHeightVariant,
    CharacterPalette,
    CharacterPose,
    CharacterSeatType,
    CharacterSkinTone,
    OccupantActivity,
    OccupantCategory,
    Orientation,
} from '../building/types';
import type { OccupantId, WorkspaceId } from '../building/ids';

export interface OccupantAppearanceSource {
    readonly id: OccupantId;
    readonly workspaceId?: WorkspaceId;
    readonly category: OccupantCategory;
    readonly activity: OccupantActivity;
    readonly orientation: Orientation;
    readonly visualVariant: string;
}

const silhouettes: readonly CharacterBodySilhouette[] = ['narrow', 'standard', 'broad'];
const heights: readonly CharacterHeightVariant[] = ['short', 'standard', 'tall'];
const skinTones: readonly CharacterSkinTone[] = ['porcelain', 'light', 'warm', 'olive', 'brown', 'deep'];
const hairStyles: readonly CharacterHairStyle[] = ['short', 'side-parted', 'close-cropped', 'shaved', 'medium', 'long', 'tied-back', 'curly', 'swept', 'bun', 'headwear'];
const hairColors: readonly CharacterHairColor[] = ['black', 'dark-brown', 'brown', 'auburn', 'blond', 'silver'];
const glasses: readonly CharacterGlasses[] = ['none', 'round', 'square'];

export const stableCharacterSeed = (value: string): number => {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
};

const choose = <T>(values: readonly T[], seed: number, shift: number): T => values[Math.abs(seed + shift * 7919) % values.length];

const facingFor = (orientation: Orientation): CharacterFacing => ({
    north: 'rear-left', east: 'forward-right', south: 'forward-left', west: 'rear-right',
} satisfies Record<Orientation, CharacterFacing>)[orientation];

const rolePalette = (variant: string, category: OccupantCategory): CharacterPalette => {
    if (category === 'temporary') return 'amber';
    if (category === 'visitor' || category === 'waiting') return 'warm-neutral';
    if (category === 'escort' || /security|audit/.test(variant)) return 'rust';
    if (/operations/.test(variant)) return 'cyan';
    if (/violet|model/.test(variant)) return 'violet';
    if (/engineering/.test(variant)) return 'indigo';
    if (/knowledge|plugin/.test(variant)) return 'green';
    if (/quality/.test(variant)) return 'plum';
    if (/project/.test(variant)) return 'navy';
    if (/automation|command|executive/.test(variant)) return 'amber';
    return 'steel';
};

const clothingFor = (source: OccupantAppearanceSource, seed: number): CharacterClothing => {
    if (source.category === 'temporary') return 'temporary';
    if (source.category === 'visitor' || source.category === 'waiting') return 'visitor';
    if (source.category === 'sandbox') return 'sandbox';
    if (source.category === 'escort' || /security/.test(source.visualVariant)) return 'security';
    if (/command|executive/.test(source.visualVariant)) return seed % 2 ? 'executive' : 'blazer';
    if (/quality|model/.test(source.visualVariant)) return seed % 2 ? 'laboratory' : 'technical';
    if (/operations|engineering/.test(source.visualVariant)) return seed % 3 ? 'technical' : 'casual-jacket';
    return choose(['shirt', 'sweater', 'casual-jacket', 'blazer'] as const, seed, 17);
};

const badgeFor = (source: OccupantAppearanceSource): CharacterBadge => {
    if (source.category === 'temporary') return 'temporary';
    if (source.category === 'visitor' || source.category === 'waiting') return 'visitor';
    if (source.category === 'escort') return 'escort';
    if (source.category === 'sandbox') return 'containment';
    if (/security|audit/.test(source.visualVariant)) return 'security';
    return 'credential';
};

const accessoryFor = (source: OccupantAppearanceSource, seed: number): CharacterAccessory => {
    if (source.visualVariant.includes('sandbox-new-agent')) return 'containment-indicator';
    if (source.visualVariant.includes('sandbox-plugin')) return 'connector-device';
    if (source.visualVariant.includes('sandbox-model')) return 'laboratory-device';
    if (source.visualVariant.includes('sandbox-automation')) return 'deployment-device';
    if (source.category === 'escort') return 'headset';
    if (source.category === 'visitor' || source.category === 'waiting') return seed % 2 ? 'coffee' : 'none';
    if (/operations|security/.test(source.visualVariant)) return seed % 3 === 0 ? 'none' : 'headset';
    if (/quality|audit/.test(source.visualVariant)) return seed % 2 ? 'clipboard' : 'laboratory-device';
    if (/knowledge/.test(source.visualVariant)) return seed % 2 ? 'book' : 'tablet';
    if (/project|command|executive/.test(source.visualVariant)) return seed % 3 === 0 ? 'none' : seed % 2 ? 'tablet' : 'notebook';
    if (/engineering/.test(source.visualVariant)) return seed % 3 === 0 ? 'toolkit' : 'none';
    return seed % 4 === 0 ? 'clipboard' : 'none';
};

const poseFor = (source: OccupantAppearanceSource, seed: number): CharacterPose => {
    if (source.visualVariant.includes('sandbox-new-agent')) return 'sandbox-observation';
    if (source.visualVariant.includes('sandbox-plugin')) return 'standing-research';
    if (source.visualVariant.includes('sandbox-model')) return 'standing-presentation';
    if (source.visualVariant.includes('sandbox-automation')) return 'standing-security-monitoring';
    if (source.category === 'escort') return 'standing-security-monitoring';
    if (source.category === 'waiting') return 'seated-waiting';
    if (source.activity === 'reception') return 'standing-waiting';
    if (source.activity === 'seated-meeting') return 'seated-meeting';
    if (source.activity === 'briefing') return seed % 2 ? 'standing-briefing' : 'standing-presentation';
    if (/operations/.test(source.visualVariant)) return 'seated-console-work';
    if (/knowledge/.test(source.visualVariant) && source.workspaceId) return 'seated-reading';
    if (source.workspaceId) return 'seated-desk-work';
    return seed % 3 === 0 ? 'standing-conversation' : seed % 2 ? 'standing-research' : 'standing-idle';
};

const seatFor = (pose: CharacterPose, source: OccupantAppearanceSource): CharacterSeatType => {
    if (!pose.startsWith('seated-')) return 'none';
    if (pose === 'seated-console-work') return 'operations-chair';
    if (pose === 'seated-meeting') return /executive/.test(source.visualVariant) ? 'boardroom-chair' : 'conference-chair';
    if (pose === 'seated-waiting') return 'waiting-chair';
    if (pose === 'seated-reading') return 'research-chair';
    return source.visualVariant.includes('security') ? 'security-chair' : 'desk-chair';
};

const animationFor = (pose: CharacterPose): CharacterAnimationProfile => {
    if (pose === 'seated-console-work' || pose === 'standing-security-monitoring') return 'monitoring';
    if (pose === 'seated-desk-work') return 'typing';
    if (pose === 'seated-reading' || pose === 'standing-research') return 'reading';
    if (pose === 'sandbox-observation') return 'calibration';
    return pose.startsWith('standing-') ? 'breathing' : 'static';
};

export function createOccupantAppearance(source: OccupantAppearanceSource): CharacterAppearanceDefinition {
    const stableSeed = stableCharacterSeed(source.id);
    const pose = poseFor(source, stableSeed);
    const accent = rolePalette(source.visualVariant, source.category);
    const idSegments = source.id.split('.');
    return {
        id: `appearance-${idSegments[idSegments.length - 1]}`,
        occupantId: source.id,
        stableSeed,
        bodySilhouette: choose(silhouettes, stableSeed, 1),
        heightVariant: choose(heights, stableSeed, 2),
        skinTone: choose(skinTones, stableSeed, 3),
        hairStyle: choose(hairStyles, stableSeed, 4),
        hairColor: choose(hairColors, stableSeed, 5),
        facialHair: stableSeed % 7 === 0 ? 'beard' : stableSeed % 11 === 0 ? 'mustache' : stableSeed % 5 === 0 ? 'stubble' : 'none',
        glasses: stableSeed % 4 === 0 ? choose(glasses.slice(1), stableSeed, 6) : 'none',
        clothing: clothingFor(source, stableSeed),
        primaryPalette: choose(['warm-neutral', 'charcoal', 'navy', 'steel', 'olive'] as const, stableSeed, 7),
        secondaryPalette: choose(['warm-neutral', 'charcoal', 'steel', 'navy'] as const, stableSeed, 8),
        departmentAccent: accent,
        badge: badgeFor(source),
        accessory: accessoryFor(source, stableSeed),
        pose,
        facing: facingFor(source.orientation),
        seatType: seatFor(pose, source),
        shadow: pose.startsWith('seated-') ? 'seated' : stableSeed % 3 === 0 ? 'compact' : 'standard',
        animationProfile: animationFor(pose),
    };
}
