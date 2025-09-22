
import React, { useState, useCallback, useEffect } from 'react';
import type { StoryOutline, GeneratedPanel, GeneratedCharacter, CharacterProfile, Panel, StoryDevelopmentPackage, CharacterConcept, CharacterImage } from './types.js';
import { AppStep } from './types.js';
import CharacterSetup from './components/CharacterSetup.js';
import CharacterGenerator from './components/CharacterGenerator.js';
import GenerationProgress from './components/GenerationProgress.js';
import ComicViewer from './components/ComicViewer.js';
import StoryViewer from './components/StoryViewer.js';
import { analyzeCharacter, generateStory, generatePanelImage, generateCharacterConcepts, developStory, generateCharacterImage, generateCoverImage, generateSceneImage, generateFullStoryText, verifyCharacterConsistency, polishPanelDialogue } from './services/geminiService.js';
import { COVER_PAGE_NUMBER, CENTERFOLD_PAGE_NUMBER } from './constants.js';
import { logExecutionTime } from './utils/logger.js';
import { zipAndDownloadProgress } from './utils/zipDownloader.js';

declare const JSZip: any;

const slugify = (text: string) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // remove non-word chars
    .replace(/[\s_-]+/g, '-') // collapse dashes
    .replace(/^-+|-+$/g, '')
    .substring(0, 75); // Truncate for safety

