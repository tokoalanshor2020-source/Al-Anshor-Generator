
import React, { useState, useCallback } from 'react';
import { Sidebar } from './Sidebar';
import { MainContent } from './MainContent';
import { ConfirmationModal } from '../ConfirmationModal';
import { useLocalization } from '../../i18n';
import type { Character, StoryboardScene, DirectingSettings, PublishingKitData, ActiveTab, ReferenceIdeaState, AffiliateCreatorState, VideoGeneratorOrigin } from '../../types';
import { generateStoryboard, generatePublishingKit } from '../../services/storyCreatorService';

interface StoryCreatorProps {
    onProceedToVideo: (prompt: string, image?: { base64: string, mimeType: string }, origin?: VideoGeneratorOrigin) => void;
    
    // State lifted to App.tsx
    characters: Character[];
    setCharacters: React.Dispatch<React.SetStateAction<Character[]>>;
    storyboard: StoryboardScene[];
    setStoryboard: React.Dispatch<React.SetStateAction<StoryboardScene[]>>;
    logline: string;
    setLogline: React.Dispatch<React.SetStateAction<string>>;
    scenario: string;
    setScenario: React.Dispatch<React.SetStateAction<string>>;
    sceneCount: number;
    setSceneCount: React.Dispatch<React.SetStateAction<number>>;
    directingSettings: DirectingSettings;
    setDirectingSettings: React.Dispatch<React.SetStateAction<DirectingSettings>>;
    onNewStory: () => void;
    onUpdateScene: (sceneIndex: number, updatedPrompts: Partial<Pick<StoryboardScene, 'blueprintPrompt' | 'cinematicPrompt'>>) => void;
    publishingKit: PublishingKitData | null;
    setPublishingKit: React.Dispatch<React.SetStateAction<PublishingKitData | null>>;
    activeTab: ActiveTab;
    setActiveTab: (tab: ActiveTab) => void;
    referenceIdeaState: ReferenceIdeaState;
    setReferenceIdeaState: React.Dispatch<React.SetStateAction<ReferenceIdeaState>>;
    isReferenceIdeaModalOpen: boolean;
    setIsReferenceIdeaModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    isAffiliateCreatorModalOpen: boolean;
    setIsAffiliateCreatorModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    isSpeechModalOpen: boolean;
    setIsSpeechModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    isPhotoStyleModalOpen: boolean;
    setIsPhotoStyleModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    apiKey: string | null;
    onApiKeyError: () => void;
}

