# Jarvis Agent Ecosystem (Phase 1)

## Project Purpose
This repository is the visual office prototype for the standalone Jarvis Agent Ecosystem. It uses Phaser to render a digital operations office, demonstrating agent locations, movements, and interactions in a data-driven way, driven by React controls.

**Note:** The office is a visual simulation prototype. It is not a game. Phaser acts purely as a renderer, not as the source of truth for agent decisions or real AI tasks.

## Capabilities
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
- **Domain Layer (`src/domain`, `src/types`)**: Holds authoritative state types, office geometry logic, and seed data.
- **React Layer (`src/App.tsx`, `src/components`)**: Renders the developer control panel and informational interface. Handles interactions like selecting and directing agents.
- **Phaser Rendering Layer (`src/game/scenes/OfficeScene.ts`)**: Render only logic. No business logic! Receives events to update sprites visually.

## Future Direction
- Implement WebSocket integration to feed real event data to this prototype from a FastAPI backend.
- Bring in final pixel-art asset sprite sheets.

## Commands

- `npm run dev` - Starts the development server with Hot Module Replacement (HMR).
- `npm run build` - Produces a production-ready build into the `dist` folder.
- `npm run lint` (using eslint, if configured).
- `tsc` - Run TypeScript compiler checks.

## Interacting with the prototype
1. Click an agent in the canvas (left) or select them in the React dropdown (right).
2. Use the "Send to..." buttons or the dropdown to dispatch the selected agent.
3. Use the Reset button to return all agents to their home desks.
