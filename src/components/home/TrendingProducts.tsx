import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import ProductCard from './ProductCard';
import { TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Product } from '@/types/product';

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
  gender: p.gender as any, description: p.description, type: '',
});

const TrendingProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    supabase.from('products').select('*').eq('is_active', true).eq('is_featured', true).order('sold', { ascending: false }).limit(10)
      .then(({ data }) => setProducts((data || []).map(mapDbProduct)));
  }, []);

  if (products.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          <h2 className="text-xl md:text-2xl font-bold">Trending Now</h2>
        </div>
        <Link to="/products" className="text-sm text-primary font-medium hover:underline">View All →</Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
        {products.map((product, i) => (
          <ProductCard key={product.id} product={product} index={i} />
        ))}
      </div>
    </section>
  );
};

export default TrendingProducts;
