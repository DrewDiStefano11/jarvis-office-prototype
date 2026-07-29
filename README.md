# Jarvis Office Prototype 

## Project Purpose
This repository is the visual office prototype for the standalone Jarvis Agent Ecosystem. It uses Phaser to render a digital operations office, demonstrating agent locations, movements, and interactions in a data-driven way, driven by React controls.

**Note:** The office is a visual simulation prototype. It is not a game. Phaser acts purely as a renderer, not as the source of truth for agent decisions or real AI tasks.

## Capabilities
- **Interactive 8K Office Engine**: Exact 8192×5460 source-space rendering with pan, zoom, touch pinch, selection, debug overlays, and runtime-validated annotation data.
- **Explicit Asset Failures**: Missing or dimensionally invalid production imagery is reported; the 1024×768 template background is never silently substituted.
- **React-to-Phaser Bridge**: State is managed externally via React, communicating rendering updates to Phaser via an EventBus.
- **Top-Down Office**: Procedurally rendered pixel-art style office, including an Executive Department, Research & Knowledge, Governance & Security, and more.
- **Agent Simulation**: 5 placeholder agents (Jarvis, Atlas, Scout, Archive, Sentinel) each with unique domain data.
- **Data-Driven Movement**: Deterministic, waypoint-based movement connecting desks and stations without complex A* or physics overhead.
- **React Control Panel**: A fully decoupled interface to select agents and direct movement.

## Explicit Limitations
- No backend included (this is a frontend prototype).
- No real AI models (Ollama, LangGraph, etc.).
- No databases or complex scheduling integrations.
- Minimal graphical assets (currently utilizing procedural shapes).
- Not designed for complex physics or 3D.
- Movement is simple deterministic waypoints without collision.

## Architecture
- **Office Engine (`src/office`, `src/components/office`)**: Renderer-independent coordinates, schema, ordering, interaction helpers, asset manifest, React viewport, SVG overlays, and inspector. See [the engine guide](docs/INTERACTIVE_OFFICE_ENGINE.md).
- **Domain Layer (`src/domain`, `src/types`)**: Holds authoritative state types, office geometry logic, and seed data.
- **React Layer (`src/App.tsx`, `src/components`)**: Renders the developer control panel and informational interface. Handles interactions like selecting and directing agents.
- **Phaser Rendering Layer (`src/game/scenes/OfficeScene.ts`)**: Render only logic. No business logic! Receives events to update sprites visually.

## Future Direction
- Implement WebSocket integration to feed real event data to this prototype from a FastAPI backend.
- Bring in final pixel-art asset sprite sheets.

## Commands

- `npm run dev` - Starts the development server with Hot Module Replacement (HMR).
- `npm run build` - Produces a production-ready build into the `dist` folder.
- `npm run lint` - Runs ESLint over `src`.
- `npm run typecheck` - Runs the strict TypeScript compiler check.
- `npm test` - Runs all Vitest suites once.
- `npm run inventory:sprites` - Writes the canonical sprite source inventory.
- `npm run generate:sprites` - Atomically generates validated runtime sprite assets and the typed manifest input.
- `npm run check:sprites-generated` - Regenerates sprite outputs in a temporary directory and fails on drift.

## Interacting with the prototype
1. Use the mouse wheel or trackpad to zoom around the pointer; drag to pan.
2. Select an interaction region in the office or with the keyboard to inspect it.
3. Enable Debug overlays to inspect layers, IDs, source coordinates, hover, and selection.
4. Use Fit or Reset to return to the centered full-office view.

Development-only sprite review:

- `?visualLab=agent-sprites` opens the sprite inventory and animation laboratory.
- `?spriteDemo=agents` overlays deterministic agent demonstrations without creating Floor 1 assignments.

See [the agent sprite pipeline](docs/AGENT_SPRITE_PIPELINE.md) for source classifications, fallbacks, validation, and limitations.

Use the application view switch to open the earlier Phaser agent simulation. Its React/domain state and movement controls remain available while the interactive office engine is developed.
