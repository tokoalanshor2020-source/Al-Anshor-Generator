// services/storyCreatorService.ts
import { GoogleGenAI, Type, GenerateContentResponse, Modality } from "@google/genai";
import type { Character, StoryboardScene, DirectingSettings, PublishingKitData, StoryIdea, ThemeSuggestion, ThemeIdeaOptions, StoryIdeaOptions, GeneratedPrompts, ReferenceFile, GeneratedAffiliateImage, AffiliateCreatorState, VideoPromptType, StoredReferenceFile } from '../types';
import { languageMap } from '../i18n';


// --- Storyboard Generation ---

const generatePromptForStoryboard = (
    logline: string,
    scenario: string,
    sceneCount: number,
    characters: Character[],
    settings: DirectingSettings
): string => {
    
    const characterDetails = characters.map(c => 
`- **${c.name} (${c.consistency_key})**: A toy ${c.brandName} ${c.modelName}. Personality: ${c.character_personality || 'not specified'}. Key features: ${c.keyFeatures.join(', ')}.`
    ).join('\n');

    const directingNotes = `
- Scene Style: ${settings.sceneStyleSet === 'custom_scene' ? settings.customSceneStyle : settings.sceneStyleSet.replace(/_/g, ' ')}
- Main Location: ${settings.locationSet === 'custom_location' ? settings.customLocation : settings.locationSet.replace(/_/g, ' ')}
- Atmosphere: ${settings.weatherSet === 'custom_weather' ? settings.customWeather : settings.weatherSet.replace(/_/g, ' ')}
- Camera Style: ${settings.cameraStyleSet === 'custom_camera' ? settings.customCameraStyle : settings.cameraStyleSet.replace(/_/g, ' ')}
- Art Style: ${settings.artStyle.replace(/_/g, ' ')}
- Pacing: ${settings.pacing.replace(/_/g, ' ')}
- Soundtrack Mood: ${settings.soundtrackMood.replace(/_/g, ' ')}
- Narrator Language: ${settings.narratorLanguageSet === 'custom_language' ? settings.customNarratorLanguage : settings.narratorLanguageSet}
    `;

    return `
You are a professional screenwriter and director for children's toy videos. Your task is to develop a compelling story into a detailed storyboard structure.

**Story Logline (Title):** ${logline}

**Story Scenario (Summary):**
${scenario}

**Characters Involved:**
${characterDetails.length > 0 ? characterDetails : "- No specific characters defined."}

**Directing Notes:**
${directingNotes}

**Task:**
Based on all the information above, create a storyboard with exactly ${sceneCount} scenes. Each scene must be a distinct event in the story.
For each scene, you MUST provide ALL of the following details in the specified JSON structure:
1.  **scene_number**: The sequential number of the scene.
2.  **scene_title**: A short, catchy title for the scene.
3.  **scene_summary**: A one-sentence summary of what happens in this scene.
4.  **character_actions**: An array of actions for each character present in the scene. For each character, specify their 'character_name', their 'consistency_key' (critical for visual generation), and a detailed 'action_description'.
5.  **cinematography**: Details including 'shot_type' (e.g., "Wide Shot", "Close-up"), 'camera_angle' (e.g., "Low Angle", "Eye-Level"), and 'camera_movement' (e.g., "Static", "Slow Pan Right").
6.  **sound_design**: Details including 'sfx' (an array of specific sound effects), 'ambience' (background sound), 'narration_script' (a short, concise narration script for this scene. CRITICAL: The narration must be easily spoken in under 8 seconds to fit the video clip duration.), and 'audio_mixing_guide' (instructions on how audio elements should be balanced).

Ensure the final output is ONLY a valid JSON array of scenes, with no extra text or explanations.
`;
};

const storyboardSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            scene_number: { type: Type.INTEGER },
            scene_title: { type: Type.STRING },
            scene_summary: { type: Type.STRING },
            character_actions: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        character_name: { type: Type.STRING },
                        action_description: { type: Type.STRING },
                        consistency_key: { type: Type.STRING },
                    },
                    required: ['character_name', 'action_description', 'consistency_key']
                }
            },
            cinematography: {
                type: Type.OBJECT,
                properties: {
                    shot_type: { type: Type.STRING },
                    camera_angle: { type: Type.STRING },
                    camera_movement: { type: Type.STRING }
                },
                required: ['shot_type', 'camera_angle', 'camera_movement']
            },
            sound_design: {
                type: Type.OBJECT,
                properties: {
                    sfx: { type: Type.ARRAY, items: { type: Type.STRING } },
                    ambience: { type: Type.STRING },
                    narration_script: { type: Type.STRING },
                    audio_mixing_guide: { type: Type.STRING }
                },
                required: ['sfx', 'ambience', 'narration_script', 'audio_mixing_guide']
            }
        },
        required: ['scene_number', 'scene_title', 'scene_summary', 'character_actions', 'cinematography', 'sound_design']
    }
};

// FIX: Removed failover logic and used direct API call with environment variable for API key.
export const generateStoryboard = async (
    { logline, scenario, sceneCount, characters, directingSettings }: {
        logline: string;
        scenario: string;
        sceneCount: number;
        characters: Character[];
        directingSettings: DirectingSettings;
    }
): Promise<StoryboardScene[]> => {
    const prompt = generatePromptForStoryboard(logline, scenario, sceneCount, characters, directingSettings);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: storyboardSchema
        }
    });
    const resultText = response.text;

    try {
        return JSON.parse(resultText);
    } catch (e) {
        console.error("Failed to parse storyboard JSON:", resultText);
        throw new Error("The AI returned an invalid storyboard format.");
    }
};


// --- Scene Prompt Generation ---

