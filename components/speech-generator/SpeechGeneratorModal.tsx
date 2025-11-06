import React, { useState, useEffect, useCallback, useId, useRef } from 'react';
import { useLocalization, languageMap } from '../../i18n';
import type { SpeechMode, DialogEntry, SpeakerConfig } from '../../types';
// FIX: Correct the import path for generateSpeech.
import { generateSpeech } from '../../services/geminiService';
import { generateStyleSuggestions } from '../../services/storyCreatorService';
import { XCircleIcon } from '../icons/XCircleIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { SpeakerWaveIcon } from '../icons/SpeakerWaveIcon';

interface SpeechGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const generateUUID = () => window.crypto.randomUUID();

// --- Audio Utilities ---

// Decodes base64 string into a Uint8Array
function decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

// Helper to write strings into a DataView
const writeString = (view: DataView, offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
    }
};

// Creates a WAV file Blob from raw PCM audio data
const createWavBlob = (pcmData: Uint8Array, sampleRate: number, numChannels: number, bitsPerSample: number): Blob => {
    const dataSize = pcmData.length;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    // RIFF chunk descriptor
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true); // chunkSize
    writeString(view, 8, 'WAVE');

    // FMT sub-chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true); // audioFormat (1 for PCM)
    view.setUint16(22, numChannels, true); // numChannels
    view.setUint32(24, sampleRate, true); // sampleRate
    view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true); // byteRate
    view.setUint16(32, numChannels * (bitsPerSample / 8), true); // blockAlign
    view.setUint16(34, bitsPerSample, true); // bitsPerSample

    // DATA sub-chunk
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true); // subchunk2Size

    // Write PCM data
    new Uint8Array(buffer, 44).set(pcmData);

    return new Blob([view], { type: 'audio/wav' });
};


