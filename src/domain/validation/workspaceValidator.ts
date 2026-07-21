import { WorkspaceDefinition } from '../../types/building';

export interface WorkspaceValidationResult {
    isValid: boolean;
    errors: string[];
}

export function validateFloor1Workspaces(workspaces: WorkspaceDefinition[]): WorkspaceValidationResult {
    const errors: string[] = [];

    const permanentWorkspaces = workspaces.filter(w => w.permanentAssignmentAllowed);
    if (permanentWorkspaces.length !== 28) {
        errors.push(`Expected exactly 28 permanent workspaces, found ${permanentWorkspaces.length}.`);
    }

    const occupiedPermanent = permanentWorkspaces.filter(w => w.occupancyState === 'occupied');
    if (occupiedPermanent.length !== 24) {
        errors.push(`Expected exactly 24 occupied permanent workspaces, found ${occupiedPermanent.length}.`);
    }

    const vacantPermanent = permanentWorkspaces.filter(w => w.occupancyState === 'vacant');
    if (vacantPermanent.length !== 4) {
        errors.push(`Expected exactly 4 vacant permanent workspaces, found ${vacantPermanent.length}.`);
    }

    const operationalConsoles = workspaces.filter(w => w.workspaceType === 'operational-console');
    if (operationalConsoles.length !== 16) {
        errors.push(`Expected exactly 16 operational consoles (12 Ops + 4 Nexus), found ${operationalConsoles.length}.`);
    }

    const temporaryDesks = workspaces.filter(w => w.workspaceType === 'temporary-desk');
    if (temporaryDesks.length !== 8) {
        errors.push(`Expected exactly 8 temporary desks, found ${temporaryDesks.length}.`);
    }

    const sandboxSlots = workspaces.filter(w => w.workspaceType === 'sandbox-slot');
    if (sandboxSlots.length !== 4) {
        errors.push(`Expected exactly 4 sandbox slots, found ${sandboxSlots.length}.`);
    }

    // Unique ID check
    const idSet = new Set<string>();
    workspaces.forEach(w => {
        if (idSet.has(w.id)) errors.push(`Duplicate Workspace ID: ${w.id}`);
        idSet.add(w.id);
    });

    return {
        isValid: errors.length === 0,
        errors
    };
}
