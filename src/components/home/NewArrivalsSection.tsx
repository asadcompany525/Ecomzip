import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import ProductCard from './ProductCard';
import SwipeCarousel from './SwipeCarousel';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Product } from '@/types/product';
import { mapDbProduct, PRODUCT_SELECT } from '@/lib/mapDbProduct';

let _cache: Product[] | null = null;
let _cacheTime = 0;
const CACHE_TTL = 60_000;

const NewArrivalsSection = () => {
  const [products, setProducts] = useState<Product[]>(_cache || []);

  useEffect(() => {
    const now = Date.now();
    if (_cache && now - _cacheTime < CACHE_TTL) return;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    supabase
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('is_active', true)
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        const p = (data || []).map(mapDbProduct);
        _cache = p;
        _cacheTime = Date.now();
        setProducts(p);
      });
  }, []);

  if (products.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-emerald-600">New Arrivals</h2>
            <p className="text-xs text-muted-foreground">Fresh products — last 30 days</p>
          </div>
        </div>
        <Link to="/new-arrivals" className="flex items-center gap-1 text-sm text-primary font-medium hover:underline group">
          View All <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
      <SwipeCarousel
        itemWidth={158}
        gap={12}
        desktopGrid="md:grid-cols-4 lg:grid-cols-5"
      >
        {products.map((product, i) => (
          <ProductCard key={product.id} product={product} index={i} />
        ))}
      </SwipeCarousel>
    </section>
  );
};

export default NewArrivalsSection;
