import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { VideoGeneratorForm } from './components/VideoGeneratorForm';
import { Loader } from './components/Loader';
import { VideoPlayer } from './components/VideoPlayer';
import { StoryCreator } from './components/story-creator/StoryCreator';
import type { GeneratorOptions, Character, StoryboardScene, DirectingSettings, PublishingKitData, ActiveTab, VideoGeneratorState, ReferenceIdeaState, AffiliateCreatorState, GeneratedAffiliateImage, VideoGeneratorOrigin } from './types';
import { generateVideo } from './services/geminiService';
import { useLocalization } from './i18n';
import { TutorialModal } from './components/TutorialModal';
import { AffiliateCreatorModal } from './components/affiliate-creator/AffiliateCreatorModal';
import { SpeechGeneratorModal } from './components/speech-generator/SpeechGeneratorModal';

const CHARACTERS_STORAGE_KEY = 'gemini-story-characters';
const STORY_CREATOR_SESSION_KEY = 'gemini-story-creator-session';
const VIDEO_GENERATOR_SESSION_KEY = 'gemini-video-generator-session';
const APP_VIEW_STORAGE_KEY = 'gemini-app-view';
const REFERENCE_IDEA_SESSION_KEY = 'gemini-reference-idea-session';
const AFFILIATE_CREATOR_SESSION_KEY = 'gemini-affiliate-creator-session';


type AppView = 'story-creator' | 'video-generator';

// FIX: Initialize all properties for the `DirectingSettings` type to resolve TypeScript error.
const initialDirectingSettings: DirectingSettings = {
    sceneStyleSet: 'standard_cinematic',
    customSceneStyle: '',
    locationSet: 'natural_outdoor',
    customLocation: '',
    weatherSet: 'sunny',
    customWeather: '',
    cameraStyleSet: 'standard_cinematic',
    customCameraStyle: '',
    narratorLanguageSet: 'id',
    customNarratorLanguage: '',
    timeOfDay: 'default',
    artStyle: 'hyper_realistic',
    soundtrackMood: 'epic_orchestral',
    pacing: 'normal',
};

const initialAffiliateCreatorState: AffiliateCreatorState = {
    productReferenceFiles: [],
    actorReferenceFiles: [],
    generatedImages: [],
    numberOfImages: 10,
    model: 'woman',
    vibe: 'studio_minimalis',
    customVibe: '',
    productDescription: '',
    aspectRatio: '9:16',
    narratorLanguage: 'en',
    customNarratorLanguage: '',
    speechStyle: 'joyful',
    customSpeechStyle: '',
};

