// ============================================================
// CategoryGrid — Homepage category buttons (Sneakers, Bags, etc.)
// Image milne par image show ho, nahi milne par sirf gradient + name
// ============================================================

import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';

const GRADIENT_COLORS = [
  'from-orange-50 to-orange-100 border-orange-200/60',
  'from-blue-50 to-blue-100 border-blue-200/60',
  'from-purple-50 to-purple-100 border-purple-200/60',
  'from-green-50 to-green-100 border-green-200/60',
  'from-pink-50 to-pink-100 border-pink-200/60',
  'from-amber-50 to-amber-100 border-amber-200/60',
  'from-cyan-50 to-cyan-100 border-cyan-200/60',
  'from-red-50 to-red-100 border-red-200/60',
];

let _cache: any[] | null = null;
let _cacheTime = 0;
const CACHE_TTL = 120_000;

const CategoryGrid = () => {
  const [categories, setCategories] = useState<any[]>(_cache || []);

  useEffect(() => {
    const now = Date.now();
    if (_cache && now - _cacheTime < CACHE_TTL) return;
    supabase.from('categories').select('*').eq('is_active', true).eq('level', 1).order('sort_order')
      .then(({ data }) => {
        const cats = data || [];
        _cache = cats; _cacheTime = Date.now();
        setCategories(cats);
      });
  }, []);

  if (categories.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold">Shop by Category</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Find what you're looking for</p>
        </div>
        <Link to="/products" className="text-sm text-primary font-medium hover:underline">View All →</Link>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 md:gap-3">
        {categories.map((cat, i) => {
          const imgSrc = cat.image_url || cat.image || null;
          return (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: Math.min(i * 0.04, 0.24) }}
            >
              <Link
                to={`/products?category=${cat.name}`}
                className={`flex flex-col items-center justify-center gap-1.5 p-2.5 md:p-3 rounded-2xl bg-gradient-to-b border ${GRADIENT_COLORS[i % GRADIENT_COLORS.length]} hover:shadow-md hover:scale-105 transition-all duration-200 group min-h-[64px] overflow-hidden`}
              >
                {imgSrc ? (
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl overflow-hidden flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                    <img
                      src={imgSrc}
                      alt={cat.name}
                      className="w-full h-full object-cover"
                      onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex-shrink-0" />
                )}
                <span className="text-[10px] md:text-xs font-semibold text-center leading-tight text-foreground/80">{cat.name}</span>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};

export default CategoryGrid;
