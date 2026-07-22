import { GameObjects, Scene, Textures } from 'phaser';
import type { VisualLabFacing, VisualLabFurnitureType, VisualLabProfile, VisualLabRole } from './types';
import { labCharacterTextureKey, labFurnitureTextureKey } from './textureKeys';

const px = (value: number): number => Math.max(1, Math.round(value));

type Point = { readonly x: number; readonly y: number };

function polygon(graphics: GameObjects.Graphics, color: number, points: readonly Point[], alpha = 1): void {
    graphics.fillStyle(color, alpha).beginPath().moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((point) => graphics.lineTo(point.x, point.y));
    graphics.closePath().fillPath();
}

function createTexture(scene: Scene, key: string, width: number, height: number, draw: (graphics: GameObjects.Graphics) => void): string {
    if (scene.textures.exists(key)) return key;
    const graphics = scene.add.graphics();
    draw(graphics);
    graphics.generateTexture(key, width, height);
    graphics.destroy();
    scene.textures.get(key).setFilter(Textures.FilterMode.NEAREST);
    return key;
}

interface RolePalette {
    readonly skin: number;
    readonly skinShadow: number;
    readonly hair: number;
    readonly hairLight: number;
    readonly primary: number;
    readonly primaryLight: number;
    readonly secondary: number;
    readonly accent: number;
    readonly shoe: number;
}

const ROLE_PALETTES: Readonly<Record<VisualLabRole, RolePalette>> = {
    permanent: { skin: 0xc98558, skinShadow: 0x8d543c, hair: 0x37251d, hairLight: 0x6a4330, primary: 0x324f68, primaryLight: 0x4e7794, secondary: 0xd8dde0, accent: 0x5fd7e7, shoe: 0x1e2429 },
    seated: { skin: 0xe2a16f, skinShadow: 0xa56647, hair: 0x211b18, hairLight: 0x4b3427, primary: 0x385c76, primaryLight: 0x5b87a3, secondary: 0xe6d9bd, accent: 0x65cfe0, shoe: 0x1f252a },
    operations: { skin: 0x9a6044, skinShadow: 0x694131, hair: 0x16191d, hairLight: 0x343c43, primary: 0x203a50, primaryLight: 0x355e7c, secondary: 0x28343d, accent: 0x36e2ee, shoe: 0x151b20 },
    executive: { skin: 0xd89a68, skinShadow: 0x945c40, hair: 0x5b321f, hairLight: 0x915638, primary: 0x2b364c, primaryLight: 0x465775, secondary: 0xede2ca, accent: 0xdca944, shoe: 0x1e1d22 },
    security: { skin: 0x764b3b, skinShadow: 0x4d3028, hair: 0x141519, hairLight: 0x31343b, primary: 0x303237, primaryLight: 0x50545b, secondary: 0x682f36, accent: 0xdc6157, shoe: 0x17191d },
    temporary: { skin: 0xf0b57f, skinShadow: 0xa86b49, hair: 0xb46a38, hairLight: 0xe39958, primary: 0x59656a, primaryLight: 0x78878b, secondary: 0x30383b, accent: 0xe5b74e, shoe: 0x292b2c },
    visitor: { skin: 0xbd7a57, skinShadow: 0x7c4c39, hair: 0x40271d, hairLight: 0x75503a, primary: 0x6a574a, primaryLight: 0x8e7562, secondary: 0xd6c6ac, accent: 0x79b86e, shoe: 0x282421 },
    sandbox: { skin: 0xb87959, skinShadow: 0x754838, hair: 0x3c2055, hairLight: 0x74458e, primary: 0x51345e, primaryLight: 0x77518a, secondary: 0x272a38, accent: 0xe38b3f, shoe: 0x20202a },
    meeting: { skin: 0xd49a72, skinShadow: 0x936249, hair: 0x57412f, hairLight: 0x8a684c, primary: 0x4b5369, primaryLight: 0x6e7895, secondary: 0xe3d7c4, accent: 0x9f79c7, shoe: 0x25262d },
    presenter: { skin: 0x8a5943, skinShadow: 0x5c392d, hair: 0x22252a, hairLight: 0x474d56, primary: 0x3c5e58, primaryLight: 0x5d867e, secondary: 0xd7e0d4, accent: 0xf0a64c, shoe: 0x1d2423 },
};

