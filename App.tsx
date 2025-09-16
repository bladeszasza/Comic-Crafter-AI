
import React, { useState, useCallback, useEffect } from 'react';
import type { StoryOutline, GeneratedPanel, GeneratedCharacter, CharacterProfile, Panel, StoryDevelopmentPackage, CharacterConcept, CharacterImage } from './types.js';
import { AppStep } from './types.js';
import CharacterSetup from './components/CharacterSetup.js';
import CharacterGenerator from './components/CharacterGenerator.js';
import GenerationProgress from './components/GenerationProgress.js';
import ComicViewer from './components/ComicViewer.js';
import StoryViewer from './components/StoryViewer.js';
import { analyzeCharacter, generateStory, generatePanelImage, generateCharacterConcepts, developStory, generateCharacterImage, generateCoverImage, generateSceneImage } from './services/geminiService.js';
import { COVER_PAGE_NUMBER, CENTERFOLD_PAGE_NUMBER } from './constants.js';
import { logExecutionTime } from './utils/logger.js';
import { zipAndDownloadProgress } from './utils/zipDownloader.js';

const slugify = (text: string) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // remove non-word chars
    .replace(/[\s_-]+/g, '-') // collapse dashes
    .replace(/^-+|-+$/g, '')
    .substring(0, 75); // Truncate for safety


