import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Upload, Loader2, Check, X, Plus, Save, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useStoreSettings } from '@/hooks/useStoreSettings';

const SIZE_PRESETS = {
  'Kids (16-25)': Array.from({ length: 10 }, (_, i) => String(i + 16)),
  'Men (39-45)': ['39','40','41','42','43','44','45'],
  'Women (36-41)': ['36','37','38','39','40','41'],
  'Bags': ['Small','Medium','Large','XL'],
};

interface BatchItem {
  id: string;
  file: File;
  preview: string;
  uploadedUrl: string;
  loading: boolean;
  done: boolean;
  error: string;
  result: any;
  price: number;
  discount: number;
  qtySizes: Record<string, number>;
  expanded: boolean;
}

export default function AdminAiBulkCreator() {
  const { brandName } = useStoreSettings();
  const [items, setItems] = useState<BatchItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const newItems: BatchItem[] = Array.from(files).slice(0, 20).map(file => ({
      id: Math.random().toString(36).slice(2),
      file,
      preview: URL.createObjectURL(file),
      uploadedUrl: '',
      loading: false,
      done: false,
      error: '',
      result: null,
      price: 2500,
      discount: 10,
      qtySizes: { '39': 5, '40': 5, '41': 5, '42': 5, '43': 5, '44': 5, '45': 5 },
      expanded: false,
    }));
    setItems(prev => [...prev, ...newItems].slice(0, 20));
  };

  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

  const updateItem = (id: string, updates: Partial<BatchItem>) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
  };

  const updateQty = (id: string, size: string, qty: number) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, qtySizes: { ...i.qtySizes, [size]: qty } } : i));
  };

  const analyzeItem = async (item: BatchItem) => {
    updateItem(item.id, { loading: true, error: '' });
    try {
      let uploadedUrl = item.uploadedUrl;
      if (!uploadedUrl) {
        const path = `ai-bulk/${Date.now()}-${item.file.name}`;
        const { error: uploadError } = await supabase.storage.from('products').upload(path, item.file);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('products').getPublicUrl(path);
        uploadedUrl = urlData.publicUrl;
        updateItem(item.id, { uploadedUrl });
      }

      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          type: 'product-ai',
          imageUrl: uploadedUrl,
          messages: [{
            role: 'user',
            content: `You are a Pakistani e-commerce product expert for "${brandName || 'our store'}".
Analyze this product image and generate complete product details.
Image: ${uploadedUrl}

Return JSON only:
{
  "title": "Product name",
  "titleUrdu": "Urdu name",
  "description": "30+ line description",
  "brand": "Brand",
  "gender": "men|women|kids|unisex",
  "category": "Category",
  "tags": ["tag1","tag2"],
  "suggestedPrice": 2500,
  "suggestedOriginalPrice": 3000,
  "suggestedDiscountPercent": 15,
  "productType": "shoes|bags",
  "returnPolicy": "7 days return policy",
  "claimPolicy": "30 days warranty",
  "highlights": ["Feature 1","Feature 2","Feature 3"]
}
Return ONLY valid JSON, no markdown.`
          }]
        }
      });
      if (error) throw error;
      if (data?.error) throw new Error(typeof data.error === 'string' ? data.error : 'AI service error');
      let parsed = data;
      if (typeof data === 'string') {
        const m = data.match(/\{[\s\S]*\}/);
        if (m) parsed = JSON.parse(m[0]);
      }
      updateItem(item.id, { result: parsed, loading: false, done: true, price: parsed.suggestedPrice || 2500, discount: parsed.suggestedDiscountPercent || 10, expanded: true });
    } catch (e: any) {
      updateItem(item.id, { loading: false, error: e.message || 'Failed' });
    }
  };

  const analyzeAll = async () => {
    const pending = items.filter(i => !i.done && !i.loading);
    for (const item of pending) {
      await analyzeItem(item);
    }
    toast({ title: `AI Analysis complete!`, description: `${pending.length} products analyzed` });
  };

  const saveItem = async (item: BatchItem) => {
    if (!item.result) return;
    try {
      const gender = item.result.gender;
      const sizes = item.result.productType === 'bags' ? SIZE_PRESETS['Bags'] :
        gender === 'kids' ? SIZE_PRESETS['Kids (16-25)'] :
        gender === 'women' ? SIZE_PRESETS['Women (36-41)'] :
        SIZE_PRESETS['Men (39-45)'];

      const { data: prod, error } = await supabase.from('products').insert({
        title: item.result.title,
        description: item.result.description,
        brand: item.result.brand,
        gender: item.result.gender,
        price: item.price,
        original_price: item.price && item.discount ? Math.round(item.price / (1 - item.discount / 100)) : null,
        discount_percent: item.discount,
        images: item.uploadedUrl ? [item.uploadedUrl] : [],
        tags: item.result.tags || [],
        return_policy: item.result.returnPolicy,
        claim_policy: item.result.claimPolicy,
        is_active: true,
        sizes,
        stock: Object.values(item.qtySizes).reduce((a, b) => a + b, 0),
      }).select('id').single();
      if (error) throw error;

      if (prod && Object.keys(item.qtySizes).length > 0) {
        const variants = Object.entries(item.qtySizes).filter(([_, qty]) => qty > 0).map(([size, stock]) => ({
          product_id: prod.id,
          size,
          stock,
          price_override: null,
        }));
        if (variants.length > 0) await supabase.from('product_variants').insert(variants);
      }
      return true;
    } catch (e: any) {
      toast({ title: `Failed to save ${item.result?.title}`, description: e.message, variant: 'destructive' });
      return false;
    }
  };

  const saveAll = async () => {
    const ready = items.filter(i => i.done && i.result);
    if (ready.length === 0) { toast({ title: 'No analyzed products to save', variant: 'destructive' }); return; }
    setSaving(true);
    setSavedCount(0);
    let saved = 0;
    for (const item of ready) {
      const ok = await saveItem(item);
      if (ok) saved++;
      setSavedCount(saved);
    }
    toast({ title: `✅ ${saved} products saved to catalog!` });
    setSaving(false);
  };

  const doneCount = items.filter(i => i.done).length;
  const pendingCount = items.filter(i => !i.done && !i.loading).length;
  const loadingCount = items.filter(i => i.loading).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 rounded-xl"><Sparkles className="h-5 w-5 text-emerald-600" /></div>
          <div>
            <h2 className="text-xl font-bold">AI Bulk Product Creator</h2>
            <p className="text-sm text-muted-foreground">Upload 1–20 product images. AI generates details for each with price, discount & stock per size.</p>
          </div>
        </div>
        <div className="flex gap-2">
          {items.length > 0 && (
            <>
              <Button variant="outline" onClick={analyzeAll} disabled={pendingCount === 0 || loadingCount > 0}>
                {loadingCount > 0 ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analyzing {loadingCount}...</> : <><Sparkles className="h-4 w-4 mr-2" />Analyze All ({pendingCount})</>}
              </Button>
              <Button onClick={saveAll} disabled={saving || doneCount === 0}>
                {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving {savedCount}/{doneCount}...</> : <><Save className="h-4 w-4 mr-2" />Save All ({doneCount})</>}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      {items.length > 0 && (
        <div className="flex gap-4 p-3 bg-muted/50 rounded-xl text-sm flex-wrap">
          <span>Total: <strong>{items.length}</strong></span>
          <span className="text-muted-foreground">|</span>
          <span>Analyzed: <strong className="text-green-600">{doneCount}</strong></span>
          <span className="text-muted-foreground">|</span>
          <span>Pending: <strong className="text-orange-600">{pendingCount}</strong></span>
          {loadingCount > 0 && <><span className="text-muted-foreground">|</span><span>Processing: <strong className="text-blue-600">{loadingCount}</strong></span></>}
        </div>
      )}

      {/* Upload Zone */}
      <div
        className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-primary transition-colors"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
      >
        <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="font-medium">Drop images here or click to upload</p>
        <p className="text-sm text-muted-foreground mt-1">JPG, PNG, WebP · Up to 20 images at once</p>
        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => addFiles(e.target.files)} />
        <Button variant="outline" className="mt-3" onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>
          <Plus className="h-4 w-4 mr-2" />Add More Images
        </Button>
      </div>

      {/* Batch Items Grid */}
      {items.length > 0 && (
        <div className="space-y-4">
          {items.map((item, idx) => (
            <div key={item.id} className={`border rounded-xl overflow-hidden ${item.done ? 'border-green-200' : item.error ? 'border-red-200' : 'border-border'}`}>
              <div className="flex items-center gap-3 p-3 bg-muted/30">
                <img src={item.preview} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.result?.title || item.file.name}</p>
                  <p className="text-xs text-muted-foreground">Item {idx + 1} of {items.length}</p>
                  {item.error && <p className="text-xs text-red-600 mt-0.5">{item.error}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {item.done ? (
                    <Badge variant="default" className="bg-green-600 text-white text-xs"><Check className="h-3 w-3 mr-1" />Analyzed</Badge>
                  ) : item.loading ? (
                    <Badge variant="secondary" className="text-xs"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Analyzing...</Badge>
                  ) : item.error ? (
                    <Button size="sm" variant="outline" onClick={() => analyzeItem(item)} className="text-xs h-7">Retry</Button>
                  ) : (
                    <Button size="sm" onClick={() => analyzeItem(item)} className="text-xs h-7">
                      <Sparkles className="h-3 w-3 mr-1" />Analyze
                    </Button>
                  )}
                  {item.done && (
                    <button onClick={() => updateItem(item.id, { expanded: !item.expanded })} className="text-muted-foreground hover:text-foreground p-1">
                      {item.expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  )}
                  <button onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-destructive p-1"><X className="h-4 w-4" /></button>
                </div>
              </div>

              {item.done && item.expanded && item.result && (
                <div className="p-4 space-y-4 border-t">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div><p className="text-xs text-muted-foreground">Title</p><p className="font-semibold">{item.result.title}</p></div>
                        <div><p className="text-xs text-muted-foreground">Brand</p><p>{item.result.brand}</p></div>
                        <div><p className="text-xs text-muted-foreground">Gender</p><p className="capitalize">{item.result.gender}</p></div>
                        <div><p className="text-xs text-muted-foreground">Category</p><p>{item.result.category}</p></div>
                      </div>
                      {item.result.highlights?.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Highlights</p>
                          <ul className="space-y-0.5">{item.result.highlights.map((h: string, i: number) => <li key={i} className="text-xs">• {h}</li>)}</ul>
                        </div>
                      )}
                    </div>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs">Selling Price (Rs.)</Label>
                        <Input
                          id={`price-${item.id}`}
                          type="number" value={item.price}
                          onChange={e => updateItem(item.id, { price: Number(e.target.value) })}
                          className="h-8 text-sm mt-0.5"
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById(`discount-${item.id}`)?.focus(); } }}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Discount (%)</Label>
                        <Input
                          id={`discount-${item.id}`}
                          type="number" value={item.discount} min={0} max={90}
                          onChange={e => updateItem(item.id, { discount: Number(e.target.value) })}
                          className="h-8 text-sm mt-0.5"
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById(`save-${item.id}`)?.click(); } }}
                        />
                      </div>
                      <Button id={`save-${item.id}`} size="sm" className="w-full text-xs" onClick={() => saveItem(item).then(ok => ok && toast({ title: 'Saved!' }))}>
                        <Save className="h-3 w-3 mr-1.5" />Save This Product
                      </Button>
                    </div>
                  </div>

                  {/* Size Stock Grid */}
                  <div>
                    <p className="text-sm font-medium mb-2">Quantity per Size</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(item.qtySizes).map(([size, qty]) => (
                        <div key={size} className="flex flex-col items-center gap-0.5">
                          <span className="text-xs font-medium text-muted-foreground">{size}</span>
                          <Input type="number" value={qty} min={0} onChange={e => updateQty(item.id, size, Number(e.target.value))} className="w-16 h-8 text-center text-sm p-1" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {items.length === 0 && (
        <div className="text-center py-6 text-muted-foreground text-sm">
          <p>Start by uploading product images above</p>
        </div>
      )}
    </div>
  );
}
