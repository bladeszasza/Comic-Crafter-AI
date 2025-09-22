





import { GoogleGenAI, Type, Modality, GenerateContentResponse } from "@google/genai";
import type { CharacterProfile, StoryOutline, Panel, CharacterConcept, StoryDevelopmentPackage, CharacterImage, PanelSetting, GeneratedCharacter } from '../types.js';
import {
  PANEL_IMAGE_PROMPT_TEMPLATE,
  STORY_GENERATION_PROMPT,
  CHARACTER_CONCEPT_PROMPT_TEMPLATE,
  CHARACTER_IMAGE_PROMPT_TEMPLATE,
  STORY_DEVELOPMENT_PROMPT_TEMPLATE,
  COVER_PAGE_PROMPT_TEMPLATE,
  SCENE_IMAGE_PROMPT_TEMPLATE,
  FULL_STORY_TEXT_GENERATION_PROMPT_TEMPLATE,
  CHARACTER_CONSISTENCY_CHECK_PROMPT_TEMPLATE,
  DIALOGUE_POLISHING_PROMPT_TEMPLATE,
} from '../constants.js';

declare const jsyaml: any;

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

// Helper function for robust YAML parsing from Gemini response
function parseYamlResponse<T>(response: GenerateContentResponse, functionName: string): T {
  const text = response.text?.trim();

  // Check for empty response, which causes yaml.load() to fail.
  if (!text) {
    const candidate = response.candidates?.[0];
    let reason = "The model returned an empty response.";
    
    if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
      reason = `Generation stopped unexpectedly. Reason: ${candidate.finishReason}.`;
      if (candidate.finishReason === 'SAFETY') {
        reason += ' This may be due to the prompt or the image provided containing sensitive content.';
      }
    }
    
    console.error(`${functionName} failed. Full response:`, JSON.stringify(response, null, 2));
    throw new Error(`Failed to get a valid response from the model in ${functionName}. ${reason}`);
  }

  try {
    // Attempt to parse the YAML. The model might return it inside a ```yaml block
    const yamlText = text.replace(/^```yaml\s*/, '').replace(/\s*```$/, '');
    return jsyaml.load(yamlText) as T;
  } catch (e) {
    console.error(`Error parsing YAML from model in ${functionName}. Raw text:`, text);
    // This error helps debug cases where the model returns text that is not valid YAML.
    throw new Error(`The model returned malformed YAML in ${functionName}. Please try again.`);
  }
}

function base64ToGenerativePart(base64: string, mimeType: string) {
  return {
    inlineData: {
      data: base64,
      mimeType,
    },
  };
}

export async function analyzeCharacter(imageBase64: string, mimeType: string): Promise<CharacterProfile> {
  const imagePart = base64ToGenerativePart(imageBase64, mimeType);

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        imagePart,
        { text: "Analyze the uploaded image of a character. Extract key visual descriptors and the overall art style. Generate a detailed YAML object. This YAML will serve as the 'Character Consistency Profile' for all subsequent image generation prompts. The YAML object should have the following keys: `physical_traits` (array of strings), `clothing_style` (string), `color_palette` (array of strings), `distinctive_features` (array of strings), `consistency_tags` (a concise string of keywords, e.g., 'man with red hair, green jacket, cybernetic arm'), and `art_style` (a concise description of the art style, e.g., '90s anime style')." }
      ]
    }
  });

  return parseYamlResponse<CharacterProfile>(response, 'analyzeCharacter');
}

export async function generateCharacterConcepts(protagonistProfile: CharacterProfile): Promise<CharacterConcept[]> {
    const prompt = CHARACTER_CONCEPT_PROMPT_TEMPLATE
      .replace('{protagonist_description}', protagonistProfile.consistency_tags)
      .replace('{art_style}', protagonistProfile.art_style);

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
    });

    const result = parseYamlResponse<{ characters: CharacterConcept[] }>(response, 'generateCharacterConcepts');
    return result.characters;
}

export async function developStory(characterConcepts: CharacterConcept[]): Promise<StoryDevelopmentPackage> {
    const allCharactersDescription = characterConcepts
        .map(c => `${c.name} (${c.role}): ${c.description}`)
        .join('. ');

    const prompt = STORY_DEVELOPMENT_PROMPT_TEMPLATE.replace('{allCharactersDescription}', allCharactersDescription);

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
    });

    return parseYamlResponse<StoryDevelopmentPackage>(response, 'developStory');
}

