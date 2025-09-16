
import React from 'react';
import type { StoryDevelopmentPackage, Act, CharacterArc, CharacterVoice } from '../types.js';
import { SparklesIcon } from './icons.js';

const Card: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className = '' }) => (
  <div className={`bg-gray-800/50 rounded-lg p-6 border border-gray-700 ${className}`}>
    <h3 className="text-3xl font-display text-yellow-400 mb-4">{title}</h3>
    <div className="text-gray-300 space-y-2">{children}</div>
  </div>
);

const StoryDevelopmentViewer: React.FC<{ storyPackage: StoryDevelopmentPackage; onGeneratePanels: () => void; onRestart: () => void; }> = ({ storyPackage, onGeneratePanels, onRestart }) => {
  return (
    <div className="w-full max-w-4xl mx-auto animate-fade-in space-y-8">
      <div className="text-center">
        <h2 className="text-6xl font-display text-yellow-400 tracking-wider">{storyPackage.title}</h2>
        <p className="text-xl text-gray-300 mt-2">Your story blueprint is ready!</p>
      </div>
      
      <div className="flex justify-center gap-4">
        <button
            onClick={onGeneratePanels}
            className="bg-green-500 text-white font-bold py-3 px-8 rounded-lg text-xl font-display tracking-wider hover:bg-green-400 transform hover:scale-105 transition-all duration-300 flex items-center"
        >
            <SparklesIcon className="w-6 h-6 mr-3" />
            Generate Panels
        </button>
        <button
            onClick={onRestart}
            className="bg-gray-600 text-white font-bold py-3 px-8 rounded-lg text-xl font-display tracking-wider hover:bg-gray-500 transition-all duration-300"
        >
            Start Over
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Logline" className="md:col-span-2">
            <p className="font-serif text-lg italic">{storyPackage.logline}</p>
        </Card>
        <Card title="Themes">
            <ul className="list-disc list-inside">
                {storyPackage.themes.map(theme => <li key={theme}>{theme}</li>)}
            </ul>
        </Card>
      </div>
      
      <Card title="Character Arcs & Voices">
          <div className="space-y-4">
            {storyPackage.character_arcs.map(arc => {
                const voice = storyPackage.character_voices.find(v => v.character_name === arc.character_name);
                return (
                    <div key={arc.character_name} className="p-3 bg-gray-900/40 rounded">
                        <h4 className="font-bold text-lg text-yellow-500">{arc.character_name}</h4>
                        <p><strong className="font-semibold text-gray-400">Conflict:</strong> {arc.internal_conflict}</p>
                        <p><strong className="font-semibold text-gray-400">Arc:</strong> {arc.arc_summary}</p>
                        {voice && <p><strong className="font-semibold text-gray-400">Voice:</strong> {voice.speech_patterns} ({voice.vocabulary})</p>}
                    </div>
                )
            })}
          </div>
      </Card>
      
      <Card title="Three-Act Outline">
        <div className="space-y-6">
          {storyPackage.three_act_outline.sort((a,b) => a.act_number - b.act_number).map(act => (
            <div key={act.act_number} className="pl-4 border-l-2 border-gray-600">
              <h4 className="text-2xl font-display text-yellow-500">Act {act.act_number}: {act.act_title}</h4>
              <p className="italic text-gray-400 mb-3">{act.summary}</p>
              <div className="space-y-2">
                {act.key_scenes.map(scene => (
                    <div key={scene.scene_title} className="p-2 bg-gray-900/40 rounded">
                        <p><strong className="font-semibold text-gray-300">[{scene.page_estimation}] {scene.scene_title}:</strong> {scene.description}</p>
                    </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

    </div>
  );
};

export default StoryDevelopmentViewer;