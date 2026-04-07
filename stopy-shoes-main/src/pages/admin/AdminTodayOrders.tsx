import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import AdminDateFilter from '@/components/admin/AdminDateFilter';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700', confirmed: 'bg-blue-100 text-blue-700',
  processing: 'bg-purple-100 text-purple-700', shipped: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700',
};

const AdminTodayOrders = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [dateFilter, setDateFilter] = useState<Date | undefined>(new Date());

  const fetchOrders = async () => {
    const d = dateFilter || new Date();
    const start = new Date(d); start.setHours(0,0,0,0);
    const end = new Date(d); end.setHours(23,59,59,999);
    const { data } = await supabase.from('orders').select('*').gte('created_at', start.toISOString()).lte('created_at', end.toISOString()).order('created_at', { ascending: false });
    setOrders(data || []);
  };

  useEffect(() => { fetchOrders(); }, [dateFilter]);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('orders').update({ status: status as any }).eq('id', id);
    toast({ title: `Status: ${status}` });
    fetchOrders();
  };

  const totalAmount = orders.reduce((s, o) => s + Number(o.total || 0), 0);
  const codOrders = orders.filter(o => o.payment_method === 'cod');
  const onlineOrders = orders.filter(o => o.payment_method !== 'cod');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold">Orders</h2>
        <AdminDateFilter date={dateFilter} onDateChange={setDateFilter} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 text-center"><p className="text-xs text-muted-foreground">Total</p><p className="text-xl font-bold">{orders.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-xs text-muted-foreground">Amount</p><p className="text-xl font-bold">Rs. {totalAmount.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-xs text-muted-foreground">COD</p><p className="text-xl font-bold">{codOrders.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-xs text-muted-foreground">Online</p><p className="text-xl font-bold">{onlineOrders.length}</p></CardContent></Card>
      </div>

      <div className="bg-card rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50">
            <th className="text-left p-3">Order #</th>
            <th className="text-left p-3">Time</th>
            <th className="text-left p-3">Amount</th>
            <th className="text-left p-3">Payment</th>
            <th className="text-left p-3">Status</th>
            <th className="text-left p-3">Quick Actions</th>
          </tr></thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id} className="border-b hover:bg-accent/50">
                <td className="p-3 font-mono text-xs">{o.order_number}</td>
                <td className="p-3 text-xs">{new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                <td className="p-3 font-bold">Rs. {Number(o.total).toLocaleString()}</td>
                <td className="p-3"><Badge variant="outline">{o.payment_method}</Badge></td>
                <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs ${statusColors[o.status] || ''}`}>{o.status}</span></td>
                <td className="p-3">
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => updateStatus(o.id, 'confirmed')}>Confirm</Button>
                    <Button size="sm" variant="outline" onClick={() => updateStatus(o.id, 'shipped')}>Ship</Button>
                    <Button size="sm" variant="outline" onClick={() => updateStatus(o.id, 'cancelled')}>Cancel</Button>
                  </div>
                </td>
              </tr>
            ))}
            {orders.length === 0 && <tr><td colSpan={6} className="text-center p-8 text-muted-foreground">No orders found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminTodayOrders;
