import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import ProductCard from './ProductCard';
import { Bot, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Product } from '@/types/product';
import { mapDbProduct, PRODUCT_SELECT } from '@/lib/mapDbProduct';

let _cache: Product[] | null = null;
let _cacheTime = 0;
const CACHE_TTL = 120_000;

const AIRecommended = () => {
  const [products, setProducts] = useState<Product[]>(_cache || []);

  useEffect(() => {
    const now = Date.now();
    if (_cache && now - _cacheTime < CACHE_TTL) return;

    supabase
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('is_active', true)
      .order('sold', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (!data || data.length === 0) return;
        const all = data.map(mapDbProduct);
        const shuffled = [...all].sort(() => Math.random() - 0.5).slice(0, 8);
        _cache = shuffled;
        _cacheTime = Date.now();
        setProducts(shuffled);
      });
  }, []);

  if (products.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <Bot className="h-5 w-5 text-violet-500" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-violet-600">AI Picks For You</h2>
            <p className="text-xs text-muted-foreground">Smart suggestions based on trends</p>
          </div>
        </div>
        <Link to="/products" className="flex items-center gap-1 text-sm text-primary font-medium hover:underline group">
          View All <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3 md:gap-4">
        {products.map((product, i) => (
          <ProductCard key={product.id} product={product} index={i} />
        ))}
      </div>
    </section>
  );
};

export default AIRecommended;
