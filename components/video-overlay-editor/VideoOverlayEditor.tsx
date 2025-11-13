import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocalization } from '../../i18n';
import type { Overlay, TextOverlay, ImageOverlay } from '../../types';
import { XCircleIcon } from '../icons/XCircleIcon';
import { UploadIcon } from '../icons/UploadIcon';

const generateUUID = () => window.crypto.randomUUID();

export const VideoOverlayEditor: React.FC<{ isOpen: boolean; onClose: () => void; }> = ({ isOpen, onClose }) => {
    const { t } = useLocalization();
    const [sourceVideo, setSourceVideo] = useState<{ url: string; file: File, width: number, height: number, duration: number } | null>(null);
    const [overlays, setOverlays] = useState<Overlay[]>([]);
    const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
    const [isRendering, setIsRendering] = useState(false);
    const [renderProgress, setRenderProgress] = useState(0);
    const [outputUrl, setOutputUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [dragInfo, setDragInfo] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const previewContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            document.body.classList.add('modal-open');
        } else {
            document.body.classList.remove('modal-open');
            if (sourceVideo) URL.revokeObjectURL(sourceVideo.url);
            if (outputUrl) URL.revokeObjectURL(outputUrl);
            setSourceVideo(null);
            setOverlays([]);
            setSelectedOverlayId(null);
            setOutputUrl(null);
            setError(null);
        }
    }, [isOpen, sourceVideo, outputUrl]);

    const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (sourceVideo) URL.revokeObjectURL(sourceVideo.url);
            const url = URL.createObjectURL(file);
            const video = document.createElement('video');
            video.src = url;
            video.onloadedmetadata = () => {
                setSourceVideo({ url, file, width: video.videoWidth, height: video.videoHeight, duration: video.duration });
                setOverlays([]);
                setSelectedOverlayId(null);
            };
        }
    };

    const updateOverlay = (id: string, updates: Partial<Overlay>) => {
        setOverlays(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));
    };

    const addTextOverlay = () => {
        if (!sourceVideo) return;
        const newOverlay: TextOverlay = {
            id: generateUUID(),
            type: 'text',
            text: 'Editable Text',
            x: 10, y: 10,
            width: 200, height: 50,
            rotation: 0, opacity: 1, zIndex: overlays.length,
            startTime: 0, endTime: sourceVideo.duration,
            fontFamily: 'Arial', fontSize: 24, color: '#FFFFFF',
            backgroundColor: 'rgba(0,0,0,0.5)',
            fontWeight: '400', fontStyle: 'normal', textDecoration: 'none',
            strokeColor: '#000000', strokeWidth: 0,
            shadowColor: '#000000', shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0,
        };
        setOverlays(prev => [...prev, newOverlay]);
        setSelectedOverlayId(newOverlay.id);
    };

    const addImageOverlay = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!sourceVideo) return;
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const newOverlay: ImageOverlay = {
                        id: generateUUID(),
                        type: 'image',
                        src: event.target?.result as string,
                        mimeType: file.type,
                        x: 20, y: 20,
                        width: img.width > 200 ? 200 : img.width, 
                        height: img.width > 200 ? (img.height * (200 / img.width)) : img.height,
                        originalWidth: img.width, originalHeight: img.height,
                        rotation: 0, opacity: 1, zIndex: overlays.length,
                        startTime: 0, endTime: sourceVideo.duration,
                    };
                    setOverlays(prev => [...prev, newOverlay]);
                    setSelectedOverlayId(newOverlay.id);
                }
                img.src = event.target?.result as string;
            };
            reader.readAsDataURL(file);
        }
    };

    const handleMouseDownOnOverlay = (e: React.MouseEvent<HTMLDivElement>, overlayId: string) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedOverlayId(overlayId);

        const overlay = overlays.find(o => o.id === overlayId);
        const videoWrapper = e.currentTarget.parentElement;
        if (!overlay || !videoWrapper) return;
        
        const wrapperRect = videoWrapper.getBoundingClientRect();
        
        const offsetX = e.clientX - wrapperRect.left - overlay.x;
        const offsetY = e.clientY - wrapperRect.top - overlay.y;

        setDragInfo({ id: overlayId, offsetX, offsetY });
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!dragInfo || !previewContainerRef.current) return;

        const videoWrapper = previewContainerRef.current.querySelector<HTMLDivElement>('.video-wrapper');
        if (!videoWrapper) return;

        const wrapperRect = videoWrapper.getBoundingClientRect();

        let newX = e.clientX - wrapperRect.left - dragInfo.offsetX;
        let newY = e.clientY - wrapperRect.top - dragInfo.offsetY;

        const overlay = overlays.find(o => o.id === dragInfo.id);
        if (!overlay) return;
        
        newX = Math.max(0, Math.min(newX, wrapperRect.width - overlay.width));
        newY = Math.max(0, Math.min(newY, wrapperRect.height - overlay.height));

        updateOverlay(dragInfo.id, { x: newX, y: newY });
    }, [dragInfo, overlays]);

    const handleMouseUp = useCallback(() => {
        setDragInfo(null);
    }, []);

    useEffect(() => {
        if (!dragInfo) return;
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [dragInfo, handleMouseMove, handleMouseUp]);
    
    const handleRender = async () => {
        if (!sourceVideo || !previewContainerRef.current) return;
        setIsRendering(true);
        setRenderProgress(0);
        setError(null);
        if (outputUrl) URL.revokeObjectURL(outputUrl);
        setOutputUrl(null);
    
        const previewWrapper = previewContainerRef.current.querySelector<HTMLDivElement>('.video-wrapper');
        if (!previewWrapper) return;
    
        const scaleX = sourceVideo.width / previewWrapper.clientWidth;
        const scaleY = sourceVideo.height / previewWrapper.clientHeight;
    
        const imageMap = new Map<string, HTMLImageElement>();
        const imageLoadPromises = overlays
            .filter((o): o is ImageOverlay => o.type === 'image')
            .map(o => new Promise<void>((resolve, reject) => {
                const img = new Image();
                img.onload = () => { imageMap.set(o.id, img); resolve(); };
                img.onerror = reject;
                img.src = o.src;
            }));
        
        try {
            await Promise.all(imageLoadPromises);
        } catch (e) {
            setError("Failed to load overlay images for rendering.");
            setIsRendering(false);
            return;
        }
    
        const canvas = document.createElement('canvas');
        canvas.width = sourceVideo.width;
        canvas.height = sourceVideo.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            setError("Could not create canvas context for rendering.");
            setIsRendering(false);
            return;
        }
    
        const stream = canvas.captureStream(30);
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        const chunks: Blob[] = [];
        recorder.ondataavailable = e => chunks.push(e.data);
        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            setOutputUrl(url);
            setIsRendering(false);
        };
        recorder.start();
    
        const videoElement = document.createElement('video');
        videoElement.src = sourceVideo.url;
        videoElement.muted = true;
    
        const duration = sourceVideo.duration;
        const frameInterval = 1 / 30;
        let currentTime = 0;
    
        const renderNextFrame = async () => {
            if (currentTime >= duration) {
                recorder.stop();
                return;
            }
    
            videoElement.currentTime = currentTime;
            await new Promise(resolve => {
                const onSeeked = () => { videoElement.removeEventListener('seeked', onSeeked); resolve(null); };
                videoElement.addEventListener('seeked', onSeeked);
            });
    
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    
            const activeOverlays = overlays
                .filter(o => currentTime >= o.startTime && currentTime <= o.endTime)
                .sort((a, b) => a.zIndex - b.zIndex);
    
            for (const overlay of activeOverlays) {
                ctx.save();
                ctx.globalAlpha = overlay.opacity;
                
                const renderX = overlay.x * scaleX;
                const renderY = overlay.y * scaleY;
                const renderWidth = overlay.width * scaleX;
                const renderHeight = overlay.height * scaleY;
    
                ctx.translate(renderX + renderWidth / 2, renderY + renderHeight / 2);
                ctx.rotate(overlay.rotation * Math.PI / 180);
                ctx.translate(-(renderX + renderWidth / 2), -(renderY + renderHeight / 2));
    
                if (overlay.type === 'text') {
                    if (overlay.backgroundColor && overlay.backgroundColor !== 'transparent') {
                        ctx.fillStyle = overlay.backgroundColor;
                        ctx.fillRect(renderX, renderY, renderWidth, renderHeight);
                    }
                    const renderFontSize = overlay.fontSize * scaleX;
                    ctx.font = `${overlay.fontStyle} ${overlay.fontWeight} ${renderFontSize}px ${overlay.fontFamily}`;
                    ctx.fillStyle = overlay.color;
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'top';
    
                    if (overlay.shadowBlur > 0) {
                        ctx.shadowColor = overlay.shadowColor;
                        ctx.shadowBlur = overlay.shadowBlur * scaleX;
                        ctx.shadowOffsetX = overlay.shadowOffsetX * scaleX;
                        ctx.shadowOffsetY = overlay.shadowOffsetY * scaleY;
                    }
    
                    if (overlay.strokeWidth > 0) {
                        ctx.strokeStyle = overlay.strokeColor;
                        ctx.lineWidth = overlay.strokeWidth * scaleX;
                        ctx.strokeText(overlay.text, renderX, renderY + (renderFontSize * 0.1)); // Small offset for better alignment
                    }
                    ctx.fillText(overlay.text, renderX, renderY + (renderFontSize * 0.1));
                } else if (overlay.type === 'image') {
                    const img = imageMap.get(overlay.id);
                    if (img) ctx.drawImage(img, renderX, renderY, renderWidth, renderHeight);
                }
                ctx.restore();
            }
    
            setRenderProgress((currentTime / duration) * 100);
            currentTime += frameInterval;
            requestAnimationFrame(renderNextFrame);
        };
    
        renderNextFrame();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-base-100 z-50 flex flex-col font-sans" role="dialog" aria-modal="true">
            <header className="flex-shrink-0 bg-base-200/80 backdrop-blur-sm border-b border-base-300 w-full z-10 p-4 flex justify-between items-center">
                <h2 className="text-xl font-bold text-pink-400">{t('videoOverlayEditor.title') as string}</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-white"><XCircleIcon className="h-6 w-6" /></button>
            </header>
            <div className="flex-grow flex overflow-hidden">
                <aside className="w-80 bg-base-200 p-4 space-y-4 overflow-y-auto">
                    <div className="p-4 border border-base-300 rounded-lg">
                        <h3 className="font-semibold mb-2">{t('videoOverlayEditor.uploadVideo.title') as string}</h3>
                        <label className="w-full text-sm py-2 px-4 rounded-md bg-base-300 hover:bg-brand-primary/50 block text-center cursor-pointer">
                            {sourceVideo ? sourceVideo.file.name : "Choose File"}
                            <input type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
                        </label>
                    </div>
                    {sourceVideo && (
                    <>
                        <div className="p-4 border border-base-300 rounded-lg">
                            <h3 className="font-semibold mb-2">{t('videoOverlayEditor.addOverlays.title') as string}</h3>
                            <div className="space-y-2">
                                <button onClick={addTextOverlay} className="w-full text-sm py-2 px-4 rounded-md bg-base-300 hover:bg-brand-primary/50">{t('videoOverlayEditor.addOverlays.addText') as string}</button>
                                <label className="w-full text-sm py-2 px-4 rounded-md bg-base-300 hover:bg-brand-primary/50 block text-center cursor-pointer">
                                    {t('videoOverlayEditor.addOverlays.addImage') as string}
                                    <input type="file" accept="image/*" onChange={addImageOverlay} className="hidden" />
                                </label>
                            </div>
                        </div>
                        <div className="p-4 border border-base-300 rounded-lg">
                             <h3 className="font-semibold mb-2">{t('videoOverlayEditor.layers.title') as string}</h3>
                             <div className="space-y-2">
                                {overlays.map(o => (
                                    <div key={o.id} onClick={() => setSelectedOverlayId(o.id)} className={`p-2 rounded-md cursor-pointer ${selectedOverlayId === o.id ? 'bg-brand-primary/30 ring-2 ring-brand-primary' : 'bg-base-300'}`}>
                                        <p className="text-sm truncate">{o.type === 'text' ? o.text : t('videoOverlayEditor.layers.imageLayer') as string}</p>
                                    </div>
                                ))}
                             </div>
                        </div>
                        <div className="p-4 border border-base-300 rounded-lg">
                             <h3 className="font-semibold mb-2">{t('videoOverlayEditor.render.title') as string}</h3>
                             <button onClick={handleRender} disabled={isRendering} className="w-full py-3 bg-green-600 hover:bg-green-700 font-bold rounded-lg disabled:opacity-50">
                                {isRendering ? (t('videoOverlayEditor.render.renderingButton') as string).replace('{progress}', renderProgress.toFixed(0)) : t('videoOverlayEditor.render.button') as string}
                             </button>
                             {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
                             {outputUrl && (
                                <div className="mt-4">
                                    <h4 className="font-semibold text-sm">{t('videoOverlayEditor.render.completeTitle') as string}</h4>
                                    <a href={outputUrl} download="video-with-overlay.webm" className="text-brand-light text-sm hover:underline">{t('videoOverlayEditor.render.downloadButton') as string}</a>
                                </div>
                             )}
                        </div>
                    </>
                    )}
                </aside>
                <main ref={previewContainerRef} className="flex-grow bg-black flex items-center justify-center p-4 relative overflow-hidden">
                    {sourceVideo ? (
                        <div className="video-wrapper relative" style={{ aspectRatio: `${sourceVideo.width}/${sourceVideo.height}`, width: '100%', maxWidth: `${sourceVideo.width}px` }}>
                            <video ref={videoRef} src={sourceVideo.url} controls className="w-full h-full block" />
                            {overlays.map(overlay => (
                                <div 
                                    key={overlay.id}
                                    className="absolute cursor-move"
                                    onMouseDown={(e) => handleMouseDownOnOverlay(e, overlay.id)}
                                    style={{
                                        left: `${(overlay.x / (previewContainerRef.current?.querySelector('.video-wrapper')?.clientWidth || 1)) * 100}%`,
                                        top: `${(overlay.y / (previewContainerRef.current?.querySelector('.video-wrapper')?.clientHeight || 1)) * 100}%`,
                                        width: overlay.width,
                                        height: overlay.height,
                                        transform: `rotate(${overlay.rotation}deg)`,
                                        opacity: overlay.opacity,
                                        zIndex: overlay.zIndex,
                                        border: selectedOverlayId === overlay.id ? '2px dashed #6366f1' : 'none',
                                        boxSizing: 'border-box'
                                    }}
                                >
                                    {overlay.type === 'text' && (
                                        <div
                                            contentEditable={selectedOverlayId === overlay.id}
                                            suppressContentEditableWarning={true}
                                            onBlur={(e) => updateOverlay(overlay.id, { text: e.currentTarget.textContent || '' })}
                                            dangerouslySetInnerHTML={{ __html: overlay.text }}
                                            style={{
                                                width: '100%', height: '100%',
                                                backgroundColor: overlay.backgroundColor,
                                                color: overlay.color,
                                                fontFamily: overlay.fontFamily,
                                                fontSize: overlay.fontSize,
                                                fontWeight: overlay.fontWeight,
                                                fontStyle: overlay.fontStyle,
                                                textDecoration: overlay.textDecoration,
                                                padding: '5px',
                                                outline: 'none',
                                                overflow: 'hidden',
                                                whiteSpace: 'pre-wrap',
                                            }}
                                        />
                                    )}
                                     {overlay.type === 'image' && (
                                        <img src={overlay.src} alt="overlay" className="w-full h-full object-contain" draggable="false" />
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-gray-500">
                            <UploadIcon className="mx-auto h-12 w-12" />
                            <p className="mt-2">{t('videoOverlayEditor.placeholder.upload') as string}</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};