async function generateImage(prompt: string, inputImages: CharacterImage[] = [], aspectRatio: '1:1' | '3:4' | '4:3' | '9:16' | '16:9' = '1:1', isRetry: boolean = false): Promise<string> {
    let fullPrompt = `${prompt}\n\nStrictly generate the image with an aspect ratio of ${aspectRatio}.`;
    
    if (isRetry) {
        const safetyPrefix = `
        The previous attempt to generate this image was blocked for safety reasons (PROHIBITED_CONTENT).
        Re-attempting with a focus on metaphorical and artistic interpretation.
        **Critical Instructions for this attempt:**
        1.  **Avoid Literal Depictions:** Do NOT generate any graphic or realistic imagery of violence, injury, or other sensitive themes.
        2.  **Use Metaphor:** If the prompt implies conflict or impact, represent it with abstract visual effects like starbursts of light, dynamic action lines, or symbolic imagery (e.g., a shattered mirror for emotional pain) instead of physical harm.
        3.  **Focus on Emotion and Atmosphere:** Emphasize character expressions (determination, shock, etc.) and mood (shadows, dramatic lighting) to convey the story's intent safely.
        4.  **Adhere to Comic Book Style:** Ensure the final image is a stylized, SFW comic book illustration.

        Please generate a safe image based on this new interpretation of the original prompt that follows.
        ---
        Original Prompt:
        `;
        fullPrompt = safetyPrefix + fullPrompt;
    }

    const parts = [
        ...inputImages.map(img => ({
            inlineData: {
                data: img.base64,
                mimeType: img.mimeType
            }
        })),
        { text: fullPrompt },
    ];

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts },
        config: {
          responseModalities: [Modality.IMAGE, Modality.TEXT],
          temperature: 0,
        }
    });

    const firstCandidate = response.candidates?.[0];

    if (firstCandidate?.content?.parts) {
        for (const part of firstCandidate.content.parts) {
            if (part.inlineData?.data) {
                return part.inlineData.data;
            }
        }
    }

    let errorMessage = "An unknown error occurred during image generation.";

    if (firstCandidate?.finishReason === 'SAFETY') {
        errorMessage = 'Image generation was blocked for safety reasons. Please revise your prompt or image input.';
        console.error(errorMessage, firstCandidate.safetyRatings);
    } else {
        const textFromParts = firstCandidate?.content?.parts
            ?.map(part => part.text)
            .filter(Boolean)
            .join('\n');
        
        const fallbackText = response.text;
        const bestTextResponse = textFromParts || fallbackText;

        if (bestTextResponse) {
            errorMessage = `The model returned the following message: ${bestTextResponse}`;
        } else if (firstCandidate?.finishReason) {
            errorMessage = `Generation failed with reason: ${firstCandidate.finishReason}.`;
        } else {
             errorMessage = 'The model did not return an image or a specific error message. This could be due to a blocked response or an internal issue.';
        }
        
        console.error("Image generation failed. Full candidate details:", JSON.stringify(firstCandidate, null, 2));
    }
    
    throw new Error(errorMessage);
}


export async function generateCharacterImage(description: string, artStyle: string, shotDescription: string, isRetry: boolean = false): Promise<string> {
    const prompt = CHARACTER_IMAGE_PROMPT_TEMPLATE
      .replace('{character_description}', description)
      .replace('{art_style}', artStyle)
      .replace('{shot_description}', shotDescription);
    return generateImage(prompt, [], '1:1', isRetry);
}

export async function generateSceneImage(setting: PanelSetting, artStyle: string, perspective: string, isRetry: boolean = false): Promise<string> {
    const settingDescription = `Location: ${setting.location}. Time: ${setting.time_of_day}. Description: ${setting.description}`;
    const prompt = SCENE_IMAGE_PROMPT_TEMPLATE
        .replace('{art_style}', artStyle)
        .replace('{setting_description}', settingDescription)
        .replace('{perspective}', perspective);
    
    // Use a landscape aspect ratio for scenes, as they are often establishing shots.
    return generateImage(prompt, [], '16:9', isRetry);
}

export async function generateStory(storyDevelopmentPackage: StoryDevelopmentPackage, allCharactersDescription: string): Promise<StoryOutline> {
  const prompt = STORY_GENERATION_PROMPT
    .replace('{storyDevelopmentPackage}', jsyaml.dump(storyDevelopmentPackage))
    .replace('{allCharactersDescription}', allCharactersDescription);

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt
  });

  return parseYamlResponse<StoryOutline>(response, 'generateStory');
}

