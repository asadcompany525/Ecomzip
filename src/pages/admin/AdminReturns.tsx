import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Eye, Search, ExternalLink } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AdminDateFilter from '@/components/admin/AdminDateFilter';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

const AdminReturns = () => {
  const [returns, setReturns] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<Date | undefined>(new Date());
  const [selected, setSelected] = useState<any>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [order, setOrder] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [productDetails, setProductDetails] = useState<any[]>([]);
  const [aiChecking, setAiChecking] = useState(false);

  const fetchReturns = async () => {
    let query = supabase.from('returns').select('*').order('created_at', { ascending: false });
    if (statusFilter !== 'all') query = query.eq('status', statusFilter as any);
    
    if (dateFilter) {
      const start = new Date(dateFilter);
      start.setHours(0, 0, 0, 0);
      const end = new Date(dateFilter);
      end.setHours(23, 59, 59, 999);
      query = query.gte('created_at', start.toISOString()).lte('created_at', end.toISOString());
    }
    
    const { data } = await query;
    setReturns(data || []);
  };

  useEffect(() => { fetchReturns(); }, [statusFilter, dateFilter]);

  const viewReturn = async (r: any) => {
    setSelected(r);
    setAdminNotes(r.admin_notes || '');
    setRefundAmount(r.refund_amount ? String(r.refund_amount) : '');
    const { data: ord } = await supabase.from('orders').select('*').eq('id', r.order_id).maybeSingle();
    setOrder(ord);
    const { data: items } = await supabase.from('order_items').select('*').eq('order_id', r.order_id);
    setOrderItems(items || []);
    if (items && items.length > 0) {
      const productIds = items.map(i => i.product_id).filter(Boolean);
      if (productIds.length > 0) {
        const { data: prods } = await supabase.from('products').select('id, title, images, claim_policy, claim_duration, return_policy, price, brand').in('id', productIds);
        setProductDetails(prods || []);
      }
    }
  };

  const aiReview = async () => {
    if (!selected) return;
    setAiChecking(true);
    try {
      const product = productDetails?.[0];
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          type: 'return-review',
          messages: [{
            role: 'user',
            content: `Review this ${isClaim(selected) ? 'CLAIM' : 'RETURN'} request:
Reason: ${selected.reason}
Product: ${product?.title || 'Unknown'}
Standard Claim Duration: ${product?.claim_duration || 'Not set'}
AI Claim Advisor Instructions: ${product?.claim_policy || 'None'}
Product Return Policy: ${product?.return_policy || 'None'}
Order Date: ${order ? new Date(order.created_at).toLocaleDateString() : 'Unknown'}
Return Date: ${new Date(selected.created_at).toLocaleDateString()}
Has Images: ${images(selected).length > 0 ? 'Yes' : 'No'}
Admin Notes: ${adminNotes || 'None'}

Check if: 1) Return/claim is within policy time, 2) Claim reason matches the admin's AI instructions, 3) Customer photos support the claim, 4) Recommend approve/reject with explanation`
          }]
        }
      });
      if (error) throw error;
      if (data?.error) throw new Error(typeof data.error === 'string' ? data.error : 'AI service error');
      const recommendation = typeof data === 'string' ? data : data?.reply || data?.content || '';
      await supabase.from('returns').update({ ai_recommendation: recommendation }).eq('id', selected.id);
      setSelected((s: any) => ({ ...s, ai_recommendation: recommendation }));
      toast({ title: 'AI Review Complete' });
    } catch (e: any) {
      toast({ title: 'AI Error', description: e.message, variant: 'destructive' });
    }
    setAiChecking(false);
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('returns').update({
      status: status as any,
      admin_notes: adminNotes || null,
      refund_amount: refundAmount ? Number(refundAmount) : null,
    }).eq('id', id);
    toast({ title: `Return ${status}` });
    fetchReturns();
    setSelected(null);
  };

  const isClaim = (r: any) => r?.reason?.startsWith('CLAIM:');
  const images = (r: any) => {
    try { return Array.isArray(r?.images) ? r.images : JSON.parse(r?.images || '[]'); } catch { return []; }
  };

  const filtered = returns.filter(r =>
    r.id.includes(search) || r.reason?.toLowerCase().includes(search.toLowerCase()) ||
    r.order_id?.includes(search)
  );

  const stats = {
    total: returns.length,
    pending: returns.filter(r => r.status === 'pending').length,
    approved: returns.filter(r => r.status === 'approved').length,
    rejected: returns.filter(r => r.status === 'rejected').length,
    claims: returns.filter(r => isClaim(r)).length,
  };

  const getProductForItem = (item: any) => productDetails?.find((p: any) => p.id === item.product_id);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { l: 'Total', v: stats.total, c: 'text-foreground' },
          { l: 'Pending', v: stats.pending, c: 'text-yellow-600' },
          { l: 'Approved', v: stats.approved, c: 'text-green-600' },
          { l: 'Rejected', v: stats.rejected, c: 'text-red-600' },
          { l: 'Claims', v: stats.claims, c: 'text-purple-600' },
        ].map(s => (
          <div key={s.l} className="bg-card border rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">{s.l}</p>
            <p className={`text-xl font-bold ${s.c}`}>{s.v}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search returns..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <AdminDateFilter date={dateFilter} onDateChange={setDateFilter} />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50">
            <th className="text-left p-3">Type</th>
            <th className="text-left p-3">Reason</th>
            <th className="text-left p-3">Status</th>
            <th className="text-left p-3">AI Suggestion</th>
            <th className="text-left p-3">Date</th>
            <th className="text-left p-3">Images</th>
            <th className="text-left p-3">Actions</th>
          </tr></thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} className="border-b hover:bg-accent/50">
                <td className="p-3"><Badge variant={isClaim(r) ? 'default' : 'outline'}>{isClaim(r) ? 'Claim' : 'Return'}</Badge></td>
                <td className="p-3 max-w-[160px] truncate">{r.reason?.replace('CLAIM: ', '')}</td>
                <td className="p-3">
                  <Badge variant={r.status === 'pending' ? 'secondary' : r.status === 'approved' ? 'default' : 'destructive'}>{r.status}</Badge>
                </td>
                <td className="p-3">
                  {r.ai_recommendation ? (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      r.ai_recommendation.toLowerCase().includes('approve') ? 'bg-green-100 text-green-700' :
                      r.ai_recommendation.toLowerCase().includes('reject') ? 'bg-red-100 text-red-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {r.ai_recommendation.toLowerCase().includes('approve') ? '✓ AI Approved' :
                       r.ai_recommendation.toLowerCase().includes('reject') ? '✗ AI Rejected' :
                       '⚠ Review'}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
                <td className="p-3 text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
                <td className="p-3">
                  {images(r).length > 0 ? (
                    <div className="flex gap-1">
                      {images(r).slice(0, 2).map((img: string, i: number) => (
                        <img key={i} src={img} alt="" className="w-8 h-8 rounded object-cover border" />
                      ))}
                      {images(r).length > 2 && <span className="text-xs text-muted-foreground">+{images(r).length - 2}</span>}
                    </div>
                  ) : '-'}
                </td>
                <td className="p-3">
                  <Button size="sm" variant="ghost" onClick={() => viewReturn(r)}><Eye className="h-4 w-4 mr-1" /> View</Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} className="text-center p-8 text-muted-foreground">No returns/claims found</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{isClaim(selected) ? 'Claim Detail' : 'Return Detail'}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Status:</span> <Badge>{selected.status}</Badge></div>
                <div><span className="text-muted-foreground">Date:</span> {new Date(selected.created_at).toLocaleDateString()}</div>
                <div><span className="text-muted-foreground">Type:</span> {isClaim(selected) ? 'Claim/Warranty' : 'Return'}</div>
                <div><span className="text-muted-foreground">Order:</span> {order?.order_number || '-'}</div>
              </div>

              <div className="bg-muted/50 p-3 rounded-lg text-sm">
                <p className="font-medium mb-1">Reason:</p>
                <p>{selected.reason?.replace('CLAIM: ', '')}</p>
              </div>

              {/* Customer Screenshots */}
              {images(selected).length > 0 && (
                <div>
                  <p className="font-medium text-sm mb-2">Customer Screenshots:</p>
                  <div className="flex gap-2 flex-wrap">
                    {images(selected).map((img: string, i: number) => (
                      <a key={i} href={img} target="_blank" rel="noopener">
                        <img src={img} alt="" className="w-24 h-24 object-cover rounded-lg border hover:opacity-80 transition" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Products in order */}
              {orderItems.length > 0 && (
                <div>
                  <p className="font-medium text-sm mb-2">Products in Order:</p>
                  {orderItems.map(item => {
                    const prod = getProductForItem(item);
                    return (
                      <div key={item.id} className="p-3 bg-muted/30 rounded-lg mb-2">
                        <div className="flex items-center gap-3">
                          <img src={item.image || (prod?.images as any)?.[0] || '/placeholder.svg'} alt="" className="w-16 h-16 rounded object-cover border" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">{item.title}</p>
                              {prod && (
                                <Link to={`/product/${prod.id}`} target="_blank" className="text-primary">
                                  <ExternalLink className="h-3 w-3" />
                                </Link>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">Size: {item.size || '-'} | Color: {item.color || '-'} | Qty: {item.quantity}</p>
                            <p className="text-sm font-medium text-primary">Rs. {Number(item.price).toLocaleString()}</p>
                          </div>
                        </div>
                        {prod && (
                          <div className="mt-2 text-xs space-y-1 border-t pt-2">
                            {prod.return_policy && <p><span className="font-medium">Return:</span> {prod.return_policy}</p>}
                            {prod.claim_duration && <p><span className="font-medium">Claim Duration:</span> {prod.claim_duration}</p>}
                            {prod.claim_policy && <p><span className="font-medium">AI Claim Instructions:</span> {prod.claim_policy}</p>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* AI Review */}
              <Button variant="outline" onClick={aiReview} disabled={aiChecking} className="w-full gap-2">
                {aiChecking ? 'AI Reviewing...' : 'AI Auto-Review'}
              </Button>

              {selected.ai_recommendation && (
                <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg text-sm">
                  <p className="font-medium mb-1">AI Recommendation:</p>
                  <p className="whitespace-pre-wrap">{selected.ai_recommendation}</p>
                </div>
              )}

              <div><Label>Admin Notes</Label><Textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} rows={2} className="mt-1" /></div>
              <div><Label>Refund Amount (Rs.)</Label><Input value={refundAmount} onChange={e => setRefundAmount(e.target.value)} className="mt-1" /></div>

              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => updateStatus(selected.id, 'approved')}>Approve</Button>
                <Button variant="destructive" className="flex-1" onClick={() => updateStatus(selected.id, 'rejected')}>Reject</Button>
                <Button variant="outline" className="flex-1" onClick={() => updateStatus(selected.id, 'refunded')}>Refund</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminReturns;
