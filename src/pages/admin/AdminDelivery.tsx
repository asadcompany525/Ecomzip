import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Truck, Package, CheckCircle, RefreshCw, MapPin } from 'lucide-react';

const AdminDelivery = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    setLoading(true);
    const { data } = await supabase.from('orders').select('*')
      .in('status', ['confirmed', 'processing', 'shipped'])
      .order('created_at', { ascending: false });
    setOrders(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  const updateTracking = async (id: string, tid: string) => {
    await supabase.from('orders').update({ tracking_id: tid }).eq('id', id);
    toast({ title: 'Tracking updated!' });
    setOrders(prev => prev.map(o => o.id === id ? { ...o, tracking_id: tid } : o));
  };

  const markShipped = async (id: string) => {
    await supabase.from('orders').update({ status: 'shipped' as any }).eq('id', id);
    toast({ title: 'Marked shipped' });
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'shipped' } : o));
  };

  const markDelivered = async (id: string) => {
    await supabase.from('orders').update({ status: 'delivered' as any }).eq('id', id);
    toast({ title: 'Marked delivered!' });
    setOrders(prev => prev.filter(o => o.id !== id));
  };

  const shipped = orders.filter(o => o.status === 'shipped');
  const readyToShip = orders.filter(o => ['confirmed', 'processing'].includes(o.status));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-xl"><Truck className="h-5 w-5 text-blue-600" /></div>
          <div>
            <h2 className="text-xl font-bold">Delivery Management</h2>
            <p className="text-sm text-muted-foreground">{readyToShip.length} ready to ship · {shipped.length} in transit</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={fetchOrders} className="h-8 gap-1">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex items-center gap-3">
          <Package className="h-8 w-8 text-orange-500 shrink-0" />
          <div>
            <p className="text-2xl font-bold text-orange-600">{readyToShip.length}</p>
            <p className="text-xs text-orange-700 font-medium">Ready to Ship</p>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center gap-3">
          <Truck className="h-8 w-8 text-blue-500 shrink-0" />
          <div>
            <p className="text-2xl font-bold text-blue-600">{shipped.length}</p>
            <p className="text-xs text-blue-700 font-medium">In Transit</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <>
          {/* Ready to Ship */}
          {readyToShip.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm text-orange-700">
                <Package className="h-4 w-4" /> Ready to Ship ({readyToShip.length})
              </h3>
              <div className="space-y-2">
                {readyToShip.map(o => {
                  const addr = o.address_snapshot as any;
                  return (
                    <div key={o.id} className="bg-card border rounded-xl p-4 flex items-center gap-4 flex-wrap hover:shadow-sm transition-shadow">
                      <div className="flex-1 min-w-[200px]">
                        <p className="font-mono text-xs font-bold text-primary">{o.order_number}</p>
                        <div className="flex items-center gap-1 mt-1 text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <p className="text-xs">{addr?.full_name || addr?.fullName} · {addr?.city}, {addr?.province}</p>
                        </div>
                        <p className="text-xs font-medium mt-1">Rs. {Number(o.total).toLocaleString()}</p>
                      </div>
                      <Input
                        className="w-44 h-8 text-xs"
                        placeholder="Enter tracking ID..."
                        defaultValue={o.tracking_id || ''}
                        onBlur={e => { if (e.target.value !== o.tracking_id) updateTracking(o.id, e.target.value); }}
                      />
                      <Button size="sm" onClick={() => markShipped(o.id)} className="gap-1 h-8">
                        <Truck className="h-3.5 w-3.5" /> Ship It
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* In Transit */}
          {shipped.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm text-blue-700">
                <Truck className="h-4 w-4" /> In Transit ({shipped.length})
              </h3>
              <div className="space-y-2">
                {shipped.map(o => {
                  const addr = o.address_snapshot as any;
                  return (
                    <div key={o.id} className="bg-card border rounded-xl p-4 flex items-center gap-4 flex-wrap hover:shadow-sm transition-shadow">
                      <div className="flex-1 min-w-[200px]">
                        <p className="font-mono text-xs font-bold text-primary">{o.order_number}</p>
                        <div className="flex items-center gap-1 mt-1 text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <p className="text-xs">{addr?.full_name || addr?.fullName} · {addr?.city}</p>
                        </div>
                        {o.tracking_id && (
                          <p className="text-xs font-mono text-blue-600 mt-1 bg-blue-50 inline-px-1.5 py-0.5 rounded">{o.tracking_id}</p>
                        )}
                      </div>
                      <Badge className="bg-blue-100 text-blue-800 border-0">In Transit</Badge>
                      <Button size="sm" className="gap-1 h-8 bg-green-600 hover:bg-green-700"
                        onClick={() => markDelivered(o.id)}>
                        <CheckCircle className="h-3.5 w-3.5" /> Delivered
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {orders.length === 0 && (
            <div className="text-center py-16 bg-card rounded-2xl border">
              <Truck className="h-14 w-14 mx-auto mb-3 text-muted-foreground/30" />
              <p className="font-medium">No active deliveries</p>
              <p className="text-sm text-muted-foreground mt-1">All orders are delivered or pending confirmation</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminDelivery;
