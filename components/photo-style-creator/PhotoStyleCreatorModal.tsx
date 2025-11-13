
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useLocalization, languageMap } from '../../i18n';
import type { StoredReferenceFile, PhotoStyleCreatorState, PhotoType, PhotoStyleRecommendations, ReferenceFile, MusicThumbnailStyle } from '../../types';
import { 
    generatePhotoStyleImages, 
    generatePhotoStyleRecommendations, 
    generateTextFromImage,
    generateMusicThumbnailStyle,
    generateMusicThumbnailBackground,
    generatePromptFromInspirationImage
} from '../../services/storyCreatorService';
import { XCircleIcon } from '../icons/XCircleIcon';
import { UploadIcon } from '../icons/UploadIcon';
import { PhotoIcon } from '../icons/PhotoIcon';
import { DownloadIcon } from '../icons/DownloadIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { ChevronLeftIcon } from '../icons/ChevronLeftIcon';
import { ChevronRightIcon } from '../icons/ChevronRightIcon';
import { MagicWandIcon } from '../icons/MagicWandIcon';

interface PhotoStyleCreatorModalProps {
    isOpen: boolean;
    onClose: () => void;
    apiKey: string | null;
    onApiKeyError: () => void;
}

const generateUUID = () => window.crypto.randomUUID();
const MAX_FILE_SIZE_MB = 10;
const SUPPORTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
const MAX_VIDEO_DURATION_S = 10;

const initialPhotoStyleCreatorState: PhotoStyleCreatorState = {
    photoType: 'artist_model',
    referenceFiles: [],
    productFiles: [],
    numberOfImages: 3,
    aspectRatio: '1:1',
    // Artist/Model
    prompt: '',
    facialExpression: 'happy',
    customFacialExpression: '',
    handGesture: 'none',
    customHandGesture: '',
    bodyPose: 'standing',
    customBodyPose: '',
    pose: 'relaxed',
    customPose: '',
    backgroundColor: '#FFFFFF',
    // Product
    productDescription: '',
    productShotType: 'studio',
    customProductShotType: '',
    productLighting: 'soft',
    customProductLighting: '',
    productBackground: 'minimalist_white',
    customProductBackground: '',
    // Thumbnail
    thumbnailTopic: '',
    thumbnailStyle: 'vlog',
    customThumbnailStyle: '',
    thumbnailOverlayText: '',
    thumbnailFont: 'bold',
    customThumbnailFont: '',
    thumbnailPalette: 'vibrant',
    customThumbnailPalette: '',
    thumbnailMode: 'normal',
    // Music Thumbnail
    musicAiThemePrompt: '',
    musicInspirationImage: null,
    musicUseInspiration: false,
    musicTitle: 'My Awesome Playlist\n- 2024 -',
    musicSongList: `01. - Artist Name - Song Title 103.\n02. - Another Artist - Another Song Musician\n02. - Cool Band - Best Track Ever\n02. - Musician - The Last Song`,
    musicAutoClean: true,
    musicTitleFontSize: 80,
    musicSongsFontSize: 24,
    musicTitleFont: 'Oswald',
    musicSongsFont: 'Inter',
    musicSongsColor: '#FFFFFF',
    musicUseGradient: true,
    musicGradientStart: '#FF00FF',
    musicGradientEnd: '#00FFFF',
    musicTitleColor: '#FFFFFF',
    musicUseShadow: true,
    musicShadowColor: '#000000',
    musicShadowBlur: 10,
    musicTitleAlign: 'center',
    musicColumnCount: 2,
    musicCanvasBgColor: '#111827',
};


// --- Helper Components ---

interface SmartDropdownProps<K extends keyof PhotoStyleCreatorState> {
    label: string;
    field: K;
    customField: K;
    options: Record<string, string>;
    recs?: string[];
    formState: PhotoStyleCreatorState;
    handleStateChange: <F extends keyof PhotoStyleCreatorState>(key: F, value: PhotoStyleCreatorState[F]) => void;
    t: (key: string) => string;
}

