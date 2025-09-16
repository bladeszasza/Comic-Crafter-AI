
import React from 'react';
import type { StoryOutline, Panel } from '../types.js';

// A helper to render nested objects cleanly
const DetailSection: React.FC<{ title: string; data: object | any[] | string }> = ({ title, data }) => {
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return null;
  }

  const content = typeof data === 'string' 
    ? <p>{data}</p>
    : <pre className="whitespace-pre-wrap font-sans text-xs">{JSON.stringify(data, null, 2)}</pre>;

  return (
    <div className="mt-3">
      <h5 className="font-bold text-sm text-yellow-500 uppercase tracking-wider">{title}</h5>
      <div className="pl-4 border-l-2 border-gray-600 text-gray-300 text-sm">
        {content}
      </div>
    </div>
  );
};

const PanelCard: React.FC<{ panel: Panel }> = ({ panel }) => {
  return (
    <div className="bg-gray-800 rounded-lg p-4 mb-4 shadow-lg border border-gray-700">
      <h3 className="text-2xl font-display text-yellow-400">Page {panel.page_number}, Panel {panel.panel_number}</h3>
      <DetailSection title="Layout" data={panel.layout} />
      <DetailSection title="Visuals" data={panel.visuals} />
      <DetailSection title="Textual" data={panel.textual} />
      <DetailSection title="Auditory" data={panel.auditory} />
      {panel.transition && <DetailSection title="Transition" data={panel.transition} />}
    </div>
  );
};

const StoryViewer: React.FC<{ story: StoryOutline; onRestart: () => void; }> = ({ story, onRestart }) => {
  const [copyStatus, setCopyStatus] = React.useState('Copy Full Story (JSON)');
  
  const handleCopy = () => {
    const storyJson = JSON.stringify(story, null, 2);
    navigator.clipboard.writeText(storyJson).then(() => {
      setCopyStatus('Copied!');
      setTimeout(() => setCopyStatus('Copy Full Story (JSON)'), 2000);
    }, () => {
      setCopyStatus('Failed to copy');
      setTimeout(() => setCopyStatus('Copy Full Story (JSON)'), 2000);
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-6xl font-display text-yellow-400 tracking-wider">{story.title}</h2>
        <p className="text-xl text-gray-300 mt-2">Your comic story is ready!</p>
      </div>
      
      <div className="flex justify-center gap-4 mb-8">
        <button
            onClick={onRestart}
            className="bg-gray-600 text-white font-bold py-3 px-8 rounded-lg text-xl font-display tracking-wider hover:bg-gray-500 transition-all duration-300"
        >
            Create Another
        </button>
        <button
            onClick={handleCopy}
            className="bg-green-500 text-white font-bold py-3 px-8 rounded-lg text-xl font-display tracking-wider hover:bg-green-400 transition-all duration-300 min-w-[300px]"
        >
            {copyStatus}
        </button>
      </div>

      <div className="bg-gray-800/50 rounded-lg p-6 mb-8 border border-gray-700">
        <h3 className="text-3xl font-display text-yellow-400 mb-4">Prologue</h3>
        <div className="text-gray-300 whitespace-pre-line font-serif text-lg leading-relaxed">
            {story.prologue}
        </div>
      </div>
      
      <div>
        <h3 className="text-4xl font-display text-center text-yellow-400 mb-6">Panel Breakdown</h3>
        {story.panels.map((panel, index) => (
          <PanelCard key={`${panel.page_number}-${panel.panel_number}-${index}`} panel={panel} />
        ))}
      </div>
    </div>
  );
};

export default StoryViewer;
