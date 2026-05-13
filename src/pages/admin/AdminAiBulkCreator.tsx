import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Sparkles, Upload, Loader2, Check, X, Plus, Save, Trash2,
  ChevronDown, ChevronUp, Tag, Palette, Hash,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useStoreSettings } from '@/hooks/useStoreSettings';

const BAG_TYPES = ['bags', 'handbags', 'purses', 'wallets', 'clutch', 'tote', 'backpacks'];
const CLOTHING_TYPES = ['clothing', 'shirt', 'kurta', 'dress', 'top', 'trouser', 'pants', 'jeans', 'jacket', 'coat', 'sweater', 'hoodie', 'tshirt', 't-shirt', 'shalwar', 'kameez'];
const FOOTWEAR_TYPES = ['shoes', 'sandals', 'heels', 'slippers', 'boots', 'loafers', 'sneakers', 'chappal', 'khussa', 'moccasins', 'flip flops'];

const getSizesForType = (productType: string, gender: string): string[] => {
  const t = (productType || '').toLowerCase();
  const g = (gender || '').toLowerCase();

  if (BAG_TYPES.some(bt => t.includes(bt))) return ['Small', 'Medium', 'Large', 'XL'];

  if (CLOTHING_TYPES.some(ct => t.includes(ct))) {
    if (g === 'kids') return ['2-3Y', '4-5Y', '6-7Y', '8-9Y', '10-11Y', '12-13Y'];
    return ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
  }

  if (FOOTWEAR_TYPES.some(ft => t.includes(ft)) || t === 'shoes') {
    if (g === 'kids') return Array.from({ length: 10 }, (_, i) => String(i + 16));
    if (g === 'women') return ['36', '37', '38', '39', '40', '41'];
    return ['39', '40', '41', '42', '43', '44', '45'];
  }

  if (t === 'accessories' || t === 'jewellery' || t === 'jewelry' || t === 'belt' || t === 'watch' || t === 'cap' || t === 'hat') {
    return ['One Size'];
  }

  if (g === 'kids') return Array.from({ length: 10 }, (_, i) => String(i + 16));
  if (g === 'women') return ['36', '37', '38', '39', '40', '41'];
  return ['39', '40', '41', '42', '43', '44', '45'];
};

const COLOR_PALETTES: { name: string; hex: string }[] = [
  { name: 'Black', hex: '#1a1a1a' }, { name: 'White', hex: '#FFFFFF' },
  { name: 'Brown', hex: '#7B3F00' }, { name: 'Navy', hex: '#1B2A4A' },
  { name: 'Grey', hex: '#808080' }, { name: 'Tan', hex: '#D2B48C' },
  { name: 'Red', hex: '#CC0000' }, { name: 'Beige', hex: '#F5F5DC' },
  { name: 'Camel', hex: '#C19A6B' }, { name: 'Olive', hex: '#6B6B3A' },
  { name: 'Maroon', hex: '#800000' }, { name: 'Gold', hex: '#CFB53B' },
];

const PRODUCT_TYPES = [
  { value: 'shoes', label: '👟 Shoes' }, { value: 'sandals', label: '🥿 Sandals' },
  { value: 'heels', label: '👠 Heels' }, { value: 'slippers', label: '🩴 Slippers' },
  { value: 'boots', label: '👢 Boots' }, { value: 'loafers', label: '👞 Loafers' },
  { value: 'sneakers', label: '👟 Sneakers' }, { value: 'chappal', label: '🥿 Chappal' },
  { value: 'khussa', label: '👞 Khussa' }, { value: 'moccasins', label: '🥿 Moccasins' },
  { value: 'bags', label: '👜 Bags' }, { value: 'handbags', label: '👜 Handbags' },
  { value: 'purses', label: '👛 Purses' }, { value: 'wallets', label: '💼 Wallets' },
  { value: 'backpacks', label: '🎒 Backpacks' }, { value: 'clutch', label: '👝 Clutch' },
  { value: 'tote', label: '🛍️ Tote Bag' },
  { value: 'clothing', label: '👕 Clothing' }, { value: 'shirt', label: '👕 Shirt' },
  { value: 'kurta', label: '👘 Kurta' }, { value: 'dress', label: '👗 Dress' },
  { value: 'trouser', label: '👖 Trouser/Pants' }, { value: 'jacket', label: '🧥 Jacket' },
  { value: 'sweater', label: '🧣 Sweater/Hoodie' }, { value: 'shalwar', label: '👘 Shalwar Kameez' },
  { value: 'accessories', label: '💍 Accessories' }, { value: 'jewellery', label: '💎 Jewellery' },
  { value: 'belt', label: '👔 Belt' }, { value: 'cap', label: '🧢 Cap/Hat' },
  { value: 'watch', label: '⌚ Watch' },
];

