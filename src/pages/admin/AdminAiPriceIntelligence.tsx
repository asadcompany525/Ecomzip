import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, TrendingUp, TrendingDown, Loader2, Sparkles, ArrowUp, ArrowDown, Minus, Search } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useStoreSettings } from '@/hooks/useStoreSettings';

interface PriceAnalysis {
  currentPrice: number;
  suggestedPrice: number;
  minPrice: number;
  maxPrice: number;
  direction: 'increase' | 'decrease' | 'hold';
  percentChange: number;
  marketPosition: 'below-market' | 'at-market' | 'above-market';
  reasoning: string;
  competitorPrices: { name: string; price: number }[];
  recommendation: string;
}

export default function AdminAiPriceIntelligence() {
  const { brandName } = useStoreSettings();
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [marketData, setMarketData] = useState('');
  const [analysis, setAnalysis] = useState<PriceAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [bulkResults, setBulkResults] = useState<any[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [tab, setTab] = useState<'single' | 'bulk'>('single');

  useEffect(() => {
    supabase.from('products').select('id, title, price, original_price, discount_percent, brand, gender, sold, stock').eq('is_active', true).limit(60).then(({ data }) => setProducts(data || []));
  }, []);

  const selectedProd = products.find(p => p.id === selectedProduct);

  const analyze = async () => {
    if (!selectedProd) { toast({ title: 'Select a product', variant: 'destructive' }); return; }
    setLoading(true);
    setAnalysis(null);
    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          type: 'price-intelligence',
          messages: [{
            role: 'user',
            content: `You are a pricing analyst for ${brandName || 'our store'} Pakistan.

Product: ${selectedProd.title}
Current Price: Rs.${selectedProd.price}
Original Price: Rs.${selectedProd.original_price || selectedProd.price}
Current Discount: ${selectedProd.discount_percent || 0}%
Brand: ${selectedProd.brand || 'N/A'}
Gender: ${selectedProd.gender}
Units Sold: ${selectedProd.sold || 0}
Current Stock: ${selectedProd.stock}

Market Data (user-provided):
${marketData || 'No external data provided. Use Pakistan shoe market knowledge.'}

Analyze and suggest optimal pricing. Return JSON only:
{
  "currentPrice": ${selectedProd.price},
  "suggestedPrice": 0,
  "minPrice": 0,
  "maxPrice": 0,
  "direction": "increase|decrease|hold",
  "percentChange": 0,
  "marketPosition": "below-market|at-market|above-market",
  "reasoning": "Detailed reasoning in 2-3 sentences",
  "competitorPrices": [
    {"name": "Competitor/Platform name", "price": 0}
  ],
  "recommendation": "One actionable recommendation"
}
Return ONLY valid JSON.`
          }]
        }
      });
      if (error) throw error;
      if (data?.error) throw new Error(typeof data.error === 'string' ? data.error : 'AI service error');
      let parsed = data;
      if (typeof data === 'string') { const m = data.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); }
      setAnalysis(parsed);
    } catch (e: any) {
      toast({ title: 'Analysis failed', description: e.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  const bulkAnalyze = async () => {
    setBulkLoading(true);
    setBulkResults([]);
    const slice = products.slice(0, 15);
    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          type: 'price-intelligence-bulk',
          messages: [{
            role: 'user',
            content: `You are a pricing AI for ${brandName || 'our store'} Pakistan.
Analyze these products and suggest price adjustments based on Pakistan e-commerce market trends:

${JSON.stringify(slice.map(p => ({ id: p.id, title: p.title, price: p.price, sold: p.sold, stock: p.stock, gender: p.gender })), null, 2)}

Return a JSON array:
[
  {
    "productId": "uuid",
    "direction": "increase|decrease|hold",
    "suggestedPrice": 0,
    "percentChange": 0,
    "shortReason": "One sentence"
  }
]
Return ONLY valid JSON array.`
          }]
        }
      });
      if (error) throw error;
      if (data?.error) throw new Error(typeof data.error === 'string' ? data.error : 'AI service error');
      let parsed = data;
      if (typeof data === 'string') { const m = data.match(/\[[\s\S]*\]/); if (m) parsed = JSON.parse(m[0]); }
      const enriched = (Array.isArray(parsed) ? parsed : []).map((r: any) => {
        const p = products.find(pr => pr.id === r.productId);
        return { ...r, title: p?.title, currentPrice: p?.price };
      });
      setBulkResults(enriched);
      toast({ title: `Bulk analysis complete`, description: `${enriched.length} products analyzed` });
    } catch (e: any) {
      toast({ title: 'Bulk analysis failed', description: e.message, variant: 'destructive' });
    }
    setBulkLoading(false);
  };

  const DirectionIcon = ({ d }: { d: string }) => d === 'increase' ? <ArrowUp className="h-4 w-4 text-green-600" /> : d === 'decrease' ? <ArrowDown className="h-4 w-4 text-red-600" /> : <Minus className="h-4 w-4 text-gray-400" />;
  const dirBadge = (d: string) => d === 'increase' ? 'default' : d === 'decrease' ? 'destructive' : 'secondary';
  const marketBadge = (m: string) => m === 'below-market' ? 'default' : m === 'above-market' ? 'destructive' : 'secondary';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-green-100 rounded-lg"><DollarSign className="h-6 w-6 text-green-600" /></div>
        <div><h1 className="text-2xl font-bold">AI Price Intelligence</h1><p className="text-muted-foreground text-sm">Compare pricing with market trends & get AI suggestions</p></div>
      </div>

      <div className="flex gap-2 border-b">
        {[['single', 'Single Product'], ['bulk', 'Bulk Analysis']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id as any)}
            className={`pb-2 px-3 text-sm font-medium border-b-2 transition-colors ${tab === id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'single' && (
        <div className="space-y-4">
          <div className="bg-card border rounded-xl p-5 space-y-4">
            <div>
              <Label>Select Product</Label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Choose a product..." /></SelectTrigger>
                <SelectContent>
                  {products.map(p => <SelectItem key={p.id} value={p.id}>{p.title} — Rs.{p.price}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {selectedProd && (
              <div className="grid grid-cols-3 gap-2 p-3 bg-muted/50 rounded-lg text-sm">
                <div><p className="text-muted-foreground text-xs">Current Price</p><p className="font-bold">Rs.{selectedProd.price}</p></div>
                <div><p className="text-muted-foreground text-xs">Sold</p><p className="font-bold">{selectedProd.sold || 0}</p></div>
                <div><p className="text-muted-foreground text-xs">Stock</p><p className="font-bold">{selectedProd.stock}</p></div>
              </div>
            )}
            <div>
              <Label>Market Data (Optional)</Label>
              <Textarea rows={3} placeholder="Paste competitor prices, market observations, e.g. Daraz showing similar at Rs.2800, Ali Express at Rs.1500..." value={marketData} onChange={e => setMarketData(e.target.value)} className="mt-1 text-sm" />
            </div>
            <Button onClick={analyze} disabled={loading || !selectedProduct} className="w-full">
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analyzing...</> : <><Search className="h-4 w-4 mr-2" />Analyze Price</>}
            </Button>
          </div>

          {analysis && (
            <div className="space-y-4">
              <div className="border rounded-xl p-5 bg-card">
                <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Current Price</p>
                    <p className="text-3xl font-bold">Rs.{analysis.currentPrice?.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Suggested Price</p>
                    <p className={`text-3xl font-bold ${analysis.direction === 'increase' ? 'text-green-600' : analysis.direction === 'decrease' ? 'text-red-600' : ''}`}>Rs.{analysis.suggestedPrice?.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap mb-4">
                  <Badge variant={dirBadge(analysis.direction) as any} className="flex items-center gap-1">
                    <DirectionIcon d={analysis.direction} />{analysis.direction} {analysis.percentChange ? `${Math.abs(analysis.percentChange)}%` : ''}
                  </Badge>
                  <Badge variant={marketBadge(analysis.marketPosition) as any}>{analysis.marketPosition?.replace(/-/g, ' ')}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{analysis.reasoning}</p>
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-medium text-blue-800">{analysis.recommendation}</p>
                </div>
              </div>

              {analysis.competitorPrices?.length > 0 && (
                <div className="border rounded-xl p-4">
                  <h3 className="font-semibold mb-3">Competitor Comparison</h3>
                  <div className="space-y-2">
                    {analysis.competitorPrices.map((c, i) => (
                      <div key={i} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                        <span>{c.name}</span>
                        <span className={`font-medium ${c.price < analysis.currentPrice ? 'text-red-600' : c.price > analysis.currentPrice ? 'text-green-600' : ''}`}>Rs.{c.price?.toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between text-sm py-1 bg-primary/5 rounded px-2">
                      <span className="font-medium">{brandName || 'Store'} (Current)</span>
                      <span className="font-bold text-primary">Rs.{analysis.currentPrice?.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'bulk' && (
        <div className="space-y-4">
          <Button onClick={bulkAnalyze} disabled={bulkLoading} className="w-full">
            {bulkLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analyzing {products.slice(0, 15).length} products...</> : <><Sparkles className="h-4 w-4 mr-2" />Run Bulk Price Analysis ({Math.min(products.length, 15)} products)</>}
          </Button>

          {bulkResults.length > 0 && (
            <div className="space-y-2">
              {bulkResults.map((r, i) => (
                <div key={i} className="border rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{r.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{r.shortReason}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Current</p>
                      <p className="font-medium">Rs.{r.currentPrice?.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Suggested</p>
                      <p className={`font-bold ${r.direction === 'increase' ? 'text-green-600' : r.direction === 'decrease' ? 'text-red-600' : ''}`}>Rs.{r.suggestedPrice?.toLocaleString()}</p>
                    </div>
                    <Badge variant={dirBadge(r.direction) as any} className="flex items-center gap-1 text-xs">
                      <DirectionIcon d={r.direction} />{r.percentChange ? `${Math.abs(r.percentChange)}%` : r.direction}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
