import React, { createContext, useState, useContext, useEffect, PropsWithChildren } from 'react';

const STORY_KEYS_STORAGE_KEY = 'gemini-story-api-keys';
const ACTIVE_STORY_KEY_STORAGE_KEY = 'gemini-active-story-api-key';
const VIDEO_KEYS_STORAGE_KEY = 'gemini-video-api-keys';
const ACTIVE_VIDEO_KEY_STORAGE_KEY = 'gemini-active-video-api-key';

interface ApiKeyContextType {
    storyKeys: string[];
    activeStoryKey: string | null;
    setStoryKeys: (keys: string[]) => void;
    setActiveStoryKey: (key: string | null) => void;
    
    videoKeys: string[];
    activeVideoKey: string | null;
    setVideoKeys: (keys: string[]) => void;
    setActiveVideoKey: (key: string | null) => void;
    
    isLoaded: boolean;
}

const ApiKeyContext = createContext<ApiKeyContextType | undefined>(undefined);

export const ApiKeyProvider: React.FC<PropsWithChildren<{}>> = ({ children }) => {
    const [storyKeys, setStoryKeysState] = useState<string[]>([]);
    const [activeStoryKey, setActiveStoryKeyState] = useState<string | null>(null);
    const [videoKeys, setVideoKeysState] = useState<string[]>([]);
    const [activeVideoKey, setActiveVideoKeyState] = useState<string | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load keys from localStorage on initial mount
    useEffect(() => {
        try {
            const storedStoryKeys = JSON.parse(localStorage.getItem(STORY_KEYS_STORAGE_KEY) || '[]');
            const storedActiveStoryKey = localStorage.getItem(ACTIVE_STORY_KEY_STORAGE_KEY);
            const storedVideoKeys = JSON.parse(localStorage.getItem(VIDEO_KEYS_STORAGE_KEY) || '[]');
            const storedActiveVideoKey = localStorage.getItem(ACTIVE_VIDEO_KEY_STORAGE_KEY);

            setStoryKeysState(storedStoryKeys);
            setVideoKeysState(storedVideoKeys);

            // Ensure active key is still in the list
            if (storedActiveStoryKey && storedStoryKeys.includes(storedActiveStoryKey)) {
                setActiveStoryKeyState(storedActiveStoryKey);
            } else if (storedStoryKeys.length > 0) {
                setActiveStoryKeyState(storedStoryKeys[0]);
            }

            if (storedActiveVideoKey && storedVideoKeys.includes(storedActiveVideoKey)) {
                setActiveVideoKeyState(storedActiveVideoKey);
            } else if (storedVideoKeys.length > 0) {
                setActiveVideoKeyState(storedVideoKeys[0]);
            }
        } catch (e) {
            console.error("Failed to load API keys from localStorage", e);
        } finally {
            setIsLoaded(true);
        }
    }, []);

    const setStoryKeys = (keys: string[]) => {
        localStorage.setItem(STORY_KEYS_STORAGE_KEY, JSON.stringify(keys));
        setStoryKeysState(keys);
    };

    const setActiveStoryKey = (key: string | null) => {
        if (key) {
            localStorage.setItem(ACTIVE_STORY_KEY_STORAGE_KEY, key);
        } else {
            localStorage.removeItem(ACTIVE_STORY_KEY_STORAGE_KEY);
        }
        setActiveStoryKeyState(key);
    };

    const setVideoKeys = (keys: string[]) => {
        localStorage.setItem(VIDEO_KEYS_STORAGE_KEY, JSON.stringify(keys));
        setVideoKeysState(keys);
    };

    const setActiveVideoKey = (key: string | null) => {
        if (key) {
            localStorage.setItem(ACTIVE_VIDEO_KEY_STORAGE_KEY, key);
        } else {
            localStorage.removeItem(ACTIVE_VIDEO_KEY_STORAGE_KEY);
        }
        setActiveVideoKeyState(key);
    };

    const value: ApiKeyContextType = {
        storyKeys, activeStoryKey, setStoryKeys, setActiveStoryKey,
        videoKeys, activeVideoKey, setVideoKeys, setActiveVideoKey,
        isLoaded,
    };

    return (
        <ApiKeyContext.Provider value={value}>
            {children}
        </ApiKeyContext.Provider>
    );
};

export const useApiKeys = () => {
    const context = useContext(ApiKeyContext);
    if (context === undefined) {
        throw new Error('useApiKeys must be used within an ApiKeyProvider');
    }
    return context;
};