interface ColorVariant {
  id: string;
  color: string;
  hex: string;
  discount: number;
  qtySizes: Record<string, number>;
}

interface BatchItem {
  id: string;
  file: File;
  preview: string;
  uploadedUrl: string;
  loading: boolean;
  done: boolean;
  error: string;
  result: any;
  expanded: boolean;
  title: string;
  titleUrdu: string;
  brand: string;
  gender: string;
  category: string;
  productType: string;
  description: string;
  returnPolicy: string;
  claimPolicy: string;
  tags: string[];
  productCode: string;
  highlights: string[];
  price: number;
  discount: number;
  activeSizes: string[];
  customSizeInput: string;
  colors: ColorVariant[];
}

const makeDefaultQty = (sizes: string[]) =>
  Object.fromEntries(sizes.map(s => [s, 1]));

const makeItem = (file: File): BatchItem => ({
  id: Math.random().toString(36).slice(2),
  file, preview: URL.createObjectURL(file),
  uploadedUrl: '', loading: false, done: false, error: '', result: null, expanded: false,
  title: '', titleUrdu: '', brand: '', gender: 'men', category: '', productType: 'shoes',
  description: '', returnPolicy: '7 days return policy',
  claimPolicy: 'Manufacturing defects only. Normal wear, misuse, water damage not covered.',
  tags: [], productCode: '', highlights: [],
  price: 2500, discount: 10,
  activeSizes: getSizesForType('shoes', 'men'),
  customSizeInput: '',
  colors: [],
});

