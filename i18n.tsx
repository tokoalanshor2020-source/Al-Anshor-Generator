import React, { createContext, useState, useContext, useEffect, useCallback, PropsWithChildren } from 'react';

const LANGUAGE_STORAGE_key = 'veo-app-language';

export type Language = 'en' | 'id' | 'es' | 'zh' | 'hi' | 'ar' | 'pt' | 'bn' | 'ru' | 'ja' | 'de' | 'fr';
type Translations = { [key: string]: string | string[] | Translations };

export const languageMap: { [key in Language]: string } = {
  en: 'English',
  id: 'Bahasa Indonesia',
  es: 'Español',
  zh: '中文 (简体)',
  hi: 'हिन्दी',
  ar: 'العربية',
  pt: 'Português',
  bn: 'বাংলা',
  ru: 'Русский',
  ja: '日本語',
  de: 'Deutsch',
  fr: 'Français',
};

// --- Helper for deep merging translations ---
function isObject(item: any): item is { [key: string]: any } {
    return (item && typeof item === 'object' && !Array.isArray(item));
}

function mergeDeep(target: any, ...sources: any[]): any {
    if (!sources.length) {
        return target;
    }
    const source = sources.shift();

    if (isObject(target) && isObject(source)) {
        for (const key in source) {
            if (isObject(source[key])) {
                if (!target[key]) {
                    Object.assign(target, { [key]: {} });
                }
                mergeDeep(target[key], source[key]);
            } else {
                Object.assign(target, { [key]: source[key] });
            }
        }
    }
    return mergeDeep(target, ...sources);
}


