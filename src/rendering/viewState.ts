export type EffectsMode = 'on' | 'reduced' | 'off';
export type LabelMode = 'auto' | 'minimal' | 'on';

export interface ViewPreferences {
    readonly effects: EffectsMode;
    readonly labels: LabelMode;
    readonly occupants: boolean;
    readonly workspaceStates: boolean;
    readonly accessIndicators: boolean;
    readonly roomHighlights: boolean;
}

export const DEFAULT_VIEW_PREFERENCES: ViewPreferences = {
    effects: 'on',
    labels: 'auto',
    occupants: true,
    workspaceStates: true,
    accessIndicators: true,
    roomHighlights: true,
};
