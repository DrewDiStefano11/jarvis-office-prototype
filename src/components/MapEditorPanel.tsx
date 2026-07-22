import React, { useState, useEffect } from 'react';
import { EventBus } from '../game/EventBus';
import { parseMapData } from '../data/floorOne/floorOneValidation';

export const MapEditorPanel: React.FC = () => {
    const [selectionInfo, setSelectionInfo] = useState("None");
    const [coords, setCoords] = useState({ x: 0, y: 0 });
    const [isDirty, setIsDirty] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        const onSelect = (msg: string) => setSelectionInfo(msg);
        const onCoords = (c: { x: number, y: number }) => setCoords(c);
        const onDirty = (dirty: boolean) => setIsDirty(dirty);

        EventBus.on('editor-selection-changed', onSelect);
        EventBus.on('editor-pointer-coords', onCoords);
        EventBus.on('editor-dirty-state', onDirty);

        return () => {
            EventBus.removeListener('editor-selection-changed', onSelect);
            EventBus.removeListener('editor-pointer-coords', onCoords);
            EventBus.removeListener('editor-dirty-state', onDirty);
        };
    }, []);

    const handleUndo = () => EventBus.emit('editor-undo');
    const handleRedo = () => EventBus.emit('editor-redo');
    const handleExport = () => EventBus.emit('editor-export');

    const handleImportClick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = (e: Event) => {
            const target = e.target as HTMLInputElement;
            const file = target.files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (re) => {
                const text = re.target?.result as string;
                if (!text) return;

                // Validate before replacing
                const { data, errors } = parseMapData(text);
                if (errors.length > 0) {
                    setErrorMsg("Import Validation Failed:\n" + errors.join('\n'));
                } else if (data) {
                    setErrorMsg(null);
                    EventBus.emit('editor-import', text);
                }
            };
            reader.readAsText(file);
        };
        // Playwright hook for testing
        input.id = "hidden-import-input";
        input.style.display = 'none';
        document.body.appendChild(input);
        input.click();
        setTimeout(() => document.body.removeChild(input), 1000);
    };

    return (
        <div className="room-inspector">
            <h3>Editor Tools</h3>
            {isDirty && <p style={{color: 'orange', fontWeight: 'bold'}}>Unsaved Changes!</p>}

            <p><strong>Selection:</strong> {selectionInfo}</p>
            <p className="debug-info">X: {coords.x}, Y: {coords.y}</p>

            {errorMsg && <div style={{ color: 'red', marginTop: '10px', fontSize: '0.8rem', whiteSpace: 'pre-wrap' }}>{errorMsg}</div>}

            <div style={{ marginTop: '15px' }}>
                <button className="map-btn" onClick={handleUndo}>Undo</button>
                <button className="map-btn" onClick={handleRedo}>Redo</button>
            </div>

            <div style={{ marginTop: '15px' }}>
                <button className="map-btn active" onClick={handleExport}>Export Map JSON</button>
                <button className="map-btn" onClick={handleImportClick}>Import Map JSON</button>
            </div>

            <div style={{ marginTop: '20px', fontSize: '0.8rem', color: '#ccc' }}>
                <p><strong>Instructions:</strong></p>
                <ul style={{ paddingLeft: '15px', margin: '5px 0' }}>
                    <li>Click to select points (vertex, door, node).</li>
                    <li>Drag selected points to move.</li>
                    <li>Use Arrow Keys to nudge 1px (Shift + Arrow for 10px).</li>
                    <li>Select an Edge and press Delete/Backspace to remove it.</li>
                </ul>
            </div>
        </div>
    );
};
