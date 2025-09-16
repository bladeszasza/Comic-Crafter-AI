
import React from 'react';
import type { GeneratedPanel } from '../types.js';

const ComicPanel: React.FC<{ panel: GeneratedPanel, style?: React.CSSProperties }> = ({ panel, style }) => {
    const borderStyle: React.CSSProperties = {
        border: '3px solid black',
        boxSizing: 'border-box',
    };
    
    if (panel.layout.border_style !== "Standard") {
        borderStyle.border = 'none';
    }
    
    return (
        <div className="relative w-full h-full overflow-hidden bg-gray-700 shadow-md" style={{ ...borderStyle, ...style }}>
            <img src={panel.imageUrl} alt={`Panel ${panel.panel_number}`} className="w-full h-full object-cover" />
        </div>
    );
};

const getGridLayout = (panels: GeneratedPanel[]) => {
    const count = panels.length;
    switch (count) {
        case 1: return { gridTemplate: '1fr / 1fr', panelStyles: [{}] };
        case 2: return { gridTemplate: '1fr 1fr / 1fr', panelStyles: [{}, {}] }; // 2 rows
        case 3: return { gridTemplate: '1fr 1fr / 1fr 1fr', panelStyles: [{ gridColumn: '1 / 3' }, {}, {}] }; // Top wide, two below
        case 4: return { gridTemplate: '1fr 1fr / 1fr 1fr', panelStyles: [{}, {}, {}, {}] }; // 2x2 grid
        case 5: return { gridTemplate: '1fr 1fr 1fr / 1fr 1fr', panelStyles: [{gridColumn: '1 / 3'}, {}, {}, {}, {}] };
        case 6: return { gridTemplate: '1fr 1fr 1fr / 1fr 1fr', panelStyles: [{}, {}, {}, {}, {}, {}] };
        default: return { gridTemplate: `repeat(${Math.ceil(count / 2)}, 1fr) / 1fr 1fr`, panelStyles: Array(count).fill({})};
    }
}


const ComicPage: React.FC<{ panels: GeneratedPanel[]; pageNumber: string | number; isCenterfold: boolean }> = ({ panels, pageNumber, isCenterfold }) => {
    const { gridTemplate, panelStyles } = getGridLayout(panels);

    const pageStyle: React.CSSProperties = {
        width: '100%',
        aspectRatio: isCenterfold ? (6.625 * 2) / 10.25 : 6.625 / 10.25,
        maxWidth: isCenterfold ? '1000px' : '500px'
    };
    
    const gridContainerStyle: React.CSSProperties = {
        display: 'grid',
        gridTemplate: gridTemplate,
        gap: '8px',
    };
    
    return (
        <div className="flex flex-col items-center animate-fade-in">
            <h3 className="text-center font-display text-2xl text-gray-400 mb-2">
                {pageNumber === 0 ? 'Cover' : `Page ${pageNumber}`}
            </h3>
            <div style={pageStyle}>
                <div className="w-full h-full bg-white p-2" style={gridContainerStyle}>
                    {panels.map((panel, index) => (
                        <ComicPanel key={panel.panel_number} panel={panel} style={panelStyles[index]}/>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ComicPage;