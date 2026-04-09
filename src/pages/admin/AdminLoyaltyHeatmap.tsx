import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Diamond, UserX, RefreshCw, Send, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface Customer {
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  total_spent: number;
  order_count: number;
  last_order_days: number;
  tier: 'diamond' | 'churning' | 'regular';
}

export default function AdminLoyaltyHeatmap() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'diamond' | 'churning'>('all');
  const [discountTarget, setDiscountTarget] = useState<Customer | null>(null);
  const [discountCode, setDiscountCode] = useState('');
  const [discountPct, setDiscountPct] = useState(15);

  const load = async () => {
    setLoading(true);
    try {
      const { data: profiles } = await supabase.from('profiles').select('user_id, full_name, email, phone');
      const { data: orders } = await supabase.from('orders').select('user_id, total, created_at').not('status', 'eq', 'cancelled');

      const now = Date.now();
      const customerMap: Record<string, Customer> = {};

      (profiles || []).forEach((p: any) => {
        customerMap[p.user_id] = {
          user_id: p.user_id,
          full_name: p.full_name || 'Unknown',
          email: p.email || '',
          phone: p.phone || '',
          total_spent: 0,
          order_count: 0,
          last_order_days: 9999,
          tier: 'regular',
        };
      });

      (orders || []).forEach((o: any) => {
        const c = customerMap[o.user_id];
        if (!c) return;
        c.total_spent += Number(o.total) || 0;
        c.order_count++;
        const days = Math.floor((now - new Date(o.created_at).getTime()) / 86400000);
        if (days < c.last_order_days) c.last_order_days = days;
      });

      const allSpends = Object.values(customerMap).map(c => c.total_spent).sort((a, b) => b - a);
      const diamondThreshold = allSpends[Math.floor(allSpends.length * 0.15)] || 10000;

      const result = Object.values(customerMap).map(c => {
        if (c.total_spent >= diamondThreshold && c.order_count >= 2) c.tier = 'diamond';
        else if (c.last_order_days >= 30 && c.order_count > 0) c.tier = 'churning';
        return c;
      }).filter(c => c.order_count > 0);

      result.sort((a, b) => b.total_spent - a.total_spent);
      setCustomers(result);
    } catch (e: any) {
      toast({ title: 'Failed to load', description: e.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const sendDiscount = async () => {
    if (!discountCode.trim()) {
      toast({ title: 'Enter a discount code', variant: 'destructive' });
      return;
    }
    try {
      await supabase.from('promo_codes').insert({
        code: discountCode.toUpperCase(),
        discount_percent: discountPct,
        max_uses: 1,
        is_active: true,
        description: `Loyalty reward for ${discountTarget?.full_name}`,
      });
      toast({ title: `✅ Promo code "${discountCode.toUpperCase()}" created for ${discountTarget?.full_name}!`, description: `Share this code with the customer.` });
      setDiscountTarget(null);
      setDiscountCode('');
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    }
  };

  const filtered = customers.filter(c => {
    const matchSearch = c.full_name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase());
    if (filter === 'all') return matchSearch;
    return matchSearch && c.tier === filter;
  });

  const diamond = customers.filter(c => c.tier === 'diamond');
  const churning = customers.filter(c => c.tier === 'churning');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">💎 Customer Loyalty Heatmap</h1>
          <p className="text-sm text-muted-foreground mt-1">Identify Diamond customers and churning customers to take action.</p>
        </div>
        <Button onClick={load} disabled={loading} variant="outline" className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-purple-200 bg-purple-50 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter(filter === 'diamond' ? 'all' : 'diamond')}>
          <CardContent className="p-4 flex items-center gap-3">
            <Diamond className="h-8 w-8 text-purple-500" />
            <div>
              <p className="text-2xl font-bold text-purple-700">{diamond.length}</p>
              <p className="text-sm text-purple-600">Diamond Customers</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter(filter === 'churning' ? 'all' : 'churning')}>
          <CardContent className="p-4 flex items-center gap-3">
            <UserX className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-2xl font-bold text-red-700">{churning.length}</p>
              <p className="text-sm text-red-600">Churning (30+ days)</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-lg">👤</div>
            <div>
              <p className="text-2xl font-bold">{customers.length}</p>
              <p className="text-sm text-muted-foreground">Total Active Customers</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <div className="flex gap-2">
          {(['all', 'diamond', 'churning'] as const).map(f => (
            <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} onClick={() => setFilter(f)} className="capitalize">{f}</Button>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3">Customer</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Total Spent</th>
              <th className="text-left p-3">Orders</th>
              <th className="text-left p-3">Last Order</th>
              <th className="text-left p-3">Tier</th>
              <th className="text-left p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.user_id} className="border-b hover:bg-accent/30">
                <td className="p-3 font-medium">{c.full_name}</td>
                <td className="p-3 text-muted-foreground">{c.email}</td>
                <td className="p-3 font-bold">Rs. {c.total_spent.toLocaleString()}</td>
                <td className="p-3">{c.order_count}</td>
                <td className="p-3">{c.last_order_days === 9999 ? 'Never' : `${c.last_order_days}d ago`}</td>
                <td className="p-3">
                  {c.tier === 'diamond' && <Badge className="bg-purple-100 text-purple-700 border-purple-200">💎 Diamond</Badge>}
                  {c.tier === 'churning' && <Badge className="bg-red-100 text-red-700 border-red-200">⚠ Churning</Badge>}
                  {c.tier === 'regular' && <Badge variant="outline">Regular</Badge>}
                </td>
                <td className="p-3">
                  <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => { setDiscountTarget(c); setDiscountCode(`LOYAL${c.full_name.slice(0,4).toUpperCase()}${Math.floor(Math.random()*99)}`); }}>
                    <Send className="h-3 w-3" /> Send Discount
                  </Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No customers found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={!!discountTarget} onOpenChange={() => setDiscountTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Send Discount to {discountTarget?.full_name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Promo Code</label>
              <Input value={discountCode} onChange={e => setDiscountCode(e.target.value)} className="mt-1 uppercase" placeholder="e.g. LOYAL20" />
            </div>
            <div>
              <label className="text-sm font-medium">Discount %</label>
              <Input type="number" min="1" max="90" value={discountPct} onChange={e => setDiscountPct(Number(e.target.value))} className="mt-1" />
            </div>
            <p className="text-xs text-muted-foreground">This creates a single-use promo code. Share it manually with the customer via WhatsApp or email.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDiscountTarget(null)}>Cancel</Button>
            <Button onClick={sendDiscount} className="gap-2"><Send className="h-4 w-4" /> Create Code</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
