export function isAgentSpriteVisualLabRequested(
    search: string,
    isDevelopment = import.meta.env.DEV,
): boolean {
    return isDevelopment && new URLSearchParams(search).get('visualLab') === 'agent-sprites';
}

export function isAgentSpriteDemoRequested(
    search: string,
    isDevelopment = import.meta.env.DEV,
): boolean {
    return isDevelopment && new URLSearchParams(search).get('spriteDemo') === 'agents';
}
