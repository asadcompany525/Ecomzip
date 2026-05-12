import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, Truck, RotateCcw, XCircle, ShieldCheck, Camera, X as XIcon, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import BottomNav from '@/components/layout/BottomNav';
import PageBreadcrumb from '@/components/layout/PageBreadcrumb';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800', confirmed: 'bg-blue-100 text-blue-800',
  processing: 'bg-purple-100 text-purple-800', shipped: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800', received: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-800', returned: 'bg-orange-100 text-orange-800',
};

const ORDER_STEPS = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
const STEP_LABELS = ['Ordered', 'Confirmed', 'Processing', 'Shipped', 'Delivered'];

function OrderStepper({ status }: { status: string }) {
  const isCancelled = status === 'cancelled';
  const isReturned = status === 'returned';
  const isReceived = status === 'received';
  const effectiveStatus = isReceived ? 'delivered' : status;
  const activeIndex = ORDER_STEPS.indexOf(effectiveStatus);
  if (isCancelled || isReturned) {
    return (
      <div className={`text-xs font-medium text-center py-2 rounded-lg ${isCancelled ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'}`}>
        {isCancelled ? '❌ Order Cancelled' : '🔄 Return Requested'}
      </div>
    );
  }
  return (
    <div className="flex items-start mt-3 mb-1">
      {ORDER_STEPS.map((step, i) => {
        const isDone = i < activeIndex || (activeIndex === ORDER_STEPS.length - 1 && i === ORDER_STEPS.length - 1);
        const isActive = i === activeIndex;
        return (
          <div key={step} className="flex items-center flex-1">
            <div className="flex flex-col items-center min-w-0">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 flex-shrink-0 transition-all ${
                isDone ? 'bg-primary border-primary text-white' :
                isActive ? 'border-primary text-primary bg-primary/10' :
                'border-muted-foreground/30 bg-muted text-muted-foreground/50'
              }`}>
                {isDone ? <CheckCircle2 className="w-3 h-3" /> : <span className="text-[8px] font-bold">{i + 1}</span>}
              </div>
              <span className={`text-[8px] mt-0.5 text-center leading-tight px-0.5 ${isActive ? 'text-primary font-semibold' : isDone ? 'text-primary/70' : 'text-muted-foreground/50'}`}>
                {STEP_LABELS[i]}
              </span>
            </div>
            {i < ORDER_STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 mb-4 mx-0.5 rounded ${i < activeIndex ? 'bg-primary' : 'bg-muted'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

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
  const [claimPhotos, setClaimPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [returnDays, setReturnDays] = useState(7);
  const [claimDays, setClaimDays] = useState(30);
  const [expandedStepper, setExpandedStepper] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('site_settings').select('value').eq('key', 'return_policy').maybeSingle().then(({ data }) => {
      if (data?.value && typeof data.value === 'object') {
        const v = data.value as any;
        if (v.days) setReturnDays(Number(v.days));
        if (v.claim_days) setClaimDays(Number(v.claim_days));
      }
    });
  }, []);

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
    await supabase.from('returns').insert({ order_id: returnDialog.id, user_id: user.id, reason: reason.trim() });
    toast({ title: 'Return request submitted!' });
    setReturnDialog(null); setReason(''); setSubmitting(false);
  };

  const handleClaimPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setUploadingPhoto(true);
    const urls = [...claimPhotos];
    for (const file of Array.from(files)) {
      const path = `claims/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from('returns').upload(path, file);
      if (!error) {
        const { data } = supabase.storage.from('returns').getPublicUrl(path);
        urls.push(data.publicUrl);
      }
    }
    setClaimPhotos(urls);
    setUploadingPhoto(false);
  };

  const submitClaim = async () => {
    if (!reason.trim() || !claimDialog || !user) return;
    setSubmitting(true);
    await supabase.from('returns').insert({
      order_id: claimDialog.id, user_id: user.id,
      reason: `CLAIM: ${reason.trim()}`,
      images: claimPhotos,
    });
    toast({ title: 'Claim submitted!', description: claimPhotos.length > 0 ? `${claimPhotos.length} photo(s) attached` : undefined });
    setClaimDialog(null); setReason(''); setClaimPhotos([]); setSubmitting(false);
  };

  const submitCancel = async () => {
    if (!cancelDialog) return;
    setSubmitting(true);
    await supabase.from('orders').update({ status: 'cancelled' as any }).eq('id', cancelDialog.id);
    toast({ title: 'Order cancelled' });
    setOrders(prev => prev.map(o => o.id === cancelDialog.id ? { ...o, status: 'cancelled' } : o));
    setCancelDialog(null); setSubmitting(false);
  };

  const canCancel = (order: any) => {
    if (!['pending', 'confirmed'].includes(order.status)) return false;
    return (Date.now() - new Date(order.created_at).getTime()) / (1000 * 60 * 60) <= 24;
  };
  const canReturn = (order: any) => {
    if (!['delivered', 'received'].includes(order.status)) return false;
    return (Date.now() - new Date(order.updated_at).getTime()) / (1000 * 60 * 60 * 24) <= returnDays;
  };
  const canClaim = (order: any) => {
    if (!['delivered', 'received'].includes(order.status)) return false;
    return (Date.now() - new Date(order.updated_at).getTime()) / (1000 * 60 * 60 * 24) <= claimDays;
  };

  if (!user) return (
    <div className="min-h-screen bg-background">
      <div className="container py-20 text-center"><p>Please <Link to="/login" className="text-primary underline">login</Link> to view orders.</p></div>
      <BottomNav />
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-4">
      <main className="container py-5 max-w-2xl mx-auto">
        <PageBreadcrumb items={[{ label: 'My Account', href: '/my-page' }, { label: 'My Orders' }]} />
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 bg-primary/10 rounded-xl"><Package className="h-5 w-5 text-primary" /></div>
          <div>
            <h1 className="text-2xl font-bold">My Orders</h1>
            <p className="text-sm text-muted-foreground">{orders.length} order{orders.length !== 1 ? 's' : ''} total</p>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-16">
            <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="font-bold text-lg mb-2">No orders yet</h2>
            <Link to="/products"><Button>Start Shopping</Button></Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(order => (
              <div key={order.id} className="bg-card rounded-xl border p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-bold text-sm">{order.order_number}</p>
                    <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={STATUS_COLORS[order.status] || 'bg-muted'}>{order.status}</Badge>
                    <button
                      onClick={() => setExpandedStepper(expandedStepper === order.id ? null : order.id)}
                      className="text-[10px] text-primary underline underline-offset-2"
                    >
                      {expandedStepper === order.id ? 'Hide' : 'Track'}
                    </button>
                  </div>
                </div>

                {expandedStepper === order.id && (
                  <div className="mb-3 bg-muted/30 rounded-xl p-3">
                    <p className="text-[10px] font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Order Progress</p>
                    <OrderStepper status={order.status} />
                  </div>
                )}

                <div className="flex gap-2 overflow-x-auto mb-3 pb-1">
                  {(items[order.id] || []).map(item => (
                    <img key={item.id} src={item.image || '/placeholder.svg'} alt={item.title} className="w-14 h-14 rounded-lg object-cover shrink-0 border" />
                  ))}
                  {!(items[order.id]) && (
                    <div className="flex gap-2">
                      {[1,2].map(i => <div key={i} className="w-14 h-14 rounded-lg bg-muted animate-pulse shrink-0" />)}
                    </div>
                  )}
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
                {order.tracking_id && <p className="text-xs text-muted-foreground mb-2">🚚 {order.tracking_id}</p>}

                <div className="flex gap-2 flex-wrap pt-2 border-t">
                  {canCancel(order) && (() => {
                    const hoursLeft = 24 - (Date.now() - new Date(order.created_at).getTime()) / (1000 * 60 * 60);
                    return (
                      <Button size="sm" variant="outline" className="text-destructive gap-1" onClick={() => setCancelDialog(order)}>
                        <XCircle className="h-3 w-3" /> Cancel ({hoursLeft.toFixed(0)}h left)
                      </Button>
                    );
                  })()}
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

      <Dialog open={!!claimDialog} onOpenChange={() => { setClaimDialog(null); setReason(''); setClaimPhotos([]); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> File a Claim</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted/30 rounded-lg p-3 text-sm">
              <p className="font-medium">{claimDialog?.order_number}</p>
              <p className="text-xs text-muted-foreground mt-0.5">You can claim within {claimDays} days of delivery.</p>
            </div>
            <div>
              <Label>Describe the issue *</Label>
              <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="What's wrong? e.g. Sole came apart, wrong size delivered..." className="mt-1" rows={3} />
            </div>
            <div>
              <Label className="flex items-center gap-1.5"><Camera className="h-4 w-4" /> Attach Evidence Photos</Label>
              <p className="text-xs text-muted-foreground mb-2">Photos speed up approval.</p>
              <label className="flex items-center gap-2 border-2 border-dashed rounded-lg p-3 cursor-pointer hover:bg-accent text-sm text-muted-foreground transition-colors">
                <Camera className="h-4 w-4" />
                {uploadingPhoto ? 'Uploading...' : 'Tap to add photos'}
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleClaimPhotoUpload} disabled={uploadingPhoto} />
              </label>
              {claimPhotos.length > 0 && (
                <div className="flex gap-2 flex-wrap mt-2">
                  {claimPhotos.map((img, i) => (
                    <div key={i} className="relative">
                      <img src={img} alt="" className="w-16 h-16 rounded-lg object-cover border" />
                      <button onClick={() => setClaimPhotos(prev => prev.filter((_, j) => j !== i))} className="absolute -top-1 -right-1 bg-destructive text-white rounded-full w-4 h-4 flex items-center justify-center">
                        <XIcon className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Button onClick={submitClaim} disabled={submitting || !reason.trim() || uploadingPhoto} className="w-full gap-2">
              <ShieldCheck className="h-4 w-4" />
              {submitting ? 'Submitting...' : `Submit Claim${claimPhotos.length > 0 ? ` (${claimPhotos.length} photo${claimPhotos.length > 1 ? 's' : ''})` : ''}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!cancelDialog} onOpenChange={() => setCancelDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cancel Order</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm">Are you sure you want to cancel <strong>{cancelDialog?.order_number}</strong>?</p>
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