const enTranslations: Translations = {
    appName: "AL ANSHOR GENERATOR",
    appTagline: "Generate stunning videos from text or images.",
    manageStoryApiKeys: "Story API Key",
    manageVideoApiKeys: "Video & Thumbnail API Key",
    settingsButton: "Settings",
    tutorialButton: "Tutorial",
    promptLabel: "Prompt",
    promptPlaceholder: "A majestic lion overlooking the savanna at sunset...",
    audioPromptPlaceholder: "Provide narration script or sound instructions here...",
    noAudioPrompt: "No audio prompt provided.",
    promptHint: "You can use plain text or a JSON formatted string.",
    referenceImageLabel: "Reference Image (Optional)",
    uploadFile: "Upload a file",
    dragAndDrop: "or drag and drop",
    fileTypes: "PNG, JPG, GIF up to 10MB",
    generationSettings: "Generation Settings",
    aspectRatioLabel: "Aspect Ratio",
    soundLabel: "Sound",
    enableSound: "Enable sound",
    resolutionLabel: "Resolution",
    videoKeyMissingWarning: "Please add a professional Video API Key to begin.",
    generateButton: "Generate Video",
    generatingButton: "Generating Video...",
    loaderTitle: "Generating Your Video",
    loadingMessages: [ "Initializing VEO model...", "Analyzing your prompt...", "Composing the main scene...", "Generating initial frames...", "Rendering video sequence... this may take a few minutes.", "Upscaling to high resolution...", "Adding sound and final touches...", "Almost there, preparing the final video file." ],
    playerTitle: "Generation Complete!",
    downloadButton: "Download Video",
    storyApiKeyManagerTitle: "Story API Key",
    videoApiKeyManagerTitle: "Professional Video & Thumbnail API Key",
    addNewStoryKeyLabel: "Add New Story API Key",
    addNewVideoKeyLabel: "Add New Professional Video & Thumbnail API Key",
    apiKeyInputPlaceholder: "Enter your Gemini API Key",
    addKeyButton: "Add Key",
    validatingButton: "Validating...",
    savedStoryKeysLabel: "Saved Story Keys",
    savedVideoKeysLabel: "Saved Professional Video & Thumbnail Keys",
    noKeysSaved: "No API Keys saved.",
    addKeyPrompt: "Add a key above to get started.",
    closeButton: "Close",
    errorKeyEmpty: "API Key cannot be empty.",
    errorKeyExists: "This API Key has already been added.",
    errorKeyInvalid: "Invalid API Key or network issue. Please check the key and try again.",
    generationFailed: "Generation Failed",
    errorRateLimit: "The service is currently busy due to high demand. Please wait a moment and try again.",
    alertEnterPrompt: "Please enter a prompt.",
    alertSetStoryApiKey: "Please set an active Story API Key before generating.",
    alertSetVideoApiKey: "Please set an active Professional Video & Thumbnail API key before generating.",
    alertSetVideoThumbnailApiKey: "Please set an active Video & Thumbnail API key before generating a thumbnail.",
    backToStoryboard: "Back to Storyboard",
    backToAffiliateCreator: "Back to Affiliate Creator",
    backToReferenceAnalyzer: "Back to Reference Analyzer",
    backToEditor: "Back to Editor",
    confirmButton: "OK",
    revalidateAllButton: "Re-validate All",
    apiKeyStatuses: {
      valid: "VALID",
      invalid: "INVALID",
      checking: "CHECKING...",
      unchecked: "UNCHECKED"
    },
    publishingKit: {
      copyButton: "Copy",
      copiedButton: "Copied!",
      aspectRatioLabel: "Aspect Ratio:",
      generateThumbnailButton: "Generate Thumbnail",
      generatingThumbnailButton: "Generating...",
      downloadButton: "Download",
      thumbnailIdea: "Thumbnail Idea",
      simpleImagePrompt: "Simple Image Prompt",
      advancedJsonPrompt: "Advanced JSON Prompt",
      promptSource: "Prompt Source",
      promptSourceSimple: "Simple Prompt",
      promptSourceAdvanced: "Advanced JSON Prompt",
      targetLanguageRegion: "Target Language & Region",
      generatingAssetsFor: "Generating assets for",
      errorJsonParse: "Error: Could not parse JSON from AI.",
      errorCaptionMissing: "Could not find text for thumbnail overlay.",
      errorConceptMissing: "Thumbnail concept not found.",
      errorPromptEmpty: "Selected prompt source is empty."
    },
    videoGenerator: {
      referenceImageGeneratorTitle: "Create Reference Image (Optional)",
      referenceImageGeneratorDescription: "This will use the main prompt above to generate an image.",
      generateImageButton: "Generate Image",
      generatingImageButton: "Generating...",
      addImageButton: "Add to References",
      combinedPromptLabel: "Combined Prompt (Visuals & Audio)",
      videoPromptLabel: "Video Prompt (Visuals)",
      audioPromptLabel: "Audio Prompt (Narration & Sound)",
    },
    tutorial: {
        title: "Application Tutorial",
        textTutorial: "Text Tutorial",
        videoTutorial: "Video Tutorial",
        intro: "Welcome to the AL ANSHOR GENERATOR! This guide will walk you through the main creative workflows to create amazing videos, affiliate content, and realistic narrations.",
        workflow1: {
            title: "Workflow 1: Story Creator (Script to Video)",
            intro: "Use this workflow to create narrative-driven videos from a script idea.",
            step1: "<strong>Step 1: The Editor Tab.</strong> Start by writing a 'Story Title' and 'Story Script'. Use the 'Smart Director' for AI-powered ideas. Define characters in the 'Character Garage' for consistency and set the mood in the 'Directing Desk'. When ready, click 'Create Storyboard!'",
            step2: "<strong>Step 2: The Storyboard Tab.</strong> Here, your story is broken into scenes. For each scene, click 'Design Blueprint' and then 'Create Cinematic Prompt' to generate detailed instructions for the AI. Once satisfied, click 'Generate Video with this Prompt' to move to the next stage.",
            step3: "<strong>Step 3: The Video Generator.</strong> You are now in the Video Generator. The prompt from the storyboard is pre-filled. You can add a reference image, adjust settings like aspect ratio, and then click 'Generate Video'. This process can take several minutes.",
            step4: "<strong>Step 4: The Publishing Kit.</strong> After generating your video(s), return to the Story Creator. Use the 'Metadata Generator' in the sidebar to create YouTube titles, descriptions, and tags. Then, switch to the 'Publishing Kit' tab to generate and download stunning thumbnails for your content."
        },
        workflow2: {
            title: "Workflow 2: Idea from Reference",
            intro: "Use this workflow to generate a video concept by analyzing existing images or short video clips.",
            step1: "<strong>Step 1: Analyze.</strong> In the 'Editor' tab, click 'Analyze References'. Upload your media files (images or videos up to 10s).",
            step2: "<strong>Step 2: Generate.</strong> Click 'Analyze & Generate Prompts'. The AI will provide two options: a 'Simple Cinematic Prompt' and a 'Detailed JSON Prompt'.",
            step3: "<strong>Step 3: Create.</strong> Choose the prompt you like and click the corresponding 'Generate Video' button. This will take you directly to the Video Generator with the prompt ready to go."
        },
        workflow3: {
            title: "Workflow 3: Affiliate Video Creator",
            intro: "This specialized tool is perfect for creating consistent, high-quality product showcase videos, with or without a model.",
            step1: "<strong>Step 1: Open the Tool.</strong> In the 'Editor' tab, click 'Create Affiliate Video'.",
            step2: "<strong>Step 2: Upload Media.</strong> Upload your product images/videos. Optionally, upload reference media for a specific actor/model you want to feature.",
            step3: "<strong>Step 3: Configure Settings.</strong> Use the 'Auto-generate Description' or write your own to guide the AI. Choose your content vibe, model preference, aspect ratio, and the number of images to create. Then, click 'Generate Image Sequence'.",
            step4: "<strong>Step 4: Finalize & Generate Video.</strong> The AI will generate a set of consistent images. For each image, you can create a 'Video Prompt' (Hook, Continuation, or Closing). Once prompts are ready, you can either generate a video for a single image or generate all of them in sequence."
        },
        workflow4: {
            title: "Workflow 4: Speech Generator (Text-to-Speech)",
            intro: "Create professional-grade narrations and dialogues for your videos or stand-alone audio content.",
            step1: "<strong>Step 1: Open the Tool.</strong> In the 'Editor' tab, click 'Create Speech' to open the Speech Generator modal.",
            step2: "<strong>Step 2: Build Your Script.</strong> Write your text in the 'Script Builder'. For conversations, switch to 'Multi-speaker audio', define your speakers, and add dialogue boxes as needed. The 'Style Instructions' will dynamically suggest tones based on your text.",
            step3: "<strong>Step 3: Configure Voices.</strong> In the 'Run Settings', select a voice for each speaker. Click the speaker icon next to the voice selection to hear a preview.",
            step4: "<strong>Step 4: Generate Audio.</strong> Click 'Run' to generate the audio. An audio player will appear, allowing you to listen to the result and download it as a WAV file."
        },
        closeButton: "Got it, let's create!"
    },
    storyCreator: {
      newStory: "New Story",
      characterGarage: "Character Garage",
      garageDescription: "Register your favorite toys here to make them the main star!",
      openCharacterWorkshop: "Open Character Workshop",
      garageEmpty: "Your dream garage is empty.",
      directingDesk: "Directing Desk",
      deskDescription: "Additional settings for your story.",
      sceneSet: "Scene Set:",
      locationSet: "Main Location Set:",
      weatherSet: "Weather & Atmosphere Set:",
      cameraStyleSet: "Camera Style (POV):",
      narratorLanguageSet: "Narrator Language Set:",
      timeOfDay: "Time of Day:",
      artStyle: "Art Style / Visual Mood:",
      soundtrackMood: "Soundtrack Mood:",
      pacing: "Scene Pacing:",
      customSceneStylePlaceholder: "e.g., A funny cooking show scene",
      customLocationPlaceholder: "e.g., Giant Kitchen Diorama",
      customWeatherPlaceholder: "e.g., Magical aurora in the sky",
      customCameraStylePlaceholder: "e.g., Spy movie style tracking shot",
      customLanguagePlaceholder: "e.g., Sundanese",
      storyEditor: "Story Editor",
      storyboard: "Storyboard",
      publishingKit: "Publishing Kit",
      haveIdea: "Already Have a Story Idea?",
      ideaDescriptionDirect: "Go directly to the video generator to bring your idea to life!",
      openDirectVideo: "Create Video Directly",
      needIdea: "Need a Story Idea?",
      ideaDescription: "Use the Smart Director to create a ready-to-air script outline!",
      openSmartDirector: "Open Smart Director",
      ideaWithReference: "Create Idea With Reference",
      ideaWithReferenceDescription: "Upload videos or photos for the AI to analyze into a story idea and cinematic prompt.",
      openReferenceIdea: "Analyze References",
      createAffiliateVideo: "Create Affiliate Video",
      storyTitle: "Story Title:",
      storyTitlePlaceholder: "e.g., Rino the Red Racing Car and Goro the Brave Monster Truck",
      storyScript: "Story Script / Summary:",
      storyScriptPlaceholder: "Write a story summary or main idea here. The AI will develop it into professional scenes.",
      sceneCount: "Number of Scenes:",
      createStoryboard: "Create Storyboard!",
      storyboardPlaceholderTitle: "Your Story Results Will Appear Here",
      storyboardPlaceholderDescription: "Click 'Create Storyboard!' to begin.",
      scene: "Scene",
      cinematography: "Cinematography",
      soundEffects: "Sound Effects",
      noSfx: "No SFX suggestions.",
      mixingGuide: "Smart Mixing Guide",
      generateBlueprint: "Design Blueprint",
      generateCinematicPrompt: "Create Cinematic Prompt",
      useThisPrompt: "Generate Video with this Prompt",
      resultBlueprint: "Result: Blueprint Design",
      resultCinematic: "Result: Cinematic Prompt",
      error: "Error",
      confirmNewStoryTitle: "Start a New Story?",
      confirmNewStoryMessage: "All current progress will be deleted. Are you sure?",
      directingOptions: {
        sceneSet: { 
          standard_cinematic: "Standard Cinematic Adventure", 
          epic_destruction: "Epic Destruction (Slow-Motion)", 
          drifting_precision: "Drifting Precision Challenge",
          comedic_chase: "Comedic Chase Scene",
          tense_standoff: "Tense Standoff",
          mysterious_discovery: "Mysterious Discovery",
          custom_scene: "Type your own scene set..."
        },
        locationSet: { 
          standardLandGroup: "🏞️ Standard & Land Sets", 
          natural_outdoor: "Outdoors (Garden/Yard)", 
          kids_bedroom: "Kid's Bedroom",
          city_streets: "City Streets (Urban)",
          enchanted_forest: "Enchanted Forest",
          futuristic_lab: "Futuristic Lab",
          custom_location: "Type your own location..." 
        },
        weatherSet: { 
          sunny: "Bright Sunny", 
          cloudy: "Cloudy", 
          rainy: "Rainy with Thunder",
          misty_fog: "Misty Fog",
          magical_twilight: "Magical Twilight",
          post_apocalyptic_dust: "Post-Apocalyptic Dust",
          custom_weather: "Type your own atmosphere..."
        },
        cameraStyleSet: { 
          standardGroup: "🎥 Standard Styles", 
          standard_cinematic: "Standard Cinematic", 
          fpv_drone_dive: "FPV Drone Dive",
          handheld_shaky: "Handheld (Shaky Cam)",
          slow_dolly_zoom: "Slow Dolly Zoom (Vertigo)",
          stationary_asmr: "Stationary (ASMR/Relaxation)",
          custom_camera: "Type your own camera style..."
        },
        narratorLanguageSet: { 
          no_narrator: "Without Narrator", 
          id: "Indonesian", 
          en: "English", 
          es: "Spanish",
          zh: "Chinese (Mandarin)",
          hi: "Hindi",
          ar: "Arabic",
          pt: "Portuguese",
          ru: "Russian",
          ja: "Japanese",
          de: "German",
          fr: "French",
          custom_language: "Type your own language..."
        },
        timeOfDay: {
            default: "Default (Based on story)",
            golden_hour: "Golden Hour (Sunset)",
            midday: "Bright Midday",
            blue_hour: "Blue Hour (Twilight)",
            night: "Pitch Black Night"
        },
        artStyle: {
            hyper_realistic: "Hyper-realistic",
            vintage_film: "Vintage Film (80s look)",
            anime_inspired: "Anime Inspired",
            gritty_noir: "Gritty Noir",
            dreamlike_fantasy: "Dreamlike & Fantasy"
        },
        soundtrackMood: {
            none: "No Music (Ambience Only)",
            epic_orchestral: "Epic Orchestral",
            tense_suspenseful: "Tense & Suspenseful",
            upbeat_cheerful: "Upbeat & Cheerful",
            lofi_relaxing: "Lo-fi & Relaxing"
        },
        pacing: {
            normal: "Normal Pace",
            slow_deliberate: "Very Slow (Deliberate)",
            fast_action: "Fast-Paced (Action)",
            frenetic_chaotic: "Frenetic (Chaotic)"
        }
      },
       publishingKitSection: {
        title: "Metadata Generator",
        description: "The story is ready! Now, create all the assets for uploading to YouTube with one click.",
        generateButton: "Create Everything!",
        generatingButton: "Creating...",
        apiKeyInstruction: "Please ensure both Story and Video & Thumbnail API Keys are set to proceed."
      },
    },
    characterWorkshop: {
        title: "Character Workshop",
        subtitle: "Create a new digital twin for your toy or edit an existing one.",
        aiAssistantSection: "AI Assistant",
        aiAssistantDescription: "No time to type? Upload reference images or videos, describe an idea, then click 'Design with AI' to auto-fill the details.",
        uploadButton: "Add References",
        fileTypes: "Images & Videos (10s max, 25MB)",
        ideaPlaceholder: "Describe your toy or provide extra details...",
        designWithAiButton: "✨ Design with AI",
        designingWithAiButton: "Designing...",
        modelDetailsSection: "Model Details (Identity & Character)",
        brandName: "Fictional Brand Name:",
        modelName: "Specific Model Name:",
        consistencyId: "Consistency ID (Unique Token):",
        consistencyIdHint: "A unique ID used in prompts to maintain character consistency.",
        mainMaterial: "Main Material:",
        designLanguage: "Brand Design Language:",
        keyFeatures: "Key Features (Visual DNA):",
        keyFeaturesPlaceholder: "Add a feature & press Enter...",
        actionDnaSection: "Action DNA",
        actionDnaDescription: "What can this character do? (e.g., 'jumps high', 'drifts smoothly')",
        actionDnaPlaceholder: "Add an action & press Enter...",
        characterPersonality: "Character Personality:",
        personalityPlaceholder: "Describe traits, e.g., cheerful, brave, grumpy...",
        physicalDetails: "Nuanced Physical Details:",
        physicalDetailsPlaceholder: "e.g., Slightly worn paint on left fender, glowing blue eyes...",
        scaleAndSize: "Scale & Size:",
        scaleAndSizePlaceholder: "e.g., 1:64 scale, palm-sized, as big as a cat...",
        saveButton: "Save Character",
        updateButton: "Update Character",
        alertUploadOrDescribe: "Please upload at least one image/video or describe your toy to use the AI Assistant.",
        alertRequiredFields: "Brand Name, Model Name, and Consistency ID are required to save."
    },
    smartDirector: {
      title: "Smart Director",
      step1Description: "Let's create a ready-to-air script outline! Follow these easy steps.",
      step1Label: "Step 1: Choose Content Format",
      step2Label: "Step 2: Choose Main Character",
      step3Label: "Step 3: Choose Story Theme",
      generateIdeasButton: "Give me 3 Ideas!",
      generatingIdeasButton: "Thinking...",
      step2Title: "Choose Your Favorite Script Idea!",
      step3Title: "Finalize Your Story",
      tryAgainButton: "↻ Request New Ideas",
      applyIdeaButton: "✅ Use This Idea!",
      cancelButton: "Cancel",
      contentFormats: {
        cinematic_adventure: "Cinematic Adventure & Story",
        product_review: "Product Review",
        unboxing: "Unboxing & First Impressions",
        vs_challenge: "Comparison Video (VS Challenge)",
        asmr: "ASMR",
        tutorial: "Tutorial / How-to",
        educational: "Educational / Informative",
        vlog: "Day in the Life / Vlog",
        top_list: "Top 10 / List",
        challenge: "Challenge Video",
        myth_busting: "Myth Busting",
        custom_format: "Type your own format...",
      },
      customFormatPlaceholder: "e.g., Stop Motion Cooking",
      characterOptions: {
        random: "Choose Randomly",
        yourGarage: "🚗 Your Garage",
      },
      themeOptions: {
        placeholder_loading: "Getting AI suggestions...",
        placeholder_select: "First, select a format and character...",
        custom_theme: "Type your own theme...",
      },
      customThemePlaceholder: "e.g., Racing on Planet Mars"
    },
     referenceIdeaModal: {
      title: "Create Idea from Reference",
      description: "Upload one or more reference images or videos. The AI will analyze them to generate a detailed cinematic prompt.",
      uploadArea: "Upload files",
      analyzeButton: "Analyze & Generate Prompts",
      analyzingButton: "Analyzing...",
      resultsTitle: "AI Analysis Results",
      simplePromptLabel: "Simple Cinematic Prompt",
      jsonPromptLabel: "Detailed JSON Prompt",
      useSimplePromptButton: "Generate Video with Simple Prompt",
      useJsonPromptButton: "Generate Video with JSON Prompt",
      placeholder: "Upload reference media and click 'Analyze' to see results here."
    },
    photoStyleCreator: {
      title: "Photo Style Creator",
      description: "Generate a series of stylized photos based on your image.",
      buttonText: "Create Photo Style",
      yourPhoto: "1. Your Photo (Required)",
      productPhoto: "2. Product Photo (Optional)",
      facialExpression: "3. Facial Expression",
      handGesture: "4. Hand Gesture",
      bodyPose: "5. Body Pose",
      pose: "6. Pose",
      backgroundColor: "7. Background Color",
      numberOfImages: "8. Number of Images",
      aspectRatio: "9. Aspect Ratio",
      generate: "Generate",
      generating: "Generating...",
      readyText: "Your photobooth is ready",
      readySubtext: "Adjust the controls on the left and click 'Generate' to see the magic happen.",
      uploadPlaceholder: "Upload a file or drag and drop",
      uploadSubtitle: "PNG, JPG, WEBP up to 10MB",
      noProductPlaceholder: "No Product",
      noProductSubtext: "Drag a product photo here",
      expressions: {
          surprised: "Surprised",
          happy: "Happy",
          sad: "Sad"
      },
      gestures: {
          pointing: "Pointing",
          waving: "Waving",
          thumbs_up: "Thumbs Up"
      },
      bodyPoses: {
          standing: "Standing",
          sitting: "Sitting",
          walking: "Walking"
      },
      poses: {
          relaxed: "Relaxed",
          formal: "Formal",
          dynamic: "Dynamic"
      },
      errorNoPhoto: "Please upload your photo to generate images."
  },
    affiliateCreator: {
        title: "Affiliate Video Creator",
        description: "Generate a consistent set of images for your affiliate content.",
        uploadSectionTitle: "1. Upload Product",
        uploadActorSectionTitle: "2. Upload Actor",
        settingsSectionTitle: "3. Generation Settings",
        numberOfImages: "Number of Images to Generate",
        generateButton: "Generate Image Sequence",
        generatingButton: "Generating...",
        resultsSectionTitle: "4. Generated Images",
        resultsPlaceholder: "Your generated images will appear here.",
        regenerate: "Regenerate",
        replace: "Replace",
        upload: "Upload",
        download: "Download",
        modelSectionTitle: "2. Choose Model",
        modelWoman: "Woman",
        modelMan: "Man",
        modelNone: "Without Model",
        vibeSectionTitle: "3. Choose Content Vibe",
        customVibePlaceholder: "Describe your custom vibe...",
        productDescriptionPlaceholder: "Optional: Describe your product for better consistency (e.g., 'terracotta cotton long-sleeve shirt').",
        generateDescriptionButton: "✨ Auto-generate Description",
        aspectRatio: "Aspect Ratio",
        narratorLanguage: "Narrator Language",
        customNarratorLanguagePlaceholder: "e.g., Sundanese",
        speechStyle: "Speech Style & Expression",
        customSpeechStylePlaceholder: "e.g., Calm and reassuring",
        speechStyles: {
            joyful: "Joyful & Enthusiastic",
            humorous: "Humorous & Witty",
            serious: "Serious & Professional",
            inspirational: "Inspirational & Motivational",
            casual: "Casual & Friendly",
            custom: "Custom...",
        },
        generateVideoPrompt: "Generate Video Prompt",
        promptHook: "Hook Prompt",
        promptContinuation: "Continuation Prompt",
        promptClosing: "Closing Prompt",
        copyPromptTooltip: "Copy Video Prompt",
        copiedTooltip: "Copied!",
        vibes: {
            cafe_aesthetic: "Cafe Aesthetic",
            urban_night: "Urban Style (Night)",
            tropical_beach: "Tropical Beach",
            luxury_apartment: "Luxury Apartment",
            flower_garden: "Flower Garden",
            old_building: "Old Building",
            classic_library: "Classic Library",
            minimalist_studio: "Minimalist Studio",
            rooftop_bar: "Rooftop Bar",
            autumn_park: "Autumn Park",
            tokyo_street: "Tokyo Street",
            scandinavian_interior: "Scandinavian Interior",
            custom: "Custom...",
        }
    },
    speechGenerator: {
      title: "Speech Generator",
      description: "Create realistic dialog and narration.",
      openButton: "Create Speech",
      scriptBuilder: "Script Builder",
      runSettings: "Run Settings",
      styleInstructions: "Style Instructions",
      stylePlaceholder: "e.g., Read aloud in a warm, welcoming tone",
      addDialog: "Add Dialog",
      mode: "Mode",
      singleSpeaker: "Single-speaker audio",
      multiSpeaker: "Multi-speaker audio",
      voiceSettings: "Voice Settings",
      speakerSettings: "Speaker {num} Settings",
      name: "Name",
      voice: "Voice",
      run: "Run",
      generating: "Generating...",
      audioOutput: "Audio Output",
      downloadAsWav: "Download as WAV",
      preview: "Preview",
      previewing: "Previewing...",
      previewSampleText: "Hello, you can listen to my voice with this preview.",
      generatingSuggestions: "Generating suggestions...",
      styleDefault: "Default",
      styleCustom: "Custom...",
      voices: {
        'Zephyr': 'Zephyr (Female)',
        'Puck': 'Puck (Male)',
        'Kore': 'Kore (Female)',
        'Charon': 'Charon (Male)',
        'Fenrir': 'Fenrir (Male)',
        'Echo': 'Echo (Female)',
        'Dasher': 'Dasher (Male)',
        'Comet': 'Comet (Male)',
        'Luna': 'Luna (Female)',
        'Nova': 'Nova (Female)',
        'Lyra': 'Lyra (Female)'
      }
    }
  };

