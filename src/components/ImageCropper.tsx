import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../utils/cropImage';
import { useNotifications } from '../NotificationContext';

interface ImageCropperProps {
    imageSrc: string;
    onCropSave: (croppedImageBase64: File) => void;
    onCropCancel: () => void;
    aspect?: number;
    cropShape?: 'round' | 'rect';
    title?: string;
}

export default function ImageCropper({ 
    imageSrc, 
    onCropSave, 
    onCropCancel,
    aspect = 1,
    cropShape = 'round',
    title = 'Ajustar Foto'
}: ImageCropperProps) {
    const { showToast } = useNotifications();
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleSave = async () => {
        try {
            setIsProcessing(true);
            const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
            if (croppedImage) {
                onCropSave(croppedImage);
            }
        } catch (e) {
            console.error(e);
            showToast("Erro", 'Erro ao processar imagem', "error");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4">
            <div className={`bg-white dark:bg-slate-900 rounded-[2rem] w-full ${aspect > 1 ? 'max-w-[600px]' : 'max-w-[400px]'} flex flex-col overflow-hidden shadow-2xl ring-1 ring-white/10 transition-all duration-300`}>

                {/* Header */}
                <div className="px-6 py-4 flex items-center flex-col gap-1 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
                    <p className="text-xs text-slate-500 text-center">Arraste a imagem ou ajuste o zoom para centralizar no {cropShape === 'round' ? 'círculo' : 'retângulo'}</p>
                </div>

                {/* Cropper Container */}
                <div className="p-6 pb-2">
                    <div 
                        className="relative w-full bg-slate-100 dark:bg-slate-800 rounded-[2rem] overflow-hidden shadow-inner ring-1 ring-black/5 dark:ring-white/5"
                        style={{ aspectRatio: aspect > 1 ? '16/9' : '1/1' }}
                    >
                        <Cropper
                            image={imageSrc}
                            crop={crop}
                            zoom={zoom}
                            aspect={aspect}
                            cropShape={cropShape}
                            onCropChange={setCrop}
                            onCropComplete={onCropComplete}
                            onZoomChange={setZoom}
                            objectFit="contain"
                            minZoom={0.1}
                            restrictPosition={false}
                            classes={{ containerClassName: 'cropper-container' }}
                        />
                    </div>
                </div>

                {/* Controls Container */}
                <div className="p-6 pt-4 flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center px-1">
                            <button
                                onClick={() => setZoom(z => Math.max(0.1, z - 0.2))}
                                className="material-symbols-outlined text-slate-500 hover:text-primary dark:hover:text-primary transition-colors p-1"
                                title="Diminuir Zoom"
                                type="button"
                            >
                                zoom_out
                            </button>
                            <span className="text-xs font-bold text-slate-500 tracking-widest uppercase">Zoom</span>
                            <button
                                onClick={() => setZoom(z => Math.min(3, z + 0.2))}
                                className="material-symbols-outlined text-slate-500 hover:text-primary dark:hover:text-primary transition-colors p-1"
                                title="Aumentar Zoom"
                                type="button"
                            >
                                zoom_in
                            </button>
                        </div>
                        <input
                            type="range"
                            value={zoom}
                            min={0.1}
                            max={3}
                            step={0.1}
                            aria-labelledby="Zoom"
                            onChange={(e) => setZoom(Number(e.target.value))}
                            className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={onCropCancel}
                            disabled={isProcessing}
                            className="flex-1 py-3 px-4 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isProcessing}
                            className="flex-1 py-3 px-4 rounded-xl font-bold bg-primary text-white shadow-lg shadow-primary/30 hover:bg-primary/90 flex justify-center items-center gap-2 transition-all disabled:opacity-70"
                        >
                            {isProcessing ? (
                                <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-xl">check_circle</span>
                                    Salvar
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
