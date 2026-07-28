import { describe, expect, it } from 'vitest';
import { resolveEntityAccessState } from '../access';
import { NON_PRODUCTION_OVERLAY } from '../sampleOverlay';
import { OfficeEntity } from '../types';

const accessLight = NON_PRODUCTION_OVERLAY.entities.find(entity => entity.type === 'access_light')!;
const door = NON_PRODUCTION_OVERLAY.entities.find(entity => entity.type === 'door')!;

function withoutDirectAccess(entity: OfficeEntity): Omit<OfficeEntity, 'accessState' | 'accessPolicy'> {
    const copy = { ...entity };
    delete copy.accessState;
    delete copy.accessPolicy;
    return copy;
}

describe('entity access-state resolution', () => {
    it('resolves an access light from accessPolicy.state', () => {
        const entity: OfficeEntity = { ...withoutDirectAccess(accessLight), accessPolicy: { state: 'blue' } };
        expect(resolveEntityAccessState(entity)).toBe('blue');
    });

    it('resolves a door from door.currentState', () => {
        const entity: OfficeEntity = {
            ...withoutDirectAccess(door),
            door: { ...door.door!, currentState: 'red' },
        };
        expect(resolveEntityAccessState(entity)).toBe('red');
    });

    it('gives explicit accessState precedence over policy and door state', () => {
        const entity: OfficeEntity = {
            ...door,
            accessState: 'green',
            accessPolicy: { state: 'yellow' },
            door: { ...door.door!, currentState: 'red' },
        };
        expect(resolveEntityAccessState(entity)).toBe('green');
    });

    it('returns undefined when no access state is declared', () => {
        expect(resolveEntityAccessState(withoutDirectAccess(accessLight) as OfficeEntity)).toBeUndefined();
    });
});
