import { useState, useRef, useCallback } from 'react';
import { Upload, X, Download, Sparkles, Camera, Loader2, RotateCcw, ZoomIn, ZoomOut, Move } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/hooks/use-toast';

interface VirtualTryOnProps {
  productImage: string;
  productName: string;
}

function removeBackground(img: HTMLImageElement, threshold = 240): string {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imageData.data;

  const bgR = d[0], bgG = d[1], bgB = d[2];

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const nearWhite = r > threshold && g > threshold && b > threshold;
    const nearBg = Math.abs(r - bgR) < 30 && Math.abs(g - bgG) < 30 && Math.abs(b - bgB) < 30;
    if (nearWhite || nearBg) {
      d[i + 3] = 0;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  ctx.filter = 'blur(1px)';
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(canvas, 0, 0);

  return canvas.toDataURL('image/png');
}

function compositeImages(
  userPhotoSrc: string,
  shoeSrc: string,
  shoeX: number,
  shoeY: number,
  shoeScale: number,
  shoeOpacity: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const userImg = new Image();
    userImg.crossOrigin = 'anonymous';
    userImg.onload = () => {
      canvas.width = userImg.naturalWidth;
      canvas.height = userImg.naturalHeight;
      const ctx = canvas.getContext('2d')!;

      ctx.drawImage(userImg, 0, 0);

      const shoeImg = new Image();
      shoeImg.onload = () => {
        const shoeW = (shoeScale / 100) * canvas.width;
        const shoeH = (shoeW / shoeImg.naturalWidth) * shoeImg.naturalHeight;
        const px = (shoeX / 100) * canvas.width - shoeW / 2;
        const py = (shoeY / 100) * canvas.height - shoeH / 2;

        ctx.globalAlpha = shoeOpacity / 100;
        ctx.drawImage(shoeImg, px, py, shoeW, shoeH);
        ctx.globalAlpha = 1;

        resolve(canvas.toDataURL('image/jpeg', 0.92));
      };
      shoeImg.onerror = reject;
      shoeImg.src = shoeSrc;
    };
    userImg.onerror = reject;
    userImg.src = userPhotoSrc;
  });
}

