import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Upload, Loader2, Copy, Check, Link as LinkIcon } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const SIZE_PRESETS = {
  'Kids (16-25)': Array.from({ length: 10 }, (_, i) => String(i + 16)),
  'Men (39-45)': ['39','40','41','42','43','44','45'],
  'Women (36-41)': ['36','37','38','39','40','41'],
  'Bags': ['Small','Medium','Large','XL'],
};

export default function AdminAiBulkCreator() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setImageUrl('');
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return imageUrl || null;
    const path = `ai-bulk/${Date.now()}-${imageFile.name}`;
    const { error } = await supabase.storage.from('products').upload(path, imageFile);
    if (error) return null;
    const { data } = supabase.storage.from('products').getPublicUrl(path);
    return data.publicUrl;
  };

  const analyze = async () => {
    if (!imagePreview && !imageUrl && !linkUrl) {
      toast({ title: 'Please upload an image or paste a URL', variant: 'destructive' });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      let uploadedUrl = imageUrl;
      if (imageFile) {
        const url = await uploadImage();
        if (url) { uploadedUrl = url; setImageUrl(url); }
      }

      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          type: 'product-ai',
          imageUrl: uploadedUrl || null,
          messages: [{
            role: 'user',
            content: `You are a Pakistani e-commerce product expert for a shoe and bag store called "Stopy Shoes".
Analyze this product image/link and generate comprehensive product details.
Product URL or context: ${linkUrl || 'N/A'}
Image: ${uploadedUrl ? 'See attached image' : 'No image'}

Return a JSON object with exactly these fields:
{
  "title": "Product name in English",
  "titleUrdu": "Product name in Urdu",
  "description": "30+ line detailed description covering material, comfort, style, use cases, care instructions, sizing guide",
  "brand": "Brand name",
  "gender": "men|women|kids|unisex",
  "category": "Category name",
  "subCategory": "Sub-category",
  "tags": ["tag1", "tag2", "tag3"],
  "suggestedPrice": 2500,
  "suggestedOriginalPrice": 3000,
  "suggestedDiscountPercent": 15,
  "productType": "shoes|bags",
  "suggestedSizes": {
    "Kids (16-25)": false,
    "Men (39-45)": false,
    "Women (36-41)": false,
    "Bags": false
  },
  "suggestedColors": [
    {"name": "Black", "hex": "#000000"},
    {"name": "Brown", "hex": "#8B4513"}
  ],
  "returnPolicy": "7 days return policy",
  "claimPolicy": "30 days warranty",
  "highlights": ["Key feature 1", "Key feature 2", "Key feature 3"]
}

For suggestedSizes, set the appropriate size range to true based on the product type and gender.
Return ONLY valid JSON, no markdown.`
          }],
        },
      });

      if (error) throw error;

      let parsed = data;
      if (typeof data === 'string') {
        const jsonMatch = data.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      }
      setResult(parsed);
      toast({ title: '✨ AI analysis complete!' });
    } catch (e: any) {
      toast({ title: 'AI Error', description: e.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  const saveToProducts = async () => {
    if (!result) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('products').insert({
        title: result.title,
        description: result.description,
        brand: result.brand,
        gender: result.gender,
        price: result.suggestedPrice || 0,
        original_price: result.suggestedOriginalPrice || null,
        discount_percent: result.suggestedDiscountPercent || 0,
        images: imageUrl ? [imageUrl] : [],
        tags: result.tags || [],
        return_policy: result.returnPolicy,
        claim_policy: result.claimPolicy,
        is_active: true,
        sizes: result.productType === 'bags' ? SIZE_PRESETS['Bags'] :
               result.gender === 'kids' ? SIZE_PRESETS['Kids (16-25)'] :
               result.gender === 'women' ? SIZE_PRESETS['Women (36-41)'] :
               SIZE_PRESETS['Men (39-45)'],
      });
      if (error) throw error;
      toast({ title: '✅ Product saved to catalog!' });
    } catch (e: any) {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  const copyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" /> AI Bulk Product Creator
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Upload a product image or paste a URL — AI generates complete product details including name, description, category, tags, and suggested sizes.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Input Panel */}
        <div className="space-y-4">
          <div className="bg-card rounded-xl border p-4 space-y-4">
            <Label className="text-base font-semibold">📷 Product Image</Label>
            <div className="border-2 border-dashed rounded-xl p-6 text-center">
              {imagePreview ? (
                <div className="relative inline-block">
                  <img src={imagePreview} alt="Preview" className="max-h-40 rounded-lg object-cover mx-auto" />
                  <button onClick={() => { setImageFile(null); setImagePreview(''); }}
                    className="absolute -top-2 -right-2 bg-destructive text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">×</button>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Click to upload product image</p>
                  <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP</p>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </label>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm flex items-center gap-1"><LinkIcon className="h-3.5 w-3.5" />OR paste image/product URL</Label>
              <Input
                value={linkUrl}
                onChange={e => setLinkUrl(e.target.value)}
                placeholder="https://example.com/product or image URL..."
              />
            </div>

            <Button onClick={analyze} disabled={loading} className="w-full gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loading ? 'AI Analyzing...' : 'Generate Product Details with AI'}
            </Button>
          </div>

          {/* Size Presets Info */}
          <div className="bg-muted/30 rounded-xl p-4 space-y-2">
            <Label className="text-sm font-semibold">📐 Size Ranges</Label>
            <div className="space-y-1.5">
              {Object.entries(SIZE_PRESETS).map(([label, sizes]) => (
                <div key={label} className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-muted-foreground w-28">{label}:</span>
                  <div className="flex gap-1 flex-wrap">
                    {sizes.map(s => <Badge key={s} variant="outline" className="text-[10px] py-0 px-1.5">{s}</Badge>)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Result Panel */}
        <div className="space-y-4">
          {result ? (
            <div className="bg-card rounded-xl border p-4 space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">✨ AI Generated Details</Label>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={copyJson} className="gap-1">
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? 'Copied!' : 'Copy JSON'}
                  </Button>
                  <Button size="sm" onClick={saveToProducts} disabled={saving} className="gap-1">
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    {saving ? 'Saving...' : 'Save to Products'}
                  </Button>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Title</p>
                  <p className="font-semibold">{result.title}</p>
                  {result.titleUrdu && <p className="text-muted-foreground text-xs" dir="rtl">{result.titleUrdu}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-xs text-muted-foreground">Brand</p><p className="font-medium">{result.brand}</p></div>
                  <div><p className="text-xs text-muted-foreground">Gender</p><p className="font-medium capitalize">{result.gender}</p></div>
                  <div><p className="text-xs text-muted-foreground">Category</p><p className="font-medium">{result.category}</p></div>
                  <div><p className="text-xs text-muted-foreground">Product Type</p><p className="font-medium capitalize">{result.productType}</p></div>
                  <div><p className="text-xs text-muted-foreground">Selling Price</p><p className="font-bold text-primary">Rs. {result.suggestedPrice?.toLocaleString()}</p></div>
                  <div><p className="text-xs text-muted-foreground">Original Price</p><p className="font-medium line-through text-muted-foreground">Rs. {result.suggestedOriginalPrice?.toLocaleString()}</p></div>
                </div>

                {result.highlights?.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Key Highlights</p>
                    <ul className="space-y-0.5">
                      {result.highlights.map((h: string, i: number) => (
                        <li key={i} className="text-xs flex items-start gap-1"><span className="text-primary">•</span>{h}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.tags?.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Tags</p>
                    <div className="flex flex-wrap gap-1">
                      {result.tags.map((t: string) => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
                    </div>
                  </div>
                )}

                {result.suggestedColors?.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Suggested Colors</p>
                    <div className="flex gap-2 flex-wrap">
                      {result.suggestedColors.map((c: any) => (
                        <div key={c.name} className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full border" style={{ background: c.hex }} />
                          <span className="text-xs">{c.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-xs text-muted-foreground mb-1">Description Preview</p>
                  <p className="text-xs text-muted-foreground line-clamp-4 leading-relaxed">{result.description}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-muted/20 rounded-xl border-2 border-dashed p-12 text-center text-muted-foreground">
              <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">AI generated product details will appear here</p>
              <p className="text-xs mt-1">Upload an image and click Generate</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
