import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';

const AdminDelivery = () => {
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('orders').select('*').in('status', ['confirmed', 'processing', 'shipped']).order('created_at', { ascending: false })
      .then(({ data }) => setOrders(data || []));
  }, []);

  const updateTracking = async (id: string, tid: string) => {
    await supabase.from('orders').update({ tracking_id: tid }).eq('id', id);
    toast({ title: 'Tracking updated' });
    setOrders(prev => prev.map(o => o.id === id ? { ...o, tracking_id: tid } : o));
  };

  const markShipped = async (id: string) => {
    await supabase.from('orders').update({ status: 'shipped' as any }).eq('id', id);
    toast({ title: 'Marked shipped' });
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'shipped' } : o));
  };

  const markDelivered = async (id: string) => {
    await supabase.from('orders').update({ status: 'delivered' as any }).eq('id', id);
    toast({ title: 'Marked delivered' });
    setOrders(prev => prev.filter(o => o.id !== id));
  };

  const shipped = orders.filter(o => o.status === 'shipped');
  const processing = orders.filter(o => ['confirmed', 'processing'].includes(o.status));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <Card><CardContent className="pt-4 text-center"><p className="text-xs text-muted-foreground">Ready to Ship</p><p className="text-xl font-bold">{processing.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-xs text-muted-foreground">In Transit</p><p className="text-xl font-bold">{shipped.length}</p></CardContent></Card>
      </div>

      <div>
        <h3 className="font-semibold mb-3">📦 Ready to Ship</h3>
        <div className="space-y-2">
          {processing.map(o => {
            const addr = o.address_snapshot as any;
            return (
              <div key={o.id} className="bg-card border rounded-lg p-3 flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <p className="font-mono text-xs font-bold">{o.order_number}</p>
                  <p className="text-xs text-muted-foreground">{addr?.full_name || addr?.fullName} · {addr?.city}, {addr?.province}</p>
                </div>
                <Input className="w-40" placeholder="Tracking ID" defaultValue={o.tracking_id || ''} onBlur={e => updateTracking(o.id, e.target.value)} />
                <Button size="sm" onClick={() => markShipped(o.id)}>🚚 Ship</Button>
              </div>
            );
          })}
          {processing.length === 0 && <p className="text-sm text-muted-foreground">No orders ready</p>}
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-3">🚚 In Transit</h3>
        <div className="space-y-2">
          {shipped.map(o => {
            const addr = o.address_snapshot as any;
            return (
              <div key={o.id} className="bg-card border rounded-lg p-3 flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <p className="font-mono text-xs font-bold">{o.order_number}</p>
                  <p className="text-xs text-muted-foreground">{addr?.full_name || addr?.fullName} · {addr?.city}</p>
                  <p className="text-xs font-mono">{o.tracking_id || 'No tracking'}</p>
                </div>
                <Badge>{o.payment_method}</Badge>
                <Button size="sm" variant="outline" onClick={() => markDelivered(o.id)}>✅ Delivered</Button>
              </div>
            );
          })}
          {shipped.length === 0 && <p className="text-sm text-muted-foreground">No orders in transit</p>}
        </div>
      </div>
    </div>
  );
};

export default AdminDelivery;
