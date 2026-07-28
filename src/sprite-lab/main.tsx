import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import SpriteLab from './SpriteLab';

const container = document.getElementById('sprite-lab-root');
if (!container) throw new Error('sprite-lab-root container is missing');

createRoot(container).render(
    <StrictMode>
        <SpriteLab />
    </StrictMode>,
);
