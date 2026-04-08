import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, AlertTriangle, TrendingDown, Package, Download, MapPin, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';

interface CityData {
  city: string;
  orders: number;
  revenue: number;
  intensity: number;
}

const AdminInventoryInsights = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'low-stock' | 'dead-stock' | 'top-selling' | 'all' | 'city-heatmap'>('all');
  const [cityData, setCityData] = useState<CityData[]>([]);
  const [cityLoading, setCityLoading] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data: prods } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      setProducts(prods || []);
      const { data: vars } = await supabase.from('product_variants').select('*');
      setVariants(vars || []);
    };
    fetch();
  }, []);

  useEffect(() => {
    if (view === 'city-heatmap') {
      fetchCityData();
    }
  }, [view]);

  const fetchCityData = async () => {
    setCityLoading(true);
    const { data: orders } = await supabase
      .from('orders')
      .select('delivery_address, total_amount, status')
      .neq('status', 'cancelled');

    const cityMap: Record<string, { orders: number; revenue: number }> = {};

    (orders || []).forEach((order: any) => {
      const addr = order.delivery_address;
      let city = 'Unknown';
      if (addr) {
        if (typeof addr === 'string') {
          const parts = addr.split(',');
          city = parts[parts.length - 2]?.trim() || parts[0]?.trim() || 'Unknown';
        } else if (typeof addr === 'object') {
          city = addr.city || addr.district || addr.state || 'Unknown';
        }
      }
      if (!cityMap[city]) cityMap[city] = { orders: 0, revenue: 0 };
      cityMap[city].orders += 1;
      cityMap[city].revenue += Number(order.total_amount || 0);
    });

    const maxOrders = Math.max(...Object.values(cityMap).map(c => c.orders), 1);
    const sorted: CityData[] = Object.entries(cityMap)
      .map(([city, data]) => ({
        city,
        orders: data.orders,
        revenue: data.revenue,
        intensity: data.orders / maxOrders,
      }))
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 20);

    setCityData(sorted);
    setCityLoading(false);
  };

  const getVariants = (pid: string) => variants.filter(v => v.product_id === pid);

  const lowStock = products.filter(p => p.stock > 0 && p.stock < 5);
  const deadStock = products.filter(p => p.sold === 0 && new Date(p.created_at) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const topSelling = [...products].sort((a, b) => b.sold - a.sold).slice(0, 20);

  const displayProducts = view === 'low-stock' ? lowStock :
    view === 'dead-stock' ? deadStock :
    view === 'top-selling' ? topSelling : products;

  const filtered = displayProducts.filter(p =>
    p.title?.toLowerCase().includes(search.toLowerCase()) ||
    p.brand?.toLowerCase().includes(search.toLowerCase())
  );

  const downloadCSV = () => {
    const headers = ['Title', 'Brand', 'Price', 'Stock', 'Sold', 'Discount %'];
    const rows = filtered.map(p => [p.title, p.brand || '', p.price, p.stock, p.sold, p.discount_percent || 0]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `inventory-${view}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const getHeatColor = (intensity: number) => {
    if (intensity > 0.8) return 'bg-red-500';
    if (intensity > 0.6) return 'bg-orange-500';
    if (intensity > 0.4) return 'bg-yellow-500';
    if (intensity > 0.2) return 'bg-green-400';
    return 'bg-blue-300';
  };

  const getHeatBg = (intensity: number) => {
    if (intensity > 0.8) return 'bg-red-50 border-red-200';
    if (intensity > 0.6) return 'bg-orange-50 border-orange-200';
    if (intensity > 0.4) return 'bg-yellow-50 border-yellow-200';
    if (intensity > 0.2) return 'bg-green-50 border-green-200';
    return 'bg-blue-50 border-blue-200';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold flex items-center gap-2"><Package className="h-5 w-5" /> Inventory Insights</h2>
        {view !== 'city-heatmap' && (
          <Button variant="outline" size="sm" onClick={downloadCSV} className="gap-1"><Download className="h-4 w-4" /> Download CSV</Button>
        )}
      </div>

      {/* View tabs */}
      <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
        <button onClick={() => setView('all')} className={`bg-card border rounded-lg p-3 text-center transition-all ${view === 'all' ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-accent'}`}>
          <p className="text-xs text-muted-foreground">All Products</p>
          <p className="text-xl font-bold">{products.length}</p>
        </button>
        <button onClick={() => setView('low-stock')} className={`bg-card border rounded-lg p-3 text-center transition-all ${view === 'low-stock' ? 'ring-2 ring-yellow-500 bg-yellow-50' : 'hover:bg-accent'}`}>
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><AlertTriangle className="h-3 w-3 text-yellow-500" /> Low Stock</p>
          <p className="text-xl font-bold text-yellow-600">{lowStock.length}</p>
        </button>
        <button onClick={() => setView('dead-stock')} className={`bg-card border rounded-lg p-3 text-center transition-all ${view === 'dead-stock' ? 'ring-2 ring-red-500 bg-red-50' : 'hover:bg-accent'}`}>
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><TrendingDown className="h-3 w-3 text-red-500" /> Dead Stock</p>
          <p className="text-xl font-bold text-red-600">{deadStock.length}</p>
        </button>
        <button onClick={() => setView('top-selling')} className={`bg-card border rounded-lg p-3 text-center transition-all ${view === 'top-selling' ? 'ring-2 ring-green-500 bg-green-50' : 'hover:bg-accent'}`}>
          <p className="text-xs text-muted-foreground">Top Selling</p>
          <p className="text-xl font-bold text-green-600">{topSelling.length}</p>
        </button>
        <button onClick={() => setView('city-heatmap')} className={`bg-card border rounded-lg p-3 text-center transition-all ${view === 'city-heatmap' ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-accent'}`}>
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><MapPin className="h-3 w-3 text-primary" /> City Heat</p>
          <p className="text-xl font-bold text-primary">Map</p>
        </button>
      </div>

      {/* City Heatmap View */}
      {view === 'city-heatmap' && (
        <div className="space-y-4">
          <div className="bg-card border rounded-xl p-4">
            <h3 className="font-semibold text-base flex items-center gap-2 mb-1">
              <BarChart3 className="h-5 w-5 text-primary" /> Sales Density Heatmap by City
            </h3>
            <p className="text-xs text-muted-foreground mb-4">Order concentration across Pakistan — brighter = more orders</p>

            {/* Legend */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <span className="text-xs text-muted-foreground">Low</span>
              {['bg-blue-300', 'bg-green-400', 'bg-yellow-500', 'bg-orange-500', 'bg-red-500'].map((c, i) => (
                <div key={i} className={`w-5 h-5 rounded ${c}`} />
              ))}
              <span className="text-xs text-muted-foreground">High</span>
            </div>

            {cityLoading ? (
              <div className="py-12 text-center text-muted-foreground">Loading city data...</div>
            ) : cityData.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No city data available yet. Orders with delivery addresses will appear here.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cityData.map((c, i) => (
                  <motion.div
                    key={c.city}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={`border rounded-lg p-3 ${getHeatBg(c.intensity)}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full shrink-0 ${getHeatColor(c.intensity)}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-sm">{c.city}</span>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-muted-foreground">{c.orders} orders</span>
                            <span className="font-medium text-primary">Rs. {c.revenue.toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="h-2 bg-white/60 rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${getHeatColor(c.intensity)}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${c.intensity * 100}%` }}
                            transition={{ duration: 0.8, delay: i * 0.04 + 0.2 }}
                          />
                        </div>
                      </div>
                      <span className="text-xs font-bold text-muted-foreground w-8 text-right">
                        #{i + 1}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Summary stats */}
          {!cityLoading && cityData.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-card border rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Cities Active</p>
                <p className="text-xl font-bold text-primary">{cityData.length}</p>
              </div>
              <div className="bg-card border rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Top City</p>
                <p className="text-sm font-bold truncate">{cityData[0]?.city}</p>
              </div>
              <div className="bg-card border rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Top City Orders</p>
                <p className="text-xl font-bold text-green-600">{cityData[0]?.orders}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Product table views */}
      {view !== 'city-heatmap' && (
        <>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>

          <div className="bg-card rounded-xl border overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50">
                <th className="text-left p-3">Product</th>
                <th className="text-left p-3">Price</th>
                <th className="text-left p-3">Stock</th>
                <th className="text-left p-3">Sold</th>
                <th className="text-left p-3">Variants</th>
                <th className="text-left p-3">Status</th>
              </tr></thead>
              <tbody>
                {filtered.map(p => {
                  const pvs = getVariants(p.id);
                  const zeroStock = pvs.filter(v => v.stock === 0);
                  return (
                    <tr key={p.id} className="border-b hover:bg-accent/50">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <img src={(p.images as any)?.[0] || '/placeholder.svg'} alt="" className="w-10 h-10 rounded object-cover" loading="lazy" />
                          <div>
                            <p className="font-medium truncate max-w-[200px]">{p.title}</p>
                            <p className="text-xs text-muted-foreground">{p.brand || '-'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">Rs. {Number(p.price).toLocaleString()}</td>
                      <td className="p-3"><span className={p.stock < 5 ? 'text-destructive font-bold' : ''}>{p.stock}</span></td>
                      <td className="p-3">{p.sold}</td>
                      <td className="p-3 text-xs">{pvs.length} total, {zeroStock.length} empty</td>
                      <td className="p-3">
                        {p.stock === 0 ? <Badge variant="destructive">Out of Stock</Badge> :
                         p.stock < 5 ? <Badge variant="secondary">Low Stock</Badge> :
                         <Badge variant="outline">In Stock</Badge>}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && <tr><td colSpan={6} className="text-center p-8 text-muted-foreground">No products found</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminInventoryInsights;
