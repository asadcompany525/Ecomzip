import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkles, Loader2, Image, Plus, Palette, Upload, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useStoreSettings } from '@/hooks/useStoreSettings';

// Pure gradient background — NO text baked in
// Text will be shown by HeroBanner component's bottom-left card overlay
const generateGradientBackground = (bgColor: string): string => {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 450;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '/placeholder.svg';

  const darken = (hex: string, amt = 50) => {
    const n = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, (n >> 16) - amt);
    const g = Math.max(0, ((n >> 8) & 0xff) - amt);
    const b = Math.max(0, (n & 0xff) - amt);
    return `rgb(${r},${g},${b})`;
  };

  // Gradient from color to darker shade
  const grad = ctx.createLinearGradient(0, 0, 1200, 450);
  grad.addColorStop(0, bgColor);
  grad.addColorStop(0.6, darken(bgColor, 30));
  grad.addColorStop(1, darken(bgColor, 70));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1200, 450);

  // Subtle decorative circles — no text
  ctx.beginPath(); ctx.arc(1100, 60, 220, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fill();
  ctx.beginPath(); ctx.arc(900, 400, 160, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fill();
  ctx.beginPath(); ctx.arc(150, 350, 120, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fill();
  ctx.beginPath(); ctx.arc(60, 80, 80, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.03)'; ctx.fill();
  ctx.beginPath(); ctx.arc(600, 225, 350, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.025)'; ctx.fill();

  return canvas.toDataURL('image/png');
};

const AdminAiBannerCreator = () => {
  const { brandName } = useStoreSettings();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [imgLoading, setImgLoading] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerSubtitle, setBannerSubtitle] = useState('');
  const [bannerLink, setBannerLink] = useState('');
  const [bannerBg, setBannerBg] = useState('#1a1a2e');
  const [bannerImageUrl, setBannerImageUrl] = useState('');
  const [useCustomImage, setUseCustomImage] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      supabase.from('products').select('id, title, discount_percent, is_flash_sale, category_id, tags').eq('is_active', true).limit(100),
      supabase.from('categories').select('id, name, level').eq('is_active', true),
    ]).then(([{ data: prods }, { data: cats }]) => {
      setProducts(prods || []);
      setCategories(cats || []);
    });
  }, []);

  const generateBanner = async () => {
    if (!prompt.trim()) { toast({ title: 'Enter banner description', variant: 'destructive' }); return; }
    setLoading(true);
    try {
      const discountProducts = products.filter(p => p.discount_percent > 0 || p.is_flash_sale);
      const context = `Discount products: ${JSON.stringify(discountProducts.slice(0, 20).map(p => ({ title: p.title, discount: p.discount_percent, flash: p.is_flash_sale, code: (p.tags as string[])?.[0] })))}
Categories: ${JSON.stringify(categories.map(c => c.name))}`;

      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          type: 'admin-helper',
          messages: [
            { role: 'system', content: `You are creating a promotional banner for ${brandName || 'our'} store. Based on the user's description, generate banner text and auto-fill the link.
${context}

Return JSON in <ACTION_JSON> tags:
{ "title": "Short catchy title (max 40 chars)", "subtitle": "Brief subtitle (max 60 chars)", "link": "/products?filter=flash-sale", "bg_color": "#hex" }

Choose appropriate link: /flash-sale, /discount-items, /products?category=X, /new-arrivals etc.
Choose a vibrant bg_color that matches the banner mood.` },
            { role: 'user', content: prompt },
          ],
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(typeof data.error === 'string' ? data.error : 'AI service error');
      const reply = typeof data === 'string' ? data : data?.reply || data?.content || '';
      const actionMatch = reply.match(/<ACTION_JSON>([\s\S]*?)<\/ACTION_JSON>/);
      if (actionMatch) {
        const action = JSON.parse(actionMatch[1]);
        const title = action.title || '';
        const subtitle = action.subtitle || '';
        const bg = action.bg_color || '#1a1a2e';
        setBannerTitle(title);
        setBannerSubtitle(subtitle);
        setBannerLink(action.link || '');
        setBannerBg(bg);
        if (!useCustomImage) {
          setBannerImageUrl(generateGradientBackground(bg));
        }
        toast({ title: '✅ Banner generated! Upload a shoes photo or use gradient background.' });
      } else {
        toast({ title: 'AI response received — fill in details manually' });
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  const handleImageUpload = async (file: File) => {
    if (!file) return;
    setUploadingImg(true);
    try {
      const path = `banners/custom-${Date.now()}.${file.name.split('.').pop()}`;
      const { error: upErr } = await supabase.storage.from('products').upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('products').getPublicUrl(path);
      setBannerImageUrl(urlData.publicUrl);
      setUseCustomImage(true);
      toast({ title: '✅ Image uploaded!' });
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e.message, variant: 'destructive' });
    }
    setUploadingImg(false);
  };

  const clearCustomImage = () => {
    setUseCustomImage(false);
    setBannerImageUrl(generateGradientBackground(bannerBg));
  };

  const regenerateGradient = () => {
    if (useCustomImage) return;
    setImgLoading(true);
    setTimeout(() => {
      setBannerImageUrl(generateGradientBackground(bannerBg));
      setImgLoading(false);
    }, 50);
  };

  const saveBanner = async () => {
    if (!bannerTitle) { toast({ title: 'Title required', variant: 'destructive' }); return; }
    let finalImageUrl = bannerImageUrl;

    // Generate gradient background if no image set
    if (!finalImageUrl || finalImageUrl === '/placeholder.svg') {
      finalImageUrl = generateGradientBackground(bannerBg);
    }

    // Upload data-URL gradient to storage
    if (finalImageUrl.startsWith('data:')) {
      try {
        const blob = await fetch(finalImageUrl).then(r => r.blob());
        const path = `banners/banner-${Date.now()}.png`;
        const { error: upErr } = await supabase.storage.from('products').upload(path, blob, { contentType: 'image/png' });
        if (!upErr) {
          const { data: urlData } = supabase.storage.from('products').getPublicUrl(path);
          finalImageUrl = urlData.publicUrl;
        }
      } catch {}
    }

    await supabase.from('banners').insert({
      title: bannerTitle,
      subtitle: bannerSubtitle,
      link: bannerLink,
      bg_color: bannerBg,
      image_url: finalImageUrl,
      is_active: true,
      sort_order: 0,
    });
    toast({ title: '✅ Banner created!' });
    setBannerTitle(''); setBannerSubtitle(''); setBannerLink('');
    setPrompt(''); setBannerImageUrl(''); setUseCustomImage(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-pink-100 rounded-xl"><Image className="h-5 w-5 text-pink-600" /></div>
        <div>
          <h2 className="text-xl font-bold">AI Banner Creator</h2>
          <p className="text-sm text-muted-foreground">Describe your banner — AI generates title, subtitle &amp; link. Upload a shoe photo as background image.</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['Flash sale banner', 'New arrivals promo', 'Discount items', 'Free delivery offer', 'Seasonal sale'].map(ex => (
          <Button key={ex} variant="outline" size="sm" className="text-xs" onClick={() => setPrompt(ex)}>{ex}</Button>
        ))}
      </div>

      <Textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Describe the banner you want..." rows={2} />
      <Button onClick={generateBanner} disabled={loading} className="gap-2">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {loading ? 'Generating...' : 'Generate Banner Text + Link'}
      </Button>

      {bannerTitle && (
        <div className="bg-card border rounded-xl p-4 space-y-4">

          {/* Live Preview — exactly like HeroBanner renders */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Live Preview (as it appears on homepage)</p>
            <div className="relative rounded-xl overflow-hidden" style={{ minHeight: '180px', backgroundColor: bannerBg }}>
              {bannerImageUrl && (
                <img src={bannerImageUrl} alt="Banner background" className="absolute inset-0 w-full h-full object-cover" />
              )}
              {/* Gradient overlay — same as HeroBanner */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none" />
              {/* Spacer */}
              <div style={{ paddingBottom: '36%' }} />
              {/* Text card — bottom-left (same style as HeroBanner) */}
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <div className="inline-block max-w-[260px] bg-black/55 backdrop-blur-sm rounded-xl px-3 py-2.5 border border-white/10">
                  <p className="text-sm md:text-base font-black text-white leading-tight">{bannerTitle}</p>
                  {bannerSubtitle && <p className="text-[11px] text-white/80 mt-0.5">{bannerSubtitle}</p>}
                  <div className="mt-2">
                    <span className="text-[11px] bg-orange-500 text-white font-bold px-2.5 py-1 rounded-lg">Shop Now →</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Background Image section */}
          <div>
            <Label className="mb-1.5 block">Background Image</Label>
            <div className="flex gap-2 flex-wrap">
              {/* Upload photo button */}
              <Button
                variant="outline" size="sm" className="gap-1.5"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImg}
              >
                {uploadingImg ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                {uploadingImg ? 'Uploading...' : 'Upload Shoe Photo'}
              </Button>
              <input
                ref={fileInputRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }}
              />
              {useCustomImage ? (
                <Button variant="outline" size="sm" className="gap-1.5 text-red-600" onClick={clearCustomImage}>
                  <X className="h-3.5 w-3.5" /> Remove Photo
                </Button>
              ) : (
                <Button variant="outline" size="sm" className="gap-1.5" onClick={regenerateGradient} disabled={imgLoading}>
                  <Palette className="h-3.5 w-3.5" /> {imgLoading ? 'Updating...' : 'Refresh Gradient'}
                </Button>
              )}
            </div>
            {useCustomImage && (
              <p className="text-xs text-green-600 mt-1">✅ Custom photo set as background</p>
            )}
            {!useCustomImage && (
              <p className="text-xs text-muted-foreground mt-1">Using gradient background. Upload a shoes photo for a real product banner.</p>
            )}
          </div>

          {/* Editable fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Title</Label>
              <Input value={bannerTitle} onChange={e => setBannerTitle(e.target.value)} />
            </div>
            <div>
              <Label>Subtitle</Label>
              <Input value={bannerSubtitle} onChange={e => setBannerSubtitle(e.target.value)} />
            </div>
            <div>
              <Label>Link</Label>
              <Input value={bannerLink} onChange={e => setBannerLink(e.target.value)} />
            </div>
            <div>
              <Label>Background Color {useCustomImage && <span className="text-muted-foreground text-xs">(gradient overlay)</span>}</Label>
              <div className="flex gap-2 items-center">
                <Input
                  type="color" value={bannerBg}
                  onChange={e => { setBannerBg(e.target.value); if (!useCustomImage) regenerateGradient(); }}
                  className="w-14 h-10 p-1 cursor-pointer"
                />
                <Input value={bannerBg} onChange={e => setBannerBg(e.target.value)} className="font-mono text-xs" />
              </div>
            </div>
          </div>

          <Button onClick={saveBanner} className="w-full gap-2">
            <Plus className="h-4 w-4" /> Save Banner to Homepage
          </Button>
        </div>
      )}
    </div>
  );
};

export default AdminAiBannerCreator;
