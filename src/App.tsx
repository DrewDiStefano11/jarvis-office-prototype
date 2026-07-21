import { useRef } from 'react';
import { FloorStatusPanel } from './components/FloorStatusPanel';
import { IRefPhaserGame, PhaserGame } from './PhaserGame';

function App() {
    const phaserRef = useRef<IRefPhaserGame | null>(null);

    return (
        <main id="app-root">
            <section className="office-canvas-pane" aria-label="Interactive isometric map of Jarvis HQ Floor 1">
                <PhaserGame ref={phaserRef} />
                <FloorStatusPanel />
                <div className="camera-help">DRAG TO PAN · SCROLL TO ZOOM</div>
            </section>
        </main>
    );
}

export default App;