// FIX: Removed failover logic and used direct API call with environment variable for API key.
export const generateBlueprintPrompt = async (
    scene: StoryboardScene,
    characters: Character[],
    settings: DirectingSettings
): Promise<string> => {
    const characterProfiles = scene.character_actions
    .map(action => {
        const character = characters.find(c => c.consistency_key === action.consistency_key);
        if (!character) return null;

        const isToy = character.material?.toLowerCase().includes('toy') || character.material?.toLowerCase().includes('pvc') || character.scale_and_size?.toLowerCase().includes('scale');
        
        const characterDescription = isToy
            ? `A meticulously crafted toy figure of a ${character.material}.`
            : `A photorealistic digital double of ${character.name}.`;

        return `
//** 2. SUBJECT & DETAILS: ${character.name} **//
SUBJECT:
**Character ID:** ${character.name} (${character.brandName} ${character.modelName})
**Consistency Key:** ${character.consistency_key}
**Description:** ${characterDescription} Its design language is '${character.designLanguage}'. ${character.physical_details || ''} Its personality is ${character.character_personality || 'not specified'}.
**Scale & Size:** ${character.scale_and_size || 'Not specified.'}
**Key Visual Features:**
${character.keyFeatures.map(f => `*   ${f}`).join('\n')}
**Action in Scene:** ${action.action_description}
`;
    })
    .filter(Boolean)
    .join('\n');

    const prompt = `
You are a master prompt engineer for an advanced text-to-video AI. Your task is to generate a highly detailed, structured video prompt based on a scene from a storyboard. The output must follow the provided 8-part format precisely.

**CRITICAL STYLE INSTRUCTION:**
Analyze the "SUBJECT & DETAILS" section for each character. If a character is described as a "toy" or "figure", the entire scene must be rendered as a hyper-realistic depiction of a toy in a realistic or diorama setting. If the character is described as a "photorealistic digital double" or a real person/animal, the entire scene must be rendered with full realism, as if it were a live-action film. Your descriptions in all sections must reflect this core style.

**Directing Notes (Meja Bermain Settings):**
- Scene Style: ${settings.sceneStyleSet === 'custom_scene' ? settings.customSceneStyle : settings.sceneStyleSet.replace(/_/g, ' ')}
- Location: ${settings.locationSet === 'custom_location' ? settings.customLocation : settings.locationSet.replace(/_/g, ' ')}
- Atmosphere: ${settings.weatherSet === 'custom_weather' ? settings.customWeather : settings.weatherSet.replace(/_/g, ' ')}
- Time of Day: ${settings.timeOfDay.replace(/_/g, ' ')}
- Camera Style: ${settings.cameraStyleSet === 'custom_camera' ? settings.customCameraStyle : settings.cameraStyleSet.replace(/_/g, ' ')}
- Specific Cinematography: ${scene.cinematography.shot_type}, ${scene.cinematography.camera_angle}, ${scene.cinematography.camera_movement}
- Art Style: ${settings.artStyle.replace(/_/g, ' ')}
- Soundtrack Mood: ${settings.soundtrackMood.replace(/_/g, ' ')}
- Pacing: ${settings.pacing.replace(/_/g, ' ')}

**Scene Information:**
- Title: ${scene.scene_title}
- Summary: ${scene.scene_summary}
- Sound Effects: ${scene.sound_design.sfx.join(', ')}
- Ambience: ${scene.sound_design.ambience}
- Narration Script: "${scene.sound_design.narration_script}"
- Audio Mix Guide: ${scene.sound_design.audio_mixing_guide}

**CRITICAL TASK:**
Generate a complete video prompt using the following 8-part structure. Fill each section with rich, creative details inspired by all the information provided above. Use the character profiles I provide to construct the 'SUBJECT & DETAILS' section.

**OUTPUT FORMAT:**

//** 1. VISUAL STYLE & QUALITY **//
STYLE: [Based on the Art Style setting, describe the visual style in detail. e.g., "Hyper-realistic, professional product photography, macro, high detail, cinematic lighting"]

${characterProfiles.length > 0 ? characterProfiles : `//** 2. SUBJECT & DETAILS **//\nSUBJECT:\n[Describe the main subject of the scene based on the summary, as no specific character was assigned.]`}

//** 3. ENVIRONMENT & BACKGROUND **//
ENVIRONMENT: [Describe the location and environment in great detail, based on the location and atmosphere settings.]

//** 4. COMPOSITION & PERSPECTIVE **//
COMPOSITION: [Describe the camera work, combining the Camera Style settings with the specific cinematography notes for the scene.]

//** 5. LIGHTING & ATMOSPHERE **//
LIGHTING: [Describe the lighting based on Time of Day and Atmosphere settings. Be specific about key, fill, and rim lights.]

//** 6. NEGATIVE PROMPT **//
NEGATIVE_PROMPT: animation, 3d render, cgi, cartoon, illustration, painting, drawing, art, video game, unreal engine, octane render, blender render, digital art, perfect, clean, smooth, glossy, inconsistent character, changing model

//** 7. NARRATION SCRIPT (VOICE OVER) **//
INSTRUCTION: [Describe the narrator's tone, e.g., "The narration must be delivered in a very cheerful, enthusiastic, and childlike style."]
NARRATION (${settings.narratorLanguageSet === 'custom_language' ? settings.customNarratorLanguage : languageMap[settings.narratorLanguageSet as keyof typeof languageMap] || settings.narratorLanguageSet}): ${scene.sound_design.narration_script || "No narration for this scene."}

//** 8. AUDIO MIXING GUIDE (SPECIAL INSTRUCTION) **//
MIXING: ${scene.sound_design.audio_mixing_guide}

---
Output ONLY the structured text in the format above. Do not include any other text or explanations.
`;
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    return response.text.trim();
};

// FIX: Removed failover logic and used direct API call with environment variable for API key.
export const generateCinematicPrompt = async (
    scene: StoryboardScene,
    characters: Character[],
    settings: DirectingSettings
): Promise<string> => {
     const characterProfiles = scene.character_actions
    .map(action => {
        const character = characters.find(c => c.consistency_key === action.consistency_key);
        if (!character) return `The character ${action.character_name} (${action.consistency_key}) is performing the action: ${action.action_description}.`;
        
        const isToy = character.material?.toLowerCase().includes('toy') || character.material?.toLowerCase().includes('pvc') || character.scale_and_size?.toLowerCase().includes('scale');
        const characterDescription = isToy
            ? `A toy figure of a ${character.material}.`
            : `A photorealistic depiction of ${character.name}.`;

        return `
Character: ${character.name} (${character.consistency_key})
Full Description: ${characterDescription} Key visual features include ${character.keyFeatures.join(', ')}. ${character.physical_details || ''}. Its personality is ${character.character_personality || 'not specified'}.
Action in Scene: ${action.action_description}
`;
    })
    .join('\n');

    const prompt = `
You are a master prompt engineer for the advanced VEO text-to-video model. Your task is to create a "Cinematic Prompt".

**CRITICAL STYLE INSTRUCTION:**
Analyze the "Character Details & Actions" provided below. If a character is described as a "toy figure", you must write the cinematic paragraph as if you are describing a hyper-realistic video of a toy. If a character is described as "photorealistic" or a real entity, you must write the cinematic paragraph as a live-action film scene. All visual descriptions must match this style.

**Creative Input:**
- **Scene Summary:** ${scene.scene_summary}
- **Character Details & Actions:** 
${characterProfiles}
- **Cinematography:** ${scene.cinematography.shot_type}, ${scene.cinematography.camera_angle}, ${scene.cinematography.camera_movement}
- **Directing Notes:** 
    - Art Style: ${settings.artStyle.replace(/_/g, ' ')}
    - Location: ${settings.locationSet === 'custom_location' ? settings.customLocation : settings.locationSet.replace(/_/g, ' ')}
    - Atmosphere & Time: ${settings.weatherSet === 'custom_weather' ? settings.customWeather : settings.weatherSet.replace(/_/g, ' ')}, during ${settings.timeOfDay.replace(/_/g, ' ')}
- **Narration Script to Include:** "${scene.sound_design.narration_script}"

**CRITICAL TASK:**
Generate a response in two parts, exactly as follows:
1.  **Cinematic Paragraph:** Write a single, descriptive paragraph. This prompt should be rich with sensory details and cinematic language. Weave in the character's detailed description and consistency key naturally. Emphasize the visual mood and camera work from the directing notes.
2.  **Narration Block:** After the paragraph, add two newlines, then the heading "NARRATION SCRIPT", then a newline, and finally the exact narration script provided above. If there is no narration script, omit this entire block.

**Example Output Format:**
[CINEMATIC PARAGRAPH HERE]

NARRATION SCRIPT
[NARRATION SCRIPT HERE]

---
Output ONLY the formatted text. Do not include any other explanations or headings.
`;
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    return response.text.trim();
};


// --- Publishing Kit Generation ---
// FIX: Removed failover logic and used direct API call with environment variable for API key.
export const generatePublishingKit = async (
    { storyboard, characters, logline }: {
        storyboard: StoryboardScene[];
        characters: Character[];
        logline: string;
    }
): Promise<PublishingKitData> => {
     const prompt = `
You are a YouTube content strategist, SEO specialist, and viral marketing expert. Your task is to generate a complete and highly optimized publishing kit for a children's toy video based on the provided storyboard.

**Story Title:** ${logline}
**Number of Scenes:** ${storyboard.length}
**Story Summary:** ${storyboard.map(s => s.scene_summary).join(' ')}
**Main Characters:** ${characters.map(c => c.name).join(', ')}

**Task:**
Generate a comprehensive publishing kit in a single, valid JSON object. You MUST provide details for both Indonesian (id) and English (en). The JSON object must strictly adhere to the following keys and instructions:

1.  **"youtube_title_id", "youtube_title_en"**:
    *   Create a compelling, click-worthy YouTube title.
    *   The title MUST be under 100 characters.
    *   It MUST start with a strong hook (e.g., a question, a shocking statement) to grab attention.
    *   It MUST contain strong SEO keywords related to the story, characters, and theme.

2.  **"youtube_description_id", "youtube_description_en"**:
    *   Write a detailed, SEO-optimized description.
    *   The first paragraph (2-3 sentences) must be a captivating summary including the most important keywords.
    *   After the summary, add a list of 5-7 SEO keywords.
    *   Include timestamps for each scene from the summary.
    *   Conclude with a block of 3-5 relevant hashtags (e.g., #ToyAdventure #StopMotion #KidsStory).

3.  **"youtube_tags_id", "youtube_tags_en"**:
    *   Generate an extensive list of relevant YouTube tags.
    *   The total combined length of the tags should be maximized to be as close to the 400-500 character limit as possible.
    *   Include a mix of broad (e.g., "kids animation") and specific tags (e.g., character names, specific events from the story).

4.  **"affiliate_links"**:
    *   Use this exact structure: \`{ "primary_character_template": "URL_TEMPLATE_FOR_{characterName}", "all_characters_template": "URL_TEMPLATE_FOR_{characterName1},{characterName2}" }\`

5.  **"thumbnail_concepts"**:
    *   Create an array of exactly 2 concepts.
    *   Each concept must describe a dynamic, high-action, or emotionally charged moment from the story, perfect for a thumbnail.
    *   For each concept, provide:
        *   **"concept_title_id", "concept_title_en"**: A short title for the concept.
        *   **"concept_description_id", "concept_description_en"**: A brief description.
        *   **"image_prompt"**: A detailed visual prompt for an image model, focusing on the character's expression and the scene's drama.
        *   **"advanced_prompt_json_id", "advanced_prompt_json_en"**: A JSON string with keys "visual_prompt", "composition_notes", "lighting_style".
        *   **"concept_caption_id", "concept_caption_en"**: This is the text overlay for the thumbnail. It MUST be a short, powerful, and intriguing hook or question. It should be a complete thought, not a truncated sentence. For example: "CAN THEY ESCAPE?!", "THEIR BIGGEST CHALLENGE!", "SECRET REVEALED!".

Output ONLY the valid JSON object and nothing else.
`;
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json'
        }
    });
    const resultText = response.text;

    try {
        return JSON.parse(resultText);
    } catch (e) {
        console.error("Failed to parse publishing kit JSON:", resultText);
        throw new Error("The AI returned an invalid publishing kit format.");
    }
};

