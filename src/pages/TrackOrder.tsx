import { useState } from 'react';
import { Search, Package, Truck, CheckCircle2, Clock, MapPin, ExternalLink, Loader2, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import { motion } from 'framer-motion';

const STATUS_STEPS = [
  { key: 'pending', label: 'Order Placed', icon: Clock, desc: 'Your order has been received' },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle2, desc: 'Order confirmed by seller' },
  { key: 'processing', label: 'Processing', icon: Package, desc: 'Preparing your package' },
  { key: 'shipped', label: 'Shipped', icon: Truck, desc: 'On the way to you' },
  { key: 'delivered', label: 'Delivered', icon: MapPin, desc: 'Package delivered successfully' },
];

const COURIERS: { name: string; pattern: RegExp; trackUrl: (id: string) => string; color: string }[] = [
  {
    name: 'TCS',
    pattern: /^(TCS|[A-Z]{3}\d{8,12}|\d{10,12})$/i,
    trackUrl: id => `https://www.tcsdelivex.com/track?id=${id}`,
    color: 'bg-red-100 text-red-800 border-red-200',
  },
  {
    name: 'Leopards',
    pattern: /^(LEP|LP\d{8,}|\d{12,14})$/i,
    trackUrl: id => `https://leopardscourier.com/leopards-tracking/?tracking_number=${id}`,
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  {
    name: 'BlueEx',
    pattern: /^(BEX|BX\d{6,}|\d{11,13})$/i,
    trackUrl: id => `https://blueex.com/track?id=${id}`,
    color: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  {
    name: 'PostEx',
    pattern: /^(PEX|POST\d{6,})$/i,
    trackUrl: id => `https://postex.pk/tracking?id=${id}`,
    color: 'bg-purple-100 text-purple-800 border-purple-200',
  },
];

function detectCourier(trackingId: string) {
  if (!trackingId) return null;
  const upper = trackingId.trim().toUpperCase();
  if (upper.startsWith('TCS') || upper.startsWith('DE')) return COURIERS[0];
  if (upper.startsWith('LEP') || upper.startsWith('LP')) return COURIERS[1];
  if (upper.startsWith('BEX') || upper.startsWith('BX')) return COURIERS[2];
  if (upper.startsWith('PEX') || upper.startsWith('POST')) return COURIERS[3];
  const len = trackingId.replace(/\D/g, '').length;
  if (len === 10 || len === 11) return COURIERS[0];
  if (len === 12 || len === 13) return COURIERS[2];
  if (len >= 14) return COURIERS[1];
  return null;
}

const TrackOrder = () => {
  const [query, setQuery] = useState('');
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true); setNotFound(false); setOrder(null);
    const { data } = await supabase
      .from('orders')
      .select('*')
      .or(`order_number.eq.${query.trim()},tracking_id.eq.${query.trim()}`)
      .maybeSingle();
    setOrder(data);
    setNotFound(!data);
    setLoading(false);
  };

  const statusIndex = order ? STATUS_STEPS.findIndex(s => s.key === order.status) : -1;
  const progressPct = statusIndex >= 0 ? Math.round(((statusIndex) / (STATUS_STEPS.length - 1)) * 100) : 0;
  const courier = order?.tracking_id ? detectCourier(order.tracking_id) : null;

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Header />
      <main className="container py-8 max-w-xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
            <Navigation className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Track Your Order</h1>
          <p className="text-sm text-muted-foreground mt-1">Enter your order number or tracking ID</p>
        </div>

        <div className="flex gap-2 mb-8">
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Order number or courier tracking ID"
            onKeyDown={e => e.key === 'Enter' && search()}
            className="h-11"
          />
          <Button onClick={search} disabled={loading} className="h-11 px-5">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {!loading && <span className="ml-1.5">Track</span>}
          </Button>
        </div>

        {notFound && (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No order found with that number.</p>
            <p className="text-xs mt-1">Try your order number or the tracking ID from the courier.</p>
          </div>
        )}

        {order && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Order Summary Card */}
            <div className="bg-card rounded-xl border p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg">Order #{order.order_number}</h3>
                <Badge className={statusIndex >= 4 ? 'bg-green-100 text-green-800 border-green-200' : 'bg-primary/10 text-primary border-primary/20'}>
                  {STATUS_STEPS[statusIndex]?.label || order.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Total Amount</p>
                  <p className="font-bold text-primary">Rs. {Number(order.total_amount || order.total).toLocaleString()}</p>
                </div>
                {order.tracking_id && (
                  <div>
                    <p className="text-xs text-muted-foreground">Tracking ID</p>
                    <p className="font-mono text-sm font-semibold">{order.tracking_id}</p>
                  </div>
                )}
              </div>

              {/* Courier Detection */}
              {order.tracking_id && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-2">Courier Service</p>
                  {courier ? (
                    <div className="flex items-center gap-3">
                      <Badge className={courier.color}>{courier.name}</Badge>
                      <a
                        href={courier.trackUrl(order.tracking_id)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8">
                          <ExternalLink className="h-3 w-3" /> Live Track on {courier.name}
                        </Button>
                      </a>
                    </div>
                  ) : (
                    <div className="flex gap-2 flex-wrap">
                      {COURIERS.map(c => (
                        <a key={c.name} href={c.trackUrl(order.tracking_id)} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="outline" className="gap-1 text-xs h-8">
                            <ExternalLink className="h-3 w-3" /> {c.name}
                          </Button>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Animated Progress Bar */}
            <div className="bg-card rounded-xl border p-5 space-y-5">
              <h3 className="font-semibold text-sm">Order Progress</h3>

              {/* Overall progress bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Order Placed</span>
                  <span className="text-primary font-medium">{progressPct}%</span>
                  <span>Delivered</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                  />
                </div>
              </div>

              {/* Step-by-step tracker */}
              <div className="space-y-0">
                {STATUS_STEPS.map((s, i) => {
                  const active = i <= statusIndex;
                  const current = i === statusIndex;
                  const isLast = i === STATUS_STEPS.length - 1;
                  return (
                    <div key={s.key} className="relative flex gap-4">
                      {/* Connector line */}
                      {!isLast && (
                        <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-muted" style={{ zIndex: 0 }}>
                          <motion.div
                            className="w-full bg-primary"
                            initial={{ height: 0 }}
                            animate={{ height: active && i < statusIndex ? '100%' : 0 }}
                            transition={{ duration: 0.6, delay: i * 0.15 }}
                          />
                        </div>
                      )}

                      {/* Step icon */}
                      <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: i * 0.1 + 0.2 }}
                        className={`relative z-10 h-10 w-10 rounded-full flex items-center justify-center shrink-0 transition-all ${
                          active
                            ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                            : 'bg-muted text-muted-foreground'
                        } ${current ? 'ring-4 ring-primary/20' : ''}`}
                      >
                        {current ? (
                          <motion.div
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                          >
                            <s.icon className="h-5 w-5" />
                          </motion.div>
                        ) : (
                          <s.icon className="h-5 w-5" />
                        )}
                      </motion.div>

                      {/* Step info */}
                      <div className="flex-1 pb-6">
                        <motion.div
                          initial={{ x: -10, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: i * 0.1 + 0.3 }}
                        >
                          <p className={`text-sm font-semibold ${active ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {s.label}
                          </p>
                          <p className="text-xs text-muted-foreground">{s.desc}</p>
                          {current && (
                            <span className="inline-flex items-center gap-1 text-xs text-primary mt-1 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                              Current Status
                            </span>
                          )}
                        </motion.div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Courier Links Panel */}
            <div className="bg-muted/30 rounded-xl border p-4">
              <p className="text-xs font-semibold text-muted-foreground mb-3">Track on Pakistan Courier Networks</p>
              <div className="grid grid-cols-2 gap-2">
                {COURIERS.map(c => (
                  <a
                    key={c.name}
                    href={order.tracking_id ? c.trackUrl(order.tracking_id) : '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={!order.tracking_id ? 'pointer-events-none opacity-40' : ''}
                  >
                    <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs justify-start">
                      <Truck className="h-3.5 w-3.5" />
                      {c.name} Courier
                      <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
                    </Button>
                  </a>
                ))}
              </div>
              {!order.tracking_id && (
                <p className="text-[10px] text-muted-foreground mt-2">Tracking ID not assigned yet. Check back after order ships.</p>
              )}
            </div>
          </motion.div>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default TrackOrder;
