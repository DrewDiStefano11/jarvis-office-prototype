import { GameObjects, Scene, Textures } from 'phaser';
import type {
    CharacterAppearanceDefinition,
    CharacterHairStyle,
    CharacterPalette,
    CharacterSkinTone,
} from '../domain/building/types';
import { isSeatedAppearance, occupantTextureKey, SEATED_SPRITE_SIZE, STANDING_SPRITE_SIZE } from './occupantSpriteModel';

const skin: Record<CharacterSkinTone, { base: number; light: number; shade: number }> = {
    porcelain: { base: 0xf2c7a1, light: 0xffd8b5, shade: 0xc88f6d },
    light: { base: 0xe4b089, light: 0xf5c7a1, shade: 0xb97b59 },
    warm: { base: 0xcd9168, light: 0xe4aa7c, shade: 0x9d6246 },
    olive: { base: 0xb9825a, light: 0xd09c71, shade: 0x84553c },
    brown: { base: 0x8d5b40, light: 0xaa7351, shade: 0x603b2c },
    deep: { base: 0x60402f, light: 0x805640, shade: 0x3b2922 },
};

const palette: Record<CharacterPalette, { base: number; light: number; shade: number }> = {
    'warm-neutral': { base: 0x856e5e, light: 0xaa8e77, shade: 0x55463d },
    charcoal: { base: 0x384149, light: 0x58666f, shade: 0x22282d },
    navy: { base: 0x314b67, light: 0x4e7297, shade: 0x1d3046 },
    steel: { base: 0x536b78, light: 0x78929e, shade: 0x344852 },
    olive: { base: 0x65704a, light: 0x8c9966, shade: 0x414a31 },
    rust: { base: 0x8c4e3e, light: 0xbd6b55, shade: 0x572f29 },
    cyan: { base: 0x287b88, light: 0x48c6cf, shade: 0x174a56 },
    violet: { base: 0x675286, light: 0x9878bc, shade: 0x403454 },
    indigo: { base: 0x405c91, light: 0x6687c1, shade: 0x263b64 },
    green: { base: 0x4d7650, light: 0x78a96e, shade: 0x304d34 },
    amber: { base: 0xa46e2f, light: 0xdbab4d, shade: 0x65431f },
    plum: { base: 0x754f77, light: 0xa87caa, shade: 0x49334c },
};

const hairColors = {
    black: { base: 0x211b1b, light: 0x3a3030 },
    'dark-brown': { base: 0x3b261e, light: 0x5d3b2a },
    brown: { base: 0x65402a, light: 0x8c5b36 },
    auburn: { base: 0x783b2b, light: 0xa85a3c },
    blond: { base: 0xb98d4a, light: 0xddbb6b },
    silver: { base: 0x899096, light: 0xbac0c2 },
} as const;

function createTexture(scene: Scene, key: string, width: number, height: number, draw: (graphics: GameObjects.Graphics) => void): void {
    if (scene.textures.exists(key)) return;
    const graphics = scene.add.graphics();
    draw(graphics);
    graphics.generateTexture(key, width, height);
    graphics.destroy();
    scene.textures.get(key).setFilter(Textures.FilterMode.NEAREST);
}

function drawShadow(graphics: GameObjects.Graphics, appearance: CharacterAppearanceDefinition, floorY: number): void {
    const width = appearance.shadow === 'compact' ? 11 : appearance.shadow === 'seated' ? 15 : 13;
    graphics.fillStyle(0x171414, 0.52).fillEllipse(12, floorY, width, 5);
    graphics.fillStyle(0x2a2320, 0.32).fillRect(12 - Math.floor(width / 4), floorY - 1, Math.floor(width / 2), 2);
}

function drawHair(graphics: GameObjects.Graphics, style: CharacterHairStyle, color: { base: number; light: number }, headX: number, headY: number, rearFacing: boolean): void {
    if (style === 'shaved') {
        graphics.fillStyle(color.base).fillRect(headX - 3, headY, 7, 2);
        return;
    }
    graphics.fillStyle(color.base);
    const blocks: Record<Exclude<CharacterHairStyle, 'shaved'>, readonly [number, number, number, number][]> = {
        short: [[-4, -1, 9, 3], [-4, 2, 2, 2]],
        'side-parted': [[-4, -1, 9, 2], [-4, 1, 6, 2], [3, 1, 2, 3]],
        'close-cropped': [[-3, 0, 7, 2], [-4, 2, 2, 2]],
        medium: [[-4, -1, 9, 3], [-5, 2, 2, 5], [4, 2, 2, 4]],
        long: [[-4, -1, 9, 3], [-5, 2, 3, 8], [3, 2, 3, 8]],
        'tied-back': [[-4, -1, 9, 3], [4, 2, 3, 4], [6, 4, 2, 4]],
        curly: [[-4, -2, 3, 3], [-1, -2, 3, 3], [2, -2, 3, 3], [-5, 1, 3, 3], [4, 1, 2, 3]],
        swept: [[-5, -1, 10, 2], [-3, 1, 8, 2], [3, 3, 2, 2]],
        bun: [[-4, -1, 9, 3], [3, -4, 5, 4]],
        headwear: [[-5, -2, 11, 3], [-3, -4, 7, 3]],
    };
    blocks[style].forEach(([x, y, width, height]) => graphics.fillRect(headX + x, headY + y, width, height));
    graphics.fillStyle(color.light).fillRect(headX - (rearFacing ? 2 : 3), headY, 3, 1);
}

