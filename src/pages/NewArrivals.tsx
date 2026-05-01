import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import ProductCard from '@/components/home/ProductCard';

import BottomNav from '@/components/layout/BottomNav';
import { Product } from '@/types/product';

const mapProduct = (p: any): Product => ({
  id: p.id, name: p.title, price: Number(p.price), originalPrice: p.original_price ? Number(p.original_price) : undefined,
  discount: p.discount_percent ? Number(p.discount_percent) : undefined, image: (p.images as any)?.[0] || '/placeholder.svg',
  images: p.images as string[] || [], category: '', brand: p.brand || '', colors: p.colors as string[] || [],
  sizes: p.sizes as string[] || [], rating: Number(p.rating) || 0, reviews: p.review_count || 0,
  stock: p.stock, sold: p.sold, isFlashSale: p.is_flash_sale, isTrending: p.is_featured,
  gender: p.gender as any, description: p.description,
});

const NewArrivals = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('products').select('*').eq('is_new_arrival', true).eq('is_active', true).order('created_at', { ascending: false }).limit(40)
      .then(({ data }) => { setProducts((data || []).map(mapProduct)); setLoading(false); });
  }, []);

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      
      <main className="container py-5">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl">🆕</span>
          <div><h1 className="text-2xl md:text-3xl font-bold">New Arrivals</h1><p className="text-muted-foreground text-sm">Discover our latest collection</p></div>
        </div>
        {loading ? <p className="text-center py-10 text-muted-foreground">Loading...</p> : products.length === 0 ? <p className="text-center py-10 text-muted-foreground">No new arrivals yet. Check back soon!</p> : (
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
