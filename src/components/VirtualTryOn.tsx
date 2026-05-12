import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload, X, Download, Sparkles, Loader2,
  RotateCcw, Brain, CheckCircle, AlertTriangle, Camera,
  Clock, Wand2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { supabase } from '@/integrations/supabase/client';
import { createCanvasTryOn } from '@/lib/tryonCanvas';

export type TryOnCategory = 'shoes' | 'clothing' | 'bags' | 'generic';

interface VirtualTryOnProps {
  productImage: string;
  productName: string;
  productCategory?: string;
}

type Step = 'upload' | 'uploading' | 'processing' | 'result' | 'error';

function detectCategoryType(productName: string, productCategory: string | undefined): TryOnCategory {
  const combined = `${productName} ${productCategory || ''}`.toLowerCase();
  if (/bag|purse|wallet|tote|backpack|handbag|clutch|satchel/.test(combined)) return 'bags';
  if (/shirt|dress|pant|kurta|coat|jacket|jeans|cloth|wear|top|trouser|shalwar|kameez|hoodie|sweater|suit/.test(combined)) return 'clothing';
  if (/shoe|sandal|slipper|boot|loafer|sneaker|chappal|khussa|heel|moccasin|pump/.test(combined)) return 'shoes';
  return 'generic';
}

function compressImage(dataUrl: string, maxDim = 1024, quality = 0.85): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d')!.drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.src = dataUrl;
  });
}

async function createFallbackTryOn(userImageUrl: string, productImageUrl: string, categoryType: TryOnCategory): Promise<string> {
  return createCanvasTryOn(userImageUrl, productImageUrl, categoryType);
}

async function startVTON(userImageUrl: string, productImageUrl: string, categoryType: TryOnCategory, productTitle?: string) {
  const { data, error } = await supabase.functions.invoke('ai-assistant', {
    body: { type: 'virtual-tryon-start', userImageUrl, productImageUrl, categoryType, productTitle },
  });
  if (error) throw new Error(error.message || 'Failed to start AI generation');
  if (data?.error) throw new Error(data.error);
  return data as { predictionId: string; status: string };
}

async function pollVTON(predictionId: string) {
  const { data, error } = await supabase.functions.invoke('ai-assistant', {
    body: { type: 'virtual-tryon-poll', predictionId },
  });
  if (error) throw new Error(error.message);
  return data as { status: string; outputUrl?: string; error?: string };
}

const CATEGORY_HINTS: Record<TryOnCategory, string> = {
  shoes: 'full body or lower-body photo showing your feet',
  bags: 'photo showing your upper body and shoulder/arm',
  clothing: 'full body or torso photo facing the camera',
  generic: 'clear full-body photo facing the camera',
};

const CATEGORY_LABELS: Record<TryOnCategory, string> = {
  shoes: 'Shoes', bags: 'Bag', clothing: 'Clothing', generic: 'Item',
};

