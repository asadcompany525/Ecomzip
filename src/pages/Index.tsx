import { useEffect, useState } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BottomNav from '@/components/layout/BottomNav';
import HeroBanner from '@/components/home/HeroBanner';
import CategoryGrid from '@/components/home/CategoryGrid';
import FlashSale from '@/components/home/FlashSale';
import BestSellers from '@/components/home/BestSellers';
import TrendingProducts from '@/components/home/TrendingProducts';
import DiscountedProducts from '@/components/home/DiscountedProducts';
import NewArrivalsSection from '@/components/home/NewArrivalsSection';
import AIRecommended from '@/components/home/AIRecommended';
import RecentlyViewed from '@/components/home/RecentlyViewed';
import ProductCard from '@/components/home/ProductCard';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types/product';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { mapDbProduct, PRODUCT_SELECT } from '@/lib/mapDbProduct';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import WelcomeModal from '@/components/home/WelcomeModal';

let _cachedProducts: Product[] | null = null;
let _cacheTime = 0;
const CACHE_TTL = 60_000;

const Index = () => {
  const [allProducts, setAllProducts] = useState<Product[]>(_cachedProducts || []);

  useEffect(() => {
    const now = Date.now();
    if (_cachedProducts && now - _cacheTime < CACHE_TTL) return;
    supabase
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        const products = (data || []).map(mapDbProduct);
        _cachedProducts = products;
        _cacheTime = Date.now();
        setAllProducts(products);
      });
  }, []);

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Header />
      <main className="container space-y-10 md:space-y-14 py-5 md:py-8">

        {/* Hero Banner */}
        <HeroBanner />

        {/* Category Grid */}
        <CategoryGrid />

        {/* Flash Sale */}
        <FlashSale />

        {/* New Arrivals — auto 30-day window */}
        <NewArrivalsSection />

        {/* Best Deals / Discounts */}
        <DiscountedProducts />

        {/* Popular / Trending */}
        <TrendingProducts />

        {/* Best Sellers — ranked by real order quantities */}
        <BestSellers />

        {/* Recently Viewed */}
        <RecentlyViewed />

        {/* AI Picks */}
        <AIRecommended />

        {/* All Products */}
        {allProducts.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="h-8 w-1 bg-primary rounded-full" />
                <div>
                  <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5 text-primary" />
                    All Products
                  </h2>
                  <p className="text-xs text-muted-foreground">{allProducts.length} items available</p>
                </div>
              </div>
              <Link to="/products">
                <Button variant="outline" size="sm" className="gap-1 group">
                  View All <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
              {allProducts.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>
            <div className="mt-8 text-center">
              <Link to="/products">
                <Button size="lg" className="gap-2 px-8">
                  Browse All Products <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </section>
        )}
      </main>
      <Footer />
      <BottomNav />
      <WelcomeModal />
    </div>
  );
};

export default Index;
