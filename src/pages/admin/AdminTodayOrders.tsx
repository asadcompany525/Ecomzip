import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import AdminDateFilter from '@/components/admin/AdminDateFilter';
import { format } from 'date-fns';
import { ShoppingCart, RefreshCw, CheckCircle, Truck, XCircle } from 'lucide-react';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  confirmed: 'bg-blue-100 text-blue-700 border-blue-200',
  processing: 'bg-purple-100 text-purple-700 border-purple-200',
  shipped: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  delivered: 'bg-green-100 text-green-700 border-green-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
};

const AdminTodayOrders = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<Date | undefined>(new Date());

  const fetchOrders = async () => {
    setLoading(true);
    const d = dateFilter || new Date();
    const start = new Date(d); start.setHours(0, 0, 0, 0);
    const end = new Date(d); end.setHours(23, 59, 59, 999);
    const { data } = await supabase.from('orders').select('*')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: false });
    setOrders(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, [dateFilter]);

  const updateStatus = (id: string, status: string) => {
    // INSTANT
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    toast({ title: `✅ Order ${status}` });
    // Background DB write
    supabase.from('orders').update({ status: status as any }).eq('id', id).then(({ error }) => {
      if (error) toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    });
  };

  const totalAmount = orders.reduce((s, o) => s + Number(o.total || 0), 0);
  const codOrders = orders.filter(o => o.payment_method === 'cod');
  const onlineOrders = orders.filter(o => o.payment_method !== 'cod');
  const pendingOrders = orders.filter(o => o.status === 'pending');

  const isToday = dateFilter?.toDateString() === new Date().toDateString();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-xl"><ShoppingCart className="h-5 w-5 text-green-600" /></div>
          <div>
            <h2 className="text-xl font-bold">{isToday ? "Today's" : format(dateFilter || new Date(), 'MMM d')} Orders</h2>
            <p className="text-sm text-muted-foreground">{orders.length} orders · Rs. {totalAmount.toLocaleString()} revenue</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={fetchOrders} className="h-8 gap-1">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <AdminDateFilter date={dateFilter} onDateChange={setDateFilter} />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Orders', value: orders.length, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Revenue', value: `Rs. ${totalAmount.toLocaleString()}`, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'COD', value: codOrders.length, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Pending', value: pendingOrders.length, color: 'text-yellow-600', bg: 'bg-yellow-50' },
        ].map(k => (
          <div key={k.label} className={`${k.bg} rounded-xl p-3 text-center`}>
            <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="bg-card rounded-xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left p-3 text-xs font-semibold">Order #</th>
                <th className="text-left p-3 text-xs font-semibold">Time</th>
                <th className="text-left p-3 text-xs font-semibold">Amount</th>
                <th className="text-left p-3 text-xs font-semibold">Payment</th>
                <th className="text-left p-3 text-xs font-semibold">Status</th>
                <th className="text-left p-3 text-xs font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} className="border-b hover:bg-muted/30 transition-colors">
                  <td className="p-3 font-mono text-xs font-bold">{o.order_number}</td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="p-3 font-bold text-emerald-700">Rs. {Number(o.total).toLocaleString()}</td>
                  <td className="p-3">
                    <Badge variant="outline" className="text-xs uppercase">{o.payment_method}</Badge>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${statusColors[o.status] || 'bg-muted text-muted-foreground'}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-blue-700 border-blue-200 hover:bg-blue-50"
                        onClick={() => updateStatus(o.id, 'confirmed')}
                        disabled={o.status === 'confirmed'}>
                        <CheckCircle className="h-3 w-3" /> Confirm
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                        onClick={() => updateStatus(o.id, 'shipped')}
                        disabled={o.status === 'shipped'}>
                        <Truck className="h-3 w-3" /> Ship
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-red-700 border-red-200 hover:bg-red-50"
                        onClick={() => updateStatus(o.id, 'cancelled')}
                        disabled={o.status === 'cancelled'}>
                        <XCircle className="h-3 w-3" /> Cancel
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center p-12 text-muted-foreground">
                    <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p>No orders for this date</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminTodayOrders;
