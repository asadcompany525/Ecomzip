import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload, X, Download, Sparkles, Camera, Loader2,
  RotateCcw, ZoomIn, Move, Brain, CheckCircle, AlertTriangle,
  Video, VideoOff, SwitchCamera, Maximize2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import { useStoreSettings } from '@/hooks/useStoreSettings';

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

// ── Global detector singleton ─────────────────────────────────────────────────
let _detectorPromise: Promise<any | null> | null = null;

async function getDetector(): Promise<any | null> {
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
      return detector;
    } catch (err) {
      console.warn('[VirtualTryOn] Model load error:', err);
      _detectorPromise = null;
      return null;
    }
  })();
  return _detectorPromise;
}

// ── Utility ───────────────────────────────────────────────────────────────────
function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
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

// Draw clothing item overlay at torso (shoulders to hips)
function drawClothingAtTorso(
  ctx: CanvasRenderingContext2D,
  kps: any[],
  canvasW: number, canvasH: number,
  cameraIsMirrored: boolean,
  clothingImg: HTMLImageElement,
  scaleMult: number,
  opacity = 0.88
) {
  const CONF = 0.25;
  const lShoulder = kps[5], rShoulder = kps[6];
  const lHip = kps[11], rHip = kps[12];
  if (!lShoulder || !rShoulder || (lShoulder.score ?? 0) < CONF || (rShoulder.score ?? 0) < CONF) return;
  const toX = (x: number) => cameraIsMirrored ? canvasW - x : x;
  const lsx = toX(lShoulder.x), rsx = toX(rShoulder.x);
  const lsy = lShoulder.y, rsy = rShoulder.y;
  const hasHips = lHip && rHip && (lHip.score ?? 0) > CONF && (rHip.score ?? 0) > CONF;
  const lhx = hasHips ? toX(lHip.x) : lsx;
  const lhy = hasHips ? lHip.y : lsy + canvasH * 0.35;
  const rhx = hasHips ? toX(rHip.x) : rsx;
  const rhy = hasHips ? rHip.y : rsy + canvasH * 0.35;

  const shoulderW = Math.abs(rsx - lsx);
  const torsoH = Math.abs(((lhy + rhy) / 2) - ((lsy + rsy) / 2));
  if (shoulderW < 10 || torsoH < 10) return;

  const clothingW = shoulderW * 1.3 * scaleMult;
  const clothingH = clothingW * (clothingImg.naturalHeight / clothingImg.naturalWidth);
  const centerX = (lsx + rsx) / 2;
  const topY = Math.min(lsy, rsy) - clothingH * 0.05;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 14;
  ctx.drawImage(clothingImg, centerX - clothingW / 2, topY, clothingW, clothingH);
  ctx.restore();
}

// Draw bag item overlay at wrist/shoulder
function drawBagAtShoulder(
  ctx: CanvasRenderingContext2D,
  kps: any[],
  canvasW: number, canvasH: number,
  cameraIsMirrored: boolean,
  bagImg: HTMLImageElement,
  scaleMult: number,
  opacity = 0.9
) {
  const CONF = 0.25;
  const toX = (x: number) => cameraIsMirrored ? canvasW - x : x;
  const lWrist = kps[9], rWrist = kps[10];
  const lElbow = kps[7], rElbow = kps[8];
  const lShoulder = kps[5];

  const anchor = (lWrist && (lWrist.score ?? 0) > CONF)
    ? lWrist
    : (rWrist && (rWrist.score ?? 0) > CONF)
    ? rWrist
    : (lShoulder && (lShoulder.score ?? 0) > CONF)
    ? lShoulder
    : null;
  if (!anchor) return;

  const refLen = (() => {
    if (lShoulder && lElbow && (lShoulder.score ?? 0) > CONF && (lElbow.score ?? 0) > CONF) {
      return Math.sqrt((toX(lShoulder.x) - toX(lElbow.x)) ** 2 + (lShoulder.y - lElbow.y) ** 2) * 1.5;
    }
    return canvasW * 0.18;
  })();

  const bagW = refLen * scaleMult;
  const bagH = bagW * (bagImg.naturalHeight / bagImg.naturalWidth);
  const ax = toX(anchor.x);
  const ay = anchor.y;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 16;
  ctx.drawImage(bagImg, ax - bagW * 0.5, ay - bagH * 0.1, bagW, bagH);
  ctx.restore();
}

