import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import ProductCard from './ProductCard';
import { Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Product } from '@/types/product';
import { logTimezoneSync } from '@/lib/pkt';

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

const getTimeUntilMidnightPKT = () => {
  // Pakistan Standard Time is UTC+5
  const nowUtc = Date.now();
  const nowPkt = new Date(nowUtc + 5 * 60 * 60 * 1000);
  const midnightPkt = new Date(nowPkt);
  midnightPkt.setUTCHours(24, 0, 0, 0);
  const diffMs = midnightPkt.getTime() - nowPkt.getTime();
  const totalSec = Math.floor(diffMs / 1000);
  return {
    hours: Math.floor(totalSec / 3600),
    minutes: Math.floor((totalSec % 3600) / 60),
    seconds: totalSec % 60,
  };
};

const FlashSale = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [timeLeft, setTimeLeft] = useState(getTimeUntilMidnightPKT);

  useEffect(() => {
    logTimezoneSync();
    supabase.from('products').select('*').eq('is_active', true).eq('is_flash_sale', true).limit(5)
      .then(({ data }) => setProducts((data || []).map(mapDbProduct)));
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeUntilMidnightPKT());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (products.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-sale fill-sale" />
            <h2 className="text-xl md:text-2xl font-bold text-sale">Flash Sale</h2>
          </div>
          <div className="flex items-center gap-1">
            {[timeLeft.hours, timeLeft.minutes, timeLeft.seconds].map((val, i) => (
              <span key={i} className="flex items-center gap-1">
                <span className="bg-foreground text-background text-xs md:text-sm font-bold px-2 py-1 rounded">{pad(val)}</span>
                {i < 2 && <span className="font-bold text-foreground">:</span>}
              </span>
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground hidden sm:inline">PKT (UTC+5)</span>
        </div>
        <Link to="/flash-sale" className="text-sm text-primary font-medium hover:underline">View All →</Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
        {products.map((product, i) => (
          <ProductCard key={product.id} product={product} index={i} />
        ))}
      </div>
    </section>
  );
};

export default FlashSale;
