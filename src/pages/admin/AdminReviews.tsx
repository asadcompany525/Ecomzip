import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Star, Check, X, Trash2 } from 'lucide-react';

const AdminReviews = () => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'all'>('pending');

  const fetchReviews = async () => {
    let query = supabase.from('reviews').select('*, products(title, images)').order('created_at', { ascending: false });
    if (filter === 'pending') query = query.eq('is_approved', false);
    if (filter === 'approved') query = query.eq('is_approved', true);
    const { data } = await query;
    setReviews(data || []);
  };

  useEffect(() => { fetchReviews(); }, [filter]);

  const approve = async (id: string) => {
    await supabase.from('reviews').update({ is_approved: true }).eq('id', id);
    toast({ title: 'Review approved!' });
    fetchReviews();
  };

  const reject = async (id: string) => {
    await supabase.from('reviews').delete().eq('id', id);
    toast({ title: 'Review deleted' });
    fetchReviews();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Reviews Management</h1>
        <div className="flex gap-2">
          {(['pending', 'approved', 'all'] as const).map(f => (
            <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} onClick={() => setFilter(f)} className="capitalize">{f}</Button>
          ))}
        </div>
      </div>

      {reviews.length === 0 ? (
        <p className="text-center py-10 text-muted-foreground">No {filter} reviews</p>
      ) : (
        <div className="space-y-3">
          {reviews.map(r => (
            <div key={r.id} className="bg-card border rounded-xl p-4">
              <div className="flex items-start gap-4">
                <img src={(r.products?.images as any)?.[0] || '/placeholder.svg'} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{r.products?.title || 'Product'}</p>
                  <div className="flex items-center gap-1 my-1">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={`h-3.5 w-3.5 ${s <= r.rating ? 'fill-warning text-warning' : 'text-muted'}`} />
                    ))}
                    <span className="text-xs text-muted-foreground ml-2">{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                  {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
                  {r.images && (r.images as string[]).length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {(r.images as string[]).map((img, i) => (
                        <img key={i} src={img} alt="" className="w-12 h-12 rounded object-cover border" />
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {r.is_approved ? (
                    <Badge className="bg-green-100 text-green-800">Approved</Badge>
                  ) : (
                    <>
                      <Button size="sm" onClick={() => approve(r.id)} className="gap-1"><Check className="h-3 w-3" /> Approve</Button>
                      <Button size="sm" variant="destructive" onClick={() => reject(r.id)} className="gap-1"><X className="h-3 w-3" /> Reject</Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminReviews;
