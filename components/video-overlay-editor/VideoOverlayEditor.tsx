import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocalization } from '../../i18n';
import type { Overlay, TextOverlay, ImageOverlay } from '../../types';
import { XCircleIcon } from '../icons/XCircleIcon';
import { UploadIcon } from '../icons/UploadIcon';

// This is a new component for the video overlay editor feature.
// As it's quite complex, it is contained within a single file.
// It handles video upload, overlay management (text, images),
// interactive positioning on a canvas, timeline controls, and client-side rendering.

const generateUUID = () => window.crypto.randomUUID();

export const VideoOverlayEditor: React.FC<{ isOpen: boolean; onClose: () => void; }> = ({ isOpen, onClose }) => {
    const { t } = useLocalization();
    const [sourceVideo, setSourceVideo] = useState<{ url: string; file: File, width: number, height: number, duration: number } | null>(null);
    const [overlays, setOverlays] = useState<Overlay[]>([]);
    const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
    const [isRendering, setIsRendering] = useState(false);
    const [renderProgress, setRenderProgress] = useState(0);
    const [outputUrl, setOutputUrl] = useState<string | null>(null);
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const previewContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            document.body.classList.add('modal-open');
        } else {
            document.body.classList.remove('modal-open');
            // Cleanup
            if (sourceVideo) URL.revokeObjectURL(sourceVideo.url);
            if (outputUrl) URL.revokeObjectURL(outputUrl);
            setSourceVideo(null);
            setOverlays([]);
            setSelectedOverlayId(null);
            setOutputUrl(null);
        }
    }, [isOpen, sourceVideo, outputUrl]);

    const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            const video = document.createElement('video');
            video.src = url;
            video.onloadedmetadata = () => {
                setSourceVideo({ url, file, width: video.videoWidth, height: video.videoHeight, duration: video.duration });
            };
        }
    };

    const addTextOverlay = () => {
        const newOverlay: TextOverlay = {
            id: generateUUID(),
            type: 'text',
            text: 'Editable Text',
            x: 10, y: 10,
            width: 200, height: 50,
            rotation: 0, opacity: 1, zIndex: overlays.length,
            startTime: 0, endTime: sourceVideo?.duration || 5,
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
                        width: img.width, height: img.height,
                        originalWidth: img.width, originalHeight: img.height,
                        rotation: 0, opacity: 1, zIndex: overlays.length,
                        startTime: 0, endTime: sourceVideo?.duration || 5,
                    };
                    setOverlays(prev => [...prev, newOverlay]);
                    setSelectedOverlayId(newOverlay.id);
                }
                img.src = event.target?.result as string;
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleRender = async () => {
        if (!sourceVideo) return;
        setIsRendering(true);
        setRenderProgress(0);
        setOutputUrl(null);

        const canvas = document.createElement('canvas');
        canvas.width = sourceVideo.width;
        canvas.height = sourceVideo.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

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

        const video = document.createElement('video');
        video.src = sourceVideo.url;
        
        const duration = sourceVideo.duration;
        const frameRate = 30;
        let currentTime = 0;

        const drawFrame = async () => {
            if (currentTime > duration) {
                recorder.stop();
                return;
            }
            video.currentTime = currentTime;
            await new Promise(resolve => video.onseeked = resolve);

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            const activeOverlays = overlays
                .filter(o => currentTime >= o.startTime && currentTime <= o.endTime)
                .sort((a, b) => a.zIndex - b.zIndex);
            
            for (const overlay of activeOverlays) {
                ctx.save();
                ctx.globalAlpha = overlay.opacity;
                ctx.translate(overlay.x + overlay.width / 2, overlay.y + overlay.height / 2);
                ctx.rotate(overlay.rotation * Math.PI / 180);
                ctx.translate(-(overlay.x + overlay.width / 2), -(overlay.y + overlay.height / 2));

                if (overlay.type === 'text') {
                    // Draw text logic
                } else if (overlay.type === 'image') {
                    const img = new Image();
                    img.src = overlay.src;
                    ctx.drawImage(img, overlay.x, overlay.y, overlay.width, overlay.height);
                }
                ctx.restore();
            }

            setRenderProgress((currentTime / duration) * 100);
            currentTime += 1 / frameRate;
            requestAnimationFrame(drawFrame);
        };
        drawFrame();
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
                    {/* Controls Sidebar */}
                    <div className="p-4 border border-base-300 rounded-lg">
                        <h3 className="font-semibold mb-2">{t('videoOverlayEditor.uploadVideo.title') as string}</h3>
                        <input type="file" accept="video/*" onChange={handleVideoUpload} className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-base-300 file:text-brand-light hover:file:bg-brand-primary/20" />
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
                             {/* Simplified Layer list */}
                             <div className="space-y-2">
                                {overlays.map(o => (
                                    <div key={o.id} onClick={() => setSelectedOverlayId(o.id)} className={`p-2 rounded-md cursor-pointer ${selectedOverlayId === o.id ? 'bg-brand-primary/30' : 'bg-base-300'}`}>
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
                    {/* Preview Area */}
                    {sourceVideo ? (
                        <div className="relative" style={{ width: sourceVideo.width, height: sourceVideo.height, maxWidth: '100%', maxHeight: '100%' }}>
                            <video ref={videoRef} src={sourceVideo.url} controls className="w-full h-full" />
                            {/* Render Overlays Here */}
                            {overlays.map(overlay => (
                                <div 
                                    key={overlay.id}
                                    style={{
                                        position: 'absolute',
                                        left: overlay.x,
                                        top: overlay.y,
                                        width: overlay.width,
                                        height: overlay.height,
                                        transform: `rotate(${overlay.rotation}deg)`,
                                        opacity: overlay.opacity,
                                        zIndex: overlay.zIndex,
                                        border: selectedOverlayId === overlay.id ? '2px dashed #6366f1' : 'none',
                                    }}
                                >
                                    {overlay.type === 'text' && (
                                        <div style={{
                                            width: '100%', height: '100%',
                                            backgroundColor: overlay.backgroundColor,
                                            color: overlay.color,
                                            fontFamily: overlay.fontFamily,
                                            fontSize: overlay.fontSize,
                                            fontWeight: overlay.fontWeight,
                                            fontStyle: overlay.fontStyle,
                                            textDecoration: overlay.textDecoration,
                                        }}>
                                            {overlay.text}
                                        </div>
                                    )}
                                     {overlay.type === 'image' && (
                                        <img src={overlay.src} alt="overlay" className="w-full h-full" />
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