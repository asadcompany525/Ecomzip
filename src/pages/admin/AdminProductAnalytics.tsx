import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, Download, Printer } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const AdminProductAnalytics = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [searchCode, setSearchCode] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [dateFilter, setDateFilter] = useState('all');

  useEffect(() => {
    const fetch = async () => {
      const [{ data: prods }, { data: items }] = await Promise.all([
        supabase.from('products').select('*').order('created_at', { ascending: false }),
        supabase.from('order_items').select('*, orders(*)').order('created_at', { ascending: false }),
      ]);
      setProducts(prods || []);
      setOrderItems(items || []);
    };
    fetch();
  }, []);

  const searchProduct = () => {
    if (!searchCode.trim()) return;
    const found = products.find(p => p.title?.toLowerCase().includes(searchCode.toLowerCase()) || p.id.startsWith(searchCode));
    if (found) {
      setSelectedProduct(found);
    } else {
      toast({ title: 'Product not found', variant: 'destructive' });
    }
  };

  const getProductSales = (productId: string) => {
    let items = orderItems.filter(i => i.product_id === productId);
    if (dateFilter === 'today') {
      const today = new Date(); today.setHours(0,0,0,0);
      items = items.filter(i => new Date(i.created_at) >= today);
    } else if (dateFilter === 'week') {
      const w = new Date(); w.setDate(w.getDate() - 7);
      items = items.filter(i => new Date(i.created_at) >= w);
    } else if (dateFilter === 'month') {
      const m = new Date(); m.setDate(1);
      items = items.filter(i => new Date(i.created_at) >= m);
    }
    return items;
  };

  const printReport = () => {
    const win = window.open('', '_blank');
    if (!win || !selectedProduct) return;
    const sales = getProductSales(selectedProduct.id);
    const totalQty = sales.reduce((s, i) => s + i.quantity, 0);
    const totalRev = sales.reduce((s, i) => s + (Number(i.price) * i.quantity), 0);
    win.document.write(`<!DOCTYPE html><html><head><title>Report - ${selectedProduct.title}</title>
      <style>*{font-family:sans-serif;margin:0;padding:0}body{padding:20px}h1{font-size:18px;margin-bottom:8px}table{width:100%;border-collapse:collapse;margin-top:10px}th,td{border:1px solid #ddd;padding:6px;font-size:12px;text-align:left}th{background:#f5f5f5}.total{font-weight:bold;background:#e5e5e5}</style>
    </head><body>
      <h1>📊 Product Report: ${selectedProduct.title}</h1>
      <p>Price: Rs. ${selectedProduct.price} | Stock: ${selectedProduct.stock} | Sold: ${selectedProduct.sold}</p>
      <p>Discount: ${selectedProduct.discount_percent || 0}%</p>
      <table><thead><tr><th>Date</th><th>Size</th><th>Color</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
      <tbody>${sales.map(s => `<tr><td>${new Date(s.created_at).toLocaleDateString()}</td><td>${s.size||'-'}</td><td>${s.color||'-'}</td><td>${s.quantity}</td><td>Rs.${Number(s.price).toLocaleString()}</td><td>Rs.${(Number(s.price)*s.quantity).toLocaleString()}</td></tr>`).join('')}
      <tr class="total"><td colspan="3">Total</td><td>${totalQty}</td><td></td><td>Rs.${totalRev.toLocaleString()}</td></tr></tbody></table>
    </body></html>`);
    win.document.close(); win.print();
  };

  const sales = selectedProduct ? getProductSales(selectedProduct.id) : [];
  const discountSales = sales.filter(s => {
    const order = (s as any).orders;
    return order?.discount_amount > 0;
  });

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">📊 Product Analytics</h2>
      
      <div className="flex gap-2">
        <Input value={searchCode} onChange={e => setSearchCode(e.target.value)} placeholder="Product name or ID..." className="max-w-sm" onKeyDown={e => e.key === 'Enter' && searchProduct()} />
        <Button onClick={searchProduct}><Search className="h-4 w-4 mr-1" /> Search</Button>
        <select value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="border rounded-lg px-3 text-sm">
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
        </select>
      </div>

      {selectedProduct && (
        <div className="space-y-4">
          <div className="bg-card border rounded-xl p-4 flex gap-4 items-center">
            <img src={(selectedProduct.images as string[])?.[0] || '/placeholder.svg'} alt="" className="w-16 h-16 rounded object-cover" />
            <div className="flex-1">
              <h3 className="font-bold">{selectedProduct.title}</h3>
              <p className="text-sm text-muted-foreground">Price: Rs. {selectedProduct.price?.toLocaleString()} | Stock: {selectedProduct.stock} | Sold: {selectedProduct.sold}</p>
              <p className="text-sm">Discount: {selectedProduct.discount_percent || 0}% | Flash: {selectedProduct.is_flash_sale ? 'Yes' : 'No'}</p>
            </div>
            <Button onClick={printReport} className="gap-1"><Printer className="h-4 w-4" /> Print / Download</Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-card border rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Total Sales</p>
              <p className="text-xl font-bold">{sales.length}</p>
            </div>
            <div className="bg-card border rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Qty Sold</p>
              <p className="text-xl font-bold">{sales.reduce((s, i) => s + i.quantity, 0)}</p>
            </div>
            <div className="bg-card border rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Revenue</p>
              <p className="text-xl font-bold">Rs. {sales.reduce((s, i) => s + (Number(i.price) * i.quantity), 0).toLocaleString()}</p>
            </div>
            <div className="bg-card border rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Discount Sales</p>
              <p className="text-xl font-bold">{discountSales.length}</p>
            </div>
          </div>

          <div className="bg-card rounded-xl border overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50">
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">Size</th>
                <th className="text-left p-3">Color</th>
                <th className="text-left p-3">Qty</th>
                <th className="text-left p-3">Price</th>
                <th className="text-left p-3">Total</th>
              </tr></thead>
              <tbody>
                {sales.map(s => (
                  <tr key={s.id} className="border-b">
                    <td className="p-3 text-xs">{new Date(s.created_at).toLocaleDateString()}</td>
                    <td className="p-3">{s.size || '-'}</td>
                    <td className="p-3">{s.color || '-'}</td>
                    <td className="p-3">{s.quantity}</td>
                    <td className="p-3">Rs. {Number(s.price).toLocaleString()}</td>
                    <td className="p-3 font-medium">Rs. {(Number(s.price) * s.quantity).toLocaleString()}</td>
                  </tr>
                ))}
                {sales.length === 0 && <tr><td colSpan={6} className="text-center p-8 text-muted-foreground">No sales data</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!selectedProduct && (
        <div className="text-center p-12 text-muted-foreground">
          <p className="text-4xl mb-3">📊</p>
          <p>Product name or ID search کر کے analytics دیکھیں</p>
        </div>
      )}
    </div>
  );
};

export default AdminProductAnalytics;
