import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import ProductCard from '@/components/home/ProductCard';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import { Product } from '@/types/product';
import { Zap } from 'lucide-react';

const mapProduct = (p: any): Product => ({
  id: p.id, name: p.title, price: Number(p.price), originalPrice: p.original_price ? Number(p.original_price) : undefined,
  discount: p.discount_percent ? Number(p.discount_percent) : undefined, image: (p.images as any)?.[0] || '/placeholder.svg',
  images: p.images as string[] || [], category: '', brand: p.brand || '', colors: p.colors as string[] || [],
  sizes: p.sizes as string[] || [], rating: Number(p.rating) || 0, reviews: p.review_count || 0,
  stock: p.stock, sold: p.sold, isFlashSale: true, isTrending: p.is_featured,
  gender: p.gender as any, description: p.description, flashSaleEnds: p.flash_sale_ends,
});

const FlashSalePage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    supabase.from('products').select('*').eq('is_flash_sale', true).eq('is_active', true).order('sold', { ascending: false }).limit(40)
      .then(({ data }) => { setProducts((data || []).map(mapProduct)); setLoading(false); });
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        let { hours, minutes, seconds } = prev;
        seconds--;
        if (seconds < 0) { seconds = 59; minutes--; }
        if (minutes < 0) { minutes = 59; hours--; }
        if (hours < 0) return { hours: 23, minutes: 59, seconds: 59 };
        return { hours, minutes, seconds };
      });
    }, 1000);
    if (products.length > 0 && products[0].flashSaleEnds) {
      const diff = new Date(products[0].flashSaleEnds).getTime() - Date.now();
      if (diff > 0) {
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setTimeLeft({ hours: h, minutes: m, seconds: s });
      }
    }
    return () => clearInterval(timer);
  }, [products]);

  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Header />
      <main className="container py-5">
        <div className="flex items-center gap-3 mb-6">
          <Zap className="h-8 w-8 text-sale fill-sale" />
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold text-sale">Flash Sale</h1>
            <p className="text-muted-foreground text-sm">Limited time offers!</p>
          </div>
          <div className="flex items-center gap-1">
            {[timeLeft.hours, timeLeft.minutes, timeLeft.seconds].map((val, i) => (
              <span key={i} className="flex items-center gap-1">
                <span className="bg-foreground text-background text-sm font-bold px-2 py-1 rounded">{pad(val)}</span>
                {i < 2 && <span className="font-bold">:</span>}
              </span>
            ))}
          </div>
        </div>
        {loading ? <p className="text-center py-10 text-muted-foreground">Loading...</p> : products.length === 0 ? <p className="text-center py-10 text-muted-foreground">No flash sale items right now.</p> : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
            {products.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default FlashSalePage;
