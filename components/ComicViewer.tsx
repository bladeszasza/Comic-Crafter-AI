
import React, { useState } from 'react';
import type { GeneratedPanel } from '../types.js';
import { COVER_PAGE_NUMBER, CENTERFOLD_PAGE_NUMBER } from '../constants.js';
import ComicPage from './ComicPage.js';
import { DownloadIcon } from './icons.js';

interface ComicViewerProps {
  panels: GeneratedPanel[];
  title: string;
  onRestart: () => void;
  onDownload: (isError: boolean) => void;
}

const ComicViewer: React.FC<ComicViewerProps> = ({ panels, title, onRestart, onDownload }) => {
  const [isDownloading, setIsDownloading] = useState(false);

  // Group panels by page
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

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await onDownload(false);
    } catch (error) {
      console.error("Failed to generate Zip file:", error);
      alert("There was an error creating the Zip file. Please check the console for details.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-6xl font-display text-yellow-400 tracking-wider">{title}</h2>
        <p className="text-xl text-gray-300 mt-2">Your comic is complete!</p>
      </div>
      
      <div className="flex justify-center gap-4 mb-8">
        <button
            onClick={onRestart}
            className="bg-gray-600 text-white font-bold py-3 px-8 rounded-lg text-xl font-display tracking-wider hover:bg-gray-500 transition-all duration-300"
        >
            Create Another
        </button>
        <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="bg-green-600 text-white font-bold py-3 px-8 rounded-lg text-xl font-display tracking-wider hover:bg-green-500 transition-all duration-300 flex items-center justify-center disabled:bg-green-800 disabled:cursor-not-allowed"
        >
            <DownloadIcon className="w-6 h-6 mr-3" />
            {isDownloading ? 'Generating ZIP...' : 'Download ZIP'}
        </button>
      </div>

      <div className="space-y-8 flex flex-col items-center">
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

export default ComicViewer;
