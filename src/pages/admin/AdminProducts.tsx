import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { utcToPKTInput, pktInputToUtcIso, logTimezoneSync } from '@/lib/pkt';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2, Search, Upload, Sparkles, Loader2, Video, ShieldAlert } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import ProductVariantTable from '@/components/admin/ProductVariantTable';
import { ensureAdminSession } from '@/lib/adminSession';

interface Category {
  id: string;
  name: string;
  level: number;
  parent_id: string | null;
}

interface ProductForm {
  id?: string;
  title: string;
  description: string;
  brand: string;
  gender: string;
  price: number;
  original_price: number | null;
  discount_percent: number;
  discount_type: 'none' | 'discount' | 'flash_sale';
  flash_sale_ends: string;
  category_id: string | null;
  sub_category_id: string | null;
  sub_sub_category_id: string | null;
  is_active: boolean;
  is_new_arrival: boolean;
  return_policy: string;
  claim_policy: string;
  images: string[];
  video_url: string;
  sizes: string[];
  tags: string[];
  product_type: 'shoes' | 'bags';
}

interface VariantRow {
  id?: string;
  color: string;
  color_hex: string;
  sizes: Record<string, number>;
  images: string[];
}

const defaultForm: ProductForm = {
  title: '', description: '', brand: '', gender: 'men',
  price: 0, original_price: null, discount_percent: 0,
  discount_type: 'none', flash_sale_ends: '',
  category_id: null, sub_category_id: null, sub_sub_category_id: null,
  is_active: true, is_new_arrival: false,
  return_policy: '7 days return policy', claim_policy: '30 days warranty',
  images: [], video_url: '', sizes: [], tags: [], product_type: 'shoes',
};

const COLOR_PALETTES: Record<string, { name: string; hex: string }[]> = {
  shoes_gents: [
    { name: 'Black', hex: '#1a1a1a' }, { name: 'Brown', hex: '#7B3F00' }, { name: 'White', hex: '#FFFFFF' },
    { name: 'Navy', hex: '#1B2A4A' }, { name: 'Grey', hex: '#808080' }, { name: 'Tan', hex: '#D2B48C' },
    { name: 'Burgundy', hex: '#800020' }, { name: 'Camel', hex: '#C19A6B' }, { name: 'Olive', hex: '#6B6B3A' },
  ],
  shoes_ladies: [
    { name: 'Black', hex: '#1a1a1a' }, { name: 'White', hex: '#FFFFFF' }, { name: 'Nude', hex: '#E3C4A8' },
    { name: 'Red', hex: '#CC0000' }, { name: 'Gold', hex: '#CFB53B' }, { name: 'Silver', hex: '#C0C0C0' },
    { name: 'Pink', hex: '#FFB6C1' }, { name: 'Beige', hex: '#F5F5DC' }, { name: 'Maroon', hex: '#800000' },
  ],
  shoes_kids: [
    { name: 'Blue', hex: '#1E6BD4' }, { name: 'Red', hex: '#CC0000' }, { name: 'White', hex: '#FFFFFF' },
    { name: 'Black', hex: '#1a1a1a' }, { name: 'Pink', hex: '#FFB6C1' }, { name: 'Orange', hex: '#FF6B00' },
    { name: 'Yellow', hex: '#FFD700' }, { name: 'Green', hex: '#228B22' },
  ],
  bags_ladies: [
    { name: 'Black', hex: '#1a1a1a' }, { name: 'Brown', hex: '#7B3F00' }, { name: 'Beige', hex: '#F5F5DC' },
    { name: 'Red', hex: '#CC0000' }, { name: 'Mustard', hex: '#FFDB58' }, { name: 'Olive', hex: '#6B6B3A' },
    { name: 'Blush', hex: '#FFB6C1' }, { name: 'Cream', hex: '#FFFDD0' },
  ],
  bags_gents: [
    { name: 'Black', hex: '#1a1a1a' }, { name: 'Brown', hex: '#7B3F00' }, { name: 'Navy', hex: '#1B2A4A' },
    { name: 'Grey', hex: '#808080' }, { name: 'Tan', hex: '#D2B48C' }, { name: 'Dark Green', hex: '#013220' },
  ],
  default: [
    { name: 'Black', hex: '#1a1a1a' }, { name: 'White', hex: '#FFFFFF' }, { name: 'Brown', hex: '#7B3F00' },
    { name: 'Grey', hex: '#808080' }, { name: 'Navy', hex: '#1B2A4A' }, { name: 'Beige', hex: '#F5F5DC' },
    { name: 'Red', hex: '#CC0000' }, { name: 'Green', hex: '#228B22' }, { name: 'Blue', hex: '#1E6BD4' },
  ],
};

