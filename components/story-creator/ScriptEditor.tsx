import React from 'react';
import { useLocalization } from '../../i18n';
import { MagicWandIcon } from '../icons/MagicWandIcon';
import { RocketIcon } from '../icons/RocketIcon';
import { DirectorBridgeModal } from './DirectorBridgeModal';
import type { Character, DirectingSettings, ReferenceIdeaState, AffiliateCreatorState, VideoGeneratorOrigin } from '../../types';
import { FilmIcon } from '../icons/FilmIcon';
import { ReferenceIdeaModal } from './ReferenceIdeaModal';
import { ShoppingCartIcon } from '../icons/ShoppingCartIcon';
import { SpeakerWaveIcon } from '../icons/SpeakerWaveIcon';
import { PhotoIcon } from '../icons/PhotoIcon';


interface ScriptEditorProps {
    logline: string;
    setLogline: (value: string) => void;
    scenario: string;
    setScenario: (value: string) => void;
    sceneCount: number;
    setSceneCount: (value: number) => void;
    isGenerating: boolean;
    // FIX: Changed prop type to accept an async function.
    onGenerateStoryboard: () => Promise<void>;
    characters: Character[];
    directingSettings: DirectingSettings;
    setDirectingSettings: React.Dispatch<React.SetStateAction<DirectingSettings>>;
    onProceedToVideo: (prompt: string, image?: { base64: string; mimeType: string }, origin?: VideoGeneratorOrigin) => void;
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
}

export const ScriptEditor: React.FC<ScriptEditorProps> = (props) => {
    const { t } = useLocalization();
    const [isDirectorBridgeOpen, setIsDirectorBridgeOpen] = React.useState(false);
    
    const { isReferenceIdeaModalOpen, setIsReferenceIdeaModalOpen, setIsAffiliateCreatorModalOpen, setIsSpeechModalOpen, setIsPhotoStyleModalOpen } = props;

    return (
        <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="text-center p-4 bg-base-300/50 rounded-lg border-2 border-dashed border-amber-500">
                    <h3 className="text-lg font-bold text-amber-400">{t('storyCreator.needIdea') as string}</h3>
                    <p className="text-gray-400 text-sm mb-4">{t('storyCreator.ideaDescription') as string}</p>
                    <button 
                        onClick={() => setIsDirectorBridgeOpen(true)}
                        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50"
                    >
                        <MagicWandIcon />
                        {t('storyCreator.openSmartDirector') as string}
                    </button>
                </div>

                <div className="text-center p-4 bg-base-300/50 rounded-lg border-2 border-dashed border-purple-500">
                    <h3 className="text-lg font-bold text-purple-400">{t('storyCreator.ideaWithReference') as string}</h3>
                    <p className="text-gray-400 text-sm mb-4">{t('storyCreator.ideaWithReferenceDescription') as string}</p>
                    <button 
                        onClick={() => setIsReferenceIdeaModalOpen(true)}
                        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
                    >
                        <FilmIcon />
                        {t('storyCreator.openReferenceIdea') as string}
                    </button>
                </div>

                <div className="text-center p-4 bg-base-300/50 rounded-lg border-2 border-dashed border-teal-500">
                    <h3 className="text-lg font-bold text-teal-400">{t('photoStyleCreator.title') as string}</h3>
                    <p className="text-gray-400 text-sm mb-4">{t('photoStyleCreator.description') as string}</p>
                    <button
                        onClick={() => setIsPhotoStyleModalOpen(true)}
                        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-teal-600 hover:bg-teal-700"
                    >
                        <PhotoIcon />
                        {t('photoStyleCreator.buttonText') as string}
                    </button>
                </div>

                <div className="text-center p-4 bg-base-300/50 rounded-lg border-2 border-dashed border-green-500">
                    <h3 className="text-lg font-bold text-green-400">{t('storyCreator.createAffiliateVideo') as string}</h3>
                    <p className="text-gray-400 text-sm mb-4">{t('affiliateCreator.description') as string}</p>
                    <button
                        onClick={() => setIsAffiliateCreatorModalOpen(true)}
                        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                    >
                        <ShoppingCartIcon />
                        {t('storyCreator.createAffiliateVideo') as string}
                    </button>
                </div>
                
                <div className="text-center p-4 bg-base-300/50 rounded-lg border-2 border-dashed border-blue-500">
                    <h3 className="text-lg font-bold text-blue-400">{t('speechGenerator.title') as string}</h3>
                    <p className="text-gray-400 text-sm mb-4">{t('speechGenerator.description') as string}</p>
                    <button
                        onClick={() => setIsSpeechModalOpen(true)}
                        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                        <SpeakerWaveIcon />
                        {t('speechGenerator.openButton') as string}
                    </button>
                </div>

                <div className="text-center p-4 bg-base-300/50 rounded-lg border-2 border-dashed border-cyan-500">
                    <h3 className="text-lg font-bold text-cyan-400">{t('storyCreator.haveIdea') as string}</h3>
                    <p className="text-gray-400 text-sm mb-4">{t('storyCreator.ideaDescriptionDirect') as string}</p>
                    <button 
                        onClick={() => props.onProceedToVideo('', undefined, 'direct')}
                        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <RocketIcon />
                        {t('storyCreator.openDirectVideo') as string}
                    </button>
                </div>
            </div>
            
            {isDirectorBridgeOpen && (
                <DirectorBridgeModal
                    isOpen={isDirectorBridgeOpen}
                    onClose={() => setIsDirectorBridgeOpen(false)}
                    characters={props.characters}
                    // Pass all the editor state and functions to the modal
                    logline={props.logline}
                    setLogline={props.setLogline}
                    scenario={props.scenario}
                    setScenario={props.setScenario}
                    sceneCount={props.sceneCount}
                    setSceneCount={props.setSceneCount}
                    directingSettings={props.directingSettings}
                    setDirectingSettings={props.setDirectingSettings}
                    isGenerating={props.isGenerating}
                    onGenerateStoryboard={props.onGenerateStoryboard}
                />
            )}
            
            {isReferenceIdeaModalOpen && (
                 <ReferenceIdeaModal
                    isOpen={isReferenceIdeaModalOpen}
                    onClose={() => setIsReferenceIdeaModalOpen(false)}
                    onProceedToVideo={props.onProceedToVideo}
                    referenceIdeaState={props.referenceIdeaState}
                    // FIX: Pass the setter function `setReferenceIdeaState` instead of the state object.
                    setReferenceIdeaState={props.setReferenceIdeaState}
                />
            )}
        </div>
    );
};