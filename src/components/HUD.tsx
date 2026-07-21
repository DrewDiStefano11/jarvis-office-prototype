import React from 'react';

export const HUD: React.FC = () => {
    return (
        <div style={{
            position: 'absolute',
            top: 20,
            left: 20,
            background: 'rgba(255, 255, 255, 0.9)',
            padding: '10px 15px',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            fontFamily: 'sans-serif',
            fontSize: '12px',
            color: '#333',
            zIndex: 10,
            border: '1px solid #ccc'
        }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', borderBottom: '1px solid #ccc', paddingBottom: '4px' }}>Jarvis HQ Floor 1</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px' }}>
                <div><strong>Status:</strong> Operational</div>
                <div><strong>Floor 2:</strong> Under Construction</div>

                <div><strong>Permanent Agents:</strong> 24</div>
                <div><strong>Permanent Capacity:</strong> 28</div>

                <div><strong>Permanent Vacancies:</strong> 4</div>
                <div><strong>Temporary Desks:</strong> 8</div>

                <div><strong>Sandbox Cells:</strong> 4</div>
            </div>

            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #ccc' }}>
                <strong>Access Levels:</strong>
                <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                    <span style={{ display: 'flex', alignItems: 'center' }}><span style={{ width: 10, height: 10, background: '#e0e0e0', display: 'inline-block', marginRight: 4 }}></span> General</span>
                    <span style={{ display: 'flex', alignItems: 'center' }}><span style={{ width: 10, height: 10, background: '#d7ccc8', display: 'inline-block', marginRight: 4 }}></span> Dept</span>
                    <span style={{ display: 'flex', alignItems: 'center' }}><span style={{ width: 10, height: 10, borderBottom: '3px solid #ffb74d', display: 'inline-block', marginRight: 4 }}></span> Restrict</span>
                    <span style={{ display: 'flex', alignItems: 'center' }}><span style={{ width: 10, height: 10, borderBottom: '3px solid #e57373', display: 'inline-block', marginRight: 4 }}></span> Highly</span>
                    <span style={{ display: 'flex', alignItems: 'center' }}><span style={{ width: 10, height: 10, borderBottom: '3px solid #ba68c8', display: 'inline-block', marginRight: 4 }}></span> Contain</span>
                </div>
            </div>
        </div>
    );
};
