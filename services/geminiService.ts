





import { GoogleGenAI, Type, Modality, GenerateContentResponse } from "@google/genai";
import type { CharacterProfile, StoryOutline, Panel, CharacterConcept, StoryDevelopmentPackage, CharacterImage, PanelSetting } from '../types.js';
import {
  PANEL_IMAGE_PROMPT_TEMPLATE,
  STORY_GENERATION_PROMPT,
  CHARACTER_CONCEPT_PROMPT_TEMPLATE,
  CHARACTER_IMAGE_PROMPT_TEMPLATE,
  STORY_DEVELOPMENT_PROMPT_TEMPLATE,
  COVER_PAGE_PROMPT_TEMPLATE,
  SCENE_IMAGE_PROMPT_TEMPLATE,
} from '../constants.js';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

// Helper function for robust JSON parsing from Gemini response
function parseJsonResponse<T>(response: GenerateContentResponse, functionName: string): T {
  const text = response.text?.trim();

  // Check for empty response, which causes JSON.parse() to fail.
  if (!text) {
    const candidate = response.candidates?.[0];
    let reason = "The model returned an empty response.";
    
    // Provide more specific feedback if available (e.g., safety, other reasons).
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
    // Attempt to parse the JSON.
    return JSON.parse(text) as T;
  } catch (e) {
    console.error(`Error parsing JSON from model in ${functionName}. Raw text:`, text);
    // This error helps debug cases where the model returns text that is not valid JSON.
    throw new Error(`The model returned malformed JSON in ${functionName}. Please try again.`);
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
        { text: "Analyze the uploaded image of a character. Extract key visual descriptors and the overall art style. Generate a detailed JSON object. This JSON will serve as the 'Character Consistency Profile' for all subsequent image generation prompts." }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          physical_traits: { type: Type.ARRAY, items: { type: Type.STRING } },
          clothing_style: { type: Type.STRING },
          color_palette: { type: Type.ARRAY, items: { type: Type.STRING } },
          distinctive_features: { type: Type.ARRAY, items: { type: Type.STRING } },
          consistency_tags: { type: Type.STRING, description: "A concise string of keywords for easy injection into prompts, for example: 'man with red hair, green jacket, cybernetic arm'" },
          art_style: { type: Type.STRING, description: "A concise description of the overall art style, for example: '90s anime style', 'modern cartoon', 'chibi', 'realistic oil painting'." }
        },
        required: ["physical_traits", "clothing_style", "color_palette", "distinctive_features", "consistency_tags", "art_style"]
      }
    }
  });

  return parseJsonResponse<CharacterProfile>(response, 'analyzeCharacter');
}

export async function generateCharacterConcepts(protagonistProfile: CharacterProfile): Promise<CharacterConcept[]> {
    const prompt = CHARACTER_CONCEPT_PROMPT_TEMPLATE
      .replace('{protagonist_description}', protagonistProfile.consistency_tags)
      .replace('{art_style}', protagonistProfile.art_style);

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    characters: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                role: { type: Type.STRING },
                                name: { type: Type.STRING },
                                description: { type: Type.STRING },
                            },
                            required: ["role", "name", "description"]
                        }
                    }
                },
                required: ["characters"]
            }
        }
    });

    const result = parseJsonResponse<{ characters: CharacterConcept[] }>(response, 'generateCharacterConcepts');
    return result.characters;
}

