


import React from 'react';
import type { GeneratedCharacter, StoryDevelopmentPackage, CharacterArc, CharacterVoice, CharacterImage } from '../types.js';

interface CharacterGeneratorProps {
  characters: GeneratedCharacter[];
  status: string;
  prologue: string;
  storyPackage: StoryDevelopmentPackage;
  scenes: Map<string, Record<string, CharacterImage>>;
}

const TOTAL_CAST_MEMBERS = 5;

interface CharacterCardProps {
    character: GeneratedCharacter;
    arc: CharacterArc | undefined;
    voice: CharacterVoice | undefined;
}

const CharacterCard: React.FC<CharacterCardProps> = ({ character, arc, voice }) => (
    <div className="bg-gray-800 rounded-lg p-6 flex flex-col text-center animate-fade-in shadow-lg h-full">
        <div className="w-full aspect-square bg-gray-700 rounded-md mb-4 overflow-hidden border-2 border-gray-600">
            <img src={character.imageUrls.full} alt={character.name} className="w-full h-full object-cover" />
        </div>
        <h4 className="text-2xl font-display text-yellow-400">{character.name}</h4>
        <div className="text-sm text-gray-400 mt-2 text-left flex-grow overflow-y-auto max-h-64 space-y-2 p-2">
            <p><strong className="font-semibold text-yellow-500/80">Role:</strong> {character.role}</p>
            <p><strong className="font-semibold text-yellow-500/80">Description:</strong> {character.description}</p>
            {arc && (
                <>
                    <p><strong className="font-semibold text-yellow-500/80">Conflict:</strong> {arc.internal_conflict}</p>
                    <p><strong className="font-semibold text-yellow-500/80">Arc:</strong> {arc.arc_summary}</p>
                </>
            )}
            {voice && (
                <p><strong className="font-semibold text-yellow-500/80">Voice:</strong> {voice.speech_patterns} ({voice.vocabulary})</p>
            )}
        </div>
    </div>
);

const LoadingCard: React.FC = () => (
    <div className="bg-gray-800 rounded-lg p-4 flex flex-col items-center text-center border-2 border-dashed border-gray-700">
        <div className="w-full aspect-square bg-gray-700/50 rounded-md mb-4 flex items-center justify-center">
             <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-400"></div>
        </div>
        <h4 className="text-xl font-display text-gray-500">Generating...</h4>
    </div>
);


const CharacterGenerator: React.FC<CharacterGeneratorProps> = ({ characters, status, prologue, storyPackage, scenes }) => {
  
  const placeholders = Array.from({ length: TOTAL_CAST_MEMBERS - characters.length });

  return (
    <div className="w-full max-w-6xl mx-auto bg-gray-800/50 rounded-2xl shadow-lg p-8 animate-fade-in">
        <h2 className="text-4xl font-display text-center text-yellow-400 tracking-wider">2. Meet the Cast & See the Sights</h2>
        <p className="text-center text-gray-400 mt-2 mb-8">{status || 'Generating story and designing the cast...'}</p>

        <div className="bg-gray-900/50 rounded-lg p-6 mb-8 border border-gray-700">
            <h3 className="text-3xl font-display text-yellow-400 mb-4">Prologue: The Story Begins...</h3>
            <div className="text-gray-300 whitespace-pre-line font-serif text-lg leading-relaxed">
                {prologue}
            </div>
        </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 mb-8">
        {characters.map(char => {
            const arc = storyPackage.character_arcs.find(a => a.character_name === char.name);
            const voice = storyPackage.character_voices.find(v => v.character_name === char.name);
            return <CharacterCard key={char.name} character={char} arc={arc} voice={voice} />;
        })}
        {placeholders.map((_, index) => <LoadingCard key={`loader-${index}`} />)}
      </div>

      {scenes.size > 0 && (
          <div className="mt-8">
            <h3 className="text-3xl font-display text-center text-yellow-400 mb-4">Key Locations</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from(scenes.entries()).map(([key, sceneGroup]) => {
                const establishingShot = sceneGroup['wide'] || Object.values(sceneGroup)[0];
                if (!establishingShot) return null;

                return (
                  <div key={key} className="bg-gray-900/50 rounded-lg p-3 text-center animate-fade-in shadow-lg">
                    <div className="w-full aspect-video bg-gray-700 rounded-md mb-2 overflow-hidden border-2 border-gray-600">
                      <img src={`data:${establishingShot.mimeType};base64,${establishingShot.base64}`} alt={establishingShot.name.replace(/ \(.+\)$/, '')} className="w-full h-full object-cover" />
                    </div>
                    <p className="text-gray-400 text-sm font-semibold">{establishingShot.name.replace(/ \(.+\)$/, '')}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

    </div>
  );
};

export default CharacterGenerator;