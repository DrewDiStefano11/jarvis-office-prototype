import React from 'react';
import ReactDOM from 'react-dom/client';
import { ShowcaseApp } from './ShowcaseApp';
import '../tokens.css'; // Load global design tokens

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ShowcaseApp />
    </React.StrictMode>
);
