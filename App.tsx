

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
import { PhotoStyleCreatorModal } from './components/photo-style-creator/PhotoStyleCreatorModal';
import { KeyIcon } from './components/icons/KeyIcon';
import { validateApiKey } from './services/apiKeyService';


const CHARACTERS_STORAGE_KEY = 'gemini-story-characters';
const STORY_CREATOR_SESSION_KEY = 'gemini-story-creator-session';
const VIDEO_GENERATOR_SESSION_KEY = 'gemini-video-generator-session';
const APP_VIEW_STORAGE_KEY = 'gemini-app-view';
const REFERENCE_IDEA_SESSION_KEY = 'gemini-reference-idea-session';
const AFFILIATE_CREATOR_SESSION_KEY = 'gemini-affiliate-creator-session';
const API_KEY_STORAGE_KEY = 'gemini-generator-api-key';


type AppView = 'story-creator' | 'video-generator';

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
  const [error, setError] = useState<React.ReactNode | null>(null);
  
  const [isTutorialOpen, setIsTutorialOpen] = useState<boolean>(false);
  
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isApiKeyPromptOpen, setIsApiKeyPromptOpen] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // State for the API Key prompt modal
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isVerifyingKey, setIsVerifyingKey] = useState(false);
  const [keyError, setKeyError] = useState('');


  const { t, language, dir } = useLocalization();

    useEffect(() => {
        const checkStoredApiKey = async () => {
            const storedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
            if (storedKey) {
                const isValid = await validateApiKey(storedKey);
                if (isValid) {
                    setApiKey(storedKey);
                } else {
                    localStorage.removeItem(API_KEY_STORAGE_KEY);
                    setIsApiKeyPromptOpen(true);
                }
            } else {
                setIsApiKeyPromptOpen(true);
            }
            setIsInitialLoading(false);
        };
        checkStoredApiKey();
    }, []);

    const handleApiKeySubmit = async () => {
        if (!apiKeyInput.trim()) {
            setKeyError('API Key cannot be empty.');
            return;
        }
        setIsVerifyingKey(true);
        setKeyError('');
        const isValid = await validateApiKey(apiKeyInput);
        if (isValid) {
            localStorage.setItem(API_KEY_STORAGE_KEY, apiKeyInput);
            setApiKey(apiKeyInput);
            setIsApiKeyPromptOpen(false);
            setError(null); // Clear previous API key errors from main view
        } else {
            setKeyError('Invalid API key. Please check the key and try again.');
        }
        setIsVerifyingKey(false);
    };

    const handleApiKeyError = useCallback(() => {
        setApiKey(null);
        localStorage.removeItem(API_KEY_STORAGE_KEY);
        setIsApiKeyPromptOpen(true);
    }, []);

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

  const [affiliateCreatorState, setAffiliateCreatorState] = useState<AffiliateCreatorState>(() => {
    try {
        const storedSession = localStorage.getItem(AFFILIATE_CREATOR_SESSION_KEY);
        if (storedSession) {
            const parsed = JSON.parse(storedSession);
            if (typeof parsed === 'object' && parsed !== null) {
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
    return initialAffiliateCreatorState;
  });
  
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
  const [isPhotoStyleModalOpen, setIsPhotoStyleModalOpen] = useState(false);


  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = dir;
  }, [language, dir]);

  useEffect(() => {
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
        const stateToSave: Partial<VideoGeneratorState> = {
            ...videoGeneratorState,
        };
        delete stateToSave.imageFile;
        localStorage.setItem(VIDEO_GENERATOR_SESSION_KEY, JSON.stringify(stateToSave));
    } catch(e) {
        console.error("Failed to save video generator session to localStorage", e);
    }
  }, [videoGeneratorState]);

  useEffect(() => {
    try {
        const stateToSave: Partial<ReferenceIdeaState> = {
            ...referenceIdeaState,
        };
        delete stateToSave.referenceFiles;
        localStorage.setItem(REFERENCE_IDEA_SESSION_KEY, JSON.stringify(stateToSave));
    } catch(e) {
        console.error("Failed to save reference idea session to localStorage", e);
    }
  }, [referenceIdeaState]);

  useEffect(() => {
    try {
        const stateToSave: Partial<AffiliateCreatorState> = {
            ...affiliateCreatorState,
        };
        delete stateToSave.productReferenceFiles;
        delete stateToSave.actorReferenceFiles;
        delete stateToSave.generatedImages;
        localStorage.setItem(AFFILIATE_CREATOR_SESSION_KEY, JSON.stringify(stateToSave));
    } catch(e) {
        if (e instanceof Error && e.name === 'QuotaExceededError') {
          console.warn('LocalStorage quota exceeded. Skipping affiliate session save.');
        } else {
          console.error("Failed to save affiliate creator session to localStorage", e);
        }
    }
    }, [affiliateCreatorState]);
  
  const handleApiError = useCallback((e: unknown) => {
    console.error("API Error:", e);
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
    
    if (errorMessage.includes("API key not valid") || errorMessage.includes("API_KEY_INVALID")) {
        handleApiKeyError();
        setError(t('errorApiKeyNotFound') as string);
    } else if (errorMessage === 'errorModelOverloaded') {
        setError(t('errorModelOverloaded') as string);
    } else if (errorMessage === 'errorBillingRequired') {
        setError(
            <>
                {t('apiKeySelection.billingInfo') as string}{' '}
                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline font-bold">
                    Learn more.
                </a>
            </>
        );
    } else {
        setError(errorMessage);
    }
  }, [t, handleApiKeyError]);

  const handleGenerateVideo = useCallback(async (options: GeneratorOptions) => {
    if (!apiKey) {
        handleApiKeyError();
        return;
    }
    setIsLoading(true);
    setError(null);
    setVideoUrl(null);

    try {
      const url = await generateVideo({ options, apiKey });
      setVideoUrl(url);
    } catch (e) {
      handleApiError(e);
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, handleApiError, handleApiKeyError]);
  
  const parseCompositePrompt = (compositePrompt: string): { video: string, audio: string } => {
    try {
      const promptObject = JSON.parse(compositePrompt);
      if (typeof promptObject === 'object' && promptObject !== null && (promptObject.NARRATION_SCRIPT || promptObject.AUDIO_MIXING_GUIDE)) {
        const videoParts: { [key: string]: any } = {};
        let audioString = '';
        for (const key in promptObject) {
          if (key === 'NARRATION_SCRIPT' || key === 'AUDIO_MIXING_GUIDE') {
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
    } catch (e) {}

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
        setActiveTab('editor'); 
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

  if (isInitialLoading) {
    return <div className="fixed inset-0 flex items-center justify-center bg-base-100 text-gray-300">Loading Application...</div>;
  }

  return (
    <div className="min-h-screen bg-base-100 font-sans text-gray-200 flex flex-col">
      {isTutorialOpen && (
        <TutorialModal onClose={() => setIsTutorialOpen(false)} />
      )}

      {isApiKeyPromptOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[100] p-4 text-center">
            <div className="bg-base-200 rounded-2xl shadow-2xl w-full max-w-md border border-base-300 p-6">
                <h2 className="text-2xl font-bold text-amber-400 mb-4">{t('apiKeySelection.title') as string}</h2>
                <p className="text-gray-300 mb-2 max-w-md mx-auto">{t('apiKeySelection.description') as string}</p>
                 <p className="text-xs text-gray-500 mb-6">
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-300">
                        {t('apiKeySelection.billingInfo') as string}
                    </a>
                  </p>
                <div className="flex flex-col gap-4">
                    <input
                        type="password"
                        value={apiKeyInput}
                        onChange={(e) => {
                            setApiKeyInput(e.target.value);
                            setKeyError('');
                        }}
                        onKeyDown={e => e.key === 'Enter' && handleApiKeySubmit()}
                        placeholder={t('apiKeyInputPlaceholder') as string}
                        className="w-full bg-base-300 border border-gray-600 rounded-lg p-3 text-sm text-gray-200"
                        aria-label="API Key Input"
                    />
                    {keyError && <p className="text-red-400 text-sm">{keyError}</p>}
                    <button 
                        onClick={handleApiKeySubmit}
                        disabled={isVerifyingKey}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-brand-primary hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-base-100 focus:ring-brand-secondary transition-colors disabled:opacity-50"
                    >
                        <KeyIcon className="h-5 w-5" />
                        {isVerifyingKey ? (t('validatingButton') as string) : (t('apiKeySelection.button') as string)}
                    </button>
                </div>
            </div>
        </div>
      )}
      
      {isAffiliateCreatorModalOpen && (
          <AffiliateCreatorModal
            isOpen={isAffiliateCreatorModalOpen}
            onClose={() => setIsAffiliateCreatorModalOpen(false)}
            onProceedToVideo={handleProceedToVideoGenerator}
            affiliateCreatorState={affiliateCreatorState}
            setAffiliateCreatorState={setAffiliateCreatorState}
            apiKey={apiKey}
            onApiKeyError={handleApiKeyError}
          />
      )}

      {isSpeechModalOpen && (
        <SpeechGeneratorModal
            isOpen={isSpeechModalOpen}
            onClose={() => setIsSpeechModalOpen(false)}
            apiKey={apiKey}
            onApiKeyError={handleApiKeyError}
        />
      )}

      {isPhotoStyleModalOpen && (
        <PhotoStyleCreatorModal
          isOpen={isPhotoStyleModalOpen}
          onClose={() => setIsPhotoStyleModalOpen(false)}
          apiKey={apiKey}
          onApiKeyError={handleApiKeyError}
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
              isPhotoStyleModalOpen={isPhotoStyleModalOpen}
              setIsPhotoStyleModalOpen={setIsPhotoStyleModalOpen}
              apiKey={apiKey}
              onApiKeyError={handleApiKeyError}
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
                apiKey={apiKey}
                onApiKeyError={handleApiKeyError}
              />
            </div>

            {isLoading && <Loader />}
            
            {error && (
              <div className="mt-8 bg-red-900/50 border border-red-700 text-red-200 p-4 rounded-lg text-center">
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