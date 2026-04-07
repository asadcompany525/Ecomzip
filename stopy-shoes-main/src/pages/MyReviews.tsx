import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/layout/Header';

import BottomNav from '@/components/layout/BottomNav';

const MyReviews = () => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    if (user) supabase.from('reviews').select('*, products(title, images)').eq('user_id', user.id).order('created_at', { ascending: false }).then(({ data }) => setReviews(data || []));
  }, [user]);

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Header />
      <main className="container py-5 max-w-xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">My Reviews</h1>
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
