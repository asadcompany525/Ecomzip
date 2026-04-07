import { useEffect, useState } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BottomNav from '@/components/layout/BottomNav';
import HeroBanner from '@/components/home/HeroBanner';
import CategoryGrid from '@/components/home/CategoryGrid';
import FlashSale from '@/components/home/FlashSale';
import TrendingProducts from '@/components/home/TrendingProducts';
import DiscountedProducts from '@/components/home/DiscountedProducts';
import ProductCard from '@/components/home/ProductCard';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types/product';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const mapDbProduct = (p: any): Product => ({
  id: p.id, name: p.title, price: Number(p.price),
  originalPrice: p.original_price ? Number(p.original_price) : undefined,
  discount: p.discount_percent ? Number(p.discount_percent) : undefined,
  image: (p.images as any)?.[0] || '/placeholder.svg',
  images: (p.images as string[]) || [], category: p.category_id || '',
  brand: p.brand || '', colors: (p.colors as string[]) || [],
  sizes: (p.sizes as string[]) || [], rating: Number(p.rating) || 0,
  reviews: p.review_count || 0, stock: p.stock, sold: p.sold,
  isFlashSale: p.is_flash_sale, isTrending: p.is_featured,
  gender: p.gender as any, description: p.description, type: p.sub_category_id || '',
});

const Index = () => {
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  useEffect(() => {
    supabase.from('products').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(50)
      .then(({ data }) => setAllProducts((data || []).map(mapDbProduct)));
  }, []);

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Header />
      <main className="container space-y-8 md:space-y-12 py-5 md:py-8">
        <HeroBanner />
        <CategoryGrid />
        <FlashSale />
        <TrendingProducts />
        <DiscountedProducts />

        {/* All Products */}
        {allProducts.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl md:text-2xl font-bold">🛍️ All Products</h2>
              <Link to="/products"><Button variant="outline" size="sm">View All</Button></Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
              {allProducts.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        )}
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
};

export default Index;
