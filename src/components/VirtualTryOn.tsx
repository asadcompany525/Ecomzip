import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, X, RotateCcw, Download, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/hooks/use-toast';

interface VirtualTryOnProps {
  productImage: string;
  productName: string;
}

export default function VirtualTryOn({ productImage, productName }: VirtualTryOnProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [overlayOpacity, setOverlayOpacity] = useState(0.7);
  const [overlaySize, setOverlaySize] = useState(50);
  const [overlayPos, setOverlayPos] = useState({ x: 50, y: 70 });
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setCameraError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraReady(true);
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setCameraError('Camera permission denied. Please allow camera access.');
      } else if (err.name === 'NotFoundError') {
        setCameraError('No camera found on this device.');
      } else {
        setCameraError('Could not access camera: ' + err.message);
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  }, []);

  const handleOpen = () => {
    setIsOpen(true);
    startCamera();
  };

  const handleClose = () => {
    stopCamera();
    setIsOpen(false);
    setCameraError('');
  };

  useEffect(() => {
    return () => { stopCamera(); };
  }, [stopCamera]);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const overlayW = (overlaySize / 100) * canvas.width;
      const overlayH = (overlayW / img.naturalWidth) * img.naturalHeight;
      const x = ((overlayPos.x - overlaySize / 2) / 100) * canvas.width;
      const y = ((overlayPos.y - 10) / 100) * canvas.height;
      ctx.globalAlpha = overlayOpacity;
      ctx.drawImage(img, x, y, overlayW, overlayH);
      ctx.globalAlpha = 1;

      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `stopy-tryon-${Date.now()}.jpg`;
      a.click();
      toast({ title: '📸 Photo saved!' });
    };
    img.src = productImage;
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleOpen}
        className="gap-1.5 border-primary/30 text-primary hover:bg-primary/5 text-xs"
      >
        <Camera className="h-3.5 w-3.5" /> Virtual Try-On (AR)
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black"
          >
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent">
              <div>
                <p className="text-white font-bold text-sm">Virtual Try-On</p>
                <p className="text-white/70 text-xs">{productName}</p>
              </div>
              <button onClick={handleClose} className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Camera feed */}
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              muted
              playsInline
              autoPlay
            />

            {/* Hidden canvas for capture */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Error state */}
            {cameraError && (
              <div className="absolute inset-0 flex items-center justify-center p-8">
                <div className="bg-black/80 rounded-2xl p-6 text-center space-y-4 max-w-sm">
                  <Camera className="h-12 w-12 text-white/40 mx-auto" />
                  <p className="text-white text-sm">{cameraError}</p>
                  <Button onClick={startCamera} variant="outline" className="text-white border-white/30">
                    <RotateCcw className="h-4 w-4 mr-2" /> Try Again
                  </Button>
                </div>
              </div>
            )}

            {/* Product overlay */}
            {cameraReady && !cameraError && (
              <div
                className="absolute pointer-events-none"
                style={{
                  left: `${overlayPos.x}%`,
                  top: `${overlayPos.y}%`,
                  transform: 'translate(-50%, -50%)',
                  width: `${overlaySize}%`,
                  opacity: overlayOpacity,
                }}
              >
                <img
                  src={productImage}
                  alt={productName}
                  className="w-full object-contain drop-shadow-2xl"
                  style={{ filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.5))' }}
                />
              </div>
            )}

            {/* AR Badge */}
            {cameraReady && (
              <div className="absolute top-16 right-4 flex items-center gap-1.5 bg-primary/90 text-white text-xs px-2.5 py-1.5 rounded-full">
                <Sparkles className="h-3 w-3 animate-pulse" /> AR Active
              </div>
            )}

            {/* Controls */}
            {cameraReady && !cameraError && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-white text-xs w-16">Size</span>
                    <input
                      type="range" min={20} max={90} value={overlaySize}
                      onChange={e => setOverlaySize(Number(e.target.value))}
                      className="flex-1 accent-primary"
                    />
                    <span className="text-white text-xs w-8">{overlaySize}%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-white text-xs w-16">Opacity</span>
                    <input
                      type="range" min={30} max={100} value={overlayOpacity * 100}
                      onChange={e => setOverlayOpacity(Number(e.target.value) / 100)}
                      className="flex-1 accent-primary"
                    />
                    <span className="text-white text-xs w-8">{Math.round(overlayOpacity * 100)}%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-white text-xs w-16">Position Y</span>
                    <input
                      type="range" min={10} max={90} value={overlayPos.y}
                      onChange={e => setOverlayPos(p => ({ ...p, y: Number(e.target.value) }))}
                      className="flex-1 accent-primary"
                    />
                  </div>
                </div>

                <div className="flex gap-3 justify-center">
                  <button
                    onClick={capturePhoto}
                    className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg"
                  >
                    <div className="w-12 h-12 rounded-full border-4 border-gray-300 flex items-center justify-center">
                      <Download className="h-5 w-5 text-gray-700" />
                    </div>
                  </button>
                </div>
                <p className="text-white/60 text-xs text-center">Tap the button to save your photo</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
