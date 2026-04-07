import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle } from 'lucide-react';

const AdminStockAlerts = () => {
  const [lowStock, setLowStock] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('products').select('*').lt('stock', 5).eq('is_active', true).order('stock').then(({ data }) => setLowStock(data || []));
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" /> Low Stock Alerts</h2>
      <div className="bg-card rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50">
            <th className="text-left p-3">Product</th>
            <th className="text-left p-3">Stock</th>
            <th className="text-left p-3">Sold</th>
          </tr></thead>
          <tbody>
            {lowStock.map(p => (
              <tr key={p.id} className="border-b hover:bg-accent/50">
                <td className="p-3 font-medium">{p.title}</td>
                <td className="p-3 text-destructive font-bold">{p.stock}</td>
                <td className="p-3">{p.sold}</td>
              </tr>
            ))}
            {lowStock.length === 0 && <tr><td colSpan={3} className="text-center p-8 text-muted-foreground">All stock levels are healthy! ✅</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminStockAlerts;
