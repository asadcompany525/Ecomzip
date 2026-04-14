import { useState, useRef, useCallback } from 'react';
import {
  Upload, X, Download, Sparkles, Loader2,
  RotateCcw, ZoomIn, Move, Brain, CheckCircle, AlertTriangle, Camera
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { supabase } from '@/integrations/supabase/client';

export type TryOnCategory = 'shoes' | 'clothing' | 'bags' | 'generic';

interface VirtualTryOnProps {
  productImage: string;
  productName: string;
  productCategory?: string;
}

function detectCategoryType(productName: string, productCategory: string | undefined): TryOnCategory {
  const combined = `${productName} ${productCategory || ''}`.toLowerCase();
  if (/bag|purse|wallet|tote|backpack|handbag|clutch|satchel/.test(combined)) return 'bags';
  if (/shirt|dress|pant|kurta|coat|jacket|jeans|cloth|wear|top|trouser|shalwar|kameez|hoodie|sweater|suit/.test(combined)) return 'clothing';
  if (/shoe|sandal|slipper|boot|loafer|sneaker|chappal|khussa|heel|moccasin|pump/.test(combined)) return 'shoes';
  return 'generic';
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function compressImage(dataUrl: string, maxDim = 900, quality = 0.78): Promise<string> {
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

function removeBackground(img: HTMLImageElement, threshold = 235): string {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = data.data;
  const corners = [0, (canvas.width - 1) * 4,
    (canvas.height - 1) * canvas.width * 4,
    ((canvas.height - 1) * canvas.width + canvas.width - 1) * 4];
  let bgR = 0, bgG = 0, bgB = 0;
  corners.forEach(i => { bgR += d[i]; bgG += d[i + 1]; bgB += d[i + 2]; });
  bgR = Math.round(bgR / 4); bgG = Math.round(bgG / 4); bgB = Math.round(bgB / 4);
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    if ((r > threshold && g > threshold && b > threshold) ||
      (Math.abs(r - bgR) < 28 && Math.abs(g - bgG) < 28 && Math.abs(b - bgB) < 28)) {
      d[i + 3] = 0;
    }
  }
  ctx.putImageData(data, 0, 0);
  return canvas.toDataURL('image/png');
}

function drawWatermark(ctx: CanvasRenderingContext2D, W: number, H: number, brandLabel = 'Try-On') {
  const fontSize = Math.max(13, Math.round(W * 0.022));
  ctx.save();
  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  const text = brandLabel;
  const tw = ctx.measureText(text).width;
  const pad = Math.round(fontSize * 0.5);
  const bx = W - tw - pad * 2 - 12;
  const by = H - fontSize - pad * 2 - 12;
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = 'rgba(20,20,20,0.5)';
  if (ctx.roundRect) {
    ctx.beginPath(); ctx.roundRect(bx, by, tw + pad * 2, fontSize + pad * 2, 6); ctx.fill();
  } else { ctx.fillRect(bx, by, tw + pad * 2, fontSize + pad * 2); }
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, bx + pad, by + fontSize + pad * 0.4);
  ctx.restore();
}

async function renderComposite(
  canvas: HTMLCanvasElement,
  userSrc: string,
  productSrc: string,
  x: number, y: number, w: number,
  opacity: number,
  mirrored: boolean,
  angle: number,
  brandLabel = 'Try-On'
) {
  const [userImg, productImg] = await Promise.all([loadImg(userSrc), loadImg(productSrc)]);
  canvas.width = userImg.naturalWidth;
  canvas.height = userImg.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(userImg, 0, 0);

  const W = canvas.width, H = canvas.height;
  const pw = (w / 100) * W;
  const ph = pw * (productImg.naturalHeight / productImg.naturalWidth);
  const px = (x / 100) * W;
  const py = (y / 100) * H;

  ctx.save();
  ctx.globalAlpha = opacity / 100;
  ctx.translate(px, py);
  if (angle !== 0) ctx.rotate((angle * Math.PI) / 180);
  ctx.filter = 'drop-shadow(0px 8px 20px rgba(0,0,0,0.5))';
  if (mirrored) {
    ctx.scale(-1, 1);
    ctx.drawImage(productImg, -pw / 2, -ph / 2, pw, ph);
  } else {
    ctx.drawImage(productImg, -pw / 2, -ph / 2, pw, ph);
  }
  ctx.restore();
  drawWatermark(ctx, W, H, brandLabel);
}

interface AIPlacement {
  detected: boolean;
  x: number;
  y: number;
  width: number;
  angle: number;
  note: string;
}

async function analyzeWithAI(
  userImageUrl: string,
  productImageUrl: string,
  categoryType: TryOnCategory
): Promise<AIPlacement> {
  const { data, error } = await supabase.functions.invoke('ai-assistant', {
    body: {
      type: 'virtual-tryon',
      userImageUrl,
      productImageUrl,
      categoryType,
    },
  });
  if (error) throw new Error(error.message || 'AI analysis failed');
  return data as AIPlacement;
}

export default function VirtualTryOn({ productImage, productName, productCategory }: VirtualTryOnProps) {
  const { brandName } = useStoreSettings();
  const categoryType = detectCategoryType(productName, productCategory);

  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'upload' | 'analyzing' | 'adjust' | 'result'>('upload');

  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [processedProduct, setProcessedProduct] = useState<string | null>(null);
  const [aiDetected, setAiDetected] = useState(false);
  const [aiNote, setAiNote] = useState('');

  const [posX, setPosX] = useState(50);
  const [posY, setPosY] = useState(75);
  const [sizeW, setSizeW] = useState(28);
  const [opacity, setOpacity] = useState(92);
  const [mirrored, setMirrored] = useState(false);
  const [angle, setAngle] = useState(0);
  const [compositing, setCompositing] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ active: boolean; lastX: number; lastY: number }>({ active: false, lastX: 0, lastY: 0 });

  const resetState = useCallback(() => {
    setUserPhoto(null); setProcessedProduct(null); setResultImage(null);
    setStep('upload'); setAiDetected(false); setAiNote('');
    setPosX(50); setPosY(75); setSizeW(28); setOpacity(92);
    setMirrored(false); setAngle(0);
  }, []);

  const handleOpen = () => { setIsOpen(true); resetState(); };
  const handleClose = () => { setIsOpen(false); resetState(); };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessing(true);

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const raw = ev.target?.result as string;
        const compressed = await compressImage(raw, 900, 0.78);
        setUserPhoto(compressed);

        let productSrc = productImage;
        try {
          const prodEl = await loadImg(productImage);
          productSrc = removeBackground(prodEl, 230);
        } catch { /* keep original */ }
        setProcessedProduct(productSrc);

        setProcessing(false);
        setStep('analyzing');
        toast({ title: '🧠 AI analysing…', description: 'Finding the best placement for your try-on.' });

        try {
          const placement = await analyzeWithAI(compressed, productImage, categoryType);
          if (placement.detected) {
            setPosX(Math.round(placement.x));
            setPosY(Math.round(placement.y));
            setSizeW(Math.round(placement.width));
            setAngle(Math.round(placement.angle ?? 0));
            setAiDetected(true);
            setAiNote(placement.note || '');
            toast({ title: '✅ AI positioned!', description: placement.note || 'Fine-tune with sliders if needed.' });
          } else {
            setAiDetected(false);
            setAiNote(placement.note || '');
            toast({ title: '📐 Manual mode', description: 'AI could not detect the body part — adjust with sliders.' });
          }
        } catch (aiErr: any) {
          console.warn('[VirtualTryOn] AI error:', aiErr);
          setAiDetected(false);
          toast({ title: '📐 Manual mode', description: 'AI unavailable — position manually with sliders.' });
        }

        setStep('adjust');

      } catch (err: any) {
        setProcessing(false);
        toast({ title: 'Upload failed', description: err?.message, variant: 'destructive' });
      }
    };
    reader.readAsDataURL(file);
  };

  const updateCanvas = useCallback(async () => {
    if (!canvasRef.current || !userPhoto || !processedProduct) return;
    try {
      await renderComposite(canvasRef.current, userPhoto, processedProduct, posX, posY, sizeW, opacity, mirrored, angle, brandName || 'Try-On');
    } catch (err) { console.warn('[VirtualTryOn] Canvas render error:', err); }
  }, [userPhoto, processedProduct, posX, posY, sizeW, opacity, mirrored, angle, brandName]);

  const prevAdjust = useRef('');
  const adjustKey = `${posX},${posY},${sizeW},${opacity},${mirrored},${angle}`;
  if (step === 'adjust' && adjustKey !== prevAdjust.current) {
    prevAdjust.current = adjustKey;
    updateCanvas();
  }

  const generateResult = async () => {
    if (!userPhoto || !processedProduct) return;
    setCompositing(true);
    try {
      const c = document.createElement('canvas');
      await renderComposite(c, userPhoto, processedProduct, posX, posY, sizeW, opacity, mirrored, angle, brandName || 'Try-On');
      setResultImage(c.toDataURL('image/jpeg', 0.93));
      setStep('result');
    } catch (err: any) {
      toast({ title: 'Failed', description: err?.message, variant: 'destructive' });
    }
    setCompositing(false);
  };

  const downloadResult = () => {
    if (!resultImage) return;
    const a = document.createElement('a');
    a.href = resultImage;
    const brand = (brandName || 'tryon').replace(/\s+/g, '-').toLowerCase();
    a.download = `${brand}-tryon-${productName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.jpg`;
    a.click();
    toast({ title: '📸 Saved!' });
  };

  const getCanvasPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0]?.clientX ?? 0 : e.clientX;
    const clientY = 'touches' in e ? e.touches[0]?.clientY ?? 0 : e.clientY;
    return {
      pctX: ((clientX - rect.left) / rect.width) * 100,
      pctY: ((clientY - rect.top) / rect.height) * 100,
    };
  };

  const onDragStart = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (step !== 'adjust') return;
    e.preventDefault();
    if (!canvasRef.current) return;
    const { pctX, pctY } = getCanvasPos(e, canvasRef.current);
    dragRef.current = { active: true, lastX: pctX, lastY: pctY };
  };

  const onDragMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!dragRef.current.active || step !== 'adjust') return;
    e.preventDefault();
    if (!canvasRef.current) return;
    const { pctX, pctY } = getCanvasPos(e, canvasRef.current);
    const dx = pctX - dragRef.current.lastX;
    const dy = pctY - dragRef.current.lastY;
    dragRef.current.lastX = pctX;
    dragRef.current.lastY = pctY;
    setPosX(x => Math.min(95, Math.max(5, x + dx)));
    setPosY(y => Math.min(100, Math.max(5, y + dy)));
  };

  const onDragEnd = () => { dragRef.current.active = false; };

  const sliders = [
    { label: 'X Position', value: posX,   min: 5,  max: 95,  set: setPosX,    icon: <Move className="h-3 w-3" /> },
    { label: 'Y Position', value: posY,   min: 5,  max: 100, set: setPosY,    icon: <Move className="h-3 w-3 rotate-90" /> },
    { label: 'Size',       value: sizeW,  min: 8,  max: 65,  set: setSizeW,   icon: <ZoomIn className="h-3 w-3" /> },
    { label: 'Blend',      value: opacity,min: 40, max: 100, set: setOpacity, icon: <Sparkles className="h-3 w-3" /> },
    { label: 'Angle',      value: angle,  min: -45,max: 45,  set: setAngle,   icon: <RotateCcw className="h-3 w-3" /> },
  ];

  const categoryHint = categoryType === 'bags'
    ? 'shoulder, arm or wrist visible'
    : categoryType === 'clothing'
    ? 'full body or torso visible'
    : 'full body or feet visible';

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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col"
            style={{ background: 'rgba(0,0,0,0.88)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0" style={{ background: 'rgba(0,0,0,0.6)' }}>
              <div>
                <p className="text-white font-bold flex items-center gap-2 text-sm">
                  <Sparkles className="h-4 w-4 text-primary" /> AI Virtual Try-On
                </p>
                <p className="text-white/50 text-xs mt-0.5">{productName}</p>
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">

              {/* ── Upload step ── */}
              {step === 'upload' && (
                <div className="space-y-4">
                  {/* How it works */}
                  <div className="bg-white/5 rounded-xl p-3.5 space-y-1.5 text-xs text-white/55">
                    <p className="text-white/80 font-medium text-sm flex items-center gap-1.5">
                      <Brain className="h-4 w-4 text-primary" /> How AI Try-On works
                    </p>
                    <p>① Upload a photo with your {categoryHint}</p>
                    <p>② AI detects your body and positions the product</p>
                    <p>③ Fine-tune with sliders, then download your photo</p>
                  </div>

                  {/* Product preview */}
                  <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-white/10 border border-white/15 flex-shrink-0">
                      <img src={productImage} alt={productName} className="w-full h-full object-contain" />
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{productName}</p>
                      <p className="text-white/40 text-xs mt-0.5 capitalize">{categoryType} try-on</p>
                    </div>
                  </div>

                  {/* Upload button */}
                  <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                  <button
                    onClick={() => inputRef.current?.click()}
                    disabled={processing}
                    className="w-full border-2 border-dashed border-white/20 rounded-xl p-10 flex flex-col items-center gap-3 text-white/60 hover:border-primary/60 hover:text-white/90 transition-all disabled:opacity-50"
                  >
                    {processing
                      ? <><Loader2 className="h-9 w-9 animate-spin text-primary" /><p className="text-sm">Processing image…</p></>
                      : <>
                        <Upload className="h-9 w-9" />
                        <p className="text-sm font-semibold">Upload Your Photo</p>
                        <p className="text-xs opacity-50 text-center">Make sure your {categoryHint}</p>
                      </>
                    }
                  </button>
                </div>
              )}

              {/* ── Analyzing step ── */}
              {step === 'analyzing' && (
                <div className="flex flex-col items-center justify-center gap-5 py-16">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-primary/15 flex items-center justify-center">
                      <Brain className="h-10 w-10 text-primary" />
                    </div>
                    <Loader2 className="h-20 w-20 animate-spin text-primary/30 absolute inset-0" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-white font-medium">AI analysing your photo…</p>
                    <p className="text-white/40 text-sm">
                      {categoryType === 'bags' ? 'Detecting shoulder / hand position'
                        : categoryType === 'clothing' ? 'Detecting torso / shoulder position'
                        : 'Detecting feet / ankle position'}
                    </p>
                  </div>
                </div>
              )}

              {/* ── Adjust step ── */}
              {step === 'adjust' && userPhoto && processedProduct && (
                <div className="space-y-4">
                  {/* AI status badge */}
                  <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                    aiDetected
                      ? 'bg-green-500/15 border border-green-500/25 text-green-300'
                      : 'bg-amber-500/15 border border-amber-500/25 text-amber-300'
                  }`}>
                    {aiDetected
                      ? <><CheckCircle className="h-4 w-4 flex-shrink-0" /><span>{aiNote || 'AI positioned the product — fine-tune with sliders'}</span></>
                      : <><AlertTriangle className="h-4 w-4 flex-shrink-0" /><span>{aiNote || 'Adjust manually with sliders below'}</span></>
                    }
                  </div>

                  {/* Canvas */}
                  <div className="relative rounded-xl overflow-hidden bg-black">
                    <canvas
                      ref={canvasRef}
                      className="w-full rounded-xl block touch-none select-none"
                      style={{ maxHeight: '52vh', objectFit: 'contain', cursor: 'grab' }}
                      onMouseDown={onDragStart}
                      onMouseMove={onDragMove}
                      onMouseUp={onDragEnd}
                      onMouseLeave={onDragEnd}
                      onTouchStart={onDragStart}
                      onTouchMove={onDragMove}
                      onTouchEnd={onDragEnd}
                    />
                    <div className="absolute top-2 left-2 bg-black/50 rounded-md px-2 py-1 pointer-events-none flex items-center gap-1">
                      <Move className="h-3 w-3 text-white/60" />
                      <span className="text-white/60 text-[10px]">Drag to reposition</span>
                    </div>
                  </div>

                  {/* Mirror toggle */}
                  <div className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-2.5">
                    <span className="text-white/65 text-xs">Mirror product</span>
                    <button
                      onClick={() => setMirrored(m => !m)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${mirrored ? 'bg-primary' : 'bg-white/20'}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${mirrored ? 'left-[22px]' : 'left-0.5'}`} />
                    </button>
                  </div>

                  {/* Sliders */}
                  <div className="space-y-3 bg-white/5 rounded-xl p-4">
                    <p className="text-white/55 text-xs font-semibold uppercase tracking-widest">Fine-tune</p>
                    {sliders.map(ctrl => (
                      <div key={ctrl.label} className="flex items-center gap-3">
                        <div className="text-white/35">{ctrl.icon}</div>
                        <span className="text-white/60 text-xs w-20">{ctrl.label}</span>
                        <input
                          type="range" min={ctrl.min} max={ctrl.max} value={ctrl.value}
                          onChange={e => ctrl.set(Number(e.target.value))}
                          className="flex-1 accent-primary"
                        />
                        <span className="text-white/35 text-xs w-8 text-right">{ctrl.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <Button
                      variant="ghost"
                      onClick={() => { setStep('upload'); setUserPhoto(null); }}
                      className="text-white/50 hover:text-white gap-2"
                    >
                      <RotateCcw className="h-4 w-4" /> New Photo
                    </Button>
                    <Button
                      onClick={generateResult}
                      disabled={compositing}
                      className="flex-1 bg-primary hover:bg-primary/90 text-white gap-2"
                    >
                      {compositing
                        ? <><Loader2 className="h-4 w-4 animate-spin" />Generating…</>
                        : <><Sparkles className="h-4 w-4" />Generate Photo</>
                      }
                    </Button>
                  </div>
                </div>
              )}

              {/* ── Result step ── */}
              {step === 'result' && resultImage && (
                <div className="space-y-4">
                  <div className="bg-green-500/15 border border-green-500/25 rounded-xl p-3 text-green-300 text-sm text-center font-medium">
                    ✅ Your try-on photo is ready!
                  </div>
                  <img src={resultImage} alt="Try-on result" className="w-full object-contain rounded-xl" />
                  <div className="flex gap-3">
                    <Button
                      variant="ghost"
                      onClick={() => setStep('adjust')}
                      className="text-white/50 hover:text-white gap-2"
                    >
                      <RotateCcw className="h-4 w-4" /> Re-adjust
                    </Button>
                    <Button
                      onClick={downloadResult}
                      className="flex-1 bg-primary hover:bg-primary/90 text-white gap-2"
                    >
                      <Download className="h-4 w-4" /> Save Photo
                    </Button>
                  </div>
                  <button
                    onClick={() => { setStep('upload'); resetState(); }}
                    className="w-full text-white/30 hover:text-white/60 text-xs py-2 transition-colors"
                  >
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
