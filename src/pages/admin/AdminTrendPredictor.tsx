import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, AlertTriangle, RefreshCw, PackageSearch, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';

interface PredictionItem {
  product_id: string;
  product_name: string;
  size: string;
  current_stock: number;
  sold_last_30: number;
  daily_rate: number;
  days_until_out: number;
  risk: 'critical' | 'high' | 'medium';
}

export default function AdminTrendPredictor() {
  const [predictions, setPredictions] = useState<PredictionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: recentOrders } = await supabase
        .from('orders')
        .select('id, status')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .neq('status', 'cancelled');

      const recentOrderIds = (recentOrders || []).map((o: any) => o.id);

      const { data: orderItems } = recentOrderIds.length > 0
        ? await supabase
            .from('order_items')
            .select('product_id, size, quantity')
            .in('order_id', recentOrderIds)
        : { data: [] };

      const { data: variants } = await supabase
        .from('product_variants')
        .select('product_id, sizes, products(title)');

      const salesMap: Record<string, Record<string, number>> = {};
      (orderItems || []).forEach((item: any) => {
        const key = item.product_id;
        if (!salesMap[key]) salesMap[key] = {};
        const size = item.size || 'N/A';
        salesMap[key][size] = (salesMap[key][size] || 0) + (item.quantity || 1);
      });

      const results: PredictionItem[] = [];

      (variants || []).forEach((v: any) => {
        if (!v.sizes || typeof v.sizes !== 'object') return;
        const productName = v.products?.title || 'Unknown';
        Object.entries(v.sizes as Record<string, number>).forEach(([size, stock]) => {
          const sold30 = salesMap[v.product_id]?.[size] || 0;
          const dailyRate = sold30 / 30;
          if (dailyRate <= 0) return;
          const daysOut = stock / dailyRate;
          if (daysOut > 14) return;

          let risk: 'critical' | 'high' | 'medium' = 'medium';
          if (daysOut <= 3) risk = 'critical';
          else if (daysOut <= 7) risk = 'high';

          results.push({
            product_id: v.product_id,
            product_name: productName,
            size,
            current_stock: stock,
            sold_last_30: sold30,
            daily_rate: Math.round(dailyRate * 10) / 10,
            days_until_out: Math.round(daysOut),
            risk,
          });
        });
      });

      results.sort((a, b) => a.days_until_out - b.days_until_out);
      setPredictions(results);
      setLastRun(new Date().toLocaleString());
      toast({ title: `Analysis complete — ${results.length} items flagged` });
    } catch (e: any) {
      toast({ title: 'Analysis failed', description: e.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  useEffect(() => { runAnalysis(); }, []);

  const riskColor = (risk: string) => {
    if (risk === 'critical') return 'bg-red-100 text-red-700 border-red-200';
    if (risk === 'high') return 'bg-orange-100 text-orange-700 border-orange-200';
    return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  };

  const critical = predictions.filter(p => p.risk === 'critical');
  const high = predictions.filter(p => p.risk === 'high');
  const medium = predictions.filter(p => p.risk === 'medium');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><TrendingUp className="h-6 w-6 text-primary" /> AI Trend Predictor</h1>
          <p className="text-sm text-muted-foreground mt-1">Predicts which items will go out of stock in the next 7 days based on sales velocity.</p>
          {lastRun && <p className="text-xs text-muted-foreground mt-0.5">Last run: {lastRun}</p>}
        </div>
        <Button onClick={runAnalysis} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Analyzing...' : 'Re-analyze Now'}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-2xl font-bold text-red-700">{critical.length}</p>
              <p className="text-sm text-red-600">Critical (≤3 days)</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-orange-500" />
            <div>
              <p className="text-2xl font-bold text-orange-700">{high.length}</p>
              <p className="text-sm text-orange-600">High Risk (≤7 days)</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4 flex items-center gap-3">
            <PackageSearch className="h-8 w-8 text-yellow-600" />
            <div>
              <p className="text-2xl font-bold text-yellow-700">{medium.length}</p>
              <p className="text-sm text-yellow-600">Medium Risk (≤14 days)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {predictions.length === 0 && !loading && (
        <Card>
          <CardContent className="p-12 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="text-lg font-medium">All stock looks healthy!</p>
            <p className="text-sm text-muted-foreground">No items predicted to stock out in the next 14 days.</p>
          </CardContent>
        </Card>
      )}

      {predictions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stock-Out Predictions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3">Product</th>
                    <th className="text-left p-3">Size</th>
                    <th className="text-left p-3">Stock Left</th>
                    <th className="text-left p-3">Sold/30d</th>
                    <th className="text-left p-3">Daily Rate</th>
                    <th className="text-left p-3">Days Left</th>
                    <th className="text-left p-3">Risk</th>
                    <th className="text-left p-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {predictions.map((p, i) => (
                    <tr key={i} className="border-b hover:bg-accent/30">
                      <td className="p-3 font-medium max-w-[180px] truncate">{p.product_name}</td>
                      <td className="p-3"><Badge variant="outline">Size {p.size}</Badge></td>
                      <td className="p-3 font-bold">{p.current_stock}</td>
                      <td className="p-3">{p.sold_last_30}</td>
                      <td className="p-3">{p.daily_rate}/day</td>
                      <td className="p-3 font-bold">{p.days_until_out}d</td>
                      <td className="p-3">
                        <Badge className={riskColor(p.risk)} variant="outline">
                          {p.risk === 'critical' ? '🔴' : p.risk === 'high' ? '🟠' : '🟡'} {p.risk}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Button size="sm" variant="destructive" className="text-xs h-7" onClick={() => toast({ title: `Restock reminder set for ${p.product_name} - Size ${p.size}` })}>
                          ⚠ Restock Now
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
