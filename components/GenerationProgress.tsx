
import React from 'react';
import type { GeneratedPanel } from '../types.js';
import { COVER_PAGE_NUMBER, CENTERFOLD_PAGE_NUMBER } from '../constants.js';
import ComicPage from './ComicPage.js';

interface GenerationProgressProps {
  progress: number;
  status: string;
  error: string | null;
  onRetry: () => void;
  onDownload: (isError: boolean) => void;
  panels: GeneratedPanel[];
  title: string;
}

const GenerationProgress: React.FC<GenerationProgressProps> = ({ progress, status, error, onRetry, onDownload, panels, title }) => {
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
        
        {error ? (
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
        ) : (
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