export default function VirtualTryOn({ productImage, productName }: VirtualTryOnProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'upload' | 'adjust' | 'result'>('upload');
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [processedShoe, setProcessedShoe] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [shoeX, setShoeX] = useState(50);
  const [shoeY, setShoeY] = useState(80);
  const [shoeScale, setShoeScale] = useState(30);
  const [shoeOpacity, setShoeOpacity] = useState(90);
  const [compositing, setCompositing] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const handleOpen = () => { setIsOpen(true); setStep('upload'); resetState(); };
  const handleClose = () => { setIsOpen(false); resetState(); };

  const resetState = () => {
    setUserPhoto(null);
    setProcessedShoe(null);
    setResultImage(null);
    setStep('upload');
    setShoeX(50);
    setShoeY(80);
    setShoeScale(30);
    setShoeOpacity(90);
  };

  const processShoeBackground = useCallback((src: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const result = removeBackground(img, 230);
          resolve(result);
        } catch {
          resolve(src);
        }
      };
      img.onerror = () => resolve(src);
      img.src = src;
    });
  }, []);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessing(true);
    toast({ title: '🔄 Processing...', description: 'Removing shoe background and preparing try-on' });

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const photoDataUrl = ev.target?.result as string;
      setUserPhoto(photoDataUrl);

      const shoeNoBg = await processShoeBackground(productImage);
      setProcessedShoe(shoeNoBg);

      setProcessing(false);
      setStep('adjust');
      toast({ title: '✅ Ready!', description: 'Drag the sliders to position the shoe on your feet.' });
    };
    reader.readAsDataURL(file);
  };

  const generateResult = async () => {
    if (!userPhoto || !processedShoe) return;
    setCompositing(true);
    try {
      const result = await compositeImages(userPhoto, processedShoe, shoeX, shoeY, shoeScale, shoeOpacity);
      setResultImage(result);
      setStep('result');
    } catch (e: any) {
      toast({ title: 'Processing failed', description: e.message, variant: 'destructive' });
    }
    setCompositing(false);
  };

  const downloadResult = () => {
    if (!resultImage) return;
    const a = document.createElement('a');
    a.href = resultImage;
    a.download = `stopy-tryon-${productName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.jpg`;
    a.click();
    toast({ title: '📸 Photo saved!', description: 'Your try-on photo has been downloaded.' });
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleOpen}
        className="gap-1.5 border-primary/30 text-primary hover:bg-primary/5 text-xs"
      >
        <Camera className="h-3.5 w-3.5" /> Virtual Try-On
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-0 z-50 bg-black/95 flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div>
                <p className="text-white font-bold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" /> AI Virtual Try-On
                </p>
                <p className="text-white/60 text-xs">{productName}</p>
              </div>
              <button onClick={handleClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">

              {step === 'upload' && (
                <div className="space-y-4">
                  <div className="bg-white/5 rounded-xl p-4 space-y-2 text-sm text-white/70">
                    <p className="text-white font-medium">How it works:</p>
                    <p>1. Upload a full-body or foot-focused photo</p>
                    <p>2. AI removes the shoe background automatically</p>
                    <p>3. Position the shoe on your feet with sliders</p>
                    <p>4. Generate your realistic try-on photo</p>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-24 h-24 rounded-xl overflow-hidden bg-white/10 border border-white/20 flex-shrink-0">
                      <img src={productImage} alt={productName} className="w-full h-full object-contain" />
                    </div>
                    <div>
                      <p className="text-white/80 text-sm font-medium">{productName}</p>
                      <p className="text-white/50 text-xs mt-1">Background will be removed automatically</p>
                    </div>
                  </div>

                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />

                  <button
                    onClick={() => photoInputRef.current?.click()}
                    disabled={processing}
                    className="w-full border-2 border-dashed border-white/30 rounded-xl p-8 flex flex-col items-center gap-3 text-white/70 hover:border-primary/60 hover:text-white/90 transition-all disabled:opacity-50"
                  >
                    {processing ? (
                      <><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="text-sm">Processing shoe image...</p></>
                    ) : (
                      <><Upload className="h-8 w-8" /><p className="text-sm font-medium">Upload Your Photo</p><p className="text-xs opacity-60">Full body or foot-focused works best</p><p className="text-xs opacity-40">JPG, PNG supported</p></>
                    )}
                  </button>
                </div>
              )}

              {step === 'adjust' && userPhoto && processedShoe && (
                <div className="space-y-4">
                  <div className="relative bg-black rounded-xl overflow-hidden" ref={previewRef}>
                    <img src={userPhoto} alt="Your photo" className="w-full object-contain max-h-[50vh]" />
                    <div
                      className="absolute pointer-events-none"
                      style={{
                        left: `${shoeX}%`,
                        top: `${shoeY}%`,
                        transform: 'translate(-50%, -50%)',
                        width: `${shoeScale}%`,
                        opacity: shoeOpacity / 100,
                        filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.6))',
                      }}
                    >
                      <img src={processedShoe} alt={productName} className="w-full object-contain" />
                    </div>
                  </div>

                  <div className="space-y-3 bg-white/5 rounded-xl p-4">
                    <p className="text-white/80 text-xs font-semibold uppercase tracking-wide">Adjust Shoe Position</p>

                    {[
                      { label: 'Position X', value: shoeX, min: 10, max: 90, onChange: setShoeX, icon: <Move className="h-3 w-3" /> },
                      { label: 'Position Y', value: shoeY, min: 10, max: 100, onChange: setShoeY, icon: <Move className="h-3 w-3 rotate-90" /> },
                      { label: 'Size', value: shoeScale, min: 10, max: 80, onChange: setShoeScale, icon: <ZoomIn className="h-3 w-3" /> },
                      { label: 'Blend', value: shoeOpacity, min: 40, max: 100, onChange: setShoeOpacity, icon: <Sparkles className="h-3 w-3" /> },
                    ].map(ctrl => (
                      <div key={ctrl.label} className="flex items-center gap-3">
                        <div className="text-white/50">{ctrl.icon}</div>
                        <span className="text-white/70 text-xs w-20">{ctrl.label}</span>
                        <input
                          type="range" min={ctrl.min} max={ctrl.max} value={ctrl.value}
                          onChange={e => ctrl.onChange(Number(e.target.value))}
                          className="flex-1 accent-primary"
                        />
                        <span className="text-white/50 text-xs w-8 text-right">{ctrl.value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <Button variant="ghost" onClick={() => { setStep('upload'); setUserPhoto(null); }}
                      className="text-white/60 hover:text-white gap-2">
                      <RotateCcw className="h-4 w-4" />New Photo
                    </Button>
                    <Button onClick={generateResult} disabled={compositing}
                      className="flex-1 bg-primary hover:bg-primary/90 text-white gap-2">
                      {compositing ? <><Loader2 className="h-4 w-4 animate-spin" />Generating...</> : <><Sparkles className="h-4 w-4" />Generate Try-On Photo</>}
                    </Button>
                  </div>
                </div>
              )}

              {step === 'result' && resultImage && (
                <div className="space-y-4">
                  <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-3 text-green-300 text-sm text-center font-medium">
                    ✅ Your try-on photo is ready!
                  </div>
                  <div className="rounded-xl overflow-hidden">
                    <img src={resultImage} alt="Try-on result" className="w-full object-contain rounded-xl" />
                  </div>
                  <div className="flex gap-3">
                    <Button variant="ghost" onClick={() => setStep('adjust')}
                      className="text-white/60 hover:text-white gap-2">
                      <RotateCcw className="h-4 w-4" />Re-adjust
                    </Button>
                    <Button onClick={downloadResult}
                      className="flex-1 bg-primary hover:bg-primary/90 text-white gap-2">
                      <Download className="h-4 w-4" />Save Photo
                    </Button>
                  </div>
                  <button onClick={() => { setStep('upload'); resetState(); }}
                    className="w-full text-white/40 hover:text-white/70 text-xs py-2 transition-colors">
                    Start over with a different photo
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
