// ============================================================
// FlashSale — Homepage flash sale section
// PKT midnight tak countdown timer, products 30s cache ke saath load hote hain
// ============================================================

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import ProductCard from './ProductCard';
import { Zap, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Product } from '@/types/product';
import { mapDbProduct, PRODUCT_SELECT } from '@/lib/mapDbProduct';
import { logTimezoneSync } from '@/lib/pkt';

let _cache: Product[] | null = null;
let _cacheTime = 0;
const CACHE_TTL = 30_000;

const getTimeUntilMidnightPKT = () => {
  const nowPkt = new Date(Date.now() + 5 * 60 * 60 * 1000);
  const midnightPkt = new Date(nowPkt);
  midnightPkt.setUTCHours(24, 0, 0, 0);
  const totalSec = Math.floor((midnightPkt.getTime() - nowPkt.getTime()) / 1000);
  return { hours: Math.floor(totalSec / 3600), minutes: Math.floor((totalSec % 3600) / 60), seconds: totalSec % 60 };
};

const FlashSale = () => {
  const [products, setProducts] = useState<Product[]>(_cache || []);
  const [timeLeft, setTimeLeft] = useState(getTimeUntilMidnightPKT);

  useEffect(() => {
    logTimezoneSync();
    const now = Date.now();
    if (_cache && now - _cacheTime < CACHE_TTL) return;
    supabase.from('products').select(PRODUCT_SELECT).eq('is_active', true).eq('is_flash_sale', true).limit(5)
      .then(({ data }) => {
        const p = (data || []).map(mapDbProduct);
        _cache = p; _cacheTime = Date.now();
        setProducts(p);
      });
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(getTimeUntilMidnightPKT()), 1000);
    return () => clearInterval(timer);
  }, []);

  const pad = (n: number) => n.toString().padStart(2, '0');
  if (products.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center animate-pulse">
            <Zap className="h-5 w-5 text-orange-500 fill-orange-500" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-orange-500">Flash Sale</h2>
            <div className="flex items-center gap-1 mt-0.5">
              {[timeLeft.hours, timeLeft.minutes, timeLeft.seconds].map((val, i) => (
                <span key={i} className="flex items-center gap-0.5">
                  <span className="bg-foreground text-background text-[10px] md:text-xs font-bold px-1.5 py-0.5 rounded min-w-[22px] text-center tabular-nums">{pad(val)}</span>
                  {i < 2 && <span className="font-bold text-foreground text-xs">:</span>}
                </span>
              ))}
              <span className="text-[9px] text-muted-foreground ml-1 hidden sm:inline">PKT</span>
            </div>
          </div>
        </div>
        <Link to="/flash-sale" className="flex items-center gap-1 text-sm text-primary font-medium hover:underline group">
          View All <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
        {products.map((product, i) => <ProductCard key={product.id} product={product} index={i} />)}
      </div>
    </section>
  );
};

export default FlashSale;
