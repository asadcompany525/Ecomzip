import { useEffect, useState } from 'react';
import { RotateCcw, Upload, Camera, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

import BottomNav from '@/components/layout/BottomNav';
import PageBreadcrumb from '@/components/layout/PageBreadcrumb';
import { toast } from '@/hooks/use-toast';

const parseClaimDurationDays = (value?: string | null) => {
  const text = String(value || '').toLowerCase();
  if (!text || text.includes('no claim')) return null;
  const match = text.match(/(\d+)/);
  return match ? Number(match[1]) : null;
};

const MyReturns = () => {
  const { user } = useAuth();
  const [returns, setReturns] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState('');
  const [requestType, setRequestType] = useState<'return' | 'claim'>('return');
  const [reason, setReason] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      supabase.from('returns').select('*, orders(order_number)').eq('user_id', user.id).order('created_at', { ascending: false }).then(({ data }) => setReturns(data || []));
      supabase.from('orders').select('id, order_number, status, created_at').eq('user_id', user.id).in('status', ['delivered', 'received']).order('created_at', { ascending: false }).then(({ data }) => setOrders(data || []));
    }
  }, [user]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setUploading(true);
    const urls: string[] = [...images];
    for (const file of Array.from(files)) {
      const path = `${user?.id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from('returns').upload(path, file);
      if (!error) {
        const { data: urlData } = supabase.storage.from('returns').getPublicUrl(path);
        urls.push(urlData.publicUrl);
      }
    }
    setImages(urls);
    setUploading(false);
  };

  const submitRequest = async () => {
    if (!selectedOrder || !reason.trim()) {
      toast({ title: 'Please fill all fields', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const reasonText = requestType === 'claim' ? `CLAIM: ${reason}` : reason;
      
      // First submit to DB
      const { data: returnData, error } = await supabase.from('returns').insert({
        order_id: selectedOrder,
        user_id: user!.id,
        reason: reasonText,
        images: images,
        status: 'pending',
      }).select('id').single();

      if (error) throw error;

      // AI auto-review
      const selectedOrderData = orders.find(o => o.id === selectedOrder);
      const { data: orderItems } = await supabase.from('order_items').select('*, products:product_id(title, claim_policy, claim_duration, return_policy)').eq('order_id', selectedOrder);
      const product = (orderItems || [])[0]?.products;
      const claimDays = parseClaimDurationDays(product?.claim_duration);
      const daysSinceOrder = selectedOrderData?.created_at
        ? Math.floor((Date.now() - new Date(selectedOrderData.created_at).getTime()) / 86400000)
        : null;
      if (requestType === 'claim' && product?.claim_duration?.toLowerCase?.().includes('no claim')) {
        await supabase.from('returns').update({
          status: 'rejected' as any,
          ai_recommendation: `AI Auto-Rejected: This product is marked as No Claim. Admin instructions: ${product?.claim_policy || 'None'}`
        }).eq('id', returnData.id);
        toast({ title: 'Request auto-reviewed', description: 'This product is marked as No Claim.' });
        setDialogOpen(false);
        setSelectedOrder(''); setReason(''); setImages([]); setRequestType('return');
        const { data: refreshed } = await supabase.from('returns').select('*, orders(order_number)').eq('user_id', user!.id).order('created_at', { ascending: false });
        setReturns(refreshed || []);
        setSubmitting(false);
        return;
      }
      if (requestType === 'claim' && claimDays !== null && daysSinceOrder !== null && daysSinceOrder > claimDays) {
        await supabase.from('returns').update({
          status: 'rejected' as any,
          ai_recommendation: `AI Auto-Rejected: Claim submitted after ${daysSinceOrder} days, outside the ${product?.claim_duration} claim duration.`
        }).eq('id', returnData.id);
        toast({ title: 'Request auto-reviewed', description: `Claim duration expired after ${product?.claim_duration}.` });
        setDialogOpen(false);
        setSelectedOrder(''); setReason(''); setImages([]); setRequestType('return');
        const { data: refreshed } = await supabase.from('returns').select('*, orders(order_number)').eq('user_id', user!.id).order('created_at', { ascending: false });
        setReturns(refreshed || []);
        setSubmitting(false);
        return;
      }
      
      const { data: aiData } = await supabase.functions.invoke('ai-assistant', {
        body: {
          type: 'return-review',
          messages: [{
            role: 'user',
            content: `Auto-review this ${requestType} request:
Reason: ${reason}
Product: ${product?.title || 'Unknown'}
Standard Claim Duration: ${product?.claim_duration || 'Not set'}
AI Claim Advisor Instructions: ${product?.claim_policy || 'None'}
Return Policy: ${product?.return_policy || 'None'}
Order Date: ${selectedOrderData?.created_at ? new Date(selectedOrderData.created_at).toLocaleDateString() : 'Unknown'}
Days Since Order: ${daysSinceOrder ?? 'Unknown'}
Has Images: ${images.length > 0 ? 'Yes' : 'No'}
Type: ${requestType}

Check claim duration first, then check if the claim matches the admin's AI claim instructions. If it clearly does NOT match (e.g., color fade when policy says only sole issues), AUTO-REJECT with explanation. If it matches or is unclear, mark for admin review with recommendation.

Return JSON: { "decision": "reject" or "review", "reason": "explanation" }`
          }]
        }
      });

      const aiReply = typeof aiData === 'string' ? aiData : aiData?.reply || '';
      
      // Try to parse AI decision
      try {
        const jsonMatch = aiReply.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
          const decision = JSON.parse(jsonMatch[0]);
          if (decision.decision === 'reject') {
            await supabase.from('returns').update({ 
              status: 'rejected' as any, 
              ai_recommendation: `AI Auto-Rejected: ${decision.reason}` 
            }).eq('id', returnData.id);
            toast({ title: 'Request auto-reviewed', description: 'AI found this does not match claim policy. Contact support if you disagree.' });
          } else {
            await supabase.from('returns').update({ 
              ai_recommendation: `AI Review: ${decision.reason}` 
            }).eq('id', returnData.id);
            toast({ title: '✅ Request submitted! Under review.' });
          }
        } else {
          await supabase.from('returns').update({ ai_recommendation: aiReply }).eq('id', returnData.id);
          toast({ title: '✅ Request submitted!' });
        }
      } catch {
        toast({ title: '✅ Request submitted!' });
      }

      setDialogOpen(false);
      setSelectedOrder(''); setReason(''); setImages([]); setRequestType('return');
      // Refresh
      const { data: refreshed } = await supabase.from('returns').select('*, orders(order_number)').eq('user_id', user!.id).order('created_at', { ascending: false });
      setReturns(refreshed || []);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setSubmitting(false);
  };

  const getImages = (r: any) => {
    try { return Array.isArray(r?.images) ? r.images : []; } catch { return []; }
  };

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      
      <main className="container py-5 max-w-xl mx-auto">
        <PageBreadcrumb items={[{ label: 'My Account', href: '/my-page' }, { label: 'Returns & Claims' }]} />
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-100 rounded-xl"><RotateCcw className="h-5 w-5 text-orange-500" /></div>
            <div>
              <h1 className="text-2xl font-bold">Returns & Claims</h1>
              <p className="text-sm text-muted-foreground">{returns.length} request{returns.length !== 1 ? 's' : ''} submitted</p>
            </div>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><RotateCcw className="h-4 w-4" /> New Request</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Submit Return / Claim</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label>Type</Label>
                  <Select value={requestType} onValueChange={v => setRequestType(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="return">Return</SelectItem>
                      <SelectItem value="claim">Claim (Warranty)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Select Order</Label>
                  <Select value={selectedOrder} onValueChange={setSelectedOrder}>
                    <SelectTrigger><SelectValue placeholder="Select delivered order" /></SelectTrigger>
                    <SelectContent>
                      {orders.map(o => (
                        <SelectItem key={o.id} value={o.id}>{o.order_number} - {new Date(o.created_at).toLocaleDateString()}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Reason / Description</Label>
                  <Textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder={requestType === 'claim' ? 'Describe the defect (e.g., sole detached, stitching broken)' : 'Why do you want to return?'} />
                </div>
                <div>
                  <Label>Upload Photos (defect/product)</Label>
                  <div className="flex gap-2 flex-wrap mt-2">
                    {images.map((img, i) => (
                      <div key={i} className="relative w-20 h-20">
                        <img src={img} alt="" className="w-full h-full object-cover rounded-lg border" />
                        <button onClick={() => setImages(images.filter((_, j) => j !== i))}
                          className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">×</button>
                      </div>
                    ))}
                    <label className="w-20 h-20 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-accent">
                      <Camera className="h-5 w-5 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">Photos</span>
                      <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                  </div>
                  {uploading && <p className="text-xs text-muted-foreground mt-1">Uploading...</p>}
                </div>
                <p className="text-xs text-muted-foreground">⚡ AI will auto-review your request against product claim policy</p>
                <Button onClick={submitRequest} disabled={submitting} className="w-full gap-2">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {submitting ? 'Submitting & AI Reviewing...' : 'Submit Request'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {returns.length === 0 ? (
          <div className="text-center py-16"><RotateCcw className="h-16 w-16 mx-auto mb-4 text-muted-foreground" /><p className="text-muted-foreground">No return requests</p></div>
        ) : (
          <div className="space-y-3">
            {returns.map(r => (
              <div key={r.id} className="bg-card rounded-xl border p-4">
                <div className="flex justify-between mb-2">
                  <p className="font-medium text-sm">Order: {r.orders?.order_number}</p>
                  <Badge variant={r.status === 'approved' ? 'default' : r.status === 'rejected' ? 'destructive' : 'secondary'}>{r.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{r.reason?.replace('CLAIM: ', '')}</p>
                {getImages(r).length > 0 && (
                  <div className="flex gap-1 mt-2">
                    {getImages(r).map((img: string, i: number) => (
                      <img key={i} src={img} alt="" className="w-12 h-12 rounded object-cover border" />
                    ))}
                  </div>
                )}
                {r.ai_recommendation && (
                  <div className="mt-2 p-2 bg-muted rounded text-xs">
                    <p className="font-medium">AI Review:</p>
                    <p>{r.ai_recommendation}</p>
                  </div>
                )}
                {r.refund_amount && <p className="text-xs text-primary mt-1">Refund: Rs. {Number(r.refund_amount).toLocaleString()}</p>}
              </div>
            ))}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default MyReturns;
