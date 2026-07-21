import { describe, expect, it } from 'vitest';
import { createFloorSummary } from '../domain/building/floorSummary';
import { inspectEntity } from '../domain/building/inspection';
import { floor1Definition } from '../domain/floors/floor-1';
import { calculateFitFloor, clampCameraScroll } from '../game/floorCamera';
import { calculateProjectedFloorBounds } from '../rendering/projectedBounds';

describe('second-pass visual foundation', () => {
    it('derives every status-card total from the active floor definition', () => {
        expect(createFloorSummary(floor1Definition)).toMatchObject({
            permanentAgents: 24,
            permanentCapacity: 28,
            vacancies: 4,
            temporaryDesks: 8,
            temporaryActive: 6,
            sandboxCells: 4,
            sandboxOccupancy: 4,
            visibleOccupants: 38,
            transientOccupants: 4,
            operationalConsoles: 16,
            operationsPods: 3,
            sharedSurgeConsoles: 8,
            vacantPermanentConsoles: 2,
            departments: 9,
            privateOffices: 12,
            conferenceRooms: 5,
            focusRooms: 4,
            expansionConnections: 2,
        });
    });

    it('fits projected bounds inside the viewport and reserves the status-card safe area', () => {
        const bounds = calculateProjectedFloorBounds(floor1Definition);
        const state = calculateFitFloor({
            viewport: { width: 1920, height: 1080 },
            bounds,
            safeArea: { top: 18, right: 18, bottom: 18, left: 308 },
            margin: 34,
            minZoom: 0.5,
            maxZoom: 1.28,
        });
        const screenLeft = (bounds.x - state.scroll.x) * state.zoom;
        const screenRight = (bounds.x + bounds.width - state.scroll.x) * state.zoom;
        expect(state.zoom).toBeGreaterThanOrEqual(0.5);
        expect(state.zoom).toBeLessThanOrEqual(1.28);
        expect(screenLeft).toBeGreaterThanOrEqual(308);
        expect(screenRight).toBeLessThanOrEqual(1920);
    });

    it('clamps extreme camera positions while preserving useful floor margins', () => {
        const bounds = calculateProjectedFloorBounds(floor1Definition);
        const clamped = clampCameraScroll(
            { x: -100000, y: 100000 },
            { width: 1366, height: 768 },
            1.4,
            bounds,
        );
        expect(clamped.x).toBeGreaterThan(bounds.x - 181);
        expect(clamped.y).toBeLessThan(bounds.y + bounds.height + 181);
    });

    it('builds source-backed inspector details for departments, rooms, occupants, and workspaces', () => {
        const department = inspectEntity(floor1Definition, 'department', floor1Definition.departments[0].id);
        const room = inspectEntity(floor1Definition, 'room', floor1Definition.rooms[0].id);
        const occupant = inspectEntity(floor1Definition, 'occupant', floor1Definition.occupants[0].id);
        const workspace = inspectEntity(floor1Definition, 'workspace', floor1Definition.workspaces[0].id);
        expect(department?.rows.some((row) => row.label === 'Visible Population')).toBe(true);
        expect(room?.rows.some((row) => row.label === 'Entrances')).toBe(true);
        expect(occupant?.rows.some((row) => row.label === 'Static Pose')).toBe(true);
        expect(workspace?.rows.some((row) => row.label === 'Assigned Agent')).toBe(true);
    });
});
