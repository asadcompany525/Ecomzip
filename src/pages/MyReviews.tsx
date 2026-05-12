import { useEffect, useState } from 'react';
import { Star, MessageSquare } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import BottomNav from '@/components/layout/BottomNav';
import PageBreadcrumb from '@/components/layout/PageBreadcrumb';

const MyReviews = () => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    if (user) supabase.from('reviews').select('*, products(title, images)').eq('user_id', user.id).order('created_at', { ascending: false }).then(({ data }) => setReviews(data || []));
  }, [user]);

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <main className="container py-5 max-w-xl mx-auto">
        <PageBreadcrumb items={[{ label: 'My Account', href: '/my-page' }, { label: 'My Reviews' }]} />
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-yellow-100 rounded-xl"><Star className="h-5 w-5 text-yellow-500" /></div>
          <div>
            <h1 className="text-2xl font-bold">My Reviews</h1>
            <p className="text-sm text-muted-foreground">{reviews.length} review{reviews.length !== 1 ? 's' : ''} submitted</p>
          </div>
        </div>
        {reviews.length === 0 ? (
          <div className="text-center py-16"><Star className="h-16 w-16 mx-auto mb-4 text-muted-foreground" /><p className="text-muted-foreground">No reviews yet</p></div>
        ) : (
          <div className="space-y-3">
            {reviews.map(r => (
              <div key={r.id} className="bg-card rounded-xl border p-4">
                <div className="flex gap-1 mb-1">{[...Array(r.rating)].map((_, i) => <Star key={i} className="h-4 w-4 fill-warning text-warning" />)}</div>
                <p className="font-medium text-sm">{r.products?.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{r.comment}</p>
                <p className="text-xs text-muted-foreground mt-1">{new Date(r.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </main>
      
      <BottomNav />
    </div>
  );
};

export default MyReviews;