export async function developStory(characterConcepts: CharacterConcept[]): Promise<StoryDevelopmentPackage> {
    const allCharactersDescription = characterConcepts
        .map(c => `${c.name} (${c.role}): ${c.description}`)
        .join('. ');

    const prompt = STORY_DEVELOPMENT_PROMPT_TEMPLATE.replace('{allCharactersDescription}', allCharactersDescription);

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    logline: { type: Type.STRING },
                    themes: { type: Type.ARRAY, items: { type: Type.STRING } },
                    character_arcs: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                character_name: { type: Type.STRING },
                                internal_conflict: { type: Type.STRING },
                                arc_summary: { type: Type.STRING },
                            },
                            required: ["character_name", "internal_conflict", "arc_summary"]
                        }
                    },
                    character_voices: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                character_name: { type: Type.STRING },
                                speech_patterns: { type: Type.STRING },
                                vocabulary: { type: Type.STRING },
                            },
                            required: ["character_name", "speech_patterns", "vocabulary"]
                        }
                    },
                    three_act_outline: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                act_number: { type: Type.INTEGER },
                                act_title: { type: Type.STRING },
                                summary: { type: Type.STRING },
                                key_scenes: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            scene_title: { type: Type.STRING },
                                            description: { type: Type.STRING },
                                            page_estimation: { type: Type.STRING },
                                        },
                                        required: ["scene_title", "description", "page_estimation"]
                                    }
                                }
                            },
                            required: ["act_number", "act_title", "summary", "key_scenes"]
                        }
                    }
                },
                required: ["title", "logline", "themes", "character_arcs", "character_voices", "three_act_outline"]
            }
        }
    });

    return parseJsonResponse<StoryDevelopmentPackage>(response, 'developStory');
}

async function generateImage(prompt: string, inputImages: CharacterImage[] = [], aspectRatio: '1:1' | '3:4' | '4:3' | '9:16' | '16:9' = '1:1'): Promise<string> {
    const fullPrompt = `${prompt}\n\nStrictly generate the image with an aspect ratio of ${aspectRatio}.`;
    
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


export async function generateCharacterImage(description: string, artStyle: string, shotDescription: string): Promise<string> {
    const prompt = CHARACTER_IMAGE_PROMPT_TEMPLATE
      .replace('{character_description}', description)
      .replace('{art_style}', artStyle)
      .replace('{shot_description}', shotDescription);
    return generateImage(prompt, [], '1:1');
}

export async function generateSceneImage(setting: PanelSetting, artStyle: string, perspective: string): Promise<string> {
    const settingDescription = `Location: ${setting.location}. Time: ${setting.time_of_day}. Description: ${setting.description}`;
    const prompt = SCENE_IMAGE_PROMPT_TEMPLATE
        .replace('{art_style}', artStyle)
        .replace('{setting_description}', settingDescription)
        .replace('{perspective}', perspective);
    
    // Use a landscape aspect ratio for scenes, as they are often establishing shots.
    return generateImage(prompt, [], '16:9');
}

export async function generateStory(storyDevelopmentPackage: StoryDevelopmentPackage, allCharactersDescription: string): Promise<StoryOutline> {
  const prompt = STORY_GENERATION_PROMPT
    .replace('{storyDevelopmentPackage}', JSON.stringify(storyDevelopmentPackage, null, 2))
    .replace('{allCharactersDescription}', allCharactersDescription);

  const panelSchema = {
    type: Type.OBJECT,
    properties: {
      page_number: { type: Type.INTEGER },
      panel_number: { type: Type.INTEGER },
      visuals: {
        type: Type.OBJECT,
        properties: {
          setting: { type: Type.OBJECT, properties: { location: { type: Type.STRING }, time_of_day: { type: Type.STRING }, description: { type: Type.STRING } }, required: ["location", "time_of_day", "description"] },
          characters: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, position: { type: Type.STRING }, expression: { type: Type.STRING }, description: { type: Type.STRING } }, required: ["name", "position", "expression", "description"] } },
          action: { type: Type.OBJECT, properties: { description: { type: Type.STRING }, key_moment: { type: Type.STRING } }, required: ["description"] },
          composition: { type: Type.OBJECT, properties: { shot_type: { type: Type.STRING }, angle: { type: Type.STRING }, focus: { type: Type.STRING } }, required: ["shot_type", "angle", "focus"] },
          mood_and_lighting: { type: Type.OBJECT, properties: { atmosphere: { type: Type.STRING }, lighting_source: { type: Type.STRING }, coloring_notes: { type: Type.STRING } }, required: ["atmosphere", "lighting_source"] }
        },
        required: ["setting", "action", "composition", "mood_and_lighting"]
      },
      textual: {
        type: Type.OBJECT,
        properties: {
          dialogue: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                character: { type: Type.STRING },
                content: { type: Type.STRING },
                type: { type: Type.STRING },
                position: { type: Type.OBJECT, properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER } } }
              },
              required: ["character", "content", "type"]
            }
          },
          caption: {
            type: Type.OBJECT,
            properties: {
              content: { type: Type.STRING },
              position: { type: Type.STRING },
              coordinates: { type: Type.OBJECT, properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER } } }
            },
            required: ["content"]
          },
          in_scene_text: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { text: { type: Type.STRING } }, required: ["text"] } }
        },
        required: []
      },
      auditory: {
        type: Type.OBJECT,
        properties: {
          sound_effects: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                sfx_text: { type: Type.STRING },
                style: { type: Type.STRING },
                position: { type: Type.OBJECT, properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER } } },
                rotation: { type: Type.NUMBER },
                scale: { type: Type.NUMBER }
              },
              required: ["sfx_text", "style"]
            }
          }
        },
        required: []
      },
      layout: { type: Type.OBJECT, properties: { description: { type: Type.STRING }, border_style: { type: Type.STRING } }, required: ["description", "border_style"] },
      transition: { type: Type.OBJECT, properties: { to_next_panel: { type: Type.STRING } }, required: [] }
    },
    required: ["page_number", "panel_number", "visuals", "layout"]
  };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          prologue: { type: Type.STRING },
          panels: {
            type: Type.ARRAY,
            items: panelSchema
          }
        },
        required: ["title", "prologue", "panels"]
      }
    }
  });

  return parseJsonResponse<StoryOutline>(response, 'generateStory');
}