// FIX: Removed failover logic and used direct API call with environment variable for API key.
export const generateLocalizedPublishingAssets = async (
    context: { storyboard: StoryboardScene[], characters: Character[], logline: string, originalImagePrompt: string },
    targetLanguage: string
): Promise<any> => {
     const prompt = `
You are a localization expert for YouTube content. Your task is to translate and adapt a publishing kit for a new language and region.

**Original Language:** English/Indonesian
**Target Language:** ${targetLanguage}

**Original Content:**
- **Title:** ${context.logline}
- **Summary:** ${context.storyboard.map(s => s.scene_summary).join(' ')}
- **Characters:** ${context.characters.map(c => c.name).join(', ')}
- **Original Thumbnail Image Prompt:** ${context.originalImagePrompt}

**Task:**
Generate a JSON object containing the localized assets for the target language. The JSON MUST contain:
1.  "title": A culturally relevant and engaging title.
2.  "description": A full description, including scene timestamps.
3.  "tags": An array of relevant, localized tags.
4.  "thumbnail_concept": An object containing:
    - "concept_title": A title for the thumbnail idea.
    - "concept_description": A short description of the thumbnail.
    - "image_prompt": The original image prompt, translated and adapted.
    - "advanced_prompt_json": A JSON string with translated keys "visual_prompt", "composition_notes", "lighting_style".
    - "concept_caption": The translated text overlay for the thumbnail.

Output ONLY the valid JSON object.
`;
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
    });
    const resultText = response.text;
    try {
        return JSON.parse(resultText);
    } catch (e) {
        console.error("Failed to parse localized assets JSON:", resultText);
        throw new Error("The AI returned an invalid localized asset format.");
    }
};

