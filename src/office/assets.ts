export type OfficeAsset = Readonly<{
    id: string;
    path: string;
    kind: 'background' | 'sprite-sheet';
    required: boolean;
    pixelated?: boolean;
}>;

export const OFFICE_ASSETS = {
    background: {
        id: 'office-background-8k',
        path: 'assets/office/office-8192x5460.png',
        kind: 'background',
        required: true,
    },
    hologram: {
        id: 'central-blue-tube-hologram',
        path: 'assets/office/sprites/central-blue-tube-hologram.png',
        kind: 'sprite-sheet',
        required: false,
        pixelated: true,
    },
} as const satisfies Record<string, OfficeAsset>;