export default function AdminAiBulkCreator() {
  const { brandName } = useStoreSettings();
  const [items, setItems] = useState<BatchItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qtyRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const newItems = Array.from(files).slice(0, 20).map(makeItem);
    setItems(prev => [...prev, ...newItems].slice(0, 20));
  };

  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

  const updateItem = (id: string, updates: Partial<BatchItem>) =>
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));

  const updateItemSizes = (id: string, productType: string, gender: string) => {
    const newSizes = getSizesForType(productType, gender);
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updatedColors = item.colors.map(c => ({
        ...c,
        qtySizes: Object.fromEntries(newSizes.map(s => [s, c.qtySizes[s] ?? 1])),
      }));
      return { ...item, activeSizes: newSizes, colors: updatedColors };
    }));
  };

  const addSize = (id: string, size: string) => {
    const s = size.trim();
    if (!s) return;
    setItems(prev => prev.map(item => {
      if (item.id !== id || item.activeSizes.includes(s)) return item;
      const newSizes = [...item.activeSizes, s];
      const updatedColors = item.colors.map(c => ({
        ...c, qtySizes: { ...c.qtySizes, [s]: 1 },
      }));
      return { ...item, activeSizes: newSizes, colors: updatedColors, customSizeInput: '' };
    }));
  };

  const removeSize = (id: string, size: string) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const newSizes = item.activeSizes.filter(s => s !== size);
      const updatedColors = item.colors.map(c => {
        const q = { ...c.qtySizes };
        delete q[size];
        return { ...c, qtySizes: q };
      });
      return { ...item, activeSizes: newSizes, colors: updatedColors };
    }));
  };

  const addColor = (id: string, color = '', hex = '#000000') => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const newColor: ColorVariant = {
        id: Math.random().toString(36).slice(2),
        color, hex, discount: item.discount,
        qtySizes: makeDefaultQty(item.activeSizes),
      };
      return { ...item, colors: [...item.colors, newColor] };
    }));
  };

  const removeColor = (itemId: string, colorId: string) => {
    setItems(prev => prev.map(i => i.id === itemId
      ? { ...i, colors: i.colors.filter(c => c.id !== colorId) } : i));
  };

  const updateColor = (itemId: string, colorId: string, updates: Partial<ColorVariant>) => {
    setItems(prev => prev.map(i => i.id === itemId
      ? { ...i, colors: i.colors.map(c => c.id === colorId ? { ...c, ...updates } : c) } : i));
  };

  const updateColorQty = (itemId: string, colorId: string, size: string, qty: number) => {
    setItems(prev => prev.map(i => i.id === itemId
      ? {
        ...i, colors: i.colors.map(c => c.id === colorId
          ? { ...c, qtySizes: { ...c.qtySizes, [size]: Math.max(0, qty) } }
          : c),
      } : i));
  };

  const handleQtyKeyDown = (
    e: React.KeyboardEvent,
    itemId: string,
    colorIdx: number,
    sizeIdx: number,
    sizes: string[],
    colors: ColorVariant[],
  ) => {
    if (e.key === 'Tab' || e.key === 'Enter') {
      e.preventDefault();
      const nextSi = sizeIdx + 1;
      if (nextSi < sizes.length) {
        const key = `${itemId}-${colorIdx}-${sizes[nextSi]}`;
        qtyRefs.current[key]?.focus();
        qtyRefs.current[key]?.select();
      } else if (colorIdx + 1 < colors.length) {
        const key = `${itemId}-${colorIdx + 1}-${sizes[0]}`;
        qtyRefs.current[key]?.focus();
        qtyRefs.current[key]?.select();
      }
    }
  };

  const generateProductCode = async (item: BatchItem): Promise<string> => {
    const prefix = (item.category || item.productType || 'PRD').substring(0, 3).toUpperCase();
    const { data: existingProducts } = await supabase.from('products').select('tags').not('tags', 'is', null);
    const { data: deletedData } = await supabase.from('deleted_product_codes').select('code').like('code', `${prefix}%`);
    const deletedCodes = new Set((deletedData || []).map((d: any) => d.code));
    let maxNum = 0;
    (existingProducts || []).forEach((p: any) => {
      const code = (p.tags as string[])?.[0] || '';
      if (code.startsWith(prefix)) {
        const num = parseInt(code.replace(prefix, ''), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });
    deletedCodes.forEach((code: string) => {
      const num = parseInt(code.replace(prefix, ''), 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    });
    let candidate = maxNum + 1;
    while (deletedCodes.has(`${prefix}${String(candidate).padStart(3, '0')}`)) candidate++;
    return `${prefix}${String(candidate).padStart(3, '0')}`;
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
  "productType": "shoes|sandals|heels|slippers|boots|sneakers|chappal|bags|handbags|purses|wallets|backpacks|clutch|clothing|shirt|kurta|dress|trouser|jacket|sweater|accessories|belt|cap|watch",
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

      const productType = parsed.productType || 'shoes';
      const gender = parsed.gender || 'men';
      const sizes = getSizesForType(productType, gender);
      const code = await generateProductCode({ ...item, category: parsed.category, productType });

      updateItem(item.id, {
        result: parsed,
        loading: false,
        done: true,
        expanded: true,
        title: parsed.title || '',
        titleUrdu: parsed.titleUrdu || '',
        brand: parsed.brand || '',
        gender,
        category: parsed.category || '',
        productType,
        description: parsed.description || '',
        returnPolicy: parsed.returnPolicy || '7 days return policy',
        claimPolicy: parsed.claimPolicy || 'Manufacturing defects only.',
        tags: parsed.tags || [],
        highlights: parsed.highlights || [],
        price: parsed.suggestedPrice || 2500,
        discount: parsed.suggestedDiscountPercent || 10,
        productCode: code,
        activeSizes: sizes,
        colors: [],
      });
    } catch (e: any) {
      updateItem(item.id, { loading: false, error: e.message || 'Failed' });
    }
  };

  const analyzeAll = async () => {
    const pending = items.filter(i => !i.done && !i.loading);
    for (const item of pending) await analyzeItem(item);
    toast({ title: `AI Analysis complete!`, description: `${pending.length} products analyzed` });
  };

  const saveItem = async (item: BatchItem) => {
    try {
      const code = item.productCode || await generateProductCode(item);
      const tags = [code, ...item.tags.filter(t => t !== code)];
      const sizesArr = item.activeSizes;
      const totalStock = item.colors.length > 0
        ? item.colors.reduce((sum, c) => sum + Object.values(c.qtySizes).reduce((a, b) => a + b, 0), 0)
        : sizesArr.length;

      const { data: prod, error } = await supabase.from('products').insert({
        title: item.title || item.result?.title || 'Untitled',
        description: item.description,
        brand: item.brand,
        gender: item.gender,
        price: item.price,
        original_price: item.price && item.discount
          ? Math.round(item.price / (1 - item.discount / 100)) : null,
        discount_percent: item.discount,
        images: item.uploadedUrl ? [item.uploadedUrl] : [],
        tags,
        return_policy: item.returnPolicy,
        claim_policy: item.claimPolicy,
        is_active: true,
        sizes: sizesArr,
        stock: totalStock,
        product_type: item.productType,
      }).select('id').single();
      if (error) throw error;

      if (prod && item.colors.length > 0) {
        const variants: any[] = [];
        for (const colorVar of item.colors) {
          for (const [size, stock] of Object.entries(colorVar.qtySizes)) {
            if (stock > 0) {
              const colorDiscount = colorVar.discount !== item.discount ? colorVar.discount : null;
              const priceOverride = colorDiscount !== null
                ? Math.round(item.price * (1 - colorDiscount / 100))
                : null;
              variants.push({
                product_id: prod.id,
                color: colorVar.color,
                color_hex: colorVar.hex,
                size,
                stock,
                price_override: priceOverride,
              });
            }
          }
        }
        if (variants.length > 0) await supabase.from('product_variants').insert(variants);
      } else if (prod && sizesArr.length > 0) {
        const variants = sizesArr.map(size => ({
          product_id: prod.id,
          size,
          stock: 1,
          price_override: null,
        }));
        await supabase.from('product_variants').insert(variants);
      }

      if (code) {
        await supabase.from('deleted_product_codes').delete().eq('code', code).then(() => {});
      }

      return true;
    } catch (e: any) {
      toast({ title: `Failed to save ${item.title || item.result?.title}`, description: e.message, variant: 'destructive' });
      return false;
    }
  };

  const saveAll = async () => {
    const ready = items.filter(i => i.done);
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
            <p className="text-sm text-muted-foreground">Upload 1–20 images · AI generates full listings · Edit everything · Save</p>
          </div>
        </div>
        <div className="flex gap-2">
          {items.length > 0 && (
            <>
              <Button variant="outline" onClick={analyzeAll} disabled={pendingCount === 0 || loadingCount > 0}>
                {loadingCount > 0
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analyzing {loadingCount}...</>
                  : <><Sparkles className="h-4 w-4 mr-2" />Analyze All ({pendingCount})</>}
              </Button>
              <Button onClick={saveAll} disabled={saving || doneCount === 0}>
                {saving
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving {savedCount}/{doneCount}...</>
                  : <><Save className="h-4 w-4 mr-2" />Save All ({doneCount})</>}
              </Button>
            </>
          )}
        </div>
      </div>

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

      {items.length > 0 && (
        <div className="space-y-4">
          {items.map((item, idx) => (
            <div key={item.id} className={`border rounded-xl overflow-hidden ${item.done ? 'border-green-200' : item.error ? 'border-red-200' : 'border-border'}`}>
              {/* Header row */}
              <div className="flex items-center gap-3 p-3 bg-muted/30">
                <img src={item.preview} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.title || item.result?.title || item.file.name}</p>
                  <p className="text-xs text-muted-foreground">Item {idx + 1} of {items.length}</p>
                  {item.error && <p className="text-xs text-red-600 mt-0.5">{item.error}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {item.done
                    ? <Badge variant="default" className="bg-green-600 text-white text-xs"><Check className="h-3 w-3 mr-1" />Analyzed</Badge>
                    : item.loading
                    ? <Badge variant="secondary" className="text-xs"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Analyzing...</Badge>
                    : item.error
                    ? <Button size="sm" variant="outline" onClick={() => analyzeItem(item)} className="text-xs h-7">Retry</Button>
                    : <Button size="sm" onClick={() => analyzeItem(item)} className="text-xs h-7"><Sparkles className="h-3 w-3 mr-1" />Analyze</Button>
                  }
                  {item.done && (
                    <button onClick={() => updateItem(item.id, { expanded: !item.expanded })} className="text-muted-foreground hover:text-foreground p-1">
                      {item.expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  )}
                  <button onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-destructive p-1"><X className="h-4 w-4" /></button>
                </div>
              </div>

              {item.done && item.expanded && (
                <div className="p-4 space-y-5 border-t">

                  {/* === SECTION 1: Basic Info === */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Product Info</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="md:col-span-2">
                        <Label className="text-xs">Title *</Label>
                        <Input value={item.title} onChange={e => updateItem(item.id, { title: e.target.value })}
                          className="h-8 text-sm mt-0.5" placeholder="Product title" />
                      </div>
                      <div>
                        <Label className="text-xs">Title (Urdu)</Label>
                        <Input value={item.titleUrdu} onChange={e => updateItem(item.id, { titleUrdu: e.target.value })}
                          className="h-8 text-sm mt-0.5 font-noto" placeholder="اردو نام" dir="rtl" />
                      </div>
                      <div>
                        <Label className="text-xs">Brand</Label>
                        <Input value={item.brand} onChange={e => updateItem(item.id, { brand: e.target.value })}
                          className="h-8 text-sm mt-0.5" placeholder="Brand name" />
                      </div>
                      <div>
                        <Label className="text-xs">Category</Label>
                        <Input value={item.category} onChange={e => updateItem(item.id, { category: e.target.value })}
                          className="h-8 text-sm mt-0.5" placeholder="e.g. Men's Shoes" />
                      </div>
                      <div>
                        <Label className="text-xs">Product Type</Label>
                        <Select value={item.productType} onValueChange={val => {
                          updateItem(item.id, { productType: val });
                          updateItemSizes(item.id, val, item.gender);
                        }}>
                          <SelectTrigger className="h-8 text-sm mt-0.5"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {PRODUCT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Gender</Label>
                        <Select value={item.gender} onValueChange={val => {
                          updateItem(item.id, { gender: val });
                          updateItemSizes(item.id, item.productType, val);
                        }}>
                          <SelectTrigger className="h-8 text-sm mt-0.5"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="men">Men</SelectItem>
                            <SelectItem value="women">Women</SelectItem>
                            <SelectItem value="kids">Kids</SelectItem>
                            <SelectItem value="unisex">Unisex</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Product Code */}
                      <div>
                        <Label className="text-xs flex items-center gap-1"><Hash className="h-3 w-3" />Product Code</Label>
                        <div className="flex gap-1 mt-0.5">
                          <Input value={item.productCode} onChange={e => updateItem(item.id, { productCode: e.target.value })}
                            className="h-8 text-sm font-mono" placeholder="Auto-generated" />
                          <Button size="sm" variant="outline" className="h-8 px-2 text-xs whitespace-nowrap"
                            onClick={async () => {
                              const code = await generateProductCode(item);
                              updateItem(item.id, { productCode: code });
                            }}>
                            <Sparkles className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Tags */}
                      <div>
                        <Label className="text-xs flex items-center gap-1"><Tag className="h-3 w-3" />Tags (comma separated)</Label>
                        <Input value={item.tags.join(', ')}
                          onChange={e => updateItem(item.id, { tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                          className="h-8 text-sm mt-0.5" placeholder="tag1, tag2, tag3" />
                      </div>
                    </div>
                  </div>

                  {/* === SECTION 2: Description === */}
                  <div>
                    <Label className="text-xs">Description</Label>
                    <Textarea value={item.description} onChange={e => updateItem(item.id, { description: e.target.value })}
                      className="text-sm mt-0.5 min-h-[80px]" placeholder="Product description..." />
                  </div>

                  {/* === SECTION 3: Policies === */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Return Policy</Label>
                      <Input value={item.returnPolicy} onChange={e => updateItem(item.id, { returnPolicy: e.target.value })}
                        className="h-8 text-sm mt-0.5" />
                    </div>
                    <div>
                      <Label className="text-xs">Claim Policy</Label>
                      <Input value={item.claimPolicy} onChange={e => updateItem(item.id, { claimPolicy: e.target.value })}
                        className="h-8 text-sm mt-0.5" />
                    </div>
                  </div>

                  {/* === SECTION 4: Pricing === */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Pricing</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <Label className="text-xs">Selling Price (Rs.)</Label>
                        <Input type="number" value={item.price}
                          onChange={e => updateItem(item.id, { price: Number(e.target.value) })}
                          className="h-8 text-sm mt-0.5" />
                      </div>
                      <div>
                        <Label className="text-xs">Global Discount (%)</Label>
                        <Input type="number" value={item.discount} min={0} max={90}
                          onChange={e => updateItem(item.id, { discount: Number(e.target.value) })}
                          className="h-8 text-sm mt-0.5" />
                      </div>
                      <div className="flex flex-col justify-end">
                        <p className="text-xs text-muted-foreground">Original Price</p>
                        <p className="text-sm font-semibold text-muted-foreground line-through">
                          Rs. {item.discount > 0 ? Math.round(item.price / (1 - item.discount / 100)).toLocaleString() : item.price.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex flex-col justify-end">
                        <p className="text-xs text-muted-foreground">You Save</p>
                        <p className="text-sm font-bold text-green-600">
                          Rs. {item.discount > 0
                            ? (Math.round(item.price / (1 - item.discount / 100)) - item.price).toLocaleString()
                            : '0'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* === SECTION 5: Sizes === */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Sizes</p>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {item.activeSizes.map(s => (
                          <span key={s} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2.5 py-1 rounded-full border border-primary/20 font-semibold">
                            {s}
                            <button type="button" onClick={() => removeSize(item.id, s)} className="hover:text-destructive ml-0.5">
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </span>
                        ))}
                        {item.activeSizes.length === 0 && (
                          <span className="text-xs text-muted-foreground italic">No sizes — add below</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Input value={item.customSizeInput}
                          onChange={e => updateItem(item.id, { customSizeInput: e.target.value })}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSize(item.id, item.customSizeInput); } }}
                          placeholder="Add size (e.g. 46, XL, One Size)..."
                          className="h-8 text-xs flex-1" />
                        <Button size="sm" variant="outline" className="h-8 text-xs"
                          onClick={() => addSize(item.id, item.customSizeInput)}>
                          <Plus className="h-3 w-3 mr-1" />Add
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 text-xs"
                          onClick={() => updateItemSizes(item.id, item.productType, item.gender)}>
                          Reset
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* === SECTION 6: Color Variants === */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Palette className="h-3.5 w-3.5" />Colors & Stock
                      </p>
                      <div className="flex gap-1.5 flex-wrap">
                        {COLOR_PALETTES.slice(0, 6).map(cp => (
                          <button key={cp.name} type="button"
                            onClick={() => addColor(item.id, cp.name, cp.hex)}
                            className="w-5 h-5 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform"
                            style={{ backgroundColor: cp.hex }}
                            title={cp.name} />
                        ))}
                        <Button size="sm" variant="outline" className="h-7 text-xs px-2"
                          onClick={() => addColor(item.id)}>
                          <Plus className="h-3 w-3 mr-1" />Add Color
                        </Button>
                      </div>
                    </div>

                    {item.colors.length === 0 ? (
                      <div className="text-center py-6 border-2 border-dashed rounded-xl text-xs text-muted-foreground">
                        No colors added — click color swatches above or Add Color
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {item.colors.map((colorVar, ci) => (
                          <div key={colorVar.id} className="border rounded-xl overflow-hidden"
                            style={{ borderLeftWidth: 3, borderLeftColor: colorVar.hex || '#000' }}>
                            {/* Color header */}
                            <div className="flex items-center gap-2 px-3 py-2 bg-muted/20 flex-wrap">
                              <input type="color" value={colorVar.hex}
                                onChange={e => updateColor(item.id, colorVar.id, { hex: e.target.value })}
                                className="w-8 h-8 rounded-lg cursor-pointer border p-0.5 bg-background shrink-0" />
                              <Input value={colorVar.color}
                                onChange={e => updateColor(item.id, colorVar.id, { color: e.target.value })}
                                placeholder="Color name (e.g. Black)" className="h-8 text-xs w-36 shrink-0" />
                              <div className="flex items-center gap-1 shrink-0">
                                <span className="text-xs text-muted-foreground whitespace-nowrap">Discount:</span>
                                <Input type="number" value={colorVar.discount} min={0} max={90}
                                  onChange={e => updateColor(item.id, colorVar.id, { discount: Number(e.target.value) })}
                                  className="h-8 text-xs w-16" />
                                <span className="text-xs text-muted-foreground">%</span>
                              </div>
                              {colorVar.discount !== item.discount && (
                                <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium whitespace-nowrap">
                                  Rs. {Math.round(item.price * (1 - colorVar.discount / 100)).toLocaleString()}
                                </span>
                              )}
                              <div className="ml-auto flex items-center gap-1 shrink-0">
                                <span className="text-xs font-bold text-primary bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5">
                                  {Object.values(colorVar.qtySizes).reduce((a, b) => a + b, 0)}
                                </span>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                  onClick={() => removeColor(item.id, colorVar.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                            {/* Size qty grid */}
                            {item.activeSizes.length > 0 ? (
                              <div className="px-3 py-2.5 flex flex-wrap gap-2">
                                {item.activeSizes.map((size, si) => {
                                  const qty = colorVar.qtySizes[size] ?? 1;
                                  const refKey = `${item.id}-${ci}-${size}`;
                                  return (
                                    <div key={size} className={`flex flex-col items-center gap-0.5 ${qty === 0 ? 'opacity-40' : ''}`}>
                                      <span className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">{size}</span>
                                      <input
                                        ref={el => { qtyRefs.current[refKey] = el; }}
                                        type="text" inputMode="numeric"
                                        value={qty === 0 ? '' : qty}
                                        placeholder="1"
                                        onChange={e => {
                                          const val = e.target.value.replace(/[^0-9]/g, '');
                                          updateColorQty(item.id, colorVar.id, size, parseInt(val) || 0);
                                        }}
                                        onFocus={e => e.target.select()}
                                        onKeyDown={e => handleQtyKeyDown(e, item.id, ci, si, item.activeSizes, item.colors)}
                                        className={`w-11 h-9 text-sm text-center rounded-lg font-semibold border-2 bg-background focus:outline-none focus:ring-0 transition-colors ${qty === 0 ? 'border-muted text-muted-foreground' : 'border-border focus:border-primary'}`}
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="px-3 py-2 text-xs text-muted-foreground italic">Add sizes above to enter stock</p>
                            )}
                          </div>
                        ))}

                        {/* Grand total */}
                        <div className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-xl border text-xs">
                          <span className="font-semibold text-muted-foreground">
                            {item.colors.length} color{item.colors.length !== 1 ? 's' : ''} · {item.activeSizes.length} size{item.activeSizes.length !== 1 ? 's' : ''}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Total Stock:</span>
                            <span className="font-bold text-primary bg-primary/10 border border-primary/20 rounded-full px-3 py-0.5">
                              {item.colors.reduce((sum, c) =>
                                sum + Object.values(c.qtySizes).reduce((a, b) => a + b, 0), 0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* === Save Button === */}
                  <div className="flex gap-2 pt-1">
                    <Button className="flex-1" onClick={() => saveItem(item).then(ok => ok && toast({ title: `✅ ${item.title || 'Product'} saved!` }))}>
                      <Save className="h-4 w-4 mr-2" />Save This Product
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {items.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <p>Start by uploading product images above</p>
        </div>
      )}
    </div>
  );
}