// --- Thumbnail Generation ---

// FIX: Removed failover logic and used direct API call with environment variable for API key.
export const generateThumbnail = async (
    prompt: string,
    aspectRatio: string
): Promise<{ base64: string, mimeType: string }> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: `dramatic, ultra-realistic, 8k, youtube thumbnail, cinematic lighting, vibrant colors, attention-grabbing, trending on artstation: ${prompt}`,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: aspectRatio as any,
        }
    });

    const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
    if (!base64ImageBytes) throw new Error("Image generation failed, no image data received.");
    
    return { base64: base64ImageBytes, mimeType: 'image/jpeg' };
};


export const createImageWithOverlay = (
    imageData: { base64: string, mimeType: string },
    caption: string
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject('Could not get canvas context');

            ctx.drawImage(img, 0, 0);

            // Text styling
            const fontSize = Math.max(24, Math.floor(img.width / 18));
            ctx.font = `bold ${fontSize}px 'Arial', sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            const padding = fontSize * 0.75;
            
            // Stroke (outline)
            ctx.strokeStyle = 'black';
            ctx.lineWidth = fontSize / 6;

            // Shadow
            ctx.shadowColor = 'rgba(0,0,0,0.8)';
            ctx.shadowBlur = 15;
            ctx.shadowOffsetX = 5;
            ctx.shadowOffsetY = 5;

            // Text
            ctx.fillStyle = 'white';
            
            // Draw text with stroke
            ctx.strokeText(caption.toUpperCase(), canvas.width / 2, canvas.height - padding);
            ctx.fillText(caption.toUpperCase(), canvas.width / 2, canvas.height - padding);
            
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => reject('Failed to load image for overlay');
        img.src = `data:${imageData.mimeType};base64,${imageData.base64}`;
    });
};

// --- Character Workshop ---

// FIX: Removed failover logic and used direct API call with environment variable for API key.
export const developCharacter = async (
    { idea, referenceFiles }: { idea: string; referenceFiles: { base64: string, mimeType: string }[] }
): Promise<any> => {
     const prompt = `
You are a highly skilled character analyst. Your primary goal is to analyze the provided user idea and reference files to develop a detailed character profile.

**CRITICAL FIRST STEP: Analyze Reference Style**
First, carefully examine the style of the provided reference files.
- **If the references are photorealistic (e.g., a photo of a real person, animal, or object):** You must act as a digital character artist creating a realistic digital twin. ALL details you generate MUST be based strictly on the visual evidence. Do NOT invent toy-like or cartoonish features. The goal is realism and faithfulness to the reference.
- **If the references are of a toy, cartoon, or animation:** You can act as a toy branding expert. Develop the character profile based on the existing design, maintaining its established style.

**User Idea/Notes:** ${idea || 'No specific idea provided.'}
**Number of References:** ${referenceFiles.length}

**Task:**
Based on your analysis, generate a JSON object with the following details for the character.
- "brand_name": A fictional brand name. If the reference is realistic, this could be a project name (e.g., "Hyperion Digital Humans").
- "model_name": The specific name for the character or model.
- "consistency_key": A unique, short, uppercase token for prompt consistency (e.g., "STL_CHR_01").
- "material": The primary material. If it's a realistic human, this could be "Photorealistic digital human with skin, hair, and fabric shaders". If it's a toy, describe its material (e.g., "Premium PVC").
- "design_language": A description of the character's design style (e.g., "Contemporary chic and relatable", "Gritty sci-fi soldier").
- "key_features": An array of 3-5 key visual features (Visual DNA) taken directly from the reference. Be very specific.
- "character_personality": A brief description of the character's perceived traits based on their expression and appearance.
- "physical_details": Nuanced details about their appearance (e.g., "Small scar above the left eyebrow," "Slightly worn paint on the fender").
- "scale_and_size": The character's scale and approximate size (e.g., "Life-sized digital double," "1:64 scale die-cast model").

Output ONLY the valid JSON object.
`;
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const contents: any = { parts: [{ text: prompt }] };
    referenceFiles.forEach(file => {
        contents.parts.push({
            inlineData: {
                mimeType: file.mimeType,
                data: file.base64
            }
        });
    });
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: { responseMimeType: 'application/json' }
    });
    const resultText = response.text;

    try {
        // FIX: The API returns snake_case, but the app uses camelCase.
        // This causes type errors. This manual mapping is not ideal but will fix the issue.
        const parsed = JSON.parse(resultText);
        return {
            brandName: parsed.brand_name,
            modelName: parsed.model_name,
            consistency_key: parsed.consistency_key,
            material: parsed.material,
            designLanguage: parsed.design_language,
            keyFeatures: parsed.key_features,
            character_personality: parsed.character_personality,
            physical_details: parsed.physical_details,
            scale_and_size: parsed.scale_and_size,
            ...parsed // include original fields in case some match
        };
    } catch (e) {
        console.error("Failed to parse character JSON:", resultText);
        throw new Error("The AI returned an invalid character format.");
    }
};

// FIX: Removed failover logic and used direct API call with environment variable for API key.
export const generateActionDna = async (
    character: Partial<Character>
): Promise<string[]> => {
    const prompt = `
You are a creative director for toy commercials. Based on the character profile, brainstorm 5-7 exciting "Action DNA" capabilities. These should be short, dynamic actions the toy can perform.

**Character Profile:**
- Name: ${character.name}
- Type: ${character.brandName} ${character.modelName}
- Features: ${character.keyFeatures?.join(', ')}
- Personality: ${character.character_personality}

**Task:**
Generate a JSON array of 5-7 short strings representing the character's actions.
Example: ["jumps over obstacles", "drifts smoothly around corners", "activates turbo boost"]

Output ONLY the valid JSON array.
`;
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
    });
    const resultText = response.text;
     try {
        return JSON.parse(resultText);
    } catch (e) {
        console.error("Failed to parse Action DNA JSON:", resultText);
        throw new Error("The AI returned an invalid Action DNA format.");
    }
};

// --- Smart Director ---

// FIX: Removed failover logic and used direct API call with environment variable for API key.
export const generateThemeIdeas = async (options: ThemeIdeaOptions): Promise<ThemeSuggestion[]> => {
    const prompt = `
You are a creative assistant for a YouTube content creator. The user wants story theme ideas.

**Content Details:**
- Format: ${options.contentFormat}
- Main Characters: ${options.characterNames.join(', ')}
- Target Language for Themes: ${options.language}

**Task:**
Generate a JSON array of theme suggestions. Create 2-3 distinct categories. For each category, provide a "category_name" and an array of 3-4 specific "themes" within that category. The themes should be exciting and suitable for the content format and characters.

Output ONLY the valid JSON array.
`;
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
    });
    const resultText = response.text;
    try {
        return JSON.parse(resultText);
    } catch (e) {
        console.error("Failed to parse theme ideas JSON:", resultText);
        throw new Error("The AI returned an invalid theme idea format.");
    }
};

// FIX: Removed failover logic and used direct API call with environment variable for API key.
export const generateStoryIdeas = async (options: StoryIdeaOptions): Promise<StoryIdea[]> => {
    const prompt = `
You are a scriptwriter for a YouTube channel. Generate 3 distinct story ideas based on the user's request.

**Request Details:**
- Content Format: ${options.contentFormat}
- Main Characters: ${options.characterNames.join(', ')}
- Theme: ${options.theme}
- Language for Output: ${options.language}

**Task:**
Generate a JSON array containing exactly 3 story ideas. Each idea object in the array must have two keys:
1. "title_suggestion": A catchy, single-sentence title for the story.
2. "script_outline": A short, 2-3 sentence paragraph outlining the story's beginning, middle, and end.

Output ONLY the valid JSON array of 3 ideas.
`;
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
    });
    const resultText = response.text;
    try {
        return JSON.parse(resultText);
    } catch (e) {
        console.error("Failed to parse story ideas JSON:", resultText);
        throw new Error("The AI returned an invalid story idea format.");
    }
};

// --- Reference Idea Modal ---
// FIX: Removed failover logic and used direct API call with environment variable for API key.
export const analyzeReferences = async (files: ReferenceFile[]): Promise<GeneratedPrompts> => {
     const prompt = `
You are an expert cinematic prompt engineer. Analyze the provided reference image(s)/video(s). Your task is to generate two types of prompts to recreate a similar scene with a text-to-video model.

**Task:**
Generate a JSON object with two keys:
1. "simple_prompt": A concise, single-paragraph descriptive prompt capturing the essence of the scene.
2. "json_prompt": A detailed JSON object string that breaks down the scene into cinematic components like "subject", "action", "setting", "lighting", "camera_shot", and "mood".

Output ONLY the valid JSON object containing these two keys.
`;
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const contents: any = { parts: [{ text: prompt }] };
    files.forEach(file => {
        contents.parts.push({
            inlineData: { mimeType: file.mimeType, data: file.base64 }
        });
    });
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: { responseMimeType: 'application/json' }
    });
    const resultText = response.text;
     try {
        return JSON.parse(resultText);
    } catch (e) {
        console.error("Failed to parse reference analysis JSON:", resultText);
        throw new Error("The AI returned an invalid analysis format.");
    }
};

// FIX: Add missing generateReferenceImage function
// FIX: Removed failover logic and used direct API call with environment variable for API key.
export const generateReferenceImage = async (
    prompt: string,
    aspectRatio: '16:9' | '9:16' | '1:1' | '4:3' | '3:4'
): Promise<{ base64: string, mimeType: string }> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: `cinematic still, ultra realistic, high detail, product shot style: ${prompt}`,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: aspectRatio,
        }
    });

    const image = response.generatedImages[0];
    if (!image?.image?.imageBytes) {
        throw new Error("Reference image generation failed, no image data returned.");
    }
    return { base64: image.image.imageBytes, mimeType: 'image/jpeg' };
};

// --- Affiliate Creator Service Functions ---

// FIX: Removed failover logic and used direct API call with environment variable for API key.
export const generateAffiliateDescription = async (
    files: { productFiles: { base64: string, mimeType: string }[], actorFiles: { base64: string, mimeType: string }[] }
): Promise<string> => {
    const prompt = `You are an expert e-commerce copywriter. Analyze the provided product and actor/model reference media (images and/or videos).
Generate a concise but detailed description with two parts:
1.  **Actor Details:** Describe the actor's characteristics (appearance, clothing, style).
2.  **Promotion Scenario:** Explain that this actor is showcasing or promoting the product shown in the product reference media.

This combined description will be used to ensure consistency in AI image generation. Output only the description text, without any preamble or markdown formatting like headers.`;

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const contents: any = { parts: [{ text: prompt }] };
    
    if (files.productFiles.length > 0) {
        contents.parts.push({ text: "--- PRODUCT REFERENCE MEDIA ---" });
        files.productFiles.forEach(file => {
            contents.parts.push({
                inlineData: { mimeType: file.mimeType, data: file.base64 }
            });
        });
    }

    if (files.actorFiles.length > 0) {
        contents.parts.push({ text: "--- ACTOR REFERENCE MEDIA ---" });
        files.actorFiles.forEach(file => {
            contents.parts.push({
                inlineData: { mimeType: file.mimeType, data: file.base64 }
            });
        });
    }

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
    });
    return response.text.trim();
};

// FIX: Removed failover logic and used direct API call with environment variable for API key.
export const generateAffiliateImagePrompts = async (
    state: AffiliateCreatorState
): Promise<string[]> => {
    const vibe = state.vibe === 'custom' ? state.customVibe : state.vibe.replace(/_/g, ' ');
    const modelInfo = state.actorReferenceFiles.length > 0
        ? 'The images must feature the specific actor/model from the provided reference media (images/videos).'
        : (state.model === 'none' 
            ? 'The images should focus exclusively on the product, with no human models present.'
            : `The images should feature a generic ${state.model} model interacting with or showcasing the product.`);
            
    const productDescriptionInfo = state.productDescription 
        ? `\n- **Product Description:** ${state.productDescription}` 
        : '';

    const speechStyle = state.speechStyle === 'custom' ? state.customSpeechStyle : state.speechStyle.replace(/_/g, ' ');

    const prompt = `
You are a creative director for viral e-commerce and affiliate marketing content.
Your task is to generate a series of distinct, high-quality image prompts based on a product and an actor.

**Creative Brief:**
- **Product:** Analyze the provided product reference media (image(s) and/or video(s)).${productDescriptionInfo}
- **Actor/Model:** ${modelInfo}
- **Number of Images:** ${state.numberOfImages}
- **Content Vibe:** ${vibe}
- **Actor's Expression & Style:** The actor should have a **${speechStyle}** expression and demeanor. This should be reflected in their pose, facial expression, and interaction with the product.

**Task:**
Generate a JSON array of exactly ${state.numberOfImages} unique string prompts. Each prompt must describe a different scene, angle, or interaction featuring the actor and the product that fits the vibe. The prompts should be detailed enough for an image generation AI to create visually appealing and diverse results that are still thematically consistent. The actor's expression MUST match the requested style: **${speechStyle}**.

Example Prompts for a floral dress with a specific actor:
- "A full-body shot of the specified actor wearing the floral dress, walking through a minimalist studio with soft, natural light."
- "A close-up shot focusing on the texture and floral pattern of the dress, with the actor's hand gently touching the fabric."
- "A lifestyle shot of the specified actor laughing while sitting at an aesthetic cafe, the dress draped elegantly."

Output ONLY the valid JSON array of prompts.
`;
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const contents: any = { parts: [{ text: prompt }] };
    
    if (state.productReferenceFiles.length > 0) {
        contents.parts.push({ text: "--- PRODUCT REFERENCE MEDIA ---" });
        state.productReferenceFiles.forEach(file => {
            contents.parts.push({
                inlineData: { mimeType: file.mimeType, data: file.base64 }
            });
        });
    }

    if (state.actorReferenceFiles.length > 0) {
        contents.parts.push({ text: "--- ACTOR REFERENCE MEDIA ---" });
        state.actorReferenceFiles.forEach(file => {
            contents.parts.push({
                inlineData: { mimeType: file.mimeType, data: file.base64 }
            });
        });
    }

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: { responseMimeType: 'application/json' }
    });
    const resultText = response.text;
    try {
        return JSON.parse(resultText);
    } catch (e) {
        console.error("Failed to parse affiliate prompts JSON:", resultText);
        throw new Error("The AI returned an invalid prompt list format.");
    }
};

// FIX: Removed failover logic and used direct API call with environment variable for API key.
export const generateAffiliateImages = async (
    prompt: string,
    aspectRatio: AffiliateCreatorState['aspectRatio'],
    referenceFiles: StoredReferenceFile[]
): Promise<{ base64: string, mimeType: string, prompt: string }> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const augmentedPrompt = `Using the provided reference images of a product and a model, generate a new image based on the following scene description. Maintain the appearance of the product and model from the references. The desired aspect ratio for the new image is ${aspectRatio}. Scene: commercial product photography, affiliate marketing style, vibrant, high detail, cinematic lighting, ${prompt}`;

    const parts: any[] = [{ text: augmentedPrompt }];
    referenceFiles.forEach(file => {
        parts.push({
            inlineData: {
                data: file.base64,
                mimeType: file.mimeType,
            }
        });
    });

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: parts,
        },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    let base64ImageBytes: string | undefined;
    let mimeType: string = 'image/jpeg';

    const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);

    if (imagePart && imagePart.inlineData) {
        base64ImageBytes = imagePart.inlineData.data;
        mimeType = imagePart.inlineData.mimeType;
    }

    if (!base64ImageBytes) {
        const textResponse = response.text?.trim();
        if (textResponse) {
             throw new Error(`Affiliate image generation failed. The model returned text instead of an image: ${textResponse}`);
        }
        throw new Error("Affiliate image generation failed. The model did not return an image.");
    }
    
    return { base64: base64ImageBytes, mimeType, prompt: prompt };
};

const generateAffiliateVideoPromptSchema = () => ({
    type: Type.OBJECT,
    properties: {
        "STYLE": { type: Type.STRING, description: "Professional product photography, hyper-realistic, macro, high detail, cinematic lighting" },
        "SUBJECT": {
            type: Type.OBJECT,
            properties: {
                "Character ID": { type: Type.STRING, description: "A unique identifier for the character/subject in the scene." },
                "Consistency Key": { type: Type.STRING, description: "A token for maintaining visual consistency." },
                "Description": { type: Type.STRING, description: "A detailed description of the subject." },
                "Physical Evidence": {
                    type: Type.OBJECT,
                    properties: {
                        "Micro-dust": { type: Type.STRING },
                        "Subtle Scratches": { type: Type.STRING },
                        "Authentic Dirt/Wear": { type: Type.STRING }
                    },
                    required: ["Micro-dust", "Subtle Scratches", "Authentic Dirt/Wear"]
                }
            },
            required: ["Character ID", "Consistency Key", "Description", "Physical Evidence"]
        },
        "ENVIRONMENT": { type: Type.STRING, description: "A detailed description of the environment and background." },
        "COMPOSITION": { type: Type.STRING, description: "A detailed description of the composition and camera perspective." },
        "LIGHTING": {
            type: Type.OBJECT,
            properties: {
                "Key Light": { type: Type.STRING },
                "Fill Light": { type: Type.STRING },
                "Rim Light/Backlight": { type: Type.STRING },
                "Qualities": { type: Type.STRING },
                "Atmosphere": { type: Type.STRING }
            },
            required: ["Key Light", "Fill Light", "Rim Light/Backlight", "Qualities", "Atmosphere"]
        },
        "NEGATIVE_PROMPT": { type: Type.STRING, description: "A comma-separated list of negative keywords." },
        "NARRATION_SCRIPT": {
            type: Type.OBJECT,
            properties: {
                "INSTRUCTION": { type: Type.STRING, description: "Instructions for the voice-over artist." },
                "NARRATION": { type: Type.STRING, description: "The narration script itself." }
            },
            required: ["INSTRUCTION", "NARRATION"]
        },
        "AUDIO_MIXING_GUIDE": {
            type: Type.OBJECT,
            properties: {
                "MIXING": { type: Type.STRING, description: "Instructions for audio mixing." }
            },
            required: ["MIXING"]
        }
    },
    required: ["STYLE", "SUBJECT", "ENVIRONMENT", "COMPOSITION", "LIGHTING", "NEGATIVE_PROMPT", "NARRATION_SCRIPT", "AUDIO_MIXING_GUIDE"]
});


// FIX: Removed failover logic and used direct API call with environment variable for API key.
export const generateAffiliateVideoPrompt = async (
    image: GeneratedAffiliateImage,
    settings: {
        narratorLanguage: string;
        customNarratorLanguage: string;
        aspectRatio: string;
        vibe: string;
        customVibe: string;
        speechStyle: string;
        customSpeechStyle: string;
    },
    promptType: VideoPromptType,
    isSingleImage: boolean,
    previousNarration?: string
): Promise<string> => {
    let narrationInstruction: string;
    let promptTask: string;
    let previousNarrationContext = "";
    
    const finalVibe = settings.vibe === 'custom' ? settings.customVibe : settings.vibe.replace(/_/g, ' ');
    
    let langName: string;
    const langCode = settings.narratorLanguage;
    if (langCode === 'custom') {
        langName = settings.customNarratorLanguage;
    } else {
        langName = languageMap[langCode as keyof typeof languageMap] || langCode;
    }
    const finalLang = langName;
    const finalSpeechStyle = settings.speechStyle === 'custom'
        ? settings.customSpeechStyle
        : settings.speechStyle.replace(/_/g, ' ');
    
    const baseNarrationInstruction = `The script must focus on describing the product from the reference image in detail. It should be written in **${finalLang}**. The voice-over style should be very **${finalSpeechStyle}**. CRITICAL: THE NARRATION MUST NOT EXCEED 8 SECONDS IN DURATION.`;

    if (promptType === 'hook' && isSingleImage) {
        narrationInstruction = `${baseNarrationInstruction} It should be a complete, self-contained script for a single 8-second video, starting with a compelling HOOK that introduces the product, and ending with a clear Call-To-Action (CTA).`;
        promptTask = `Analyze the image and generate a concept for a SINGLE, complete 8-second video ad that details the product.`;
    } else {
        switch (promptType) {
            case 'hook':
                narrationInstruction = `${baseNarrationInstruction} It MUST be a compelling HOOK that grabs the viewer's attention by introducing a key feature or benefit of the product.`;
                promptTask = `This is the FIRST scene of a video ad. Generate a concept for a captivating opening that highlights the product.`;
                break;
            case 'continuation':
                previousNarrationContext = `The previous scene's narration was: "${previousNarration}".`;
                narrationInstruction = `${baseNarrationInstruction} It MUST be a direct continuation of the previous narration, elaborating on another feature or benefit of the product to create a seamless story.`;
                promptTask = `This is a MIDDLE scene of a video ad. Generate a concept that connects logically to the previous one by detailing another aspect of the product.`;
                break;
            case 'closing':
                previousNarrationContext = `The previous scene's narration was: "${previousNarration}".`;
                narrationInstruction = `${baseNarrationInstruction} It MUST be a powerful CLOSING that summarizes the product's value and includes a clear Call-To-Action (CTA) like 'buy now' or 'click the link in the bio'. It must follow the previous narration.`;
                promptTask = `This is the FINAL scene of a video ad. Generate a concept that provides a strong conclusion about the product and a call to action.`;
                break;
        }
    }
    
    const prompt = `
You are a master creative director and prompt engineer for hyper-realistic, short-form video ads. Your task is to analyze an image and generate a comprehensive, structured JSON prompt for a text-to-video AI.

**CRITICAL INSTRUCTION ON LANGUAGE:**
All keys and string values in the JSON output MUST be in **English**, with ONE EXCEPTION:
The value for the \`NARRATION_SCRIPT.NARRATION\` field MUST be written in the target language: **${finalLang}**.

**CREATIVE BRIEF:**
- **Primary Goal:** The primary objective is to create a compelling narration that describes the product shown in the reference image in detail. The script should highlight its features, benefits, or unique selling points in a way that is engaging and persuasive.
- **Task:** ${promptTask}
- **Scene Type:** ${promptType}
- **Content Vibe:** ${finalVibe}
- **Speech Style:** ${finalSpeechStyle}
- **Video Aspect Ratio:** ${settings.aspectRatio}
- **Context:** ${previousNarrationContext || "This is the first scene."}

**JSON FIELD INSTRUCTIONS:**
- **STYLE, SUBJECT, ENVIRONMENT, COMPOSITION, LIGHTING, NEGATIVE_PROMPT, AUDIO_MIXING_GUIDE:** Fill these fields with creative and professional descriptions in **English**.
- **SUBJECT:** Analyze the image to describe the subject. Invent a creative "Character ID" and a "Consistency Key".
- **NARRATION SCRIPT:** This object contains two fields.
    - \`INSTRUCTION\`: Write this in **English**. It should give instructions to a voice-over artist to deliver the narration in a **${finalSpeechStyle}** tone.
    - \`NARRATION\`: This is the script to be spoken. You MUST follow this specific instruction: "${narrationInstruction}"

Output ONLY the raw JSON object, with no markdown, comments, or explanations.
`;

    const schema = generateAffiliateVideoPromptSchema();

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const contents = {
        parts: [
            { text: prompt },
            { inlineData: { mimeType: image.mimeType, data: image.base64 } }
        ]
    };
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: { 
            responseMimeType: 'application/json',
            responseSchema: schema
        }
    });
    const resultText = response.text;
    if (!resultText || resultText.trim() === '') {
        throw new Error("The AI returned an empty response. This might be due to a content filter or an issue with the prompt.");
    }

    try {
        JSON.parse(resultText); // Validate it's JSON
        return resultText;
    } catch (e) {
        console.error("Failed to parse affiliate video prompt JSON:", resultText);
        throw new Error("The AI returned an invalid video prompt format. Raw response: " + resultText);
    }
};

// --- Speech Generator Service Functions ---
export const generateStyleSuggestions = async (scriptText: string): Promise<string[]> => {
    const prompt = `
You are a voice director AI. Analyze the following script text. Based on its content, tone, and potential context (e.g., advertisement, storytelling, documentary, religious text), generate a JSON array of 10 diverse and relevant 'style instructions' for a text-to-speech engine. The instructions should be concise and descriptive.

**Script Text:**
"${scriptText}"

**Task:**
Return a valid JSON array containing exactly 10 string values for the style instructions.
Example output: ["Read in a cheerful and enthusiastic tone", "Recite with a solemn and reverent voice"]

Output ONLY the valid JSON array.
`;

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
            }
        }
    });
    const resultText = response.text;
    try {
        const suggestions = JSON.parse(resultText);
        // Ensure it's an array of strings
        if (Array.isArray(suggestions) && suggestions.every(item => typeof item === 'string')) {
            return suggestions;
        }
        throw new Error("AI returned data in an unexpected format.");
    } catch (e) {
        console.error("Failed to parse style suggestions JSON:", resultText);
        throw new Error("The AI returned an invalid style suggestion format.");
    }
};