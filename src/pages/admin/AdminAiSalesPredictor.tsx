import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Loader2, RefreshCw, Package, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useStoreSettings } from '@/hooks/useStoreSettings';

interface Prediction {
  productId: string;
  productName: string;
  currentStock: number;
  sold: number;
  trend: 'rising' | 'falling' | 'stable';
  predictedDemand: number;
  stockSuggestion: number;
  confidence: number;
  reason: string;
}

export default function AdminAiSalesPredictor() {
  const { brandName } = useStoreSettings();
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [predicting, setPredicting] = useState(false);
  const [filter, setFilter] = useState<'all' | 'low' | 'rising'>('all');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: p }, { data: o }] = await Promise.all([
      supabase.from('products').select('*').eq('is_active', true).limit(50),
      supabase.from('orders').select('*, order_items(product_id, quantity)').gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()),
    ]);
    setProducts(p || []);
    setOrders(o || []);
    setLoading(false);
  };

  const predict = async () => {
    if (products.length === 0) return;
    setPredicting(true);

    const salesMap: Record<string, number> = {};
    orders.forEach(o => {
      (o.order_items || []).forEach((item: any) => {
        if (item.product_id) salesMap[item.product_id] = (salesMap[item.product_id] || 0) + item.quantity;
      });
    });

    const productData = products.slice(0, 20).map(p => ({
      id: p.id, title: p.title, stock: p.stock, sold: p.sold, price: p.price,
      recentSales: salesMap[p.id] || 0, gender: p.gender, is_flash_sale: p.is_flash_sale,
    }));

    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          type: 'sales-predictor',
          messages: [{
            role: 'user',
            content: `You are a sales prediction AI for E Commerce Pakistan.
Analyze these products and predict next 7-day demand:

${JSON.stringify(productData, null, 2)}

Consider:
- recentSales = last 30 days sales
- Low stock + high recent sales = urgent restock
- High stock + low sales = overstock risk
- Seasonal trends (Pakistan: Eid season boosts kids/formal, summer boosts casual)

Return a JSON array with one object per product:
[
  {
    "productId": "uuid",
    "trend": "rising|falling|stable",
    "predictedDemand": 15,
    "stockSuggestion": 50,
    "confidence": 75,
    "reason": "Short reason why"
  }
]
Return ONLY valid JSON array.`
          }]
        }
      });
      if (error) throw error;
      let parsed = data;
      if (typeof data === 'string') { const m = data.match(/\[[\s\S]*\]/); if (m) parsed = JSON.parse(m[0]); }
      
      const result: Prediction[] = (Array.isArray(parsed) ? parsed : []).map((ai: any) => {
        const product = products.find(p => p.id === ai.productId);
        return {
          productId: ai.productId,
          productName: product?.title || 'Unknown',
          currentStock: product?.stock || 0,
          sold: product?.sold || 0,
          trend: ai.trend || 'stable',
          predictedDemand: ai.predictedDemand || 0,
          stockSuggestion: ai.stockSuggestion || 0,
          confidence: ai.confidence || 0,
          reason: ai.reason || '',
        };
      });
      setPredictions(result);
      toast({ title: 'Predictions generated!', description: `Analyzed ${result.length} products` });
    } catch (e: any) {
      toast({ title: 'Prediction failed', description: e.message, variant: 'destructive' });
    }
    setPredicting(false);
  };

  const filtered = predictions.filter(p => {
    if (filter === 'low') return p.currentStock < p.predictedDemand;
    if (filter === 'rising') return p.trend === 'rising';
    return true;
  });

  const TrendIcon = ({ trend }: { trend: string }) => {
    if (trend === 'rising') return <ArrowUp className="h-4 w-4 text-green-600" />;
    if (trend === 'falling') return <ArrowDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const trendBadge = (t: string) => t === 'rising' ? 'default' : t === 'falling' ? 'destructive' : 'secondary';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 rounded-lg"><TrendingUp className="h-6 w-6 text-blue-600" /></div>
        <div><h1 className="text-2xl font-bold">AI Sales Predictor</h1><p className="text-muted-foreground text-sm">Stock suggestions based on 30-day sales trends</p></div>
      </div>

      {predictions.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Products', val: predictions.length, color: 'text-blue-600' },
            { label: 'Rising Demand', val: predictions.filter(p => p.trend === 'rising').length, color: 'text-green-600' },
            { label: 'Low Stock Alert', val: predictions.filter(p => p.currentStock < p.predictedDemand).length, color: 'text-red-600' },
            { label: 'Overstock', val: predictions.filter(p => p.currentStock > p.predictedDemand * 3).length, color: 'text-yellow-600' },
          ].map(s => (
            <div key={s.label} className="bg-card border rounded-xl p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <Button onClick={fetchData} variant="outline" disabled={loading} size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />Refresh Data
        </Button>
        <Button onClick={predict} disabled={predicting || loading || products.length === 0}>
          {predicting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Predicting...</> : <><TrendingUp className="h-4 w-4 mr-2" />Generate Predictions</>}
        </Button>
        {predictions.length > 0 && (
          <div className="flex gap-1 ml-auto">
            {(['all', 'rising', 'low'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${filter === f ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}>
                {f === 'low' ? 'Low Stock' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>

      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.sort((a, b) => (b.predictedDemand - b.currentStock) - (a.predictedDemand - a.currentStock)).map(p => (
            <div key={p.productId} className={`border rounded-xl p-4 ${p.currentStock < p.predictedDemand ? 'border-red-200 bg-red-50/30' : 'bg-card'}`}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold truncate">{p.productName}</span>
                    <Badge variant={trendBadge(p.trend) as any} className="text-xs flex items-center gap-1">
                      <TrendIcon trend={p.trend} />{p.trend}
                    </Badge>
                    {p.currentStock < p.predictedDemand && <Badge variant="destructive" className="text-xs">Restock Needed</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{p.reason}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground">Confidence: {p.confidence}%</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-3">
                {[
                  { label: 'Current Stock', val: p.currentStock, icon: Package, alert: p.currentStock < p.predictedDemand },
                  { label: '7-Day Demand', val: p.predictedDemand, icon: TrendingUp, alert: false },
                  { label: 'Suggested Stock', val: p.stockSuggestion, icon: ArrowUp, alert: false },
                ].map(s => (
                  <div key={s.label} className={`rounded-lg p-2 text-center ${s.alert ? 'bg-red-100' : 'bg-muted/50'}`}>
                    <p className={`text-lg font-bold ${s.alert ? 'text-red-600' : ''}`}>{s.val}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : predictions.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p>Click "Generate Predictions" to analyze your inventory</p>
        </div>
      ) : (
        <div className="text-center py-10 text-muted-foreground">No products match this filter.</div>
      )}
    </div>
  );
}
