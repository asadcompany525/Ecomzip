import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload, X, Download, Sparkles, Camera, Loader2,
  RotateCcw, ZoomIn, Move, Brain, CheckCircle, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/hooks/use-toast';

interface VirtualTryOnProps {
  productImage: string;
  productName: string;
}

// ── TF.js & PoseDetection (lazy-loaded) ──────────────────────────────────────
let _detectorPromise: Promise<unknown | null> | null = null;

async function getDetector(): Promise<unknown | null> {
  if (_detectorPromise) return _detectorPromise;
  _detectorPromise = (async () => {
    try {
      const tf = await import('@tensorflow/tfjs');
      const poseDetection = await import('@tensorflow-models/pose-detection');
      await tf.ready();
      const detector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        { modelType: (poseDetection as any).movenet?.modelType?.SINGLEPOSE_LIGHTNING ?? 'SinglePose.Lightning' }
      );
      return { detector, poseDetection };
    } catch (err) {
      console.warn('[VirtualTryOn] Pose model load error:', err);
      _detectorPromise = null;
      return null;
    }
  })();
  return _detectorPromise;
}

interface FootDetection {
  x: number;       // 0-100 (% of image width) for shoe center
  y: number;       // 0-100 (% of image height) for shoe center
  w: number;       // 0-100 (% of image width) for shoe width
  mirrored: boolean;
  confidence: number;
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

async function detectFoot(
  userImgEl: HTMLImageElement,
  shoeAspectRatio: number
): Promise<FootDetection | null> {
  const bundle = await getDetector() as any;
  if (!bundle?.detector) return null;

  const { detector } = bundle;
  const W = userImgEl.naturalWidth;
  const H = userImgEl.naturalHeight;

  let poses: any[];
  try {
    poses = await detector.estimatePoses(userImgEl);
  } catch (err) {
    console.warn('[VirtualTryOn] estimatePoses error:', err);
    return null;
  }

  if (!poses.length) return null;

  const kps = poses[0].keypoints;
  const CONF = 0.25;

  const leftAnkle  = kps[15];
  const rightAnkle = kps[16];
  const leftKnee   = kps[13];
  const rightKnee  = kps[14];

  const lScore = leftAnkle?.score  ?? 0;
  const rScore = rightAnkle?.score ?? 0;

  if (lScore < CONF && rScore < CONF) return null;

  // Pick the most confident ankle; right foot = mirrored shoe
  const useLeft = lScore >= rScore;
  const ankle   = useLeft ? leftAnkle  : rightAnkle;
  const knee    = useLeft ? leftKnee   : rightKnee;
  const mirrored = !useLeft;

  // Shoe width ≈ knee-to-ankle distance (foot ≈ lower-leg length)
  let shoeWidthFrac: number;
  if (knee && (knee.score ?? 0) > CONF) {
    const dist = Math.sqrt((ankle.x - knee.x) ** 2 + (ankle.y - knee.y) ** 2);
    shoeWidthFrac = (dist * 0.95) / W;
  } else {
    shoeWidthFrac = 0.22; // fallback: 22 % of image width
  }

  // Clamp to reasonable bounds
  shoeWidthFrac = Math.min(Math.max(shoeWidthFrac, 0.12), 0.45);

  const shoeHeightFrac = (shoeWidthFrac * W) / (shoeAspectRatio * H);

  // Ankle sits near the collar (top ~30 %) of the shoe
  const centerXFrac = ankle.x / W;
  const centerYFrac = ankle.y / H + shoeHeightFrac * 0.32;

  return {
    x: centerXFrac * 100,
    y: centerYFrac * 100,
    w: shoeWidthFrac * 100,
    mirrored,
    confidence: Math.max(lScore, rScore),
  };
}

// ── Background Removal ────────────────────────────────────────────────────────
function removeBackground(img: HTMLImageElement, threshold = 235): string {
  const canvas = document.createElement('canvas');
  canvas.width  = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imgData.data;

  // Sample background colour from corners
  const corners = [0, (canvas.width - 1) * 4,
    (canvas.height - 1) * canvas.width * 4,
    ((canvas.height - 1) * canvas.width + canvas.width - 1) * 4];
  let bgR = 0, bgG = 0, bgB = 0;
  corners.forEach(i => { bgR += d[i]; bgG += d[i + 1]; bgB += d[i + 2]; });
  bgR = Math.round(bgR / 4); bgG = Math.round(bgG / 4); bgB = Math.round(bgB / 4);

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const nearWhite = r > threshold && g > threshold && b > threshold;
    const nearBg    = Math.abs(r - bgR) < 28 && Math.abs(g - bgG) < 28 && Math.abs(b - bgB) < 28;
    if (nearWhite || nearBg) d[i + 3] = 0;
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}

// ── Canvas Rendering ──────────────────────────────────────────────────────────
async function renderToCanvas(
  canvas: HTMLCanvasElement,
  userSrc: string,
  shoeSrc: string,
  shoeX: number,      // % of canvas width  (center)
  shoeY: number,      // % of canvas height (center)
  shoeW: number,      // % of canvas width  (shoe width)
  opacity: number,    // 0-100
  mirrored: boolean,
  addWatermark = false
) {
  const userImg = await loadImg(userSrc);
  const shoeImg = await loadImg(shoeSrc);

  canvas.width  = userImg.naturalWidth;
  canvas.height = userImg.naturalHeight;
  const ctx = canvas.getContext('2d')!;

  ctx.drawImage(userImg, 0, 0);

  const W = canvas.width;
  const H = canvas.height;
  const sw = (shoeW / 100) * W;
  const sh = sw * (shoeImg.naturalHeight / shoeImg.naturalWidth);
  const sx = (shoeX / 100) * W - sw / 2;
  const sy = (shoeY / 100) * H - sh / 2;

  ctx.save();
  ctx.globalAlpha = opacity / 100;
  ctx.filter = 'drop-shadow(0px 8px 20px rgba(0,0,0,0.55))';

  if (mirrored) {
    ctx.translate(sx + sw, sy);
    ctx.scale(-1, 1);
    ctx.drawImage(shoeImg, 0, 0, sw, sh);
  } else {
    ctx.drawImage(shoeImg, sx, sy, sw, sh);
  }

  ctx.restore();

  if (addWatermark) {
    const fontSize = Math.max(13, Math.round(W * 0.022));
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    const label = 'Stopy';
    const tw  = ctx.measureText(label).width;
    const pad = Math.round(fontSize * 0.55);
    const bx  = W - tw - pad * 2 - 14;
    const by  = H - fontSize - pad * 2 - 14;
    const bw  = tw + pad * 2;
    const bh  = fontSize + pad * 2;

    ctx.globalAlpha = 0.72;
    ctx.fillStyle   = 'rgba(20,20,20,0.55)';
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 6);
      ctx.fill();
    } else {
      ctx.fillRect(bx, by, bw, bh);
    }

