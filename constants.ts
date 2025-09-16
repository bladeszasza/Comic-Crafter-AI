

export const TOTAL_PAGES = 6;
export const COVER_PAGE_NUMBER = 0;
export const CENTERFOLD_PAGE_NUMBER = "3-4";

export const SCENE_IMAGE_PROMPT_TEMPLATE = `
Generate a high-quality, detailed background illustration for a comic book scene in the {art_style} aesthetic. This is for a scene with the following description:
{setting_description}

**VIEWING ANGLE:**
Generate the scene from this perspective: **{perspective}**.

**CRITICAL INSTRUCTIONS:**
1.  **NO CHARACTERS:** The image MUST be an empty environment/background. Do NOT include any characters, figures, or living beings.
2.  **ATMOSPHERE:** Capture the mood described.
3.  **ART STYLE:** Strictly adhere to the specified art style.

The final image will be used as a backdrop where characters will be added later.
`;

// New prompts for character generation
export const CHARACTER_CONCEPT_PROMPT_TEMPLATE = `
Based on the provided hero description "{protagonist_description}" and art style "{art_style}", generate a full cast for a classic superhero comic book story. The entire cast must strictly adhere to the specified art style. For example, if the style is 'cartoon animal', do not generate realistic humans.

Generate the following characters:
1.  **The Protagonist**: Create a compelling backstory and detailed visual description based on the initial hint.
2.  **Two (2) Allied Characters**: Choose two distinct archetypes from this list: [Lover, Best Friend, Mentor, Tech Guru, Anti-Hero]. Give them unique names, appearances, and a brief description of their relationship to the protagonist.
3.  **The Primary Antagonist**: Design a visually striking villain who acts as a foil to the protagonist. Provide a name and a detailed visual description.
4.  **One (1) Antagonist Minion**: Choose one archetype from this list: [Sidekick, Tech Guru, Relative]. Give them a name and description.

For each character, provide:
- A 'role' (e.g., "Protagonist", "Mentor", "Antagonist", "Sidekick").
- A unique, catchy 'name'.
- A detailed 'description' for image generation, focusing on their visual appearance, costume, and key features.

Return the output as a JSON object containing a 'characters' array.
`;

export const CHARACTER_IMAGE_PROMPT_TEMPLATE = `
Create a character concept art portrait for a comic book, presented as a high-quality sticker.
The character is described as: {character_description}.
The art style must strictly be: "{art_style}".
**The desired shot is: {shot_description}.**
The background must be transparent.
Do NOT include any text, logos, or watermarks.
`;

export const STORY_DEVELOPMENT_PROMPT_TEMPLATE = `
You are an expert story architect and narrative designer. Your task is to create a complete story blueprint for a 20-22 page comic book based on the provided cast of characters.

Characters: {allCharactersDescription}

**CRITICAL BLUEPRINT REQUIREMENTS:**

1.  **Title & Logline**:
    -   Generate a catchy 'title'.
    -   Write a one-sentence 'logline' that summarizes the core conflict.

2.  **Themes**:
    -   Identify 1-2 central creative 'themes' the story will explore (e.g., "Betrayal and Redemption", "Power vs. Responsibility").

3.  **Character Arc**:
    -   For one major character, define their 'character_arc'.
    -   Specify their 'internal_conflict' that drives their actions.
    -   Provide a brief 'arc_summary' of their gradual slow transformation from beginning to end.

4.  **Character Voices**:
    -   For each character, describe their 'character_voice'.
    -   Detail their 'speech_patterns' (e.g., "quick and witty", "slow and deliberate").
    -   Describe their 'vocabulary' (e.g., "uses complex jargon", "speaks in simple terms").

5.  **Three-Act Outline**:
    -   Structure the story into a classic 'three_act_outline'.
    -   **Act 1 (The Setup)**: Introduce characters and the inciting incident.
    -   **Act 2 (The Confrontation)**: Escalate the conflict, raise the stakes, and include a major turning point (midpoint).
    -   **Act 3 (The Resolution)**: Build to the climax and provide a satisfying or unexpected resolution.
    -   For each act, define 'key_scenes' with a 'scene_title' and 'description' of what happens.

The output must be a valid JSON object following the specified schema for the Story Development Package.
`;