function drawBadge(graphics: GameObjects.Graphics, appearance: CharacterAppearanceDefinition, torsoX: number, torsoY: number): void {
    if (appearance.badge === 'none') return;
    const colors = { credential: 0x69d47c, temporary: 0xeac150, visitor: 0x8bd3c7, security: 0xe15b4f, escort: 0xf0a142, containment: 0xb685df } as const;
    graphics.fillStyle(0x181a1b).fillRect(torsoX + 4, torsoY + 2, 3, 4);
    graphics.fillStyle(colors[appearance.badge]).fillRect(torsoX + 5, torsoY + 3, appearance.badge === 'escort' ? 2 : 1, 2);
}

function drawAccessory(graphics: GameObjects.Graphics, appearance: CharacterAppearanceDefinition, x: number, y: number): void {
    const accent = palette[appearance.departmentAccent].light;
    switch (appearance.accessory) {
        case 'none': break;
        case 'headset':
            graphics.lineStyle(1, 0x191b1d).lineBetween(x - 5, y - 7, x + 4, y - 7).lineBetween(x + 4, y - 7, x + 5, y - 3);
            graphics.fillStyle(accent).fillRect(x + 4, y - 3, 2, 2);
            break;
        case 'tablet': case 'clipboard': case 'notebook': case 'book':
            graphics.fillStyle(0x1c2226).fillRect(x + 4, y + 1, 5, 7).fillStyle(accent).fillRect(x + 5, y + 2, 3, 4);
            break;
        case 'coffee':
            graphics.fillStyle(0xe8d9bb).fillRect(x + 5, y + 3, 3, 4).fillStyle(0x583522).fillRect(x + 6, y + 3, 1, 2);
            break;
        case 'toolkit':
            graphics.fillStyle(0x3a2a22).fillRect(x + 3, y + 4, 7, 5).fillStyle(accent).fillRect(x + 5, y + 2, 3, 2);
            break;
        case 'deployment-device': case 'laboratory-device': case 'connector-device': case 'containment-indicator':
            graphics.fillStyle(0x242b30).fillRect(x + 3, y + 1, 7, 7).fillStyle(accent).fillRect(x + 5, y + 3, 3, 2);
            if (appearance.accessory === 'connector-device') graphics.fillStyle(accent).fillRect(x + 9, y - 1, 2, 2);
            if (appearance.accessory === 'containment-indicator') graphics.fillStyle(accent).fillRect(x + 6, y - 2, 1, 3);
            break;
    }
}

