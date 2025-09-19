



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
- A 'consistency_tags' string of 3-5 key visual keywords for prompt injection (e.g., 'orange hoodie, black mask, skateboard').

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
You are an expert story architect and narrative designer with a flair for creating emotionally resonant, gritty, and profound narratives. Your task is to create a complete story blueprint for a 20-22 page comic book, drawing inspiration from the themes found in stories like "Logan," "The Wrestler," and biblical allegories. Focus on themes of sacrifice, the weight of a legacy, redemption for past failures, and the struggle of a world-weary protagonist facing one last fight.

Characters: {allCharactersDescription}

**CRITICAL BLUEPRINT REQUIREMENTS:**

1.  **Title & Logline**:
    -   Generate a catchy, evocative 'title'.
    -   Write a one-sentence 'logline' that summarizes the core, personal conflict.

2.  **Themes**:
    -   Identify 1-2 central 'themes' the story will explore. Prioritize themes from this list: [Sacrifice for a Greater Good, The Burden of Legacy, Atonement and Redemption, Finding Purpose in a Fading World, The Cost of Defiance].

3.  **Character Arc**:
    -   For the protagonist, define their 'character_arc' as that of a reluctant, world-weary hero.
    -   Specify their 'internal_conflict', which should stem from a past failure or a loss of faith in their own cause.
    -   Provide a brief 'arc_summary' that details their journey from disillusionment to making a meaningful, potentially sacrificial, stand.

4.  **Character Voices**:
    -   For each character, describe their 'character_voice'.
    -   Detail their 'speech_patterns' (e.g., "sparse and weary", "bitter and cynical", "hopeful but naive").
    -   Describe their 'vocabulary' (e.g., "uses simple, direct language", "prone to philosophical musings").

5.  **Three-Act Outline**:
    -   Structure the story into a classic 'three_act_outline'.
    -   **Act 1 (The Setup)**: Introduce the world-weary protagonist, their quiet, post-conflict life, and hint at a past tragedy or failure. The inciting incident should drag them back into a fight they no longer believe in.
    -   **Act 2 (The Confrontation)**: Escalate the conflict, forcing the protagonist to confront their past. They suffer a significant setback or loss, pushing them to the brink of despair. The midpoint should be a moment of painful realization where they understand the true, personal cost of victory.
    -   **Act 3 (The Resolution)**: Build to a raw, emotionally charged climax where the protagonist makes a significant sacrifice. The resolution should be bittersweet, not a simple victory. It should secure a future for others but at a great personal cost to the hero, cementing their legacy.
    -   For each act, define 'key_scenes' with a 'scene_title' and 'description' of what happens.

The output must be a valid JSON object following the specified schema for the Story Development Package.
`;


export const STORY_GENERATION_PROMPT = `
You are a master comic book writer in the vein of a modern epic storyteller, channeling the raw, emotional gravity of narratives like "Logan" and "The Wrestler." Your task is to generate a complete, panel-by-panel comic book script that feels grounded, visceral, and emotionally impactful, based on the provided **Story Blueprint**.

**Story Blueprint (Your guide):**
{storyDevelopmentPackage}

**Characters:**
{allCharactersDescription}

**CRITICAL SCRIPTING REQUIREMENTS:**

1.  **Adherence to Blueprint**: You MUST follow the Three-Act Outline, Character Arcs, and Themes defined in the blueprint. The panels you describe must directly serve the pre-established narrative's tone of sacrifice and bittersweet victory.
2.  **Visual Storytelling**:
    -   Translate the 'key_scenes' from the blueprint into specific visual actions and compositions.
    -   Focus on a grounded, almost cinematic feel. Use close-ups on weary faces, panels that linger on the aftermath of action, and compositions that emphasize the protagonist's isolation or the weight of their burdens.
    -   Use silent panels to build emotional tension and let poignant moments breathe.
3.  **Dialogue and Voice**:
    -   Write sparse, meaningful, and character-driven dialogue that STRICTLY adheres to the 'Character Voice' guides. Avoid witty banter.
    -   Conversations should be heavy with subtext, revealing past pain and current struggles. Dialogue should feel realistic and earned, not expositional.