// Draw a single shoe at an ankle keypoint with dynamic rotation & scale
function drawShoeAtAnkle(
  ctx: CanvasRenderingContext2D,
  ankleKp: any, kneeKp: any,
  canvasW: number, canvasH: number,
  cameraIsMirrored: boolean,
  mirrorShoe: boolean,
  shoeImg: HTMLImageElement,
  scaleMult: number,
  opacity = 0.93
) {
  if (!ankleKp || (ankleKp.score ?? 0) < 0.22) return;

  // Translate keypoints to display coordinates
  const ax = cameraIsMirrored ? canvasW - ankleKp.x : ankleKp.x;
  const ay = ankleKp.y;
  const hasKnee = kneeKp && (kneeKp.score ?? 0) > 0.22;
  const kx = hasKnee ? (cameraIsMirrored ? canvasW - kneeKp.x : kneeKp.x) : ax;
  const ky = hasKnee ? kneeKp.y : ay - canvasH * 0.18;

  const legDist = Math.sqrt((ax - kx) ** 2 + (ay - ky) ** 2);
  if (legDist < 8) return;

  const shoeW = legDist * 0.95 * scaleMult;
  const shoeH = shoeW * (shoeImg.naturalHeight / shoeImg.naturalWidth);

  // Shoe rotation: perpendicular to the leg direction
  const legAngle = Math.atan2(ay - ky, ax - kx);
  const shoeRotation = legAngle - Math.PI / 2;

  ctx.save();
  ctx.translate(ax, ay);
  ctx.rotate(shoeRotation);
  ctx.globalAlpha = opacity;
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;

  if (mirrorShoe) ctx.scale(-1, 1);
  // Ankle sits at the collar (~10% below top) of the shoe image
  ctx.drawImage(shoeImg, -shoeW * 0.5, -shoeH * 0.1, shoeW, shoeH);
  ctx.restore();
}

// ── Static photo mode ─────────────────────────────────────────────────────────
interface FootDetection { x: number; y: number; w: number; mirrored: boolean; confidence: number; }

async function detectFoot(userImgEl: HTMLImageElement, shoeAspectRatio: number): Promise<FootDetection | null> {
  const detector = await getDetector();
  if (!detector) return null;
  const W = userImgEl.naturalWidth, H = userImgEl.naturalHeight;
  let poses: any[];
  try { poses = await detector.estimatePoses(userImgEl); } catch { return null; }
  if (!poses.length) return null;
  const kps = poses[0].keypoints;
  const CONF = 0.25;
  const lScore = kps[15]?.score ?? 0, rScore = kps[16]?.score ?? 0;
  if (lScore < CONF && rScore < CONF) return null;
  const useLeft = lScore >= rScore;
  const ankle = useLeft ? kps[15] : kps[16];
  const knee  = useLeft ? kps[13] : kps[14];
  let shoeWidthFrac = 0.22;
  if (knee && (knee.score ?? 0) > CONF) {
    const dist = Math.sqrt((ankle.x - knee.x) ** 2 + (ankle.y - knee.y) ** 2);
    shoeWidthFrac = Math.min(Math.max((dist * 0.95) / W, 0.12), 0.45);
  }
  const shoeHeightFrac = (shoeWidthFrac * W) / (shoeAspectRatio * H);
  return {
    x: (ankle.x / W) * 100,
    y: ((ankle.y / H) + shoeHeightFrac * 0.32) * 100,
    w: shoeWidthFrac * 100,
    mirrored: !useLeft,
    confidence: Math.max(lScore, rScore),
  };
}

