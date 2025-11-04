import React from 'react';
import type { StoryboardScene } from '../../types';
import { useLocalization } from '../../i18n';
import { RocketIcon } from '../icons/RocketIcon';

interface PublishingKitSectionProps {
    storyboard: StoryboardScene[];
    onGenerate: () => void;
    isGenerating: boolean;
}

export const PublishingKitSection: React.FC<PublishingKitSectionProps> = ({ storyboard, onGenerate, isGenerating }) => {
    const { t } = useLocalization();

    if (storyboard.length === 0) {
        return null;
    }

    return (
        <div className="bg-base-200 rounded-xl border-2 border-dashed border-cyan-500 transition-all">
            <div className="p-4 flex items-center gap-2">
                <RocketIcon className="h-6 w-6 text-cyan-300 transition-colors" />
                <h2 className="text-xl font-bold text-cyan-300 transition-colors">{t('storyCreator.publishingKitSection.title') as string}</h2>
            </div>
            <div className="p-4 border-t border-base-300 space-y-4">
                <p className="text-sm text-gray-400">{t('storyCreator.publishingKitSection.description') as string}</p>
                <button
                    onClick={onGenerate}
                    disabled={isGenerating}
                    className="w-full font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
                >
                    ✨ {(isGenerating ? t('storyCreator.publishingKitSection.generatingButton') : t('storyCreator.publishingKitSection.generateButton')) as string}
                </button>
            </div>
        </div>
    );
};
