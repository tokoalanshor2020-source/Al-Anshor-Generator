import React, { useState, useCallback, useEffect, DragEvent } from 'react';
import { useLocalization, languageMap } from '../../i18n';
import type { StoredReferenceFile, PhotoStyleCreatorState, PhotoType, PhotoStyleRecommendations, ReferenceFile } from '../../types';
import { generatePhotoStyleImages, generatePhotoStyleRecommendations, generateTextFromImage } from '../../services/storyCreatorService';
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
};

export const PhotoStyleCreatorModal: React.FC<PhotoStyleCreatorModalProps> = ({ isOpen, onClose }) => {
    const { t, language } = useLocalization();
    const [formState, setFormState] = useState<PhotoStyleCreatorState>(initialPhotoStyleCreatorState);
    
    const [localReferenceFiles, setLocalReferenceFiles] = useState<ReferenceFile[]>([]);
    const [currentReferenceFileIndex, setCurrentReferenceFileIndex] = useState(0);
    const [localProductFiles, setLocalProductFiles] = useState<ReferenceFile[]>([]);
    const [currentProductFileIndex, setCurrentProductFileIndex] = useState(0);

    const [generatedImages, setGeneratedImages] = useState<{ base64: string, mimeType: string }[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const [recommendations, setRecommendations] = useState<PhotoStyleRecommendations | null>(null);
    const [isGeneratingRecs, setIsGeneratingRecs] = useState(false);
    const [autoGeneratingField, setAutoGeneratingField] = useState<string | null>(null);

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
            setError(null);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    // Effect to fetch AI recommendations when a reference image changes
    useEffect(() => {
        const referenceFiles = formState.photoType === 'product' ? formState.productFiles : formState.referenceFiles;

        if (referenceFiles.length > 0) {
            const getRecs = async () => {
                setIsGeneratingRecs(true);
                setRecommendations(null); // Clear old recs
                try {
                    const recs = await generatePhotoStyleRecommendations(referenceFiles, formState.photoType, languageMap[language]);
                    setRecommendations(recs);
                } catch (e) {
                    console.error("Failed to get recommendations:", e);
                    // Silently fail, user can still use standard options
                } finally {
                    setIsGeneratingRecs(false);
                }
            };
            getRecs();
        } else {
            setRecommendations(null); // Clear recs if image is removed
        }
    }, [formState.referenceFiles, formState.productFiles, formState.photoType, language]);


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
    }, []);

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
            const images = await generatePhotoStyleImages(formState);
            setGeneratedImages(images);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'An unknown error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAutoGenerate = async (
        type: 'description' | 'overlay',
        targetField: 'prompt' | 'productDescription' | 'thumbnailTopic' | 'thumbnailOverlayText'
    ) => {
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
            const text = await generateTextFromImage(filesToUse, type, languageMap[language]);
            handleStateChange(targetField, text as any);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to generate text.');
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
                            <span className="text-sm mt-1 text-gray-400">{t('photoStyleCreator.uploadPlaceholder') as string}</span>
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
                            {files.length > 0 ? `${currentIndex + 1} / ${files.length}` : t('photoStyleCreator.uploadSubtitle') as string}
                        </div>
                        <label htmlFor={fileInputId} className="cursor-pointer p-2 rounded-lg text-xs flex items-center gap-1 font-semibold text-brand-light hover:bg-brand-primary/20">
                            <PlusIcon className="h-4 w-4"/> {t('characterWorkshop.uploadButton') as string}
                        </label>
                    </div>
                </div>
            </div>
        );
    };
    
    const SmartDropdown = <K extends keyof PhotoStyleCreatorState>({
        label,
        field,
        customField,
        options,
        recs,
    }: {
        label: string;
        field: K;
        customField: K;
        options: Record<string, string>;
        recs?: string[];
    }) => (
        <div>
             <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
            <select
                value={formState[field] as string}
                onChange={e => handleStateChange(field, e.target.value as any)}
                className="w-full bg-base-300 border-gray-600 rounded-md p-2.5 text-sm text-gray-200"
            >
                {recs && recs.length > 0 && (
                    <optgroup label={t('photoStyleCreator.aiRecommendations') as string}>
                        {recs.map(rec => <option key={rec} value={rec}>{rec}</option>)}
                    </optgroup>
                )}
                 <optgroup label={t('photoStyleCreator.standardOptions') as string}>
                    {Object.entries(options).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </optgroup>
                <option value="custom">{t('photoStyleCreator.custom') as string}</option>
            </select>
            {formState[field] === 'custom' && (
                <input
                    type="text"
                    value={formState[customField] as string}
                    onChange={e => handleStateChange(customField, e.target.value as any)}
                    placeholder={t('photoStyleCreator.customPlaceholder') as string}
                    className="w-full bg-base-200 border-gray-500 rounded-md p-2.5 text-sm mt-2"
                />
            )}
        </div>
    );

    const RadioGroup: React.FC<{ value: string | number; onChange: (value: any) => void; options: {value: string | number, label: string}[]; }> = ({ value, onChange, options }) => (
        <div className="flex items-center gap-2">
            {options.map(opt => (
                <button
                    key={opt.value}
                    type="button"
                    onClick={() => onChange(opt.value)}
                    className={`px-3 py-2.5 text-sm rounded-md flex-1 text-center transition-colors ${value === opt.value ? 'bg-brand-primary text-white font-semibold' : 'bg-base-300 hover:bg-base-200'}`}
                >{opt.label}</button>
            ))}
        </div>
    );
    
    const renderArtistModelControls = () => (
        <>
            <fieldset className="border-t border-base-300 pt-5 space-y-5">
                <legend className="text-base font-semibold text-gray-200 -translate-y-3 bg-base-200/50 px-2">{t('photoStyleCreator.groups.subject') as string}</legend>
                <MultiFileUploader label={t('photoStyleCreator.artist.referencePhoto') as string} type="reference" />
                <div>
                     <label className="block text-sm font-medium text-gray-300 mb-2">{t('photoStyleCreator.artist.prompt') as string}</label>
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
                 <legend className="text-base font-semibold text-gray-200 -translate-y-3 bg-base-200/50 px-2">{t('photoStyleCreator.groups.style') as string}</legend>
                <SmartDropdown label={t('photoStyleCreator.artist.facialExpression') as string} field="facialExpression" customField="customFacialExpression" options={t('photoStyleCreator.artist.expressions') as any} recs={recommendations?.facialExpression} />
                <SmartDropdown label={t('photoStyleCreator.artist.handGesture') as string} field="handGesture" customField="customHandGesture" options={t('photoStyleCreator.artist.gestures') as any} recs={recommendations?.handGesture} />
                <SmartDropdown label={t('photoStyleCreator.artist.bodyPose') as string} field="bodyPose" customField="customBodyPose" options={t('photoStyleCreator.artist.bodyPoses') as any} recs={recommendations?.bodyPose} />
                <SmartDropdown label={t('photoStyleCreator.artist.pose') as string} field="pose" customField="customPose" options={t('photoStyleCreator.artist.poses') as any} recs={recommendations?.pose} />
                <div>
                     <label className="block text-sm font-medium text-gray-300 mb-2">{t('photoStyleCreator.artist.backgroundColor') as string}</label>
                    <input type="color" value={formState.backgroundColor} onChange={e => handleStateChange('backgroundColor', e.target.value)} className="w-full h-12 p-1 bg-base-300 border border-gray-600 rounded-md cursor-pointer" />
                </div>
            </fieldset>
        </>
    );

    const renderProductControls = () => (
        <>
            <fieldset className="border-t border-base-300 pt-5 space-y-5">
                 <legend className="text-base font-semibold text-gray-200 -translate-y-3 bg-base-200/50 px-2">{t('photoStyleCreator.groups.subject') as string}</legend>
                <MultiFileUploader label={t('photoStyleCreator.product.productPhoto') as string} type="product" />
                <div>
                     <label className="block text-sm font-medium text-gray-300 mb-2">{t('photoStyleCreator.product.productDescription') as string}</label>
                     <div className="relative">
                        <textarea value={formState.productDescription} onChange={e => handleStateChange('productDescription', e.target.value)} rows={4} placeholder={t('photoStyleCreator.product.productDescriptionPlaceholder') as string} className="w-full bg-base-300 border-gray-600 rounded-md p-2.5 text-sm" />
                        <button type="button" onClick={() => handleAutoGenerate('description', 'productDescription')} disabled={!!autoGeneratingField || localProductFiles.length === 0} className="absolute top-2 right-2 p-1.5 bg-base-100 text-amber-300 rounded-full hover:bg-base-200/50 disabled:opacity-50 disabled:cursor-not-allowed" title={t('photoStyleCreator.generateWithAi') as string}>
                            {autoGeneratingField === 'productDescription' ? <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div> : <MagicWandIcon className="h-4 w-4" />}
                        </button>
                     </div>
                </div>
            </fieldset>

            <fieldset className="border-t border-base-300 pt-5 space-y-5">
                 <legend className="text-base font-semibold text-gray-200 -translate-y-3 bg-base-200/50 px-2">{t('photoStyleCreator.groups.style') as string}</legend>
                <SmartDropdown label={t('photoStyleCreator.product.shotType') as string} field="productShotType" customField="customProductShotType" options={t('photoStyleCreator.product.shotTypes') as any} recs={recommendations?.productShotType} />
                <SmartDropdown label={t('photoStyleCreator.product.lighting') as string} field="productLighting" customField="customProductLighting" options={t('photoStyleCreator.product.lightingOptions') as any} recs={recommendations?.productLighting} />
                <SmartDropdown label={t('photoStyleCreator.product.background') as string} field="productBackground" customField="customProductBackground" options={t('photoStyleCreator.product.backgroundOptions') as any} recs={recommendations?.productBackground} />
            </fieldset>
        </>
    );

    const renderThumbnailControls = () => (
         <>
            <fieldset className="border-t border-base-300 pt-5 space-y-5">
                 <legend className="text-base font-semibold text-gray-200 -translate-y-3 bg-base-200/50 px-2">{t('photoStyleCreator.groups.subject') as string}</legend>
                <MultiFileUploader label={t('photoStyleCreator.thumbnail.referenceImage') as string} type="reference" />
                <div>
                     <label className="block text-sm font-medium text-gray-300 mb-2">{t('photoStyleCreator.thumbnail.topic') as string}</label>
                     <div className="relative">
                        <textarea value={formState.thumbnailTopic} onChange={e => handleStateChange('thumbnailTopic', e.target.value)} rows={3} placeholder={t('photoStyleCreator.thumbnail.topicPlaceholder') as string} className="w-full bg-base-300 border-gray-600 rounded-md p-2.5 text-sm" />
                        <button type="button" onClick={() => handleAutoGenerate('description', 'thumbnailTopic')} disabled={!!autoGeneratingField || localReferenceFiles.length === 0} className="absolute top-2 right-2 p-1.5 bg-base-100 text-amber-300 rounded-full hover:bg-base-200/50 disabled:opacity-50 disabled:cursor-not-allowed" title={t('photoStyleCreator.generateWithAi') as string}>
                            {autoGeneratingField === 'thumbnailTopic' ? <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div> : <MagicWandIcon className="h-4 w-4" />}
                        </button>
                    </div>
                </div>
                <div>
                     <label className="block text-sm font-medium text-gray-300 mb-2">{t('photoStyleCreator.thumbnail.overlayText') as string}</label>
                     <div className="relative">
                        <input type="text" value={formState.thumbnailOverlayText} onChange={e => handleStateChange('thumbnailOverlayText', e.target.value)} placeholder={t('photoStyleCreator.thumbnail.overlayTextPlaceholder') as string} className="w-full bg-base-300 border-gray-600 rounded-md p-2.5 text-sm" />
                        <button type="button" onClick={() => handleAutoGenerate('overlay', 'thumbnailOverlayText')} disabled={!!autoGeneratingField || localReferenceFiles.length === 0} className="absolute top-1/2 -translate-y-1/2 right-2 p-1.5 bg-base-100 text-amber-300 rounded-full hover:bg-base-200/50 disabled:opacity-50 disabled:cursor-not-allowed" title={t('photoStyleCreator.generateWithAi') as string}>
                            {autoGeneratingField === 'thumbnailOverlayText' ? <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div> : <MagicWandIcon className="h-4 w-4" />}
                        </button>
                    </div>
                </div>
            </fieldset>
            
            <fieldset className="border-t border-base-300 pt-5 space-y-5">
                <legend className="text-base font-semibold text-gray-200 -translate-y-3 bg-base-200/50 px-2">{t('photoStyleCreator.groups.style') as string}</legend>
                <SmartDropdown label={t('photoStyleCreator.thumbnail.style') as string} field="thumbnailStyle" customField="customThumbnailStyle" options={t('photoStyleCreator.thumbnail.styles') as any} recs={recommendations?.thumbnailStyle} />
                <SmartDropdown label={t('photoStyleCreator.thumbnail.font') as string} field="thumbnailFont" customField="customThumbnailFont" options={t('photoStyleCreator.thumbnail.fonts') as any} recs={recommendations?.thumbnailFont} />
                <SmartDropdown label={t('photoStyleCreator.thumbnail.palette') as string} field="thumbnailPalette" customField="customThumbnailPalette" options={t('photoStyleCreator.thumbnail.palettes') as any} recs={recommendations?.thumbnailPalette} />
            </fieldset>
        </>
    );
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-base-100 z-50 flex flex-col font-sans" role="dialog" aria-modal="true">
            <header className="flex-shrink-0 bg-base-200/80 backdrop-blur-sm border-b border-base-300 w-full sticky top-0 z-10">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between h-20">
                    <div className="flex items-center gap-3">
                        <PhotoIcon className="h-6 w-6 text-teal-400"/>
                        <div>
                            <h2 className="text-xl font-bold text-teal-400">{t('photoStyleCreator.title') as string}</h2>
                            <p className="text-sm text-gray-400">{t('photoStyleCreator.description') as string}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="px-6 py-2 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-200 bg-base-300 hover:bg-gray-700">
                        {t('closeButton') as string}
                    </button>
                </div>
            </header>
            <main className="flex-grow overflow-y-auto">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Controls */}
                    <aside className="lg:col-span-4 lg:sticky lg:top-28 bg-base-200/50 p-6 rounded-lg border border-base-300 space-y-6">
                        <fieldset className="space-y-4">
                            <legend className="text-base font-semibold text-gray-200 mb-2">{t('photoStyleCreator.photoType') as string}</legend>
                           <RadioGroup 
                                value={formState.photoType}
                                onChange={(v) => handleStateChange('photoType', v as PhotoType)}
                                options={[
                                    { value: 'artist_model', label: t('photoStyleCreator.types.artist_model') as string },
                                    { value: 'product', label: t('photoStyleCreator.types.product') as string },
                                    { value: 'thumbnail', label: t('photoStyleCreator.types.thumbnail') as string },
                                ]}
                           />
                        </fieldset>
                        
                        {formState.photoType === 'artist_model' && renderArtistModelControls()}
                        {formState.photoType === 'product' && renderProductControls()}
                        {formState.photoType === 'thumbnail' && renderThumbnailControls()}
                        
                        {isGeneratingRecs && <p className="text-xs text-amber-400 animate-pulse">{t('photoStyleCreator.generatingRecommendations') as string}</p>}
                        
                        <fieldset className="border-t border-base-300 pt-5 space-y-5">
                            <legend className="text-base font-semibold text-gray-200 -translate-y-3 bg-base-200/50 px-2">{t('photoStyleCreator.groups.output') as string}</legend>
                            <div>
                                 <label className="block text-sm font-medium text-gray-300 mb-2">{t('photoStyleCreator.shared.numberOfImages') as string}</label>
                                <RadioGroup 
                                    value={formState.numberOfImages} 
                                    onChange={(v) => handleStateChange('numberOfImages', v)} 
                                    options={[{value: 3, label: '3'}, {value: 6, label: '6'}, {value: 9, label: '9'}]}
                                />
                            </div>
                             <div>
                                 <label className="block text-sm font-medium text-gray-300 mb-2">{t('photoStyleCreator.shared.aspectRatio') as string}</label>
                                 <RadioGroup
                                    value={formState.aspectRatio}
                                    onChange={(v) => handleStateChange('aspectRatio', v)}
                                    options={[
                                        { value: '1:1', label: '1:1' },
                                        { value: '9:16', label: '9:16' },
                                        { value: '16:9', label: '16:9' },
                                    ]}
                                />
                            </div>
                        </fieldset>

                        <div className="pt-2">
                           <button onClick={handleGenerate} disabled={isLoading} className="w-full py-3.5 text-lg bg-brand-primary hover:bg-brand-dark text-white font-bold rounded-lg disabled:opacity-50">{isLoading ? t('photoStyleCreator.generating') : t('photoStyleCreator.generate') as string}</button>
                        </div>
                    </aside>
                    {/* Generated Images */}
                    <div className="lg:col-span-8 bg-base-200/50 p-4 rounded-lg border border-base-300 flex items-center justify-center min-h-[calc(100vh-12rem)]">
                        {isLoading ? (
                            <div className="text-center">
                                <svg className="animate-spin mx-auto h-12 w-12 text-brand-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                <p className="mt-4 text-gray-300">{t('photoStyleCreator.generating') as string}</p>
                            </div>
                        ) : error ? (
                             <div className="text-center text-red-400 p-4 bg-red-900/20 rounded-lg">{error}</div>
                        ) : generatedImages.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full">
                                {generatedImages.map((img, index) => (
                                    <div key={index} className="relative group aspect-auto bg-base-300 rounded-md overflow-hidden">
                                        <img src={`data:${img.mimeType};base64,${img.base64}`} alt={`Generated image ${index + 1}`} className="w-full h-full object-cover" />
                                        <button 
                                            onClick={() => handleDownload(img)}
                                            className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-brand-primary"
                                            title={t('photoStyleCreator.downloadTooltip') as string}
                                            aria-label="Download image"
                                        >
                                            <DownloadIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-gray-500">
                                <div className="text-indigo-400 text-5xl opacity-50 mb-4">✨</div>
                                <h3 className="text-xl font-semibold text-gray-300">{t('photoStyleCreator.readyText') as string}</h3>
                                <p className="text-sm">{t('photoStyleCreator.readySubtext') as string}</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};