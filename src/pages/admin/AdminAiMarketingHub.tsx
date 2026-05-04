import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Megaphone, Copy, Check, Loader2, RefreshCw, Instagram, Facebook, Search, Sparkles } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useStoreSettings } from '@/hooks/useStoreSettings';

interface GeneratedContent {
  instagram: string;
  facebook: string;
  tiktok: string;
  seoTitle: string;
  seoDescription: string;
  hashtags: string[];
  whatsapp: string;
}

export default function AdminAiMarketingHub() {
  const { brandName } = useStoreSettings();
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [tone, setTone] = useState('exciting');
  const [language, setLanguage] = useState('both');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeneratedContent | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [tab, setTab] = useState<'product' | 'custom'>('product');

  useEffect(() => {
    supabase.from('products').select('id, title, price, discount_percent, brand, gender').eq('is_active', true).limit(50).then(({ data }) => setProducts(data || []));
  }, []);

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const generate = async () => {
    const product = products.find(p => p.id === selectedProduct);
    if (!product && !customPrompt) { toast({ title: 'Select a product or enter a custom prompt', variant: 'destructive' }); return; }
    setLoading(true);
    setResult(null);
    try {
      const context = product
        ? `Product: ${product.title}, Price: Rs.${product.price}, Brand: ${product.brand || 'N/A'}, Gender: ${product.gender}, Discount: ${product.discount_percent || 0}%`
        : customPrompt;

      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          type: 'marketing-hub',
          messages: [{
            role: 'user',
            content: `You are a viral marketing expert for ${brandName || 'our store'} Pakistan — Pakistan's #1 shoe & bag store.

Context: ${context}
Tone: ${tone}
Language preference: ${language === 'both' ? 'Mix Urdu & English (Romanized Urdu OK)' : language === 'urdu' ? 'Primarily Urdu (Roman script)' : 'English only'}

Generate viral marketing content. Return JSON only:
{
  "instagram": "Engaging Instagram caption (with emojis, 150-200 chars)",
  "facebook": "Longer Facebook post (300-400 chars, storytelling)",
  "tiktok": "TikTok video script hook (50-80 chars, punchy)",
  "whatsapp": "WhatsApp broadcast message (casual, friendly, 100-150 chars)",
  "seoTitle": "SEO page title (60 chars max)",
  "seoDescription": "SEO meta description (155 chars max)",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5"]
}
Return ONLY valid JSON.`
          }]
        }
      });
      if (error) throw error;
      if (data?.error) throw new Error(typeof data.error === 'string' ? data.error : 'AI service error');
      let parsed = data;
      if (typeof data === 'string') { const m = data.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); }
      setResult(parsed);
    } catch (e: any) {
      toast({ title: 'Generation failed', description: e.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  const CopyButton = ({ text, k }: { text: string; k: string }) => (
    <button onClick={() => copy(text, k)} className="text-muted-foreground hover:text-primary transition-colors p-1">
      {copied === k ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-purple-100 rounded-lg"><Megaphone className="h-6 w-6 text-purple-600" /></div>
        <div><h1 className="text-2xl font-bold">AI Marketing Hub</h1><p className="text-muted-foreground text-sm">Auto-generate viral captions, SEO content & social media posts</p></div>
      </div>

      <div className="bg-card border rounded-xl p-5 space-y-4">
        <div className="flex gap-2 border-b pb-3">
          {[['product', 'Product-based'], ['custom', 'Custom Prompt']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id as any)}
              className={`pb-1 text-sm font-medium border-b-2 mr-3 transition-colors ${tab === id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'product' ? (
          <div>
            <Label>Select Product</Label>
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Choose a product..." /></SelectTrigger>
              <SelectContent>
                {products.map(p => <SelectItem key={p.id} value={p.id}>{p.title} — Rs.{p.price}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div>
            <Label>Custom Prompt</Label>
            <Textarea rows={3} placeholder="e.g. 50% off on all ladies sandals, limited stock, Eid special offer..." value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} className="mt-1" />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Tone</Label>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['exciting', 'professional', 'funny', 'emotional', 'urgent'].map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Language</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="both">Urdu + English</SelectItem>
                <SelectItem value="english">English Only</SelectItem>
                <SelectItem value="urdu">Urdu Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={generate} disabled={loading} className="w-full">
          {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</> : <><Sparkles className="h-4 w-4 mr-2" />Generate Marketing Content</>}
        </Button>
      </div>

      {result && (
        <div className="space-y-4">
          {[
            { key: 'instagram', label: 'Instagram Caption', icon: Instagram, color: 'bg-pink-50 border-pink-200' },
            { key: 'facebook', label: 'Facebook Post', icon: Facebook, color: 'bg-blue-50 border-blue-200' },
            { key: 'tiktok', label: 'TikTok Hook', icon: Sparkles, color: 'bg-black/5 border-gray-200' },
            { key: 'whatsapp', label: 'WhatsApp Broadcast', icon: Megaphone, color: 'bg-green-50 border-green-200' },
          ].map(({ key, label, icon: Icon, color }) => (
            <div key={key} className={`border rounded-xl p-4 ${color}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2"><Icon className="h-4 w-4" /><span className="font-semibold text-sm">{label}</span></div>
                <CopyButton text={(result as any)[key]} k={key} />
              </div>
              <p className="text-sm whitespace-pre-wrap">{(result as any)[key]}</p>
            </div>
          ))}

          <div className="grid md:grid-cols-2 gap-4">
            <div className="border rounded-xl p-4 bg-orange-50 border-orange-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2"><Search className="h-4 w-4" /><span className="font-semibold text-sm">SEO Title</span></div>
                <CopyButton text={result.seoTitle} k="seoTitle" />
              </div>
              <p className="text-sm font-medium">{result.seoTitle}</p>
              <p className="text-xs text-muted-foreground mt-2 mb-1">Meta Description:</p>
              <p className="text-sm">{result.seoDescription}</p>
              <CopyButton text={result.seoDescription} k="seoDesc" />
            </div>

            <div className="border rounded-xl p-4 bg-purple-50 border-purple-200">
              <p className="font-semibold text-sm mb-2">Hashtags</p>
              <div className="flex flex-wrap gap-1.5">
                {result.hashtags?.map((h, i) => (
                  <button key={i} onClick={() => copy(result.hashtags.join(' '), 'hashtags')}
                    className="text-xs bg-white border rounded-full px-2 py-0.5 text-purple-700 hover:bg-purple-50 transition-colors">
                    #{h}
                  </button>
                ))}
              </div>
              <Button size="sm" variant="outline" className="mt-2 w-full text-xs" onClick={() => copy(result.hashtags.map(h => `#${h}`).join(' '), 'allhash')}>
                {copied === 'allhash' ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}Copy All Hashtags
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
