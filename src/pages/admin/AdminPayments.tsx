import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import AdminDateFilter from '@/components/admin/AdminDateFilter';
import { CreditCard, CheckCircle2, XCircle, RefreshCw, ExternalLink } from 'lucide-react';

const payStatusStyle: Record<string, string> = {
  paid: 'bg-green-100 text-green-800 border-green-200',
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  failed: 'bg-red-100 text-red-800 border-red-200',
};

const AdminPayments = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [methodFilter, setMethodFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<Date | undefined>(new Date());
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (methodFilter !== 'all') query = query.eq('payment_method', methodFilter as any);
    if (dateFilter) {
      const start = new Date(dateFilter); start.setHours(0, 0, 0, 0);
      const end = new Date(dateFilter); end.setHours(23, 59, 59, 999);
      query = query.gte('created_at', start.toISOString()).lte('created_at', end.toISOString());
    }
    const { data } = await query;
    setOrders(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [methodFilter, dateFilter]);

  const updatePayStatus = async (id: string, status: string) => {
    setUpdating(id + status);
    await supabase.from('orders').update({ payment_status: status as any }).eq('id', id);
    toast({ title: `Payment marked ${status}` });
    setOrders(prev => prev.map(o => o.id === id ? { ...o, payment_status: status } : o));
    setUpdating(null);
  };

  const getProof = (o: any) => {
    const match = (o.notes || '').match(/Payment Proof: (https?:\/\/[^\s]+)/);
    return match?.[1];
  };

  const getTxId = (o: any) => {
    const match = (o.notes || '').match(/TxID: ([^\s]+)/);
    return match?.[1];
  };

  const paid = orders.filter(o => o.payment_status === 'paid');
  const pending = orders.filter(o => o.payment_status === 'pending');
  const totalAmount = orders.reduce((s, o) => s + Number(o.total || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-xl"><CreditCard className="h-5 w-5 text-blue-600" /></div>
          <div>
            <h2 className="text-xl font-bold">Payments</h2>
            <p className="text-sm text-muted-foreground">{orders.length} transactions · Rs. {totalAmount.toLocaleString()} total</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={fetchData} className="h-8 gap-1">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-blue-600">{orders.length}</p>
          <p className="text-xs text-blue-700 font-medium">Total</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{paid.length}</p>
          <p className="text-xs text-green-700 font-medium">Paid</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-yellow-600">{pending.length}</p>
          <p className="text-xs text-yellow-700 font-medium">Pending</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-emerald-600">Rs. {(paid.reduce((s, o) => s + Number(o.total || 0), 0)).toLocaleString()}</p>
          <p className="text-xs text-emerald-700 font-medium">Collected</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <AdminDateFilter date={dateFilter} onDateChange={setDateFilter} />
        <Select value={methodFilter} onValueChange={setMethodFilter}>
          <SelectTrigger className="w-44 h-9"><SelectValue placeholder="All Methods" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Methods</SelectItem>
            {['cod', 'bank_transfer', 'jazzcash', 'easypaisa', 'stripe'].map(m => (
              <SelectItem key={m} value={m}>{m.replace('_', ' ').toUpperCase()}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3, 4].map(i => <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : (
        <div className="bg-card rounded-xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left p-3 text-xs font-semibold">Order #</th>
                <th className="text-left p-3 text-xs font-semibold">Date</th>
                <th className="text-left p-3 text-xs font-semibold">Method</th>
                <th className="text-left p-3 text-xs font-semibold">Amount</th>
                <th className="text-left p-3 text-xs font-semibold">Status</th>
                <th className="text-left p-3 text-xs font-semibold">TxID</th>
                <th className="text-left p-3 text-xs font-semibold">Proof</th>
                <th className="text-left p-3 text-xs font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} className="border-b hover:bg-muted/30 transition-colors">
                  <td className="p-3 font-mono text-xs font-bold">{o.order_number}</td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {new Date(o.created_at).toLocaleDateString('en-PK', { day: '2-digit', month: 'short' })}
                  </td>
                  <td className="p-3">
                    <Badge variant="outline" className="text-xs uppercase">{o.payment_method?.replace('_', ' ')}</Badge>
                  </td>
                  <td className="p-3 font-bold text-emerald-700">Rs. {Number(o.total).toLocaleString()}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${payStatusStyle[o.payment_status] || 'bg-muted text-muted-foreground'}`}>
                      {o.payment_status}
                    </span>
                  </td>
                  <td className="p-3 text-xs font-mono text-muted-foreground">{getTxId(o) || '—'}</td>
                  <td className="p-3">
                    {getProof(o) ? (
                      <a href={getProof(o)} target="_blank" rel="noopener" className="block">
                        <img src={getProof(o)} alt="proof" className="w-9 h-9 object-cover rounded-lg border hover:scale-110 transition-transform" />
                      </a>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-green-700 border-green-200 hover:bg-green-50"
                        onClick={() => updatePayStatus(o.id, 'paid')}
                        disabled={updating === o.id + 'paid' || o.payment_status === 'paid'}>
                        <CheckCircle2 className="h-3 w-3" /> Paid
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-red-700 border-red-200 hover:bg-red-50"
                        onClick={() => updatePayStatus(o.id, 'failed')}
                        disabled={updating === o.id + 'failed' || o.payment_status === 'failed'}>
                        <XCircle className="h-3 w-3" /> Failed
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center p-12 text-muted-foreground">
                    <CreditCard className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p>No payments found for this filter</p>
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

export default AdminPayments;
