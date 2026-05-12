import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, Package, TrendingDown, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const AdminStockAlerts = () => {
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [outOfStock, setOutOfStock] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [threshold, setThreshold] = useState(5);

  const fetch = async () => {
    setLoading(true);
    const [low, out] = await Promise.all([
      supabase.from('products').select('id, title, stock, sold, price, images').gt('stock', 0).lt('stock', threshold).eq('is_active', true).order('stock'),
      supabase.from('products').select('id, title, stock, sold, price, images').eq('stock', 0).eq('is_active', true).order('sold', { ascending: false }),
    ]);
    setLowStock(low.data || []);
    setOutOfStock(out.data || []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [threshold]);

  const allAlerts = [...outOfStock, ...lowStock];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-xl"><AlertTriangle className="h-5 w-5 text-red-600" /></div>
          <div>
            <h2 className="text-xl font-bold">Stock Alerts</h2>
            <p className="text-sm text-muted-foreground">{outOfStock.length} out of stock · {lowStock.length} running low</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Low stock threshold:</span>
          <select
            value={threshold}
            onChange={e => setThreshold(Number(e.target.value))}
            className="text-sm border rounded-lg px-2 py-1.5 bg-card focus:outline-none"
          >
            {[3, 5, 10, 20].map(v => <option key={v} value={v}>{v} units</option>)}
          </select>
          <Button size="sm" variant="outline" onClick={fetch} className="h-8 gap-1">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{outOfStock.length}</p>
          <p className="text-xs text-red-700 font-medium mt-1">Out of Stock</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-orange-600">{lowStock.length}</p>
          <p className="text-xs text-orange-700 font-medium mt-1">Running Low (&lt;{threshold})</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{allAlerts.reduce((s, p) => s + (p.sold || 0), 0)}</p>
          <p className="text-xs text-emerald-700 font-medium mt-1">Total Sold (alerted)</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}
        </div>
      ) : allAlerts.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border">
          <Package className="h-14 w-14 mx-auto mb-3 text-emerald-500/50" />
          <p className="font-semibold text-emerald-700">All stock levels are healthy!</p>
          <p className="text-sm text-muted-foreground mt-1">No products are below the {threshold}-unit threshold</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left p-3 font-semibold text-xs">Product</th>
                <th className="text-left p-3 font-semibold text-xs">Stock</th>
                <th className="text-left p-3 font-semibold text-xs">Sold</th>
                <th className="text-left p-3 font-semibold text-xs">Price</th>
                <th className="text-left p-3 font-semibold text-xs">Status</th>
                <th className="text-left p-3 font-semibold text-xs">Action</th>
              </tr>
            </thead>
            <tbody>
              {allAlerts.map(p => (
                <tr key={p.id} className="border-b hover:bg-muted/30 transition-colors">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <img src={(p.images as string[])?.[0] || '/placeholder.svg'} alt="" className="w-9 h-9 rounded-lg object-cover border" />
                      <span className="font-medium text-xs max-w-[160px] truncate">{p.title}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={`font-bold text-base ${p.stock === 0 ? 'text-red-600' : 'text-orange-600'}`}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground">{p.sold || 0}</td>
                  <td className="p-3 text-xs">Rs. {Number(p.price).toLocaleString()}</td>
                  <td className="p-3">
                    <Badge className={p.stock === 0
                      ? 'bg-red-100 text-red-800 border-0 text-xs'
                      : 'bg-orange-100 text-orange-800 border-0 text-xs'}>
                      {p.stock === 0 ? 'Out of Stock' : 'Low Stock'}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <Link to="/admin/products">
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                        <TrendingDown className="h-3 w-3" /> Restock
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminStockAlerts;
