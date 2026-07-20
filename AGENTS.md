# Repository Guidelines for Agents

## Architecture Boundaries
1. **Phaser is a renderer only**. It must not make decisions about task assignments, real data management, or become the source of truth. All domain data, statuses, and core logic should live outside the canvas in React or the Domain layer.
2. **Data-Driven**. Ensure all new office locations and agents are configured via `src/domain/seed.ts` and not hardcoded directly in scene logic.

## Restrictions
- **No external AI integrations**: Do not add LangGraph, Ollama, Prefect, or other real AI dependencies.
- **No Backend**: This is a standalone frontend project.
- **No paid Phaser services or Editor dependencies**.
- **No WebGPU-only / 3D**.
- Changes must remain on feature branches; do not merge directly into main.

## Required Verifications
Before submitting any changes, you must run:
1. `npm install` (if dependencies changed)
2. `npx tsc --noEmit` (ensure TypeScript passes strictly)
3. `npx eslint src` (check linting issues)
4. `npm run build` (verify the production bundle completes)