const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.CHARACTER_SETUP);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [castStatus, setCastStatus] = useState('');

  const [characterProfile, setCharacterProfile] = useState<CharacterProfile | null>(null);
  const [story, setStory] = useState<StoryOutline | null>(null);
  const [storyDevelopmentPackage, setStoryDevelopmentPackage] = useState<StoryDevelopmentPackage | null>(null);
  const [characterConcepts, setCharacterConcepts] = useState<CharacterConcept[]>([]);
  const [generatedPanels, setGeneratedPanels] = useState<GeneratedPanel[]>([]);
  const [characterRoster, setCharacterRoster] = useState<GeneratedCharacter[]>([]);
  const [sceneImages, setSceneImages] = useState<Map<string, Record<string, CharacterImage>>>(new Map());
  const [isComicGenerationReady, setIsComicGenerationReady] = useState(false);
  
  const [lastUploadedImage, setLastUploadedImage] = useState<string | null>(null);
  const [isDevMode, setIsDevMode] = useState(false);

  const resetState = () => {
    setStep(AppStep.CHARACTER_SETUP);
    setIsLoading(false);
    setError(null);
    setProgress(0);
    setStatus('');
    setCastStatus('');
    setCharacterProfile(null);
    setStory(null);
    setStoryDevelopmentPackage(null);
    setCharacterConcepts([]);
    setGeneratedPanels([]);
    setCharacterRoster([]);
    setSceneImages(new Map());
    setIsComicGenerationReady(false);
    setLastUploadedImage(null);
    setIsDevMode(false);
  };

  const loadLocalImageAsBase64 = async (path: string): Promise<string | null> => {
    try {
        const response = await fetch(path);
        if (!response.ok) {
            console.log(`Local asset not found: ${path}. Will generate.`);
            return null;
        }
        let blob = await response.blob();

        // FIX: If the server provides a generic MIME type, override it based on the file extension.
        // This prevents 'application/octet-stream' from being used, which is unsupported by the API.
        if (blob.type === '' || blob.type === 'application/octet-stream') {
            let newMimeType = 'image/jpeg'; // Default to jpeg as all default assets are jpg
            if (path.endsWith('.png')) {
                newMimeType = 'image/png';
            } else if (path.endsWith('.gif')) {
                newMimeType = 'image/gif';
            }
            blob = new Blob([blob], { type: newMimeType });
        }

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error(`Error loading local asset ${path}:`, error);
        return null;
    }
  };
  
  const startComicGeneration = useCallback(async (
      storyOutline: StoryOutline,
      allCharacters: GeneratedCharacter[],
      currentSceneImages: Map<string, Record<string, CharacterImage>>,
      currentCharacterProfile: CharacterProfile,
      currentStoryDevelopmentPackage: StoryDevelopmentPackage | null
    ) => {
      if (!currentCharacterProfile || !currentStoryDevelopmentPackage) {
          setError("Character profile or story blueprint is missing. Cannot generate pages.");
          setStep(AppStep.CHARACTER_SETUP);
          return;
      }
      const { art_style } = currentCharacterProfile;

      setStep(AppStep.GENERATION_IN_PROGRESS);
      setError(null);
      const comicGenerationStartTime = performance.now();
      
      try {
        const existingPanelKeys = new Set(generatedPanels.map(p => `${p.page_number}-${p.panel_number}`));
        const panelsToGenerate = storyOutline.panels.filter(p => !existingPanelKeys.has(`${p.page_number}-${p.panel_number}`));
        
        let panelsGeneratedCount = generatedPanels.length;
        const totalPanelsToGenerate = generatedPanels.length + panelsToGenerate.length + 1; // +1 for the cover

        const updateProgress = () => {
            panelsGeneratedCount++;
            const newProgress = totalPanelsToGenerate > 0 ? Math.round((panelsGeneratedCount / totalPanelsToGenerate) * 100) : 0;
            setProgress(newProgress);
        };

        // Generate Cover First
        setStatus('Generating the cover...');
        const coverPanel = storyOutline.panels.find(p => p.page_number === COVER_PAGE_NUMBER);
        if (coverPanel && !existingPanelKeys.has(`${coverPanel.page_number}-${coverPanel.panel_number}`)) {
          const protagonist = allCharacters.find(c => c.role === 'Protagonist') || allCharacters[0];
          const characterDescriptions = `${protagonist.name} (${protagonist.role}): ${protagonist.description}`;
          
          const characterImageForCover: CharacterImage[] = Object.values(protagonist.imageUrls).flatMap(url => {
              if (!url || !url.includes(',')) return [];
              const [header, base64] = url.split(',');
              const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
              if (!base64) return [];
              return [{ name: protagonist.name, base64, mimeType }];
          });
          
          const coverImageBase64 = await logExecutionTime(
              '6a. Generate Cover Image',
              () => generateCoverImage(
                 storyOutline.title,
                 currentStoryDevelopmentPackage.logline,
                 characterDescriptions,
                 characterImageForCover,
                 art_style
              )
          );
          const newCoverPanel: GeneratedPanel = { 
            ...coverPanel, 
            imageUrl: `data:image/jpeg;base64,${coverImageBase64}` 
          };
          setGeneratedPanels(prev => [...prev, newCoverPanel]);
          updateProgress();
        }
        
        const regularPanelsToGenerate = panelsToGenerate.filter(p => p.page_number !== COVER_PAGE_NUMBER);

        for (const panel of regularPanelsToGenerate) {
            setStatus(`Generating Page ${panel.page_number}, Panel ${panel.panel_number}...`);

            const characterNamesOnPanel = new Set<string>();
            panel.visuals.characters?.forEach(char => {
              characterNamesOnPanel.add(char.name);
            });
            
            const charactersOnPanel = allCharacters.filter(char => characterNamesOnPanel.has(char.name));
            const characterDescriptions = charactersOnPanel
              .map(c => `${c.name} (${c.role}): ${c.description}`)
              .join('. ');
            
            const characterImagesOnPanel: CharacterImage[] = charactersOnPanel.flatMap(char => {
              return Object.values(char.imageUrls).map(url => {
                  if (!url || !url.includes(',')) return null;
                  const [header, base64] = url.split(',');
                  const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
                  if (!base64) return null;
                  return { name: char.name, base64, mimeType };
              }).filter((img): img is CharacterImage => img !== null);
            });

            const locationKey = panel.visuals.setting.location.trim().toLowerCase();
            const locationScenes = currentSceneImages.get(locationKey);
            let sceneImage: CharacterImage | undefined;

            if (locationScenes) {
                const angle = panel.visuals.composition.angle.toLowerCase();
                const shotType = panel.visuals.composition.shot_type.toLowerCase();

                if (angle.includes('low')) {
                    sceneImage = locationScenes['low'];
                } else if (angle.includes('high')) {
                    sceneImage = locationScenes['high'];
                } else if (shotType.includes('wide') || shotType.includes('splash')) {
                    sceneImage = locationScenes['wide'];
                } else {
                    sceneImage = locationScenes['medium']; // Default/fallback
                }
            }

            const panelImageBase64 = await logExecutionTime(
                `6b. Generate Panel Image (Page ${panel.page_number}, Panel ${panel.panel_number})`,
                () => generatePanelImage(
                    panel, 
                    characterDescriptions, 
                    characterImagesOnPanel, 
                    art_style,
                    sceneImage
                )
            );
            
            const newPanel: GeneratedPanel = { 
              ...panel, 
              imageUrl: `data:image/jpeg;base64,${panelImageBase64}` 
            };

            setGeneratedPanels(prev => [...prev, newPanel]);
            updateProgress();
        }

        const comicGenerationEndTime = performance.now();
        const comicDuration = ((comicGenerationEndTime - comicGenerationStartTime) / 1000).toFixed(2);
        console.log(`%c[TOTAL] Final Comic Page Generation took ${comicDuration} seconds.`, 'color: #f39c12; font-weight: bold;');
        
        setStatus('Finalizing your comic...');
        setProgress(100);
        setStep(AppStep.VIEW_COMIC);

      } catch (err) {
        console.error(err);
        let errorMessage = 'An unknown error occurred during panel generation.';
        if (err instanceof Error) {
            errorMessage = err.message;
        }
        setError(`Generation Failed: ${errorMessage}`);
      }
  }, [generatedPanels]);


  const handleStartFromDefault = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setIsDevMode(true);

    try {
        // 1. Load metadata
        setCastStatus('Loading default story from file...');
        setStatus('Loading default story...');
        const response = await fetch('./default/comic_metadata.json');
        if (!response.ok) throw new Error('Could not load default/comic_metadata.json.');
        const data = await response.json();

        const fullStory: StoryOutline = data.story;
        const shortStory: StoryOutline = {
            ...fullStory,
            panels: fullStory.panels.filter(panel => panel.page_number <= 3),
        };
        const profile: CharacterProfile = data.characterProfile;
        const devPackage: StoryDevelopmentPackage = data.storyDevelopmentPackage;
        const concepts: CharacterConcept[] = data.characterConcepts;

        // Set metadata state
        setCharacterProfile(profile);
        setStoryDevelopmentPackage(devPackage);
        setStory(shortStory);
        setCharacterConcepts(concepts);
        
        // Go to progress screen immediately
        setStep(AppStep.GENERATION_IN_PROGRESS);

        // 2. Load all local assets
        setCastStatus('Loading default character portraits...');
        const roster: GeneratedCharacter[] = [];
        for (const concept of concepts) {
            const imageUrls: Record<string, string> = {};
            const characterNameSanitized = concept.name.replace(/\s+/g, '_');
            const path = `./default/portraits/${characterNameSanitized}/full.jpg`;
            const dataUrl = await loadLocalImageAsBase64(path);
            if (!dataUrl) throw new Error(`Default asset missing: ${path}`);
            
            // Duplicate 'full.jpg' for all required shots to avoid falling back to generation
            imageUrls['full'] = dataUrl;
            imageUrls['closeup_happy'] = dataUrl;
            imageUrls['action'] = dataUrl;
            
            roster.push({ ...concept, imageUrls });
        }
        setCharacterRoster(roster);

        setCastStatus('Loading default background scenes...');
        const uniqueLocations = new Map<string, Panel['visuals']['setting']>();
        shortStory.panels.forEach(panel => {
            const locationKey = panel.visuals.setting.location.trim().toLowerCase();
            if (!uniqueLocations.has(locationKey)) {
                uniqueLocations.set(locationKey, panel.visuals.setting);
            }
        });

        const newSceneImages = new Map<string, Record<string, CharacterImage>>();
        for (const [locationKey, setting] of uniqueLocations.entries()) {
            const locationPerspectives: Record<string, CharacterImage> = {};
            const locationSlug = slugify(locationKey);
            const path = `./default/scenes/${locationSlug}/wide.jpg`;
            const dataUrl = await loadLocalImageAsBase64(path);
            if (dataUrl) {
                const [header, base64] = dataUrl.split(',');
                const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
                if (base64) {
                    const sceneImage: CharacterImage = { name: `${setting.location} (wide)`, base64, mimeType };
                    // Duplicate 'wide.jpg' for all perspectives to avoid generation
                    locationPerspectives['wide'] = sceneImage;
                    locationPerspectives['medium'] = sceneImage;
                    locationPerspectives['low'] = sceneImage;
                    locationPerspectives['high'] = sceneImage;
                    newSceneImages.set(locationKey, locationPerspectives);
                }
            } else {
               console.warn(`Could not find default scene asset: ${path}. This may fall back to generation.`);
            }
        }
        setSceneImages(newSceneImages);
        
        // 3. Start comic generation directly with loaded assets
        await startComicGeneration(shortStory, roster, newSceneImages, profile, devPackage);

    } catch (err) {
        console.error(err);
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to load default story: ${errorMessage}`);
        setStep(AppStep.CHARACTER_SETUP);
        setIsDevMode(false);
    } finally {
        setIsLoading(false);
    }
  }, [startComicGeneration]);

  useEffect(() => {
    if (isComicGenerationReady && story && characterRoster.length > 0 && characterProfile && step !== AppStep.GENERATION_IN_PROGRESS && step !== AppStep.VIEW_COMIC) {
      startComicGeneration(story, characterRoster, sceneImages, characterProfile, storyDevelopmentPackage);
    }
  }, [isComicGenerationReady, story, characterRoster, startComicGeneration, step, sceneImages, characterProfile, storyDevelopmentPackage]);
  
  useEffect(() => {
    const generateAssets = async () => {
        if (step === AppStep.CHARACTER_GENERATION && characterConcepts.length > 0 && characterRoster.length === 0 && characterProfile && story) {
            setIsLoading(true);
            const assetGenerationStartTime = performance.now();
            try {
                // 1. Generate Portraits
                const characterShots: Record<string, string> = {
                    'full': 'Full-body, dynamic, neutral standing pose.',
                    'closeup_happy': 'Close-up portrait from the chest up, happy expression.',
                    'action': 'Medium shot, in a dynamic action pose.'
                };
                const artStyle = characterProfile.art_style;
                const roster: GeneratedCharacter[] = [];

                const portraitGenerationStartTime = performance.now();
                for (const concept of characterConcepts) {
                    setCastStatus(`Designing character: ${concept.name}...`);
                    const imageUrls: Record<string, string> = {};
                    for (const [shotKey, shotDesc] of Object.entries(characterShots)) {
                        let dataUrl: string | null = null;
                        if (isDevMode) {
                            const characterNameSanitized = concept.name.replace(/\s+/g, '_');
                            const path = `./default/portraits/${characterNameSanitized}/${shotKey}.jpg`;
                            dataUrl = await loadLocalImageAsBase64(path);
                        }

                        if (!dataUrl) {
                            // Fallback to generation
                            const imageBase64 = await logExecutionTime(
                                `5a. Generate Portrait: ${concept.name} (${shotKey})`,
                                () => generateCharacterImage(concept.description, artStyle, shotDesc)
                            );
                            dataUrl = `data:image/jpeg;base64,${imageBase64}`;
                        }
                        
                        imageUrls[shotKey] = dataUrl;
                    }
                    const newCharacter: GeneratedCharacter = { ...concept, imageUrls };
                    roster.push(newCharacter);
                    setCharacterRoster(prev => [...prev, newCharacter]); // Update incrementally for UI
                }
                const portraitGenerationEndTime = performance.now();
                const portraitDuration = ((portraitGenerationEndTime - portraitGenerationStartTime) / 1000).toFixed(2);
                console.log(`%c[TOTAL] All Character Portrait Generation took ${portraitDuration} seconds.`, 'color: #f39c12; font-weight: bold;');
                
                // 2. Generate Scenes
                setCastStatus('Pre-rendering background scenes...');
                const uniqueLocations = new Map<string, Panel['visuals']['setting']>();
                story.panels.forEach(panel => {
                    const locationKey = panel.visuals.setting.location.trim().toLowerCase();
                    if (!uniqueLocations.has(locationKey)) {
                        uniqueLocations.set(locationKey, panel.visuals.setting);
                    }
                });
                
                const sceneGenerationStartTime = performance.now();
                const scenePerspectives: Record<string, string> = {
                    'wide': 'Establishing Wide Shot',
                    'medium': 'Medium Shot from a neutral angle',
                    'low': 'Dramatic Low Angle',
                    'high': 'Observational High Angle'
                };

                const newSceneImages = new Map<string, Record<string, CharacterImage>>();
                for (const [locationKey, setting] of uniqueLocations.entries()) {
                    const locationPerspectives: Record<string, CharacterImage> = {};
                    for (const [perspectiveKey, perspectiveDesc] of Object.entries(scenePerspectives)) {
                        setCastStatus(`Generating scene: ${setting.location} (${perspectiveKey} view)...`);
                        
                        let imageBase64: string | null = null;
                        let mimeType = 'image/jpeg';

                        if (isDevMode) {
                            const locationSlug = slugify(locationKey);
                            const path = `./default/scenes/${locationSlug}/${perspectiveKey}.jpg`;
                            const dataUrl = await loadLocalImageAsBase64(path);
                            if (dataUrl) {
                                const [header, base64] = dataUrl.split(',');
                                mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
                                if(base64) imageBase64 = base64;
                            }
                        }

                        if (!imageBase64) {
                            // Fallback to generation
                            imageBase64 = await logExecutionTime(
                                `5b. Generate Scene: ${setting.location} (${perspectiveKey})`,
                                () => generateSceneImage(setting, artStyle, perspectiveDesc)
                            );
                        }

                        locationPerspectives[perspectiveKey] = {
                            name: `${setting.location} (${perspectiveKey})`,
                            base64: imageBase64,
                            mimeType: mimeType
                        };
                    }
                    newSceneImages.set(locationKey, locationPerspectives);
                    setSceneImages(new Map(newSceneImages)); // Update incrementally for UI
                }
                const sceneGenerationEndTime = performance.now();
                const sceneDuration = ((sceneGenerationEndTime - sceneGenerationStartTime) / 1000).toFixed(2);
                console.log(`%c[TOTAL] All Scene Generation took ${sceneDuration} seconds.`, 'color: #f39c12; font-weight: bold;');

                
                // 3. Signal readiness
                const assetGenerationEndTime = performance.now();
                const assetDuration = ((assetGenerationEndTime - assetGenerationStartTime) / 1000).toFixed(2);
                console.log(`%c[TOTAL] Asset Generation Phase (Portraits & Scenes) took ${assetDuration} seconds.`, 'color: #f39c12; font-weight: bold;');

                setCastStatus('The cast and scenes are ready! Assembling the pages...');
                setIsComicGenerationReady(true);

            } catch (err) {
                console.error(err);
                const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
                setError(`Failed to generate assets: ${errorMessage}`);
                setStep(AppStep.CHARACTER_SETUP);
            } finally {
                setIsLoading(false);
            }
        }
    };
    if (!isDevMode) {
        generateAssets();
    }
  }, [step, characterConcepts, characterProfile, story, characterRoster.length, isDevMode]);


  const handleCharacterAnalyzed = useCallback(async (imageBase64: string) => {
    setLastUploadedImage(imageBase64);
    setIsLoading(true);
    setError(null);
    setIsDevMode(false); // Set to false for the standard user upload flow
    const analysisStartTime = performance.now();

    try {
        setCastStatus('Analyzing character...');
        const [mimeType, cleanBase64] = imageBase64.split(';base64,');
        const profile: CharacterProfile = await logExecutionTime(
            '1. Analyze Character', 
            () => analyzeCharacter(cleanBase64, mimeType.split(':')[1])
        );
        setCharacterProfile(profile);
        
        setCastStatus('Generating supporting cast...');
        const concepts = await logExecutionTime(
            '2. Generate Character Concepts',
            () => generateCharacterConcepts(profile)
        );
        setCharacterConcepts(concepts);
        
        setCastStatus('Developing story blueprint...');
        const devPackage = await logExecutionTime(
            '3. Develop Story Blueprint',
            () => developStory(concepts)
        );
        setStoryDevelopmentPackage(devPackage);
        
        setCastStatus('Generating detailed comic panels from blueprint...');
        const allCharactersDescription = concepts
            .map(c => `${c.name} (${c.role}): ${c.description}`)
            .join('. ');
        const storyOutline = await logExecutionTime(
            '4. Generate Detailed Comic Script',
            () => generateStory(devPackage, allCharactersDescription)
        );
        setStory(storyOutline);
        
        const analysisEndTime = performance.now();
        const duration = ((analysisEndTime - analysisStartTime) / 1000).toFixed(2);
        console.log(`%c[TOTAL] Story Planning Phase took ${duration} seconds.`, 'color: #f39c12; font-weight: bold;');
        
        setStep(AppStep.CHARACTER_GENERATION);

    } catch (err) {
        console.error(err);
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to create story: ${errorMessage}`);
        setStep(AppStep.CHARACTER_SETUP);
    } finally {
        setIsLoading(false);
    }
  }, []);
  
  const handleRetryGeneration = useCallback(() => {
    if (story && characterRoster.length > 0 && characterProfile && storyDevelopmentPackage) {
        startComicGeneration(story, characterRoster, sceneImages, characterProfile, storyDevelopmentPackage);
    } else {
        setError("Cannot retry. Story or character data is missing.");
        setStep(AppStep.CHARACTER_SETUP);
    }
  }, [story, characterRoster, startComicGeneration, sceneImages, characterProfile, storyDevelopmentPackage]);

  const handleDownloadProgress = useCallback(async () => {
    try {
        await zipAndDownloadProgress(
            story?.title || 'comic_crafter',
            {
                characterProfile,
                storyDevelopmentPackage,
                story,
                characterConcepts,
                characterRoster,
                sceneImages,
                generatedPanels
            }
        );
    } catch(err) {
        console.error("Failed to create zip file:", err);
        setError("Failed to create zip file. Check console for details.");
    }
  }, [characterProfile, storyDevelopmentPackage, story, characterConcepts, characterRoster, sceneImages, generatedPanels]);

  const handleRetryInitial = useCallback(() => {
    if (isDevMode) {
        handleStartFromDefault();
    } else if (lastUploadedImage) {
        handleCharacterAnalyzed(lastUploadedImage);
    } else {
        setError("No image was uploaded to retry.");
        resetState();
    }
  }, [lastUploadedImage, handleCharacterAnalyzed, isDevMode, handleStartFromDefault]);

  const renderStep = () => {
    switch (step) {
      case AppStep.CHARACTER_SETUP:
        return <CharacterSetup 
                  onCharacterAnalyzed={handleCharacterAnalyzed} 
                  onStartFromDefault={handleStartFromDefault}
                  isLoading={isLoading} 
                  setError={setError} 
                />;
      case AppStep.CHARACTER_GENERATION:
        return story && storyDevelopmentPackage && (
          <CharacterGenerator 
            characters={characterRoster} 
            status={castStatus}
            prologue={story.prologue}
            storyPackage={storyDevelopmentPackage}
            scenes={sceneImages}
          />
        );
      case AppStep.VIEW_STORY:
        return story && <StoryViewer story={story} onRestart={resetState} />;
      case AppStep.GENERATION_IN_PROGRESS:
        return story && (
          <div className="w-full max-w-7xl mx-auto flex flex-col items-center space-y-8">
            {storyDevelopmentPackage && (
              <CharacterGenerator
                characters={characterRoster}
                status={castStatus}
                prologue={story.prologue}
                storyPackage={storyDevelopmentPackage}
                scenes={sceneImages}
              />
            )}
            <GenerationProgress
              progress={progress}
              status={status}
              error={error}
              onRetry={handleRetryGeneration}
              onDownload={handleDownloadProgress}
              panels={generatedPanels}
              title={story.title}
            />
          </div>
        );
      case AppStep.VIEW_COMIC:
        return story && <ComicViewer panels={generatedPanels} title={story.title} onRestart={resetState} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8 flex flex-col items-center">
      <header className="text-center mb-8">
        <h1 className="text-6xl sm:text-7xl font-display tracking-wider text-white">COMIC CRAFTER <span className="text-yellow-400">AI</span></h1>
        <p className="text-gray-400 text-lg mt-2">Turn a single image into a full comic book adventure.</p>
      </header>
      
      <main className="w-full flex justify-center">
        {error && ![AppStep.GENERATION_IN_PROGRESS].includes(step) && (
          <div className="w-full max-w-4xl mx-auto bg-red-800/50 border border-red-600 text-red-200 p-4 rounded-lg mb-6 text-center absolute top-28 z-10">
              <p><strong>Error:</strong> {error}</p>
              <div className="flex justify-center gap-4 mt-2">
                  <button onClick={handleRetryInitial} className="bg-yellow-500 text-gray-900 font-bold py-1 px-4 rounded text-sm hover:bg-yellow-400">Retry</button>
                  <button onClick={handleDownloadProgress} className="bg-blue-500 text-white font-bold py-1 px-4 rounded text-sm hover:bg-blue-400">Download Progress</button>
              </div>
              <button onClick={() => { setError(null); resetState(); }} className="mt-2 text-xs underline text-gray-400">Dismiss & Start Over</button>
          </div>
        )}
        {renderStep()}
      </main>

      <footer className="text-center mt-8 text-gray-500 text-sm">
        <p>Powered by Google Gemini. For entertainment purposes only.</p>
      </footer>
    </div>
  );
};

export default App;
