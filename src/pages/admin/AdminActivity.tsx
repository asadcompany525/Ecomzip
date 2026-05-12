import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Activity, ShoppingCart, RotateCcw, Star, Package, RefreshCw, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

const timeAgo = (d: string) => {
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
};

const statusStyle: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  shipped: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

const AdminActivity = () => {
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [recentReturns, setRecentReturns] = useState<any[]>([]);
  const [recentReviews, setRecentReviews] = useState<any[]>([]);
  const [recentProducts, setRecentProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const [o, r, rv, p] = await Promise.all([
      supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(10),
      supabase.from('returns').select('*').order('created_at', { ascending: false }).limit(8),
      supabase.from('reviews').select('*, products(title)').order('created_at', { ascending: false }).limit(8),
      supabase.from('products').select('id, title, created_at, images').order('created_at', { ascending: false }).limit(8),
    ]);
    setRecentOrders(o.data || []);
    setRecentReturns(r.data || []);
    setRecentReviews(rv.data || []);
    setRecentProducts(p.data || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted rounded-xl animate-pulse" />
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-48 bg-muted rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 rounded-xl"><Activity className="h-5 w-5 text-slate-600" /></div>
          <div>
            <h2 className="text-xl font-bold">Activity Log</h2>
            <p className="text-sm text-muted-foreground">Recent store activity across all sections</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={loadData} className="h-8 gap-1">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Recent Orders */}
        <div className="bg-card border rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
            <ShoppingCart className="h-4 w-4 text-indigo-600" />
            <h3 className="font-semibold text-sm">Recent Orders</h3>
            <span className="ml-auto text-xs text-muted-foreground">{recentOrders.length}</span>
          </div>
          <div className="divide-y">
            {recentOrders.length === 0 ? (
              <p className="text-xs text-muted-foreground p-4">No orders yet</p>
            ) : recentOrders.map(o => (
              <div key={o.id} className="flex items-center gap-2 px-4 py-2.5 hover:bg-muted/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-xs font-bold">{o.order_number}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Rs. {Number(o.total).toLocaleString()}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyle[o.status] || 'bg-muted text-muted-foreground'}`}>{o.status}</span>
                <span className="text-xs text-muted-foreground flex items-center gap-0.5 shrink-0">
                  <Clock className="h-2.5 w-2.5" /> {timeAgo(o.created_at)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Returns */}
        <div className="bg-card border rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
            <RotateCcw className="h-4 w-4 text-orange-600" />
            <h3 className="font-semibold text-sm">Returns & Claims</h3>
            <span className="ml-auto text-xs text-muted-foreground">{recentReturns.length}</span>
          </div>
          <div className="divide-y">
            {recentReturns.length === 0 ? (
              <p className="text-xs text-muted-foreground p-4">No returns yet</p>
            ) : recentReturns.map(r => (
              <div key={r.id} className="flex items-center gap-2 px-4 py-2.5 hover:bg-muted/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium line-clamp-1">{r.reason?.replace('CLAIM: ', '') || 'No reason'}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${r.reason?.startsWith('CLAIM:') ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>
                    {r.reason?.startsWith('CLAIM:') ? 'Claim' : 'Return'}
                  </span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyle[r.status] || 'bg-muted text-muted-foreground'}`}>{r.status}</span>
                <span className="text-xs text-muted-foreground shrink-0">{timeAgo(r.created_at)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Reviews */}
        <div className="bg-card border rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
            <Star className="h-4 w-4 text-amber-500" />
            <h3 className="font-semibold text-sm">Recent Reviews</h3>
            <span className="ml-auto text-xs text-muted-foreground">{recentReviews.length}</span>
          </div>
          <div className="divide-y">
            {recentReviews.length === 0 ? (
              <p className="text-xs text-muted-foreground p-4">No reviews yet</p>
            ) : recentReviews.map(r => (
              <div key={r.id} className="flex items-center gap-2 px-4 py-2.5 hover:bg-muted/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium line-clamp-1">{(r.products as any)?.title || 'Unknown product'}</p>
                  <div className="flex items-center gap-0.5 mt-0.5">
                    {[1,2,3,4,5].map(s => (
                      <span key={s} className={`text-[10px] ${s <= r.rating ? 'text-amber-400' : 'text-muted-foreground/30'}`}>★</span>
                    ))}
                  </div>
                </div>
                <Badge className={r.is_approved ? 'bg-green-100 text-green-800 border-0 text-[10px] px-1.5' : 'bg-yellow-100 text-yellow-800 border-0 text-[10px] px-1.5'}>
                  {r.is_approved ? 'Approved' : 'Pending'}
                </Badge>
                <span className="text-xs text-muted-foreground shrink-0">{timeAgo(r.created_at)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Products */}
        <div className="bg-card border rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
            <Package className="h-4 w-4 text-emerald-600" />
            <h3 className="font-semibold text-sm">Recently Added Products</h3>
            <span className="ml-auto text-xs text-muted-foreground">{recentProducts.length}</span>
          </div>
          <div className="divide-y">
            {recentProducts.length === 0 ? (
              <p className="text-xs text-muted-foreground p-4">No products yet</p>
            ) : recentProducts.map(p => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors">
                <img
                  src={(p.images as string[])?.[0] || '/placeholder.svg'}
                  alt=""
                  className="w-8 h-8 rounded-lg object-cover border shrink-0"
                />
                <p className="text-xs font-medium flex-1 min-w-0 line-clamp-1">{p.title}</p>
                <span className="text-xs text-muted-foreground shrink-0">{timeAgo(p.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminActivity;
