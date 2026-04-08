import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';

const CategoryGrid = () => {
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('categories').select('*').eq('is_active', true).eq('level', 1).order('sort_order')
      .then(({ data }) => setCategories(data || []));
  }, []);

  if (categories.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl md:text-2xl font-bold">Shop by Category</h2>
        <Link to="/products" className="text-sm text-primary font-medium hover:underline">View All →</Link>
      </div>
      <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
        {categories.map((cat, i) => (
          <motion.div key={cat.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Link to={`/products?category=${cat.name}`}
              className="flex flex-col items-center justify-center gap-1 p-3 rounded-xl bg-card hover:shadow-md hover:scale-105 transition-all group border min-h-[56px]">
              <span className="text-[11px] md:text-xs font-semibold text-center leading-tight">{cat.name}</span>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default CategoryGrid;
