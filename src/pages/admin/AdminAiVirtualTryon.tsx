import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Upload, Loader2, Sparkles, Download, RefreshCw, User, ShoppingBag, Camera, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

type TryonCategory = 'tops' | 'bottoms' | 'one-pieces';

const CATEGORY_OPTIONS: { value: TryonCategory; label: string; icon: string }[] = [
  { value: 'tops', label: 'Tops / Shirts / Jackets', icon: '👔' },
  { value: 'bottoms', label: 'Bottoms / Trousers / Shoes', icon: '👟' },
  { value: 'one-pieces', label: 'Full Outfit / Dress', icon: '👗' },
];

type TryonStatus = 'idle' | 'uploading' | 'processing' | 'polling' | 'done' | 'error';

export default function AdminAiVirtualTryon() {
  const [personFile, setPersonFile] = useState<File | null>(null);
  const [personPreview, setPersonPreview] = useState('');
  const [productFile, setProductFile] = useState<File | null>(null);
  const [productPreview, setProductPreview] = useState('');
  const [category, setCategory] = useState<TryonCategory>('tops');
  const [status, setStatus] = useState<TryonStatus>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const [resultUrl, setResultUrl] = useState('');
  const [predictionId, setPredictionId] = useState('');
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const handlePersonChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast({ title: 'Image too large', description: 'Max 10MB', variant: 'destructive' }); return; }
    setPersonFile(file);
    setPersonPreview(URL.createObjectURL(file));
    setResultUrl('');
  };

  const handleProductChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast({ title: 'Image too large', description: 'Max 10MB', variant: 'destructive' }); return; }
    setProductFile(file);
    setProductPreview(URL.createObjectURL(file));
    setResultUrl('');
  };

  const uploadImage = async (file: File, folder: string): Promise<string> => {
    const ext = file.name.split('.').pop();
    const path = `virtual-tryon/${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('products').upload(path, file, { cacheControl: '3600', upsert: false });
    if (error) throw new Error(`Upload failed: ${error.message}`);
    const { data: urlData } = supabase.storage.from('products').getPublicUrl(path);
    return urlData.publicUrl;
  };

  const startPoll = (predId: string) => {
    setPredictionId(predId);
    setStatus('polling');
    setStatusMsg('AI is rendering your try-on… This may take 30–60 seconds');
    let attempts = 0;
    pollTimer.current = setInterval(async () => {
      attempts++;
      if (attempts > 60) {
        clearInterval(pollTimer.current!);
        setStatus('error');
        setStatusMsg('Timed out. Please try again.');
        return;
      }
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: { type: 'virtual-tryon-poll', predictionId: predId },
      });
      if (error || !data) return;
      if (data.status === 'succeeded' && data.outputUrl) {
        clearInterval(pollTimer.current!);
        setResultUrl(data.outputUrl);
        setStatus('done');
        setStatusMsg('');
        toast({ title: '✅ Virtual Try-On complete!' });
      } else if (data.status === 'failed') {
        clearInterval(pollTimer.current!);
        setStatus('error');
        setStatusMsg(data.error || 'AI generation failed. Please try again.');
        toast({ title: 'Try-on failed', description: data.error, variant: 'destructive' });
      }
    }, 3000);
  };

  const handleGenerate = async () => {
    if (!personFile || !productFile) {
      toast({ title: 'Upload both images first', description: 'Need a person photo and a product photo.', variant: 'destructive' });
      return;
    }
    if (pollTimer.current) clearInterval(pollTimer.current);
    setResultUrl('');
    setStatus('uploading');
    setStatusMsg('Uploading images…');
    try {
      const [personUrl, productUrl] = await Promise.all([
        uploadImage(personFile, 'person'),
        uploadImage(productFile, 'product'),
      ]);
      setStatus('processing');
      setStatusMsg('Sending to AI… Starting virtual try-on');
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          type: 'virtual-tryon-start',
          userImageUrl: personUrl,
          productImageUrl: productUrl,
          categoryType: category === 'bottoms' ? 'shoes' : 'tops',
        },
      });
      if (error || !data) throw new Error(error?.message || 'Failed to start try-on');
      if (data.error) throw new Error(data.error);
      if (data.predictionId) {
        startPoll(data.predictionId);
      } else {
        throw new Error('No prediction ID received from AI');
      }
    } catch (e: any) {
      setStatus('error');
      setStatusMsg(e.message);
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleDownload = async () => {
    try {
      const res = await fetch(resultUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `virtual-tryon-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(resultUrl, '_blank');
    }
  };

  const handleReset = () => {
    if (pollTimer.current) clearInterval(pollTimer.current);
    setPersonFile(null); setPersonPreview('');
    setProductFile(null); setProductPreview('');
    setResultUrl(''); setStatus('idle'); setStatusMsg('');
    setPredictionId('');
  };

  const isProcessing = status === 'uploading' || status === 'processing' || status === 'polling';

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Virtual Try-On
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Upload a person's photo + product photo. Our AI will realistically apply the product with matching lighting & perspective.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { icon: Camera, label: 'Upload both photos', desc: 'Person + Product' },
          { icon: Sparkles, label: 'AI processes', desc: 'Matches lighting & pose' },
          { icon: CheckCircle2, label: 'Download result', desc: 'Photorealistic output' },
        ].map(({ icon: Icon, label, desc }) => (
          <div key={label} className="flex items-center gap-3 bg-muted/30 rounded-xl px-4 py-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs font-semibold">{label}</p>
              <p className="text-[11px] text-muted-foreground">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 font-semibold">
            <User className="h-4 w-4" /> Person Photo
          </Label>
          <p className="text-xs text-muted-foreground">Full body photo works best. Clear background preferred.</p>
          <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl cursor-pointer transition-colors h-52 overflow-hidden relative
            ${personPreview ? 'border-primary/40 bg-primary/5' : 'border-muted-foreground/30 hover:border-primary/50 bg-muted/20'}`}>
            {personPreview ? (
              <img src={personPreview} alt="Person" className="w-full h-full object-contain" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground p-4 text-center">
                <Upload className="h-8 w-8 opacity-50" />
                <p className="text-sm font-medium">Click to upload person photo</p>
                <p className="text-xs">JPG, PNG, WebP · Max 10MB</p>
              </div>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={handlePersonChange} disabled={isProcessing} />
          </label>
          {personPreview && (
            <Badge variant="outline" className="text-[10px] text-green-600 border-green-200 bg-green-50">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Photo uploaded
            </Badge>
          )}
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 font-semibold">
            <ShoppingBag className="h-4 w-4" /> Product Photo
          </Label>
          <p className="text-xs text-muted-foreground">Clear product image. White or transparent background is ideal.</p>
          <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl cursor-pointer transition-colors h-52 overflow-hidden relative
            ${productPreview ? 'border-primary/40 bg-primary/5' : 'border-muted-foreground/30 hover:border-primary/50 bg-muted/20'}`}>
            {productPreview ? (
              <img src={productPreview} alt="Product" className="w-full h-full object-contain" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground p-4 text-center">
                <Upload className="h-8 w-8 opacity-50" />
                <p className="text-sm font-medium">Click to upload product photo</p>
                <p className="text-xs">JPG, PNG, WebP · Max 10MB</p>
              </div>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={handleProductChange} disabled={isProcessing} />
          </label>
          {productPreview && (
            <Badge variant="outline" className="text-[10px] text-green-600 border-green-200 bg-green-50">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Photo uploaded
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="font-semibold">Product Category</Label>
        <Select value={category} onValueChange={v => setCategory(v as TryonCategory)} disabled={isProcessing}>
          <SelectTrigger className="w-full sm:w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.icon} {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Button onClick={handleGenerate} disabled={isProcessing || !personFile || !productFile} className="gap-2 min-w-40">
          {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {isProcessing ? 'Processing…' : 'Generate Try-On'}
        </Button>
        {(status !== 'idle') && (
          <Button variant="outline" onClick={handleReset} disabled={isProcessing} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Reset
          </Button>
        )}
      </div>

      {isProcessing && statusMsg && (
        <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
          <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
          <div>
            <p className="text-sm font-medium text-primary">{statusMsg}</p>
            {status === 'polling' && (
              <p className="text-xs text-muted-foreground mt-0.5">AI is rendering realistic lighting & perspective match…</p>
            )}
          </div>
        </div>
      )}

      {status === 'error' && statusMsg && (
        <div className="flex items-start gap-3 bg-destructive/5 border border-destructive/20 rounded-xl px-4 py-3">
          <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-destructive">Generation Failed</p>
            <p className="text-xs text-muted-foreground mt-0.5">{statusMsg}</p>
            {statusMsg.includes('REPLICATE_API_KEY') && (
              <p className="text-xs text-muted-foreground mt-1">
                ⚙️ Admin needs to add <code className="bg-muted px-1 rounded">REPLICATE_API_KEY</code> in Supabase Edge Function secrets.
              </p>
            )}
          </div>
        </div>
      )}

      {status === 'done' && resultUrl && (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <p className="font-semibold text-green-700">Virtual Try-On Complete!</p>
            </div>
            <Button onClick={handleDownload} className="gap-2" size="sm">
              <Download className="h-4 w-4" /> Download Image
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-center text-muted-foreground">Original Person</p>
              <div className="border rounded-xl overflow-hidden h-56 bg-muted/20">
                <img src={personPreview} alt="Person" className="w-full h-full object-contain" />
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-center text-muted-foreground">Product</p>
              <div className="border rounded-xl overflow-hidden h-56 bg-muted/20">
                <img src={productPreview} alt="Product" className="w-full h-full object-contain" />
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-center text-primary font-semibold">✨ AI Result</p>
              <div className="border-2 border-primary/30 rounded-xl overflow-hidden h-56 bg-muted/20 shadow-md">
                <img src={resultUrl} alt="Virtual Try-On Result" className="w-full h-full object-contain" />
              </div>
            </div>
          </div>

          <div className="bg-muted/30 rounded-xl px-4 py-3 text-xs text-muted-foreground">
            <p className="font-medium mb-1">💡 Tips for best results:</p>
            <ul className="space-y-0.5 list-disc list-inside">
              <li>Use a full-body or upper-body person photo with clear visibility</li>
              <li>Product photo on white/transparent background gives cleanest results</li>
              <li>Good lighting in person photo improves AI matching accuracy</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