export function ensureLabCharacterTexture(scene: Scene, profile: VisualLabProfile, role: VisualLabRole, facing: VisualLabFacing): string {
    const seated = ['seated', 'operations', 'meeting'].includes(role);
    const size = seated ? profile.assets.seated : profile.assets.standing;
    const key = labCharacterTextureKey(profile, role, facing);
    return createTexture(scene, key, size.width, size.height, (graphics) => {
        const palette = ROLE_PALETTES[role];
        const width = size.width;
        const height = size.height;
        const detail = profile.detailLevel;
        const unit = Math.max(1, Math.round(width / 24));
        const center = Math.floor(width / 2);
        const looksRight = facing === 'front-right';
        const shadowWidth = px(width * (seated ? 0.56 : 0.46));
        graphics.fillStyle(0x0c1012, 0.42).fillEllipse(center, height - px(height * 0.06), shadowWidth, px(height * 0.08));

        const shoeY = height - px(height * 0.12);
        const legTop = seated ? px(height * 0.57) : px(height * 0.60);
        const legWidth = px(width * 0.17);
        const legGap = Math.max(unit, px(width * 0.07));
        const leftLeg = center - legGap - legWidth;
        const rightLeg = center + legGap;
        const legHeight = Math.max(3, shoeY - legTop);
        graphics.fillStyle(palette.secondary).fillRect(leftLeg, legTop, legWidth, legHeight).fillRect(rightLeg, legTop, legWidth, legHeight);
        graphics.fillStyle(palette.primary).fillRect(leftLeg, legTop, Math.max(unit, px(legWidth * 0.34)), legHeight).fillRect(rightLeg, legTop, Math.max(unit, px(legWidth * 0.34)), legHeight);
        graphics.fillStyle(palette.shoe).fillRect(leftLeg - unit, shoeY, legWidth + unit * 2, Math.max(2, px(height * 0.07))).fillRect(rightLeg - unit, shoeY, legWidth + unit * 2, Math.max(2, px(height * 0.07)));

        const torsoY = px(height * 0.30);
        const torsoWidth = px(width * (role === 'security' ? 0.58 : 0.50));
        const torsoHeight = Math.max(5, legTop - torsoY + (seated ? px(height * 0.07) : 0));
        const torsoX = center - Math.floor(torsoWidth / 2);
        graphics.fillStyle(0x15191d).fillRect(torsoX - unit, torsoY + unit, torsoWidth + unit * 2, torsoHeight);
        graphics.fillStyle(palette.primary).fillRect(torsoX, torsoY, torsoWidth, torsoHeight);
        graphics.fillStyle(palette.primaryLight).fillRect(torsoX + unit, torsoY + unit, Math.max(unit, px(torsoWidth * 0.18)), torsoHeight - unit * 2);
        if (detail > 0) {
            const lapelWidth = Math.max(unit, px(torsoWidth * 0.22));
            polygon(graphics, palette.secondary, [
                { x: center - unit, y: torsoY + unit }, { x: center - lapelWidth, y: torsoY + unit },
                { x: center - unit, y: torsoY + px(torsoHeight * 0.42) },
            ]);
            polygon(graphics, palette.secondary, [
                { x: center + unit, y: torsoY + unit }, { x: center + lapelWidth, y: torsoY + unit },
                { x: center + unit, y: torsoY + px(torsoHeight * 0.42) },
            ]);
            graphics.fillStyle(palette.accent).fillRect(center - Math.floor(unit / 2), torsoY + unit * 2, unit, Math.max(2, px(torsoHeight * 0.32)));
        }
        if (detail > 1) {
            graphics.fillStyle(0x101317, 0.45).fillRect(torsoX + unit, torsoY + torsoHeight - unit * 2, torsoWidth - unit * 2, unit);
            graphics.fillStyle(palette.accent).fillRect(looksRight ? torsoX + torsoWidth - unit * 3 : torsoX + unit, torsoY + px(torsoHeight * 0.56), unit * 2, unit * 2);
        }

        const armWidth = Math.max(unit * 2, px(width * 0.11));
        const armHeight = seated ? px(height * 0.19) : px(height * 0.27);
        const armY = torsoY + px(torsoHeight * 0.10);
        graphics.fillStyle(palette.primary).fillRect(torsoX - armWidth + unit, armY, armWidth, armHeight).fillRect(torsoX + torsoWidth - unit, armY, armWidth, armHeight);
        graphics.fillStyle(palette.skin).fillRect(torsoX - armWidth + unit, armY + armHeight, armWidth, Math.max(unit * 2, px(height * 0.05))).fillRect(torsoX + torsoWidth - unit, armY + armHeight, armWidth, Math.max(unit * 2, px(height * 0.05)));
        if (role === 'presenter') {
            const raisedX = looksRight ? torsoX + torsoWidth : torsoX - armWidth;
            graphics.fillStyle(palette.primary).fillRect(raisedX, armY - px(height * 0.08), armWidth, armHeight);
            graphics.fillStyle(palette.skin).fillRect(raisedX, armY - px(height * 0.11), armWidth, unit * 3);
        }

        const headWidth = px(width * 0.35);
        const headHeight = px(height * 0.22);
        const headX = center - Math.floor(headWidth / 2);
        const headY = Math.max(unit * 2, torsoY - headHeight + unit * 2);
        graphics.fillStyle(palette.skinShadow).fillRect(headX - unit, headY + unit, headWidth + unit * 2, headHeight);
        graphics.fillStyle(palette.skin).fillRect(headX, headY, headWidth, headHeight);
        const hairHeight = Math.max(unit * 2, px(headHeight * (role === 'executive' ? 0.30 : role === 'sandbox' ? 0.42 : 0.36)));
        graphics.fillStyle(palette.hair).fillRect(headX - unit, headY - unit, headWidth + unit * 2, hairHeight);
        graphics.fillStyle(palette.hairLight).fillRect(headX, headY, Math.max(unit * 2, px(headWidth * 0.44)), unit * (detail > 1 ? 2 : 1));
        if (role === 'temporary') graphics.fillStyle(palette.hairLight).fillRect(headX - unit * 2, headY + unit, unit * 2, hairHeight + unit * 2);
        if (role === 'security') graphics.fillStyle(palette.hair).fillRect(headX - unit * 2, headY, unit * 2, headHeight - unit);
        if (detail > 0) {
            graphics.fillStyle(0x2a2521).fillRect(looksRight ? center + unit : center - unit * 2, headY + px(headHeight * 0.50), unit, unit);
            graphics.fillStyle(palette.skinShadow).fillRect(looksRight ? headX : headX + headWidth - unit, headY + headHeight - unit * 2, unit, unit * 2);
        }
        if (detail > 2) graphics.fillStyle(0xf1c58f).fillRect(headX + unit, headY + unit * 2, unit * 2, unit);

        if (role === 'operations') {
            graphics.fillStyle(0x1b232a).fillRect(headX - unit * 2, headY + unit, unit * 2, headHeight - unit);
            graphics.fillStyle(palette.accent).fillRect(headX - unit * 3, headY + px(headHeight * 0.55), unit * 3, unit);
        }
        if (role === 'visitor') graphics.fillStyle(0xe8d595).fillRect(torsoX + torsoWidth - unit * 3, torsoY + unit * 2, unit * 2, unit * 3);
        if (role === 'sandbox') graphics.fillStyle(palette.accent, 0.9).fillRect(torsoX - unit, torsoY + torsoHeight - unit * 2, torsoWidth + unit * 2, unit);
        if (detail > 1 && ['executive', 'permanent', 'temporary'].includes(role)) {
            const accessoryX = looksRight ? torsoX + torsoWidth + armWidth : torsoX - armWidth * 2;
            graphics.fillStyle(0x5b3a27).fillRect(accessoryX, armY + armHeight - unit, armWidth * 2, px(height * 0.16));
            graphics.fillStyle(0xc68d49).fillRect(accessoryX + unit, armY + armHeight, armWidth * 2 - unit * 2, unit);
        }
    });
}

