



export interface CharacterProfile {
  physical_traits: string[];
  clothing_style: string;
  color_palette: string[];
  distinctive_features: string[];
  consistency_tags: string;
  art_style: string;
}

// New type for generated characters
export interface GeneratedCharacter {
  role: string;
  name: string;
  description: string;
  imageUrls: Record<string, string>;
}

// New type for character concepts before image generation
export interface CharacterConcept {
  role:string;
  name: string;
  description: string;
}

export interface GeneratedPanel extends Panel {
  imageUrl: string;
}

export enum AppStep {
  CHARACTER_SETUP,
  STORY_DEVELOPMENT,
  CHARACTER_GENERATION,
  VIEW_STORY,
  GENERATION_IN_PROGRESS,
  VIEW_COMIC,
}


// --- NEW STORY DEVELOPMENT BLUEPRINT ---
export interface CharacterArc {
  character_name: string;
  internal_conflict: string;
  arc_summary: string;
}

export interface CharacterVoice {
  character_name: string;
  speech_patterns: string;
  vocabulary: string;
}

export interface KeyScene {
  scene_title: string;
  description: string;
  page_estimation: string;
}

export interface Act {
  act_number: 1 | 2 | 3;
  act_title: string;
  summary: string;
  key_scenes: KeyScene[];
}

export interface StoryDevelopmentPackage {
  title: string;
  logline: string;
  themes: string[];
  character_arcs: CharacterArc[];
  character_voices: CharacterVoice[];
  three_act_outline: Act[];
}


// --- NEW DETAILED PANEL STRUCTURE ---

export interface PanelSetting {
  location: string;
  time_of_day: string;
  description: string;
}

export interface PanelCharacter {
  name: string;
  position: string;
  expression: string;
  description:string;
}

export interface PanelAction {
  description: string;
  key_moment?: string;
}

export type ShotType = "Splash Page" | "Extreme Wide Shot" | "Wide Shot" | "Full Shot" | "Medium Shot" | "Close-Up" | "Extreme Close-Up";
export type Angle = "Eye-Level" | "High Angle" | "Low Angle" | "Dutch Angle (Tilted)" | "Point-of-View (POV)";

export interface PanelComposition {
  shot_type: ShotType;
  angle: Angle;
  focus: string;
}

export interface PanelMoodAndLighting {
  atmosphere: string;
  lighting_source: string;
  coloring_notes?: string;
}

export interface PanelVisuals {
  setting: PanelSetting;
  characters: PanelCharacter[];
  action: PanelAction;
  composition: PanelComposition;
  mood_and_lighting: PanelMoodAndLighting;
}

export type DialogueType = "Speech_Bubble" | "Thought_Bubble" | "Whisper_Bubble" | "Burst_Bubble (Yelling)" | "Radio/Phone_Bubble";

export interface PanelDialogue {
  character: string;
  content: string;
  type: DialogueType;
  position?: { x: number; y: number }; // (x, y) coordinates as percentages (0-100)
}

export type CaptionPosition = "Top_Left" | "Top_Center" | "Bottom_Right";

export interface PanelCaption {
  content: string;
  position?: CaptionPosition;
  coordinates?: { x: number; y: number };
}

export interface PanelInSceneText {
  text: string;
}

export interface PanelTextual {
  dialogue: PanelDialogue[];
  caption?: PanelCaption;
  in_scene_text: PanelInSceneText[];
}

export interface PanelSoundEffect {
  sfx_text: string;
  style: string;
  position?: { x: number; y: number }; // (x, y) coordinates as percentages (0-100)
  rotation?: number; // degrees
  scale?: number; // multiplier, e.g., 1.5
}

export interface PanelAuditory {
  sound_effects: PanelSoundEffect[];
}

export type BorderStyle = "Standard" | "Borderless (Bleed)" | "Wavy (Dream/Memory)" | "Jagged (Impact/Chaos)";

export interface PanelLayout {
  description: string;
  border_style: BorderStyle;
}

export interface Panel {
  page_number: number;
  panel_number: number;
  visuals: PanelVisuals;
  textual: PanelTextual;
  auditory: PanelAuditory;
  layout: PanelLayout;
  transition?: {
    to_next_panel: string;
  };
}

export interface StoryOutline {
  title: string;
  prologue: string;
  panels: Panel[];
}

export interface CharacterImage {
  name: string;
  base64: string;
  mimeType: string;
}