export async function polishPanelDialogue(panel: Panel, storyPackage: StoryDevelopmentPackage): Promise<Panel> {
  if (!panel.textual?.dialogue || panel.textual.dialogue.length === 0) {
    return panel;
  }

  // Use the panel's action description as the most immediate context.
  const sceneDescription = panel.visuals.action.description;

  // Filter character voices for characters present in the dialogue
  const charactersInDialogue = new Set(panel.textual.dialogue.map(d => d.character));
  const relevantVoices = storyPackage.character_voices.filter(v => charactersInDialogue.has(v.character_name));

  const prompt = DIALOGUE_POLISHING_PROMPT_TEMPLATE
    .replace('{scene_description}', sceneDescription)
    .replace('{character_voices}', jsyaml.dump(relevantVoices))
    .replace('{original_dialogue}', jsyaml.dump(panel.textual.dialogue));

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      temperature: 0.7, // More creative for dialogue
    }
  });

  try {
    const result = parseYamlResponse<{ polished_dialogue: Panel['textual']['dialogue'] }>(response, 'polishPanelDialogue');
    const polishedPanel = {
      ...panel,
      textual: {
        ...panel.textual,
        dialogue: result.polished_dialogue,
      },
    };
    return polishedPanel;
  } catch (e) {
    console.warn(`Dialogue polishing failed for panel ${panel.page_number}-${panel.panel_number}. Reverting to original dialogue.`, e);
    return panel; // Return original panel on failure
  }
}


export async function verifyCharacterConsistency(
  panelImageBase64: string,
  character: GeneratedCharacter
): Promise<{ match: boolean; reason: string }> {
  const imagePart = base64ToGenerativePart(panelImageBase64, 'image/jpeg');

  const prompt = CHARACTER_CONSISTENCY_CHECK_PROMPT_TEMPLATE
    .replace(/{character_name}/g, character.name)
    .replace('{consistency_tags}', character.consistency_tags);

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [imagePart, { text: prompt }] }
  });
  
  return parseYamlResponse<{ match: boolean; reason: string }>(response, 'verifyCharacterConsistency');
}

export async function generatePanelImage(
    panel: Panel, 
    allCharacters: GeneratedCharacter[],
    characterImages: CharacterImage[], 
    artStyle: string,
    sceneImage?: CharacterImage,
    isRetry: boolean = false,
    correctionReason?: string
): Promise<string> {
    const characterNamesInPanel = new Set(panel.visuals.characters?.map(c => c.name) || []);
    const charactersInPanel = allCharacters.filter(c => characterNamesInPanel.has(c.name));
    
    const characterReferences = charactersInPanel
        .map(c => `- ${c.name} (${c.role}): ${c.consistency_tags}`)
        .join('\n');

    const characterList = panel.visuals.characters?.map(c => `${c.name}(1)`).join(', ');

    let prompt = PANEL_IMAGE_PROMPT_TEMPLATE
        .replace('{art_style}', artStyle)
        .replace('{character_references}', characterReferences || 'No characters in this panel.')
        .replace('{character_list_for_semantic_negative}', characterList || 'No characters in this scene.')
        .replace('{panel_visuals}', jsyaml.dump(panel.visuals))
        .replace('{panel_textual}', jsyaml.dump(panel.textual))
        .replace('{panel_auditory}', jsyaml.dump(panel.auditory));

    if (correctionReason) {
        const correctionPrefix = `
        !! IMMEDIATE CORRECTION REQUIRED !!
        The previous generation failed a consistency check. REASON: "${correctionReason}"
        You MUST correct this error. Pay EXTREME attention to the reference images and consistency tags to fix this mistake. The original design is NON-NEGOTIABLE.
        ---
        Original Prompt Follows:
        `;
        prompt = correctionPrefix + prompt;
    }

    const description = panel.layout.description.toLowerCase();
    const shotType = panel.visuals.composition.shot_type.toLowerCase();
    const isLandscape = description.includes('splash') || description.includes('wide') || shotType.includes('wide') || shotType.includes('splash');
    const aspectRatio = isLandscape ? '16:9' : '3:4';

    const allReferenceImages = [...characterImages];
    if (sceneImage) {
        allReferenceImages.push(sceneImage);
    }
  
    return generateImage(prompt, allReferenceImages, aspectRatio, isRetry);
}

export async function generateCoverImage(
    title: string,
    logline: string,
    characterDescriptions: string,
    characterImages: CharacterImage[],
    artStyle: string,
    isRetry: boolean = false
): Promise<string> {
    const prompt = COVER_PAGE_PROMPT_TEMPLATE
        .replace('{title}', title)
        .replace('{logline}', logline)
        .replace('{art_style}', artStyle)
        .replace('{consistency_tags}', characterDescriptions);
    
    const aspectRatio = '3:4';
  
    return generateImage(prompt, characterImages, aspectRatio, isRetry);
}

export async function generateFullStoryText(storyOutline: StoryOutline): Promise<string> {
  // Remove the fullStoryText from the object sent to the model to avoid infinite loops or confusion.
  const { fullStoryText, ...outlineForPrompt } = storyOutline;

  const prompt = FULL_STORY_TEXT_GENERATION_PROMPT_TEMPLATE
    .replace('{storyOutline}', jsyaml.dump(outlineForPrompt));

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      temperature: 0.7, // A bit more creative for story writing
    }
  });

  return response.text;
}