export function ensureLabFurnitureTexture(scene: Scene, profile: VisualLabProfile, type: VisualLabFurnitureType, paletteKey: string, accent: number, wood: number, upholstery: number, screen: number): string {
    const size = type === 'door' || type === 'secure-reader' ? profile.assets.architecture : profile.assets.furniture;
    const key = labFurnitureTextureKey(profile, type, paletteKey);
    return createTexture(scene, key, size, size, (graphics) => {
        const s = size;
        const detail = profile.detailLevel;
        const u = Math.max(1, Math.round(s / 32));
        const dark = 0x242126;
        const mid = 0x4b4543;
        const light = 0xd7ba87;
        const top = [
            { x: px(s * 0.10), y: px(s * 0.33) }, { x: px(s * 0.48), y: px(s * 0.16) },
            { x: px(s * 0.90), y: px(s * 0.34) }, { x: px(s * 0.51), y: px(s * 0.53) },
        ];
        const frontY = px(s * 0.68);
        const drawDesk = (executive: boolean): void => {
            polygon(graphics, dark, top.map((point) => ({ x: point.x, y: point.y + u * 2 })));
            polygon(graphics, executive ? wood : accent, top);
            polygon(graphics, executive ? 0x59331f : mid, [top[0], top[3], { x: top[3].x, y: frontY }, { x: top[0].x, y: px(s * 0.48) }]);
            polygon(graphics, executive ? 0x6d3e22 : 0x39444a, [top[3], top[2], { x: top[2].x, y: px(s * 0.49) }, { x: top[3].x, y: frontY }]);
            graphics.fillStyle(dark).fillRect(px(s * 0.17), frontY - u, px(s * 0.10), px(s * 0.23)).fillRect(px(s * 0.73), px(s * 0.48), px(s * 0.10), px(s * 0.25));
            if (detail > 0) {
                graphics.fillStyle(light).fillRect(px(s * 0.20), px(s * 0.36), px(s * 0.20), u).fillRect(px(s * 0.52), px(s * 0.27), px(s * 0.18), u);
                graphics.fillStyle(0xe8ddc4).fillRect(px(s * 0.22), px(s * 0.38), px(s * 0.13), u * 2);
            }
            if (detail > 1) {
                graphics.fillStyle(0x34251d).fillRect(px(s * 0.58), px(s * 0.55), px(s * 0.18), u).fillRect(px(s * 0.58), px(s * 0.60), px(s * 0.18), u);
                graphics.fillStyle(accent).fillRect(px(s * 0.70), px(s * 0.55), u, u).fillRect(px(s * 0.70), px(s * 0.60), u, u);
                graphics.fillStyle(0x15191c).fillRect(px(s * 0.43), px(s * 0.39), px(s * 0.18), u * 2);
            }
            if (detail > 2) graphics.fillStyle(0x9f6e3f).fillRect(px(s * 0.13), px(s * 0.42), px(s * 0.26), u);
        };
        if (type === 'desk' || type === 'executive-desk') drawDesk(type === 'executive-desk');
        else if (type === 'chair' || type === 'technical-chair' || type === 'meeting-chair') {
            const chairColor = type === 'technical-chair' ? 0x304b5d : type === 'meeting-chair' ? 0x65516d : upholstery;
            polygon(graphics, dark, [{ x: px(s * 0.26), y: px(s * 0.42) }, { x: px(s * 0.51), y: px(s * 0.31) }, { x: px(s * 0.75), y: px(s * 0.42) }, { x: px(s * 0.51), y: px(s * 0.56) }]);
            polygon(graphics, chairColor, [{ x: px(s * 0.29), y: px(s * 0.40) }, { x: px(s * 0.51), y: px(s * 0.31) }, { x: px(s * 0.72), y: px(s * 0.41) }, { x: px(s * 0.51), y: px(s * 0.52) }]);
            polygon(graphics, chairColor, [{ x: px(s * 0.27), y: px(s * 0.38) }, { x: px(s * 0.28), y: px(s * 0.13) }, { x: px(s * 0.49), y: px(s * 0.24) }, { x: px(s * 0.49), y: px(s * 0.50) }]);
            graphics.fillStyle(dark).fillRect(px(s * 0.47), px(s * 0.53), u * 2, px(s * 0.20));
            graphics.fillStyle(mid).fillRect(px(s * 0.31), px(s * 0.69), px(s * 0.42), u * 2);
            if (detail > 0) graphics.fillStyle(accent).fillRect(px(s * 0.31), px(s * 0.19), u * 2, px(s * 0.16));
            if (detail > 1) graphics.fillStyle(light).fillRect(px(s * 0.24), px(s * 0.47), u * 2, u * 2).fillRect(px(s * 0.72), px(s * 0.43), u * 2, u * 2);
        } else if (type === 'monitor') {
            polygon(graphics, dark, [{ x: px(s * 0.12), y: px(s * 0.28) }, { x: px(s * 0.55), y: px(s * 0.10) }, { x: px(s * 0.87), y: px(s * 0.25) }, { x: px(s * 0.47), y: px(s * 0.46) }]);
            polygon(graphics, screen, [{ x: px(s * 0.18), y: px(s * 0.29) }, { x: px(s * 0.55), y: px(s * 0.14) }, { x: px(s * 0.80), y: px(s * 0.26) }, { x: px(s * 0.47), y: px(s * 0.42) }]);
            graphics.fillStyle(dark).fillRect(px(s * 0.47), px(s * 0.43), u * 2, px(s * 0.18)).fillRect(px(s * 0.35), px(s * 0.60), px(s * 0.28), u * 2);
            if (detail > 0) graphics.fillStyle(0xd7fbff).fillRect(px(s * 0.35), px(s * 0.25), px(s * 0.22), u).fillRect(px(s * 0.28), px(s * 0.31), px(s * 0.35), u);
            if (detail > 2) graphics.fillStyle(accent).fillRect(px(s * 0.62), px(s * 0.24), u * 2, u * 2);
        } else if (type === 'console') {
            graphics.fillStyle(dark).fillRect(px(s * 0.06), px(s * 0.20), px(s * 0.88), px(s * 0.48));
            polygon(graphics, 0x3b4a52, [{ x: px(s * 0.05), y: px(s * 0.49) }, { x: px(s * 0.50), y: px(s * 0.32) }, { x: px(s * 0.95), y: px(s * 0.49) }, { x: px(s * 0.50), y: px(s * 0.68) }]);
            for (let index = 0; index < 3; index += 1) {
                const x = px(s * (0.10 + index * 0.28));
                graphics.fillStyle(0x10232b).fillRect(x, px(s * 0.14), px(s * 0.23), px(s * 0.20));
                graphics.fillStyle(screen).fillRect(x + u * 2, px(s * 0.18), px(s * 0.14), u * 2);
                if (detail > 1) graphics.fillStyle(0xc2f7ff).fillRect(x + u * 2, px(s * 0.25), px(s * 0.08), u);
            }
            graphics.fillStyle(accent).fillRect(px(s * 0.20), px(s * 0.48), u * 2, u * 2).fillRect(px(s * 0.74), px(s * 0.48), u * 2, u * 2);
            graphics.fillStyle(dark).fillRect(px(s * 0.16), px(s * 0.67), px(s * 0.12), px(s * 0.22)).fillRect(px(s * 0.72), px(s * 0.67), px(s * 0.12), px(s * 0.22));
        } else if (type === 'meeting-table') {
            polygon(graphics, dark, top.map((point) => ({ x: point.x, y: point.y + u * 3 })));
            polygon(graphics, wood, top);
            polygon(graphics, 0x54301f, [top[0], top[3], { x: top[3].x, y: frontY }, { x: top[0].x, y: px(s * 0.49) }]);
            polygon(graphics, 0x663a22, [top[3], top[2], { x: top[2].x, y: px(s * 0.49) }, { x: top[3].x, y: frontY }]);
            graphics.fillStyle(light).fillRect(px(s * 0.28), px(s * 0.34), px(s * 0.13), u * 2).fillRect(px(s * 0.55), px(s * 0.29), px(s * 0.12), u * 2);
            if (detail > 1) graphics.fillStyle(0xa56f40).fillRect(px(s * 0.18), px(s * 0.39), px(s * 0.55), u);
        } else if (type === 'shelf') {
            graphics.fillStyle(dark).fillRect(px(s * 0.14), px(s * 0.10), px(s * 0.72), px(s * 0.76));
            graphics.fillStyle(wood).fillRect(px(s * 0.18), px(s * 0.13), px(s * 0.64), px(s * 0.68));
            for (let row = 0; row < 3; row += 1) {
                const y = px(s * (0.28 + row * 0.20));
                graphics.fillStyle(0x3f291d).fillRect(px(s * 0.20), y, px(s * 0.60), u * 2);
                for (let book = 0; book < 5; book += 1) graphics.fillStyle([accent, 0x8b4e43, 0x6c8d5a, 0xc39a51, 0x607f9a][book]).fillRect(px(s * (0.23 + book * 0.10)), y - px(s * 0.10), u * 2, px(s * 0.10));
            }
        } else if (type === 'plant') {
            polygon(graphics, 0x6e3f27, [{ x: px(s * 0.31), y: px(s * 0.62) }, { x: px(s * 0.68), y: px(s * 0.62) }, { x: px(s * 0.61), y: px(s * 0.87) }, { x: px(s * 0.39), y: px(s * 0.87) }]);
            graphics.fillStyle(0x315d3c).fillEllipse(px(s * 0.50), px(s * 0.40), px(s * 0.28), px(s * 0.46));
            graphics.fillStyle(0x4f7d48).fillEllipse(px(s * 0.33), px(s * 0.43), px(s * 0.25), px(s * 0.30)).fillEllipse(px(s * 0.68), px(s * 0.39), px(s * 0.25), px(s * 0.34));
            graphics.fillStyle(0x78a65b).fillRect(px(s * 0.49), px(s * 0.17), u * 2, px(s * 0.43));
            if (detail > 1) graphics.fillStyle(0xa6c67c).fillRect(px(s * 0.29), px(s * 0.36), u * 2, px(s * 0.13)).fillRect(px(s * 0.66), px(s * 0.31), u * 2, px(s * 0.16));
        } else if (type === 'secure-reader') {
            graphics.fillStyle(dark).fillRect(px(s * 0.25), px(s * 0.10), px(s * 0.50), px(s * 0.78));
            graphics.fillStyle(0x5e696d).fillRect(px(s * 0.31), px(s * 0.16), px(s * 0.38), px(s * 0.61));
            graphics.fillStyle(accent).fillRect(px(s * 0.36), px(s * 0.24), px(s * 0.28), px(s * 0.16));
            graphics.fillStyle(0x182126).fillRect(px(s * 0.38), px(s * 0.54), px(s * 0.24), u * 3);
            if (detail > 1) graphics.fillStyle(0xe9f2e8).fillRect(px(s * 0.42), px(s * 0.28), px(s * 0.12), u);
        } else if (type === 'door') {
            graphics.fillStyle(dark).fillRect(px(s * 0.10), px(s * 0.05), px(s * 0.80), px(s * 0.88));
            graphics.fillStyle(mid).fillRect(px(s * 0.18), px(s * 0.12), px(s * 0.64), px(s * 0.76));
            graphics.fillStyle(0x6f5a4c).fillRect(px(s * 0.23), px(s * 0.17), px(s * 0.54), px(s * 0.66));
            graphics.fillStyle(light).fillRect(px(s * 0.69), px(s * 0.51), u * 3, u * 2);
            graphics.fillStyle(accent).fillRect(px(s * 0.11), px(s * 0.30), u * 3, px(s * 0.18));
            if (detail > 1) graphics.fillStyle(0x9f8a76).fillRect(px(s * 0.28), px(s * 0.22), px(s * 0.44), u);
        }
    });
}