export const SpeechGeneratorModal: React.FC<SpeechGeneratorModalProps> = ({ isOpen, onClose }) => {
    const { t, language } = useLocalization();
    const speakerColors = ['#f59e0b', '#8b5cf6', '#10b981', '#3b82f6', '#ec4899'];
    const availableVoices = t('speechGenerator.voices') as Record<string, string>;

    const [mode, setMode] = useState<SpeechMode>('multi');
    const [styleSet, setStyleSet] = useState('default');
    const [customStyleInstruction, setCustomStyleInstruction] = useState('');
    const [dialogs, setDialogs] = useState<DialogEntry[]>([]);
    const [speakers, setSpeakers] = useState<SpeakerConfig[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    
    const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
    const previewAudioRef = useRef<HTMLAudioElement>(null);

    const [styleSuggestions, setStyleSuggestions] = useState<string[]>([]);
    const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);

    const formId = useId();

    const resetState = useCallback(() => {
        setMode('multi');
        setStyleSet('default');
        setCustomStyleInstruction('');
        const initialSpeaker1 = { id: generateUUID(), name: 'Speaker 1', voice: 'Zephyr' };
        const initialSpeaker2 = { id: generateUUID(), name: 'Speaker 2', voice: 'Puck' };
        setSpeakers([initialSpeaker1, initialSpeaker2]);
        setDialogs([
            { id: generateUUID(), speakerId: initialSpeaker1.id, text: '' },
            { id: generateUUID(), speakerId: initialSpeaker2.id, text: '' }
        ]);
        setIsLoading(false);
        setError(null);
        setPreviewingVoice(null);
        setStyleSuggestions([]);
        setIsGeneratingSuggestions(false);
        // Use a functional update to avoid a dependency on `audioUrl`, fixing the reset loop.
        setAudioUrl(currentUrl => {
            if (currentUrl) {
                URL.revokeObjectURL(currentUrl);
            }
            return null;
        });
    }, []);

    useEffect(() => {
        if (isOpen) {
            document.body.classList.add('modal-open');
            resetState();
        } else {
            document.body.classList.remove('modal-open');
        }
    }, [isOpen, resetState]);
    
    useEffect(() => {
        const scriptText = dialogs.map(d => d.text).filter(Boolean).join('\n');
    
        if (scriptText.trim().length < 20) { // Don't generate for very short text
            setStyleSuggestions([]);
            return;
        }
    
        const handler = setTimeout(async () => {
            setIsGeneratingSuggestions(true);
            try {
                const suggestions = await generateStyleSuggestions(scriptText, languageMap[language]);
                setStyleSuggestions(suggestions);
            } catch (e) {
                console.error("Failed to get style suggestions:", e);
                // Fail silently
                setStyleSuggestions([]);
            } finally {
                setIsGeneratingSuggestions(false);
            }
        }, 1500); // 1.5 second debounce
    
        return () => {
            clearTimeout(handler);
        };
    }, [dialogs, language]);

    const handleModeChange = (newMode: SpeechMode) => {
        setMode(newMode);
        if (newMode === 'single' && speakers.length > 1) {
            setSpeakers([speakers[0]]);
        } else if (newMode === 'multi' && speakers.length < 2) {
            setSpeakers([
                speakers[0] || { id: generateUUID(), name: 'Speaker 1', voice: 'Zephyr' },
                { id: generateUUID(), name: 'Speaker 2', voice: 'Puck' }
            ]);
        }
    };

    const addDialog = () => {
        const lastSpeakerIndex = speakers.findIndex(s => s.id === dialogs[dialogs.length - 1]?.speakerId);
        const nextSpeaker = speakers[(lastSpeakerIndex + 1) % speakers.length] || speakers[0];
        setDialogs([...dialogs, { id: generateUUID(), speakerId: nextSpeaker.id, text: '' }]);
    };

    const removeDialog = (id: string) => {
        if (dialogs.length > 1) {
            setDialogs(dialogs.filter(d => d.id !== id));
        }
    };
    
    const updateDialogText = (id: string, text: string) => {
        setDialogs(dialogs.map(d => d.id === id ? { ...d, text } : d));
    };
    
    const updateSpeaker = (id: string, field: 'name' | 'voice', value: string) => {
        setSpeakers(speakers.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const handleRun = async () => {
        setIsLoading(true);
        setError(null);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);

        try {
            let finalStyleInstruction = '';
            if (styleSet === 'custom') {
                finalStyleInstruction = customStyleInstruction;
            } else if (styleSet !== 'default') {
                finalStyleInstruction = styleSet;
            }

            let prompt = finalStyleInstruction.trim() ? `TTS the following with this style: ${finalStyleInstruction}\n` : 'TTS the following:\n';
            let speechConfig: any = {};

            if (mode === 'single') {
                prompt += dialogs.map(d => d.text).join('\n');
                speechConfig = {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: speakers[0].voice } }
                };
            } else {
                if (speakers.length < 2) throw new Error("Multi-speaker mode requires at least 2 speakers.");
                
                const speakerMap = new Map(speakers.map(s => [s.id, s.name]));
                const dialogText = dialogs.map(d => `${speakerMap.get(d.speakerId) || 'Unknown'}: ${d.text}`).join('\n');
                prompt = `${finalStyleInstruction.trim() ? `${finalStyleInstruction}\n` : ''}TTS the following conversation:\n${dialogText}`;
                
                speechConfig = {
                    multiSpeakerVoiceConfig: {
                        speakerVoiceConfigs: speakers.map(s => ({
                            speaker: s.name,
                            voiceConfig: { prebuiltVoiceConfig: { voiceName: s.voice } }
                        }))
                    }
                };
            }
            
            const audioBase64 = await generateSpeech(prompt, speechConfig);
            const audioBytes = decode(audioBase64);
            const wavBlob = createWavBlob(audioBytes, 24000, 1, 16); // 24kHz sample rate, 1 channel, 16 bits per sample
            setAudioUrl(URL.createObjectURL(wavBlob));

        } catch (e) {
            setError(e instanceof Error ? e.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handlePreviewVoice = async (voiceName: string) => {
        if (previewingVoice) return; // Prevent multiple previews at once

        setPreviewingVoice(voiceName);
        setError(null);
        try {
            const sampleText = t('speechGenerator.previewSampleText') as string;
            const speechConfig = {
                voiceConfig: { prebuiltVoiceConfig: { voiceName } },
            };
            const audioBase64 = await generateSpeech(sampleText, speechConfig);
            const audioBytes = decode(audioBase64);
            const wavBlob = createWavBlob(audioBytes, 24000, 1, 16);
            const url = URL.createObjectURL(wavBlob);
            
            if (previewAudioRef.current) {
                previewAudioRef.current.src = url;
                previewAudioRef.current.play();
                previewAudioRef.current.onended = () => {
                    URL.revokeObjectURL(url);
                };
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to generate preview.');
        } finally {
            setPreviewingVoice(null);
        }
    };
    
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 bg-base-100 z-50 flex flex-col font-sans" role="dialog" aria-modal="true">
            <header className="flex-shrink-0 bg-base-200/80 backdrop-blur-sm border-b border-base-300 w-full z-10">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center h-20">
                    <div className="flex items-center gap-3">
                        <SpeakerWaveIcon className="h-6 w-6 text-blue-400" />
                        <h2 className="text-xl font-bold text-blue-400">{t('speechGenerator.title') as string}</h2>
                    </div>
                </div>
            </header>
            
            <main className="flex-grow overflow-y-auto">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                    {/* Script Builder */}
                    <div className="md:col-span-2 bg-base-200 p-6 rounded-lg border border-base-300 space-y-4">
                        <h3 className="font-semibold text-lg">{t('speechGenerator.scriptBuilder') as string}</h3>
                        <div>
                            <label htmlFor={`${formId}-style-set`} className="block text-sm font-semibold text-gray-300 mb-1">{t('speechGenerator.styleInstructions') as string}</label>
                            <select
                                id={`${formId}-style-set`}
                                value={styleSet}
                                onChange={e => setStyleSet(e.target.value)}
                                className="w-full bg-base-300 border-gray-600 rounded-lg p-2.5 text-sm text-gray-200"
                                disabled={isGeneratingSuggestions}
                            >
                                {isGeneratingSuggestions ? (
                                    <option>{t('speechGenerator.generatingSuggestions') as string}</option>
                                ) : (
                                    <>
                                        <option value="default">{t('speechGenerator.styleDefault') as string}</option>
                                        {styleSuggestions.map((suggestion, index) => (
                                            <option key={index} value={suggestion}>{suggestion}</option>
                                        ))}
                                        <option value="custom">{t('speechGenerator.styleCustom') as string}</option>
                                    </>
                                )}
                            </select>
                            {styleSet === 'custom' && (
                                <input
                                    type="text"
                                    value={customStyleInstruction}
                                    onChange={e => setCustomStyleInstruction(e.target.value)}
                                    placeholder={t('speechGenerator.stylePlaceholder') as string}
                                    className="w-full mt-2 bg-base-300 border-gray-600 rounded-lg p-2.5 text-sm text-gray-200"
                                />
                            )}
                        </div>
                        <div className="space-y-3">
                            {dialogs.map((dialog) => {
                                const speaker = speakers.find(s => s.id === dialog.speakerId);
                                const speakerIndex = speakers.findIndex(s => s.id === dialog.speakerId);
                                const color = speakerColors[speakerIndex % speakerColors.length];

                                return (
                                    <div key={dialog.id} className="flex gap-3 items-start">
                                        {mode === 'multi' && (
                                            <div className="flex-shrink-0 flex items-center gap-2 pt-2 min-w-[100px]">
                                                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }}></span>
                                                <span className="text-sm font-medium text-gray-300 truncate">{speaker?.name || '...'}</span>
                                            </div>
                                        )}
                                        <textarea
                                            value={dialog.text}
                                            onChange={(e) => updateDialogText(dialog.id, e.target.value)}
                                            rows={2}
                                            className="w-full bg-base-300 border-gray-600 rounded-lg p-2.5 text-sm"
                                        />
                                        <button onClick={() => removeDialog(dialog.id)} disabled={dialogs.length <= 1} className="p-2 text-gray-500 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0">
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                        <button onClick={addDialog} className="flex items-center gap-2 text-sm font-semibold text-brand-light hover:text-white">
                            <PlusIcon className="h-4 w-4" />
                            {t('speechGenerator.addDialog') as string}
                        </button>
                    </div>

                    {/* Run Settings */}
                    <div className="md:col-span-1 bg-base-200 p-6 rounded-lg border border-base-300 space-y-4 md:sticky md:top-28">
                         <h3 className="font-semibold text-lg">{t('speechGenerator.runSettings') as string}</h3>
                        <div>
                             <label className="block text-sm font-semibold text-gray-300 mb-2">{t('speechGenerator.mode') as string}</label>
                             <div className="flex rounded-md shadow-sm">
                                <button onClick={() => handleModeChange('single')} className={`px-4 py-2 text-sm font-medium border border-gray-600 rounded-l-md flex-1 ${mode === 'single' ? 'bg-brand-primary text-white' : 'bg-base-300 hover:bg-gray-700'}`}>
                                    {t('speechGenerator.singleSpeaker') as string}
                                </button>
                                <button onClick={() => handleModeChange('multi')} className={`px-4 py-2 text-sm font-medium border border-gray-600 rounded-r-md flex-1 ${mode === 'multi' ? 'bg-brand-primary text-white' : 'bg-base-300 hover:bg-gray-700'}`}>
                                    {t('speechGenerator.multiSpeaker') as string}
                                </button>
                             </div>
                        </div>

                        <div>
                            <h4 className="font-semibold text-gray-300 mb-2">{t('speechGenerator.voiceSettings') as string}</h4>
                            <div className="space-y-4">
                                {speakers.map((speaker, index) => (
                                    <div key={speaker.id} className="p-3 bg-base-300/50 rounded-lg space-y-2">
                                        {mode === 'multi' && <h5 className="text-sm font-bold" style={{color: speakerColors[index % speakerColors.length]}}>{(t('speechGenerator.speakerSettings') as string).replace('{num}', (index + 1).toString())}</h5>}
                                        {mode === 'multi' && (
                                            <div>
                                                <label htmlFor={`${formId}-speaker-name-${index}`} className="text-xs font-semibold text-gray-400">{t('speechGenerator.name') as string}</label>
                                                <input type="text" id={`${formId}-speaker-name-${index}`} value={speaker.name} onChange={e => updateSpeaker(speaker.id, 'name', e.target.value)} className="w-full mt-1 bg-base-100/50 border-gray-600 rounded p-2 text-sm"/>
                                            </div>
                                        )}
                                        <div>
                                            <label htmlFor={`${formId}-speaker-voice-${index}`} className="text-xs font-semibold text-gray-400">{t('speechGenerator.voice') as string}</label>
                                            <div className="flex items-center gap-2 mt-1">
                                                <select id={`${formId}-speaker-voice-${index}`} value={speaker.voice} onChange={e => updateSpeaker(speaker.id, 'voice', e.target.value)} className="w-full bg-base-100/50 border-gray-600 rounded p-2 text-sm">
                                                    {Object.entries(availableVoices).map(([key, name]) => <option key={key} value={key}>{name}</option>)}
                                                </select>
                                                <button 
                                                    onClick={() => handlePreviewVoice(speaker.voice)} 
                                                    disabled={!!previewingVoice} 
                                                    className="p-2 bg-base-100/50 border-gray-600 border rounded text-gray-300 hover:bg-gray-700 disabled:opacity-50"
                                                    title={t('speechGenerator.preview') as string}
                                                >
                                                    {previewingVoice === speaker.voice ? (
                                                        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                                    ) : (
                                                        <SpeakerWaveIcon className="h-4 w-4" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {audioUrl && (
                            <div className="border-t border-base-300 pt-4">
                                <h4 className="font-semibold text-gray-300 mb-2">{t('speechGenerator.audioOutput') as string}</h4>
                                <audio controls src={audioUrl} className="w-full">
                                    Your browser does not support the audio element.
                                </audio>
                                <a href={audioUrl} download="speech_output.wav" className="mt-2 inline-block text-sm text-brand-light hover:underline">
                                    {t('speechGenerator.downloadAsWav') as string}
                                </a>
                            </div>
                        )}
                        {error && <p className="text-red-400 text-sm">{error}</p>}
                    </div>
                </div>
                <audio ref={previewAudioRef} hidden />
            </main>
            <footer className="flex-shrink-0 bg-base-200/80 backdrop-blur-sm border-t border-base-300 w-full sticky bottom-0 z-10">
                 <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-end h-20 gap-4">
                    <button onClick={onClose} className="px-6 py-2 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-200 bg-base-300 hover:bg-gray-700">
                        {t('closeButton') as string}
                    </button>
                    <button
                        onClick={handleRun}
                        disabled={isLoading}
                        className="px-8 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-brand-primary hover:bg-brand-dark disabled:bg-gray-600"
                    >
                         {isLoading ? t('speechGenerator.generating') as string : t('speechGenerator.run') as string}
                    </button>
                 </div>
            </footer>
        </div>
    );
};