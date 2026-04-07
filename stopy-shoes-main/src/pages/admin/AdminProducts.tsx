import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2, Search, Upload, Sparkles, Loader2, Video } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import ProductVariantTable from '@/components/admin/ProductVariantTable';

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

const shoesSizesMen = ['39','40','41','42','43','44','45'];
const shoesSizesWomen = ['36','37','38','39','40','41'];
const shoesSizesKids = ['28','29','30','31','32','33','34','35'];
const bagSizes = ['Small','Medium','Large','XL'];

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

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*, product_variants(*)').order('created_at', { ascending: false });
    setProducts((data || []) as any);
  };

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*').eq('is_active', true).order('level').order('sort_order');
    setCategories((data || []) as Category[]);
  };

  useEffect(() => { fetchProducts(); fetchCategories(); }, []);

  const getSizesForProduct = () => {
    if (form.product_type === 'bags') return bagSizes;
    if (form.gender === 'women') return shoesSizesWomen;
    if (form.gender === 'kids') return shoesSizesKids;
    return shoesSizesMen;
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
      flash_sale_ends: form.discount_type === 'flash_sale' && form.flash_sale_ends ? form.flash_sale_ends : null,
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
      await supabase.from('products').update(saveData).eq('id', productId);
    } else {
      const { data: inserted } = await supabase.from('products').insert(saveData).select('id').single();
      productId = inserted?.id;
    }

    if (productId) {
      await supabase.from('product_variants').delete().eq('product_id', productId);
      
      const variantInserts = variants.flatMap(v => 
        Object.entries(v.sizes).map(([size, qty]) => ({
          product_id: productId!,
          color: v.color, color_hex: v.color_hex,
          size, stock: qty, images: v.images,
        }))
      );

      if (variantInserts.length > 0) {
        await supabase.from('product_variants').insert(variantInserts);
      }
    }

    toast({ title: form.id ? 'Product updated!' : 'Product added!' });
    setDialogOpen(false);
    setForm(defaultForm);
    setVariants([]);
    setSaving(false);
    fetchProducts();
  };

  const handleEdit = async (product: any) => {
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
      flash_sale_ends: product.flash_sale_ends || '',
      category_id: product.category_id,
      sub_category_id: product.sub_category_id,
      sub_sub_category_id: product.sub_sub_category_id,
      is_active: product.is_active,
      is_new_arrival: product.is_new_arrival,
      return_policy: product.return_policy || '',
      claim_policy: product.claim_policy || '',
      images: (product.images as string[]) || [],
      video_url: product.video_url || '',
      sizes: (product.sizes as string[]) || [],
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

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    await supabase.from('product_variants').delete().eq('product_id', id);
    await supabase.from('products').delete().eq('id', id);
    toast({ title: 'Product deleted' });
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
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setForm(defaultForm); setVariants([]); } }}>
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

              {/* Variants */}
              <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                <Label className="text-base font-semibold">🎨 Colors & Sizes</Label>
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
                      <Button variant="outline" size="sm" type="button" onClick={() => {
                        // Auto-generate unique code from sub-category or category
                        const subCat = categories.find(c => c.id === form.sub_category_id);
                        const cat = categories.find(c => c.id === form.category_id);
                        const src = subCat || cat;
                        const prefix = src ? src.name.substring(0, 3).toUpperCase() : 'PRD';
                        // Find max existing number for this prefix
                        let maxNum = 0;
                        products.forEach(p => {
                          const code = (p.tags as string[])?.[0] || '';
                          if (code.startsWith(prefix)) {
                            const num = parseInt(code.replace(prefix, ''), 10);
                            if (!isNaN(num) && num > maxNum) maxNum = num;
                          }
                        });
                        const nextNum = String(maxNum + 1).padStart(3, '0');
                        setForm(p => ({ ...p, tags: [`${prefix}${nextNum}`, ...p.tags.slice(1)] }));
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
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(p.id)}>
                      <Trash2 className="h-4 w-4" />
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
    </div>
  );
};

export default AdminProducts;
