import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/contexts/CartContext';
import { Product } from '@/types/product';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrencyConverter } from '@/hooks/useCurrencyConverter';

interface ProductCardProps {
  product: Product;
  index?: number;
  flashSaleEnds?: string;
}

const CountdownTimer = ({ endsAt, productId }: { endsAt: string; productId: string }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const update = () => {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) {
        setExpired(true);
        setTimeLeft('EXPIRED');
        (async () => {
          const { data: p } = await supabase.from('products').select('original_price').eq('id', productId).maybeSingle();
          if (p?.original_price) {
            await supabase.from('products').update({ price: p.original_price, discount_percent: 0, is_flash_sale: false, flash_sale_ends: null }).eq('id', productId);
          }
        })();
        return;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m ${s}s`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [endsAt, productId]);

  if (expired) return null;
  return (
    <span className="absolute bottom-2 left-2 bg-red-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow animate-pulse">
      ⏰ {timeLeft}
    </span>
  );
};

const ProductCard = ({ product, index = 0, flashSaleEnds }: ProductCardProps) => {
  const { addToCart, toggleWishlist, isInWishlist } = useCart();
  const { formatPrice } = useCurrencyConverter();
  const [dbFlashEnd, setDbFlashEnd] = useState<string | null>(flashSaleEnds || null);
  const [liveRating, setLiveRating] = useState(product.rating ?? 0);
  const [liveReviews, setLiveReviews] = useState(product.reviews ?? 0);
  const [addedPulse, setAddedPulse] = useState(false);
  const inWishlist = isInWishlist(product.id);

  useEffect(() => {
    if (product.isFlashSale && !flashSaleEnds) {
      supabase.from('products').select('flash_sale_ends').eq('id', product.id).maybeSingle()
        .then(({ data }) => { if (data?.flash_sale_ends) setDbFlashEnd(data.flash_sale_ends); });
    }
  }, [product.id, product.isFlashSale, flashSaleEnds]);

  useEffect(() => {
    if (product.rating > 0 || product.reviews > 0) return;
    let cancelled = false;
    supabase.from('reviews').select('rating').eq('product_id', product.id)
      .then(({ data }) => {
        if (cancelled || !data || data.length === 0) return;
        const avg = data.reduce((s: number, r: any) => s + (r.rating || 0), 0) / data.length;
        setLiveRating(Math.round(avg * 10) / 10);
        setLiveReviews(data.length);
      });
    return () => { cancelled = true; };
  }, [product.id, product.rating, product.reviews]);

  const timerEnd = dbFlashEnd || flashSaleEnds;
  const isOOS = product.stock !== undefined && product.stock <= 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product);
    setAddedPulse(true);
    setTimeout(() => setAddedPulse(false), 600);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: Math.min(index * 0.05, 0.35),
        duration: 0.4,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      whileHover={{ y: -4, transition: { type: 'spring', stiffness: 350, damping: 22 } }}
      className="group bg-card rounded-2xl border border-border/60 overflow-hidden shadow-sm hover:shadow-xl hover:border-primary/20 transition-shadow duration-300"
    >
      <Link to={`/product/${product.id}`} className="block">
        <div className="relative aspect-square bg-muted/50 overflow-hidden">
          <motion.img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
            loading="lazy"
            whileHover={{ scale: 1.07 }}
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          />

          {/* Gradient overlay */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent"
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
          />

          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {product.discount && product.discount > 0 && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: Math.min(index * 0.05, 0.35) + 0.15 }}
              >
                <Badge className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-sm">
                  -{product.discount}%
                </Badge>
              </motion.div>
            )}
            {product.isFlashSale && (
              <Badge className="bg-orange-500 text-white text-[9px] px-1.5 py-0.5 rounded-md shadow-sm">⚡ Flash</Badge>
            )}
            {product.isTrending && !product.isFlashSale && (
              <Badge className="bg-purple-500 text-white text-[9px] px-1.5 py-0.5 rounded-md shadow-sm">🔥 Hot</Badge>
            )}
          </div>

          {timerEnd && <CountdownTimer endsAt={timerEnd} productId={product.id} />}

          {isOOS && (
            <div className="absolute inset-0 bg-background/70 backdrop-blur-[2px] flex items-center justify-center">
              <span className="text-xs font-bold text-destructive bg-background/80 px-3 py-1 rounded-full border border-destructive/30">Out of Stock</span>
            </div>
          )}

          {/* Action buttons — slide up on hover */}
          {!isOOS && (
            <motion.div
              className="absolute bottom-2 right-2 flex gap-1.5"
              initial={{ opacity: 0, y: 8 }}
              whileHover={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <motion.div
                whileTap={{ scale: 0.85 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8 rounded-full shadow-lg bg-background/90 backdrop-blur-sm border border-border/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWishlist(product); }}
                >
                  <Heart className={`h-3.5 w-3.5 transition-colors ${inWishlist ? 'fill-red-500 text-red-500' : 'text-foreground'}`} />
                </Button>
              </motion.div>

              <motion.div
                animate={addedPulse ? { scale: [1, 1.3, 0.9, 1.1, 1] } : {}}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
                whileTap={{ scale: 0.85 }}
              >
                <Button
                  size="icon"
                  className="h-8 w-8 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  onClick={handleAddToCart}
                >
                  <ShoppingCart className="h-3.5 w-3.5" />
                </Button>
              </motion.div>
            </motion.div>
          )}
        </div>
      </Link>

      <Link to={`/product/${product.id}`} className="block p-2.5 md:p-3">
        {product.brand && (
          <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-widest mb-0.5 truncate">{product.brand}</p>
        )}
        <h3 className="text-xs md:text-sm font-semibold leading-snug line-clamp-2 mb-2 group-hover:text-primary transition-colors duration-200">
          {product.name}
        </h3>

        <div className="flex items-center gap-1 mb-2">
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map(i => (
              <Star key={i} className={`h-2.5 w-2.5 ${i <= Math.round(liveRating) ? 'fill-amber-400 text-amber-400' : 'fill-muted text-muted'}`} />
            ))}
          </div>
          {liveRating > 0 && <span className="text-[10px] font-medium text-muted-foreground">{liveRating.toFixed(1)}</span>}
          {liveReviews > 0 && <span className="text-[9px] text-muted-foreground">({liveReviews})</span>}
          {product.sold ? (
            <span className="text-[9px] text-muted-foreground ml-auto">
              {product.sold > 999 ? `${Math.floor(product.sold / 1000)}k` : product.sold}+ sold
            </span>
          ) : null}
        </div>

        <div className="flex items-baseline gap-1.5">
          <span className="text-sm md:text-base font-bold text-primary">{formatPrice(product.price)}</span>
          {product.originalPrice && product.discount && product.discount > 0 && (
            <span className="text-[10px] text-muted-foreground line-through">{formatPrice(product.originalPrice)}</span>
          )}
        </div>
      </Link>
    </motion.div>
  );
};

export default ProductCard;