const idTranslations: Translations = mergeDeep(JSON.parse(JSON.stringify(enTranslations)), {
    appTagline: "Hasilkan video menakjubkan dari teks atau gambar.",
    manageStoryApiKeys: "Kunci API Cerita",
    manageVideoApiKeys: "Kunci API Video & Thumbnail",
    settingsButton: "Pengaturan",
    tutorialButton: "Tutorial",
    promptLabel: "Prompt",
    promptPlaceholder: "Seekor singa agung memandangi sabana saat matahari terbenam...",
    audioPromptPlaceholder: "Berikan naskah narasi atau instruksi suara di sini...",
    noAudioPrompt: "Tidak ada prompt audio yang diberikan.",
    promptHint: "Anda bisa menggunakan teks biasa atau string format JSON.",
    referenceImageLabel: "Gambar Referensi (Opsional)",
    uploadFile: "Unggah file",
    dragAndDrop: "atau seret dan lepas",
    fileTypes: "PNG, JPG, GIF hingga 10MB",
    generationSettings: "Pengaturan Generasi",
    aspectRatioLabel: "Rasio Aspek",
    soundLabel: "Suara",
    enableSound: "Aktifkan suara",
    resolutionLabel: "Resolusi",
    videoKeyMissingWarning: "Silakan tambah Kunci API Video profesional untuk memulai.",
    generateButton: "Hasilkan Video",
    generatingButton: "Menghasilkan Video...",
    loaderTitle: "Menghasilkan Video Anda",
    loadingMessages: [ "Menginisialisasi model VEO...", "Menganalisisis prompt Anda...", "Menyusun adegan utama...", "Menghasilkan bingkai awal...", "Merender urutan video... ini mungkin memakan waktu beberapa menit.", "Meningkatkan skala ke resolusi tinggi...", "Menambahkan suara dan sentuhan akhir...", "Hampir selesai, menyiapkan file video akhir." ],
    playerTitle: "Pembuatan Selesai!",
    downloadButton: "Unduh Video",
    storyApiKeyManagerTitle: "Kunci API Cerita",
    videoApiKeyManagerTitle: "Kunci API Video & Thumbnail Profesional",
    addNewStoryKeyLabel: "Tambah Kunci API Cerita Baru",
    addNewVideoKeyLabel: "Tambah Kunci API Video & Thumbnail Profesional Baru",
    apiKeyInputPlaceholder: "Masukkan Kunci API Gemini Anda",
    addKeyButton: "Tambah Kunci",
    validatingButton: "Memvalidasi...",
    savedStoryKeysLabel: "Kunci Cerita Tersimpan",
    savedVideoKeysLabel: "Kunci Video & Thumbnail Profesional Tersimpan",
    noKeysSaved: "Tidak ada Kunci API yang tersimpan.",
    addKeyPrompt: "Tambahkan kunci di atas untuk memulai.",
    closeButton: "Tutup",
    errorKeyEmpty: "Kunci API tidak boleh kosong.",
    errorKeyExists: "Kunci API ini sudah ditambahkan.",
    errorKeyInvalid: "Kunci API tidak valid atau masalah jaringan. Harap periksa kunci dan coba lagi.",
    generationFailed: "Pembuatan Gagal",
    errorRateLimit: "Layanan sedang sibuk karena permintaan tinggi. Harap tunggu sejenak dan coba lagi.",
    alertEnterPrompt: "Silakan masukkan prompt.",
    alertSetStoryApiKey: "Silakan atur Kunci API Cerita yang aktif sebelum melanjutkan.",
    alertSetVideoApiKey: "Silakan atur Kunci API Video & Thumbnail Profesional yang aktif sebelum membuat video.",
    alertSetVideoThumbnailApiKey: "Silakan atur Kunci API Video & Thumbnail yang aktif sebelum membuat thumbnail.",
    backToStoryboard: "Kembali ke Papan Cerita",
    backToAffiliateCreator: "Kembali ke Pembuat Afiliasi",
    backToReferenceAnalyzer: "Kembali ke Penganalisa Referensi",
    backToEditor: "Kembali ke Editor",
    confirmButton: "OKE",
    revalidateAllButton: "Validasi Ulang Semua",
    apiKeyStatuses: {
      valid: "VALID",
      invalid: "TIDAK VALID",
      checking: "MEMERIKSA...",
      unchecked: "BELUM DICEK"
    },
    publishingKit: {
      copyButton: "Salin",
      copiedButton: "Tersalin!",
      aspectRatioLabel: "Rasio Aspek:",
      generateThumbnailButton: "Buat Thumbnail",
      generatingThumbnailButton: "Membuat...",
      downloadButton: "Unduh",
      thumbnailIdea: "Ide Thumbnail",
      simpleImagePrompt: "Prompt Gambar Sederhana",
      advancedJsonPrompt: "Prompt JSON Lanjutan",
      promptSource: "Sumber Prompt",
      promptSourceSimple: "Prompt Sederhana",
      promptSourceAdvanced: "Prompt JSON Lanjutan",
      targetLanguageRegion: "Target Bahasa & Wilayah",
      generatingAssetsFor: "Membuat aset untuk",
      errorJsonParse: "Error: Tidak dapat mem-parsing JSON dari AI.",
      errorCaptionMissing: "Teks untuk overlay thumbnail tidak ditemukan.",
      errorConceptMissing: "Konsep thumbnail tidak ditemukan.",
      errorPromptEmpty: "Sumber prompt yang dipilih kosong."
    },
    videoGenerator: {
      referenceImageGeneratorTitle: "Buat Gambar Referensi (Opsional)",
      referenceImageGeneratorDescription: "Ini akan menggunakan prompt utama di atas untuk menghasilkan gambar.",
      generateImageButton: "Generate Gambar",
      generatingImageButton: "Membuat...",
      addImageButton: "Tambahkan ke Referensi",
      combinedPromptLabel: "Prompt Gabungan (Visual & Audio)",
      videoPromptLabel: "Prompt Video (Visual)",
      audioPromptLabel: "Prompt Audio (Narasi & Suara)",
    },
    tutorial: {
        title: "Tutorial Aplikasi",
        textTutorial: "Tutorial Dengan Teks",
        videoTutorial: "Tutorial Dengan Video",
        intro: "Selamat datang di AL ANSHOR GENERATOR! Panduan ini akan memandu Anda melalui alur kerja kreatif utama untuk membuat video, konten afiliasi, dan narasi yang realistis.",
        workflow1: {
            title: "Alur Kerja 1: Pembuat Cerita (Naskah ke Video)",
            intro: "Gunakan alur kerja ini untuk membuat video naratif dari ide naskah.",
            step1: "<strong>Langkah 1: Tab Editor.</strong> Mulailah dengan menulis 'Judul Cerita' dan 'Naskah Cerita'. Gunakan 'Sutradara Cerdas' untuk ide-ide dari AI. Definisikan karakter di 'Garasi Impianmu' untuk konsistensi dan atur suasana di 'Meja Bermain'. Jika sudah siap, klik 'Buat Papan Cerita!'",
            step2: "<strong>Langkah 2: Tab Papan Cerita.</strong> Di sini, cerita Anda dipecah menjadi adegan-adegan. Untuk setiap adegan, klik 'Rancang Blueprint' lalu 'Buat Prompt Sinematik' untuk menghasilkan instruksi terperinci bagi AI. Setelah puas, klik 'Hasilkan Video dengan Prompt Ini' untuk melanjutkan.",
            step3: "<strong>Langkah 3: Generator Video.</strong> Anda sekarang berada di Generator Video. Prompt dari papan cerita sudah terisi. Anda dapat menambahkan gambar referensi, menyesuaikan pengaturan seperti rasio aspek, lalu klik 'Hasilkan Video'. Proses ini bisa memakan waktu beberapa menit.",
            step4: "<strong>Langkah 4: Kit Siaran.</strong> Setelah video Anda selesai, kembali ke Pembuat Cerita. Gunakan 'Mesin Penghasil Metadata' di sidebar untuk membuat judul, deskripsi, dan tag YouTube. Kemudian, beralih ke tab 'Kit Siaran' untuk membuat dan mengunduh thumbnail yang memukau untuk konten Anda."
        },
        workflow2: {
            title: "Alur Kerja 2: Ide dari Referensi",
            intro: "Gunakan alur kerja ini untuk menghasilkan konsep video dengan menganalisis gambar atau klip video pendek yang ada.",
            step1: "<strong>Langkah 1: Analisa.</strong> Di tab 'Editor', klik 'Analisa Referensi'. Unggah file media Anda (gambar atau video hingga 10 detik).",
            step2: "<strong>Langkah 2: Hasilkan.</strong> Klik 'Analisa & Hasilkan Prompt'. AI akan memberikan dua pilihan: 'Prompt Sinematik Sederhana' dan 'Prompt JSON Rinci'.",
            step3: "<strong>Langkah 3: Buat.</strong> Pilih prompt yang Anda suka dan klik tombol 'Hasilkan Video' yang sesuai. Ini akan membawa Anda langsung ke Generator Video dengan prompt yang sudah siap."
        },
        workflow3: {
            title: "Alur Kerja 3: Pembuat Video Afiliasi",
            intro: "Alat khusus ini sangat cocok untuk membuat video pameran produk yang konsisten dan berkualitas tinggi, dengan atau tanpa model.",
            step1: "<strong>Langkah 1: Buka Alat.</strong> Di tab 'Editor', klik 'Buat Video Afiliasi'.",
            step2: "<strong>Langkah 2: Unggah Media.</strong> Unggah gambar/video produk Anda. Secara opsional, unggah media referensi untuk aktor/model tertentu yang ingin Anda tampilkan.",
            step3: "<strong>Langkah 3: Konfigurasi Pengaturan.</strong> Gunakan 'Buat Deskripsi Otomatis' atau tulis deskripsi Anda sendiri untuk memandu AI. Pilih vibe konten, preferensi model, rasio aspek, dan jumlah gambar yang akan dibuat. Kemudian, klik 'Hasilkan Urutan Gambar'.",
            step4: "<strong>Langkah 4: Finalisasi & Hasilkan Video.</strong> AI akan menghasilkan serangkaian gambar yang konsisten. Untuk setiap gambar, Anda dapat membuat 'Prompt Video' (Hook, Lanjutan, atau Penutup). Setelah prompt siap, Anda dapat menghasilkan video untuk satu gambar atau menghasilkan semuanya secara berurutan."
        },
        workflow4: {
            title: "Alur Kerja 4: Generator Suara (Teks-ke-Suara)",
            intro: "Buat narasi dan dialog tingkat profesional untuk video Anda atau konten audio mandiri.",
            step1: "<strong>Langkah 1: Buka Alat.</strong> Di tab 'Editor', klik 'Buat Suara' untuk membuka jendela Generator Suara.",
            step2: "<strong>Langkah 2: Bangun Naskah Anda.</strong> Tulis teks Anda di 'Pembuat Naskah'. Untuk percakapan, beralih ke 'Audio multi-pembicara', tentukan pembicara Anda, dan tambahkan kotak dialog sesuai kebutuhan. 'Instruksi Gaya' akan secara dinamis menyarankan nada berdasarkan teks Anda.",
            step3: "<strong>Langkah 3: Konfigurasi Suara.</strong> Di 'Pengaturan Eksekusi', pilih suara untuk setiap pembicara. Klik ikon speaker di sebelah pilihan suara untuk mendengar pratinjau.",
            step4: "<strong>Langkah 4: Hasilkan Audio.</strong> Klik 'Jalankan' untuk menghasilkan audio. Pemutar audio akan muncul, memungkinkan Anda mendengarkan hasilnya dan mengunduhnya sebagai file WAV."
        },
        closeButton: "Mengerti, ayo buat!"
    },
    storyCreator: {
      newStory: "Cerita Baru",
      characterGarage: "Garasi Impianmu",
      garageDescription: "Daftarkan mainan favoritmu di sini untuk menjadikannya bintang utama!",
      openCharacterWorkshop: "Buka Bengkel Karakter",
      garageEmpty: "Garasi impianmu masih kosong.",
      directingDesk: "Meja Bermain",
      deskDescription: "Pengaturan tambahan untuk cerita Anda.",
      sceneSet: "Set Adegan:",
      locationSet: "Set Lokasi Utama:",
      weatherSet: "Set Cuaca & Suasana:",
      cameraStyleSet: "Gaya Kamera (POV):",
      narratorLanguageSet: "Set Bahasa Narator:",
      timeOfDay: "Waktu:",
      artStyle: "Gaya Seni / Suasana Visual:",
      soundtrackMood: "Suasana Soundtrack:",
      pacing: "Tempo Adegan:",
      customSceneStylePlaceholder: "Contoh: Adegan acara masak yang lucu",
      customLocationPlaceholder: "Contoh: Diorama Dapur Raksasa",
      customWeatherPlaceholder: "Contoh: Aurora magis di langit",
      customCameraStylePlaceholder: "Contoh: Gaya film mata-mata",
      customLanguagePlaceholder: "Contoh: Bahasa Sunda",
      storyEditor: "Editor Cerita",
      storyboard: "Papan Cerita",
      publishingKit: "Kit Siaran",
      haveIdea: "Sudah Punya Ide Cerita?",
      ideaDescriptionDirect: "Langsung ke generator video untuk mewujudkan ide Anda.",
      openDirectVideo: "Langsung Buat Video",
      needIdea: "Butuh Ide Cerita?",
      ideaDescription: "Gunakan Sutradara Cerdas untuk membuat kerangka naskah yang siap tayang!",
      openSmartDirector: "Buka Sutradara Cerdas",
      ideaWithReference: "Buat Ide Dengan Referensi",
      ideaWithReferenceDescription: "Unggah video atau foto untuk dianalisa oleh AI menjadi ide cerita dan prompt sinematik.",
      openReferenceIdea: "Analisa Referensi",
      createAffiliateVideo: "Buat Video Affiliate",
      storyTitle: "Judul Cerita:",
      storyTitlePlaceholder: "Contoh: Rino si Mobil Balap Merah dan Goro si Truk Monster Pemberani",
      storyScript: "Naskah Cerita / Ringkasan:",
      storyScriptPlaceholder: "Tulis ringkasan cerita atau ide utama di sini. AI akan mengembangkannya menjadi adegan-adegan profesional.",
      sceneCount: "Jumlah Adegan:",
      createStoryboard: "Buat Papan Cerita!",
      storyboardPlaceholderTitle: "Hasil Ceritamu Akan Muncul di Sini",
      storyboardPlaceholderDescription: "Klik \"Buat Papan Cerita!\" untuk memulai.",
      scene: "Adegan",
      cinematography: "Sinematografi",
      soundEffects: "Efek Suara",
      noSfx: "Tidak ada saran SFX.",
      mixingGuide: "Panduan Mixing Cerdas",
      generateBlueprint: "Rancang Blueprint",
      generateCinematicPrompt: "Buat Prompt Sinematik",
      useThisPrompt: "Hasilkan Video dengan Prompt Ini",
      resultBlueprint: "Hasil: Rancang Blueprint",
      resultCinematic: "Hasil: Prompt Sinematik",
      error: "Error",
      confirmNewStoryTitle: "Mulai Cerita Baru?",
      confirmNewStoryMessage: "Semua progres saat ini akan dihapus. Anda yakin?",
      directingOptions: {
        sceneSet: { 
          standard_cinematic: "Petualangan Sinematik Standar", 
          epic_destruction: "Kehancuran Epik (Slow-Motion)", 
          drifting_precision: "Tantangan Presisi Drifting",
          comedic_chase: "Adegan Kejar-kejaran Komedi",
          tense_standoff: "Konfrontasi Tegang",
          mysterious_discovery: "Penemuan Misterius",
          custom_scene: "Ketik Set Adegan Sendiri..."
        },
        locationSet: { 
          standardLandGroup: "🏞️ Set Standar & Darat", 
          natural_outdoor: "Luar Ruangan (Taman/Halaman)", 
          kids_bedroom: "Kamar Tidur Anak",
          city_streets: "Jalanan Kota (Perkotaan)",
          enchanted_forest: "Hutan Ajaib",
          futuristic_lab: "Laboratorium Futuristik",
          custom_location: "Ketik Lokasi Sendiri..." 
        },
        weatherSet: { 
          sunny: "Cerah Terik", 
          cloudy: "Berawan", 
          rainy: "Hujan dengan Petir",
          misty_fog: "Kabut Misterius",
          magical_twilight: "Senja Ajaib",
          post_apocalyptic_dust: "Debu Pasca-Apokaliptik",
          custom_weather: "Ketik Suasana Sendiri..."
        },
        cameraStyleSet: { 
          standardGroup: "🎥 Gaya Standar", 
          standard_cinematic: "Sinematik Standar", 
          fpv_drone_dive: "FPV Drone Dive",
          handheld_shaky: "Handheld (Kamera Goyang)",
          slow_dolly_zoom: "Slow Dolly Zoom (Efek Vertigo)",
          stationary_asmr: "Statis (ASMR/Relaksasi)",
          custom_camera: "Ketik Gaya Sendiri..."
        },
        narratorLanguageSet: { 
          no_narrator: "Tanpa Narator", 
          id: "Bahasa Indonesia", 
          en: "English (Bahasa Inggris)", 
          es: "Español (Bahasa Spanyol)",
          zh: "中文 (Bahasa Mandarin)",
          hi: "हिन्दी (Bahasa Hindi)",
          ar: "العربية (Bahasa Arab)",
          pt: "Português (Bahasa Portugis)",
          ru: "Русский (Bahasa Rusia)",
          ja: "日本語 (Bahasa Jepang)",
          de: "Deutsch (Bahasa Jerman)",
          fr: "Français (Bahasa Prancis)",
          custom_language: "Ketik Bahasa Sendiri..."
        },
        timeOfDay: {
            default: "Default (Sesuai Cerita)",
            golden_hour: "Golden Hour (Matahari Terbenam)",
            midday: "Siang Hari Terik",
            blue_hour: "Blue Hour (Senja)",
            night: "Malam Gelap Gulita"
        },
        artStyle: {
            hyper_realistic: "Sangat Realistis (Hyper-realistic)",
            vintage_film: "Film Antik (Tampilan 80-an)",
            anime_inspired: "Terinspirasi Anime",
            gritty_noir: "Film Noir Kelam",
            dreamlike_fantasy: "Fantasi Seperti Mimpi"
        },
        soundtrackMood: {
            none: "Tanpa Musik (Hanya Suara Latar)",
            epic_orchestral: "Orkestra Epik",
            tense_suspenseful: "Tegang & Penuh Ketegangan",
            upbeat_cheerful: "Ceria & Semangat",
            lofi_relaxing: "Lo-fi & Santai"
        },
        pacing: {
            normal: "Tempo Normal",
            slow_deliberate: "Sangat Lambat (Sengaja)",
            fast_action: "Tempo Cepat (Aksi)",
            frenetic_chaotic: "Kacau (Frenetic)"
        }
      },
       publishingKitSection: {
        title: "Mesin Penghasil Metadata",
        description: "Cerita sudah siap! Sekarang, buat semua aset untuk diunggah ke YouTube dengan satu klik.",
        generateButton: "Buatkan Semuanya!",
        generatingButton: "Membuat...",
        apiKeyInstruction: "Pastikan Kunci API Cerita dan Kunci API Video & Thumbnail sudah diatur untuk melanjutkan."
      },
    },
    characterWorkshop: {
        title: "Bengkel Karakter",
        subtitle: "Buat kembaran digital baru untuk mainan Anda atau edit yang sudah ada.",
        aiAssistantSection: "Asisten AI",
        aiAssistantDescription: "Tidak ada waktu untuk mengetik? Unggah gambar atau video referensi, jelaskan ide, lalu klik 'Desain dengan AI' untuk mengisi detail secara otomatis.",
        uploadButton: "Tambah Referensi",
        fileTypes: "Gambar & Video (maks 10d, 25MB)",
        ideaPlaceholder: "Jelaskan mainan Anda atau berikan detail tambahan...",
        designWithAiButton: "✨ Desain dengan AI",
        designingWithAiButton: "Mendesain...",
        modelDetailsSection: "Detail Model (Identitas & Karakter)",
        brandName: "Nama Merek Fiktif:",
        modelName: "Nama Model Spesifik:",
        consistencyId: "ID Konsistensi (Token Unik):",
        consistencyIdHint: "ID unik yang digunakan dalam prompt untuk menjaga konsistensi karakter.",
        mainMaterial: "Material Utama:",
        designLanguage: "Bahasa Desain Merek:",
        keyFeatures: "Fitur Kunci (DNA Visual):",
        keyFeaturesPlaceholder: "Tambah fitur & tekan Enter...",
        actionDnaSection: "DNA Aksi",
        actionDnaDescription: "Apa yang bisa dilakukan karakter ini? (contoh: 'lompat tinggi', 'drifting mulus')",
        actionDnaPlaceholder: "Tambah aksi & tekan Enter...",
        characterPersonality: "Kepribadian Karakter:",
        personalityPlaceholder: "Jelaskan sifat karakter, cth: ceria, pemberani, pemarah...",
        physicalDetails: "Detail Fisik Nuansa:",
        physicalDetailsPlaceholder: "cth: Cat sedikit usang di fender kiri, mata biru menyala...",
        scaleAndSize: "Skala & Ukuran:",
        scaleAndSizePlaceholder: "cth: Skala 1:64, seukuran telapak tangan, sebesar kucing...",
        saveButton: "Simpan Karakter",
        updateButton: "Perbarui Karakter",
        alertUploadOrDescribe: "Harap unggah setidaknya satu gambar/video atau jelaskan mainan Anda untuk menggunakan Asisten AI.",
        alertRequiredFields: "Nama Merek, Nama Model, dan ID Konsistensi wajib diisi untuk menyimpan."
    },
    smartDirector: {
      title: "Sutradara Cerdas",
      step1Description: "Ayo kita buat kerangka naskah yang siap tayang! Ikuti langkah-langkah mudah ini.",
      step1Label: "Langkah 1: Pilih Format Konten",
      step2Label: "Langkah 2: Pilih Karakter Utama",
      step3Label: "Langkah 3: Pilih Tema Cerita",
      generateIdeasButton: "Berikan 3 Ide!",
      generatingIdeasButton: "Mencari Ide...",
      step2Title: "Pilih Ide Naskah Favoritmu!",
      step3Title: "Finalisasi Ceritamu",
      tryAgainButton: "↻ Minta Ide Baru",
      applyIdeaButton: "✅ Pakai Ide Ini!",
      cancelButton: "Batal",
      contentFormats: {
        cinematic_adventure: "Petualangan & Cerita Sinematik",
        product_review: "Ulasan Produk (Review)",
        unboxing: "Unboxing & Kesan Pertama",
        vs_challenge: "Video Perbandingan (VS Challenge)",
        asmr: "ASMR",
        tutorial: "Tutorial / Panduan",
        educational: "Edukasi / Informatif",
        vlog: "Vlog / Sehari-hari",
        top_list: "Daftar Top 10",
        challenge: "Video Tantangan",
        myth_busting: "Membongkar Mitos",
        custom_format: "Ketik Format Sendiri...",
      },
      customFormatPlaceholder: "Contoh: Memasak Stop Motion",
      characterOptions: {
        random: "Pilihkan Secara Acak",
        yourGarage: "🚗 Garasi Anda",
      },
      themeOptions: {
        placeholder_loading: "Meminta saran AI...",
        placeholder_select: "Pilih format dan karakter dulu...",
        custom_theme: "Ketik Tema Sendiri...",
      },
      customThemePlaceholder: "Contoh: Balapan di Planet Mars"
    },
    referenceIdeaModal: {
      title: "Buat Ide dari Referensi",
      description: "Unggah satu atau lebih gambar atau video referensi. AI akan menganalisisnya untuk menghasilkan prompt sinematik yang terperinci.",
      uploadArea: "Unggah file",
      analyzeButton: "Analisa & Hasilkan Prompt",
      analyzingButton: "Menganalisa...",
      resultsTitle: "Hasil Analisa AI",
      simplePromptLabel: "Prompt Sinematik Sederhana",
      jsonPromptLabel: "Prompt JSON Rinci",
      useSimplePromptButton: "Hasilkan Video dengan Prompt Sederhana",
      useJsonPromptButton: "Hasilkan Video dengan Prompt JSON",
      placeholder: "Unggah media referensi dan klik 'Analisa' untuk melihat hasilnya di sini."
    },
    photoStyleCreator: {
      title: "Buat Gaya Foto",
      description: "Hasilkan serangkaian foto bergaya berdasarkan gambar Anda.",
      buttonText: "Buat Gaya Foto",
      yourPhoto: "1. Foto Anda (Wajib)",
      productPhoto: "2. Foto Produk (Opsional)",
      facialExpression: "3. Ekspresi Wajah",
      handGesture: "4. Gerakan Tangan",
      bodyPose: "5. Pose Tubuh",
      pose: "6. Gaya",
      backgroundColor: "7. Warna Latar",
      numberOfImages: "8. Jumlah Gambar",
      aspectRatio: "9. Rasio Aspek",
      generate: "Hasilkan",
      generating: "Menghasilkan...",
      readyText: "Photobooth Anda sudah siap",
      readySubtext: "Sesuaikan kontrol di sebelah kiri dan klik 'Hasilkan' untuk melihat keajaiban terjadi.",
      uploadPlaceholder: "Unggah file atau seret dan lepas",
      uploadSubtitle: "PNG, JPG, WEBP hingga 10MB",
      noProductPlaceholder: "Tidak Ada Produk",
      noProductSubtext: "Seret foto produk di sini",
      expressions: {
          surprised: "Terkejut",
          happy: "Senang",
          sad: "Sedih"
      },
      gestures: {
          pointing: "Menunjuk",
          waving: "Melambai",
          thumbs_up: "Jempol ke Atas"
      },
      bodyPoses: {
          standing: "Berdiri",
          sitting: "Duduk",
          walking: "Berjalan"
      },
      poses: {
          relaxed: "Santai",
          formal: "Formal",
          dynamic: "Dinamis"
      },
      errorNoPhoto: "Silakan unggah foto Anda untuk menghasilkan gambar."
  },
    affiliateCreator: {
        title: "Pembuat Video Afiliasi",
        description: "Hasilkan serangkaian gambar yang konsisten untuk konten afiliasi Anda.",
        uploadSectionTitle: "1. Unggah Produk",
        uploadActorSectionTitle: "2. Unggah Aktor",
        settingsSectionTitle: "3. Pengaturan Generasi",
        numberOfImages: "Jumlah Gambar untuk Dihasilkan",
        generateButton: "Hasilkan Urutan Gambar",
        generatingButton: "Menghasilkan...",
        resultsSectionTitle: "4. Gambar yang Dihasilkan",
        resultsPlaceholder: "Gambar yang Anda hasilkan akan muncul di sini.",
        regenerate: "Buat Ulang",
        replace: "Ganti",
        upload: "Upload",
        download: "Unduh",
        modelSectionTitle: "2. Pilih Model",
        modelWoman: "Wanita",
        modelMan: "Pria",
        modelNone: "Tanpa Model",
        vibeSectionTitle: "3. Pilih Vibe Konten",
        customVibePlaceholder: "Jelaskan vibe kustom Anda...",
        productDescriptionPlaceholder: "Opsional: Deskripsikan produk Anda untuk konsistensi yang lebih baik (cth: 'kemeja katun lengan panjang warna terakota').",
        generateDescriptionButton: "✨ Buat Deskripsi Otomatis",
        aspectRatio: "Rasio Aspek",
        narratorLanguage: "Bahasa Narator",
        customNarratorLanguagePlaceholder: "Contoh: Bahasa Sunda",
        speechStyle: "Gaya Bicara & Ekspresi",
        customSpeechStylePlaceholder: "Contoh: Tenang dan meyakinkan",
        speechStyles: {
            joyful: "Gembira & Antusias",
            humorous: "Humoris & Jenaka",
            serious: "Serius & Profesional",
            inspirational: "Inspiratif & Memotivasi",
            casual: "Santai & Ramah",
            custom: "Kustom...",
        },
        generateVideoPrompt: "Buat Prompt Video",
        promptHook: "Prompt Hook",
        promptContinuation: "Prompt Lanjutan",
        promptClosing: "Prompt Closing",
        copyPromptTooltip: "Salin Prompt Video",
        copiedTooltip: "Tersalin!",
        vibes: {
            cafe_aesthetic: "Kafe Estetik",
            urban_night: "Gaya Urban (Malam)",
            tropical_beach: "Pantai Tropis",
            luxury_apartment: "Apartemen Mewah",
            flower_garden: "Taman Bunga",
            old_building: "Gedung Tua",
            classic_library: "Perpustakaan Klasik",
            minimalist_studio: "Studio Minimalis",
            rooftop_bar: "Rooftop Bar",
            autumn_park: "Taman Musim Gugur",
            tokyo_street: "Jalanan Tokyo",
            scandinavian_interior: "Interior Skandinavia",
            custom: "Kustom...",
        }
    },
    speechGenerator: {
      title: "Generator Suara",
      description: "Buat dialog dan narasi yang realistis.",
      openButton: "Buat Suara",
      scriptBuilder: "Pembuat Naskah",
      runSettings: "Pengaturan Eksekusi",
      styleInstructions: "Instruksi Gaya",
      stylePlaceholder: "Contoh: Bacakan dengan nada hangat dan ramah",
      addDialog: "Tambah Dialog",
      mode: "Mode",
      singleSpeaker: "Audio satu-pembicara",
      multiSpeaker: "Audio multi-pembicara",
      voiceSettings: "Pengaturan Suara",
      speakerSettings: "Pengaturan Pembicara {num}",
      name: "Nama",
      voice: "Suara",
      run: "Jalankan",
      generating: "Menghasilkan...",
      audioOutput: "Keluaran Audio",
      downloadAsWav: "Unduh sebagai WAV",
      preview: "Pratinjau",
      previewing: "Memutar...",
      previewSampleText: "Halo, Anda dapat mendengarkan suara saya dengan pratinjau ini.",
      generatingSuggestions: "Menghasilkan saran...",
      styleDefault: "Default",
      styleCustom: "Kustom...",
      voices: {
        'Zephyr': 'Zephyr (Wanita)',
        'Puck': 'Puck (Pria)',
        'Kore': 'Kore (Wanita)',
        'Charon': 'Charon (Pria)',
        'Fenrir': 'Fenrir (Pria)',
        'Echo': 'Echo (Wanita)',
        'Dasher': 'Dasher (Pria)',
        'Comet': 'Comet (Pria)',
        'Luna': 'Luna (Wanita)',
        'Nova': 'Nova (Wanita)',
        'Lyra': 'Lyra (Wanita)'
      }
    }
});