export default function VirtualTryOn({ productImage, productName, productCategory }: VirtualTryOnProps) {
  const { brandName } = useStoreSettings();
  const categoryType = detectCategoryType(productName, productCategory);

  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<Step>('upload');
  const [userPhotoPreview, setUserPhotoPreview] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [elapsed, setElapsed] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);

  const startTimer = () => {
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
  };
  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const resetState = useCallback(() => {
    cancelledRef.current = true;
    stopTimer();
    setStep('upload');
    setUserPhotoPreview(null);
    setResultImage(null);
    setErrorMsg('');
    setElapsed(0);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleOpen = () => { cancelledRef.current = false; setIsOpen(true); resetState(); };
  const handleClose = () => { setIsOpen(false); resetState(); };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    cancelledRef.current = false;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const raw = ev.target?.result as string;
      try {
        const compressed = await compressImage(raw, 768, 0.78);
        setUserPhotoPreview(compressed);
        setStep('uploading');
        toast({ title: '📤 Uploading photo…', description: 'Preparing your image for AI processing.' });

        if (compressed.length > 7_000_000) throw new Error('Photo is too large. Please upload a smaller photo.');
        const userImageUrl = compressed;

        if (cancelledRef.current) return;
        setStep('processing');
        startTimer();
        toast({ title: '🧠 AI Virtual Try-On started', description: 'This takes 30–60 seconds. Please wait…' });

        let predictionId: string | null = null;
        try {
          const started = await startVTON(userImageUrl, productImage, categoryType, productName);
          predictionId = started.predictionId;
        } catch {
          const fallback = await createFallbackTryOn(userImageUrl, productImage, categoryType);
          stopTimer();
          setResultImage(fallback);
          setStep('result');
          toast({ title: 'Try-On preview ready', description: 'AI service is unavailable, so a visual preview was generated.' });
          return;
        }

        if (cancelledRef.current) return;

        for (let i = 0; i < 30; i++) {
          await new Promise(r => setTimeout(r, 3000));
          if (cancelledRef.current) return;
          const poll = await pollVTON(predictionId);
          if (poll.status === 'succeeded' && poll.outputUrl) {
            stopTimer(); setResultImage(poll.outputUrl); setStep('result');
            toast({ title: '✅ Try-On ready!' });
            return;
          }
          if (poll.status === 'failed') {
            const fallback = await createFallbackTryOn(userImageUrl, productImage, categoryType);
            stopTimer(); setResultImage(fallback); setStep('result');
            toast({ title: 'Try-On preview ready', description: 'AI generation failed, so a visual preview was generated.' });
            return;
          }
        }

        const fallback = await createFallbackTryOn(userImageUrl, productImage, categoryType);
        stopTimer(); setResultImage(fallback); setStep('result');
        toast({ title: 'Try-On preview ready', description: 'AI took too long, so a visual preview was generated.' });

      } catch (err: any) {
        if (cancelledRef.current) return;
        stopTimer();
        setErrorMsg(err.message || 'Something went wrong');
        setStep('error');
        toast({ title: 'Try-On failed', description: err.message, variant: 'destructive' });
      }
    };
    reader.readAsDataURL(file);
  };

  const downloadResult = () => {
    if (!resultImage) return;
    const a = document.createElement('a');
    a.href = resultImage;
    const brand = (brandName || 'tryon').replace(/\s+/g, '-').toLowerCase();
    a.download = `${brand}-ai-tryon-${productName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.jpg`;
    a.click();
    toast({ title: '📸 Saved!' });
  };

  const progressPct = Math.min(95, Math.round((elapsed / 60) * 100));

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleOpen}
        className="gap-1.5 border-primary/30 text-primary hover:bg-primary/5 text-xs">
        <Camera className="h-3.5 w-3.5" /> AI Try-On
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex flex-col overflow-hidden"
            style={{ background: 'rgba(0,0,0,0.95)', height: '100dvh' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0"
              style={{ background: 'rgba(0,0,0,0.7)' }}>
              <div className="min-w-0 flex-1 mr-3">
                <p className="text-white font-bold flex items-center gap-2 text-sm">
                  <Wand2 className="h-4 w-4 text-primary shrink-0" /> AI Virtual Try-On
                </p>
                <p className="text-white/50 text-xs mt-0.5 truncate">{productName}</p>
              </div>
              <button onClick={handleClose}
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 shrink-0 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body — scrollable, no horizontal overflow */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
              <div className="max-w-lg mx-auto w-full p-4 space-y-4">

                {/* Upload */}
                {step === 'upload' && (
                  <div className="space-y-4">
                    <div className="bg-white/5 rounded-xl p-4 space-y-2.5">
                      <p className="text-white font-semibold flex items-center gap-2 text-sm">
                        <Brain className="h-4 w-4 text-primary shrink-0" /> How AI Try-On works
                      </p>
                      <p className="text-white/50 text-xs leading-relaxed">
                        AI detects your body, removes any existing item, and realistically fits the product — adjusting for lighting, pose and texture.
                      </p>
                      <div className="flex flex-col gap-1.5 pt-1">
                        {['Upload your photo', 'AI detects & masks the body area', 'Product is seamlessly fitted on you', 'Download your AI try-on result'].map((s, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-white/60">
                            <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">{i + 1}</span>
                            <span>{s}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
                      <div className="w-14 h-14 rounded-lg overflow-hidden bg-white/10 border border-white/15 flex-shrink-0">
                        <img src={productImage} alt={productName} className="w-full h-full object-contain" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium line-clamp-2">{productName}</p>
                        <p className="text-primary text-xs mt-0.5 font-medium">{CATEGORY_LABELS[categoryType]} Try-On</p>
                      </div>
                    </div>

                    <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                    <button
                      onClick={() => inputRef.current?.click()}
                      className="w-full border-2 border-dashed border-white/20 rounded-xl p-6 flex flex-col items-center gap-3 text-white/60 hover:border-primary/60 hover:text-white/90 transition-all active:scale-98"
                    >
                      <Upload className="h-8 w-8" />
                      <div className="text-center">
                        <p className="text-sm font-semibold">Upload Your Photo</p>
                        <p className="text-xs opacity-50 mt-1">Best results: {CATEGORY_HINTS[categoryType]}</p>
                      </div>
                    </button>
                  </div>
                )}

                {/* Uploading */}
                {step === 'uploading' && (
                  <div className="space-y-4">
                    {userPhotoPreview && (
                      <img src={userPhotoPreview} alt="Your photo" className="w-full rounded-xl object-cover max-h-48 opacity-60" />
                    )}
                    <div className="flex flex-col items-center gap-4 py-8">
                      <Loader2 className="h-10 w-10 animate-spin text-primary" />
                      <p className="text-white font-medium">Uploading photo…</p>
                      <p className="text-white/40 text-sm text-center">Preparing your image for AI processing</p>
                    </div>
                  </div>
                )}

                {/* Processing */}
                {step === 'processing' && (
                  <div className="space-y-4">
                    {userPhotoPreview && (
                      <div className="relative">
                        <img src={userPhotoPreview} alt="Your photo" className="w-full rounded-xl object-cover max-h-48 opacity-40" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="bg-black/70 rounded-xl px-5 py-4 text-center space-y-2">
                            <div className="relative inline-block">
                              <Brain className="h-8 w-8 text-primary" />
                              <Loader2 className="h-12 w-12 animate-spin text-primary/30 absolute -inset-2" />
                            </div>
                            <p className="text-white font-semibold text-sm">AI Generating…</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="bg-white/5 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-white/70 text-sm font-medium flex items-center gap-1.5">
                          <Sparkles className="h-4 w-4 text-primary shrink-0" /> Fitting product…
                        </p>
                        <span className="text-white/40 text-xs flex items-center gap-1 shrink-0">
                          <Clock className="h-3 w-3" /> {elapsed}s
                        </span>
                      </div>

                      <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full"
                          animate={{ width: `${progressPct}%` }}
                          transition={{ duration: 1 }}
                        />
                      </div>

                      <div className="space-y-1.5 text-xs text-white/40">
                        {[
                          { label: 'Detecting body landmarks', done: elapsed > 5 },
                          { label: 'Generating segmentation mask', done: elapsed > 15 },
                          { label: 'Inpainting & removing old item', done: elapsed > 25 },
                          { label: 'Fitting product with pose adaptation', done: elapsed > 38 },
                          { label: 'Finalising lighting & texture', done: elapsed > 50 },
                        ].map(s => (
                          <div key={s.label} className="flex items-center gap-2">
                            {s.done
                              ? <CheckCircle className="h-3 w-3 text-green-400 shrink-0" />
                              : <div className="w-3 h-3 rounded-full border border-white/20 shrink-0" />
                            }
                            <span className={s.done ? 'text-white/70' : ''}>{s.label}</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-white/30 text-xs text-center pt-1">Typically 30–60 seconds</p>
                    </div>
                  </div>
                )}

                {/* Result */}
                {step === 'result' && resultImage && (
                  <div className="space-y-4">
                    <div className="bg-green-500/15 border border-green-500/25 rounded-xl p-3 text-green-300 text-sm text-center font-medium flex items-center justify-center gap-2">
                      <CheckCircle className="h-4 w-4 shrink-0" /> AI Try-On complete!
                    </div>
                    <img src={resultImage} alt="AI Try-On result"
                      className="w-full object-contain rounded-xl border border-white/10 max-h-[50dvh]" />
                    <div className="flex gap-3">
                      <Button variant="ghost" onClick={resetState}
                        className="text-white/50 hover:text-white gap-2">
                        <RotateCcw className="h-4 w-4" /> Try Another
                      </Button>
                      <Button onClick={downloadResult} className="flex-1 bg-primary hover:bg-primary/90 text-white gap-2">
                        <Download className="h-4 w-4" /> Download My AI Look
                      </Button>
                    </div>
                  </div>
                )}

                {/* Error */}
                {step === 'error' && (
                  <div className="space-y-4">
                    <div className="bg-red-500/15 border border-red-500/30 rounded-xl p-4 space-y-2">
                      <div className="flex items-center gap-2 text-red-300 font-medium">
                        <AlertTriangle className="h-4 w-4 shrink-0" /> Try-On failed
                      </div>
                      <p className="text-red-200/70 text-sm">{errorMsg}</p>
                    </div>
                    <Button onClick={resetState} className="w-full gap-2">
                      <RotateCcw className="h-4 w-4" /> Try Again
                    </Button>
                  </div>
                )}

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
