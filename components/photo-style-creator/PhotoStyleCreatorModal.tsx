import React, { useState, useCallback, useEffect, DragEvent } from 'react';
import { useLocalization } from '../../i18n';
import type { StoredReferenceFile, PhotoStyleCreatorState } from '../../types';
import { generatePhotoStyleImages } from '../../services/storyCreatorService';
import { XCircleIcon } from '../icons/XCircleIcon';
import { UploadIcon } from '../icons/UploadIcon';
import { PhotoIcon } from '../icons/PhotoIcon';

interface PhotoStyleCreatorModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const generateUUID = () => window.crypto.randomUUID();
const MAX_FILE_SIZE_MB = 10;
const SUPPORTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

const initialPhotoStyleCreatorState: PhotoStyleCreatorState = {
    userPhoto: null,
    productPhoto: null,
    facialExpression: 'surprised',
    handGesture: 'pointing',
    bodyPose: 'standing',
    pose: 'relaxed',
    backgroundColor: '#FFFFFF',
    numberOfImages: 9,
    aspectRatio: '1:1',
};

export const PhotoStyleCreatorModal: React.FC<PhotoStyleCreatorModalProps> = ({ isOpen, onClose }) => {
    const { t } = useLocalization();
    const [formState, setFormState] = useState<PhotoStyleCreatorState>(initialPhotoStyleCreatorState);
    const [userPhotoPreview, setUserPhotoPreview] = useState<string | null>(null);
    const [productPhotoPreview, setProductPhotoPreview] = useState<string | null>(null);
    const [generatedImages, setGeneratedImages] = useState<{ base64: string, mimeType: string }[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            document.body.classList.add('modal-open');
        } else {
            document.body.classList.remove('modal-open');
        }
    }, [isOpen]);

    const handleStateChange = <K extends keyof PhotoStyleCreatorState>(key: K, value: PhotoStyleCreatorState[K]) => {
        setFormState(prev => ({ ...prev, [key]: value }));
    };

    const processFile = (file: File, type: 'userPhoto' | 'productPhoto') => {
        if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
            alert(`Unsupported file type: ${file.type}. Please use PNG, JPG, or WEBP.`);
            return;
        }
        if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
            alert(`File is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum size is ${MAX_FILE_SIZE_MB}MB.`);
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const base64 = (e.target?.result as string).split(',')[1];
            const storedFile: StoredReferenceFile = {
                id: generateUUID(),
                base64,
                mimeType: file.type,
                type: 'image',
            };
            handleStateChange(type, storedFile);
            const previewUrl = URL.createObjectURL(file);
            if (type === 'userPhoto') setUserPhotoPreview(previewUrl);
            else setProductPhotoPreview(previewUrl);
        };
        reader.readAsDataURL(file);
    };

    const handleFileDrop = (e: DragEvent<HTMLLabelElement>, type: 'userPhoto' | 'productPhoto') => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0], type);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'userPhoto' | 'productPhoto') => {
        if (e.target.files && e.target.files[0]) {
            processFile(e.target.files[0], type);
        }
    };
    
    const handleRemoveImage = (type: 'userPhoto' | 'productPhoto') => {
        handleStateChange(type, null);
        if (type === 'userPhoto') {
            if (userPhotoPreview) URL.revokeObjectURL(userPhotoPreview);
            setUserPhotoPreview(null);
        } else {
            if (productPhotoPreview) URL.revokeObjectURL(productPhotoPreview);
            setProductPhotoPreview(null);
        }
    };

    const handleGenerate = async () => {
        if (!formState.userPhoto) {
            setError(t('photoStyleCreator.errorNoPhoto') as string);
            return;
        }
        setIsLoading(true);
        setError(null);
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

    const ImageUploader: React.FC<{
        type: 'userPhoto' | 'productPhoto';
        label: string;
        preview: string | null;
        placeholder: { title: string; subtitle: string; }
    }> = ({ type, label, preview, placeholder }) => (
        <div className="space-y-1">
            <h3 className="text-sm font-semibold text-gray-300">{label}</h3>
            {preview ? (
                <div className="relative group w-full">
                    <img src={preview} alt="Preview" className="w-full h-auto rounded-lg shadow-md" />
                    <button onClick={() => handleRemoveImage(type)} className="absolute top-2 right-2 p-1 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <XCircleIcon className="h-5 w-5" />
                    </button>
                </div>
            ) : (
                <label
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => handleFileDrop(e, type)}
                    className="relative block w-full border-2 border-gray-600 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-gray-500 transition-colors"
                >
                    <input type="file" className="sr-only" onChange={e => handleFileChange(e, type)} accept={SUPPORTED_IMAGE_TYPES.join(',')} />
                    {type === 'userPhoto' ? (
                        <UploadIcon className="mx-auto h-8 w-8 text-gray-500" />
                    ) : (
                        <div className="mx-auto h-8 w-8 text-gray-500 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                        </div>
                    )}
                    <span className="mt-2 block text-sm font-medium text-gray-400">
                        {placeholder.title}
                    </span>
                    <span className="mt-1 block text-xs text-gray-500">{placeholder.subtitle}</span>
                </label>
            )}
        </div>
    );

    const ControlSection: React.FC<{ title: string; children: React.ReactNode; }> = ({ title, children }) => (
        <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-300">{title}</h3>
            {children}
        </div>
    );

    const Dropdown: React.FC<{ value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; options: Record<string, string>; }> = ({ value, onChange, options }) => (
        <select value={value} onChange={onChange} className="w-full bg-base-300 border-gray-600 rounded-md p-2 text-sm text-gray-200">
            {Object.entries(options).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
    );

    const RadioGroup: React.FC<{ value: string | number; onChange: (value: any) => void; options: (string | number)[]; }> = ({ value, onChange, options }) => (
        <div className="flex items-center gap-2">
            {options.map(opt => (
                <button
                    key={opt}
                    type="button"
                    onClick={() => onChange(opt)}
                    className={`px-4 py-2 text-sm rounded-md flex-1 text-center ${value === opt ? 'bg-brand-primary text-white font-semibold' : 'bg-base-300 hover:bg-base-200'}`}
                >{opt}</button>
            ))}
        </div>
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
                    <aside className="lg:col-span-3 lg:sticky lg:top-28 bg-base-200/50 p-4 rounded-lg border border-base-300 space-y-4">
                        <ImageUploader type="userPhoto" label={t('photoStyleCreator.yourPhoto') as string} preview={userPhotoPreview} placeholder={{ title: t('photoStyleCreator.uploadPlaceholder') as string, subtitle: t('photoStyleCreator.uploadSubtitle') as string }} />
                        <ImageUploader type="productPhoto" label={t('photoStyleCreator.productPhoto') as string} preview={productPhotoPreview} placeholder={{ title: t('photoStyleCreator.noProductPlaceholder') as string, subtitle: t('photoStyleCreator.noProductSubtext') as string }} />

                        <ControlSection title={t('photoStyleCreator.facialExpression') as string}><Dropdown value={formState.facialExpression} onChange={e => handleStateChange('facialExpression', e.target.value as any)} options={t('photoStyleCreator.expressions') as any} /></ControlSection>
                        <ControlSection title={t('photoStyleCreator.handGesture') as string}><Dropdown value={formState.handGesture} onChange={e => handleStateChange('handGesture', e.target.value as any)} options={t('photoStyleCreator.gestures') as any} /></ControlSection>
                        <ControlSection title={t('photoStyleCreator.bodyPose') as string}><Dropdown value={formState.bodyPose} onChange={e => handleStateChange('bodyPose', e.target.value as any)} options={t('photoStyleCreator.bodyPoses') as any} /></ControlSection>
                        <ControlSection title={t('photoStyleCreator.pose') as string}><Dropdown value={formState.pose} onChange={e => handleStateChange('pose', e.target.value as any)} options={t('photoStyleCreator.poses') as any} /></ControlSection>

                        <ControlSection title={t('photoStyleCreator.backgroundColor') as string}>
                           <input type="color" value={formState.backgroundColor} onChange={e => handleStateChange('backgroundColor', e.target.value)} className="w-full h-10 p-1 bg-base-300 border border-gray-600 rounded-md cursor-pointer" />
                        </ControlSection>

                        <ControlSection title={t('photoStyleCreator.numberOfImages') as string}><RadioGroup value={formState.numberOfImages} onChange={(v) => handleStateChange('numberOfImages', v)} options={[3, 6, 9]} /></ControlSection>
                        <ControlSection title={t('photoStyleCreator.aspectRatio') as string}><RadioGroup value={formState.aspectRatio} onChange={(v) => handleStateChange('aspectRatio', v)} options={['1:1', '9:16', '16:9']} /></ControlSection>

                        <div className="pt-2">
                           <button onClick={handleGenerate} disabled={isLoading} className="w-full py-3 bg-brand-primary hover:bg-brand-dark text-white font-bold rounded-lg disabled:opacity-50">{isLoading ? t('photoStyleCreator.generating') : t('photoStyleCreator.generate') as string}</button>
                        </div>
                    </aside>
                    {/* Generated Images */}
                    <div className="lg:col-span-9 bg-base-200/50 p-4 rounded-lg border border-base-300 flex items-center justify-center min-h-[calc(100vh-12rem)]">
                        {isLoading ? (
                            <div className="text-center">
                                <svg className="animate-spin mx-auto h-12 w-12 text-brand-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                <p className="mt-4 text-gray-300">{t('photoStyleCreator.generating') as string}</p>
                            </div>
                        ) : error ? (
                             <div className="text-center text-red-400">{error}</div>
                        ) : generatedImages.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full">
                                {generatedImages.map((img, index) => (
                                    <div key={index} className="aspect-auto bg-base-300 rounded-md overflow-hidden">
                                        <img src={`data:${img.mimeType};base64,${img.base64}`} alt={`Generated image ${index + 1}`} className="w-full h-full object-cover" />
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
