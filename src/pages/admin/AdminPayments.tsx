import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import AdminDateFilter from '@/components/admin/AdminDateFilter';
import { format } from 'date-fns';

const AdminPayments = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [methodFilter, setMethodFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<Date | undefined>(new Date());

  useEffect(() => {
    const fetchData = async () => {
      let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (methodFilter !== 'all') query = query.eq('payment_method', methodFilter as any);
      if (dateFilter) {
        const start = new Date(dateFilter); start.setHours(0, 0, 0, 0);
        const end = new Date(dateFilter); end.setHours(23, 59, 59, 999);
        query = query.gte('created_at', start.toISOString()).lte('created_at', end.toISOString());
      }
      const { data } = await query;
      setOrders(data || []);
    };
    fetchData();
  }, [methodFilter, dateFilter]);

  const updatePayStatus = async (id: string, status: string) => {
    await supabase.from('orders').update({ payment_status: status as any }).eq('id', id);
    toast({ title: `Payment marked ${status}` });
    setOrders(prev => prev.map(o => o.id === id ? { ...o, payment_status: status } : o));
  };

  const getProof = (o: any) => {
    const match = (o.notes || '').match(/Payment Proof: (https?:\/\/[^\s]+)/);
    return match?.[1];
  };

  const getTxId = (o: any) => {
    const match = (o.notes || '').match(/TxID: ([^\s]+)/);
    return match?.[1];
  };

  const stats = {
    total: orders.length,
    paid: orders.filter(o => o.payment_status === 'paid').length,
    pending: orders.filter(o => o.payment_status === 'pending').length,
    amount: orders.reduce((s, o) => s + Number(o.total || 0), 0),
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 text-center"><p className="text-xs text-muted-foreground">Total</p><p className="text-xl font-bold">{stats.total}</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-xs text-muted-foreground">Paid</p><p className="text-xl font-bold text-green-600">{stats.paid}</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-xs text-muted-foreground">Pending</p><p className="text-xl font-bold text-orange-500">{stats.pending}</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-xs text-muted-foreground">Amount</p><p className="text-xl font-bold">Rs. {stats.amount.toLocaleString()}</p></CardContent></Card>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <AdminDateFilter date={dateFilter} onDateChange={setDateFilter} />
        <Select value={methodFilter} onValueChange={setMethodFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Methods</SelectItem>
            {['cod','bank_transfer','jazzcash','easypaisa','stripe'].map(m => (
            <SelectItem key={m} value={m}>{m.toUpperCase()}</SelectItem>
          ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50">
            <th className="text-left p-3">Order #</th>
            <th className="text-left p-3">Method</th>
            <th className="text-left p-3">Amount</th>
            <th className="text-left p-3">Status</th>
            <th className="text-left p-3">TxID</th>
            <th className="text-left p-3">Proof</th>
            <th className="text-left p-3">Actions</th>
          </tr></thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id} className="border-b hover:bg-accent/50">
                <td className="p-3 font-mono text-xs">{o.order_number}</td>
                <td className="p-3"><Badge variant="outline">{o.payment_method}</Badge></td>
                <td className="p-3 font-bold">Rs. {Number(o.total).toLocaleString()}</td>
                <td className="p-3"><Badge variant={o.payment_status === 'paid' ? 'default' : 'secondary'}>{o.payment_status}</Badge></td>
                <td className="p-3 text-xs font-mono">{getTxId(o) || '-'}</td>
                <td className="p-3">
                  {getProof(o) ? (
                    <a href={getProof(o)} target="_blank" rel="noopener"><img src={getProof(o)} alt="proof" className="w-10 h-10 object-cover rounded border" /></a>
                  ) : '-'}
                </td>
                <td className="p-3">
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => updatePayStatus(o.id, 'paid')}>✅ Paid</Button>
                    <Button size="sm" variant="outline" onClick={() => updatePayStatus(o.id, 'failed')}>❌ Failed</Button>
                  </div>
                </td>
              </tr>
            ))}
            {orders.length === 0 && <tr><td colSpan={7} className="text-center p-8 text-muted-foreground">No orders</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminPayments;
