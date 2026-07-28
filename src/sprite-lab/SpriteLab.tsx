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

type LabRect = Readonly<{
    index: number; row: number; column: number;
    x: number; y: number; width: number; height: number;
}>;

/**
 * Measured cell rectangles, or none.
 *
 * Crucially, a uniform grid is only generated when equal-cell extraction was
 * actually verified. For quarantined/irregular sheets we return no rectangles
 * rather than presenting 48 assumed cells as if they were measured frames.
 */
function gridRectsFor(record: SourceAssetRecord): readonly LabRect[] {
    if (record.nexusGrid) return record.nexusGrid.frameRectangles;
    if (record.agentGrid && record.agentGrid.equalCellExtractionValid) {
        const { columns, rows, assumedCellSize } = record.agentGrid;
        const rects: LabRect[] = [];
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

/** Why frame extraction is unavailable, when it is. */
function extractionBlockedReason(record: SourceAssetRecord): string | null {
    if (record.nexusGrid) return null;
    if (!record.agentGrid) {
        return 'No measurable cell structure. This is a reference image, not a frame sheet.';
    }
    if (record.agentGrid.equalCellExtractionValid) return null;
    const g = record.agentGrid;
    const details: string[] = [];
    if (g.detectedColumnBands !== g.columns) {
        details.push(`measured ${g.detectedColumnBands} ink column band(s) but the sheet is ${g.columns} cells wide`);
    }
    if (g.horizontalSpillCells > 0) {
        details.push(`${g.horizontalSpillCells} cell(s) spill horizontally past the ${g.assumedCellSize.width}px boundary`);
    }
    if (g.blankCells > 0) details.push(`${g.blankCells} blank cell(s)`);
    return `Frame extraction unavailable pending human review: ${details.join('; ') || 'irregular layout'}.`;
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
    // Stored as a SEQUENCE POSITION. For ping-pong these differ from sheet
    // frame indexes, so the position is resolved through the sequence below.
    const [manualPosition, setManualPosition] = useState<number | undefined>(undefined);
    const [loopMode, setLoopMode] = useState<SpriteLoopMode>('ping-pong');

    const record = assets.find(a => a.path === selectedPath);
    const rects = record ? gridRectsFor(record) : [];
    const blockedReason = record ? extractionBlockedReason(record) : null;
    const currentRect = rects[Math.min(frameIndex, Math.max(rects.length - 1, 0))];

    const validation = useMemo(() => validateSpriteManifest(SPRITE_MANIFEST), []);

    const baseAnimation = getAnimation(animationId);
    const animation = useMemo(
        () => (baseAnimation ? { ...baseAnimation, loopMode } : undefined),
        [baseAnimation, loopMode],
    );
    const sequence = animation ? resolvePlaybackSequence(animation) : [];

    // Clamp (never wrap to an unrelated frame) whenever the sequence shrinks,
    // e.g. after switching animation or loop mode.
    const safePosition = manualPosition === undefined
        ? undefined
        : Math.min(Math.max(0, manualPosition), Math.max(0, sequence.length - 1));
    const manualFrameIndex = safePosition === undefined || sequence.length === 0
        ? undefined
        : sequence[safePosition];

    const stepPosition = (delta: number) => {
        if (sequence.length === 0) return;
        setManualPosition(previous => {
            const current = previous ?? 0;
            return Math.min(Math.max(0, current + delta), sequence.length - 1);
        });
    };

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
                <h2>Status</h2>
                <p className="sprite-lab__hint">
                    Structural validity, source measurement, production approval and visual
                    review are tracked separately. A structurally valid manifest may still
                    contain candidate entries that are not cleared for the office runtime.
                </p>
                <dl className="sprite-lab__meta" data-testid="status-axes">
                    <div>
                        <dt>Manifest structure</dt>
                        <dd className={validation.valid ? 'status--ok' : 'status--bad'}
                            data-testid="axis-structure">
                            {validation.valid ? 'valid' : `invalid (${validation.errors.length})`}
                        </dd>
                    </div>
                    <div>
                        <dt>Source measurements</dt>
                        <dd className="status--ok" data-testid="axis-measurements">valid</dd>
                    </div>
                    <div>
                        <dt>Production approval</dt>
                        <dd className="status--bad" data-testid="axis-approval">not approved</dd>
                    </div>
                    <div>
                        <dt>Sequence authorship</dt>
                        <dd className="status--warn" data-testid="axis-authorship">unverified</dd>
                    </div>
                    <div>
                        <dt>Visual review</dt>
                        <dd className="status--warn" data-testid="axis-review">required</dd>
                    </div>
                </dl>
                <p className="status status--warn" data-testid="nexus-status-banner">
                    Central Nexus: CANDIDATE — HUMAN REVIEW REQUIRED
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
                <h2>Central Nexus preview (candidate)</h2>
                <p className="sprite-lab__hint">
                    Preview only. This asset is <strong>not</strong> production-approved and is
                    not placed in the office runtime. The legacy registry path
                    <code> assets/office/sprites/central-blue-tube-hologram.png </code>
                    is deliberately left absent so the office engine keeps its missing-asset
                    fallback. The ten-frame order is a curated review choice, not a
                    source-verified animation sequence.
                </p>
                <div className="sprite-lab__controls">
                    <label>
                        Animation
                        <select
                            value={animationId}
                            onChange={e => { setAnimationId(e.target.value); setManualPosition(undefined); }}
                        >
                            <option value={ANIM_CENTRAL_NEXUS_IDLE}>ANIM_CENTRAL_NEXUS_IDLE</option>
                            <option value={ANIM_CENTRAL_NEXUS_FLOAT}>ANIM_CENTRAL_NEXUS_FLOAT</option>
                        </select>
                    </label>
                    <label>
                        Loop mode
                        <select
                            value={loopMode}
                            onChange={e => {
                                setLoopMode(e.target.value as SpriteLoopMode);
                                setManualPosition(undefined);
                            }}
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
                    <button type="button" onClick={() => stepPosition(-1)}>Prev frame</button>
                    <button type="button" onClick={() => stepPosition(1)}>Next frame</button>
                    <button type="button" onClick={() => setManualPosition(undefined)}>
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
                                manualFrameIndex={manualFrameIndex}
                                floatTransform={floatOn}
                                label="Central Nexus hologram preview"
                            />
                        </div>
                        <dl className="sprite-lab__meta">
                            <div><dt>Sequence length</dt><dd>{sequence.length}</dd></div>
                            <div>
                                <dt>Sequence position</dt>
                                <dd data-testid="sequence-position">
                                    {safePosition === undefined ? 'auto' : safePosition}
                                </dd>
                            </div>
                            <div>
                                <dt>Sheet frame index (0-based)</dt>
                                <dd data-testid="sheet-frame-index">
                                    {manualFrameIndex === undefined ? 'auto' : manualFrameIndex}
                                </dd>
                            </div>
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

                        {blockedReason && (
                            <p className="status status--warn" data-testid="extraction-blocked">
                                {blockedReason}
                            </p>
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
                                {showGrid && !blockedReason && rects.map(r => (
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

                        {currentRect && !blockedReason && (
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