interface ConsistencyInterventionState {
  panel: Panel;
  characterInQuestion: GeneratedCharacter;
  generatedImageBase64: string;
  reason: string;
}

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
  
  const [lastUploadedImage, setLastUploadedImage] = useState<string | null>(null);
  const [isDevMode, setIsDevMode] = useState(false);
  const [isRestoredAndReady, setIsRestoredAndReady] = useState(false);

  // State for consistency check user intervention
  const [interventionState, setInterventionState] = useState<ConsistencyInterventionState | null>(null);
  const [interventionResolver, setInterventionResolver] = useState<{ resolve: (choice: 'accept' | 'retry') => void } | null>(null);

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
    setLastUploadedImage(null);
    setIsDevMode(false);
    setIsRestoredAndReady(false);
    setInterventionState(null);
    setInterventionResolver(null);
  };

  const loadLocalImageAsBase64 = async (path: string): Promise<string | null> => {
    try {
        const response = await fetch(path);
        if (!response.ok) {
            console.log(`Local asset not found: ${path}. Will generate.`);
            return null;
        }
        let blob = await response.blob();
        if (blob.type === '' || blob.type === 'application/octet-stream') {
            let newMimeType = 'image/jpeg';
            if (path.endsWith('.png')) newMimeType = 'image/png';
            else if (path.endsWith('.gif')) newMimeType = 'image/gif';
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
      currentStoryDevelopmentPackage: StoryDevelopmentPackage | null,
      isRetry: boolean = false
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
        const totalPanelsToGenerate = storyOutline.panels.length;

        const updateProgress = () => {
            panelsGeneratedCount++;
            const newProgress = totalPanelsToGenerate > 0 ? Math.round((panelsGeneratedCount / totalPanelsToGenerate) * 100) : 0;
            setProgress(newProgress);
        };

        // Generate Cover First
        const coverPanel = storyOutline.panels.find(p => p.page_number === COVER_PAGE_NUMBER);
        if (coverPanel && !existingPanelKeys.has(`${coverPanel.page_number}-${coverPanel.panel_number}`)) {
          setStatus('Generating the cover...');
          const protagonist = allCharacters.find(c => c.role === 'Protagonist') || allCharacters[0];
          const characterDescriptions = protagonist.consistency_tags;
          
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
                 art_style,
                 isRetry
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
            const characterNamesOnPanel = new Set<string>();
            panel.visuals.characters?.forEach(char => characterNamesOnPanel.add(char.name));
            const charactersOnPanel = allCharacters.filter(char => characterNamesOnPanel.has(char.name));
            
            const characterImagesOnPanel: CharacterImage[] = charactersOnPanel.flatMap(char => 
              Object.values(char.imageUrls).map(url => {
                  if (!url || !url.includes(',')) return null;
                  const [header, base64] = url.split(',');
                  const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
                  if (!base64) return null;
                  return { name: char.name, base64, mimeType };
              }).filter((img): img is CharacterImage => img !== null)
            );

            const locationKey = panel.visuals.setting.location.trim().toLowerCase();
            const locationScenes = currentSceneImages.get(locationKey);
            let sceneImage: CharacterImage | undefined;

            if (locationScenes) {
                sceneImage = Object.values(locationScenes)[0];
            }
            
            const MAX_ATTEMPTS = 3; // 2 auto-retries, 1 manual
            let panelImageBase64 = '';
            let success = false;
            let lastCorrectionReason = '';

            for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
                let generatedBase64 = '';
                try {
                    setStatus(`Generating Page ${panel.page_number}, Panel ${panel.panel_number} (Attempt ${attempt})...`);
                    
                    generatedBase64 = await logExecutionTime(
                        `6b. Generate Panel Image (Page ${panel.page_number}, Panel ${panel.panel_number}, Attempt ${attempt})`,
                        () => generatePanelImage(
                            panel, 
                            allCharacters, 
                            characterImagesOnPanel, 
                            art_style, 
                            sceneImage, 
                            isRetry, 
                            lastCorrectionReason || undefined
                        )
                    );
                } catch (err) {
                    console.error(`Generation failed on attempt ${attempt} for panel ${panel.page_number}-${panel.panel_number}`, err);
                    if (attempt === MAX_ATTEMPTS) throw err; // Final attempt failed, re-throw.
                    continue; // Try next attempt
                }

                if (charactersOnPanel.length > 0) {
                    setStatus(`Verifying consistency for Page ${panel.page_number}, Panel ${panel.panel_number}...`);
                    let allCharactersConsistent = true;
                    
                    for (const char of charactersOnPanel) {
                        const verificationResult = await logExecutionTime(
                            `6c. Verify Consistency: ${char.name}`,
                            () => verifyCharacterConsistency(generatedBase64, char)
                        );

                        if (!verificationResult.match) {
                            console.warn(`Consistency check FAILED for ${char.name} on attempt ${attempt}. Reason: ${verificationResult.reason}`);
                            lastCorrectionReason = `For character ${char.name}: ${verificationResult.reason}`;
                            allCharactersConsistent = false;

                            if (attempt === MAX_ATTEMPTS - 1) { // On the second-to-last attempt, ask user
                                setStatus(`Consistency check failed for ${char.name}. Please review.`);
                                const userChoice = await new Promise<'accept' | 'retry'>((resolve) => {
                                    setInterventionState({
                                        panel,
                                        characterInQuestion: char,
                                        generatedImageBase64: generatedBase64,
                                        reason: verificationResult.reason,
                                    });
                                    setInterventionResolver({ resolve });
                                });
                                setInterventionState(null);
                                setInterventionResolver(null);

                                if (userChoice === 'accept') {
                                    console.log(`User accepted inconsistent image for panel ${panel.page_number}-${panel.panel_number}.`);
                                    panelImageBase64 = generatedBase64;
                                    success = true; // Override success
                                }
                                // If user chose 'retry', we let the loop continue to the final attempt
                            }
                            break; // Exit character verification loop
                        }
                    }

                    if (success) break; // User accepted, exit attempt loop
                    if (allCharactersConsistent) {
                        panelImageBase64 = generatedBase64;
                        success = true;
                        break; // All good, exit attempt loop
                    }
                } else {
                    panelImageBase64 = generatedBase64;
                    success = true;
                    break;
                }
            }
            
            if (!success) {
                throw new Error(`Failed to generate a consistent image for panel ${panel.page_number}-${panel.panel_number} after ${MAX_ATTEMPTS} attempts. Last reason: ${lastCorrectionReason}`);
            }

            const newPanel: GeneratedPanel = { ...panel, imageUrl: `data:image/jpeg;base64,${panelImageBase64}` };
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
        if (err instanceof Error) errorMessage = err.message;
        setError(`Generation Failed: ${errorMessage}`);
      }
  }, [generatedPanels]);

  // Handlers for user intervention
  const handleAcceptInconsistentImage = useCallback(() => {
    if (interventionResolver) {
        interventionResolver.resolve('accept');
    }
  }, [interventionResolver]);

  const handleRejectInconsistentImage = useCallback(() => {
    if (interventionResolver) {
        interventionResolver.resolve('retry');
    }
  }, [interventionResolver]);


  const startFullGeneration = useCallback(async (initialImageBase64?: string, isRetry: boolean = false) => {
    setIsLoading(true);
    setError(null);
    const generationStartTime = performance.now();
    
    // Determine which image to use: the new one, or the one from state (for retries)
    const imageToUse = initialImageBase64 || lastUploadedImage;
    if (!imageToUse) {
        setError("No character image available to start generation.");
        setIsLoading(false);
        return;
    }

    try {
        let currentProfile = characterProfile;
        if (!currentProfile) {
            setCastStatus('Analyzing character...');
            const [mimeType, cleanBase64] = imageToUse.split(';base64,');
            currentProfile = await logExecutionTime(
                '1. Analyze Character', 
                () => analyzeCharacter(cleanBase64, mimeType.split(':')[1])
            );
            setCharacterProfile(currentProfile);
        }
        
        let currentConcepts = characterConcepts;
        if (currentConcepts.length === 0) {
            setCastStatus('Generating supporting cast...');
            currentConcepts = await logExecutionTime(
                '2. Generate Character Concepts',
                () => generateCharacterConcepts(currentProfile)
            );
            setCharacterConcepts(currentConcepts);
        }
        
        let currentDevPackage = storyDevelopmentPackage;
        if (!currentDevPackage) {
            setCastStatus('Developing story blueprint...');
            currentDevPackage = await logExecutionTime(
                '3. Develop Story Blueprint',
                () => developStory(currentConcepts)
            );
            setStoryDevelopmentPackage(currentDevPackage);
        }

        let currentStory = story;
        if (!currentStory) {
            setCastStatus('Generating detailed comic script...');
            const allCharactersDescription = currentConcepts.map(c => `${c.name} (${c.role}): ${c.description}`).join('. ');
            let storyOutline = await logExecutionTime(
                '4. Generate Detailed Comic Script',
                () => generateStory(currentDevPackage, allCharactersDescription)
            );

            // --- DIALOGUE POLISHING STEP ---
            setCastStatus('Polishing script dialogue...');
            const polishedPanels = await logExecutionTime('4a. Polish Panel Dialogue', async () => {
                const polishingPromises = storyOutline.panels.map(panel => 
                    polishPanelDialogue(panel, currentDevPackage!)
                );
                return Promise.all(polishingPromises);
            });
            storyOutline = { ...storyOutline, panels: polishedPanels };
            // --- END DIALOGUE POLISHING ---

            setCastStatus('Transcribing comic script into story format...');
            const storyText = await logExecutionTime(
                '4b. Generate Full Story Text',
                () => generateFullStoryText(storyOutline)
            );
            
            currentStory = { ...storyOutline, fullStoryText: storyText };
            setStory(currentStory);
        }
        
        const planningEndTime = performance.now();
        const planningDuration = ((planningEndTime - generationStartTime) / 1000).toFixed(2);
        console.log(`%c[TOTAL] Story Planning Phase took ${planningDuration} seconds.`, 'color: #f39c12; font-weight: bold;');
        
        setStep(AppStep.CHARACTER_GENERATION);

        // --- ASSET GENERATION ---
        const assetGenerationStartTime = performance.now();
        const artStyle = currentProfile.art_style;

        // 5a. Generate Portraits (Resumable)
        const characterShots: Record<string, string> = {
            'full': 'Full-body, dynamic, neutral standing pose.',
            'closeup_happy': 'Close-up portrait from the chest up, happy expression.',
            'action': 'Medium shot, in a dynamic action pose.',
            'profile': 'Profile view, side-on, neutral expression.'
        };
        
        let currentRoster = [...characterRoster];
        const conceptsToGenerate = currentConcepts.filter(c => !currentRoster.some(r => r.name === c.name));
        if (conceptsToGenerate.length > 0) {
            const portraitGenerationStartTime = performance.now();
            for (const concept of conceptsToGenerate) {
                setCastStatus(`Designing character: ${concept.name}...`);
                const imageUrls: Record<string, string> = {};
                for (const [shotKey, shotDesc] of Object.entries(characterShots)) {
                    const imageBase64 = await logExecutionTime(
                        `5a. Generate Portrait: ${concept.name} (${shotKey})`,
                        () => generateCharacterImage(concept.description, artStyle, shotDesc, isRetry)
                    );
                    imageUrls[shotKey] = `data:image/jpeg;base64,${imageBase64}`;
                }
                const newCharacter: GeneratedCharacter = { ...concept, imageUrls };
                currentRoster.push(newCharacter);
                setCharacterRoster(prev => [...prev, newCharacter]);
            }
            const portraitGenerationEndTime = performance.now();
            const portraitDuration = ((portraitGenerationEndTime - portraitGenerationStartTime) / 1000).toFixed(2);
            console.log(`%c[TOTAL] All Character Portrait Generation took ${portraitDuration} seconds.`, 'color: #f39c12; font-weight: bold;');
        }

        // 5b. Generate Scenes (Resumable & Optimized)
        setCastStatus('Pre-rendering background scenes...');
        const sceneGenerationStartTime = performance.now();
        const uniqueLocationsMap = new Map<string, Panel['visuals']['setting']>();
        currentStory.panels.forEach(panel => {
            const locationKey = panel.visuals.setting.location.trim().toLowerCase();
            if (!uniqueLocationsMap.has(locationKey)) {
                uniqueLocationsMap.set(locationKey, panel.visuals.setting);
            }
        });

        const newSceneImages = new Map(sceneImages);
        for (const [locationKey, setting] of uniqueLocationsMap.entries()) {
            const existingLocationImages = newSceneImages.get(locationKey) || {};
            if (!existingLocationImages['wide']) { // Only generate one wide shot if it doesn't exist
                setCastStatus(`Generating scene: ${setting.location}...`);
                const imageBase64 = await logExecutionTime(
                    `5b. Generate Scene: ${setting.location}`,
                    () => generateSceneImage(setting, artStyle, 'Establishing Wide Shot', isRetry)
                );
                const sceneImage: CharacterImage = { name: setting.location, base64: imageBase64, mimeType: 'image/jpeg' };
                
                // Ensure the map entry exists before setting the property
                if (!newSceneImages.has(locationKey)) {
                    newSceneImages.set(locationKey, {});
                }
                newSceneImages.get(locationKey)!['wide'] = sceneImage;
                setSceneImages(new Map(newSceneImages));
            }
        }
        const sceneGenerationEndTime = performance.now();
        const sceneDuration = ((sceneGenerationEndTime - sceneGenerationStartTime) / 1000).toFixed(2);
        console.log(`%c[TOTAL] All Scene Generation took ${sceneDuration} seconds.`, 'color: #f39c12; font-weight: bold;');
        
        const assetGenerationEndTime = performance.now();
        const assetDuration = ((assetGenerationEndTime - assetGenerationStartTime) / 1000).toFixed(2);
        console.log(`%c[TOTAL] Asset Generation Phase (Portraits & Scenes) took ${assetDuration} seconds.`, 'color: #f39c12; font-weight: bold;');

        setCastStatus('The cast and scenes are ready! Assembling the pages...');
        await startComicGeneration(currentStory, currentRoster, newSceneImages, currentProfile, currentDevPackage, isRetry);

    } catch (err) {
        console.error(err);
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed during generation: ${errorMessage}`);
    } finally {
        setIsLoading(false);
    }
  }, [lastUploadedImage, characterProfile, characterConcepts, storyDevelopmentPackage, story, characterRoster, sceneImages, startComicGeneration]);

  const handleCharacterAnalyzed = useCallback(async (imageBase64: string) => {
    // This is a new generation, so reset everything first.
    resetState();
    setLastUploadedImage(imageBase64);
    setIsDevMode(false);
    // Kick off the single, resumable generation pipeline
    await startFullGeneration(imageBase64);
  }, [startFullGeneration]);

  const handleStartFromDefault = useCallback(async (isRetry: boolean = false) => {
    resetState();
    setIsLoading(true);
    setIsDevMode(true);

    try {
        setCastStatus('Loading default story from file...');
        const response = await fetch('./default/comic_metadata.json');
        if (!response.ok) throw new Error('Could not load default/comic_metadata.json.');
        const data = await response.json();

        const defaultImage = await loadLocalImageAsBase64('./default/portraits/Splatter/full.jpg');
        setLastUploadedImage(defaultImage);

        const fullStory: StoryOutline = data.story;
        const shortStory: StoryOutline = { ...fullStory, panels: fullStory.panels.filter(panel => panel.page_number <= 3) };
        const profile: CharacterProfile = data.characterProfile;
        const devPackage: StoryDevelopmentPackage = data.storyDevelopmentPackage;
        const concepts: CharacterConcept[] = data.characterConcepts;

        setCharacterProfile(profile);
        setStoryDevelopmentPackage(devPackage);
        setStory(shortStory);
        setCharacterConcepts(concepts);
        setStep(AppStep.GENERATION_IN_PROGRESS);

        setCastStatus('Loading default character portraits...');
        const roster: GeneratedCharacter[] = [];
        for (const concept of concepts) {
            const imageUrls: Record<string, string> = {};
            const path = `./default/portraits/${concept.name.replace(/\s+/g, '_')}/full.jpg`;
            const dataUrl = await loadLocalImageAsBase64(path);
            if (!dataUrl) throw new Error(`Default asset missing: ${path}`);
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
            if (!uniqueLocations.has(locationKey)) uniqueLocations.set(locationKey, panel.visuals.setting);
        });

        const newSceneImages = new Map<string, Record<string, CharacterImage>>();
        for (const [locationKey, setting] of uniqueLocations.entries()) {
            const path = `./default/scenes/${slugify(locationKey)}/wide.jpg`;
            const dataUrl = await loadLocalImageAsBase64(path);
            if (dataUrl) {
                const [header, base64] = dataUrl.split(',');
                const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
                if (base64) {
                    const sceneImage: CharacterImage = { name: setting.location, base64, mimeType };
                    newSceneImages.set(locationKey, { 'wide': sceneImage });
                }
            } else {
               console.warn(`Could not find default scene asset: ${path}.`);
            }
        }
        setSceneImages(newSceneImages);
        
        await startComicGeneration(shortStory, roster, newSceneImages, profile, devPackage, isRetry);

    } catch (err) {
        console.error(err);
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to load default story: ${errorMessage}`);
        resetState();
    } finally {
        setIsLoading(false);
    }
  }, [startComicGeneration]);
  
  const handleRetryPanelGeneration = useCallback(() => {
    setError(null);
    if (story && characterRoster.length > 0 && characterProfile && storyDevelopmentPackage) {
        startComicGeneration(story, characterRoster, sceneImages, characterProfile, storyDevelopmentPackage, true);
    } else {
        setError("Cannot retry panel generation. Story or character data is missing.");
        setStep(AppStep.CHARACTER_SETUP);
    }
  }, [story, characterRoster, sceneImages, characterProfile, storyDevelopmentPackage, startComicGeneration]);

  const handleDownloadProgress = useCallback(async (isError: boolean = false) => {
    try {
        await zipAndDownloadProgress(story?.title || 'comic_crafter', {
            characterProfile, 
            storyDevelopmentPackage, 
            story, 
            characterConcepts, 
            characterRoster, 
            sceneImages, 
            generatedPanels,
            initialImageBase64: lastUploadedImage
        }, { isErrorState: isError });
    } catch(err) {
        console.error("Failed to create zip file:", err);
        setError("Failed to create zip file. Check console for details.");
    }
  }, [characterProfile, storyDevelopmentPackage, story, characterConcepts, characterRoster, sceneImages, generatedPanels, lastUploadedImage]);

  const handleRetry = useCallback(() => {
    setError(null);
    if (isDevMode) {
        handleStartFromDefault(true);
    } else {
        startFullGeneration(undefined, true);
    }
  }, [isDevMode, handleStartFromDefault, startFullGeneration]);

  const handleRestoreProgress = useCallback(async (file: File) => {
    resetState();
    setIsLoading(true);
    setError(null);

    try {
        const zip = await JSZip.loadAsync(file);
        const stateFile = zip.file("save_state.json");
        if (!stateFile) throw new Error("save_state.json not found in the zip file.");
        
        const stateContent = await stateFile.async("string");
        const restoredState = JSON.parse(stateContent);

        const getImageAsDataUrl = async (path: string): Promise<string> => {
            const imageFile = zip.file(path);
            if (!imageFile) {
                console.warn(`Image not found in zip: ${path}`);
                return "";
            }
            const base64 = await imageFile.async("base64");
            const mimeType = path.endsWith(".png") ? "image/png" : "image/jpeg";
            return `data:${mimeType};base64,${base64}`;
        };

        // Restore core data first
        if (restoredState.characterProfile) setCharacterProfile(restoredState.characterProfile);
        if (restoredState.storyDevelopmentPackage) setStoryDevelopmentPackage(restoredState.storyDevelopmentPackage);
        if (restoredState.story) setStory(restoredState.story);
        if (restoredState.initialImageBase64) setLastUploadedImage(restoredState.initialImageBase64);

        // Restore assets and perform robust checks
        const newCharacterRoster: GeneratedCharacter[] = [];
        if (restoredState.characterRoster) {
            for (const char of restoredState.characterRoster) {
                const imageUrls: Record<string, string> = {};
                for (const [shotKey, path] of Object.entries(char.imageUrls)) {
                    imageUrls[shotKey] = await getImageAsDataUrl(path as string);
                }
                newCharacterRoster.push({ ...char, imageUrls });
            }
            setCharacterRoster(newCharacterRoster);
        }

        // Fallback for initial image if not in save file
        if (!restoredState.initialImageBase64 && newCharacterRoster.length > 0) {
            const protagonist = newCharacterRoster.find(c => c.role === 'Protagonist');
            if (protagonist && protagonist.imageUrls.full) {
                setLastUploadedImage(protagonist.imageUrls.full);
            }
        }
        
        // Robustly set character concepts
        let conceptsToSet = restoredState.characterConcepts;
        if ((!conceptsToSet || conceptsToSet.length === 0) && newCharacterRoster.length > 0) {
            console.warn("Character concepts were missing, rebuilding from character roster.");
            conceptsToSet = newCharacterRoster.map(({ imageUrls, ...concept }) => concept);
        }
        if (conceptsToSet) setCharacterConcepts(conceptsToSet);
        
        const newSceneImages = new Map<string, Record<string, CharacterImage>>();
        if (restoredState.sceneImages) {
            for (const [locationKey, sceneGroup] of restoredState.sceneImages as [string, Record<string, Omit<CharacterImage, 'base64'> & { path: string }>][]) {
                const newSceneGroup: Record<string, CharacterImage> = {};
                for (const [perspectiveKey, imageMetadata] of Object.entries(sceneGroup)) {
                    const dataUrl = await getImageAsDataUrl(imageMetadata.path);
                    const base64 = dataUrl.split(',')[1];
                    if (base64) {
                       newSceneGroup[perspectiveKey] = { name: imageMetadata.name, mimeType: imageMetadata.mimeType, base64 };
                    }
                }
                newSceneImages.set(locationKey, newSceneGroup);
            }
            setSceneImages(newSceneImages);
        }
        
        const newGeneratedPanels: GeneratedPanel[] = [];
        if (restoredState.generatedPanels) {
            for (const panel of restoredState.generatedPanels) {
                const imageUrl = await getImageAsDataUrl(panel.imageUrl);
                newGeneratedPanels.push({ ...panel, imageUrl });
            }
            setGeneratedPanels(newGeneratedPanels);
        }
        
        const totalPanelsInStory = restoredState.story?.panels?.length || 0;
        let shouldResume = false;

        if (newGeneratedPanels.length > 0) {
            if (totalPanelsInStory > 0 && newGeneratedPanels.length >= totalPanelsInStory) {
                setStep(AppStep.VIEW_COMIC);
            } else {
                setStep(AppStep.GENERATION_IN_PROGRESS);
                const progress = totalPanelsInStory > 0 ? Math.round((newGeneratedPanels.length / totalPanelsInStory) * 100) : 0;
                setProgress(progress);
                setStatus('Progress restored. Ready to continue generation.');
                shouldResume = true;
            }
        } else if (newCharacterRoster.length > 0) {
            setStep(AppStep.CHARACTER_GENERATION);
            setCastStatus('Cast and scenes restored. Resuming comic assembly...');
            shouldResume = true;
        } else if (restoredState.story) {
             setStep(AppStep.CHARACTER_GENERATION);
             setCastStatus('Story restored. Resuming character generation...');
             shouldResume = true;
        } else {
            setStep(AppStep.CHARACTER_SETUP);
            // Don't auto-resume from the very start.
        }

        if (shouldResume) {
            setIsRestoredAndReady(true);
        }
    } catch (err) {
        console.error("Failed to restore progress from zip:", err);
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to restore progress: ${errorMessage}`);
        resetState();
    } finally {
        setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isRestoredAndReady) {
        setIsRestoredAndReady(false); // Reset trigger to prevent re-running
        
        if (step === AppStep.GENERATION_IN_PROGRESS || step === AppStep.CHARACTER_GENERATION) {
            console.log('Restoration complete, resuming generation pipeline...');
            // The main pipeline function is designed to be resumable and will pick up
            // from the current state after the restore.
            startFullGeneration(undefined, false);
        }
    }
  }, [isRestoredAndReady, step, startFullGeneration]);

  const renderStep = () => {
    switch (step) {
      case AppStep.CHARACTER_SETUP:
        return <CharacterSetup 
                  onCharacterAnalyzed={handleCharacterAnalyzed} 
                  onStartFromDefault={() => handleStartFromDefault()}
                  onRestoreProgress={handleRestoreProgress}
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
              onRetry={handleRetryPanelGeneration}
              onDownload={handleDownloadProgress}
              panels={generatedPanels}
              title={story.title}
              interventionState={interventionState}
              onAcceptInconsistent={handleAcceptInconsistentImage}
              onRejectInconsistent={handleRejectInconsistentImage}
            />
          </div>
        );
      case AppStep.VIEW_COMIC:
        return story && <ComicViewer panels={generatedPanels} title={story.title} onRestart={resetState} onDownload={handleDownloadProgress} />;
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
                  <button onClick={handleRetry} className="bg-yellow-500 text-gray-900 font-bold py-1 px-4 rounded text-sm hover:bg-yellow-400">Retry</button>
                  <button onClick={() => handleDownloadProgress(true)} className="bg-blue-500 text-white font-bold py-1 px-4 rounded text-sm hover:bg-blue-400">Download Progress</button>
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
