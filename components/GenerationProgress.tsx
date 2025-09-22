
import React from 'react';
import type { GeneratedPanel, Panel, GeneratedCharacter } from '../types.js';
import { COVER_PAGE_NUMBER, CENTERFOLD_PAGE_NUMBER } from '../constants.js';
import ComicPage from './ComicPage.js';

interface ConsistencyInterventionState {
  panel: Panel;
  characterInQuestion: GeneratedCharacter;
  generatedImageBase64: string;
  reason: string;
}

interface GenerationProgressProps {
  progress: number;
  status: string;
  error: string | null;
  onRetry: () => void;
  onDownload: (isError: boolean) => void;
  panels: GeneratedPanel[];
  title: string;
  interventionState: ConsistencyInterventionState | null;
  onAcceptInconsistent: () => void;
  onRejectInconsistent: () => void;
}

const GenerationProgress: React.FC<GenerationProgressProps> = ({ progress, status, error, onRetry, onDownload, panels, title, interventionState, onAcceptInconsistent, onRejectInconsistent }) => {
  const pages = panels.reduce<Record<string, GeneratedPanel[]>>((acc, panel) => {
    const pageKey = String(panel.page_number);
    if (!acc[pageKey]) acc[pageKey] = [];
    acc[pageKey].push(panel);
    return acc;
  }, {});

  const getPageSortValue = (pageKey: string): number => {
    if (pageKey === String(COVER_PAGE_NUMBER)) return -1;
    if (pageKey === CENTERFOLD_PAGE_NUMBER) return 10.5;
    const num = Number(pageKey);
    return isNaN(num) ? Infinity : num;
  };
  
  const sortedPageKeys = Object.keys(pages).sort((a, b) => getPageSortValue(a) - getPageSortValue(b));

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col items-center animate-fade-in">
      <div className="w-full max-w-6xl mx-auto bg-gray-800/50 rounded-2xl shadow-lg p-8 flex flex-col items-center mb-8">
        <h2 className="text-4xl font-display text-center text-yellow-400 tracking-wider">3. Your Comic Unfolds</h2>
        
        {!interventionState && error && (
          <div className="w-full text-center my-4 bg-red-800/50 border border-red-600 text-red-200 p-4 rounded-lg">
              <p className="font-bold">An Error Occurred</p>
              <p className="text-sm mb-4">{error.replace('Generation Failed: ', '')}</p>
              <div className="flex justify-center gap-4">
                <button
                    onClick={onRetry}
                    className="bg-yellow-500 text-gray-900 font-bold py-2 px-6 rounded-lg text-lg font-display tracking-wider hover:bg-yellow-400 transition-all duration-300"
                >
                    Retry
                </button>
                <button
                    onClick={() => onDownload(true)}
                    className="bg-blue-500 text-white font-bold py-2 px-6 rounded-lg text-lg font-display tracking-wider hover:bg-blue-400 transition-all duration-300"
                >
                    Download Progress
                </button>
              </div>
          </div>
        )}
        
        {!interventionState && !error && (
          <p className="text-center text-gray-400 mt-2 mb-8">{status}</p>
        )}

        <div className="w-full bg-gray-700 rounded-full h-4 mb-8 border border-gray-600">
          <div 
            className="bg-yellow-500 h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          >
          </div>
        </div>
      </div>
      
      {interventionState && (
        <div className="w-full max-w-4xl mx-auto my-8 p-6 bg-yellow-900/20 border-2 border-yellow-600 rounded-lg text-center animate-fade-in" role="alertdialog" aria-labelledby="intervention-title" aria-describedby="intervention-reason">
            <h3 id="intervention-title" className="text-3xl font-display text-yellow-400">Consistency Check Required</h3>
            <p className="text-yellow-200 mt-2 mb-4">
                The generated image for character <strong className="font-bold">{interventionState.characterInQuestion.name}</strong> may be inconsistent.
            </p>
            <div className="bg-gray-800 p-2 rounded-md mb-4 text-left">
                <p id="intervention-reason" className="text-sm text-gray-300">
                    <strong className="font-bold text-red-400">Reason:</strong> {interventionState.reason}
                </p>
            </div>
            
            <p className="text-lg text-gray-300 mb-4">Please select an image to proceed:</p>
            
            <div className="flex flex-col md:flex-row justify-center items-stretch gap-8">
                <div 
                    className="flex-1 p-3 bg-gray-700 rounded-lg cursor-pointer hover:ring-4 ring-red-500 transition-all flex flex-col justify-between"
                    onClick={onRejectInconsistent}
                    role="button"
                    tabIndex={0}
                    aria-label="Reject generated image and retry panel generation"
                >
                    <div>
                        <h4 className="text-xl font-display text-red-400">Reference Image</h4>
                        <p className="text-sm text-gray-400 mb-2">(This is how they SHOULD look)</p>
                        <img src={interventionState.characterInQuestion.imageUrls.full} className="w-full aspect-square object-cover rounded" alt="Reference" />
                    </div>
                    <span className="mt-3 block w-full bg-red-600 text-white font-bold py-2 px-4 rounded-lg font-display tracking-wider hover:bg-red-500">
                        Reject & Retry Panel
                    </span>
                </div>
                
                <div 
                    className="flex-1 p-3 bg-gray-700 rounded-lg cursor-pointer hover:ring-4 ring-green-500 transition-all flex flex-col justify-between"
                    onClick={onAcceptInconsistent}
                    role="button"
                    tabIndex={0}
                    aria-label="Accept the generated image and continue"
                >
                    <div>
                        <h4 className="text-xl font-display text-green-400">Generated Image</h4>
                        <p className="text-sm text-gray-400 mb-2">(The new, potentially incorrect image)</p>
                        <img src={`data:image/jpeg;base64,${interventionState.generatedImageBase64}`} className="w-full aspect-square object-cover rounded" alt="Generated" />
                    </div>
                    <span className="mt-3 block w-full bg-green-600 text-white font-bold py-2 px-4 rounded-lg font-display tracking-wider hover:bg-green-500">
                        Accept & Continue
                    </span>
                </div>
            </div>

            <div className="mt-6">
                <button
                    onClick={() => onDownload(true)}
                    className="bg-blue-500 text-white font-bold py-2 px-6 rounded-lg text-lg font-display tracking-wider hover:bg-blue-400 transition-all duration-300"
                >
                    Download Current Progress
                </button>
            </div>
        </div>
      )}

      <div className="space-y-8 flex flex-col items-center w-full">
        {sortedPageKeys.map(pageKey => {
            const isCenterfold = pageKey === CENTERFOLD_PAGE_NUMBER;
            const pagePanels = isCenterfold
                ? [...(pages['10'] || []), ...(pages['11'] || [])]
                : pages[pageKey];
            
            if (!pagePanels || pagePanels.length === 0) return null;

            return <ComicPage key={pageKey} panels={pagePanels} pageNumber={pageKey} isCenterfold={isCenterfold} />;
        })}
      </div>
    </div>
  );
};

export default GenerationProgress;