const SmartDropdown = <K extends keyof PhotoStyleCreatorState>({
    label,
    field,
    customField,
    options,
    recs,
    formState,
    handleStateChange,
    t
}: SmartDropdownProps<K>) => (
    <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
        <select
            value={formState[field] as string}
            onChange={e => handleStateChange(field, e.target.value as any)}
            className="w-full bg-base-300 border-gray-600 rounded-md p-2.5 text-sm text-gray-200"
        >
            {recs && recs.length > 0 && (
                <optgroup label={t('photoStyleCreator.aiRecommendations')}>
                    {recs.map(rec => <option key={rec} value={rec}>{rec}</option>)}
                </optgroup>
            )}
            <optgroup label={t('photoStyleCreator.standardOptions')}>
                {Object.entries(options).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </optgroup>
            <option value="custom">{t('photoStyleCreator.custom')}</option>
        </select>
        {formState[field] === 'custom' && (
            <input
                type="text"
                value={formState[customField] as string}
                onChange={e => handleStateChange(customField, e.target.value as any)}
                placeholder={t('photoStyleCreator.customPlaceholder')}
                className="w-full bg-base-200 border-gray-500 rounded-md p-2.5 text-sm mt-2"
            />
        )}
    </div>
);

interface RadioGroupProps {
    value: string | number;
    onChange: (value: any) => void;
    options: { value: string | number; label: string }[];
}

const RadioGroup: React.FC<RadioGroupProps> = ({ value, onChange, options }) => (
    <div className="grid grid-cols-3 gap-2">
        {options.map(opt => (
            <button
                key={opt.value}
                type="button"
                onClick={() => onChange(opt.value)}
                className={`px-3 py-2.5 text-sm rounded-md text-center transition-colors ${value === opt.value ? 'bg-brand-primary text-white font-semibold' : 'bg-base-300 hover:bg-base-200'}`}
            >{opt.label}</button>
        ))}
    </div>
);


export const PhotoStyleCreatorModal: React.FC<PhotoStyleCreatorModalProps> = ({ isOpen, onClose, apiKey, onApiKeyError }) => {
    const { t, language } = useLocalization();
    const [formState, setFormState] = useState<PhotoStyleCreatorState>(initialPhotoStyleCreatorState);
    
    const [localReferenceFiles, setLocalReferenceFiles] = useState<ReferenceFile[]>([]);
    const [currentReferenceFileIndex, setCurrentReferenceFileIndex] = useState(0);
    const [localProductFiles, setLocalProductFiles] = useState<ReferenceFile[]>([]);
    const [currentProductFileIndex, setCurrentProductFileIndex] = useState(0);

    const [generatedImages, setGeneratedImages] = useState<{ base64: string, mimeType: string }[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<React.ReactNode | null>(null);
    
    const [recommendations, setRecommendations] = useState<PhotoStyleRecommendations | null>(null);
    const [isGeneratingRecs, setIsGeneratingRecs] = useState(false);
    const [autoGeneratingField, setAutoGeneratingField] = useState<string | null>(null);
    
    // Music Thumbnail Specific State
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null);
    const [titleStyleEffects, setTitleStyleEffects] = useState<any>(null);
    const [musicInspirationFile, setMusicInspirationFile] = useState<File | null>(null);
    const [loadingMessage, setLoadingMessage] = useState<string>('');
    const [isMusicLoading, setIsMusicLoading] = useState(false);
    
    const handleApiError = useCallback((e: unknown) => {
        console.error("API Error in Photo Style Creator:", e);
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
        
        if (errorMessage.includes("API key not valid") || errorMessage.includes("API_KEY_INVALID")) {
            onApiKeyError();
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
    }, [t, onApiKeyError]);


    useEffect(() => {
        if (isOpen) {
            document.body.classList.add('modal-open');
        } else {
            document.body.classList.remove('modal-open');
            // Clean up local state and object URLs when closing
            [...localReferenceFiles, ...localProductFiles].forEach(file => URL.revokeObjectURL(file.previewUrl));
            setLocalReferenceFiles([]);
            setLocalProductFiles([]);
            setFormState(initialPhotoStyleCreatorState);
            setGeneratedImages([]);
            setBackgroundImage(null);
            setTitleStyleEffects(null);
            setMusicInspirationFile(null);
            setError(null);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    // Effect to fetch AI recommendations when a reference image changes
    useEffect(() => {
        const referenceFiles = formState.photoType === 'product' ? formState.productFiles : formState.referenceFiles;

        if (referenceFiles.length > 0 && (formState.photoType !== 'thumbnail' || formState.thumbnailMode === 'normal')) {
            const getRecs = async () => {
                if (!apiKey) return;
                setIsGeneratingRecs(true);
                setRecommendations(null); // Clear old recs
                try {
                    const recs = await generatePhotoStyleRecommendations(referenceFiles, formState.photoType, languageMap[language], apiKey);
                    setRecommendations(recs);
                } catch (e) {
                    console.error("Failed to get recommendations:", e);
                    handleApiError(e);
                } finally {
                    setIsGeneratingRecs(false);
                }
            };
            getRecs();
        } else {
            setRecommendations(null); // Clear recs if image is removed
        }
    }, [formState.referenceFiles, formState.productFiles, formState.photoType, language, formState.thumbnailMode, apiKey, handleApiError]);


    const handleStateChange = <K extends keyof PhotoStyleCreatorState>(key: K, value: PhotoStyleCreatorState[K]) => {
        setFormState(prev => ({ ...prev, [key]: value }));
    };

    const updateFiles = useCallback((updatedLocalFiles: ReferenceFile[], type: 'reference' | 'product') => {
        const serializableFiles: StoredReferenceFile[] = updatedLocalFiles.map(f => ({
            id: f.id, base64: f.base64, mimeType: f.mimeType, type: f.type
        }));
        if (type === 'reference') {
            setLocalReferenceFiles(updatedLocalFiles);
            handleStateChange('referenceFiles', serializableFiles);
        } else {
            setLocalProductFiles(updatedLocalFiles);
            handleStateChange('productFiles', serializableFiles);
        }
    }, [handleStateChange]);

    const validateAndAddFiles = useCallback(async (files: FileList, type: 'reference' | 'product') => {
        const processFile = (file: File): Promise<ReferenceFile | null> => {
            return new Promise(async (resolve) => {
                const fileType = file.type.startsWith('video') ? 'video' : 'image';
                
                if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
                    alert(`File ${file.name} is too large. Max size is ${MAX_FILE_SIZE_MB}MB.`);
                    resolve(null); return;
                }
                if (fileType === 'image' && !SUPPORTED_IMAGE_TYPES.includes(file.type)) {
                    alert(`Unsupported image type: ${file.type}`);
                    resolve(null); return;
                }
                if (fileType === 'video' && !SUPPORTED_VIDEO_TYPES.includes(file.type)) {
                    alert(`Unsupported video type: ${file.type}`);
                    resolve(null); return;
                }

                if (fileType === 'video') {
                    try {
                        await new Promise<void>((res, rej) => {
                            const video = document.createElement('video');
                            video.preload = 'metadata';
                            video.onloadedmetadata = () => {
                                window.URL.revokeObjectURL(video.src);
                                if (video.duration > MAX_VIDEO_DURATION_S) {
                                    rej(new Error(`Video ${file.name} is too long (${video.duration.toFixed(1)}s). Max ${MAX_VIDEO_DURATION_S}s allowed.`));
                                } else {
                                    res();
                                }
                            };
                            video.onerror = () => rej(new Error('Could not load video metadata.'));
                            video.src = URL.createObjectURL(file);
                        });
                    } catch (error) {
                        alert((error as Error).message);
                        resolve(null); return;
                    }
                }

                const reader = new FileReader();
                reader.onload = (e) => {
                    const base64 = (e.target?.result as string).split(',')[1];
                    const previewUrl = URL.createObjectURL(file);
                    resolve({ id: generateUUID(), base64, mimeType: file.type, previewUrl, type: fileType, file });
                };
                reader.onerror = () => { alert(`Error reading file ${file.name}`); resolve(null); };
                reader.readAsDataURL(file);
            });
        };

        const currentFiles = type === 'reference' ? localReferenceFiles : localProductFiles;
        const filePromises = Array.from(files).map(processFile);
        const newFiles = (await Promise.all(filePromises)).filter((f): f is ReferenceFile => f !== null);

        if (newFiles.length > 0) {
            updateFiles([...currentFiles, ...newFiles], type);
        }
    }, [localReferenceFiles, localProductFiles, updateFiles]);
    
    
    const handleDownload = (imageData: { base64: string, mimeType: string }) => {
        const link = document.createElement('a');
        link.href = `data:${imageData.mimeType};base64,${imageData.base64}`;
        link.download = `generated_image_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleGenerate = async () => {
        if (!apiKey) {
            onApiKeyError();
            return;
        }
        setError(null);
        if (formState.photoType === 'artist_model' && formState.referenceFiles.length === 0 && !formState.prompt) {
            setError(t('photoStyleCreator.errorNoPrompt') as string);
            return;
        }
        if (formState.photoType === 'product' && !formState.productDescription) {
            setError(t('photoStyleCreator.errorNoPrompt') as string);
            return;
        }
        if (formState.photoType === 'thumbnail' && !formState.thumbnailTopic) {
            setError(t('photoStyleCreator.errorNoPrompt') as string);
            return;
        }
        
        setIsLoading(true);
        setGeneratedImages([]);
        try {
            const images = await generatePhotoStyleImages(formState, apiKey);
            setGeneratedImages(images);
        } catch (e) {
            handleApiError(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAutoGenerate = async (
        type: 'description' | 'overlay',
        targetField: 'prompt' | 'productDescription' | 'thumbnailTopic' | 'thumbnailOverlayText'
    ) => {
        if (!apiKey) {
            onApiKeyError();
            return;
        }
        let filesToUse: ReferenceFile[] = [];
        if (targetField === 'productDescription') {
            filesToUse = localProductFiles;
        } else {
            filesToUse = localReferenceFiles;
        }
    
        if (filesToUse.length === 0) {
            setError(t('photoStyleCreator.errorNoPhoto') as string);
            return;
        }
        
        setAutoGeneratingField(targetField);
        setError(null);
    
        try {
            const text = await generateTextFromImage(filesToUse, type, languageMap[language], apiKey);
            handleStateChange(targetField, text as any);
        } catch (e) {
            handleApiError(e);
        } finally {
            setAutoGeneratingField(null);
        }
    };

    const MultiFileUploader: React.FC<{
        label: string;
        type: 'reference' | 'product';
    }> = ({ label, type }) => {
        const files = type === 'reference' ? localReferenceFiles : localProductFiles;
        const currentIndex = type === 'reference' ? currentReferenceFileIndex : currentProductFileIndex;
        const setCurrentIndex = type === 'reference' ? setCurrentReferenceFileIndex : setCurrentProductFileIndex;
        const fileInputId = `photo-style-uploader-${type}`;
        
        const removeFile = (id: string) => {
            const newFiles = files.filter(f => {
                 if (f.id === id) {
                    URL.revokeObjectURL(f.previewUrl);
                    return false;
                }
                return true;
            });
            if (newFiles.length === 0) setCurrentIndex(0);
            else if (currentIndex >= newFiles.length) setCurrentIndex(newFiles.length - 1);
            updateFiles(newFiles, type);
        };

        const goToPrevious = () => setCurrentIndex(prev => prev === 0 ? files.length - 1 : prev - 1);
        const goToNext = () => setCurrentIndex(prev => prev === files.length - 1 ? 0 : prev + 1);
        const currentFile = files[currentIndex];

        return (
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
                 <input type="file" id={fileInputId} className="hidden" multiple accept={[...SUPPORTED_IMAGE_TYPES, ...SUPPORTED_VIDEO_TYPES].join(',')} onChange={(e) => e.target.files && validateAndAddFiles(e.target.files, type)} />
                 <div className="p-2 rounded-lg bg-base-300/50 border-2 border-dashed border-gray-600 min-h-[180px] flex flex-col justify-between">
                    {files.length === 0 ? (
                        <label htmlFor={fileInputId} className="cursor-pointer flex-grow flex flex-col items-center justify-center p-2 rounded-lg text-center hover:bg-base-300/30 transition-colors">
                            <UploadIcon className="h-8 w-8 text-gray-400"/>
                            <span className="text-sm mt-1 text-gray-400">{String(t('photoStyleCreator.uploadPlaceholder'))}</span>
                        </label>
                    ) : (
                        <div className="relative flex-grow flex items-center justify-center">
                            {files.length > 1 && <button onClick={goToPrevious} className="absolute left-0 z-10 p-2 bg-base-200/50 rounded-full hover:bg-base-200" aria-label="Previous"><ChevronLeftIcon /></button>}
                            <div className="w-full h-full max-h-48 aspect-video relative group flex items-center justify-center">
                                {currentFile && (
                                    <>
                                        {currentFile.type === 'image' ? <img src={currentFile.previewUrl} alt="Preview" className="max-w-full max-h-full object-contain rounded-md"/> : <video controls src={currentFile.previewUrl} className="max-w-full max-h-full object-contain rounded-md" />}
                                        <button onClick={() => removeFile(currentFile.id)} className="absolute top-1 right-1 p-0.5 bg-black/60 rounded-full text-white hover:bg-red-500" aria-label="Delete"><TrashIcon className="h-4 w-4" /></button>
                                    </>
                                )}
                            </div>
                            {files.length > 1 && <button onClick={goToNext} className="absolute right-0 z-10 p-2 bg-base-200/50 rounded-full hover:bg-base-200" aria-label="Next"><ChevronRightIcon /></button>}
                        </div>
                    )}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-700/50">
                        <div className="text-xs text-gray-500">
                            {files.length > 0 ? `${currentIndex + 1} / ${files.length}` : String(t('photoStyleCreator.uploadSubtitle'))}
                        </div>
                        <label htmlFor={fileInputId} className="cursor-pointer p-2 rounded-lg text-xs flex items-center gap-1 font-semibold text-brand-light hover:bg-brand-primary/20">
                            <PlusIcon className="h-4 w-4"/> {String(t('characterWorkshop.uploadButton'))}
                        </label>
                    </div>
                </div>
            </div>
        );
    };
    
    // --- CANVAS DRAWING LOGIC FOR MUSIC THUMBNAIL ---

    const drawOnCanvas = useCallback((
        targetCtx: CanvasRenderingContext2D,
        canvasWidth: number,
        canvasHeight: number,
        scaleFactor = 1
    ) => {
        const resetCanvasEffects = (ctx: CanvasRenderingContext2D) => {
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        };

        resetCanvasEffects(targetCtx);
        targetCtx.clearRect(0, 0, canvasWidth, canvasHeight);

        // Background
        targetCtx.fillStyle = formState.musicCanvasBgColor;
        targetCtx.fillRect(0, 0, canvasWidth, canvasHeight);

        if (backgroundImage) {
            const hRatio = canvasWidth / backgroundImage.width;
            const vRatio = canvasHeight / backgroundImage.height;
            const ratio = Math.max(hRatio, vRatio);
            const centerX = (canvasWidth - backgroundImage.width * ratio) / 2;
            const centerY = (canvasHeight - backgroundImage.height * ratio) / 2;
            targetCtx.drawImage(backgroundImage, 0, 0, backgroundImage.width, backgroundImage.height, centerX, centerY, backgroundImage.width * ratio, backgroundImage.height * ratio);
        }

        const sidePadding = 50 * scaleFactor;

        // Title
        const titleLines = formState.musicTitle.split('\n').map(line => line.trim()).filter(Boolean);
        if (titleLines.length > 0) {
            const getFittingFontSize = (text: string, maxWidth: number, maxFontSize: number, fontFace: string) => {
                let fontSize = maxFontSize;
                targetCtx.font = `bold ${fontSize}px "${fontFace}"`;
                while (targetCtx.measureText(text).width > maxWidth && fontSize > 10) {
                    fontSize--;
                    targetCtx.font = `bold ${fontSize}px "${fontFace}"`;
                }
                return fontSize;
            };

            const maxTitleFontSize = formState.musicTitleFontSize * scaleFactor;
            const titleFont = formState.musicTitleFont;
            const longestLine = titleLines.reduce((a, b) => a.length > b.length ? a : b, "");
            const actualTitleFontSize = getFittingFontSize(longestLine, canvasWidth - (sidePadding * 2), maxTitleFontSize, titleFont);
            
            const titleAlign = formState.musicTitleAlign;
            const titleX = (titleAlign === 'left') ? sidePadding : (titleAlign === 'center') ? canvasWidth / 2 : canvasWidth - sidePadding;
            const lineHeight = actualTitleFontSize * 1.1;
            const totalTitleHeight = (titleLines.length -1) * lineHeight;
            let currentY = (130 * scaleFactor) - (totalTitleHeight / 2);

            targetCtx.font = `bold ${actualTitleFontSize}px "${titleFont}"`;
            targetCtx.textAlign = titleAlign;

            titleLines.forEach(line => {
                if (formState.musicUseShadow) {
                    targetCtx.shadowColor = formState.musicShadowColor;
                    targetCtx.shadowBlur = formState.musicShadowBlur * scaleFactor;
                    targetCtx.shadowOffsetX = 5 * scaleFactor;
                    targetCtx.shadowOffsetY = 5 * scaleFactor;
                }

                if (formState.musicUseGradient) {
                    const gradient = targetCtx.createLinearGradient(0, currentY - actualTitleFontSize, 0, currentY);
                    gradient.addColorStop(0, formState.musicGradientStart);
                    gradient.addColorStop(1, formState.musicGradientEnd);
                    targetCtx.fillStyle = gradient;
                } else {
                    targetCtx.fillStyle = formState.musicTitleColor;
                }

                if (titleStyleEffects?.outline && titleStyleEffects.outline.width > 0) {
                    targetCtx.strokeStyle = titleStyleEffects.outline.color;
                    targetCtx.lineWidth = titleStyleEffects.outline.width * scaleFactor;
                    targetCtx.strokeText(line, titleX, currentY);
                }
                targetCtx.fillText(line, titleX, currentY);
                currentY += lineHeight;
            });
            resetCanvasEffects(targetCtx);
        }

        // Song List
        const songsRaw = formState.musicSongList;
        let songs = songsRaw.split('\n').map(s => s.trim()).filter(Boolean);
        if (formState.musicAutoClean) {
            songs = songs.map(song => song.replace(/^((\d{1,2}:)?\d{1,2}:\d{1,2}(\.\d{1,3})?\s*)?(\d+\.)?\s*/, '').trim());
        }
        
        targetCtx.fillStyle = formState.musicSongsColor;
        const songFontSize = formState.musicSongsFontSize * scaleFactor;
        targetCtx.font = `${songFontSize}px "${formState.musicSongsFont}"`;
        targetCtx.textAlign = 'left';
        
        const startY = 220 * scaleFactor;
        const numColumns = formState.musicColumnCount;
        const columnPadding = 20 * scaleFactor;
        
        const totalPadding = (sidePadding * 2) + (columnPadding * (numColumns - 1));
        const columnWidth = (canvasWidth - totalPadding) / numColumns;
        const songsPerColumn = Math.ceil(songs.length / numColumns);
        
        for (let col = 0; col < numColumns; col++) {
            const colStartX = sidePadding + (columnWidth + columnPadding) * col;
            for (let i = col * songsPerColumn; i < Math.min((col + 1) * songsPerColumn, songs.length); i++) {
                const songIndexInCol = i - (col * songsPerColumn);
                targetCtx.fillText(`${(i + 1).toString().padStart(2, '0')}. ${songs[i]}`, colStartX, startY + songIndexInCol * (songFontSize + (8 * scaleFactor)));
            }
        }
    }, [formState, backgroundImage, titleStyleEffects]);
    
    useEffect(() => {
        if (formState.photoType === 'thumbnail' && formState.thumbnailMode === 'music') {
            const canvas = canvasRef.current;
            if (canvas) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    drawOnCanvas(ctx, canvas.width, canvas.height);
                }
            }
        }
    }, [formState, backgroundImage, titleStyleEffects, drawOnCanvas]);

    const handleMusicInspirationUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (formState.musicUseInspiration) {
            setMusicInspirationFile(file);
            setBackgroundImage(null); // Clear direct background if switching to inspiration
        } else {
            setMusicInspirationFile(null); // Clear inspiration if switching to direct
            const reader = new FileReader();
            reader.onload = (ev) => {
                const img = new Image();
                img.onload = () => setBackgroundImage(img);
                img.src = ev.target.result as string;
            };
            reader.readAsDataURL(file);
        }
        e.target.value = '';
    };
    
    const handleGenerateAIBg = async () => {
        if (!apiKey) { onApiKeyError(); return; }
        setIsMusicLoading(true);
        setError(null);
        try {
            if (musicInspirationFile) {
                setLoadingMessage(t('photoStyleCreator.thumbnailMusic.analyzing') as string);
                const reader = new FileReader();
                reader.onloadend = async () => {
                    const base64Data = (reader.result as string).split(',')[1];
                    const generatedPrompt = await generatePromptFromInspirationImage({ base64: base64Data, mimeType: musicInspirationFile.type }, apiKey);
                    handleStateChange('musicAiThemePrompt', generatedPrompt as any);
                    setLoadingMessage(t('photoStyleCreator.thumbnailMusic.generatingBg') as string);
                    const { base64, mimeType } = await generateMusicThumbnailBackground(generatedPrompt, apiKey);
                    const img = new Image();
                    img.onload = () => setBackgroundImage(img);
                    img.src = `data:${mimeType};base64,${base64}`;
                };
                reader.readAsDataURL(musicInspirationFile);
            } else {
                if (!formState.musicAiThemePrompt.trim()) {
                    alert(t('photoStyleCreator.thumbnailMusic.errorTheme'));
                    return;
                }
                setLoadingMessage(t('photoStyleCreator.thumbnailMusic.generatingBg') as string);
                const { base64, mimeType } = await generateMusicThumbnailBackground(formState.musicAiThemePrompt, apiKey);
                const img = new Image();
                img.onload = () => setBackgroundImage(img);
                img.src = `data:${mimeType};base64,${base64}`;
            }
        } catch (e) {
            handleApiError(e)
        } finally {
            setIsMusicLoading(false);
            setLoadingMessage('');
        }
    };
    
    const handleGenerateAITextStyle = async () => {
        if (!apiKey) { onApiKeyError(); return; }
        if (!formState.musicAiThemePrompt.trim()) {
            alert(t('photoStyleCreator.thumbnailMusic.errorTheme'));
            return;
        }
        setIsMusicLoading(true);
        setLoadingMessage(t('photoStyleCreator.thumbnailMusic.generatingStyle') as string);
        setError(null);
        try {
            const styles = await generateMusicThumbnailStyle(formState.musicAiThemePrompt, languageMap[language], apiKey);
            handleStateChange('musicTitleFont', styles.fontFamily as any);
            handleStateChange('musicSongsFont', styles.fontFamily as any);
            handleStateChange('musicSongsColor', styles.songsColor as any);
            
            if (styles.gradient) {
                handleStateChange('musicUseGradient', true as any);
                handleStateChange('musicGradientStart', styles.gradient.start as any);
                handleStateChange('musicGradientEnd', styles.gradient.end as any);
            } else {
                handleStateChange('musicUseGradient', false as any);
                handleStateChange('musicTitleColor', (styles.solidColor || '#FFFFFF') as any);
            }

            if (styles.shadow) {
                handleStateChange('musicUseShadow', true as any);
                handleStateChange('musicShadowColor', styles.shadow.color as any);
                handleStateChange('musicShadowBlur', styles.shadow.blur as any);
            } else {
                handleStateChange('musicUseShadow', false as any);
            }

            setTitleStyleEffects(styles.outline ? { outline: styles.outline } : null);
        } catch (e) {
             handleApiError(e)
        } finally {
             setIsMusicLoading(false);
             setLoadingMessage('');
        }
    };
    
    const handleDownloadHD = () => {
        const hdCanvas = document.createElement('canvas');
        hdCanvas.width = 1920;
        hdCanvas.height = 1080;
        const hdCtx = hdCanvas.getContext('2d');
        if (hdCtx) {
            drawOnCanvas(hdCtx, 1920, 1080, 1920 / 800);
            const link = document.createElement('a');
            link.download = 'thumbnail_playlist_HD.jpeg';
            link.href = hdCanvas.toDataURL('image/jpeg', 0.9);
            link.click();
        }
    };

    const handleClearMusicForm = () => {
        const musicKeys = Object.keys(initialPhotoStyleCreatorState).filter(k => k.startsWith('music'));
        const resetState = musicKeys.reduce((acc, key) => {
            // @ts-ignore
            acc[key] = initialPhotoStyleCreatorState[key];
            return acc;
        }, {} as Partial<PhotoStyleCreatorState>);
        setFormState(prev => ({ ...prev, ...resetState }));
        setBackgroundImage(null);
        setTitleStyleEffects(null);
        setMusicInspirationFile(null);
    };

    const renderNormalThumbnailControls = () => (
         <>
            <fieldset className="border-t border-base-300 pt-5 space-y-5">
                 <legend className="text-base font-semibold text-gray-200 -translate-y-3 bg-base-200/50 px-2">{String(t('photoStyleCreator.groups.subject'))}</legend>
                <MultiFileUploader label={t('photoStyleCreator.thumbnail.referenceImage') as string} type="reference" />
                <div>
                     <label className="block text-sm font-medium text-gray-300 mb-2">{String(t('photoStyleCreator.thumbnail.topic'))}</label>
                     <div className="relative">
                        <textarea value={formState.thumbnailTopic} onChange={e => handleStateChange('thumbnailTopic', e.target.value)} rows={3} placeholder={t('photoStyleCreator.thumbnail.topicPlaceholder') as string} className="w-full bg-base-300 border-gray-600 rounded-md p-2.5 text-sm" />
                        <button type="button" onClick={() => handleAutoGenerate('description', 'thumbnailTopic')} disabled={!!autoGeneratingField || localReferenceFiles.length === 0} className="absolute top-2 right-2 p-1.5 bg-base-100 text-amber-300 rounded-full hover:bg-base-200/50 disabled:opacity-50 disabled:cursor-not-allowed" title={t('photoStyleCreator.generateWithAi') as string}>
                            {autoGeneratingField === 'thumbnailTopic' ? <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div> : <MagicWandIcon className="h-4 w-4" />}
                        </button>
                    </div>
                </div>
                <div>
                     <label className="block text-sm font-medium text-gray-300 mb-2">{String(t('photoStyleCreator.thumbnail.overlayText'))}</label>
                     <div className="relative">
                        <input type="text" value={formState.thumbnailOverlayText} onChange={e => handleStateChange('thumbnailOverlayText', e.target.value)} placeholder={t('photoStyleCreator.thumbnail.overlayTextPlaceholder') as string} className="w-full bg-base-300 border-gray-600 rounded-md p-2.5 text-sm" />
                        <button type="button" onClick={() => handleAutoGenerate('overlay', 'thumbnailOverlayText')} disabled={!!autoGeneratingField || localReferenceFiles.length === 0} className="absolute top-1/2 -translate-y-1/2 right-2 p-1.5 bg-base-100 text-amber-300 rounded-full hover:bg-base-200/50 disabled:opacity-50 disabled:cursor-not-allowed" title={t('photoStyleCreator.generateWithAi') as string}>
                            {autoGeneratingField === 'thumbnailOverlayText' ? <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div> : <MagicWandIcon className="h-4 w-4" />}
                        </button>
                    </div>
                </div>
            </fieldset>
            
            <fieldset className="border-t border-base-300 pt-5 space-y-5">
                <legend className="text-base font-semibold text-gray-200 -translate-y-3 bg-base-200/50 px-2">{String(t('photoStyleCreator.groups.style'))}</legend>
                <SmartDropdown t={(key) => t(key) as string} formState={formState} handleStateChange={handleStateChange} label={t('photoStyleCreator.thumbnail.style') as string} field="thumbnailStyle" customField="customThumbnailStyle" options={t('photoStyleCreator.thumbnail.styles') as any} recs={recommendations?.thumbnailStyle} />
                <SmartDropdown t={(key) => t(key) as string} formState={formState} handleStateChange={handleStateChange} label={t('photoStyleCreator.thumbnail.font') as string} field="thumbnailFont" customField="customThumbnailFont" options={t('photoStyleCreator.thumbnail.fonts') as any} recs={recommendations?.thumbnailFont} />
                <SmartDropdown t={(key) => t(key) as string} formState={formState} handleStateChange={handleStateChange} label={t('photoStyleCreator.thumbnail.palette') as string} field="thumbnailPalette" customField="customThumbnailPalette" options={t('photoStyleCreator.thumbnail.palettes') as any} recs={recommendations?.thumbnailPalette} />
            </fieldset>
        </>
    );
    const renderArtistModelControls = () => (
         <>
            <fieldset className="border-t border-base-300 pt-5 space-y-5">
                 <legend className="text-base font-semibold text-gray-200 -translate-y-3 bg-base-200/50 px-2">{String(t('photoStyleCreator.groups.subject'))}</legend>
                <MultiFileUploader label={t('photoStyleCreator.artist.referencePhoto') as string} type="reference" />
                <div>
                     <label className="block text-sm font-medium text-gray-300 mb-2">{String(t('photoStyleCreator.artist.prompt'))}</label>
                     <div className="relative">
                        <textarea value={formState.prompt} onChange={e => handleStateChange('prompt', e.target.value)} rows={3} placeholder={t('photoStyleCreator.artist.promptPlaceholder') as string} className="w-full bg-base-300 border-gray-600 rounded-md p-2.5 text-sm" />
                        <button type="button" onClick={() => handleAutoGenerate('description', 'prompt')} disabled={!!autoGeneratingField || localReferenceFiles.length === 0} className="absolute top-2 right-2 p-1.5 bg-base-100 text-amber-300 rounded-full hover:bg-base-200/50 disabled:opacity-50 disabled:cursor-not-allowed" title={t('photoStyleCreator.generateWithAi') as string}>
                            {autoGeneratingField === 'prompt' ? <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div> : <MagicWandIcon className="h-4 w-4" />}
                        </button>
                    </div>
                </div>
                <MultiFileUploader label={t('photoStyleCreator.product.productPhoto') as string} type="product" />
            </fieldset>
            
            <fieldset className="border-t border-base-300 pt-5 space-y-5">
                <legend className="text-base font-semibold text-gray-200 -translate-y-3 bg-base-200/50 px-2">{String(t('photoStyleCreator.groups.style'))}</legend>
                <SmartDropdown t={(key) => t(key) as string} formState={formState} handleStateChange={handleStateChange} label={t('photoStyleCreator.artist.facialExpression') as string} field="facialExpression" customField="customFacialExpression" options={t('photoStyleCreator.artist.expressions') as any} recs={recommendations?.facialExpression} />
                <SmartDropdown t={(key) => t(key) as string} formState={formState} handleStateChange={handleStateChange} label={t('photoStyleCreator.artist.handGesture') as string} field="handGesture" customField="customHandGesture" options={t('photoStyleCreator.artist.gestures') as any} recs={recommendations?.handGesture} />
                <SmartDropdown t={(key) => t(key) as string} formState={formState} handleStateChange={handleStateChange} label={t('photoStyleCreator.artist.bodyPose') as string} field="bodyPose" customField="customBodyPose" options={t('photoStyleCreator.artist.bodyPoses') as any} recs={recommendations?.bodyPose} />
                <SmartDropdown t={(key) => t(key) as string} formState={formState} handleStateChange={handleStateChange} label={t('photoStyleCreator.artist.pose') as string} field="pose" customField="customPose" options={t('photoStyleCreator.artist.poses') as any} recs={recommendations?.pose} />
                 <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">{String(t('photoStyleCreator.artist.backgroundColor'))}</label>
                    <input type="color" value={formState.backgroundColor} onChange={e => handleStateChange('backgroundColor', e.target.value)} className="w-full h-10 border border-gray-600 rounded-md" />
                </div>
            </fieldset>
        </>
    );

    const renderProductControls = () => (
         <>
            <fieldset className="border-t border-base-300 pt-5 space-y-5">
                 <legend className="text-base font-semibold text-gray-200 -translate-y-3 bg-base-200/50 px-2">{String(t('photoStyleCreator.groups.subject'))}</legend>
                <MultiFileUploader label={t('photoStyleCreator.product.productPhoto') as string} type="product" />
                 <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">{String(t('photoStyleCreator.product.productDescription'))}</label>
                    <div className="relative">
                        <textarea value={formState.productDescription} onChange={e => handleStateChange('productDescription', e.target.value)} rows={3} placeholder={t('photoStyleCreator.product.productDescriptionPlaceholder') as string} className="w-full bg-base-300 border-gray-600 rounded-md p-2.5 text-sm" />
                        <button type="button" onClick={() => handleAutoGenerate('description', 'productDescription')} disabled={!!autoGeneratingField || localProductFiles.length === 0} className="absolute top-2 right-2 p-1.5 bg-base-100 text-amber-300 rounded-full hover:bg-base-200/50 disabled:opacity-50 disabled:cursor-not-allowed" title={t('photoStyleCreator.generateWithAi') as string}>
                            {autoGeneratingField === 'productDescription' ? <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div> : <MagicWandIcon className="h-4 w-4" />}
                        </button>
                    </div>
                </div>
            </fieldset>

            <fieldset className="border-t border-base-300 pt-5 space-y-5">
                <legend className="text-base font-semibold text-gray-200 -translate-y-3 bg-base-200/50 px-2">{String(t('photoStyleCreator.groups.style'))}</legend>
                <SmartDropdown t={(key) => t(key) as string} formState={formState} handleStateChange={handleStateChange} label={t('photoStyleCreator.product.shotType') as string} field="productShotType" customField="customProductShotType" options={t('photoStyleCreator.product.shotTypes') as any} recs={recommendations?.productShotType} />
                <SmartDropdown t={(key) => t(key) as string} formState={formState} handleStateChange={handleStateChange} label={t('photoStyleCreator.product.lighting') as string} field="productLighting" customField="customProductLighting" options={t('photoStyleCreator.product.lightingOptions') as any} recs={recommendations?.productLighting} />
                <SmartDropdown t={(key) => t(key) as string} formState={formState} handleStateChange={handleStateChange} label={t('photoStyleCreator.product.background') as string} field="productBackground" customField="customProductBackground" options={t('photoStyleCreator.product.backgroundOptions') as any} recs={recommendations?.productBackground} />
            </fieldset>
        </>
    );

    const renderMusicThumbnailControls = () => {
        const T = (key: string) => t(key) as string; // shorthand
        return (
            <>
                 {/* AI Creation */}
                 <div className="p-4 border border-base-300 rounded-lg bg-base-300/30">
                     <h3 className="text-lg font-bold mb-3 text-gray-200">{T('photoStyleCreator.thumbnailMusic.aiCreation')}</h3>
                     <div className="space-y-4">
                         <div>
                             <label htmlFor="music-theme-prompt" className="block text-sm font-medium text-gray-400 mb-1">{T('photoStyleCreator.thumbnailMusic.themePromptLabel')}</label>
                             <textarea id="music-theme-prompt" value={formState.musicAiThemePrompt} onChange={e => handleStateChange('musicAiThemePrompt', e.target.value as any)} rows={3} className="w-full p-2 bg-base-200 border border-gray-600 rounded-md text-sm" placeholder={T('photoStyleCreator.thumbnailMusic.themePromptPlaceholder')}></textarea>
                         </div>
                         <div>
                             <label htmlFor="music-inspiration-uploader" className="block text-sm font-medium text-gray-400 mb-1">{T('photoStyleCreator.thumbnailMusic.uploadImage')}</label>
                             <input type="file" id="music-inspiration-uploader" onChange={handleMusicInspirationUpload} accept="image/*" className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-base-200 file:text-brand-light hover:file:bg-brand-primary/20"/>
                             <div className="mt-2 flex items-center">
                                 <input type="checkbox" id="music-use-inspiration" checked={formState.musicUseInspiration} onChange={e => handleStateChange('musicUseInspiration', e.target.checked as any)} className="h-4 w-4 text-brand-primary bg-base-100 border-gray-500 rounded focus:ring-brand-secondary"/>
                                 <label htmlFor="music-use-inspiration" className="ml-2 block text-sm text-gray-300">{T('photoStyleCreator.thumbnailMusic.useAsInspiration')}</label>
                             </div>
                         </div>
                         <button onClick={handleGenerateAIBg} disabled={isMusicLoading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md disabled:opacity-50">
                            {isMusicLoading && loadingMessage === T('photoStyleCreator.thumbnailMusic.generatingBg') ? loadingMessage : T('photoStyleCreator.thumbnailMusic.generateAIBg')}
                         </button>
                     </div>
                 </div>
                 
                 {/* Playlist Info */}
                 <div className="p-4 border border-base-300 rounded-lg bg-base-300/30 space-y-3">
                    <h3 className="text-lg font-bold text-gray-200">{T('photoStyleCreator.thumbnailMusic.playlistInfo')}</h3>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">{T('photoStyleCreator.thumbnailMusic.playlistTitleLabel')}</label>
                        <textarea value={formState.musicTitle} onChange={e => handleStateChange('musicTitle', e.target.value as any)} rows={2} className="w-full p-2 bg-base-200 border border-gray-600 rounded-md text-sm" />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">{T('photoStyleCreator.thumbnailMusic.songListLabel')}</label>
                        <textarea value={formState.musicSongList} onChange={e => handleStateChange('musicSongList', e.target.value as any)} rows={5} className="w-full p-2 bg-base-200 border border-gray-600 rounded-md text-sm" placeholder={T('photoStyleCreator.thumbnailMusic.songListPlaceholder')} />
                        <div className="mt-2 flex items-center">
                            <input type="checkbox" id="music-auto-clean" checked={formState.musicAutoClean} onChange={e => handleStateChange('musicAutoClean', e.target.checked as any)} className="h-4 w-4 text-brand-primary bg-base-100 border-gray-500 rounded focus:ring-brand-secondary"/>
                            <label htmlFor="music-auto-clean" className="ml-2 block text-sm text-gray-300">{T('photoStyleCreator.thumbnailMusic.autoRemove')}</label>
                        </div>
                    </div>
                 </div>

                 {/* Text Settings */}
                 <div className="p-4 border border-base-300 rounded-lg bg-base-300/30 space-y-3">
                    <h3 className="text-lg font-bold text-gray-200">{T('photoStyleCreator.thumbnailMusic.textSettings')}</h3>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">{T('photoStyleCreator.thumbnailMusic.aiTextStyleLabel')}</label>
                        <button onClick={handleGenerateAITextStyle} disabled={isMusicLoading} className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 px-4 rounded-md disabled:opacity-50">
                            {isMusicLoading && loadingMessage === T('photoStyleCreator.thumbnailMusic.generatingStyle') ? loadingMessage : T('photoStyleCreator.thumbnailMusic.generateAITextStyle')}
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-gray-400">{T('photoStyleCreator.thumbnailMusic.titleFontSize')}</label>
                            <input type="range" min="20" max="150" value={formState.musicTitleFontSize} onChange={e => handleStateChange('musicTitleFontSize', parseInt(e.target.value) as any)} className="w-full"/>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400">{T('photoStyleCreator.thumbnailMusic.songsFontSize')}</label>
                            <input type="range" min="10" max="50" value={formState.musicSongsFontSize} onChange={e => handleStateChange('musicSongsFontSize', parseInt(e.target.value) as any)} className="w-full"/>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-xs text-gray-400">{T('photoStyleCreator.thumbnailMusic.titleFont')}</label>
                            <select value={formState.musicTitleFont} onChange={e => handleStateChange('musicTitleFont', e.target.value as any)} className="w-full p-1 bg-base-200 border border-gray-600 rounded-md text-xs">
                                <option>Oswald</option><option>Inter</option><option>Roboto</option><option>Poppins</option><option>Playfair Display</option><option>Lobster</option>
                            </select>
                        </div>
                         <div>
                            <label className="block text-xs text-gray-400">{T('photoStyleCreator.thumbnailMusic.songsFont')}</label>
                            <select value={formState.musicSongsFont} onChange={e => handleStateChange('musicSongsFont', e.target.value as any)} className="w-full p-1 bg-base-200 border border-gray-600 rounded-md text-xs">
                                <option>Inter</option><option>Roboto</option><option>Poppins</option><option>Oswald</option><option>Playfair Display</option><option>Lobster</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400">{T('photoStyleCreator.thumbnailMusic.songsColor')}</label>
                        <input type="color" value={formState.musicSongsColor} onChange={e => handleStateChange('musicSongsColor', e.target.value as any)} className="w-full h-8 border-none bg-transparent" />
                    </div>
                 </div>

                 {/* Title Effects */}
                 <div className="p-4 border border-base-300 rounded-lg bg-base-300/30 space-y-3">
                    <h3 className="text-lg font-bold text-gray-200">{T('photoStyleCreator.thumbnailMusic.titleEffects')}</h3>
                    <div className="flex items-center">
                        <input type="checkbox" id="music-use-gradient" checked={formState.musicUseGradient} onChange={e => handleStateChange('musicUseGradient', e.target.checked as any)} className="h-4 w-4 text-brand-primary bg-base-100 border-gray-500 rounded focus:ring-brand-secondary"/>
                        <label htmlFor="music-use-gradient" className="ml-2 block text-sm text-gray-300">{T('photoStyleCreator.thumbnailMusic.useGradient')}</label>
                    </div>
                    {formState.musicUseGradient ? (
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-xs text-gray-400">{T('photoStyleCreator.thumbnailMusic.gradientStart')}</label><input type="color" value={formState.musicGradientStart} onChange={e => handleStateChange('musicGradientStart', e.target.value as any)} className="w-full h-8"/></div>
                            <div><label className="text-xs text-gray-400">{T('photoStyleCreator.thumbnailMusic.gradientEnd')}</label><input type="color" value={formState.musicGradientEnd} onChange={e => handleStateChange('musicGradientEnd', e.target.value as any)} className="w-full h-8"/></div>
                        </div>
                    ) : (
                        <div><label className="text-xs text-gray-400">{T('photoStyleCreator.thumbnailMusic.titleColor')}</label><input type="color" value={formState.musicTitleColor} onChange={e => handleStateChange('musicTitleColor', e.target.value as any)} className="w-full h-8"/></div>
                    )}
                    <div className="flex items-center">
                        <input type="checkbox" id="music-use-shadow" checked={formState.musicUseShadow} onChange={e => handleStateChange('musicUseShadow', e.target.checked as any)} className="h-4 w-4 text-brand-primary bg-base-100 border-gray-500 rounded focus:ring-brand-secondary"/>
                        <label htmlFor="music-use-shadow" className="ml-2 block text-sm text-gray-300">{T('photoStyleCreator.thumbnailMusic.useShadow')}</label>
                    </div>
                     {formState.musicUseShadow && (
                        <div className="grid grid-cols-2 gap-4 items-center">
                            <div><label className="text-xs text-gray-400">{T('photoStyleCreator.thumbnailMusic.shadowColor')}</label><input type="color" value={formState.musicShadowColor} onChange={e => handleStateChange('musicShadowColor', e.target.value as any)} className="w-full h-8"/></div>
                            <div><label className="text-xs text-gray-400">{T('photoStyleCreator.thumbnailMusic.shadowBlur')}</label><input type="range" min="0" max="50" value={formState.musicShadowBlur} onChange={e => handleStateChange('musicShadowBlur', parseInt(e.target.value) as any)} className="w-full"/></div>
                        </div>
                    )}
                 </div>

                 {/* Layout */}
                 <div className="p-4 border border-base-300 rounded-lg bg-base-300/30 space-y-3">
                     <h3 className="text-lg font-bold text-gray-200">{T('photoStyleCreator.thumbnailMusic.layoutSettings')}</h3>
                     <div>
                        <label className="block text-sm text-gray-400 mb-1">{T('photoStyleCreator.thumbnailMusic.titlePosition')}</label>
                        <div className="grid grid-cols-3 gap-2">
                            <button onClick={() => handleStateChange('musicTitleAlign', 'left' as any)} className={`py-1 rounded ${formState.musicTitleAlign === 'left' ? 'bg-brand-primary' : 'bg-base-200'}`}>{T('photoStyleCreator.thumbnailMusic.alignLeft')}</button>
                            <button onClick={() => handleStateChange('musicTitleAlign', 'center' as any)} className={`py-1 rounded ${formState.musicTitleAlign === 'center' ? 'bg-brand-primary' : 'bg-base-200'}`}>{T('photoStyleCreator.thumbnailMusic.alignCenter')}</button>
                            <button onClick={() => handleStateChange('musicTitleAlign', 'right' as any)} className={`py-1 rounded ${formState.musicTitleAlign === 'right' ? 'bg-brand-primary' : 'bg-base-200'}`}>{T('photoStyleCreator.thumbnailMusic.alignRight')}</button>
                        </div>
                     </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">{T('photoStyleCreator.thumbnailMusic.songColumns')}</label>
                        <div className="grid grid-cols-3 gap-2">
                            <button onClick={() => handleStateChange('musicColumnCount', 1 as any)} className={`py-1 rounded ${formState.musicColumnCount === 1 ? 'bg-brand-primary' : 'bg-base-200'}`}>{T('photoStyleCreator.thumbnailMusic.oneColumn')}</button>
                            <button onClick={() => handleStateChange('musicColumnCount', 2 as any)} className={`py-1 rounded ${formState.musicColumnCount === 2 ? 'bg-brand-primary' : 'bg-base-200'}`}>{T('photoStyleCreator.thumbnailMusic.twoColumns')}</button>
                            <button onClick={() => handleStateChange('musicColumnCount', 4 as any)} className={`py-1 rounded ${formState.musicColumnCount === 4 ? 'bg-brand-primary' : 'bg-base-200'}`}>{T('photoStyleCreator.thumbnailMusic.fourColumns')}</button>
                        </div>
                     </div>
                      <div>
                        <label className="text-sm text-gray-400">{T('photoStyleCreator.thumbnailMusic.canvasBgColor')}</label>
                        <input type="color" value={formState.musicCanvasBgColor} onChange={e => handleStateChange('musicCanvasBgColor', e.target.value as any)} className="w-full h-8"/>
                     </div>
                 </div>
            </>
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-base-100 z-50 flex flex-col font-sans" role="dialog" aria-modal="true">
            <header className="flex-shrink-0 bg-base-200/80 backdrop-blur-sm border-b border-base-300 w-full z-10 p-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <PhotoIcon className="h-6 w-6 text-teal-400" />
                    <div>
                        <h2 className="text-xl font-bold text-teal-400">{t('photoStyleCreator.title') as string}</h2>
                        <p className="text-sm text-gray-400">{t('photoStyleCreator.description') as string}</p>
                    </div>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-white"><XCircleIcon className="h-6 w-6" /></button>
            </header>

            <main className="flex-grow grid grid-cols-12 overflow-hidden">
                {/* Controls Sidebar */}
                <aside className="col-span-12 md:col-span-4 lg:col-span-3 bg-base-200/50 p-5 border-r border-base-300 overflow-y-auto space-y-6">
                    <div>
                        <label className="block text-base font-semibold text-gray-200 mb-2">{t('photoStyleCreator.photoType') as string}</label>
                        <div className="flex flex-wrap gap-2">
                            {(['artist_model', 'product', 'thumbnail'] as PhotoType[]).map(type => (
                                <button key={type} onClick={() => handleStateChange('photoType', type)} className={`px-3 py-2 text-sm rounded-md flex-1 transition-colors ${formState.photoType === type ? 'bg-brand-primary text-white font-semibold' : 'bg-base-300 hover:bg-base-200'}`}>
                                    {t(`photoStyleCreator.types.${type}`) as string}
                                </button>
                            ))}
                        </div>
                    </div>

                    {formState.photoType === 'artist_model' && renderArtistModelControls()}
                    {formState.photoType === 'product' && renderProductControls()}
                    
                    {formState.photoType === 'thumbnail' && (
                        <>
                            <div className="flex rounded-md shadow-sm">
                                <button onClick={() => handleStateChange('thumbnailMode', 'normal' as any)} className={`px-4 py-2 text-sm font-medium border border-gray-600 rounded-l-md flex-1 ${formState.thumbnailMode === 'normal' ? 'bg-brand-primary text-white' : 'bg-base-300 hover:bg-gray-700'}`}>{t('photoStyleCreator.thumbnailMusic.normal') as string}</button>
                                <button onClick={() => handleStateChange('thumbnailMode', 'music' as any)} className={`px-4 py-2 text-sm font-medium border border-gray-600 rounded-r-md flex-1 ${formState.thumbnailMode === 'music' ? 'bg-brand-primary text-white' : 'bg-base-300 hover:bg-gray-700'}`}>{t('photoStyleCreator.thumbnailMusic.music') as string}</button>
                            </div>
                            {formState.thumbnailMode === 'normal' ? renderNormalThumbnailControls() : renderMusicThumbnailControls()}
                        </>
                    )}

                    {/* Shared output settings */}
                    {(formState.photoType !== 'thumbnail' || formState.thumbnailMode === 'normal') && (
                        <fieldset className="border-t border-base-300 pt-5 space-y-5">
                            <legend className="text-base font-semibold text-gray-200 -translate-y-3 bg-base-200/50 px-2">{t('photoStyleCreator.groups.output') as string}</legend>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">{t('photoStyleCreator.shared.numberOfImages') as string}</label>
                                <RadioGroup value={formState.numberOfImages} onChange={val => handleStateChange('numberOfImages', val)} options={[{value: 3, label: '3'}, {value: 6, label: '6'}, {value: 9, label: '9'}]} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">{t('photoStyleCreator.shared.aspectRatio') as string}</label>
                                <RadioGroup value={formState.aspectRatio} onChange={val => handleStateChange('aspectRatio', val)} options={[{value: '1:1', label: '1:1'}, {value: '9:16', label: '9:16'}, {value: '16:9', label: '16:9'}, {value: '3:4', label: '3:4'}, {value: '4:3', label: '4:3'}]} />
                            </div>
                            <button onClick={handleGenerate} disabled={isLoading} className="w-full font-bold py-3 px-4 text-lg rounded-xl shadow-lg bg-brand-primary hover:bg-brand-dark disabled:bg-base-300 disabled:text-gray-500 transition-colors">
                                {isLoading ? t('photoStyleCreator.generating') as string : t('photoStyleCreator.generate') as string}
                            </button>
                        </fieldset>
                    )}
                </aside>

                {/* Results Display */}
                <div className="col-span-12 md:col-span-8 lg:col-span-9 bg-black/30 p-5 flex items-center justify-center overflow-y-auto">
                    {error && <p className="text-red-400 text-center">{error}</p>}
                    {isLoading && <div className="text-center text-gray-400">{t('photoStyleCreator.generating') as string}</div>}
                    {!isLoading && !error && generatedImages.length === 0 && formState.thumbnailMode !== 'music' && (
                        <div className="text-center text-gray-500">
                            <PhotoIcon className="h-16 w-16 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold">{t('photoStyleCreator.readyText') as string}</h3>
                            <p className="max-w-xs mx-auto">{t('photoStyleCreator.readySubtext') as string}</p>
                        </div>
                    )}
                    {generatedImages.length > 0 && formState.thumbnailMode !== 'music' && (
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 w-full h-full">
                            {generatedImages.map((img, index) => (
                                <div key={index} className="relative group aspect-square bg-base-300 rounded-lg overflow-hidden">
                                    <img src={`data:${img.mimeType};base64,${img.base64}`} alt={`Generated image ${index + 1}`} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <button onClick={() => handleDownload(img)} className="p-2 bg-white/20 text-white rounded-full hover:bg-white/40" title={t('photoStyleCreator.downloadTooltip') as string}><DownloadIcon className="h-6 w-6" /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {formState.photoType === 'thumbnail' && formState.thumbnailMode === 'music' && (
                        <div className="w-full max-w-4xl space-y-4">
                            <div className="relative aspect-video bg-base-200 rounded-lg shadow-lg">
                               <canvas ref={canvasRef} width={800} height={450} className="w-full h-full object-contain"></canvas>
                               {isMusicLoading && <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-white">{loadingMessage}...</div>}
                            </div>
                             <div className="flex gap-4">
                               <button onClick={handleDownloadHD} className='w-full bg-indigo-600 hover:bg-indigo-700 font-bold py-2 px-4 rounded-md text-white'>{t('photoStyleCreator.thumbnailMusic.downloadHD') as string}</button>
                               <button onClick={handleClearMusicForm} className='w-full bg-red-600 hover:bg-red-700 font-bold py-2 px-4 rounded-md text-white'>{t('photoStyleCreator.thumbnailMusic.clear') as string}</button>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};