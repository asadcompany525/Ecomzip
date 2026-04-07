import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const AdminActivity = () => {
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [recentReturns, setRecentReturns] = useState<any[]>([]);
  const [recentReviews, setRecentReviews] = useState<any[]>([]);
  const [recentProducts, setRecentProducts] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(10),
      supabase.from('returns').select('*').order('created_at', { ascending: false }).limit(5),
      supabase.from('reviews').select('*').order('created_at', { ascending: false }).limit(5),
      supabase.from('products').select('id, title, created_at').order('created_at', { ascending: false }).limit(5),
    ]).then(([o, r, rv, p]) => {
      setRecentOrders(o.data || []);
      setRecentReturns(r.data || []);
      setRecentReviews(rv.data || []);
      setRecentProducts(p.data || []);
    });
  }, []);

  const timeAgo = (d: string) => {
    const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (mins < 60) return `${mins}m ago`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
    return `${Math.floor(mins / 1440)}d ago`;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold">📋 Activity Log</h2>
      
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Recent Orders</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {recentOrders.map(o => (
              <div key={o.id} className="flex items-center justify-between text-sm">
                <span className="font-mono text-xs">{o.order_number}</span>
                <Badge variant="outline" className="text-xs">{o.status}</Badge>
                <span className="text-xs text-muted-foreground">{timeAgo(o.created_at)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Recent Returns/Claims</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {recentReturns.map(r => (
              <div key={r.id} className="flex items-center justify-between text-sm">
                <span className="text-xs truncate max-w-[150px]">{r.reason}</span>
                <Badge variant="outline" className="text-xs">{r.status}</Badge>
                <span className="text-xs text-muted-foreground">{timeAgo(r.created_at)}</span>
              </div>
            ))}
            {recentReturns.length === 0 && <p className="text-xs text-muted-foreground">No returns</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Recent Reviews</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {recentReviews.map(r => (
              <div key={r.id} className="flex items-center justify-between text-sm">
                <span className="text-xs">{'⭐'.repeat(r.rating)}</span>
                <Badge variant={r.is_approved ? 'default' : 'secondary'} className="text-xs">{r.is_approved ? 'Approved' : 'Pending'}</Badge>
                <span className="text-xs text-muted-foreground">{timeAgo(r.created_at)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Recent Products</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {recentProducts.map(p => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span className="text-xs truncate max-w-[200px]">{p.title}</span>
                <span className="text-xs text-muted-foreground">{timeAgo(p.created_at)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminActivity;
