import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkles, Loader2, Image, Plus, Palette } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useStoreSettings } from '@/hooks/useStoreSettings';

const generateBannerCanvas = (
  title: string,
  subtitle: string,
  bgColor: string,
  brandName: string,
): string => {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 400;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '/placeholder.svg';

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 1200, 400);
  grad.addColorStop(0, bgColor);
  const darken = (hex: string, amt = 40) => {
    const n = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, (n >> 16) - amt);
    const g = Math.max(0, ((n >> 8) & 0xff) - amt);
    const b = Math.max(0, (n & 0xff) - amt);
    return `rgb(${r},${g},${b})`;
  };
  grad.addColorStop(1, darken(bgColor));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1200, 400);

  // Decorative circles
  ctx.beginPath();
  ctx.arc(1100, 50, 180, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(150, 380, 140, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(600, 200, 300, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.fill();

  // Brand name
  ctx.font = 'bold 22px Arial, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.textAlign = 'center';
  ctx.fillText((brandName || 'STOPY').toUpperCase(), 600, 70);

  // Separator
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillRect(500, 82, 200, 1.5);

  // Main title
  const titleFontSize = title.length > 30 ? 52 : title.length > 20 ? 62 : 72;
  ctx.font = `bold ${titleFontSize}px Arial, sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 12;
  ctx.fillText(title.toUpperCase(), 600, 210);
  ctx.shadowBlur = 0;

  // Subtitle
  if (subtitle) {
    ctx.font = '26px Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.fillText(subtitle, 600, 270);
  }

  // Bottom badge
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.beginPath();
  ctx.roundRect(500, 320, 200, 42, 21);
  ctx.fill();
  ctx.font = 'bold 16px Arial, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('SHOP NOW →', 600, 346);

  return canvas.toDataURL('image/png');
};

const AdminAiBannerCreator = () => {
  const { brandName } = useStoreSettings();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [imgLoading, setImgLoading] = useState(false);
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerSubtitle, setBannerSubtitle] = useState('');
  const [bannerLink, setBannerLink] = useState('');
  const [bannerBg, setBannerBg] = useState('#FF6B00');
  const [bannerImageUrl, setBannerImageUrl] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

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
{ "title": "Banner Title", "subtitle": "Banner subtitle", "link": "/products?filter=flash-sale", "bg_color": "#FF6B00" }

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
        const bg = action.bg_color || '#FF6B00';
        setBannerTitle(title);
        setBannerSubtitle(subtitle);
        setBannerLink(action.link || '');
        setBannerBg(bg);
        const imgUrl = generateBannerCanvas(title, subtitle, bg, brandName || 'STOPY');
        setBannerImageUrl(imgUrl);
        toast({ title: '✅ Banner generated with image!' });
      } else {
        toast({ title: 'AI response received — fill in details manually' });
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  const regenerateImage = () => {
    if (!bannerTitle) return;
    setImgLoading(true);
    setTimeout(() => {
      const imgUrl = generateBannerCanvas(bannerTitle, bannerSubtitle, bannerBg, brandName || 'STOPY');
      setBannerImageUrl(imgUrl);
      setImgLoading(false);
    }, 100);
  };

  const saveBanner = async () => {
    if (!bannerTitle) { toast({ title: 'Title required', variant: 'destructive' }); return; }
    let finalImageUrl = bannerImageUrl;
    if (!finalImageUrl || finalImageUrl === '/placeholder.svg') {
      finalImageUrl = generateBannerCanvas(bannerTitle, bannerSubtitle, bannerBg, brandName || 'STOPY');
    }
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
      title: bannerTitle, subtitle: bannerSubtitle, link: bannerLink,
      bg_color: bannerBg, image_url: finalImageUrl, is_active: true, sort_order: 0,
    });
    toast({ title: '✅ Banner created!' });
    setBannerTitle(''); setBannerSubtitle(''); setBannerLink(''); setPrompt(''); setBannerImageUrl('');
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2"><Image className="h-5 w-5" /> AI Banner Creator</h2>
      <p className="text-sm text-muted-foreground">Describe your banner — AI generates the title, subtitle, link, and creates a banner image automatically</p>

      <div className="flex gap-2 flex-wrap">
        {['Flash sale banner with timer', 'New arrivals promotion', 'Discount items showcase', 'Free delivery announcement', 'Seasonal sale banner'].map(ex => (
          <Button key={ex} variant="outline" size="sm" className="text-xs" onClick={() => setPrompt(ex)}>{ex}</Button>
        ))}
      </div>

      <Textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Describe the banner you want..." rows={2} />
      <Button onClick={generateBanner} disabled={loading} className="gap-2">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {loading ? 'Generating...' : 'Generate Banner + Image'}
      </Button>

      {bannerTitle && (
        <div className="bg-card border rounded-xl p-4 space-y-3">
          {/* Banner image preview */}
          {bannerImageUrl && (
            <div className="relative rounded-lg overflow-hidden">
              <img src={bannerImageUrl} alt="Banner preview" className="w-full rounded-lg object-cover max-h-48" />
              <div className="absolute top-2 right-2 flex gap-1">
                <Button size="sm" variant="secondary" onClick={regenerateImage} disabled={imgLoading} className="h-7 text-xs gap-1">
                  <Palette className="h-3 w-3" /> {imgLoading ? 'Updating...' : 'Refresh Image'}
                </Button>
              </div>
            </div>
          )}

          {/* Editable fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Title</Label>
              <Input value={bannerTitle} onChange={e => { setBannerTitle(e.target.value); }} onBlur={regenerateImage} />
            </div>
            <div>
              <Label>Subtitle</Label>
              <Input value={bannerSubtitle} onChange={e => setBannerSubtitle(e.target.value)} onBlur={regenerateImage} />
            </div>
            <div>
              <Label>Link (auto-filled)</Label>
              <Input value={bannerLink} onChange={e => setBannerLink(e.target.value)} />
            </div>
            <div>
              <Label>Background Color</Label>
              <div className="flex gap-2 items-center">
                <Input type="color" value={bannerBg} onChange={e => setBannerBg(e.target.value)} onBlur={regenerateImage} className="w-14 h-10 p-1 cursor-pointer" />
                <Input value={bannerBg} onChange={e => { setBannerBg(e.target.value); }} onBlur={regenerateImage} className="font-mono text-xs" />
              </div>
            </div>
          </div>
          <Button onClick={saveBanner} className="w-full gap-2"><Plus className="h-4 w-4" /> Save Banner</Button>
        </div>
      )}
    </div>
  );
};

export default AdminAiBannerCreator;
