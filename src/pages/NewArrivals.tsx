import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import ProductCard from '@/components/home/ProductCard';
import BottomNav from '@/components/layout/BottomNav';
import PageBreadcrumb from '@/components/layout/PageBreadcrumb';
import { Product } from '@/types/product';
import { mapDbProduct, PRODUCT_SELECT } from '@/lib/mapDbProduct';
import { Sparkles } from 'lucide-react';

const NewArrivals = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    supabase
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('is_active', true)
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: false })
      .limit(60)
      .then(({ data }) => {
        setProducts((data || []).map(mapDbProduct));
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <main className="container py-5">
        <PageBreadcrumb items={[{ label: 'New Arrivals' }]} />

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 rounded-xl">
              <Sparkles className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">New Arrivals</h1>
              <p className="text-muted-foreground text-sm">Products added in the last 30 days</p>
            </div>
          </div>
          {!loading && products.length > 0 && (
            <span className="text-sm text-muted-foreground font-medium bg-muted px-3 py-1 rounded-full">
              {products.length} items
            </span>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="py-20 text-center">
            <Sparkles className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
            <h2 className="text-xl font-semibold mb-2">Nothing new yet</h2>
            <p className="text-muted-foreground">Check back soon — new items drop regularly!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
            {products.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default NewArrivals;
