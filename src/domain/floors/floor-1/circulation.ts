import { roomId, zoneId } from '../../building/ids';
import type { SpaceId } from '../../building/ids';

export interface AccessFlowConnection {
    readonly from: SpaceId;
    readonly to: SpaceId;
    readonly controlled: boolean;
    readonly checkpoint: boolean;
    readonly escorted: boolean;
}

const z = (slug: string) => zoneId(`floor-1.zone.${slug}`);
const r = (slug: string) => roomId(`floor-1.room.${slug}`);

export const floor1AccessFlow: readonly AccessFlowConnection[] = [
    { from: z('public-vestibule'), to: z('reception-navigation'), controlled: false, checkpoint: false, escorted: false },
    { from: z('reception-navigation'), to: z('intake-stations'), controlled: false, checkpoint: false, escorted: false },
    { from: z('intake-stations'), to: z('secure-checkpoint'), controlled: true, checkpoint: true, escorted: false },
    { from: z('secure-checkpoint'), to: z('controlled-internal-lobby'), controlled: true, checkpoint: true, escorted: false },
    { from: z('controlled-internal-lobby'), to: z('temporary-route'), controlled: true, checkpoint: false, escorted: false },
    { from: z('controlled-internal-lobby'), to: z('production-route'), controlled: true, checkpoint: false, escorted: false },
    { from: z('controlled-internal-lobby'), to: z('secure-evaluation-route'), controlled: true, checkpoint: false, escorted: true },
    { from: z('secure-evaluation-route'), to: r('sandbox-transfer-corridor'), controlled: true, checkpoint: false, escorted: true },
    { from: r('sandbox-transfer-corridor'), to: r('containment-vestibule'), controlled: true, checkpoint: false, escorted: true },
    { from: r('containment-vestibule'), to: r('sandbox-cell-new-agent'), controlled: true, checkpoint: false, escorted: true },
    { from: r('containment-vestibule'), to: r('sandbox-cell-plugin'), controlled: true, checkpoint: false, escorted: true },
    { from: r('containment-vestibule'), to: r('sandbox-cell-model'), controlled: true, checkpoint: false, escorted: true },
    { from: r('containment-vestibule'), to: r('sandbox-cell-automation'), controlled: true, checkpoint: false, escorted: true },
];