export const STORY_GENERATION_PROMPT = `
You are a master comic book writer and artist specializing in visual storytelling, sophisticated dialogue, and dynamic layouts. Your task is to generate a complete, panel-by-panel 3-act comic book script based on the provided **Story Blueprint** and character descriptions.

**Story Blueprint (Your guide):**
{storyDevelopmentPackage}

**Characters:**
{allCharactersDescription}

**CRITICAL SCRIPTING REQUIREMENTS:**

1.  **Adherence to Blueprint**: You MUST follow the Three-Act Outline, Character Arcs, and Themes defined in the blueprint. The panels you describe must directly serve the pre-established narrative.
2.  **Visual Storytelling**:
    -   Translate the 'key_scenes' from the blueprint into specific visual actions and compositions.
    -   Use silent panels and visual metaphors to convey emotion.
    -   Show character relationships through body language and positioning.
3.  **Dialogue and Voice**:
    -   Write witty, meaningful, and character-driven dialogue that STRICTLY adheres to the 'Character Voice' guides for each character.
    -   Conversations must reveal personality and advance the plot, using subtext and avoiding generic or nonsensical exposition dumps.
4.  **Pacing and Layout**:
    -   The story must span approximately 20-22 pages.
    -   Page 0: A dynamic 'Splash Page' for the opening, as described in the blueprint.
    -   Pages 10-11: The story's climax should be a "cinematic double-page spread".
    -   Final page: A satisfying conclusion, potentially with a sequel hook.
    -   Vary shot types ('Splash Page', 'Wide Shot', 'Medium Shot', 'Close-Up', etc.) and angles ('High Angle', 'Low Angle', etc.) to create a dynamic reading experience.
5.  **Sophisticated Element Placement (VERY IMPORTANT)**:
    -   For all textual and auditory elements, you MUST provide precise placement data to create a professional layout.
    -   The panel is a coordinate system from (0,0) in the top-left to (100,100) in the bottom-right.
    -   **Speech Bubbles ('dialogue')**: Must include a 'position' object with 'x' and 'y' percentages. Place the bubble near the character who is speaking, without obscuring their face or key action.
    -   **Sound Effects ('sound_effects')**: Must include a 'position' object. Also provide 'rotation' (e.g., -15 to 15 degrees) and 'scale' (e.g., 1.0 for normal, 1.5 for large) to add dynamism. Place SFX where the sound originates or for maximum impact.
    -   **Captions ('caption')**: Must include a 'coordinates' object with 'x' and 'y' percentages. Place captions in corners or edges where they don't disrupt the art.

The output must be a valid JSON object with 'title', 'prologue', and a 'panels' array following the provided schema. The 'title' and 'prologue' should be derived from the blueprint.
`;

export const PANEL_IMAGE_PROMPT_TEMPLATE = `
Generate the artwork for a single comic book panel in the {art_style} aesthetic, based on the following JSON description, a background scene image, and character reference images.
Do NOT render panel borders. The image should fill the entire frame.

**Core Style:**
- Art Style: Professional comic book illustration with bold black outlines, dynamic action lines, and dramatic high-contrast lighting.
- Colors: Vibrant, saturated colors.
- Composition: Use the specified camera angles, shot types, and focus to create a cinematic and dynamic scene.

**Critical Mandate: Render All Textual and Auditory Elements**
- You MUST render the dialogue, captions, AND sound effects provided in the JSON sections below directly into the artwork.
- **Dialogue & Captions**:
    - Place speech bubbles appropriately near the character who is speaking. The bubble's tail should point towards the speaker's mouth.
    - Place captions in visually appropriate locations, such as corners, to frame the scene.
- **Sound Effects (SFX)**:
    - Render the 'sfx_text' with the specified 'style'.
    - Use the 'position', 'rotation', and 'scale' data to place the SFX dynamically for maximum impact. The (0,0) coordinate is top-left, (100,100) is bottom-right.
- Use a classic, legible comic book font like 'CC Wild Words' for dialogue and captions. For sound effects (SFX), use a bold, dynamic, and impactful font style that matches the sound's nature (e.g., jagged for 'CRASH', flowing for 'WHOOSH').
- Refer to characters consistently by name when they are portrayed in the image and when they speak.

**MANDATORY DIRECTIVE: BACKGROUND AND CHARACTER INTEGRITY - THIS IS THE MOST IMPORTANT RULE.**
1.  **ABSOLUTE BACKGROUND TRUTH:** You have been provided with a background image for the scene. This image is the **absolute ground truth** for the panel's environment. You MUST use this image as the background for the panel you generate. Place the characters within this existing scene. Do NOT alter the background.
2.  **Absolute Visual Ground Truth (Characters):** You have been provided with reference images for the characters. These images are the **absolute ground truth** and NON-NEGOTIABLE. You MUST replicate the characters' appearance from these images with 100% accuracy in EVERY panel.
3.  **Unwavering Consistency:** This includes ALL visual details: costume, cape, clothing, fur color, breed, species, markings, and physical features. There must be ZERO deviation from the provided reference images. The supplementary text descriptions are for posing and expression ONLY, not for changing the character's core appearance: {character_descriptions}.
4.  **Strict Character Count:** The scene must contain EXACTLY these characters and no others: {character_list_for_semantic_negative}. Do NOT add, remove, or duplicate any character.

**Panel Visuals (JSON):**
{panel_visuals}

**Panel Textual (JSON):**
{panel_textual}

**Panel Auditory (JSON):**
{panel_auditory}
`;

export const COVER_PAGE_PROMPT_TEMPLATE = `
Generate a stunning, cinematic cover for a comic book titled "{title}" in the {art_style} aesthetic.

**Story Logline:**
{logline}

**Core Style:**
- Art Style: Professional comic book illustration with bold black outlines, dynamic action lines, and dramatic high-contrast lighting.
- Composition: Create a dynamic, high-impact composition suitable for a cover. Feature the main protagonist prominently, possibly in an action pose or a dramatic moment that hints at the story's conflict. Other key characters can be included in the background or as part of a montage.

**Critical Mandate: Render the Title**
- You MUST render the comic book title "{title}" prominently on the cover.
- Use a professional, bold, and stylish font that fits the comic's genre and tone. The title should be easily readable and visually integrated into the artwork.

**CRITICAL MANDATE: ABSOLUTE CHARACTER CONSISTENCY**
- You have been provided with reference images for the characters. These images are the **absolute ground truth** and NON-NEGOTIABLE.
- It is MANDATORY that you replicate the characters' appearance from these images with 100% accuracy.
- This includes ALL visual details: costume, cape, clothing, fur color, breed, species, markings, and physical features. There must be ZERO deviation.
- The supplementary text descriptions are for posing and expression ONLY: {consistency_tags}
`;