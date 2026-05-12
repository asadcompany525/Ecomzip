import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Star, Check, X, Trash2, MessageSquare } from 'lucide-react';

const AdminReviews = () => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'all'>('pending');
  const [loading, setLoading] = useState(true);

  const fetchReviews = async () => {
    setLoading(true);
    let query = supabase.from('reviews').select('*, products(title, images)').order('created_at', { ascending: false });
    if (filter === 'pending') query = query.eq('is_approved', false);
    if (filter === 'approved') query = query.eq('is_approved', true);
    const { data } = await query;
    setReviews(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchReviews(); }, [filter]);

  const approve = async (id: string) => {
    await supabase.from('reviews').update({ is_approved: true }).eq('id', id);
    toast({ title: 'Review approved!' });
    setReviews(prev => prev.map(r => r.id === id ? { ...r, is_approved: true } : r));
  };

  const reject = async (id: string) => {
    if (!confirm('Delete this review?')) return;
    await supabase.from('reviews').delete().eq('id', id);
    toast({ title: 'Review deleted' });
    setReviews(prev => prev.filter(r => r.id !== id));
  };

  const pendingCount = reviews.filter(r => !r.is_approved).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-yellow-100 rounded-xl"><MessageSquare className="h-5 w-5 text-yellow-600" /></div>
          <div>
            <h1 className="text-xl font-bold">Reviews Management</h1>
            <p className="text-sm text-muted-foreground">{reviews.length} reviews in current view</p>
          </div>
        </div>
        <div className="flex gap-2">
          {(['pending', 'approved', 'all'] as const).map(f => (
            <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} onClick={() => setFilter(f)} className="capitalize text-xs h-8">
              {f === 'pending' ? `Pending${pendingCount > 0 && filter !== 'pending' ? ` (${pendingCount})` : ''}` : f === 'approved' ? 'Approved' : 'All'}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-28 bg-muted rounded-xl animate-pulse" />)}
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border">
          <Star className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="font-medium">No {filter} reviews</p>
          <p className="text-sm text-muted-foreground mt-1">Reviews will appear here once submitted</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map(r => (
            <div key={r.id} className="bg-card border rounded-xl p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start gap-4">
                <img
                  src={(r.products?.images as any)?.[0] || '/placeholder.svg'}
                  alt=""
                  className="w-14 h-14 rounded-xl object-cover shrink-0 border"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{r.products?.title || 'Product'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} className={`h-3.5 w-3.5 ${s <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
                          ))}
                        </div>
                        <span className="text-xs font-semibold">{r.rating}/5</span>
                        {r.reviewer_name && <span className="text-xs text-muted-foreground">by {r.reviewer_name}</span>}
                        <span className="text-xs text-muted-foreground">· {new Date(r.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <Badge className={r.is_approved ? 'bg-green-100 text-green-800 border-0 text-xs' : 'bg-yellow-100 text-yellow-800 border-0 text-xs'}>
                      {r.is_approved ? 'Approved' : 'Pending'}
                    </Badge>
                  </div>

                  {r.comment && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2 bg-muted/50 rounded-lg px-3 py-2">{r.comment}</p>
                  )}

                  {r.images && (r.images as string[]).length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {(r.images as string[]).map((img, i) => (
                        <img key={i} src={img} alt="" className="w-12 h-12 rounded-lg object-cover border" />
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  {!r.is_approved && (
                    <Button size="sm" onClick={() => approve(r.id)} className="gap-1 h-8 text-xs bg-green-600 hover:bg-green-700">
                      <Check className="h-3 w-3" /> Approve
                    </Button>
                  )}
                  <Button size="sm" variant="destructive" onClick={() => reject(r.id)} className="gap-1 h-8 text-xs">
                    <Trash2 className="h-3 w-3" /> Delete
                  </Button>
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