4.  **Pacing and Layout**:
    -   The story must span approximately 20-22 pages.
    -   Page 0: A somber, atmospheric 'Splash Page' that establishes the protagonist's world-weary state, not necessarily an action shot.
    -   Pages 10-11: The story's climax should be a "cinematic double-page spread" that is emotionally devastating, focusing on the protagonist's sacrifice rather than just a spectacular fight.
    -   Final page: A somber, reflective conclusion, showing the consequences of the climax and the bittersweet nature of the hero's legacy. It should leave the reader with a lasting emotional impression.
    -   Vary shot types ('Splash Page', 'Wide Shot', 'Medium Shot', 'Close-Up', etc.) and angles ('High Angle', 'Low Angle', etc.) to create an emotionally resonant reading experience.
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
- Refer to characters consistently by the names provided in the 'CHARACTER REFERENCES' section when they are portrayed in the image and when they speak.

**MANDATORY DIRECTIVE: CHARACTER AND BACKGROUND CONSISTENCY - THIS IS THE MOST IMPORTANT RULE.**
1.  **CHARACTER REFERENCES:** You have been provided with reference images for the following characters. You MUST treat their 'consistency_tags' and reference image as the absolute, non-negotiable truth for their appearance. Use their names as provided below.
    {character_references}

2.  **ABSOLUTE VISUAL TRUTH (CHARACTERS):** The provided reference images are the **single source of truth** for character appearance and are NON-NEGOTIABLE.
    -   **Replicate Appearance 100%:** You MUST replicate the characters' appearance from their reference images with 100% accuracy in every panel.
    -   **NO DEVIATION:** This includes ALL visual details: costume, cape, clothing, armor, accessories, colors, markings, and physical features. Do NOT add, remove, or alter any element of a character's design from panel to panel. For example, if a character has a cape in the reference image, they MUST have a cape in this panel unless the prompt explicitly states it was removed. If they do NOT have a cape, DO NOT add one.
    -   **Text Descriptions are Secondary:** The supplementary text descriptions in the "Panel Visuals" JSON are for posing, positioning, and expression ONLY. They are NOT for altering a character's core appearance. The reference images and the visual descriptions above ALWAYS take precedence.

3.  **ABSOLUTE BACKGROUND TRUTH (SCENE):** You have been provided with a background image for the scene. This is the **absolute ground truth** for the panel's environment. You MUST use this image as the background. Place the characters within this existing scene. Do NOT alter, redraw, or reinterpret the background in any way.

4.  **STRICT CHARACTER COUNT:** The scene must contain EXACTLY these characters: {character_list_for_semantic_negative}. Do NOT add, remove, or duplicate any character.

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
- **Single Source of Truth:** You have been provided with character reference images. These images are the **single source of truth** for character appearance and are NON-NEGOTIABLE.
- **100% Accuracy Required:** You MUST replicate the characters' appearance from these images with 100% accuracy.
- **NO DEVIATION:** This includes ALL visual details: costume, cape, clothing, armor, accessories, colors, markings, and physical features. Do NOT add, remove, or alter any element of a character's design.
- **Text is for Posing Only:** The supplementary text descriptions ({consistency_tags}) are for posing and expression ONLY, not for changing the character's core appearance. The reference images ALWAYS take precedence.
`;

export const FULL_STORY_TEXT_GENERATION_PROMPT_TEMPLATE = `
You are a master novelist. Your task is to transform a detailed comic book script, provided in JSON format, into a cohesive and engaging full-length narrative story. Retain the core plot, character voices, and key moments.

**Comic Script (JSON):**
{storyOutline}

**CRITICAL REQUIREMENTS:**

1.  **Narrative Flow**: Weave the panel descriptions, actions, dialogue, and captions into a smooth, flowing story. Do not just list the events.
2.  **Descriptive Language**: Elaborate on the visual descriptions from the 'visuals' section. Describe settings, character expressions, and actions with rich, evocative language.
3.  **Show, Don't Tell**: Convert compositional notes (e.g., 'Close-Up', 'Low Angle') into narrative descriptions that convey the intended emotion or power dynamic. For instance, instead of saying 'a close-up on the character's face,' describe the intense emotion visible in their eyes.
4.  **Dialogue Integration**: Seamlessly integrate the dialogue from the 'textual' section into the narrative. Use proper formatting for spoken words and attribute them to the correct characters.
5.  **Internal Monologue**: Use thought bubbles and captions to inform characters' internal thoughts and feelings.
6.  **Pacing**: Maintain the pacing intended by the script's three-act structure. Build tension, create impactful moments, and provide a satisfying resolution.
7.  **Tone**: Preserve the overall tone and atmosphere described in the 'mood_and_lighting' sections.

The final output should be a single block of text. Use standard paragraph breaks (a blank line between paragraphs) to separate distinct paragraphs and ideas for clear readability. The story should flow naturally, not like a list of events. Do not include any JSON or formatting instructions in your output.
`;