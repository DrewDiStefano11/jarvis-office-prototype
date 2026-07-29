import { CSSProperties, useEffect, useMemo, useState } from 'react';
import inventoryJson from '../../../artifacts/sprite-inventory/sprite-inventory.json';
import { OFFICE_ASSETS, resolvePublicAssetPath } from '../../office/assets';
import { AGENT_SPRITE_MANIFEST } from '../../office/sprites/manifest';
import { resolveSpriteClip } from '../../office/sprites/resolver';
import { SpriteSurfaceRuntime } from '../../office/sprites/runtime';
import { SPRITE_DIRECTIONS, SPRITE_STATES, SpriteDirection, SpriteState } from '../../office/sprites/types';
import { SpritePlayer } from './SpritePlayer';
import './agent-sprite-lab.css';

type InventoryRecord = Readonly<{
    id: string;
    path: string;
    sha256: string;
    width: number;
    height: number;
    contentBounds: Readonly<{ x: number; y: number; width: number; height: number }> | null;
    blockingIssues: readonly string[];
    status: string;
}>;

const inventory = inventoryJson as {
    counts: { total: number; productionCandidates: number; provisional: number; blocked: number };
    records: InventoryRecord[];
};

type Background = 'checker' | 'light' | 'dark';

function sourcePreviewUrl(path: string) {
    return import.meta.env.DEV ? `/${path.split('/').map(encodeURIComponent).join('/')}` : '';
}

