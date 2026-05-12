import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import ProductCard from '@/components/home/ProductCard';
import BottomNav from '@/components/layout/BottomNav';
import PageBreadcrumb from '@/components/layout/PageBreadcrumb';
import { Product } from '@/types/product';
import { mapDbProduct, PRODUCT_SELECT } from '@/lib/mapDbProduct';
import { Tag } from 'lucide-react';

const DiscountItems = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'discount' | 'price_low' | 'price_high' | 'newest'>('discount');

  useEffect(() => {
    const col = sortBy === 'discount' ? 'discount_percent'
      : sortBy === 'price_low' ? 'price'
      : sortBy === 'price_high' ? 'price'
      : 'created_at';
    const asc = sortBy === 'price_low';
    supabase
      .from('products')
      .select(PRODUCT_SELECT)
      .gt('discount_percent', 0)
      .eq('is_active', true)
      .order(col, { ascending: asc })
      .limit(60)
      .then(({ data }) => {
        setProducts((data || []).map(mapDbProduct));
        setLoading(false);
      });
  }, [sortBy]);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <main className="container py-5">
        <PageBreadcrumb items={[{ label: 'Sale & Discounts' }]} />

        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-100 rounded-xl">
              <Tag className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Discount Items</h1>
              <p className="text-muted-foreground text-sm">Best deals on shoes &amp; bags — save big!</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!loading && <span className="text-sm bg-muted px-3 py-1 rounded-full text-muted-foreground">{products.length} items</span>}
            <select
              value={sortBy}
              onChange={e => { setLoading(true); setSortBy(e.target.value as any); }}
              className="text-sm border rounded-lg px-3 py-1.5 bg-card focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="discount">Highest Discount</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
              <option value="newest">Newest First</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="py-20 text-center">
            <Tag className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
            <h2 className="text-xl font-semibold mb-2">No discounted items right now</h2>
            <p className="text-muted-foreground">Check back soon — sales drop regularly!</p>
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

export default DiscountItems;
