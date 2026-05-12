import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Upload, Loader2, Sparkles, Download, RefreshCw, User,
  ShoppingBag, Camera, CheckCircle2, AlertCircle, Search, Package, Info
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { createCanvasTryOn, type TryOnCategory } from '@/lib/tryonCanvas';

type TryonStatus = 'idle' | 'uploading' | 'processing' | 'polling' | 'done' | 'error';

export default function AdminAiVirtualTryon() {
  const [products, setProducts] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [personFile, setPersonFile] = useState<File | null>(null);
  const [personPreview, setPersonPreview] = useState('');
  const [category, setCategory] = useState<'tops' | 'bottoms' | 'one-pieces'>('tops');
  const [status, setStatus] = useState<TryonStatus>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const [resultUrl, setResultUrl] = useState('');
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    supabase.from('products').select('id, title, images, tags').eq('is_active', true).limit(200)
      .then(({ data }) => setProducts(data || []));
  }, []);

  const filteredProducts = products.filter(p =>
    p.title?.toLowerCase().includes(productSearch.toLowerCase()) ||
    (p.tags as string[])?.some((t: string) => t.toLowerCase().includes(productSearch.toLowerCase()))
  );

  const handlePersonChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast({ title: 'Image too large (max 10MB)', variant: 'destructive' }); return; }
    setPersonFile(file);
    setPersonPreview(URL.createObjectURL(file));
    setResultUrl('');
  };

  const uploadPersonImage = async (): Promise<string> => {
    if (!personFile) throw new Error('No person image');
    const ext = personFile.name.split('.').pop();
    const path = `virtual-tryon/person/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('products').upload(path, personFile, { cacheControl: '3600', upsert: false });
    if (error) throw new Error(`Upload failed: ${error.message}`);
    return supabase.storage.from('products').getPublicUrl(path).data.publicUrl;
  };

  const fallbackOnPollFail = async () => {
    if (!personPreview || !selectedProduct?.images?.[0]) return;
    await tryCanvasFallback(personPreview, selectedProduct.images[0]);
  };

  const startPoll = (predId: string) => {
    setStatus('polling');
    setStatusMsg('AI is rendering your try-on… This may take 30–60 seconds');
    let attempts = 0;
    pollTimer.current = setInterval(async () => {
      attempts++;
      if (attempts > 30) {
        clearInterval(pollTimer.current!);
        await fallbackOnPollFail();
        return;
      }
      const { data } = await supabase.functions.invoke('ai-assistant', { body: { type: 'virtual-tryon-poll', predictionId: predId } });
      if (!data) return;
      if (data.status === 'succeeded' && data.outputUrl) {
        clearInterval(pollTimer.current!);
        setResultUrl(data.outputUrl); setStatus('done'); setStatusMsg('');
        toast({ title: '✅ Virtual Try-On complete!' });
      } else if (data.status === 'failed') {
        clearInterval(pollTimer.current!);
        await fallbackOnPollFail();
      }
    }, 3000);
  };

  const tryCanvasFallback = async (personUrl: string, productImage: string) => {
    setStatus('processing');
    setStatusMsg('Generating preview…');
    const tryonCat: TryOnCategory =
      category === 'bottoms' ? 'shoes' :
      category === 'one-pieces' ? 'clothing' : 'clothing';
    const dataUrl = await createCanvasTryOn(personUrl, productImage, tryonCat);
    setResultUrl(dataUrl);
    setStatus('done');
    setStatusMsg('');
    toast({ title: '✨ Preview generated', description: 'Free preview mode. For photo-realistic AI, enable Replicate billing.' });
  };

  const handleGenerate = async () => {
    if (!personFile || !selectedProduct) {
      toast({ title: 'Select a product and upload your photo first', variant: 'destructive' });
      return;
    }
    const productImage = selectedProduct.images?.[0];
    if (!productImage) { toast({ title: 'Selected product has no image', variant: 'destructive' }); return; }

    if (pollTimer.current) clearInterval(pollTimer.current);
    setResultUrl('');
    setStatus('uploading');
    setStatusMsg('Uploading your photo…');

    let personUrl = '';
    try {
      personUrl = await uploadPersonImage();
    } catch (e: any) {
      setStatus('error'); setStatusMsg(e.message);
      toast({ title: 'Upload failed', description: e.message, variant: 'destructive' });
      return;
    }

    setStatus('processing');
    setStatusMsg('Trying AI service…');
    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          type: 'virtual-tryon-start',
          userImageUrl: personUrl,
          productImageUrl: productImage,
          categoryType: category === 'bottoms' ? 'shoes' : 'tops',
          productTitle: selectedProduct.title,
        },
      });
      if (error || !data || data.error) {
        await tryCanvasFallback(personUrl, productImage);
        return;
      }
      if (data.predictionId) startPoll(data.predictionId);
      else await tryCanvasFallback(personUrl, productImage);
    } catch {
      await tryCanvasFallback(personUrl, productImage);
    }
  };

  const handleDownload = async () => {
    try {
      const res = await fetch(resultUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = `virtual-tryon-${Date.now()}.png`; a.click();
      URL.revokeObjectURL(url);
    } catch { window.open(resultUrl, '_blank'); }
  };

  const handleReset = () => {
    if (pollTimer.current) clearInterval(pollTimer.current);
    setPersonFile(null); setPersonPreview('');
    setResultUrl(''); setStatus('idle'); setStatusMsg('');
    setSelectedProduct(null); setProductSearch('');
  };

  const isProcessing = status === 'uploading' || status === 'processing' || status === 'polling';

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-fuchsia-100 rounded-xl"><Sparkles className="h-5 w-5 text-fuchsia-600" /></div>
        <div>
          <h2 className="text-xl font-bold">AI Virtual Try-On</h2>
          <p className="text-sm text-muted-foreground">Select a product + upload a photo to generate a try-on preview</p>
        </div>
      </div>

      <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl px-4 py-3">
        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 dark:text-blue-200 space-y-1">
          <p className="font-semibold">Preview Mode (Free)</p>
          <p>
            Photo-realistic AI try-on (FashnAI / IDM-VTON) requires a paid Replicate account ($5 minimum credit). To enable real AI, add billing at{' '}
            <a href="https://replicate.com/account/billing" target="_blank" rel="noopener noreferrer" className="underline font-medium">replicate.com/account/billing</a>.
            Until then, we'll generate a free canvas-based preview.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Product Selector */}
        <div className="space-y-3">
          <Label className="flex items-center gap-1.5 font-semibold text-base">
            <ShoppingBag className="h-4 w-4" /> Step 1 — Select Product
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={productSearch}
              onChange={e => setProductSearch(e.target.value)}
              placeholder="Search products by name or code…"
              className="pl-9"
              disabled={isProcessing}
            />
          </div>

          <div className="border rounded-xl overflow-y-auto max-h-64 divide-y">
            {filteredProducts.slice(0, 30).map(p => {
              const img = p.images?.[0];
              const code = (p.tags as string[])?.[0] || '';
              const isSelected = selectedProduct?.id === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => { setSelectedProduct(p); setResultUrl(''); }}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${isSelected ? 'bg-primary/10 border-l-2 border-primary' : 'hover:bg-muted/50'}`}
                  disabled={isProcessing}
                >
                  <div className="w-10 h-10 rounded-lg border bg-muted overflow-hidden shrink-0">
                    {img ? <img src={img} alt={p.title} className="w-full h-full object-cover" /> : <Package className="h-5 w-5 m-auto mt-2.5 text-muted-foreground opacity-50" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{p.title}</p>
                    {code && <p className="text-[10px] text-muted-foreground">{code}</p>}
                  </div>
                  {isSelected && <CheckCircle2 className="h-4 w-4 text-primary ml-auto shrink-0" />}
                </button>
              );
            })}
            {filteredProducts.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">No products found</div>
            )}
          </div>

          {selectedProduct && (
            <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl p-3">
              <div className="w-14 h-14 rounded-lg border overflow-hidden shrink-0 bg-muted">
                {selectedProduct.images?.[0] && <img src={selectedProduct.images[0]} alt={selectedProduct.title} className="w-full h-full object-cover" />}
              </div>
              <div>
                <p className="text-sm font-semibold">{selectedProduct.title}</p>
                <Badge variant="outline" className="text-[10px] text-green-600 border-green-200 bg-green-50 mt-1">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Product selected
                </Badge>
              </div>
            </div>
          )}
        </div>

        {/* Right: Person Photo Upload */}
        <div className="space-y-3">
          <Label className="flex items-center gap-1.5 font-semibold text-base">
            <User className="h-4 w-4" /> Step 2 — Upload Person Photo
          </Label>
          <p className="text-xs text-muted-foreground">Full body or upper body photo with clear background preferred.</p>

          <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl cursor-pointer transition-colors h-52 overflow-hidden relative
            ${personPreview ? 'border-primary/40 bg-primary/5' : 'border-muted-foreground/30 hover:border-primary/50 bg-muted/20'}
            ${isProcessing ? 'pointer-events-none opacity-60' : ''}`}>
            {personPreview
              ? <img src={personPreview} alt="Person" className="w-full h-full object-contain" />
              : <div className="flex flex-col items-center gap-2 text-muted-foreground p-4 text-center">
                  <Upload className="h-8 w-8 opacity-50" />
                  <p className="text-sm font-medium">Click to upload person photo</p>
                  <p className="text-xs">JPG, PNG, WebP · Max 10MB</p>
                </div>
            }
            <input type="file" accept="image/*" className="hidden" onChange={handlePersonChange} disabled={isProcessing} />
          </label>
          {personPreview && (
            <Badge variant="outline" className="text-[10px] text-green-600 border-green-200 bg-green-50">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Photo ready
            </Badge>
          )}

          <div className="space-y-1.5">
            <Label className="font-semibold text-sm">Product Category</Label>
            <Select value={category} onValueChange={v => setCategory(v as any)} disabled={isProcessing}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tops">👔 Tops / Shirts / Jackets</SelectItem>
                <SelectItem value="bottoms">👟 Bottoms / Trousers / Shoes</SelectItem>
                <SelectItem value="one-pieces">👗 Full Outfit / Dress</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Button onClick={handleGenerate} disabled={isProcessing || !personFile || !selectedProduct} className="gap-2 min-w-44">
          {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {isProcessing ? 'Processing…' : 'Generate Try-On'}
        </Button>
        {status !== 'idle' && (
          <Button variant="outline" onClick={handleReset} disabled={isProcessing} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Reset
          </Button>
        )}
      </div>

      {isProcessing && (
        <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
          <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
          <div>
            <p className="text-sm font-medium text-primary">{statusMsg}</p>
            {status === 'polling' && <p className="text-xs text-muted-foreground mt-0.5">AI is rendering realistic lighting & perspective…</p>}
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
              <p className="text-xs text-muted-foreground mt-1">⚙️ Add <code className="bg-muted px-1 rounded">REPLICATE_API_KEY</code> in Supabase Edge Function secrets.</p>
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
              <Download className="h-4 w-4" /> Download Result
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-center text-muted-foreground">Person Photo</p>
              <div className="border rounded-xl overflow-hidden h-52 bg-muted/20">
                <img src={personPreview} alt="Person" className="w-full h-full object-contain" />
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-center text-muted-foreground">Product</p>
              <div className="border rounded-xl overflow-hidden h-52 bg-muted/20">
                {selectedProduct?.images?.[0] && <img src={selectedProduct.images[0]} alt="Product" className="w-full h-full object-contain" />}
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-bold text-center text-primary">✨ AI Result</p>
              <div className="border-2 border-primary/30 rounded-xl overflow-hidden h-52 bg-muted/20 shadow-md">
                <img src={resultUrl} alt="AI Try-On" className="w-full h-full object-contain" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
