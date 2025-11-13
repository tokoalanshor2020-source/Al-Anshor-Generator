import React, { useState, useRef, useEffect } from 'react';
import { VideoIcon } from './icons/VideoIcon';
import { useLocalization } from '../i18n';
import { LanguageSwitcher } from './LanguageSwitcher';
import { QuestionMarkCircleIcon } from './icons/QuestionMarkCircleIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { PlayIcon } from './icons/PlayIcon';
import { RefreshIcon } from './icons/RefreshIcon';
import { PencilSquareIcon } from './icons/PencilSquareIcon';


type ApiKeyStatus = 'valid' | 'invalid' | 'checking' | 'unknown';

interface HeaderProps {
    onOpenTutorialClick: () => void;
    apiKey: string | null;
    apiKeyStatus: ApiKeyStatus;
    onRevalidateClick: () => void;
    onChangeKeyClick: () => void;
}

const ApiKeyStatusDisplay: React.FC<{
    apiKey: string | null;
    status: ApiKeyStatus;
    onRevalidate: () => void;
    onChangeKey: () => void;
}> = ({ apiKey, status, onRevalidate, onChangeKey }) => {
    const { t } = useLocalization();

    if (!apiKey) {
        return null;
    }

    const displayKey = `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`;

    const statusMap = {
        valid: { text: t('apiKeyStatus.valid') as string, className: 'bg-green-500' },
        invalid: { text: t('apiKeyStatus.invalid') as string, className: 'bg-red-500' },
        checking: { text: t('apiKeyStatus.checking') as string, className: 'bg-yellow-500 animate-pulse' },
        unknown: { text: t('apiKeyStatus.unknown') as string, className: 'bg-gray-500' }
    };

    const currentStatus = statusMap[status] || statusMap.unknown;
    
    const isChecking = status === 'checking';
    const isInvalid = status === 'invalid';

    return (
        <div className="flex items-center gap-2 bg-base-300/50 px-3 py-1.5 rounded-lg border border-base-300">
            <span className={`w-2.5 h-2.5 rounded-full ${currentStatus.className}`} title={currentStatus.text}></span>
            <div className="flex flex-col items-start">
              <span className="text-xs font-mono text-gray-300">{displayKey}</span>
              <span className="text-[10px] text-gray-500 -mt-0.5">{currentStatus.text}</span>
            </div>
            {isInvalid ? (
                <button 
                    onClick={onChangeKey} 
                    className="p-1 text-yellow-400 hover:text-white"
                    aria-label={t('changeKeyButton') as string}
                    title={t('changeKeyButton') as string}
                >
                    <PencilSquareIcon className="h-4 w-4" />
                </button>
            ) : (
                <button 
                    onClick={onRevalidate} 
                    disabled={isChecking}
                    className="p-1 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-wait"
                    aria-label={t('revalidateButton') as string}
                    title={t('revalidateButton') as string}
                >
                    <RefreshIcon className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
                </button>
            )}
        </div>
    );
};


export const Header: React.FC<HeaderProps> = ({ onOpenTutorialClick, apiKey, apiKeyStatus, onRevalidateClick, onChangeKeyClick }) => {
  const { t } = useLocalization();
  const [isTutorialMenuOpen, setIsTutorialMenuOpen] = useState(false);
  const tutorialRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (tutorialRef.current && !tutorialRef.current.contains(event.target as Node)) {
            setIsTutorialMenuOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleOpenTextTutorial = () => {
    onOpenTutorialClick();
    setIsTutorialMenuOpen(false);
  };

  const handleOpenVideoTutorial = () => {
    window.open('https://www.youtube.com/playlist?list=PL34uOzbrHaJ-FEQBaQc0TWIllkakOtJPl', '_blank');
    setIsTutorialMenuOpen(false);
  };

  return (
    <header className="flex items-center justify-between w-full py-4">
        <div className="flex items-center gap-3">
             <div className="p-3 bg-gradient-to-r from-brand-primary to-brand-secondary rounded-full shadow-lg">
                <VideoIcon className="h-8 w-8 text-white" />
            </div>
            <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                    {t('appName') as string}
                </h1>
                <p className="hidden sm:block mt-1 text-sm text-gray-400">
                    {t('appTagline') as string}
                </p>
            </div>
        </div>
      
      <div className="flex items-center gap-2 sm:gap-4">
        <ApiKeyStatusDisplay 
            apiKey={apiKey}
            status={apiKeyStatus}
            onRevalidate={onRevalidateClick}
            onChangeKey={onChangeKeyClick}
        />
        <LanguageSwitcher />

        <div className="relative" ref={tutorialRef}>
            <button
                onClick={() => setIsTutorialMenuOpen(prev => !prev)}
                className="inline-flex items-center gap-2 px-3 py-2 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-base-300 hover:bg-brand-primary/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-base-100 focus:ring-brand-secondary transition-colors"
                aria-haspopup="true"
                aria-expanded={isTutorialMenuOpen}
            >
                <QuestionMarkCircleIcon className="h-4 w-4" />
                <span className="hidden sm:inline">{t('tutorialButton') as string}</span>
            </button>
            {isTutorialMenuOpen && (
                 <div
                    className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-base-200 ring-1 ring-black ring-opacity-5 z-50 focus:outline-none"
                    role="menu"
                    aria-orientation="vertical"
                >
                    <div className="py-1" role="none">
                         <button 
                            onClick={handleOpenTextTutorial}
                            className="text-gray-300 group flex items-center gap-3 w-full px-4 py-2 text-sm text-left hover:bg-base-300 hover:text-white"
                            role="menuitem"
                        >
                            <DocumentTextIcon className="h-4 w-4" />
                            <span>{t('tutorial.textTutorial') as string}</span>
                        </button>
                         <button 
                            onClick={handleOpenVideoTutorial}
                            className="text-gray-300 group flex items-center gap-3 w-full px-4 py-2 text-sm text-left hover:bg-base-300 hover:text-white"
                            role="menuitem"
                        >
                            <PlayIcon className="h-4 w-4" />
                            <span>{t('tutorial.videoTutorial') as string}</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
        
      </div>
    </header>
  );
};