async function renderPhotoCanvas(
  canvas: HTMLCanvasElement, userSrc: string, shoeSrc: string,
  shoeX: number, shoeY: number, shoeW: number, opacity: number, mirrored: boolean,
  brandLabel = 'Try-On'
) {
  const userImg = await loadImg(userSrc);
  const shoeImg = await loadImg(shoeSrc);
  canvas.width = userImg.naturalWidth; canvas.height = userImg.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(userImg, 0, 0);
  const W = canvas.width, H = canvas.height;
  const sw = (shoeW / 100) * W, sh = sw * (shoeImg.naturalHeight / shoeImg.naturalWidth);
  const sx = (shoeX / 100) * W - sw / 2, sy = (shoeY / 100) * H - sh / 2;
  ctx.save();
  ctx.globalAlpha = opacity / 100;
  ctx.filter = 'drop-shadow(0px 8px 20px rgba(0,0,0,0.55))';
  if (mirrored) { ctx.translate(sx + sw, sy); ctx.scale(-1, 1); ctx.drawImage(shoeImg, 0, 0, sw, sh); }
  else { ctx.drawImage(shoeImg, sx, sy, sw, sh); }
  ctx.restore();
  drawWatermark(ctx, W, H, brandLabel);
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function VirtualTryOn({ productImage, productName, productCategory }: VirtualTryOnProps) {
  const { brandName } = useStoreSettings();
  const categoryType = detectCategoryType(productName, productCategory);
  const [isOpen,        setIsOpen]        = useState(false);
  const [activeTab,     setActiveTab]     = useState<'camera' | 'photo'>('camera');

  // ── Camera AR state ──
  const [cameraActive,  setCameraActive]  = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError,   setCameraError]   = useState<string | null>(null);
  const [modelLoading,  setModelLoading]  = useState(false);
  const [scaleAdj,      setScaleAdj]      = useState(100);
  const [useFront,      setUseFront]      = useState(false);
  const [feetCount,     setFeetCount]     = useState(0);

  // ── Photo mode state ──
  const [step,          setStep]          = useState<'upload' | 'detecting' | 'adjust' | 'result'>('upload');
  const [userPhoto,     setUserPhoto]     = useState<string | null>(null);
  const [processedShoe, setProcessedShoe] = useState<string | null>(null);
  const [aiDetected,    setAiDetected]    = useState(false);
  const [shoeX,         setShoeX]         = useState(50);
  const [shoeY,         setShoeY]         = useState(78);
  const [shoeW,         setShoeW]         = useState(30);
  const [opacity,       setOpacity]       = useState(92);
  const [mirrored,      setMirrored]      = useState(false);
  const [compositing,   setCompositing]   = useState(false);
  const [resultImage,   setResultImage]   = useState<string | null>(null);
  const [processing,    setProcessing]    = useState(false);

  // ── Refs ──
  const videoRef         = useRef<HTMLVideoElement>(null);
  const arCanvasRef      = useRef<HTMLCanvasElement>(null);
  const photoCanvasRef   = useRef<HTMLCanvasElement>(null);
  const photoInputRef    = useRef<HTMLInputElement>(null);
  const rafRef           = useRef<number | null>(null);
  const arActiveRef      = useRef(false);
  const poseRef          = useRef<any>(null);
  const shoeImgRef       = useRef<HTMLImageElement | null>(null);
  const frameCountRef    = useRef(0);
  const detectingRef     = useRef(false);
  const streamRef        = useRef<MediaStream | null>(null);
  const dragRef          = useRef<{ active: boolean; lastX: number; lastY: number }>({ active: false, lastX: 0, lastY: 0 });

  // Pre-load shoe image (background removed)
  useEffect(() => {
    if (!isOpen) return;
    loadImg(productImage).then(img => {
      const bgRemoved = removeBackground(img, 230);
      loadImg(bgRemoved).then(processed => { shoeImgRef.current = processed; });
    }).catch(() => {
      loadImg(productImage).then(img => { shoeImgRef.current = img; });
    });
  }, [isOpen, productImage]);

  // Re-render photo preview canvas on slider change
  useEffect(() => {
    if (step !== 'adjust' || !userPhoto || !processedShoe || !photoCanvasRef.current) return;
    renderPhotoCanvas(photoCanvasRef.current, userPhoto, processedShoe, shoeX, shoeY, shoeW, opacity, mirrored, brandName || 'Try-On')
      .catch(console.warn);
  }, [step, userPhoto, processedShoe, shoeX, shoeY, shoeW, opacity, mirrored]);

  // ── AR Camera Loop ────────────────────────────────────────────────────────
  const runDetection = useCallback(async (video: HTMLVideoElement) => {
    if (detectingRef.current) return;
    const detector = await getDetector();
    if (!detector) return;
    detectingRef.current = true;
    try {
      const poses = await detector.estimatePoses(video);
      if (poses.length > 0) {
        poseRef.current = poses[0];
        const kps = poses[0].keypoints;
        const feet = [kps[15], kps[16]].filter(k => k && (k.score ?? 0) > 0.22).length;
        setFeetCount(feet);
      } else {
        setFeetCount(0);
      }
    } catch { /* silent */ }
    detectingRef.current = false;
  }, []);

  const arLoop = useCallback(() => {
    if (!arActiveRef.current) return;
    const video = arCanvasRef.current && videoRef.current ? videoRef.current : null;
    const canvas = arCanvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(arLoop);
      return;
    }
    const ctx = canvas.getContext('2d')!;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const W = canvas.width, H = canvas.height;

    // Draw video (mirror if front camera)
    ctx.save();
    if (useFront) { ctx.translate(W, 0); ctx.scale(-1, 1); }
    ctx.drawImage(video, 0, 0, W, H);
    ctx.restore();

    // Throttle detection: every 4th frame ≈ 15fps on 60hz devices
    frameCountRef.current++;
    if (frameCountRef.current % 4 === 0) { runDetection(video); }

    // Draw product overlays from latest pose based on category
    if (poseRef.current && shoeImgRef.current) {
      const kps = poseRef.current.keypoints;
      const mult = scaleAdj / 100;
      if (categoryType === 'clothing') {
        drawClothingAtTorso(ctx, kps, W, H, useFront, shoeImgRef.current, mult);
      } else if (categoryType === 'bags') {
        drawBagAtShoulder(ctx, kps, W, H, useFront, shoeImgRef.current, mult);
      } else {
        // shoes and generic — use ankle-based placement
        drawShoeAtAnkle(ctx, kps[15], kps[13], W, H, useFront, false, shoeImgRef.current, mult);
        drawShoeAtAnkle(ctx, kps[16], kps[14], W, H, useFront, true,  shoeImgRef.current, mult);
      }
    }

    drawWatermark(ctx, W, H, brandName || 'Try-On');
    rafRef.current = requestAnimationFrame(arLoop);
  }, [useFront, scaleAdj, runDetection, categoryType, brandName]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    setCameraLoading(true);

    // Pre-load model while acquiring camera
    setModelLoading(true);
    getDetector().then(() => setModelLoading(false));

    try {
      const constraints: MediaStreamConstraints = {
        video: { facingMode: useFront ? 'user' : 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      arActiveRef.current = true;
      poseRef.current = null;
      frameCountRef.current = 0;
      setCameraActive(true);
      setCameraLoading(false);
      rafRef.current = requestAnimationFrame(arLoop);
      toast({ title: '📷 Camera started', description: 'Point camera at your feet for AR try-on.' });
    } catch (err: any) {
      setCameraLoading(false);
      setCameraError(err.name === 'NotAllowedError'
        ? 'Camera permission denied. Please allow camera access.'
        : `Camera error: ${err.message}`);
    }
  }, [useFront, arLoop]);

  const stopCamera = useCallback(() => {
    arActiveRef.current = false;
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
    poseRef.current = null;
  }, []);

  const takeARSnapshot = useCallback(() => {
    if (!arCanvasRef.current) return;
    const dataUrl = arCanvasRef.current.toDataURL('image/jpeg', 0.93);
    const a = document.createElement('a');
    a.href = dataUrl;
    const brand = (brandName || 'tryon').replace(/\s+/g, '-').toLowerCase();
    a.download = `${brand}-ar-${productName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.jpg`;
    a.click();
    toast({ title: '📸 AR snapshot saved!' });
  }, [productName, brandName]);

  // Toggle front/back camera
  const switchCamera = useCallback(() => {
    stopCamera();
    setUseFront(f => !f);
    setTimeout(() => setUseFront(f => { startCamera(); return f; }), 200);
  }, [stopCamera, startCamera]);

  // ── Photo Mode ────────────────────────────────────────────────────────────
  const resetPhotoState = useCallback(() => {
    setUserPhoto(null); setProcessedShoe(null); setResultImage(null);
    setStep('upload'); setAiDetected(false);
    setShoeX(50); setShoeY(78); setShoeW(30); setOpacity(92); setMirrored(false);
  }, []);

  const handleOpen  = () => { setIsOpen(true);  resetPhotoState(); };
  const handleClose = () => {
    stopCamera();
    setIsOpen(false);
    resetPhotoState();
  };

  // Restart camera when switching to camera tab
  useEffect(() => {
    if (!isOpen) return;
    if (activeTab !== 'camera' && cameraActive) stopCamera();
  }, [activeTab, isOpen, cameraActive, stopCamera]);

  // Stop camera when modal closes
  useEffect(() => { if (!isOpen) stopCamera(); }, [isOpen, stopCamera]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessing(true);
    toast({ title: '🔄 Processing…', description: 'Removing shoe background…' });
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const photoDataUrl = ev.target?.result as string;
      setUserPhoto(photoDataUrl);
      let shoeSrc = productImage;
      try { const shoeEl = await loadImg(productImage); shoeSrc = removeBackground(shoeEl, 230); } catch { }
      setProcessedShoe(shoeSrc);
      setProcessing(false);
      setStep('detecting');
      toast({ title: '🧠 AI detecting feet…', description: 'Analysing pose landmarks.' });
      try {
        const [userEl, shoeEl] = await Promise.all([loadImg(photoDataUrl), loadImg(shoeSrc)]);
        const aspect = shoeEl.naturalWidth / shoeEl.naturalHeight || 2;
        const det = await detectFoot(userEl, aspect);
        if (det) {
          setShoeX(Math.round(det.x)); setShoeY(Math.round(det.y));
          setShoeW(Math.round(det.w)); setMirrored(det.mirrored);
          setAiDetected(true);
          toast({ title: '✅ Foot detected!', description: 'Shoe auto-aligned. Fine-tune with sliders.' });
        } else {
          toast({ title: '📐 Manual mode', description: 'AI couldn\'t detect feet — use sliders.' });
        }
      } catch { setAiDetected(false); }
      setStep('adjust');
    };
    reader.readAsDataURL(file);
  };

  // ── Canvas Drag Handlers for Photo Mode ──────────────────────────────────
  const getCanvasPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0]?.clientX ?? 0 : e.clientX;
    const clientY = 'touches' in e ? e.touches[0]?.clientY ?? 0 : e.clientY;
    const pctX = ((clientX - rect.left) / rect.width) * 100;
    const pctY = ((clientY - rect.top)  / rect.height) * 100;
    return { pctX, pctY };
  };

  const handleCanvasDragStart = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (step !== 'adjust') return;
    e.preventDefault();
    const canvas = photoCanvasRef.current;
    if (!canvas) return;
    const { pctX, pctY } = getCanvasPos(e, canvas);
    dragRef.current = { active: true, lastX: pctX, lastY: pctY };
  };

  const handleCanvasDragMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!dragRef.current.active || step !== 'adjust') return;
    e.preventDefault();
    const canvas = photoCanvasRef.current;
    if (!canvas) return;
    const { pctX, pctY } = getCanvasPos(e, canvas);
    const dx = pctX - dragRef.current.lastX;
    const dy = pctY - dragRef.current.lastY;
    dragRef.current.lastX = pctX;
    dragRef.current.lastY = pctY;
    setShoeX(x => Math.min(95, Math.max(5, x + dx)));
    setShoeY(y => Math.min(100, Math.max(5, y + dy)));
  };

  const handleCanvasDragEnd = () => {
    dragRef.current.active = false;
  };

  const generateResult = async () => {
    if (!userPhoto || !processedShoe) return;
    setCompositing(true);
    try {
      const canvas = document.createElement('canvas');
      await renderPhotoCanvas(canvas, userPhoto, processedShoe, shoeX, shoeY, shoeW, opacity, mirrored, brandName || 'Try-On');
      setResultImage(canvas.toDataURL('image/jpeg', 0.93));
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

  const photoSliders = [
    { label: 'X Position', value: shoeX,   min: 5,  max: 95,  set: setShoeX,   icon: <Move className="h-3 w-3" /> },
    { label: 'Y Position', value: shoeY,   min: 5,  max: 100, set: setShoeY,   icon: <Move className="h-3 w-3 rotate-90" /> },
    { label: 'Size',       value: shoeW,   min: 8,  max: 65,  set: setShoeW,   icon: <ZoomIn className="h-3 w-3" /> },
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col"
            style={{ background: 'rgba(0,0,0,0.8)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0" style={{ background: 'rgba(0,0,0,0.6)' }}>
              <div>
                <p className="text-white font-bold flex items-center gap-2 text-sm">
                  <Sparkles className="h-4 w-4 text-primary" /> AI Virtual Try-On
                  {modelLoading && <span className="text-white/40 text-xs font-normal">(loading AI…)</span>}
                </p>
                <p className="text-white/50 text-xs mt-0.5">{productName}</p>
              </div>
              <button onClick={handleClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/10 flex-shrink-0" style={{ background: 'rgba(0,0,0,0.4)' }}>
              {(['camera', 'photo'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2.5 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                    activeTab === tab ? 'text-primary border-b-2 border-primary' : 'text-white/50 hover:text-white/80'
                  }`}
                >
                  {tab === 'camera' ? <><Video className="h-3.5 w-3.5" /> Live AR Camera</> : <><Upload className="h-3.5 w-3.5" /> Photo Try-On</>}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">

              {/* ══ CAMERA AR TAB ══ */}
              {activeTab === 'camera' && (
                <div className="space-y-3">
                  {/* Hidden video element */}
                  <video ref={videoRef} className="hidden" autoPlay playsInline muted />

                  {/* Camera canvas */}
                  <div className="relative rounded-xl overflow-hidden bg-black/40 border border-white/10">
                    <canvas
                      ref={arCanvasRef}
                      className="w-full rounded-xl"
                      style={{ display: 'block', maxHeight: '55vh', objectFit: 'contain' }}
                    />

                    {/* Placeholder when not active */}
                    {!cameraActive && !cameraLoading && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/50 rounded-xl" style={{ background: 'rgba(0,0,0,0.6)' }}>
                        <Camera className="h-16 w-16 opacity-20" />
                        <p className="text-sm font-medium">Camera not started</p>
                        <p className="text-xs opacity-60">Tap "Start AR Camera" to begin</p>
                      </div>
                    )}

                    {/* Loading overlay */}
                    {cameraLoading && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl" style={{ background: 'rgba(0,0,0,0.7)' }}>
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        <p className="text-white/70 text-sm">Starting camera…</p>
                      </div>
                    )}

                    {/* Active overlays */}
                    {cameraActive && (
                      <>
                        {/* Body-part status badge */}
                        <div className={`absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold ${
                          feetCount > 0 ? 'bg-green-500/80 text-white' : 'bg-black/60 text-white/60'
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${feetCount > 0 ? 'bg-white animate-pulse' : 'bg-white/30'}`} />
                          {feetCount > 0
                            ? categoryType === 'clothing' ? 'Torso detected'
                              : categoryType === 'bags' ? 'Hand/shoulder detected'
                              : `${feetCount} foot detected`
                            : categoryType === 'clothing' ? 'No torso detected'
                              : categoryType === 'bags' ? 'No hand detected'
                              : 'No feet detected'
                          }
                        </div>
                        {/* Controls overlay */}
                        <div className="absolute top-2 right-2 flex gap-1.5">
                          <button onClick={switchCamera} className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70" title="Switch camera">
                            <SwitchCamera className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={takeARSnapshot} className="w-8 h-8 rounded-full bg-primary/80 flex items-center justify-center text-white hover:bg-primary" title="Take snapshot">
                            <Maximize2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Error */}
                  {cameraError && (
                    <div className="flex items-center gap-2 bg-red-500/15 border border-red-500/30 rounded-lg px-3 py-2.5 text-red-300 text-sm">
                      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                      <span>{cameraError}</span>
                    </div>
                  )}

                  {/* Tips */}
                  {!cameraActive && !cameraLoading && (
                    <div className="bg-white/5 rounded-xl p-3 space-y-1.5 text-xs text-white/55">
                      <p className="text-white/80 font-medium text-sm">AR Try-On Tips</p>
                      {categoryType === 'clothing' && <>
                        <p>• Point camera at your torso / chest area</p>
                        <p>• Stand in good lighting, face the camera</p>
                        <p>• Clothing auto-aligns to your shoulders</p>
                      </>}
                      {categoryType === 'bags' && <>
                        <p>• Point camera at your arm or shoulder</p>
                        <p>• Keep your hand/wrist visible in frame</p>
                        <p>• Bag auto-attaches to wrist or shoulder</p>
                      </>}
                      {(categoryType === 'shoes' || categoryType === 'generic') && <>
                        <p>• Use back camera and point at your feet</p>
                        <p>• Stand in good lighting for best detection</p>
                        <p>• Shoes auto-attach and follow foot movement</p>
                      </>}
                      <p>• Tap <span className="text-white/80">📸</span> button to save your AR photo</p>
                    </div>
                  )}

                  {/* Scale slider */}
                  {cameraActive && (
                    <div className="bg-white/5 rounded-xl p-3 space-y-2">
                      <p className="text-white/60 text-xs font-semibold uppercase tracking-widest">
                        {categoryType === 'clothing' ? 'Clothing Size' : categoryType === 'bags' ? 'Bag Size' : 'Item Size'}
                      </p>
                      <div className="flex items-center gap-3">
                        <ZoomIn className="h-3.5 w-3.5 text-white/40" />
                        <input
                          type="range" min={40} max={200} value={scaleAdj}
                          onChange={e => setScaleAdj(Number(e.target.value))}
                          className="flex-1 accent-primary"
                        />
                        <span className="text-white/40 text-xs w-10 text-right">{scaleAdj}%</span>
                      </div>
                    </div>
                  )}

                  {/* Camera start/stop */}
                  <Button
                    onClick={cameraActive ? stopCamera : startCamera}
                    disabled={cameraLoading}
                    className={`w-full gap-2 h-11 ${cameraActive ? 'bg-red-500/80 hover:bg-red-600 text-white' : 'bg-primary hover:bg-primary/90 text-white'}`}
                  >
                    {cameraLoading ? (
                      <><Loader2 className="h-4 w-4 animate-spin" />Starting…</>
                    ) : cameraActive ? (
                      <><VideoOff className="h-4 w-4" />Stop AR Camera</>
                    ) : (
                      <><Video className="h-4 w-4" />Start AR Camera</>
                    )}
                  </Button>
                </div>
              )}

              {/* ══ PHOTO TRY-ON TAB ══ */}
              {activeTab === 'photo' && (
                <div className="space-y-4">

                  {/* Upload */}
                  {step === 'upload' && (
                    <div className="space-y-4">
                      <div className="bg-white/5 rounded-xl p-3.5 space-y-1.5 text-xs text-white/55">
                        <p className="text-white/80 font-medium text-sm">How it works</p>
                        {categoryType === 'clothing' && <>
                          <p>① Upload a full-body or torso photo</p>
                          <p>② AI detects shoulders and aligns clothing</p>
                          <p>③ Fine-tune with sliders, then download</p>
                        </>}
                        {categoryType === 'bags' && <>
                          <p>① Upload a photo showing your shoulder/arm</p>
                          <p>② AI detects hand/shoulder and places bag</p>
                          <p>③ Fine-tune with sliders, then download</p>
                        </>}
                        {(categoryType === 'shoes' || categoryType === 'generic') && <>
                          <p>① Upload a full-body or foot photo</p>
                          <p>② AI auto-detects foot position and aligns shoe</p>
                          <p>③ Fine-tune with sliders, then download</p>
                        </>}
                      </div>
                      <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-white/10 border border-white/15 flex-shrink-0">
                          <img src={productImage} alt={productName} className="w-full h-full object-contain" />
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">{productName}</p>
                          <div className="flex items-center gap-1 mt-1.5">
                            <Brain className="h-3 w-3 text-primary" />
                            <span className="text-primary text-xs">AI Foot Detection</span>
                          </div>
                        </div>
                      </div>
                      <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                      <button
                        onClick={() => photoInputRef.current?.click()}
                        disabled={processing}
                        className="w-full border-2 border-dashed border-white/20 rounded-xl p-8 flex flex-col items-center gap-3 text-white/60 hover:border-primary/55 hover:text-white/80 transition-all disabled:opacity-50"
                      >
                        {processing
                          ? <><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="text-sm">Processing…</p></>
                          : <><Upload className="h-8 w-8" /><p className="text-sm font-medium">Upload Your Photo</p><p className="text-xs opacity-50">Full body or foot-focused works best</p></>
                        }
                      </button>
                    </div>
                  )}

                  {/* Detecting */}
                  {step === 'detecting' && (
                    <div className="flex flex-col items-center justify-center gap-4 py-14">
                      <div className="relative">
                        <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center">
                          <Brain className="h-8 w-8 text-primary" />
                        </div>
                        <Loader2 className="h-16 w-16 animate-spin text-primary/40 absolute inset-0" />
                      </div>
                      <p className="text-white/70 text-sm">
                        {categoryType === 'clothing' ? 'Analysing torso landmarks…'
                          : categoryType === 'bags' ? 'Analysing hand/shoulder landmarks…'
                          : 'Analysing foot landmarks…'}
                      </p>
                    </div>
                  )}

                  {/* Adjust */}
                  {step === 'adjust' && userPhoto && processedShoe && (
                    <div className="space-y-4">
                      <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                        aiDetected
                          ? 'bg-green-500/15 border border-green-500/25 text-green-300'
                          : 'bg-amber-500/15 border border-amber-500/25 text-amber-300'
                      }`}>
                        {aiDetected
                          ? <><CheckCircle className="h-4 w-4 flex-shrink-0" /><span>AI auto-aligned — fine-tune with sliders</span></>
                          : <><AlertTriangle className="h-4 w-4 flex-shrink-0" /><span>Manual mode — position shoe with sliders</span></>
                        }
                      </div>
                      <div className="relative rounded-xl overflow-hidden bg-black">
                        <canvas
                          ref={photoCanvasRef}
                          className="w-full rounded-xl block touch-none select-none"
                          style={{ maxHeight: '52vh', objectFit: 'contain', cursor: 'grab' }}
                          onMouseDown={handleCanvasDragStart}
                          onMouseMove={handleCanvasDragMove}
                          onMouseUp={handleCanvasDragEnd}
                          onMouseLeave={handleCanvasDragEnd}
                          onTouchStart={handleCanvasDragStart}
                          onTouchMove={handleCanvasDragMove}
                          onTouchEnd={handleCanvasDragEnd}
                        />
                        <div className="absolute top-2 left-2 bg-black/50 rounded-md px-2 py-1 pointer-events-none flex items-center gap-1">
                          <Move className="h-3 w-3 text-white/60" />
                          <span className="text-white/60 text-[10px]">Drag to move shoe</span>
                        </div>
                        <div className="absolute bottom-2.5 right-2.5 bg-black/40 rounded-md px-2 py-0.5 pointer-events-none">
                          <span className="text-white/75 text-xs font-bold">Stopy</span>
                        </div>
                      </div>
                      {/* Mirror toggle */}
                      <div className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-2.5">
                        <span className="text-white/65 text-xs">Mirror shoe (right foot)</span>
                        <button onClick={() => setMirrored(m => !m)} className={`relative w-10 h-5 rounded-full transition-colors ${mirrored ? 'bg-primary' : 'bg-white/20'}`}>
                          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${mirrored ? 'left-[22px]' : 'left-0.5'}`} />
                        </button>
                      </div>
                      <div className="space-y-3 bg-white/5 rounded-xl p-4">
                        <p className="text-white/55 text-xs font-semibold uppercase tracking-widest">Adjust Shoe</p>
                        {photoSliders.map(ctrl => (
                          <div key={ctrl.label} className="flex items-center gap-3">
                            <div className="text-white/35">{ctrl.icon}</div>
                            <span className="text-white/60 text-xs w-20">{ctrl.label}</span>
                            <input type="range" min={ctrl.min} max={ctrl.max} value={ctrl.value}
                              onChange={e => ctrl.set(Number(e.target.value))} className="flex-1 accent-primary" />
                            <span className="text-white/35 text-xs w-7 text-right">{ctrl.value}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-3">
                        <Button variant="ghost" onClick={() => { setStep('upload'); setUserPhoto(null); }} className="text-white/50 hover:text-white gap-2">
                          <RotateCcw className="h-4 w-4" /> New Photo
                        </Button>
                        <Button onClick={generateResult} disabled={compositing} className="flex-1 bg-primary hover:bg-primary/90 text-white gap-2">
                          {compositing ? <><Loader2 className="h-4 w-4 animate-spin" />Generating…</> : <><Sparkles className="h-4 w-4" />Generate Photo</>}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Result */}
                  {step === 'result' && resultImage && (
                    <div className="space-y-4">
                      <div className="bg-green-500/15 border border-green-500/25 rounded-xl p-3 text-green-300 text-sm text-center font-medium">
                        ✅ Your try-on photo is ready!
                      </div>
                      <img src={resultImage} alt="Try-on result" className="w-full object-contain rounded-xl" />
                      <div className="flex gap-3">
                        <Button variant="ghost" onClick={() => setStep('adjust')} className="text-white/50 hover:text-white gap-2">
                          <RotateCcw className="h-4 w-4" /> Re-adjust
                        </Button>
                        <Button onClick={downloadResult} className="flex-1 bg-primary hover:bg-primary/90 text-white gap-2">
                          <Download className="h-4 w-4" /> Save Photo
                        </Button>
                      </div>
                      <button onClick={() => { setStep('upload'); resetPhotoState(); }} className="w-full text-white/30 hover:text-white/60 text-xs py-2 transition-colors">
                        Start over with a different photo
                      </button>
                    </div>
                  )}

                </div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
