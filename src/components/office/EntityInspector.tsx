import { resolveEntityAccessState } from '../../office/access';
import { geometryCenter, geometrySummary } from '../../office/geometry';
import { AccessState, OfficeEntity } from '../../office/types';

const ACCESS_MEANING: Record<AccessState, string> = {
    green: 'General access',
    blue: 'Reserved or member-restricted',
    yellow: 'Temporarily reserved',
    red: 'Blocked',
};

export function EntityInspector({ entity, onFocus }: Readonly<{ entity: OfficeEntity | null; onFocus: () => void }>) {
    if (!entity) {
        return <section className="engine-panel"><h2>Inspector</h2><p className="muted">Select an interaction region to inspect it.</p></section>;
    }
    const access = resolveEntityAccessState(entity);
    const center = geometryCenter(entity.geometry);
    const rows: readonly [string, string][] = [
        ['ID', entity.id],
        ['Name', entity.name],
        ['Type', entity.type.replace('_', ' ')],
        ['Layer', entity.sourceLayer],
        ['Geometry', geometrySummary(entity.geometry)],
        ['Source center', `${center.x.toFixed(1)}, ${center.y.toFixed(1)} px`],
        ['Tags', entity.tags?.join(', ') || 'None'],
        ['Access', access ? `${access} — ${ACCESS_MEANING[access]}` : 'Not specified'],
        ['Seat priority', entity.seatPriority === 'yellow' ? 'Yellow — priority seating' : entity.seatPriority === 'red' ? 'Red — standard seating' : 'Not applicable'],
        ['Linked entities', entity.linkedEntityIds?.join(', ') || 'None'],
    ];
    return (
        <section className="engine-panel">
            <div className="panel-heading">
                <h2>Inspector</h2>
                <button type="button" onClick={onFocus}>Focus</button>
            </div>
            <dl className="inspector-grid">
                {rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
            </dl>
            <details>
                <summary>Metadata</summary>
                <dl className="metadata-list">
                    {Object.entries(entity.metadata).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{String(value)}</dd></div>)}
                </dl>
            </details>
        </section>
    );
}
