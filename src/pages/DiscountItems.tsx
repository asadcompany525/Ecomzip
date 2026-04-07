import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import ProductCard from '@/components/home/ProductCard';
import Header from '@/components/layout/Header';
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

const DiscountItems = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('products').select('*').gt('discount_percent', 0).eq('is_active', true).order('discount_percent', { ascending: false }).limit(40)
      .then(({ data }) => { setProducts((data || []).map(mapProduct)); setLoading(false); });
  }, []);

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Header />
      <main className="container py-5">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl">🏷️</span>
          <div><h1 className="text-2xl md:text-3xl font-bold">Discount Items</h1><p className="text-muted-foreground text-sm">Best deals on shoes & bags!</p></div>
        </div>
        {loading ? <p className="text-center py-10 text-muted-foreground">Loading...</p> : products.length === 0 ? <p className="text-center py-10 text-muted-foreground">No discounted items right now.</p> : (
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