export const StoryCreator: React.FC<StoryCreatorProps> = (props) => {
    const { t } = useLocalization();
    const { 
        onProceedToVideo, 
        characters, setCharacters, storyboard, setStoryboard,
        logline, setLogline, scenario, setScenario, sceneCount, setSceneCount,
        directingSettings, setDirectingSettings, onNewStory, publishingKit, setPublishingKit,
        activeTab, setActiveTab, referenceIdeaState, setReferenceIdeaState,
        isReferenceIdeaModalOpen, setIsReferenceIdeaModalOpen, apiKey, onApiKeyError
    } = props;

    const [isGenerating, setIsGenerating] = useState(false);
    const [isGeneratingKit, setIsGeneratingKit] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [confirmProps, setConfirmProps] = useState({ title: '', message: '', onConfirm: () => {} });

    const showConfirmation = (title: string, message: string, onConfirm: () => void) => {
        setConfirmProps({ title, message, onConfirm });
        setIsConfirmOpen(true);
    };

    const handleConfirm = () => {
        confirmProps.onConfirm();
        setIsConfirmOpen(false);
    };

    const handleCancel = () => {
        setIsConfirmOpen(false);
    };

    const handleNewStoryClick = () => {
        showConfirmation(
            t('storyCreator.confirmNewStoryTitle') as string,
            t('storyCreator.confirmNewStoryMessage') as string,
            () => {
                onNewStory();
            }
        );
    };
    
    const handleApiError = useCallback((e: unknown) => {
        console.error("API Error:", e);
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
        
        if (errorMessage.includes("API key not valid") || errorMessage.includes("API_KEY_INVALID")) {
            onApiKeyError();
            setError(t('errorApiKeyNotFound') as string);
        } else if (errorMessage === 'errorRateLimit') {
            setError(t('errorRateLimit') as string);
        } else {
            setError(errorMessage);
        }
  }, [t, onApiKeyError]);

    const handleGenerateStoryboard = useCallback(async () => {
        if (!apiKey) {
            onApiKeyError();
            return;
        }
        if (!logline.trim() || !scenario.trim()) {
            alert(t('alertEnterPrompt'));
            return;
        }

        setIsGenerating(true);
        setError(null);
        setStoryboard([]);
        setPublishingKit(null);

        try {
            const scenes = await generateStoryboard({
                logline,
                scenario,
                sceneCount,
                characters,
                directingSettings,
            }, apiKey);
            setStoryboard(scenes);
            setActiveTab('storyboard'); 
        } catch (e) {
            handleApiError(e);
            setActiveTab('storyboard');
        } finally {
            setIsGenerating(false);
        }
    }, [apiKey, onApiKeyError, logline, scenario, sceneCount, characters, directingSettings, t, setStoryboard, setPublishingKit, setActiveTab, handleApiError]);

    const handleGeneratePublishingKit = useCallback(async () => {
        if (!apiKey) {
            onApiKeyError();
            return;
        }
        setIsGeneratingKit(true);
        setError(null);
        try {
            const kit = await generatePublishingKit({ storyboard, characters, logline }, apiKey);
            setPublishingKit(kit);
            setActiveTab('publishingKit');
        } catch (e) {
            handleApiError(e);
            setActiveTab('publishingKit');
        } finally {
            setIsGeneratingKit(false);
        }

    }, [apiKey, onApiKeyError, storyboard, characters, logline, setPublishingKit, setActiveTab, handleApiError]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            <aside className="md:col-span-4 lg:col-span-3 space-y-6 md:sticky md:top-28 md:self-start md:max-h-[calc(100vh-8rem)] md:overflow-y-auto pr-2 pb-6">
                <Sidebar
                    characters={characters}
                    setCharacters={setCharacters}
                    onNewStory={handleNewStoryClick}
                    storyboard={storyboard}
                    onGeneratePublishingKit={handleGeneratePublishingKit}
                    isGeneratingKit={isGeneratingKit}
                    apiKey={apiKey}
                    onApiKeyError={onApiKeyError}
                />
            </aside>
            <main className="md:col-span-8 lg:col-span-9 bg-base-200/50 rounded-xl border border-base-300">
                <MainContent
                    {...props}
                    logline={logline}
                    setLogline={setLogline}
                    scenario={scenario}
                    setScenario={setScenario}
                    sceneCount={sceneCount}
                    setSceneCount={setSceneCount}
                    isGenerating={isGenerating}
                    onGenerateStoryboard={handleGenerateStoryboard}
                    storyboard={storyboard}
                    error={error}
                    onProceedToVideo={onProceedToVideo}
                    characters={characters}
                    directingSettings={directingSettings}
                    setDirectingSettings={setDirectingSettings}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    onUpdateScene={props.onUpdateScene}
                    publishingKit={publishingKit}
                    referenceIdeaState={referenceIdeaState}
                    setReferenceIdeaState={setReferenceIdeaState}
                    isReferenceIdeaModalOpen={isReferenceIdeaModalOpen}
                    setIsReferenceIdeaModalOpen={setIsReferenceIdeaModalOpen}
                    apiKey={apiKey}
                    onApiKeyError={onApiKeyError}
                />
            </main>
            {isConfirmOpen && (
                <ConfirmationModal
                    title={confirmProps.title}
                    message={confirmProps.message}
                    onConfirm={handleConfirm}
                    onCancel={handleCancel}
                />
            )}
        </div>
    );
};
