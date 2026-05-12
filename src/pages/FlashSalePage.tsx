import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import ProductCard from '@/components/home/ProductCard';
import BottomNav from '@/components/layout/BottomNav';
import PageBreadcrumb from '@/components/layout/PageBreadcrumb';
import { Product } from '@/types/product';
import { mapDbProduct, PRODUCT_SELECT } from '@/lib/mapDbProduct';
import { Zap } from 'lucide-react';

const FlashSalePage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    supabase
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('is_flash_sale', true)
      .eq('is_active', true)
      .order('sold', { ascending: false })
      .limit(60)
      .then(({ data }) => {
        const mapped = (data || []).map(mapDbProduct);
        setProducts(mapped);
        setLoading(false);
        // Init countdown from first flash sale end time
        const firstEnd = (data || [])[0]?.flash_sale_ends;
        if (firstEnd) {
          const diff = new Date(firstEnd).getTime() - Date.now();
          if (diff > 0) {
            setTimeLeft({
              hours: Math.floor(diff / 3600000),
              minutes: Math.floor((diff % 3600000) / 60000),
              seconds: Math.floor((diff % 60000) / 1000),
            });
          }
        }
      });
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
    return () => clearInterval(timer);
  }, []);

  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <main className="container py-5">
        <PageBreadcrumb items={[{ label: 'Flash Sale' }]} />

        {/* Header with countdown */}
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-100 rounded-xl">
              <Zap className="h-6 w-6 text-orange-600 fill-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-orange-600">Flash Sale</h1>
              <p className="text-muted-foreground text-sm">Limited time — grab before it's gone!</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-foreground text-background rounded-xl px-4 py-2">
            {[
              { val: timeLeft.hours, label: 'HRS' },
              { val: timeLeft.minutes, label: 'MIN' },
              { val: timeLeft.seconds, label: 'SEC' },
            ].map(({ val, label }, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <span className="flex flex-col items-center">
                  <span className="text-xl font-bold tabular-nums leading-none">{pad(val)}</span>
                  <span className="text-[9px] opacity-60">{label}</span>
                </span>
                {i < 2 && <span className="text-xl font-bold opacity-50 mb-2">:</span>}
              </span>
            ))}
          </div>
        </div>

        {!loading && products.length > 0 && (
          <p className="text-sm text-muted-foreground mb-4">{products.length} items on flash sale</p>
        )}

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="py-20 text-center">
            <Zap className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
            <h2 className="text-xl font-semibold mb-2">No flash sale right now</h2>
            <p className="text-muted-foreground">Check back soon — sales launch regularly!</p>
          </div>
        ) : (
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
