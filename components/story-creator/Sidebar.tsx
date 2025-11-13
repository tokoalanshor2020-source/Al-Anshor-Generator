
import React from 'react';
import { CharacterGarage } from './CharacterGarage';
import { PublishingKitSection } from './PublishingKitSection';
import type { Character, StoryboardScene } from '../../types';
import { useLocalization } from '../../i18n';

interface SidebarProps {
    characters: Character[];
    setCharacters: React.Dispatch<React.SetStateAction<Character[]>>;
    onNewStory: () => void;
    storyboard: StoryboardScene[];
    onGeneratePublishingKit: () => void;
    isGeneratingKit: boolean;
    apiKey: string | null;
    onApiKeyError: () => void;
}

export const Sidebar: React.FC<SidebarProps> = (props) => {
    const { t } = useLocalization();
    return (
        <>
             <button 
                onClick={props.onNewStory}
                className="w-full bg-brand-primary hover:bg-brand-dark text-white font-bold py-2 px-4 rounded-lg shadow-lg transition-colors"
             >
                {t('storyCreator.newStory') as string}
            </button>
            <CharacterGarage
                characters={props.characters}
                setCharacters={props.setCharacters}
                apiKey={props.apiKey}
                onApiKeyError={props.onApiKeyError}
            />
            <PublishingKitSection 
                storyboard={props.storyboard}
                onGenerate={props.onGeneratePublishingKit}
                isGenerating={props.isGeneratingKit}
            />
        </>
    );
};