export default function App() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [isTutorialOpen, setIsTutorialOpen] = useState<boolean>(false);
  
  const { t, language, dir } = useLocalization();

  const [view, setView] = useState<AppView>(() => {
    try {
        const storedView = localStorage.getItem(APP_VIEW_STORAGE_KEY) as AppView;
        if (storedView === 'video-generator' || storedView === 'story-creator') {
            return storedView;
        }
    } catch (e) {
        console.error("Failed to load app view from localStorage", e);
        localStorage.removeItem(APP_VIEW_STORAGE_KEY);
    }
    return 'story-creator';
  });

  const [videoGeneratorOrigin, setVideoGeneratorOrigin] = useState<VideoGeneratorOrigin | null>(null);
  
  // State for video generator form, persisted to localStorage
  const [videoGeneratorState, setVideoGeneratorState] = useState<VideoGeneratorState>(() => {
    try {
        const storedSession = localStorage.getItem(VIDEO_GENERATOR_SESSION_KEY);
        if (storedSession) {
            return JSON.parse(storedSession);
        }
    } catch (e) {
        console.error("Failed to parse video generator session from localStorage", e);
        localStorage.removeItem(VIDEO_GENERATOR_SESSION_KEY);
    }
    return {
        prompt: { video: '', audio: '' },
        imageFile: null,
        aspectRatio: '9:16',
        enableSound: false,
        resolution: '1080p',
    };
  });
  
    // State for reference idea modal, persisted to localStorage
  const [referenceIdeaState, setReferenceIdeaState] = useState<ReferenceIdeaState>(() => {
    try {
        const storedSession = localStorage.getItem(REFERENCE_IDEA_SESSION_KEY);
        if (storedSession) {
            return JSON.parse(storedSession);
        }
    } catch (e) {
        console.error("Failed to parse reference idea session from localStorage", e);
        localStorage.removeItem(REFERENCE_IDEA_SESSION_KEY);
    }
    return {
        referenceFiles: [],
        results: null,
    };
  });

  // State for Affiliate Creator modal, persisted to localStorage
  const [affiliateCreatorState, setAffiliateCreatorState] = useState<AffiliateCreatorState>(() => {
    try {
        const storedSession = localStorage.getItem(AFFILIATE_CREATOR_SESSION_KEY);
        if (storedSession) {
            const parsed = JSON.parse(storedSession);
            // Check if parsed data is a valid object to prevent crashes on null/invalid stored data.
            // This prevents the state from being wiped if localStorage contains "null" or corrupted data.
            if (typeof parsed === 'object' && parsed !== null) {
                // Merge stored data with initial state to ensure all keys are present
                // and handle backward compatibility for `referenceFiles`.
                return {
                    ...initialAffiliateCreatorState,
                    ...parsed,
                    productReferenceFiles: parsed.productReferenceFiles || parsed.referenceFiles || [],
                };
            }
        }
    } catch (e) {
        console.error("Failed to parse affiliate creator session from localStorage", e);
        localStorage.removeItem(AFFILIATE_CREATOR_SESSION_KEY);
    }
    // Return a clean default state if nothing is stored or if parsing failed
    return initialAffiliateCreatorState;
  });
  
  // --- Lifted State from StoryCreator ---
  const [characters, setCharacters] = useState<Character[]>(() => {
    try {
        const storedCharacters = localStorage.getItem(CHARACTERS_STORAGE_KEY);
        return storedCharacters ? JSON.parse(storedCharacters) : [];
    } catch (e) {
        console.error("Failed to parse characters from localStorage", e);
        localStorage.removeItem(CHARACTERS_STORAGE_KEY);
        return [];
    }
  });

  const [initialSession] = useState(() => {
    try {
        const storedSession = localStorage.getItem(STORY_CREATOR_SESSION_KEY);
        if (storedSession) {
            return JSON.parse(storedSession);
        }
    } catch (e) {
        console.error("Failed to parse story session from localStorage", e);
        localStorage.removeItem(STORY_CREATOR_SESSION_KEY);
    }
    return {};
  });

  const [storyboard, setStoryboard] = useState<StoryboardScene[]>(initialSession.storyboard || []);
  const [logline, setLogline] = useState(initialSession.logline || '');
  const [scenario, setScenario] = useState(initialSession.scenario || '');
  const [sceneCount, setSceneCount] = useState(initialSession.sceneCount || 3);
  const [directingSettings, setDirectingSettings] = useState<DirectingSettings>(initialSession.directingSettings || initialDirectingSettings);
  const [publishingKit, setPublishingKit] = useState<PublishingKitData | null>(initialSession.publishingKit || null);
  const [activeTab, setActiveTab] = useState<ActiveTab>(initialSession.activeTab || 'editor');
  const [isReferenceIdeaModalOpen, setIsReferenceIdeaModalOpen] = useState(initialSession.isReferenceIdeaModalOpen || false);
  const [isAffiliateCreatorModalOpen, setIsAffiliateCreatorModalOpen] = useState(false);
  const [isSpeechModalOpen, setIsSpeechModalOpen] = useState(false);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = dir;
  }, [language, dir]);

  useEffect(() => {
    // Save characters to localStorage whenever they change
    try {
        localStorage.setItem(CHARACTERS_STORAGE_KEY, JSON.stringify(characters));
    } catch(e) {
        console.error("Failed to save characters to localStorage", e);
    }
  }, [characters]);

   useEffect(() => {
    try {
        const sessionData = {
            logline,
            scenario,
            sceneCount,
            directingSettings,
            storyboard,
            publishingKit,
            activeTab,
            isReferenceIdeaModalOpen,
        };
        localStorage.setItem(STORY_CREATOR_SESSION_KEY, JSON.stringify(sessionData));
    } catch(e) {
        console.error("Failed to save story session to localStorage", e);
    }
  }, [logline, scenario, sceneCount, directingSettings, storyboard, publishingKit, activeTab, isReferenceIdeaModalOpen]);
  
   useEffect(() => {
    try {
        localStorage.setItem(APP_VIEW_STORAGE_KEY, view);
    } catch(e) {
        console.error("Failed to save app view to localStorage", e);
    }
  }, [view]);

  useEffect(() => {
    try {
        localStorage.setItem(VIDEO_GENERATOR_SESSION_KEY, JSON.stringify(videoGeneratorState));
    } catch(e) {
        console.error("Failed to save video generator session to localStorage", e);
    }
  }, [videoGeneratorState]);

  useEffect(() => {
    try {
        localStorage.setItem(REFERENCE_IDEA_SESSION_KEY, JSON.stringify(referenceIdeaState));
    } catch(e) {
        console.error("Failed to save reference idea session to localStorage", e);
    }
  }, [referenceIdeaState]);

  useEffect(() => {
    try {
        localStorage.setItem(AFFILIATE_CREATOR_SESSION_KEY, JSON.stringify(affiliateCreatorState));
    } catch(e) {
        console.error("Failed to save affiliate creator session to localStorage", e);
    }
    }, [affiliateCreatorState]);

  useEffect(() => {
    const styleId = 'modal-styling-rules';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
            body.modal-open .main-app-footer {
                display: none;
            }
        `;
        document.head.appendChild(style);
    }
  }, []);

  const handleGenerateVideo = useCallback(async (options: GeneratorOptions) => {
    setIsLoading(true);
    setError(null);
    setVideoUrl(null);

    try {
      const url = await generateVideo({ options });
      setVideoUrl(url);
    } catch (e) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
// FIX: Cast result of t() to string
      const displayError = errorMessage === 'errorRateLimit' ? t('errorRateLimit') as string : errorMessage;
      setError(displayError);
    } finally {
      setIsLoading(false);
    }
  }, [t]);
  
  const parseCompositePrompt = (compositePrompt: string): { video: string, audio: string } => {
    // Attempt to parse as JSON for affiliate/structured prompts
    try {
      const promptObject = JSON.parse(compositePrompt);
      
      // Heuristic to detect if this is a structured prompt with audio components
      if (typeof promptObject === 'object' && promptObject !== null && (promptObject.NARRATION_SCRIPT || promptObject.AUDIO_MIXING_GUIDE)) {
        const videoParts: { [key: string]: any } = {};
        let audioString = '';

        // Separate video and audio keys
        for (const key in promptObject) {
          if (key === 'NARRATION_SCRIPT' || key === 'AUDIO_MIXING_GUIDE') {
            // Append to audio string for display
            audioString += `//** ${key.replace(/_/g, ' ')} **//\n`;
            audioString += JSON.stringify(promptObject[key], null, 2) + '\n\n';
          } else {
            videoParts[key] = promptObject[key];
          }
        }
        
        const video = JSON.stringify(videoParts, null, 2);
        const audio = audioString.trim();

        return { video, audio };
      }
    } catch (e) {
      // Not a JSON string or not the expected format, proceed to text-based parsing
    }

    // Fallback for text-based prompts (from Storyboard)
    const blueprintAudioMarker = '//** 7. NARRATION SCRIPT (VOICE OVER) **//';
    const cinematicAudioMarker = '\n\nNARRATION SCRIPT\n';

    let video = compositePrompt;
    let audio = '';

    let splitIndex = compositePrompt.indexOf(blueprintAudioMarker);
    if (splitIndex !== -1) {
        video = compositePrompt.substring(0, splitIndex).trim();
        audio = compositePrompt.substring(splitIndex).trim();
    } else {
        splitIndex = compositePrompt.indexOf(cinematicAudioMarker);
        if (splitIndex !== -1) {
            video = compositePrompt.substring(0, splitIndex).trim();
            audio = compositePrompt.substring(splitIndex).trim();
        }
    }

    return { video, audio };
  };

  const handleProceedToVideoGenerator = (
    prompt: string,
    data?: { base64: string; mimeType: string } | { affiliateImageId: string },
    origin?: VideoGeneratorOrigin
  ) => {
    try {
        setVideoGeneratorOrigin(origin || 'direct');
        let imageToSet: { base64: string, mimeType: string } | null = null;
        
        if (data) {
            if ('affiliateImageId' in data) {
                const sourceImage = affiliateCreatorState.generatedImages.find(img => img.id === data.affiliateImageId);
                if (sourceImage) {
                    imageToSet = { base64: sourceImage.base64, mimeType: sourceImage.mimeType };
                } else {
                    console.error("Affiliate image ID from payload not found in component state.");
                }
            } else {
                imageToSet = data as { base64: string, mimeType: string };
            }
        }

        let finalPrompt: { video: string; audio: string };
        if (origin === 'direct') {
            finalPrompt = { video: '', audio: '' };
        } else {
            finalPrompt = parseCompositePrompt(prompt);
        }

        setView('video-generator');
        setVideoGeneratorState(prevState => ({
            ...prevState,
            prompt: finalPrompt,
            imageFile: imageToSet
        }));
        setVideoUrl(null);
        setError(null);
        window.scrollTo(0, 0);

    } catch (e) {
        console.error("Failed to proceed to video generator", e);
        setError("Could not prepare the video generator. Please try again.");
    }
  };
  
  const handleGoBackFromVideoGenerator = () => {
    setVideoUrl(null);
    setError(null);
    
    switch (videoGeneratorOrigin) {
      case 'affiliate':
        setView('story-creator');
        setIsAffiliateCreatorModalOpen(true);
        break;
      case 'reference':
        setView('story-creator');
        setIsReferenceIdeaModalOpen(true);
        break;
      case 'storyboard':
      case 'direct':
      default:
        setView('story-creator');
        setActiveTab('editor'); // Go to editor for direct, storyboard for storyboard
        if (videoGeneratorOrigin === 'storyboard') setActiveTab('storyboard');
        break;
    }
    window.scrollTo(0, 0);
  };

  const handleNewStoryReset = () => {
      setLogline('');
      setScenario('');
      setSceneCount(3);
      setStoryboard([]);
      setDirectingSettings(initialDirectingSettings);
      setPublishingKit(null);
      setError(null);
      setActiveTab('editor');
      setIsReferenceIdeaModalOpen(false);
      try {
        localStorage.removeItem(STORY_CREATOR_SESSION_KEY);
      } catch (e) {
        console.error("Failed to clear story session from localStorage", e);
      }
  };
  
  const handleUpdateScene = (sceneIndex: number, updatedPrompts: Partial<Pick<StoryboardScene, 'blueprintPrompt' | 'cinematicPrompt'>>) => {
      setStoryboard(currentStoryboard =>
          currentStoryboard.map((scene, index) => {
              if (index === sceneIndex) {
                  return { ...scene, ...updatedPrompts };
              }
              return scene;
          })
      );
  };

  const getBackButtonText = () => {
    switch (videoGeneratorOrigin) {
      case 'affiliate':
        return t('backToAffiliateCreator');
      case 'reference':
        return t('backToReferenceAnalyzer');
      case 'storyboard':
        return t('backToStoryboard');
      case 'direct':
      default:
        return t('backToEditor');
    }
  };


  return (
    <div className="min-h-screen bg-base-100 font-sans text-gray-200 flex flex-col">
      {isTutorialOpen && (
        <TutorialModal onClose={() => setIsTutorialOpen(false)} />
      )}
      
      {isAffiliateCreatorModalOpen && (
          <AffiliateCreatorModal
            isOpen={isAffiliateCreatorModalOpen}
            onClose={() => setIsAffiliateCreatorModalOpen(false)}
            onProceedToVideo={handleProceedToVideoGenerator}
            affiliateCreatorState={affiliateCreatorState}
            setAffiliateCreatorState={setAffiliateCreatorState}
          />
      )}

      {isSpeechModalOpen && (
        <SpeechGeneratorModal
            isOpen={isSpeechModalOpen}
            onClose={() => setIsSpeechModalOpen(false)}
        />
      )}

      <header className="sticky top-0 z-30 w-full border-b border-base-300 bg-base-100/90 backdrop-blur-sm">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Header 
              onOpenTutorialClick={() => setIsTutorialOpen(true)}
            />
          </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 mt-8 pb-24 flex-grow">
        {view === 'story-creator' && (
           <StoryCreator
              onProceedToVideo={handleProceedToVideoGenerator}
              characters={characters}
              setCharacters={setCharacters}
              storyboard={storyboard}
              setStoryboard={setStoryboard}
              logline={logline}
              setLogline={setLogline}
              scenario={scenario}
              setScenario={setScenario}
              sceneCount={sceneCount}
              setSceneCount={setSceneCount}
              directingSettings={directingSettings}
              setDirectingSettings={setDirectingSettings}
              onNewStory={handleNewStoryReset}
              onUpdateScene={handleUpdateScene}
              publishingKit={publishingKit}
              setPublishingKit={setPublishingKit}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              referenceIdeaState={referenceIdeaState}
              setReferenceIdeaState={setReferenceIdeaState}
              isReferenceIdeaModalOpen={isReferenceIdeaModalOpen}
              setIsReferenceIdeaModalOpen={setIsReferenceIdeaModalOpen}
              isAffiliateCreatorModalOpen={isAffiliateCreatorModalOpen}
              setIsAffiliateCreatorModalOpen={setIsAffiliateCreatorModalOpen}
              isSpeechModalOpen={isSpeechModalOpen}
              setIsSpeechModalOpen={setIsSpeechModalOpen}
           />
        )}

        {view === 'video-generator' && (
          <div>
              <button 
                onClick={handleGoBackFromVideoGenerator}
                className="mb-6 inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-base-300 hover:bg-brand-primary/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-base-100 focus:ring-brand-secondary transition-colors"
              >
                  &larr; {getBackButtonText() as string}
              </button>
            <div className="bg-base-200 p-6 sm:p-8 rounded-2xl shadow-2xl border border-base-300">
              <VideoGeneratorForm 
                isGenerating={isLoading} 
                onSubmit={handleGenerateVideo}
                generatorState={videoGeneratorState}
                onStateChange={setVideoGeneratorState}
                characters={characters}
                videoGeneratorOrigin={videoGeneratorOrigin}
              />
            </div>

            {isLoading && <Loader />}
            
            {error && (
              <div className="mt-8 bg-red-900/50 border border-red-700 text-red-200 p-4 rounded-lg text-center">
                {/* FIX: Cast result of t() to string */}
                <h3 className="font-bold text-lg">{t('generationFailed') as string}</h3>
                <p className="mt-1">{error}</p>
              </div>
            )}

            {videoUrl && !isLoading && (
              <VideoPlayer videoUrl={videoUrl} prompt={videoGeneratorState.prompt.video} />
            )}
          </div>
        )}
      </main>
        
      <footer className="main-app-footer sticky bottom-0 z-20 w-full border-t border-base-300 bg-base-100/90 backdrop-blur-sm py-4 text-center text-gray-500 text-sm">
        <p>Powered by MOH RIYAN ADI SAPUTRA</p>
      </footer>
    </div>
  );
}