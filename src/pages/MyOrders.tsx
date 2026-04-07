import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, Truck, RotateCcw, XCircle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800', confirmed: 'bg-blue-100 text-blue-800',
  processing: 'bg-purple-100 text-purple-800', shipped: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800', received: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-800', returned: 'bg-orange-100 text-orange-800',
};

const MyOrders = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [items, setItems] = useState<Record<string, any[]>>({});
  const [returnDialog, setReturnDialog] = useState<any>(null);
  const [claimDialog, setClaimDialog] = useState<any>(null);
  const [cancelDialog, setCancelDialog] = useState<any>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).then(({ data }) => {
      setOrders(data || []);
      data?.forEach(o => {
        supabase.from('order_items').select('*').eq('order_id', o.id).then(({ data: oi }) => {
          setItems(prev => ({ ...prev, [o.id]: oi || [] }));
        });
      });
    });
  }, [user]);

  const submitReturn = async () => {
    if (!reason.trim() || !returnDialog || !user) return;
    setSubmitting(true);
    await supabase.from('returns').insert({
      order_id: returnDialog.id, user_id: user.id, reason: reason.trim(),
    });
    toast({ title: 'Return request submitted!' });
    setReturnDialog(null); setReason(''); setSubmitting(false);
  };

  const submitClaim = async () => {
    if (!reason.trim() || !claimDialog || !user) return;
    setSubmitting(true);
    await supabase.from('returns').insert({
      order_id: claimDialog.id, user_id: user.id, reason: `CLAIM: ${reason.trim()}`,
    });
    toast({ title: 'Claim submitted!' });
    setClaimDialog(null); setReason(''); setSubmitting(false);
  };

  const submitCancel = async () => {
    if (!cancelDialog) return;
    setSubmitting(true);
    await supabase.from('orders').update({ status: 'cancelled' as any }).eq('id', cancelDialog.id);
    toast({ title: 'Order cancelled' });
    setOrders(prev => prev.map(o => o.id === cancelDialog.id ? { ...o, status: 'cancelled' } : o));
    setCancelDialog(null); setSubmitting(false);
  };

  // Check if order is within return/claim window
  const canReturn = (order: any) => ['delivered', 'received'].includes(order.status);
  const canClaim = (order: any) => {
    if (!['delivered', 'received'].includes(order.status)) return false;
    const delivered = new Date(order.updated_at);
    const now = new Date();
    const daysDiff = (now.getTime() - delivered.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff <= 30; // 30 day claim window
  };
  const canCancel = (order: any) => ['pending', 'confirmed'].includes(order.status);

  if (!user) return <div className="min-h-screen bg-background"><Header /><div className="container py-20 text-center"><p>Please <Link to="/login" className="text-primary underline">login</Link> to view orders.</p></div><BottomNav /></div>;

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Header />
      <main className="container py-5">
        <h1 className="text-2xl font-bold mb-6">My Orders ({orders.length})</h1>
        {orders.length === 0 ? (
          <div className="text-center py-16">
            <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="font-bold text-lg mb-2">No orders yet</h2>
            <Link to="/products"><Button>Start Shopping</Button></Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(order => (
              <div key={order.id} className="bg-card rounded-xl border p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-bold text-sm">{order.order_number}</p>
                    <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                  <Badge className={STATUS_COLORS[order.status] || 'bg-muted'}>{order.status}</Badge>
                </div>
                <div className="flex gap-2 overflow-x-auto mb-3">
                  {(items[order.id] || []).map(item => (
                    <img key={item.id} src={item.image || '/placeholder.svg'} alt={item.title} className="w-14 h-14 rounded-lg object-cover shrink-0 border" />
                  ))}
                </div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Total: </span>
                    <span className="font-bold text-primary">Rs. {Number(order.total).toLocaleString()}</span>
                  </div>
                  {order.tracking_id && (
                    <Link to={`/track-order?q=${order.tracking_id}`}>
                      <Button size="sm" variant="outline"><Truck className="h-3 w-3 mr-1" />Track</Button>
                    </Link>
                  )}
                </div>
                {order.tracking_id && <p className="text-xs text-muted-foreground mb-2">🚚 Tracking: {order.tracking_id}</p>}
                
                {/* Action buttons */}
                <div className="flex gap-2 flex-wrap pt-2 border-t">
                  {canCancel(order) && (
                    <Button size="sm" variant="outline" className="text-destructive gap-1" onClick={() => setCancelDialog(order)}>
                      <XCircle className="h-3 w-3" /> Cancel
                    </Button>
                  )}
                  {canReturn(order) && (
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => setReturnDialog(order)}>
                      <RotateCcw className="h-3 w-3" /> Return
                    </Button>
                  )}
                  {canClaim(order) && (
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => setClaimDialog(order)}>
                      <ShieldCheck className="h-3 w-3" /> Claim
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Return Dialog */}
      <Dialog open={!!returnDialog} onOpenChange={() => setReturnDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Return Request</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Order: {returnDialog?.order_number}</p>
            <div><Label>Reason for return *</Label><Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Why do you want to return?" className="mt-1" rows={3} /></div>
            <Button onClick={submitReturn} disabled={submitting || !reason.trim()} className="w-full">
              {submitting ? 'Submitting...' : 'Submit Return Request'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Claim Dialog */}
      <Dialog open={!!claimDialog} onOpenChange={() => setClaimDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Claim / Warranty</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Order: {claimDialog?.order_number}</p>
            <p className="text-xs text-muted-foreground">You can claim within 30 days of delivery.</p>
            <div><Label>Describe the issue *</Label><Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="What's wrong with the product?" className="mt-1" rows={3} /></div>
            <Button onClick={submitClaim} disabled={submitting || !reason.trim()} className="w-full">
              {submitting ? 'Submitting...' : 'Submit Claim'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={!!cancelDialog} onOpenChange={() => setCancelDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cancel Order</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm">Are you sure you want to cancel order <strong>{cancelDialog?.order_number}</strong>?</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setCancelDialog(null)} className="flex-1">No, Keep</Button>
              <Button variant="destructive" onClick={submitCancel} disabled={submitting} className="flex-1">
                {submitting ? 'Cancelling...' : 'Yes, Cancel'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default MyOrders;