const getColorSuggestions = (productType: string, gender: string) => {
  const type = (productType || '').toLowerCase();
  const g = (gender || '').toLowerCase();
  if (type.includes('bag')) return g.includes('gent') || g.includes('men') ? COLOR_PALETTES.bags_gents : COLOR_PALETTES.bags_ladies;
  if (type.includes('shoe') || type.includes('sandal') || type.includes('slipper') || type.includes('boot')) {
    if (g.includes('kid') || g.includes('child') || g.includes('boy') || g.includes('girl')) return COLOR_PALETTES.shoes_kids;
    if (g.includes('lad') || g.includes('women') || g.includes('female')) return COLOR_PALETTES.shoes_ladies;
    return COLOR_PALETTES.shoes_gents;
  }
  return COLOR_PALETTES.default;
};

const parseSizeInput = (input: string): string[] => {
  if (!input.trim()) return [];
  const result: string[] = [];
  const parts = input.split(',').map(p => p.trim()).filter(Boolean);
  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(Number);
      if (!isNaN(start) && !isNaN(end) && end >= start) {
        for (let i = start; i <= end; i++) result.push(String(i));
      } else {
        result.push(part);
      }
    } else {
      result.push(part);
    }
  }
  return [...new Set(result)];
};

const AdminProducts = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<ProductForm>(defaultForm);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sizeInput, setSizeInput] = useState('');
  const [deleteDialog, setDeleteDialog] = useState<{ id: string; title: string; force: boolean } | null>(null);

  const fetchProducts = async () => {
    const { data, error } = await supabase.from('products').select('*, product_variants(*)').order('created_at', { ascending: false });
    if (error) {
      toast({ title: 'Failed to load products', description: error.message, variant: 'destructive' });
      return;
    }
    setProducts((data || []) as any);
  };

  const fetchCategories = async () => {
    const { data, error } = await supabase.from('categories').select('*').eq('is_active', true).order('level').order('sort_order');
    if (error) {
      toast({ title: 'Failed to load categories', description: error.message, variant: 'destructive' });
      return;
    }
    setCategories((data || []) as Category[]);
  };

  useEffect(() => { fetchProducts(); fetchCategories(); logTimezoneSync(); }, []);

  const getSizesForProduct = (): string[] => {
    const manual = parseSizeInput(sizeInput);
    return manual.length > 0 ? manual : (form.sizes.length > 0 ? form.sizes : []);
  };

  const level1 = categories.filter(c => c.level === 1);
  const level2 = categories.filter(c => c.level === 2 && c.parent_id === form.category_id);
  const level3 = categories.filter(c => c.level === 3 && c.parent_id === form.sub_category_id);

  // Auto-calculate price from original price and discount
  const handleDiscountChange = (discountPercent: number) => {
    setForm(p => {
      const newForm = { ...p, discount_percent: discountPercent };
      if (p.original_price && discountPercent > 0) {
        newForm.price = Math.round(p.original_price - (p.original_price * discountPercent / 100));
      }
      return newForm;
    });
  };

  const handleOriginalPriceChange = (origPrice: number) => {
    setForm(p => {
      const newForm = { ...p, original_price: origPrice || null };
      if (origPrice && p.discount_percent > 0) {
        newForm.price = Math.round(origPrice - (origPrice * p.discount_percent / 100));
      }
      return newForm;
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setUploading(true);
    const urls: string[] = [...form.images];
    for (const file of Array.from(files)) {
      const path = `${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from('products').upload(path, file);
      if (!error) {
        const { data: urlData } = supabase.storage.from('products').getPublicUrl(path);
        urls.push(urlData.publicUrl);
      }
    }
    setForm(p => ({ ...p, images: urls }));
    setUploading(false);
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const path = `videos/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('products').upload(path, file);
    if (!error) {
      const { data: urlData } = supabase.storage.from('products').getPublicUrl(path);
      setForm(p => ({ ...p, video_url: urlData.publicUrl }));
      toast({ title: 'Video uploaded!' });
    }
    setUploading(false);
  };

  const handleAiAnalyze = async () => {
    if (form.images.length === 0 && !form.title) {
      toast({ title: 'Add image or title first', variant: 'destructive' });
      return;
    }
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          type: 'product-ai',
          imageUrl: form.images[0] || null,
          messages: [{ role: 'user', content: `Product: ${form.title || 'Unknown'}. Brand: ${form.brand || 'Unknown'}. Gender: ${form.gender}. Analyze and suggest details. Write a very detailed description of at least 30 lines covering material, comfort, style, use cases, care instructions, sizing guide, etc.` }],
        },
      });
      if (error) throw error;

      if (data && typeof data === 'object') {
        setForm(p => ({
          ...p,
          title: data.title || p.title,
          description: data.description || p.description,
          brand: data.brand || p.brand,
          gender: data.gender || p.gender,
          price: data.suggestedPrice || p.price,
          original_price: data.suggestedOriginalPrice || p.original_price,
          return_policy: data.returnPolicy || p.return_policy,
          claim_policy: data.claimPolicy || p.claim_policy,
          tags: data.tags || p.tags,
          product_type: data.productType || p.product_type,
          sizes: data.suggestedSizes || p.sizes,
        }));

        if (data.category) {
          const matched = categories.find(c => c.level === 1 && c.name.toLowerCase().includes(data.category.toLowerCase()));
          if (matched) {
            setForm(p => ({ ...p, category_id: matched.id }));
            if (data.subCategory) {
              const sub = categories.find(c => c.level === 2 && c.parent_id === matched.id && c.name.toLowerCase().includes(data.subCategory.toLowerCase()));
              if (sub) setForm(p => ({ ...p, sub_category_id: sub.id }));
            }
          }
        }

        if (data.suggestedColors?.length > 0) {
          const sizes = data.suggestedSizes || getSizesForProduct();
          const newVariants: VariantRow[] = data.suggestedColors.map((c: any) => ({
            color: c.name, color_hex: c.hex,
            sizes: Object.fromEntries(sizes.map((s: string) => [s, 0])),
            images: [],
          }));
          setVariants(newVariants);
        }

        toast({ title: '✨ AI suggested details!' });
      }
    } catch (e: any) {
      toast({ title: 'AI Error', description: e.message, variant: 'destructive' });
    }
    setAiLoading(false);
  };

  const handleSave = async () => {
    if (!form.title) {
      toast({ title: 'Title is required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await ensureAdminSession();

      const totalStock = variants.reduce((sum, v) => sum + Object.values(v.sizes).reduce((a, b) => a + b, 0), 0);
      const colorsJson = variants.map(v => ({ name: v.color, hex: v.color_hex }));
      const sizesJson = getSizesForProduct();

      const saveData: any = {
        title: form.title,
        description: form.description || null,
        price: form.price || 0,
        original_price: form.original_price || null,
        stock: totalStock,
        gender: form.gender || 'unisex',
        is_active: form.is_active,
        is_flash_sale: form.discount_type === 'flash_sale',
        is_new_arrival: form.is_new_arrival,
        flash_sale_ends: form.discount_type === 'flash_sale' && form.flash_sale_ends ? pktInputToUtcIso(form.flash_sale_ends) : null,
        images: form.images,
        video_url: form.video_url || null,
        brand: form.brand || null,
        sizes: sizesJson,
        colors: colorsJson,
        discount_percent: form.discount_type !== 'none' ? form.discount_percent : 0,
        return_policy: form.return_policy || null,
        claim_policy: form.claim_policy || null,
        category_id: form.category_id || null,
        sub_category_id: form.sub_category_id || null,
        sub_sub_category_id: form.sub_sub_category_id || null,
        tags: form.tags,
      };

      let productId = form.id;
      if (productId) {
        const { error } = await supabase.from('products').update(saveData).eq('id', productId).select('id').single();
        if (error) throw error;
      } else {
        const { data: inserted, error } = await supabase.from('products').insert(saveData).select('id').single();
        if (error) throw error;
        productId = inserted?.id;
      }

      if (!productId) throw new Error('Product save did not return an id');

      const { error: deleteVariantsError } = await supabase.from('product_variants').delete().eq('product_id', productId);
      if (deleteVariantsError) throw deleteVariantsError;

      const variantInserts = variants.flatMap(v => 
        Object.entries(v.sizes).map(([size, qty]) => ({
          product_id: productId!,
          color: v.color, color_hex: v.color_hex,
          size, stock: qty, images: v.images,
        }))
      );

      if (variantInserts.length > 0) {
        const { error: variantInsertError } = await supabase.from('product_variants').insert(variantInserts);
        if (variantInsertError) throw variantInsertError;
      }

      toast({ title: form.id ? 'Product updated!' : 'Product added!' });
      setDialogOpen(false);
      setForm(defaultForm);
      setVariants([]);
      fetchProducts();
    } catch (e: any) {
      toast({ title: 'Product save failed', description: e.message || 'Unknown Supabase error', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (product: any) => {
    const existingSizes = (product.sizes as string[]) || [];
    setSizeInput(existingSizes.join(','));
    setForm({
      id: product.id,
      title: product.title || '',
      description: product.description || '',
      brand: product.brand || '',
      gender: product.gender || 'men',
      price: product.price || 0,
      original_price: product.original_price,
      discount_percent: product.discount_percent || 0,
      discount_type: product.is_flash_sale ? 'flash_sale' : (product.discount_percent > 0 ? 'discount' : 'none'),
      flash_sale_ends: utcToPKTInput(product.flash_sale_ends || ''),
      category_id: product.category_id,
      sub_category_id: product.sub_category_id,
      sub_sub_category_id: product.sub_sub_category_id,
      is_active: product.is_active,
      is_new_arrival: product.is_new_arrival,
      return_policy: product.return_policy || '',
      claim_policy: product.claim_policy || '',
      images: (product.images as string[]) || [],
      video_url: product.video_url || '',
      sizes: existingSizes,
      tags: product.tags || [],
      product_type: product.gender === 'bags' ? 'bags' : 'shoes',
    });

    const pvs = product.product_variants || [];
    const colorMap: Record<string, VariantRow> = {};
    pvs.forEach((v: any) => {
      const key = v.color || 'Default';
      if (!colorMap[key]) {
        colorMap[key] = { id: v.id, color: v.color || '', color_hex: v.color_hex || '#000000', sizes: {}, images: (v.images as string[]) || [] };
      }
      if (v.size) colorMap[key].sizes[v.size] = v.stock || 0;
    });
    setVariants(Object.values(colorMap));
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    const product = products.find(p => p.id === id);
    setDeleteDialog({ id, title: product?.title || 'this product', force: false });
  };

  const handleForceDelete = (id: string) => {
    const product = products.find(p => p.id === id);
    setDeleteDialog({ id, title: product?.title || 'this product', force: true });
  };

  const confirmDelete = async () => {
    if (!deleteDialog) return;
    const { id, force } = deleteDialog;
    const product = products.find(p => p.id === id);
    if (product) {
      const code = (product.tags as string[])?.[0];
      if (code) {
        await supabase.from('deleted_product_codes').upsert({ code, product_title: product.title }, { onConflict: 'code' });
      }
    }
    if (force) {
      await supabase.from('order_items').update({ product_id: null, variant_id: null }).eq('product_id', id);
      await supabase.from('reviews').delete().eq('product_id', id);
      await supabase.from('stock_alerts').delete().eq('product_id', id);
      await supabase.from('ai_discount_suggestions').delete().eq('product_id', id);
    }
    await supabase.from('product_variants').delete().eq('product_id', id);
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      toast({ title: force ? 'Force delete failed' : 'Cannot delete', description: force ? error.message : 'Product has linked orders. Use Force Delete.', variant: 'destructive' });
    } else {
      toast({ title: force ? 'Product force deleted!' : 'Product deleted' });
    }
    setDeleteDialog(null);
    fetchProducts();
  };

  const filtered = products.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    (p.brand || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setForm(defaultForm); setVariants([]); setSizeInput(''); } }}>
          <DialogTrigger asChild>
            <Button onClick={() => { setForm(defaultForm); setVariants([]); }}>
              <Plus className="h-4 w-4 mr-2" /> Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{form.id ? 'Edit Product' : 'Add New Product'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-5 pt-4">
              {/* Images & Video */}
              <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                <Label className="text-base font-semibold">📷 Images & Video</Label>
                <div className="flex gap-2 flex-wrap">
                  {form.images.map((img, i) => (
                    <div key={i} className="relative w-24 h-24">
                      <img src={img} alt="" className="w-full h-full object-cover rounded-lg border" />
                      <button onClick={() => setForm(p => ({ ...p, images: p.images.filter((_, j) => j !== i) }))}
                        className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">×</button>
                    </div>
                  ))}
                  <label className="w-24 h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-accent transition-colors">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground mt-1">Images</span>
                    <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                  <label className="w-24 h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-accent transition-colors">
                    <Video className="h-5 w-5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground mt-1">Video</span>
                    <input type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
                  </label>
                </div>
                {form.video_url && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Video className="h-3 w-3" /> Video uploaded
                    <button onClick={() => setForm(p => ({ ...p, video_url: '' }))} className="text-destructive">Remove</button>
                  </div>
                )}
                {uploading && <p className="text-xs text-muted-foreground">Uploading...</p>}
                <Button variant="outline" onClick={handleAiAnalyze} disabled={aiLoading} className="gap-2">
                  {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {aiLoading ? 'AI Analyzing...' : '🤖 AI Auto-Fill Details'}
                </Button>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-full">
                  <Label>Title</Label>
                  <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="AI will auto-generate title" />
                </div>
                <div className="col-span-full">
                  <Label>Description - AI writes 30+ lines</Label>
                  <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={6} placeholder="AI will auto-generate description - you can edit too" />
                </div>
                <div>
                  <Label>Brand</Label>
                  <Input value={form.brand} onChange={e => setForm(p => ({ ...p, brand: e.target.value }))} />
                </div>
                <div>
                  <Label>Product Type</Label>
                  <Select value={form.product_type} onValueChange={v => setForm(p => ({ ...p, product_type: v as any }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="shoes">👟 Shoes</SelectItem>
                      <SelectItem value="bags">👜 Bags</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Gender</Label>
                  <Select value={form.gender} onValueChange={v => setForm(p => ({ ...p, gender: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="men">Men</SelectItem>
                      <SelectItem value="women">Women</SelectItem>
                      <SelectItem value="kids">Kids</SelectItem>
                      <SelectItem value="unisex">Unisex</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Category */}
              <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                <Label className="text-base font-semibold">📂 Category</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Main Category</Label>
                    <Select value={form.category_id || ''} onValueChange={v => setForm(p => ({ ...p, category_id: v, sub_category_id: null, sub_sub_category_id: null }))}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{level1.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Sub Category</Label>
                    <Select value={form.sub_category_id || ''} onValueChange={v => setForm(p => ({ ...p, sub_category_id: v, sub_sub_category_id: null }))}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{level2.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Sub-Sub Category</Label>
                    <Select value={form.sub_sub_category_id || ''} onValueChange={v => setForm(p => ({ ...p, sub_sub_category_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{level3.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Pricing with auto-calculate */}
              <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                <Label className="text-base font-semibold">💰 Price & Discount (Auto Calculate)</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs">Original Price</Label>
                    <Input type="number" value={form.original_price || ''} onChange={e => handleOriginalPriceChange(Number(e.target.value))} placeholder="Cost price" />
                  </div>
                  <div>
                    <Label className="text-xs">Discount Type</Label>
                    <Select value={form.discount_type} onValueChange={v => setForm(p => ({ ...p, discount_type: v as any }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Discount</SelectItem>
                        <SelectItem value="discount">Discount %</SelectItem>
                        <SelectItem value="flash_sale">⚡ Flash Sale (Timer)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {form.discount_type !== 'none' && (
                    <div>
                      <Label className="text-xs">Discount %</Label>
                      <Input type="number" value={form.discount_percent} onChange={e => handleDiscountChange(Number(e.target.value))} />
                    </div>
                  )}
                  <div>
                    <Label className="text-xs">Selling Price (Auto)</Label>
                    <Input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: Number(e.target.value) }))} className="font-bold" />
                    {form.original_price && form.discount_percent > 0 && (
                      <p className="text-[10px] text-green-600 mt-1">
                        {form.discount_percent}% off → Rs. {form.price.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
                {form.discount_type === 'flash_sale' && (
                  <div>
                    <Label className="text-xs">Flash Sale End Date (reverts to original price after)</Label>
                    <Input type="datetime-local" value={form.flash_sale_ends} onChange={e => setForm(p => ({ ...p, flash_sale_ends: e.target.value }))} />
                  </div>
                )}
              </div>

              {/* Manual Sizes + Variants */}
              <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                <Label className="text-base font-semibold">📐 Manual Sizes & Colors</Label>
                <div>
                  <Label className="text-xs">Enter Sizes Manually</Label>
                  <Input
                    value={sizeInput}
                    onChange={e => setSizeInput(e.target.value)}
                    placeholder="e.g. 39-45 or 36,37,38,39 or Small,Medium,Large"
                    className="mt-1 font-mono"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Ranges: <code className="bg-muted px-1 rounded">39-45</code> · Singles: <code className="bg-muted px-1 rounded">36,38,40</code> · Text: <code className="bg-muted px-1 rounded">S,M,L,XL</code> · Kids: <code className="bg-muted px-1 rounded">16-25</code>
                  </p>
                  {getSizesForProduct().length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {getSizesForProduct().map(s => (
                        <span key={s} className="text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full">{s}</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* AI Color Suggestions — appear when sizes are entered */}
                {getSizesForProduct().length > 0 && (
                  <div className="border border-dashed border-primary/30 rounded-lg p-3 bg-primary/5">
                    <p className="text-xs font-semibold text-primary mb-2 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> Suggested Colors — click to add
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {getColorSuggestions(form.product_type, form.gender).map(c => {
                        const alreadyAdded = variants.some(v => v.color.toLowerCase() === c.name.toLowerCase());
                        return (
                          <button
                            key={c.name}
                            type="button"
                            disabled={alreadyAdded}
                            onClick={() => {
                              if (alreadyAdded) return;
                              const sizes = getSizesForProduct();
                              setVariants(prev => [...prev, {
                                color: c.name,
                                color_hex: c.hex,
                                sizes: Object.fromEntries(sizes.map(s => [s, 0])),
                                images: [],
                              }]);
                            }}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                              alreadyAdded
                                ? 'opacity-40 cursor-not-allowed border-muted bg-muted text-muted-foreground'
                                : 'hover:scale-105 active:scale-95 cursor-pointer border-gray-300 bg-white text-gray-800 shadow-sm hover:shadow-md'
                            }`}
                          >
                            <span
                              className="h-3.5 w-3.5 rounded-full border border-gray-300 flex-shrink-0"
                              style={{ backgroundColor: c.hex }}
                            />
                            {c.name}
                            {alreadyAdded && <span className="ml-0.5 text-[10px]">✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <ProductVariantTable
                  variants={variants}
                  setVariants={setVariants}
                  sizes={getSizesForProduct()}
                  productType={form.product_type}
                  gender={form.gender}
                />
              </div>

              {/* Product Code (Auto-Generated) */}
              <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                <Label className="text-base font-semibold">Product Code & AI Claim Info</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Product Code (auto-generated, editable)</Label>
                    <div className="flex gap-2">
                      <Input value={form.tags?.[0] || ''} onChange={e => setForm(p => ({ ...p, tags: [e.target.value, ...p.tags.slice(1)] }))} placeholder="Auto: PMP001" />
                      <Button variant="outline" size="sm" type="button" onClick={async () => {
                        // Auto-generate unique code from sub-category or category
                        const subCat = categories.find(c => c.id === form.sub_category_id);
                        const cat = categories.find(c => c.id === form.category_id);
                        const src = subCat || cat;
                        const prefix = src ? src.name.substring(0, 3).toUpperCase() : 'PRD';

                        // Fetch deleted codes for this prefix to avoid reuse
                        const { data: deletedData } = await supabase
                          .from('deleted_product_codes')
                          .select('code')
                          .like('code', `${prefix}%`);
                        const deletedCodes = new Set((deletedData || []).map((d: any) => d.code));

                        // Find max existing number for this prefix (from active products + deleted)
                        let maxNum = 0;
                        products.forEach(p => {
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

                        // Find next available code that hasn't been used or deleted
                        let candidate = maxNum + 1;
                        while (deletedCodes.has(`${prefix}${String(candidate).padStart(3, '0')}`)) {
                          candidate++;
                        }
                        const nextCode = `${prefix}${String(candidate).padStart(3, '0')}`;
                        setForm(p => ({ ...p, tags: [nextCode, ...p.tags.slice(1)] }));
                      }}>Auto</Button>
                    </div>
                  </div>
                  <div className="col-span-full">
                    <Label className="text-xs">AI Claim Instructions (tell AI what qualifies for claim)</Label>
                    <Textarea value={form.claim_policy} onChange={e => setForm(p => ({ ...p, claim_policy: e.target.value }))}
                      rows={3} placeholder="e.g. Sole detach within 30 days = claim. Color fade is not claimable." />
                  </div>
                </div>
              </div>

              {/* Policies */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Return Policy</Label>
                  <Select value={form.return_policy} onValueChange={v => setForm(p => ({ ...p, return_policy: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7 days return policy">7 Days Return</SelectItem>
                      <SelectItem value="15 days return policy">15 Days Return</SelectItem>
                      <SelectItem value="30 days return policy">30 Days Return</SelectItem>
                      <SelectItem value="No return">No Return</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Claim Policy</Label>
                  <Select value={form.claim_policy} onValueChange={v => setForm(p => ({ ...p, claim_policy: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30 days warranty">30 Days Warranty</SelectItem>
                      <SelectItem value="60 days warranty">60 Days Warranty</SelectItem>
                      <SelectItem value="90 days warranty">90 Days Warranty</SelectItem>
                      <SelectItem value="No claim">No Claim</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-full">
                  <Label>Tags (comma separated)</Label>
                  <Input value={form.tags.join(', ')} onChange={e => setForm(p => ({ ...p, tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))} placeholder="casual, leather, comfort" />
                </div>
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2">
                  <Switch checked={form.is_active} onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} />
                  <span className="text-sm">Active</span>
                </label>
                <label className="flex items-center gap-2">
                  <Switch checked={form.is_new_arrival} onCheckedChange={v => setForm(p => ({ ...p, is_new_arrival: v }))} />
                  <span className="text-sm">New Arrival</span>
                </label>
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {saving ? 'Saving...' : 'Save Product'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Products Table */}
      <div className="bg-card rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
             <tr className="border-b bg-muted/50">
              <th className="text-left p-3">Image</th>
              <th className="text-left p-3">Title</th>
              <th className="text-left p-3">Price</th>
              <th className="text-left p-3">Stock</th>
              <th className="text-left p-3">Sold</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} className="border-b hover:bg-accent/50">
                <td className="p-3">
                  <img src={(p.images as string[])?.[0] || '/placeholder.svg'} alt="" className="w-12 h-12 rounded object-cover" />
                </td>
                <td className="p-3 font-medium max-w-[200px] truncate">{p.title}</td>
                <td className="p-3">
                  <span>Rs. {p.price?.toLocaleString()}</span>
                  {p.original_price && <span className="text-xs text-muted-foreground line-through ml-1">Rs. {Number(p.original_price).toLocaleString()}</span>}
                </td>
                <td className="p-3">
                  <span className={p.stock < 5 ? 'text-destructive font-bold' : ''}>{p.stock}</span>
                </td>
                <td className="p-3">{p.sold}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-full text-xs ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {p.is_active ? 'Active' : 'Inactive'}
                  </span>
                  {p.is_flash_sale && <span className="ml-1 text-xs">⚡</span>}
                  {p.video_url && <span className="ml-1 text-xs">🎥</span>}
                </td>
                <td className="p-3">
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => handleEdit(p)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-destructive" title="Delete" onClick={() => handleDelete(p.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-orange-600 hover:text-orange-800 hover:bg-orange-100" title="Force Delete (removes linked orders)" onClick={() => handleForceDelete(p.id)}>
                      <ShieldAlert className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center p-8 text-muted-foreground">No products found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {deleteDialog?.force ? <ShieldAlert className="h-5 w-5 text-orange-600" /> : <Trash2 className="h-5 w-5 text-destructive" />}
              {deleteDialog?.force ? 'Force Delete Product?' : 'Delete Product?'}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {deleteDialog?.force
              ? `This will permanently remove "${deleteDialog?.title}" and nullify all linked order references. This cannot be undone.`
              : `Are you sure you want to delete "${deleteDialog?.title}"? This cannot be undone.`}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>Cancel</Button>
            <Button variant={deleteDialog?.force ? 'outline' : 'destructive'} className={deleteDialog?.force ? 'border-orange-400 text-orange-600 hover:bg-orange-50' : ''} onClick={confirmDelete}>
              {deleteDialog?.force ? 'Force Delete' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminProducts;
