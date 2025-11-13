// types.ts

// --- Generic & Utility Types ---

export interface ImageFile {
  base64: string;
  mimeType: string;
  previewUrl: string; // Used for local preview
}

// Stored in localStorage (JSON-serializable)
export interface StoredReferenceFile {
    id: string;
    base64: string;
    mimeType: string;
    type: 'image' | 'video';
}
// Used in components with live object URLs
export interface ReferenceFile extends StoredReferenceFile {
    previewUrl: string;
    file: File;
}

// --- Video Generator ---

export interface GeneratorOptions {
  prompt: { video: string; audio: string };
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:3' | '3:4';
  enableSound: boolean;
  resolution: '720p' | '1080p';
  image?: {
    base64: string;
    mimeType: string;
  };
}

export interface VideoGeneratorState {
    prompt: { video: string; audio: string };
    imageFile: { base64: string; mimeType: string } | null;
    aspectRatio: '16:9' | '9:16' | '1:1' | '4:3' | '3:4';
    enableSound: boolean;
    resolution: '720p' | '1080p';
}

export type VideoGeneratorOrigin = 'storyboard' | 'affiliate' | 'reference' | 'direct';


// --- Story Creator ---

export type ActiveTab = 'editor' | 'storyboard' | 'publishingKit';

export interface Character {
    id: string;
    name: string;
    brandName: string;
    modelName: string;
    consistency_key: string;
    material?: string;
    designLanguage?: string;
    keyFeatures: string[];
    actionDNA?: string[];
    character_personality?: string;
    physical_details?: string;
    scale_and_size?: string;
}

export interface DirectingSettings {
    sceneStyleSet: string;
    customSceneStyle: string;
    locationSet: string;
    customLocation: string;
    weatherSet: string;
    customWeather: string;
    cameraStyleSet: string;
    customCameraStyle: string;
    narratorLanguageSet: string;
    customNarratorLanguage: string;
    timeOfDay: string;
    artStyle: string;
    soundtrackMood: string;
    pacing: string;
}

export interface StoryboardScene {
    scene_number: number;
    scene_title: string;
    scene_summary: string;
    character_actions: {
        character_name: string;
        action_description: string;
        consistency_key: string;
    }[];
    cinematography: {
        shot_type: string;
        camera_angle: string;
        camera_movement: string;
    };
    sound_design: {
        sfx: string[];
        ambience: string;
        narration_script: string;
        audio_mixing_guide: string;
    };
    blueprintPrompt?: string;
    cinematicPrompt?: string;
}

export interface ThumbnailConcept {
    concept_title_id: string;
    concept_title_en: string;
    concept_description_id: string;
    concept_description_en: string;
    image_prompt: string;
    advanced_prompt_json_id: string;
    advanced_prompt_json_en: string;
    concept_caption_id: string;
    concept_caption_en: string;
}

export interface PublishingKitData {
    youtube_title_id: string;
    youtube_title_en: string;
    youtube_description_id: string;
    youtube_description_en: string;
    youtube_tags_id: string[];
    youtube_tags_en: string[];
    affiliate_links: {
        primary_character_template: string;
        all_characters_template: string;
    };
    thumbnail_concepts: ThumbnailConcept[];
}

export interface GeneratedPrompts {
    simple_prompt: string;
    json_prompt: string;
}

export interface ReferenceIdeaState {
    referenceFiles: StoredReferenceFile[];
    results: GeneratedPrompts | null;
}

export interface ThemeSuggestion {
    category_name: string;
    themes: string[];
}
export interface StoryIdea {
    title_suggestion: string;
    script_outline: string;
}
export interface ThemeIdeaOptions {
    contentFormat: string;
    characterNames: string[];
    language: string;
}
export interface StoryIdeaOptions {
    contentFormat: string;
    characterNames: string[];
    theme: string;
    language: string;
}


// --- Affiliate Creator ---

export interface GeneratedAffiliateImage {
    id: string;
    base64: string;
    mimeType: string;
    prompt: string;
    videoPrompt?: string;
}

export interface AffiliateCreatorState {
    productReferenceFiles: StoredReferenceFile[];
    actorReferenceFiles: StoredReferenceFile[];
    generatedImages: GeneratedAffiliateImage[];
    numberOfImages: number;
    model: 'woman' | 'man' | 'none';
    vibe: string;
    customVibe: string;
    productDescription: string;
    aspectRatio: '9:16' | '16:9' | '1:1' | '4:3' | '3:4';
    narratorLanguage: string;
    customNarratorLanguage: string;
    speechStyle: string;
    customSpeechStyle: string;
}

export type VideoPromptType = 'hook' | 'continuation' | 'closing';

// --- Speech Generator ---

export type SpeechMode = 'single' | 'multi';

export interface DialogEntry {
    id: string;
    speakerId: string;
    text: string;
}

export interface SpeakerConfig {
    id: string;
    name: string;
    voice: string;
}

// --- Photo Style Creator ---

export type PhotoType = 'artist_model' | 'product' | 'thumbnail';

export interface MusicThumbnailStyle {
    fontFamily: string;
    songsColor: string;
    gradient?: { start: string; end: string };
    solidColor?: string;
    shadow?: { color: string; blur: number };
    outline?: { color: string; width: number };
}

export interface PhotoStyleCreatorState {
    photoType: PhotoType;
    referenceFiles: StoredReferenceFile[];
    productFiles: StoredReferenceFile[];
    numberOfImages: number;
    aspectRatio: '1:1' | '9:16' | '16:9' | '3:4' | '4:3';
    // Artist/Model
    prompt: string;
    facialExpression: string;
    customFacialExpression: string;
    handGesture: string;
    customHandGesture: string;
    bodyPose: string;
    customBodyPose: string;
    pose: string;
    customPose: string;
    backgroundColor: string;
    // Product
    productDescription: string;
    productShotType: string;
    customProductShotType: string;
    productLighting: string;
    customProductLighting: string;
    productBackground: string;
    customProductBackground: string;
    // Thumbnail
    thumbnailTopic: string;
    thumbnailStyle: string;
    customThumbnailStyle: string;
    thumbnailOverlayText: string;
    thumbnailFont: string;
    customThumbnailFont: string;
    thumbnailPalette: string;
    customThumbnailPalette: string;

    // NEW: Thumbnail sub-mode
    thumbnailMode: 'normal' | 'music';

    // NEW: Music Thumbnail properties
    musicAiThemePrompt: string;
    musicInspirationImage: StoredReferenceFile | null;
    musicUseInspiration: boolean;
    musicTitle: string;
    musicSongList: string;
    musicAutoClean: boolean;
    musicTitleFontSize: number;
    musicSongsFontSize: number;
    musicTitleFont: string;
    musicSongsFont: string;
    musicSongsColor: string;
    musicUseGradient: boolean;
    musicGradientStart: string;
    musicGradientEnd: string;
    musicTitleColor: string;
    musicUseShadow: boolean;
    musicShadowColor: string;
    musicShadowBlur: number;
    musicTitleAlign: 'left' | 'center' | 'right';
    musicColumnCount: 1 | 2 | 4;
    musicCanvasBgColor: string;
}
export interface PhotoStyleRecommendations {
    facialExpression?: string[];
    handGesture?: string[];
    bodyPose?: string[];
    pose?: string[];
    productShotType?: string[];
    productLighting?: string[];
    productBackground?: string[];
    thumbnailStyle?: string[];
    thumbnailFont?: string[];
    thumbnailPalette?: string[];
}
