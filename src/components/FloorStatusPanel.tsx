import { floor1Definition } from '../domain/floors/floor-1';
import { createRenderPlan } from '../rendering/renderPlan';

export function FloorStatusPanel() {
    const permanent = floor1Definition.workspaces.filter((workspace) => workspace.permanentAssignmentAllowed);
    const totals = {
        agents: floor1Definition.permanentAgents.length,
        capacity: permanent.length,
        vacancies: permanent.filter((workspace) => workspace.occupancyState === 'vacant').length,
        temporary: floor1Definition.workspaces.filter((workspace) => workspace.workspaceType === 'temporary').length,
        sandbox: floor1Definition.rooms.filter((room) => room.roomType === 'sandbox-cell').length,
    };
    const renderCommandCount = createRenderPlan(floor1Definition).length;

    return (
        <aside className="floor-status-panel" aria-label="Floor 1 status" data-render-command-count={renderCommandCount}>
            <div className="status-title">JARVIS HQ</div>
            <div className="status-subtitle">FLOOR 1 · FOUNDING COMMAND</div>
            <dl className="status-grid">
                <dt>Permanent Agents</dt><dd>{totals.agents}</dd>
                <dt>Capacity</dt><dd>{totals.capacity}</dd>
                <dt>Vacancies</dt><dd>{totals.vacancies}</dd>
                <dt>Temporary Desks</dt><dd>{totals.temporary}</dd>
                <dt>Sandbox Cells</dt><dd>{totals.sandbox}</dd>
                <dt>Floor 1</dt><dd className="operational">Operational</dd>
                <dt>Floor 2</dt><dd className="construction">Under Construction</dd>
            </dl>
            <div className="access-key" aria-label="Access level colors">
                <span><i className="key-general" />General</span>
                <span><i className="key-department" />Department</span>
                <span><i className="key-restricted" />Restricted</span>
                <span><i className="key-high" />Highly Restricted</span>
                <span><i className="key-containment" />Escorted</span>
            </div>
        </aside>
    );
}
