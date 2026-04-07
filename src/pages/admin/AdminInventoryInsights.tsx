import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, AlertTriangle, TrendingDown, Package, Download } from 'lucide-react';
import AdminDateFilter from '@/components/admin/AdminDateFilter';

const AdminInventoryInsights = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'low-stock' | 'dead-stock' | 'top-selling' | 'all'>('all');

  useEffect(() => {
    const fetch = async () => {
      const { data: prods } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      setProducts(prods || []);
      const { data: vars } = await supabase.from('product_variants').select('*');
      setVariants(vars || []);
    };
    fetch();
  }, []);

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold flex items-center gap-2"><Package className="h-5 w-5" /> Inventory Insights</h2>
        <Button variant="outline" size="sm" onClick={downloadCSV} className="gap-1"><Download className="h-4 w-4" /> Download CSV</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button onClick={() => setView('all')} className={`bg-card border rounded-lg p-3 text-center ${view === 'all' ? 'ring-2 ring-primary' : ''}`}>
          <p className="text-xs text-muted-foreground">Total Products</p>
          <p className="text-xl font-bold">{products.length}</p>
        </button>
        <button onClick={() => setView('low-stock')} className={`bg-card border rounded-lg p-3 text-center ${view === 'low-stock' ? 'ring-2 ring-primary' : ''}`}>
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><AlertTriangle className="h-3 w-3 text-yellow-500" /> Low Stock</p>
          <p className="text-xl font-bold text-yellow-600">{lowStock.length}</p>
        </button>
        <button onClick={() => setView('dead-stock')} className={`bg-card border rounded-lg p-3 text-center ${view === 'dead-stock' ? 'ring-2 ring-primary' : ''}`}>
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><TrendingDown className="h-3 w-3 text-red-500" /> Dead Stock</p>
          <p className="text-xl font-bold text-red-600">{deadStock.length}</p>
        </button>
        <button onClick={() => setView('top-selling')} className={`bg-card border rounded-lg p-3 text-center ${view === 'top-selling' ? 'ring-2 ring-primary' : ''}`}>
          <p className="text-xs text-muted-foreground">Top Selling</p>
          <p className="text-xl font-bold text-green-600">{topSelling.length}</p>
        </button>
      </div>

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
                      <img src={(p.images as any)?.[0] || '/placeholder.svg'} alt="" className="w-10 h-10 rounded object-cover" />
                      <div>
                        <p className="font-medium truncate max-w-[200px]">{p.title}</p>
                        <p className="text-xs text-muted-foreground">{p.brand || '-'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">Rs. {Number(p.price).toLocaleString()}</td>
                  <td className="p-3"><span className={p.stock < 5 ? 'text-destructive font-bold' : ''}>{p.stock}</span></td>
                  <td className="p-3">{p.sold}</td>
                  <td className="p-3 text-xs">
                    {pvs.length} total, {zeroStock.length} empty
                  </td>
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
    </div>
  );
};

export default AdminInventoryInsights;