// --- Add other languages below, using mergeDeep ---
const esTranslations: Translations = mergeDeep(JSON.parse(JSON.stringify(enTranslations)), { /* Spanish translations */ });
const zhTranslations: Translations = mergeDeep(JSON.parse(JSON.stringify(enTranslations)), { /* Chinese translations */ });
const hiTranslations: Translations = mergeDeep(JSON.parse(JSON.stringify(enTranslations)), { /* Hindi translations */ });
const arTranslations: Translations = mergeDeep(JSON.parse(JSON.stringify(enTranslations)), { /* Arabic translations */ });
const ptTranslations: Translations = mergeDeep(JSON.parse(JSON.stringify(enTranslations)), { /* Portuguese translations */ });
const bnTranslations: Translations = mergeDeep(JSON.parse(JSON.stringify(enTranslations)), { /* Bengali translations */ });
const ruTranslations: Translations = mergeDeep(JSON.parse(JSON.stringify(enTranslations)), { /* Russian translations */ });
const jaTranslations: Translations = mergeDeep(JSON.parse(JSON.stringify(enTranslations)), { /* Japanese translations */ });
const deTranslations: Translations = mergeDeep(JSON.parse(JSON.stringify(enTranslations)), { /* German translations */ });
const frTranslations: Translations = mergeDeep(JSON.parse(JSON.stringify(enTranslations)), { /* French translations */ });