export function AgentSpriteVisualLab() {
    const allIds = [
        ...AGENT_SPRITE_MANIFEST.assets.map(asset => asset.id),
        ...AGENT_SPRITE_MANIFEST.blockedAssets.map(asset => asset.id),
    ];
    const [assetId, setAssetId] = useState(allIds[0]);
    const [state, setState] = useState<SpriteState>('walking');
    const [direction, setDirection] = useState<SpriteDirection>('none');
    const [playing, setPlaying] = useState(true);
    const [manualFrame, setManualFrame] = useState<number | null>(null);
    const [frame, setFrame] = useState(0);
    const [speed, setSpeed] = useState(1);
    const [zoom, setZoom] = useState(1.5);
    const [background, setBackground] = useState<Background>('checker');
    const [nearest, setNearest] = useState(true);
    const [reducedMotion, setReducedMotion] = useState(false);
    const [showGrid, setShowGrid] = useState(true);
    const [showBounds, setShowBounds] = useState(true);
    const [showAnchor, setShowAnchor] = useState(true);
    const [showGround, setShowGround] = useState(true);
    const [showHitbox, setShowHitbox] = useState(false);
    const [runtime] = useState(() => new SpriteSurfaceRuntime());
    const asset = AGENT_SPRITE_MANIFEST.assets.find(item => item.id === assetId);
    const blocked = AGENT_SPRITE_MANIFEST.blockedAssets.find(item => item.id === assetId);
    const record = inventory.records.find(item => item.id === assetId);
    const resolved = asset ? resolveSpriteClip(AGENT_SPRITE_MANIFEST, asset.id, state, direction, reducedMotion) : null;
    const currentClip = resolved?.clip;
    const maxFrame = asset ? asset.frameCount - 1 : 0;

    useEffect(() => () => runtime.dispose(), [runtime]);
    useEffect(() => {
        runtime.setActive(playing && !reducedMotion);
    }, [playing, reducedMotion, runtime]);

    const warnings = useMemo(() => [
        ...(record?.blockingIssues ?? []),
        ...(resolved && resolved.fallbackChain.length > 1
            ? [`Requested state falls back through ${resolved.fallbackChain.join(' → ')}.`]
            : []),
        ...(direction !== 'none' ? ['No compass directions are authored; the non-directional clip is used.'] : []),
    ], [direction, record?.blockingIssues, resolved]);

    const step = (delta: number) => {
        const next = (frame + delta + maxFrame + 1) % (maxFrame + 1);
        setPlaying(false);
        setManualFrame(next);
        setFrame(next);
    };

    const sourceStyle = record?.contentBounds ? {
        left: `${record.contentBounds.x / record.width * 100}%`,
        top: `${record.contentBounds.y / record.height * 100}%`,
        width: `${record.contentBounds.width / record.width * 100}%`,
        height: `${record.contentBounds.height / record.height * 100}%`,
    } satisfies CSSProperties : undefined;

    return (
        <main className="sprite-lab">
            <header className="sprite-lab__header">
                <div>
                    <p className="eyebrow">Development-only visual review</p>
                    <h1>Agent sprite laboratory</h1>
                    <p>Frame, anchor, fallback, scale, and source-integrity review. No Floor 1 approval or assignment data is used.</p>
                </div>
                <dl className="sprite-lab__summary" aria-label="Inventory summary">
                    <div><dt>Total</dt><dd>{inventory.counts.total}</dd></div>
                    <div><dt>Runtime</dt><dd>{inventory.counts.productionCandidates}</dd></div>
                    <div><dt>Reference</dt><dd>{inventory.counts.provisional}</dd></div>
                    <div><dt>Blocked</dt><dd>{inventory.counts.blocked}</dd></div>
                </dl>
            </header>

            <section className="sprite-lab__controls" aria-label="Sprite controls">
                <label>Asset
                    <select value={assetId} onChange={event => {
                        setAssetId(event.target.value);
                        setFrame(0);
                        setManualFrame(null);
                    }}>
                        {allIds.map(id => <option key={id} value={id}>{id}</option>)}
                    </select>
                </label>
                <label>Animation state
                    <select value={state} onChange={event => setState(event.target.value as SpriteState)} disabled={!asset}>
                        {SPRITE_STATES.map(value => <option key={value}>{value}</option>)}
                    </select>
                </label>
                <label>Direction
                    <select value={direction} onChange={event => setDirection(event.target.value as SpriteDirection)} disabled={!asset}>
                        {SPRITE_DIRECTIONS.map(value => <option key={value}>{value}</option>)}
                    </select>
                </label>
                <label>Speed {speed.toFixed(2)}×
                    <input type="range" min=".25" max="3" step=".25" value={speed} onChange={event => setSpeed(Number(event.target.value))} />
                </label>
                <label>Zoom {zoom.toFixed(1)}×
                    <input type="range" min=".5" max="4" step=".25" value={zoom} onChange={event => setZoom(Number(event.target.value))} />
                </label>
                <label>Review background
                    <select value={background} onChange={event => setBackground(event.target.value as Background)}>
                        <option value="checker">Transparent checkerboard</option>
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                    </select>
                </label>
                <div className="sprite-lab__transport">
                    <button type="button" onClick={() => {
                        setPlaying(value => !value);
                        setManualFrame(null);
                    }} disabled={!asset}>{playing ? 'Pause' : 'Play'}</button>
                    <button type="button" onClick={() => {
                        runtime.clock.restart();
                        setManualFrame(null);
                        setPlaying(true);
                    }} disabled={!asset}>Restart</button>
                    <button type="button" onClick={() => step(-1)} disabled={!asset} aria-label="Previous frame">Previous</button>
                    <button type="button" onClick={() => step(1)} disabled={!asset} aria-label="Next frame">Next</button>
                    <output aria-live="polite">Frame {frame}</output>
                </div>
                <div className="sprite-lab__toggles">
                    <label><input type="checkbox" checked={nearest} onChange={event => setNearest(event.target.checked)} /> Nearest neighbor</label>
                    <label><input type="checkbox" checked={reducedMotion} onChange={event => setReducedMotion(event.target.checked)} /> Reduced motion</label>
                    <label><input type="checkbox" checked={showGrid} onChange={event => setShowGrid(event.target.checked)} /> Frame grid</label>
                    <label><input type="checkbox" checked={showBounds} onChange={event => setShowBounds(event.target.checked)} /> Content bounds</label>
                    <label><input type="checkbox" checked={showAnchor} onChange={event => setShowAnchor(event.target.checked)} /> Anchor</label>
                    <label><input type="checkbox" checked={showGround} onChange={event => setShowGround(event.target.checked)} /> Ground line</label>
                    <label><input type="checkbox" checked={showHitbox} onChange={event => setShowHitbox(event.target.checked)} /> Hitbox</label>
                </div>
            </section>

            <section className="sprite-lab__workspace">
                <article>
                    <h2>Frame preview</h2>
                    <div className={`sprite-lab__stage sprite-lab__stage--${background}`}>
                        {asset ? (
                            <div className="sprite-lab__player">
                                <SpritePlayer
                                    manifest={AGENT_SPRITE_MANIFEST}
                                    runtime={runtime}
                                    assetId={asset.id}
                                    state={state}
                                    direction={direction}
                                    reducedMotion={reducedMotion}
                                    paused={!playing}
                                    speed={speed}
                                    scale={zoom}
                                    manualFrame={manualFrame}
                                    nearestNeighbor={nearest}
                                    onFrameChange={setFrame}
                                />
                                {showAnchor && <span className="sprite-overlay sprite-overlay--anchor" aria-label="Anchor crosshair" />}
                                {showGround && <span className="sprite-overlay sprite-overlay--ground" aria-label="Ground contact line" />}
                                {showHitbox && <span className="sprite-overlay sprite-overlay--hitbox" aria-label="Hitbox reference" />}
                            </div>
                        ) : (
                            <div className="sprite-lab__blocked">
                                <strong>Source blocked from runtime use</strong>
                                <span>{blocked?.blockingReason}</span>
                            </div>
                        )}
                    </div>
                    <p className="sprite-lab__dimension">
                        {asset ? `${asset.frameWidth}×${asset.frameHeight}px frame · ${asset.columns}×${asset.rows} grid · office scale ${asset.visualScale}` : `${record?.width}×${record?.height}px source`}
                    </p>
                </article>

                <article>
                    <h2>Source and generated sheets</h2>
                    <div className="sprite-lab__sheets">
                        <figure>
                            <figcaption>Immutable source</figcaption>
                            <div className="sprite-lab__sheet">
                                <img src={record ? sourcePreviewUrl(record.path) : ''} alt={`${assetId} source`} style={{ imageRendering: nearest ? 'pixelated' : 'auto' }} />
                                {showBounds && sourceStyle && <span className="sprite-lab__content-bounds" style={sourceStyle} />}
                                {showGrid && asset && <span className="sprite-lab__grid" style={{ '--columns': asset.columns, '--rows': asset.rows } as CSSProperties} />}
                            </div>
                        </figure>
                        <figure>
                            <figcaption>Generated runtime</figcaption>
                            {asset ? (
                                <div className="sprite-lab__sheet">
                                    <img src={resolvePublicAssetPath(asset.generatedAssetUrl)} alt={`${assetId} generated`} style={{ imageRendering: nearest ? 'pixelated' : 'auto' }} />
                                    {showGrid && <span className="sprite-lab__grid" style={{ '--columns': asset.columns, '--rows': asset.rows } as CSSProperties} />}
                                </div>
                            ) : <p>Not generated. The last valid runtime directory is preserved.</p>}
                        </figure>
                    </div>
                </article>

                <article>
                    <h2>Office-context scale</h2>
                    <div className="sprite-lab__office" style={{ backgroundImage: `url("${OFFICE_ASSETS.background.path}")` }}>
                        {asset && (
                            <div className="sprite-lab__office-agent">
                                <SpritePlayer
                                    manifest={AGENT_SPRITE_MANIFEST}
                                    runtime={runtime}
                                    assetId={asset.id}
                                    state={state}
                                    direction={direction}
                                    reducedMotion={reducedMotion}
                                    paused={!playing}
                                    speed={speed}
                                    scale={.8}
                                    nearestNeighbor={nearest}
                                />
                                <span>Representative context · not an assignment</span>
                            </div>
                        )}
                    </div>
                </article>

                <aside className="sprite-lab__inspector">
                    <h2>Validation and fallback</h2>
                    <dl>
                        <div><dt>Status</dt><dd>{asset?.approval ?? blocked?.approval} / {asset?.availability ?? blocked?.availability}</dd></div>
                        <div><dt>Source SHA-256</dt><dd><code>{record?.sha256}</code></dd></div>
                        <div><dt>Generated SHA-256</dt><dd><code>{asset?.generatedChecksum ?? 'not generated'}</code></dd></div>
                        <div><dt>Clip</dt><dd>{currentClip?.id ?? 'unavailable'}</dd></div>
                        <div><dt>Fallback chain</dt><dd>{resolved?.fallbackChain.join(' → ') ?? 'blocked'}</dd></div>
                        <div><dt>Reduced motion</dt><dd>{reducedMotion ? `static frame ${resolved?.staticFrame ?? currentClip?.staticFallbackFrame ?? 0}` : 'normal playback'}</dd></div>
                    </dl>
                    <h3>Warnings</h3>
                    {warnings.length > 0
                        ? <ul>{warnings.map(warning => <li key={warning}>{warning}</li>)}</ul>
                        : <p>No validation warnings.</p>}
                </aside>
            </section>
        </main>
    );
}
