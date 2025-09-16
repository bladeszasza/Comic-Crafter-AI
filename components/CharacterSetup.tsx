
import React, { useState, useCallback } from 'react';
import { UploadIcon, SparklesIcon } from './icons.js';

interface CharacterSetupProps {
  onCharacterAnalyzed: (imageBase64: string) => void;
  onStartFromDefault: () => void;
  isLoading: boolean;
  setError: (error: string | null) => void;
}

const CharacterSetup: React.FC<CharacterSetupProps> = ({ onCharacterAnalyzed, onStartFromDefault, isLoading, setError }) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setError(null);
      
      const reader = new FileReader();
      reader.onloadstart = () => {
          setPreviewImage(null); // Clear previous preview
      }
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setPreviewImage(base64String);
        onCharacterAnalyzed(base64String);
      };
      reader.onerror = () => {
          setError("Failed to read the selected file.");
      }
      reader.readAsDataURL(selectedFile);
    }
  }, [onCharacterAnalyzed, setError]);

  return (
    <div className="w-full max-w-4xl mx-auto bg-gray-800 rounded-2xl shadow-lg p-8">
      <h2 className="text-4xl font-display text-center text-yellow-400 tracking-wider">1. Create Your Hero</h2>
      <p className="text-center text-gray-400 mt-2 mb-8">Upload an image to inspire your hero, or use our pre-made story to get started fast.</p>
      
      <div className="flex justify-center">
        <div className="w-full max-w-md flex flex-col items-center">
            <label htmlFor="character-upload" className="w-full h-80 border-4 border-dashed border-gray-600 rounded-lg flex flex-col justify-center items-center cursor-pointer hover:border-yellow-400 hover:bg-gray-700 transition-all duration-300">
                {isLoading ? (
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto"></div>
                        <p className="mt-4 text-lg font-semibold">Warming up the studio...</p>
                    </div>
                ) : previewImage ? (
                    <img src={previewImage} alt="Character preview" className="w-full h-full object-cover rounded-md" />
                ) : (
                    <>
                        <UploadIcon className="w-16 h-16 text-gray-500" />
                        <span className="mt-2 text-lg font-semibold text-gray-400">Upload Character Image</span>
                        <span className="text-sm text-gray-500">PNG, JPG, or GIF</span>
                    </>
                )}
            </label>
            <input id="character-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={isLoading} />

            <div className="relative w-full flex items-center justify-center my-6">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-gray-600"></div>
              </div>
              <div className="relative px-4 bg-gray-800 text-gray-500 text-sm">OR</div>
            </div>

            <button
                onClick={onStartFromDefault}
                disabled={isLoading}
                className="w-full bg-purple-600 text-white font-bold py-4 px-6 rounded-lg text-lg font-display tracking-wider hover:bg-purple-500 transition-all duration-300 flex items-center justify-center disabled:bg-purple-800 disabled:cursor-not-allowed"
            >
                <SparklesIcon className="w-6 h-6 mr-3" />
                Start with Default Story
            </button>
        </div>
      </div>
    </div>
  );
};

export default CharacterSetup;