const translations: { [key in Language]: Translations } = {
    en: enTranslations,
    id: idTranslations,
    es: esTranslations,
    zh: zhTranslations,
    hi: hiTranslations,
    ar: arTranslations,
    pt: ptTranslations,
    bn: bnTranslations,
    ru: ruTranslations,
    ja: jaTranslations,
    de: deTranslations,
    fr: frTranslations,
};

// --- Language Context and Provider ---

interface LanguageContextType {
    language: Language;
    setLanguage: (language: Language) => void;
    t: (key: string) => string | string[] | Translations;
    dir: 'ltr' | 'rtl';
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<PropsWithChildren<{}>> = ({ children }) => {
    const [language, setLanguageState] = useState<Language>(() => {
        try {
            const storedLang = localStorage.getItem(LANGUAGE_STORAGE_key) as Language;
            return storedLang && languageMap[storedLang] ? storedLang : 'en';
        } catch {
            return 'en';
        }
    });
    
    const dir = ['ar'].includes(language) ? 'rtl' : 'ltr';

    const setLanguage = useCallback((lang: Language) => {
        setLanguageState(lang);
        try {
            localStorage.setItem(LANGUAGE_STORAGE_key, lang);
        } catch (e) {
            console.error("Failed to save language to localStorage", e);
        }
    }, []);
    
    const t = useCallback((key: string): string | string[] | Translations => {
        const langTranslations = translations[language];
        const keys = key.split('.');
        let result: any = langTranslations;
        for (const k of keys) {
            result = result?.[k];
            if (result === undefined) {
                // Fallback to English if key not found
                let fallbackResult: any = translations.en;
                for (const fk of keys) {
                    fallbackResult = fallbackResult?.[fk];
                    if (fallbackResult === undefined) {
                        return key; // Return the key itself if not found in English either
                    }
                }
                return fallbackResult;
            }
        }
        return result ?? key;
    }, [language]);


    return (
        <LanguageContext.Provider value={{ language, setLanguage, t, dir }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLocalization = (): LanguageContextType => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLocalization must be used within a LanguageProvider');
    }
    return context;
};