export async function generatePanelImage(
    panel: Panel, 
    characterDescriptions: string, 
    characterImages: CharacterImage[], 
    artStyle: string,
    sceneImage?: CharacterImage
): Promise<string> {
    const characterList = panel.visuals.characters?.map(c => `${c.name}(1)`).join(', ');
    const prompt = PANEL_IMAGE_PROMPT_TEMPLATE
        .replace('{art_style}', artStyle)
        .replace('{character_descriptions}', characterDescriptions)
        .replace('{character_list_for_semantic_negative}', characterList || 'No characters in this scene.')
        .replace('{panel_visuals}', JSON.stringify(panel.visuals, null, 2))
        .replace('{panel_textual}', JSON.stringify(panel.textual, null, 2))
        .replace('{panel_auditory}', JSON.stringify(panel.auditory, null, 2));

    const description = panel.layout.description.toLowerCase();
    const shotType = panel.visuals.composition.shot_type.toLowerCase();
    const isLandscape = description.includes('splash') || description.includes('wide') || shotType.includes('wide') || shotType.includes('splash');
    const aspectRatio = isLandscape ? '16:9' : '3:4';

    const allReferenceImages = [...characterImages];
    if (sceneImage) {
        allReferenceImages.push(sceneImage);
    }
  
    return generateImage(prompt, allReferenceImages, aspectRatio);
}

export async function generateCoverImage(
    title: string,
    logline: string,
    characterDescriptions: string,
    characterImages: CharacterImage[],
    artStyle: string
): Promise<string> {
    const prompt = COVER_PAGE_PROMPT_TEMPLATE
        .replace('{title}', title)
        .replace('{logline}', logline)
        .replace('{art_style}', artStyle)
        .replace('{consistency_tags}', characterDescriptions);
    
    const aspectRatio = '3:4';
  
    return generateImage(prompt, characterImages, aspectRatio);
}