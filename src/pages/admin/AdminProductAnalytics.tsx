import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Download, Printer, TrendingUp, Package, DollarSign, ShoppingCart, Star, BarChart3 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316', '#ec4899'];

const AdminProductAnalytics = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [searchCode, setSearchCode] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [dateFilter, setDateFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const [{ data: prods }, { data: items }, { data: revs }] = await Promise.all([
        supabase.from('products').select('*').eq('is_active', true).order('sold', { ascending: false }),
        supabase.from('order_items').select('*, orders(*)').order('created_at', { ascending: false }),
        supabase.from('reviews').select('product_id, rating, is_approved').eq('is_approved', true),
      ]);
      setProducts(prods || []);
      setOrderItems(items || []);
      setReviews(revs || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const getProductSales = (productId: string) => {
    let items = orderItems.filter(i => i.product_id === productId);
    const now = new Date();
    if (dateFilter === 'today') { const d = new Date(now); d.setHours(0,0,0,0); items = items.filter(i => new Date(i.created_at) >= d); }
    else if (dateFilter === 'week') { const d = new Date(now); d.setDate(d.getDate()-7); items = items.filter(i => new Date(i.created_at) >= d); }
    else if (dateFilter === 'month') { const d = new Date(now); d.setDate(1); d.setHours(0,0,0,0); items = items.filter(i => new Date(i.created_at) >= d); }
    return items;
  };

  const getProductRating = (productId: string) => {
    const r = reviews.filter(r => r.product_id === productId);
    if (!r.length) return { avg: 0, count: 0 };
    return { avg: Math.round(r.reduce((s, x) => s + x.rating, 0) / r.length * 10) / 10, count: r.length };
  };

  const searchProduct = () => {
    if (!searchCode.trim()) return;
    const q = searchCode.toLowerCase();
    const found = products.find(p =>
      p.title?.toLowerCase().includes(q) ||
      p.id.startsWith(q) ||
      ((p.tags as string[])?.[0] || '').toLowerCase().includes(q) ||
      p.brand?.toLowerCase().includes(q)
    );
    if (found) setSelectedProduct(found);
    else toast({ title: 'Product not found', variant: 'destructive' });
  };

  const printReport = () => {
    if (!selectedProduct) return;
    const sales = getProductSales(selectedProduct.id);
    const win = window.open('', '_blank');
    if (!win) return;
    const totalQty = sales.reduce((s, i) => s + i.quantity, 0);
    const totalRev = sales.reduce((s, i) => s + (Number(i.price) * i.quantity), 0);
    win.document.write(`<!DOCTYPE html><html><head><title>Report — ${selectedProduct.title}</title>
      <style>*{font-family:sans-serif}body{padding:20px}h1{font-size:18px;margin-bottom:8px}table{width:100%;border-collapse:collapse;margin-top:10px}th,td{border:1px solid #ddd;padding:6px;font-size:12px;text-align:left}th{background:#f5f5f5}.total{font-weight:bold;background:#e5e5e5}</style>
    </head><body>
      <h1>📊 ${selectedProduct.title}</h1>
      <p>Price: Rs. ${selectedProduct.price} | Stock: ${selectedProduct.stock} | Sold: ${selectedProduct.sold}</p>
      <table><thead><tr><th>Date</th><th>Size</th><th>Color</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
      <tbody>${sales.map(s => `<tr><td>${new Date(s.created_at).toLocaleDateString()}</td><td>${s.size||'—'}</td><td>${s.color||'—'}</td><td>${s.quantity}</td><td>Rs.${Number(s.price).toLocaleString()}</td><td>Rs.${(Number(s.price)*s.quantity).toLocaleString()}</td></tr>`).join('')}
      <tr class="total"><td colspan="3">Total</td><td>${totalQty}</td><td></td><td>Rs.${totalRev.toLocaleString()}</td></tr></tbody></table>
    </body></html>`);
    win.document.close(); win.print();
  };

  // Top 10 products by sales for chart
  const topProducts = useMemo(() => {
    return products.slice(0, 10).map(p => {
      const sales = getProductSales(p.id);
      const revenue = sales.reduce((s, i) => s + Number(i.price) * i.quantity, 0);
      return { name: p.title?.split(' ').slice(0,2).join(' ') || p.id.slice(0,8), revenue, qty: sales.reduce((s, i) => s + i.quantity, 0), product: p };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [products, orderItems, dateFilter]);

  // Category pie chart
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    products.forEach(p => {
      const cat = p.category_id || 'Other';
      map[cat] = (map[cat] || 0) + (p.sold || 0);
    });
    return Object.entries(map).slice(0, 8).map(([name, value]) => ({ name: name.slice(0,12), value }));
  }, [products]);

  const sales = selectedProduct ? getProductSales(selectedProduct.id) : [];
  const selRating = selectedProduct ? getProductRating(selectedProduct.id) : { avg: 0, count: 0 };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-xl"><BarChart3 className="h-5 w-5 text-blue-600" /></div>
          <div>
            <h2 className="text-xl font-bold">Product Analytics</h2>
            <p className="text-sm text-muted-foreground">{products.length} active products tracked</p>
          </div>
        </div>
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchCode} onChange={e => setSearchCode(e.target.value)}
            placeholder="Search by name, code, brand..."
            className="pl-9" onKeyDown={e => e.key === 'Enter' && searchProduct()}
          />
        </div>
        <Button onClick={searchProduct}>Search</Button>
        {selectedProduct && <Button variant="outline" onClick={() => setSelectedProduct(null)}>Clear</Button>}
      </div>

      {/* Overview Charts */}
      {!selectedProduct && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Top 10 Products by Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              {topProducts.some(p => p.revenue > 0) ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={topProducts} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `${Math.round(v/1000)}k`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={70} />
                    <Tooltip formatter={(v: any) => [`Rs. ${Number(v).toLocaleString()}`, 'Revenue']} />
                    <Bar dataKey="revenue" fill="#6366f1" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                  No sales data yet — run the seed SQL to add demo data
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Sales by Category</CardTitle>
            </CardHeader>
            <CardContent>
              {categoryData.some(c => c.value > 0) ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={categoryData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${Math.round(percent*100)}%`} labelLine={false}>
                      {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                  No sold data yet
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* All Products Table (when no product selected) */}
      {!selectedProduct && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">All Products Performance</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/40">
                  <th className="text-left p-3 text-xs font-semibold">Product</th>
                  <th className="text-left p-3 text-xs font-semibold">Price</th>
                  <th className="text-left p-3 text-xs font-semibold">Stock</th>
                  <th className="text-left p-3 text-xs font-semibold">Sold</th>
                  <th className="text-left p-3 text-xs font-semibold">Rating</th>
                  <th className="text-left p-3 text-xs font-semibold">Revenue</th>
                  <th className="text-left p-3 text-xs font-semibold">Orders</th>
                  <th className="text-left p-3 text-xs font-semibold"></th>
                </tr></thead>
                <tbody>
                  {products.map(p => {
                    const s = getProductSales(p.id);
                    const rev = s.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);
                    const { avg, count } = getProductRating(p.id);
                    return (
                      <tr key={p.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <img src={(p.images as string[])?.[0] || '/placeholder.svg'} alt="" className="w-9 h-9 rounded-lg object-cover border" />
                            <div>
                              <p className="text-xs font-medium line-clamp-1 max-w-[160px]">{p.title}</p>
                              <p className="text-[10px] text-muted-foreground">{p.brand}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-sm font-medium">Rs. {Number(p.price).toLocaleString()}</td>
                        <td className="p-3">
                          <Badge variant={p.stock <= 5 ? 'destructive' : p.stock <= 20 ? 'secondary' : 'outline'} className="text-xs">
                            {p.stock}
                          </Badge>
                        </td>
                        <td className="p-3 text-sm">{p.sold || 0}</td>
                        <td className="p-3">
                          {avg > 0 ? (
                            <span className="flex items-center gap-1 text-xs">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />{avg} ({count})
                            </span>
                          ) : <span className="text-muted-foreground text-xs">—</span>}
                        </td>
                        <td className="p-3 text-sm font-semibold text-emerald-600">
                          {rev > 0 ? `Rs. ${rev.toLocaleString()}` : '—'}
                        </td>
                        <td className="p-3 text-sm">{s.length > 0 ? s.length : '—'}</td>
                        <td className="p-3">
                          <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => setSelectedProduct(p)}>
                            <BarChart3 className="h-3 w-3 mr-1" />Detail
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {products.length === 0 && (
                    <tr><td colSpan={8} className="text-center p-12 text-muted-foreground">No products found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Product Detail */}
      {selectedProduct && (
        <div className="space-y-4">
          <div className="bg-card border rounded-xl p-4 flex gap-4 items-start">
            <img src={(selectedProduct.images as string[])?.[0] || '/placeholder.svg'} alt="" className="w-20 h-20 rounded-xl object-cover border" />
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-base">{selectedProduct.title}</h3>
              <p className="text-sm text-muted-foreground">{selectedProduct.brand}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline">Rs. {Number(selectedProduct.price).toLocaleString()}</Badge>
                <Badge variant={selectedProduct.stock <= 5 ? 'destructive' : 'secondary'}>Stock: {selectedProduct.stock}</Badge>
                <Badge variant="outline">{selectedProduct.sold || 0} sold</Badge>
                {selRating.avg > 0 && <Badge variant="outline">⭐ {selRating.avg} ({selRating.count})</Badge>}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button onClick={printReport} variant="outline" size="sm" className="gap-1"><Printer className="h-3.5 w-3.5" />Print</Button>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total Orders', value: sales.length, icon: ShoppingCart, color: 'text-blue-600 bg-blue-50' },
              { label: 'Units Sold', value: sales.reduce((s, i) => s + i.quantity, 0), icon: Package, color: 'text-indigo-600 bg-indigo-50' },
              { label: 'Revenue', value: `Rs. ${sales.reduce((s, i) => s + Number(i.price)*i.quantity, 0).toLocaleString()}`, icon: DollarSign, color: 'text-emerald-600 bg-emerald-50' },
              { label: 'Avg Rating', value: selRating.avg > 0 ? `${selRating.avg} ★` : '—', icon: Star, color: 'text-amber-600 bg-amber-50' },
            ].map(k => (
              <Card key={k.label}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-xl ${k.color.split(' ')[1]} flex items-center justify-center`}>
                    <k.icon className={`h-4 w-4 ${k.color.split(' ')[0]}`} />
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">{k.label}</p>
                    <p className="text-base font-bold">{k.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Sales Table */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Order History</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-muted/40">
                    <th className="text-left p-3 text-xs font-semibold">Date</th>
                    <th className="text-left p-3 text-xs font-semibold">Size</th>
                    <th className="text-left p-3 text-xs font-semibold">Color</th>
                    <th className="text-left p-3 text-xs font-semibold">Qty</th>
                    <th className="text-left p-3 text-xs font-semibold">Price</th>
                    <th className="text-left p-3 text-xs font-semibold">Total</th>
                  </tr></thead>
                  <tbody>
                    {sales.map(s => (
                      <tr key={s.id} className="border-b hover:bg-muted/30">
                        <td className="p-3 text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</td>
                        <td className="p-3"><Badge variant="outline" className="text-xs">{s.size || '—'}</Badge></td>
                        <td className="p-3 text-xs">{s.color || '—'}</td>
                        <td className="p-3 font-medium">{s.quantity}</td>
                        <td className="p-3">Rs. {Number(s.price).toLocaleString()}</td>
                        <td className="p-3 font-semibold text-emerald-600">Rs. {(Number(s.price)*s.quantity).toLocaleString()}</td>
                      </tr>
                    ))}
                    {sales.length === 0 && (
                      <tr><td colSpan={6} className="text-center p-8 text-muted-foreground">No orders in this period</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminProductAnalytics;