    ctx.globalAlpha = 1;
    ctx.fillStyle   = '#ffffff';
    ctx.fillText(label, bx + pad, by + fontSize + pad * 0.45);
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function VirtualTryOn({ productImage, productName }: VirtualTryOnProps) {
  const [isOpen,        setIsOpen]        = useState(false);
  const [step,          setStep]          = useState<'upload' | 'detecting' | 'adjust' | 'result'>('upload');
  const [userPhoto,     setUserPhoto]     = useState<string | null>(null);
  const [processedShoe, setProcessedShoe] = useState<string | null>(null);
  const [processing,    setProcessing]    = useState(false);
  const [aiDetected,    setAiDetected]    = useState(false);
  const [aiLoading,     setAiLoading]     = useState(false);
  const [shoeX,         setShoeX]         = useState(50);
  const [shoeY,         setShoeY]         = useState(78);
  const [shoeW,         setShoeW]         = useState(30);
  const [opacity,       setOpacity]       = useState(92);
  const [mirrored,      setMirrored]      = useState(false);
  const [compositing,   setCompositing]   = useState(false);
  const [resultImage,   setResultImage]   = useState<string | null>(null);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Re-render preview canvas whenever sliders or images change
  useEffect(() => {
    if (step !== 'adjust' || !userPhoto || !processedShoe || !previewCanvasRef.current) return;
    const canvas = previewCanvasRef.current;
    renderToCanvas(canvas, userPhoto, processedShoe, shoeX, shoeY, shoeW, opacity, mirrored, true)
      .catch(console.warn);
  }, [step, userPhoto, processedShoe, shoeX, shoeY, shoeW, opacity, mirrored]);

  const resetState = useCallback(() => {
    setUserPhoto(null);
    setProcessedShoe(null);
    setResultImage(null);
    setStep('upload');
    setAiDetected(false);
    setShoeX(50); setShoeY(78); setShoeW(30); setOpacity(92); setMirrored(false);
  }, []);

  const handleOpen  = () => { setIsOpen(true);  resetState(); };
  const handleClose = () => { setIsOpen(false); resetState(); };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessing(true);
    toast({ title: '🔄 Processing…', description: 'Removing shoe background…' });

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const photoDataUrl = ev.target?.result as string;
      setUserPhoto(photoDataUrl);

      // Background removal for shoe
      let shoeSrc = productImage;
      try {
        const shoeEl = await loadImg(productImage);
        shoeSrc = removeBackground(shoeEl, 230);
      } catch { /* keep original */ }
      setProcessedShoe(shoeSrc);
      setProcessing(false);

      // AI foot detection
      setStep('detecting');
      setAiLoading(true);
      toast({ title: '🧠 AI detecting foot position…', description: 'This may take a moment on first load.' });
      try {
        const userImgEl  = await loadImg(photoDataUrl);
        const shoeImgEl  = await loadImg(shoeSrc);
        const aspect     = shoeImgEl.naturalWidth / shoeImgEl.naturalHeight || 2;
        const detection  = await detectFoot(userImgEl, aspect);

        if (detection) {
          setShoeX(Math.round(detection.x));
          setShoeY(Math.round(detection.y));
          setShoeW(Math.round(detection.w));
          setMirrored(detection.mirrored);
          setAiDetected(true);
          toast({ title: '✅ Foot detected!', description: 'Shoe positioned automatically. Fine-tune with sliders.' });
        } else {
          setAiDetected(false);
          toast({ title: '📐 Manual mode', description: 'AI couldn\'t detect feet — use sliders to position the shoe.' });
        }
      } catch (err) {
        console.warn('[VirtualTryOn] Detection failed:', err);
        setAiDetected(false);
      }

      setAiLoading(false);
      setStep('adjust');
    };
    reader.readAsDataURL(file);
  };

  const generateResult = async () => {
    if (!userPhoto || !processedShoe) return;
    setCompositing(true);
    try {
      const canvas = document.createElement('canvas');
      await renderToCanvas(canvas, userPhoto, processedShoe, shoeX, shoeY, shoeW, opacity, mirrored, true);
      setResultImage(canvas.toDataURL('image/jpeg', 0.93));
      setStep('result');
    } catch (err: any) {
      toast({ title: 'Generation failed', description: err?.message ?? 'Unknown error', variant: 'destructive' });
    }
    setCompositing(false);
  };

  const downloadResult = () => {
    if (!resultImage) return;
    const a = document.createElement('a');
    a.href     = resultImage;
    a.download = `stopy-tryon-${productName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.jpg`;
    a.click();
    toast({ title: '📸 Saved!', description: 'Your try-on photo has been downloaded.' });
  };

  const sliders = [
    { label: 'X Position', value: shoeX, min: 5,   max: 95,  set: setShoeX, icon: <Move className="h-3 w-3" /> },
    { label: 'Y Position', value: shoeY, min: 5,   max: 100, set: setShoeY, icon: <Move className="h-3 w-3 rotate-90" /> },
    { label: 'Size',       value: shoeW, min: 8,   max: 65,  set: setShoeW, icon: <ZoomIn className="h-3 w-3" /> },
    { label: 'Blend',      value: opacity, min: 40, max: 100, set: setOpacity, icon: <Sparkles className="h-3 w-3" /> },
  ];

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
            className="fixed inset-0 z-50 bg-black/96 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
              <div>
                <p className="text-white font-bold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  AI Virtual Try-On
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

              {/* ── UPLOAD STEP ── */}
              {step === 'upload' && (
                <div className="space-y-4">
                  <div className="bg-white/5 rounded-xl p-4 space-y-1.5 text-sm text-white/65">
                    <p className="text-white font-medium mb-2">How it works</p>
                    <p>① Upload a full-body or foot-focused photo</p>
                    <p>② AI detects your foot and auto-positions the shoe</p>
                    <p>③ Fine-tune with sliders if needed</p>
                    <p>④ Download your realistic try-on photo</p>
                  </div>

                  <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-white/10 border border-white/15 flex-shrink-0">
                      <img src={productImage} alt={productName} className="w-full h-full object-contain" />
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{productName}</p>
                      <p className="text-white/45 text-xs mt-1">Background removed automatically</p>
                      <div className="flex items-center gap-1 mt-2">
                        <Brain className="h-3 w-3 text-primary" />
                        <span className="text-primary text-xs font-medium">AI Foot Detection</span>
                      </div>
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
                    className="w-full border-2 border-dashed border-white/25 rounded-xl p-8 flex flex-col items-center gap-3 text-white/65 hover:border-primary/55 hover:text-white/85 transition-all disabled:opacity-50"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm">Processing image…</p>
                      </>
                    ) : (
                      <>
                        <Upload className="h-8 w-8" />
                        <p className="text-sm font-medium">Upload Your Photo</p>
                        <p className="text-xs opacity-55">Full body or foot-focused works best</p>
                        <p className="text-xs opacity-35">JPG · PNG supported</p>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* ── DETECTING STEP ── */}
              {step === 'detecting' && (
                <div className="flex flex-col items-center justify-center gap-5 py-16">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center">
                      <Brain className="h-8 w-8 text-primary" />
                    </div>
                    <Loader2 className="h-16 w-16 animate-spin text-primary/40 absolute inset-0" />
                  </div>
                  <div className="text-center">
                    <p className="text-white font-medium">AI Detecting Foot Position</p>
                    <p className="text-white/45 text-sm mt-1">Analysing pose & foot landmarks…</p>
                  </div>
                </div>
              )}

              {/* ── ADJUST STEP ── */}
              {step === 'adjust' && userPhoto && processedShoe && (
                <div className="space-y-4">
                  {/* AI badge */}
                  <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                    aiDetected
                      ? 'bg-green-500/15 border border-green-500/25 text-green-300'
                      : 'bg-amber-500/15 border border-amber-500/25 text-amber-300'
                  }`}>
                    {aiDetected
                      ? <><CheckCircle className="h-4 w-4 flex-shrink-0" /><span>AI auto-positioned the shoe — fine-tune with sliders below</span></>
                      : <><AlertTriangle className="h-4 w-4 flex-shrink-0" /><span>Manual mode — AI couldn't detect feet, use sliders to position</span></>
                    }
                  </div>

                  {/* Canvas preview */}
                  <div className="relative rounded-xl overflow-hidden bg-black">
                    <canvas
                      ref={previewCanvasRef}
                      className="w-full object-contain max-h-[52vh] rounded-xl"
                      style={{ display: 'block' }}
                    />
                    {aiLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    )}
                    {/* Subtle Stopy watermark overlay on the live preview */}
                    <div className="absolute bottom-2.5 right-2.5 bg-black/40 rounded-md px-2 py-0.5 pointer-events-none">
                      <span className="text-white/75 text-xs font-bold tracking-wide">Stopy</span>
                    </div>
                  </div>

                  {/* Mirror toggle */}
                  <div className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-2.5">
                    <span className="text-white/70 text-xs">Mirror shoe (right foot)</span>
                    <button
                      onClick={() => setMirrored(m => !m)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${mirrored ? 'bg-primary' : 'bg-white/20'}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${mirrored ? 'left-5.5 left-[22px]' : 'left-0.5'}`} />
                    </button>
                  </div>

                  {/* Sliders */}
                  <div className="space-y-3 bg-white/5 rounded-xl p-4">
                    <p className="text-white/65 text-xs font-semibold uppercase tracking-widest">Adjust Shoe</p>
                    {sliders.map(ctrl => (
                      <div key={ctrl.label} className="flex items-center gap-3">
                        <div className="text-white/40">{ctrl.icon}</div>
                        <span className="text-white/65 text-xs w-20">{ctrl.label}</span>
                        <input
                          type="range"
                          min={ctrl.min} max={ctrl.max} value={ctrl.value}
                          onChange={e => ctrl.set(Number(e.target.value))}
                          className="flex-1 accent-primary"
                        />
                        <span className="text-white/40 text-xs w-7 text-right">{ctrl.value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="ghost"
                      onClick={() => { setStep('upload'); setUserPhoto(null); }}
                      className="text-white/55 hover:text-white gap-2"
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
                        : <><Sparkles className="h-4 w-4" />Generate Try-On Photo</>
                      }
                    </Button>
                  </div>
                </div>
              )}

              {/* ── RESULT STEP ── */}
              {step === 'result' && resultImage && (
                <div className="space-y-4">
                  <div className="bg-green-500/15 border border-green-500/25 rounded-xl p-3 text-green-300 text-sm text-center font-medium">
                    ✅ Your try-on photo is ready!
                  </div>

                  <div className="relative rounded-xl overflow-hidden">
                    <img
                      src={resultImage}
                      alt="Try-on result"
                      className="w-full object-contain rounded-xl"
                    />
                    {/* Watermark is already burned into resultImage */}
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="ghost"
                      onClick={() => setStep('adjust')}
                      className="text-white/55 hover:text-white gap-2"
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
                    className="w-full text-white/35 hover:text-white/65 text-xs py-2 transition-colors"
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
