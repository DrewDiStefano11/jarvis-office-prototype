import { useMemo, useState } from 'react';
import { resolvePublicAssetPath } from '../office/assets';
import {
    SOURCE_ASSET_INVENTORY,
    SourceAssetRecord,
} from '../office/sprites/inventory';
import {
    ANIM_CENTRAL_NEXUS_FLOAT,
    ANIM_CENTRAL_NEXUS_IDLE,
    SPRITE_MANIFEST,
    getAnimation,
} from '../office/sprites/manifest';
import { SpriteLoopMode } from '../office/sprites/manifestTypes';
import { validateSpriteManifest } from '../office/sprites/manifestValidation';
import {
    resolvePlaybackSequence,
    totalCycleDurationMs,
} from '../office/sprites/playback';
import productionMap from '../office/sprites/production-asset-map.json';
import { SpriteSheetRenderer } from '../components/office/SpriteSheetRenderer';
import './sprite-lab.css';

type Mapping = Readonly<{ source: string; destination: string }>;
const MAPPINGS = (productionMap as { mappings: Mapping[] }).mappings;

const READINESS_LABEL: Record<string, string> = {
    production_ready: 'VALID',
    conditionally_usable: 'CONDITIONAL',
    reference_only: 'REFERENCE-ONLY',
    invalid: 'INVALID',
};

function publicPathFor(record: SourceAssetRecord): string {
    const mapping = MAPPINGS.find(m => m.source === record.path);
    return mapping ? resolvePublicAssetPath(mapping.destination) : '';
}

/** Measured cell rectangles for whichever grid the inventory recorded. */
function gridRectsFor(record: SourceAssetRecord) {
    if (record.nexusGrid) return record.nexusGrid.frameRectangles;
    if (record.agentGrid) {
        const { columns, rows, assumedCellSize } = record.agentGrid;
        const rects = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < columns; c++) {
                rects.push({
                    index: r * columns + c,
                    row: r,
                    column: c,
                    x: c * assumedCellSize.width,
                    y: r * assumedCellSize.height,
                    width: assumedCellSize.width,
                    height: assumedCellSize.height,
                });
            }
        }
        return rects;
    }
    return [];
}

