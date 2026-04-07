import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const AdminReports = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'all'>('daily');
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('orders').select('*').order('created_at', { ascending: false }).then(({ data }) => setOrders(data || []));
    supabase.from('products').select('id, title, sold, stock, price').order('sold', { ascending: false }).limit(10).then(({ data }) => setProducts(data || []));
  }, []);

  const now = new Date();
  const filterByPeriod = (o: any) => {
    const d = new Date(o.created_at);
    if (period === 'daily') return d.toDateString() === now.toDateString();
    if (period === 'weekly') { const w = new Date(now); w.setDate(w.getDate() - 7); return d >= w; }
    if (period === 'monthly') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    return true;
  };

  const filtered = orders.filter(filterByPeriod);
  const totalRevenue = filtered.reduce((s, o) => s + Number(o.total || 0), 0);
  const codOrders = filtered.filter(o => o.payment_method === 'cod');
  const onlineOrders = filtered.filter(o => o.payment_method !== 'cod');
  const pending = filtered.filter(o => o.status === 'pending');
  const delivered = filtered.filter(o => o.status === 'delivered');
  const cancelled = filtered.filter(o => o.status === 'cancelled');
  const avgOrderValue = filtered.length > 0 ? Math.round(totalRevenue / filtered.length) : 0;

  // Payment method breakdown
  const methodCounts: Record<string, number> = {};
  filtered.forEach(o => { methodCounts[o.payment_method] = (methodCounts[o.payment_method] || 0) + 1; });

  return (
    <div className="space-y-6">
      <div className="flex gap-2 flex-wrap">
        {(['daily', 'weekly', 'monthly', 'all'] as const).map(p => (
          <Button key={p} variant={period === p ? 'default' : 'outline'} onClick={() => setPeriod(p)} className="capitalize">{p === 'all' ? 'All Time' : p}</Button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total Orders</p><p className="text-2xl font-bold">{filtered.length}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Revenue</p><p className="text-2xl font-bold">Rs. {totalRevenue.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Avg Order</p><p className="text-2xl font-bold">Rs. {avgOrderValue.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">COD</p><p className="text-2xl font-bold">{codOrders.length}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Online</p><p className="text-2xl font-bold">{onlineOrders.length}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Pending</p><p className="text-2xl font-bold text-orange-500">{pending.length}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Delivered</p><p className="text-2xl font-bold text-green-500">{delivered.length}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Cancelled</p><p className="text-2xl font-bold text-red-500">{cancelled.length}</p></CardContent></Card>
      </div>

      {/* Payment Methods */}
      <Card>
        <CardHeader><CardTitle className="text-sm">💳 Payment Methods</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap">
            {Object.entries(methodCounts).map(([method, count]) => (
              <div key={method} className="bg-muted rounded-lg px-4 py-2 text-center">
                <p className="text-xs text-muted-foreground uppercase">{method}</p>
                <p className="text-lg font-bold">{count}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Products */}
      <Card>
        <CardHeader><CardTitle className="text-sm">🏆 Top Selling Products</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {products.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 text-sm">
                <span className="font-bold text-muted-foreground w-6">#{i + 1}</span>
                <span className="flex-1 truncate">{p.title}</span>
                <Badge variant="outline">{p.sold} sold</Badge>
                <span className="text-xs text-muted-foreground">{p.stock} left</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminReports;