function drawCharacter(graphics: GameObjects.Graphics, appearance: CharacterAppearanceDefinition): void {
    const seated = isSeatedAppearance(appearance);
    const floorY = seated ? 27 : 31;
    const heightOffset = appearance.heightVariant === 'short' ? 2 : appearance.heightVariant === 'tall' ? -1 : 0;
    const bodyWidth = appearance.bodySilhouette === 'narrow' ? 8 : appearance.bodySilhouette === 'broad' ? 12 : 10;
    const torsoX = 12 - Math.floor(bodyWidth / 2);
    const torsoY = (seated ? 15 : 14) + heightOffset;
    const headY = torsoY - 8;
    const rearFacing = appearance.facing.startsWith('rear');
    const looksRight = appearance.facing.endsWith('right');
    const skinPalette = skin[appearance.skinTone];
    const clothes = palette[appearance.primaryPalette];
    const secondary = palette[appearance.secondaryPalette];
    const accent = palette[appearance.departmentAccent];
    const hair = hairColors[appearance.hairColor];

    drawShadow(graphics, appearance, floorY);

    if (seated) {
        graphics.fillStyle(0x24282b).fillRect(7, torsoY + 9, 10, 6);
        graphics.fillStyle(0x4c5c63).fillRect(8, torsoY + 8, 8, 4);
        graphics.fillStyle(secondary.shade).fillRect(7, floorY - 4, 4, 3).fillRect(14, floorY - 4, 4, 3);
    } else {
        const legTop = torsoY + 9;
        graphics.fillStyle(secondary.shade).fillRect(torsoX + 1, legTop, 4, floorY - legTop).fillRect(torsoX + bodyWidth - 5, legTop, 4, floorY - legTop);
        graphics.fillStyle(0x222326).fillRect(torsoX, floorY - 2, 5, 2).fillRect(torsoX + bodyWidth - 5, floorY - 2, 5, 2);
    }

    graphics.fillStyle(clothes.shade).fillRect(torsoX - 1, torsoY + 2, bodyWidth + 2, seated ? 9 : 11);
    graphics.fillStyle(clothes.base).fillRect(torsoX, torsoY, bodyWidth, seated ? 9 : 10);
    graphics.fillStyle(clothes.light).fillRect(looksRight ? torsoX + bodyWidth - 2 : torsoX + 1, torsoY + 1, 2, 6);
    if (appearance.clothing === 'blazer' || appearance.clothing === 'executive') {
        graphics.fillStyle(secondary.light).fillRect(11, torsoY + 1, 2, 7);
        graphics.fillStyle(accent.light).fillRect(12, torsoY + 2, 1, 5);
    } else if (appearance.clothing === 'technical' || appearance.clothing === 'laboratory' || appearance.clothing === 'sandbox') {
        graphics.fillStyle(accent.base).fillRect(torsoX + 1, torsoY + 6, bodyWidth - 2, 2);
    } else if (appearance.clothing === 'casual-jacket' || appearance.clothing === 'security') {
        graphics.fillStyle(accent.shade).fillRect(torsoX, torsoY + 1, 2, 8).fillRect(torsoX + bodyWidth - 2, torsoY + 1, 2, 8);
    }

    const armY = appearance.pose.includes('presentation') || appearance.pose.includes('briefing') ? torsoY + 1 : torsoY + 3;
    graphics.fillStyle(clothes.shade).fillRect(torsoX - 3, armY, 3, 6).fillRect(torsoX + bodyWidth, armY, 3, 6);
    graphics.fillStyle(skinPalette.base).fillRect(torsoX - 3, armY + 5, 3, 3).fillRect(torsoX + bodyWidth, armY + 5, 3, 3);
    if (appearance.pose === 'standing-presentation') graphics.fillStyle(skinPalette.base).fillRect(looksRight ? torsoX + bodyWidth + 2 : torsoX - 4, armY - 3, 2, 5);

    graphics.fillStyle(skinPalette.shade).fillRect(7, headY + 1, 10, 8);
    graphics.fillStyle(skinPalette.base).fillRect(8, headY, 9, 8);
    graphics.fillStyle(skinPalette.light).fillRect(looksRight ? 13 : 9, headY + 2, 3, 2);
    if (!rearFacing) graphics.fillStyle(0x2b2523).fillRect(looksRight ? 14 : 10, headY + 4, 1, 1);
    drawHair(graphics, appearance.hairStyle, hair, 12, headY, rearFacing);

    if (appearance.glasses !== 'none' && !rearFacing) {
        graphics.fillStyle(0x24292d).fillRect(9, headY + 3, 3, 2).fillRect(13, headY + 3, 3, 2).fillRect(12, headY + 3, 1, 1);
    }
    if (appearance.facialHair !== 'none' && !rearFacing) {
        const beardHeight = appearance.facialHair === 'beard' ? 3 : 1;
        graphics.fillStyle(hair.base).fillRect(10, headY + 6, 6, beardHeight);
    }
    drawBadge(graphics, appearance, torsoX, torsoY);
    drawAccessory(graphics, appearance, 12, torsoY);
    graphics.fillStyle(accent.light).fillRect(looksRight ? torsoX : torsoX + bodyWidth - 2, torsoY + 8, 2, 1);
}

export function ensureOccupantTexture(scene: Scene, appearance: CharacterAppearanceDefinition): string {
    const key = occupantTextureKey(appearance);
    const size = isSeatedAppearance(appearance) ? SEATED_SPRITE_SIZE : STANDING_SPRITE_SIZE;
    createTexture(scene, key, size.width, size.height, (graphics) => drawCharacter(graphics, appearance));
    return key;
}

export { isSeatedAppearance, OCCUPANT_FLOOR_ANCHOR, OCCUPANT_RENDER_SCALE } from './occupantSpriteModel';