export function SpriteLab() {
    const assets = SOURCE_ASSET_INVENTORY.assets;
    const [selectedPath, setSelectedPath] = useState(assets[0]?.path ?? '');
    const [showGrid, setShowGrid] = useState(true);
    const [frameIndex, setFrameIndex] = useState(0);
    const [zoom, setZoom] = useState(1);
    const [background, setBackground] = useState<'checker' | 'dark' | 'light' | 'magenta'>('checker');

    const [animationId, setAnimationId] = useState(ANIM_CENTRAL_NEXUS_IDLE);
    const [playing, setPlaying] = useState(true);
    const [speed, setSpeed] = useState(1);
    const [previewScale, setPreviewScale] = useState(2);
    const [reducedMotion, setReducedMotion] = useState(false);
    const [floatOn, setFloatOn] = useState(true);
    const [manualFrame, setManualFrame] = useState<number | undefined>(undefined);
    const [loopMode, setLoopMode] = useState<SpriteLoopMode>('ping-pong');

    const record = assets.find(a => a.path === selectedPath);
    const rects = record ? gridRectsFor(record) : [];
    const currentRect = rects[Math.min(frameIndex, Math.max(rects.length - 1, 0))];

    const validation = useMemo(() => validateSpriteManifest(SPRITE_MANIFEST), []);

    const baseAnimation = getAnimation(animationId);
    const animation = useMemo(
        () => (baseAnimation ? { ...baseAnimation, loopMode } : undefined),
        [baseAnimation, loopMode],
    );
    const sequence = animation ? resolvePlaybackSequence(animation) : [];

    return (
        <div className="sprite-lab">
            <header className="sprite-lab__header">
                <h1>Sprite Asset &amp; Animation Lab</h1>
                <p>
                    Isolated review surface. Nothing here is placed in the production Floor 1
                    office; Floor 1 integration is deferred until registration is approved.
                </p>
            </header>

            <section className="sprite-lab__panel">
                <h2>Manifest validation</h2>
                <p className={validation.valid ? 'status status--ok' : 'status status--bad'}>
                    {validation.valid ? 'VALID' : `INVALID — ${validation.errors.length} error(s)`}
                    {validation.warnings.length > 0 && ` · ${validation.warnings.length} warning(s)`}
                </p>
                <ul className="sprite-lab__issues">
                    {validation.issues.map((issue, i) => (
                        <li key={i} className={`issue issue--${issue.severity}`}>
                            <strong>{issue.code}</strong> [{issue.target}] {issue.message}
                        </li>
                    ))}
                </ul>
            </section>

            <section className="sprite-lab__panel">
                <h2>Central Nexus preview</h2>
                <div className="sprite-lab__controls">
                    <label>
                        Animation
                        <select value={animationId} onChange={e => setAnimationId(e.target.value)}>
                            <option value={ANIM_CENTRAL_NEXUS_IDLE}>ANIM_CENTRAL_NEXUS_IDLE</option>
                            <option value={ANIM_CENTRAL_NEXUS_FLOAT}>ANIM_CENTRAL_NEXUS_FLOAT</option>
                        </select>
                    </label>
                    <label>
                        Loop mode
                        <select
                            value={loopMode}
                            onChange={e => setLoopMode(e.target.value as SpriteLoopMode)}
                        >
                            <option value="loop">loop</option>
                            <option value="once">once</option>
                            <option value="ping-pong">ping-pong</option>
                            <option value="hold">hold</option>
                        </select>
                    </label>
                    <button type="button" onClick={() => setPlaying(p => !p)}>
                        {playing ? 'Pause' : 'Play'}
                    </button>
                    <button
                        type="button"
                        onClick={() => setManualFrame(f => Math.max(0, (f ?? 0) - 1))}
                    >
                        Prev frame
                    </button>
                    <button
                        type="button"
                        onClick={() => setManualFrame(f => Math.min(sequence.length - 1, (f ?? 0) + 1))}
                    >
                        Next frame
                    </button>
                    <button type="button" onClick={() => setManualFrame(undefined)}>
                        Resume auto
                    </button>
                    <label>
                        Speed {speed.toFixed(2)}x
                        <input
                            type="range" min="0.25" max="4" step="0.25" value={speed}
                            onChange={e => setSpeed(Number(e.target.value))}
                        />
                    </label>
                    <label>
                        Scale {previewScale}x
                        <input
                            type="range" min="1" max="8" step="1" value={previewScale}
                            onChange={e => setPreviewScale(Number(e.target.value))}
                        />
                    </label>
                    <label>
                        <input
                            type="checkbox" checked={reducedMotion}
                            onChange={e => setReducedMotion(e.target.checked)}
                        />
                        Reduced motion
                    </label>
                    <label>
                        <input
                            type="checkbox" checked={floatOn}
                            onChange={e => setFloatOn(e.target.checked)}
                        />
                        Float transform
                    </label>
                    <label title="Nearest-neighbour is fixed on for production preview">
                        <input type="checkbox" checked readOnly disabled />
                        Nearest-neighbour (locked)
                    </label>
                </div>

                {animation && (
                    <>
                        <div className={`sprite-lab__stage sprite-lab__stage--${background}`}>
                            <SpriteSheetRenderer
                                animation={animation}
                                displayScale={previewScale}
                                paused={!playing}
                                speedMultiplier={1 / speed}
                                forceReducedMotion={reducedMotion}
                                manualFrameIndex={manualFrame}
                                floatTransform={floatOn}
                                label="Central Nexus hologram preview"
                            />
                        </div>
                        <dl className="sprite-lab__meta">
                            <div><dt>Sequence length</dt><dd>{sequence.length}</dd></div>
                            <div><dt>Frame order</dt><dd>{animation.frameOrder.join(', ')}</dd></div>
                            <div><dt>Cycle duration</dt><dd>{totalCycleDurationMs(animation)} ms</dd></div>
                            <div><dt>Reduced-motion frame</dt><dd>{animation.reducedMotionFrameIndex}</dd></div>
                            <div><dt>Unused frames</dt><dd>{animation.unusedFrameIndexes.length}</dd></div>
                        </dl>
                    </>
                )}

                <h3>Invalid-metadata fallback</h3>
                <p className="sprite-lab__hint">
                    Deliberately broken animation, showing the safe fallback rather than a guess.
                </p>
                {baseAnimation && (
                    <div className="sprite-lab__stage sprite-lab__stage--dark">
                        <SpriteSheetRenderer
                            animation={{ ...baseAnimation, frameWidth: -1, frameHeight: 0 }}
                            label="Intentionally invalid animation"
                        />
                    </div>
                )}
            </section>

            <section className="sprite-lab__panel">
                <h2>Source asset inventory ({assets.length})</h2>
                <div className="sprite-lab__controls">
                    <label>
                        Asset
                        <select value={selectedPath} onChange={e => { setSelectedPath(e.target.value); setFrameIndex(0); }}>
                            {assets.map(a => (
                                <option key={a.path} value={a.path}>{a.path}</option>
                            ))}
                        </select>
                    </label>
                    <label>
                        <input type="checkbox" checked={showGrid} onChange={e => setShowGrid(e.target.checked)} />
                        Grid overlay
                    </label>
                    <label>
                        Background
                        <select value={background} onChange={e => setBackground(e.target.value as typeof background)}>
                            <option value="checker">Checkerboard</option>
                            <option value="dark">Dark</option>
                            <option value="light">Light</option>
                            <option value="magenta">Magenta (halo check)</option>
                        </select>
                    </label>
                    <label>
                        Zoom {zoom.toFixed(2)}x
                        <input
                            type="range" min="0.25" max="2" step="0.25" value={zoom}
                            onChange={e => setZoom(Number(e.target.value))}
                        />
                    </label>
                </div>

                {record && (
                    <>
                        <p>
                            <span className={`badge badge--${record.readiness}`}>
                                {READINESS_LABEL[record.readiness] ?? record.readiness}
                            </span>
                            {record.ambiguous && <span className="badge badge--ambiguous">AMBIGUOUS</span>}
                            <span className="badge">{record.classification}</span>
                        </p>
                        <dl className="sprite-lab__meta">
                            <div><dt>Dimensions</dt><dd>{record.width} x {record.height}</dd></div>
                            <div><dt>Bit depth</dt><dd>{record.bitDepth}</dd></div>
                            <div><dt>Colour type</dt><dd>{record.colorType}</dd></div>
                            <div><dt>Alpha channel</dt><dd>{record.hasAlphaChannel ? 'yes' : 'no'}</dd></div>
                            <div><dt>Transparency used</dt><dd>{record.transparencyUsed ? 'yes' : 'no'}</dd></div>
                            <div><dt>Uniform opaque bg</dt><dd>{record.uniformOpaqueBackground ? `yes (${record.backgroundColor})` : 'no'}</dd></div>
                            <div><dt>File size</dt><dd>{record.fileSizeBytes.toLocaleString()} bytes</dd></div>
                            <div><dt>SHA-256</dt><dd className="mono">{record.sha256.slice(0, 24)}…</dd></div>
                            <div><dt>Measured cells</dt><dd>{rects.length}</dd></div>
                        </dl>
                        {record.warnings.length > 0 && (
                            <ul className="sprite-lab__issues">
                                {record.warnings.map((w, i) => (
                                    <li key={i} className="issue issue--warning">{w}</li>
                                ))}
                            </ul>
                        )}

                        <h3>Full source preview</h3>
                        <div className={`sprite-lab__sheet sprite-lab__stage--${background}`}>
                            <div
                                className="sprite-lab__sheet-inner"
                                style={{ width: record.width * zoom, height: record.height * zoom }}
                            >
                                <img
                                    src={publicPathFor(record)}
                                    alt={record.path}
                                    width={record.width * zoom}
                                    height={record.height * zoom}
                                    style={{ imageRendering: 'pixelated' }}
                                />
                                {showGrid && rects.map(r => (
                                    <span
                                        key={r.index}
                                        className={`sprite-lab__cell${r.index === frameIndex ? ' sprite-lab__cell--active' : ''}`}
                                        style={{
                                            left: r.x * zoom,
                                            top: r.y * zoom,
                                            width: r.width * zoom,
                                            height: r.height * zoom,
                                        }}
                                        title={`frame ${r.index} (r${r.row} c${r.column}) ${r.width}x${r.height}`}
                                    >
                                        <em>{r.index}</em>
                                    </span>
                                ))}
                            </div>
                        </div>

                        {currentRect && (
                            <>
                                <h3>Individual frame — index {currentRect.index} (zero-based)</h3>
                                <div className="sprite-lab__controls">
                                    <button type="button" onClick={() => setFrameIndex(i => Math.max(0, i - 1))}>Prev</button>
                                    <button type="button" onClick={() => setFrameIndex(i => Math.min(rects.length - 1, i + 1))}>Next</button>
                                    <span>row {currentRect.row}, column {currentRect.column} · {currentRect.width}x{currentRect.height}</span>
                                </div>
                                <div className={`sprite-lab__stage sprite-lab__stage--${background}`}>
                                    <div
                                        className="sprite-lab__frame"
                                        style={{
                                            width: currentRect.width * 2,
                                            height: currentRect.height * 2,
                                            backgroundImage: `url("${publicPathFor(record)}")`,
                                            backgroundPosition: `${-currentRect.x * 2}px ${-currentRect.y * 2}px`,
                                            backgroundSize: `${record.width * 2}px ${record.height * 2}px`,
                                        }}
                                    />
                                </div>
                            </>
                        )}
                    </>
                )}
            </section>
        </div>
    );
}

export default SpriteLab;
