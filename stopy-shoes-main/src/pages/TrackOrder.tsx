import { useState } from 'react';
import { Search, Package, Truck, CheckCircle2, Clock, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/layout/Header';

import BottomNav from '@/components/layout/BottomNav';

const STATUS_STEPS = [
  { key: 'pending', label: 'Order Placed', icon: Clock },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle2 },
  { key: 'processing', label: 'Processing', icon: Package },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: MapPin },
];

const TrackOrder = () => {
  const [query, setQuery] = useState('');
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true); setNotFound(false);
    const { data } = await supabase.from('orders').select('*').or(`order_number.eq.${query.trim()},tracking_id.eq.${query.trim()}`).maybeSingle();
    setOrder(data);
    setNotFound(!data);
    setLoading(false);
  };

  const statusIndex = order ? STATUS_STEPS.findIndex(s => s.key === order.status) : -1;

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Header />
      <main className="container py-8 max-w-xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-center">Track Your Order</h1>
        <div className="flex gap-2 mb-8">
          <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Order number or tracking ID" onKeyDown={e => e.key === 'Enter' && search()} />
          <Button onClick={search} disabled={loading}><Search className="h-4 w-4 mr-1" />Track</Button>
        </div>

        {notFound && <p className="text-center text-muted-foreground">No order found with that number.</p>}

        {order && (
          <div className="bg-card rounded-xl border p-6 space-y-6">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Order</span><span className="font-bold">{order.order_number}</span>
            </div>
            {order.tracking_id && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tracking ID</span><span className="font-mono">{order.tracking_id}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total</span><span className="font-bold text-primary">Rs. {Number(order.total).toLocaleString()}</span>
            </div>

            {/* Progress */}
            <div className="space-y-4">
              {STATUS_STEPS.map((s, i) => {
                const active = i <= statusIndex;
                const current = i === statusIndex;
                return (
                  <div key={s.key} className="flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'} ${current ? 'ring-2 ring-primary ring-offset-2' : ''}`}>
                      <s.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${active ? '' : 'text-muted-foreground'}`}>{s.label}</p>
                      {current && <p className="text-xs text-primary">Current status</p>}
                    </div>
                    {i < STATUS_STEPS.length - 1 && <div className={`flex-1 h-0.5 ${i < statusIndex ? 'bg-primary' : 'bg-muted'}`} />}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
      
      <BottomNav />
    </div>
  );
};

export default TrackOrder;
