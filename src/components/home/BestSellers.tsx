// ============================================================
// BestSellers — order_items table se real sales count karta hai
// Top-sold products show karta hai homepage pe
// ============================================================

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import ProductCard from './ProductCard';
import { Award, ArrowRight, Flame } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Product } from '@/types/product';
import { mapDbProduct, PRODUCT_SELECT } from '@/lib/mapDbProduct';
import { motion } from 'framer-motion';

let _cache: { products: Product[]; counts: Record<string, number> } | null = null;
let _cacheTime = 0;
const CACHE_TTL = 5 * 60_000; // 5 min

const BestSellers = () => {
  const [products, setProducts] = useState<Product[]>(_cache?.products || []);
  const [salesCount, setSalesCount] = useState<Record<string, number>>(_cache?.counts || {});
  const [loading, setLoading] = useState(!_cache);

  useEffect(() => {
    const now = Date.now();
    if (_cache && now - _cacheTime < CACHE_TTL) return;

    const load = async () => {
      setLoading(true);
      try {
        // order_items se product_id + quantity count karo
        const { data: items } = await supabase
          .from('order_items')
          .select('product_id, quantity')
          .not('product_id', 'is', null);

        if (!items || items.length === 0) {
          // Koi orders nahi — fallback: sold column se top products
          const { data: fallback } = await supabase
            .from('products')
            .select(PRODUCT_SELECT)
            .eq('is_active', true)
            .gt('sold', 0)
            .order('sold', { ascending: false })
            .limit(10);
          const mapped = (fallback || []).map(mapDbProduct);
          _cache = { products: mapped, counts: {} };
          _cacheTime = Date.now();
          setProducts(mapped);
          setLoading(false);
          return;
        }

        // Product-wise total quantity sold count karo
        const countMap: Record<string, number> = {};
        for (const item of items) {
          if (!item.product_id) continue;
          countMap[item.product_id] = (countMap[item.product_id] || 0) + (item.quantity || 1);
        }

        // Top 10 products by sales
        const topIds = Object.entries(countMap)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([id]) => id);

        if (topIds.length === 0) {
          setLoading(false);
          return;
        }

        const { data: prods } = await supabase
          .from('products')
          .select(PRODUCT_SELECT)
          .in('id', topIds)
          .eq('is_active', true);

        // DB order se topIds order mein sort karo
        const mapped = (prods || [])
          .map(mapDbProduct)
          .sort((a, b) => (countMap[b.id] || 0) - (countMap[a.id] || 0));

        _cache = { products: mapped, counts: countMap };
        _cacheTime = Date.now();
        setProducts(mapped);
        setSalesCount(countMap);
      } catch {
        // Silent fail — component nahi dikhega
      }
      setLoading(false);
    };

    load();
  }, []);

  if (loading || products.length === 0) return null;

  return (
    <section>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <Award className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              Best Sellers
              <span className="text-xs font-semibold bg-amber-500 text-white px-2 py-0.5 rounded-full">
                #1–10
              </span>
            </h2>
            <p className="text-xs text-muted-foreground">Top-selling products based on real orders</p>
          </div>
        </div>
        <Link
          to="/products?sort=best-sellers"
          className="flex items-center gap-1 text-sm text-primary font-medium hover:underline group"
        >
          View All <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* Rank pills for top 3 */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {products.slice(0, 3).map((p, i) => {
          const medals = ['🥇', '🥈', '🥉'];
          const sold = salesCount[p.id];
          return (
            <Link key={p.id} to={`/product/${p.id}`}>
              <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-full px-3 py-1 text-xs font-medium hover:bg-amber-100 transition-colors">
                <span>{medals[i]}</span>
                <span className="max-w-[120px] truncate text-amber-900 dark:text-amber-200">{p.name}</span>
                {sold ? (
                  <span className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400 font-semibold">
                    <Flame className="h-3 w-3" />{sold} sold
                  </span>
                ) : null}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Product grid with rank badge */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
        {products.map((product, i) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
            className="relative"
          >
            {/* Rank badge — top-left */}
            <div className={`absolute top-2 left-2 z-10 h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-black shadow
              ${i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-slate-400 text-white' : i === 2 ? 'bg-orange-600 text-white' : 'bg-black/60 text-white'}`}>
              {i + 1}
            </div>
            {/* Sales chip — bottom overlay */}
            {salesCount[product.id] ? (
              <div className="absolute bottom-[52px] right-2 z-10 flex items-center gap-0.5 bg-black/70 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                <Flame className="h-2.5 w-2.5 text-orange-400" />
                {salesCount[product.id]} sold
              </div>
            ) : null}
            <ProductCard product={product} index={i} />
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default BestSellers;
