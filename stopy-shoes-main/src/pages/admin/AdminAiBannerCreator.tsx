import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkles, Loader2, Image, Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const AdminAiBannerCreator = () => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerSubtitle, setBannerSubtitle] = useState('');
  const [bannerLink, setBannerLink] = useState('');
  const [bannerBg, setBannerBg] = useState('#FF6B00');
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
            { role: 'system', content: `You are creating a promotional banner for Stopy Shoes store. Based on the user's description, generate banner text and auto-fill the link.
${context}

Return JSON in <ACTION_JSON> tags:
{ "title": "Banner Title", "subtitle": "Banner subtitle", "link": "/products?filter=flash-sale", "bg_color": "#FF6B00" }

Choose appropriate link: /flash-sale, /discount-items, /products?category=X, /new-arrivals etc.` },
            { role: 'user', content: prompt },
          ],
        },
      });
      if (error) throw error;
      const reply = typeof data === 'string' ? data : data?.reply || data?.content || '';
      const actionMatch = reply.match(/<ACTION_JSON>([\s\S]*?)<\/ACTION_JSON>/);
      if (actionMatch) {
        const action = JSON.parse(actionMatch[1]);
        setBannerTitle(action.title || '');
        setBannerSubtitle(action.subtitle || '');
        setBannerLink(action.link || '');
        setBannerBg(action.bg_color || '#FF6B00');
        toast({ title: '✅ Banner details generated!' });
      } else {
        toast({ title: 'AI response received — fill in details manually' });
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  const saveBanner = async () => {
    if (!bannerTitle) { toast({ title: 'Title required', variant: 'destructive' }); return; }
    await supabase.from('banners').insert({
      title: bannerTitle, subtitle: bannerSubtitle, link: bannerLink,
      bg_color: bannerBg, image_url: '/placeholder.svg', is_active: true, sort_order: 0,
    });
    toast({ title: '✅ Banner created!' });
    setBannerTitle(''); setBannerSubtitle(''); setBannerLink(''); setPrompt('');
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2"><Image className="h-5 w-5" /> AI Banner Creator</h2>
      <p className="text-sm text-muted-foreground">Describe what kind of banner you want, AI will generate title, subtitle, and link automatically</p>

      <div className="flex gap-2 flex-wrap">
        {['Flash sale banner with timer', 'New arrivals promotion', 'Discount items showcase', 'Free delivery announcement', 'Seasonal sale banner'].map(ex => (
          <Button key={ex} variant="outline" size="sm" className="text-xs" onClick={() => setPrompt(ex)}>{ex}</Button>
        ))}
      </div>

      <Textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Describe the banner you want..." rows={2} />
      <Button onClick={generateBanner} disabled={loading} className="gap-2">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        Generate Banner Details
      </Button>

      {bannerTitle && (
        <div className="bg-card border rounded-xl p-4 space-y-3">
          <div className="p-6 rounded-lg text-white text-center" style={{ backgroundColor: bannerBg }}>
            <h3 className="text-2xl font-bold">{bannerTitle}</h3>
            {bannerSubtitle && <p className="mt-1">{bannerSubtitle}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Title</Label><Input value={bannerTitle} onChange={e => setBannerTitle(e.target.value)} /></div>
            <div><Label>Subtitle</Label><Input value={bannerSubtitle} onChange={e => setBannerSubtitle(e.target.value)} /></div>
            <div><Label>Link (auto-filled)</Label><Input value={bannerLink} onChange={e => setBannerLink(e.target.value)} /></div>
            <div><Label>Background Color</Label><Input type="color" value={bannerBg} onChange={e => setBannerBg(e.target.value)} /></div>
          </div>
          <Button onClick={saveBanner} className="w-full gap-2"><Plus className="h-4 w-4" /> Save Banner</Button>
        </div>
      )}
    </div>
  );
};

export default AdminAiBannerCreator;
