import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/contexts/CartContext';
import { Product } from '@/types/product';
import { motion } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
      const now = Date.now();
      const end = new Date(endsAt).getTime();
      const diff = end - now;
      if (diff <= 0) {
        setExpired(true);
        setTimeLeft('EXPIRED');
        // Auto-revert price when flash sale expires
        (async () => {
          const { data: p } = await supabase.from('products').select('original_price').eq('id', productId).maybeSingle();
          if (p?.original_price) {
            await supabase.from('products').update({
              price: p.original_price, discount_percent: 0,
              is_flash_sale: false, flash_sale_ends: null,
            }).eq('id', productId);
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
    <span className="absolute bottom-2 left-2 bg-destructive text-destructive-foreground text-[9px] font-bold px-1.5 py-0.5 rounded animate-pulse">
      ⏰ {timeLeft}
    </span>
  );
};

const ProductCard = ({ product, index = 0, flashSaleEnds }: ProductCardProps) => {
  const { addToCart, toggleWishlist, isInWishlist } = useCart();
  const [dbFlashEnd, setDbFlashEnd] = useState<string | null>(flashSaleEnds || null);

  // Fetch flash_sale_ends from DB if product is flash sale but no flashSaleEnds prop
  useEffect(() => {
    if (product.isFlashSale && !flashSaleEnds) {
      supabase.from('products').select('flash_sale_ends').eq('id', product.id).maybeSingle()
        .then(({ data }) => { if (data?.flash_sale_ends) setDbFlashEnd(data.flash_sale_ends); });
    }
  }, [product.id, product.isFlashSale, flashSaleEnds]);

  const timerEnd = dbFlashEnd || flashSaleEnds;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group bg-card rounded-xl border overflow-hidden hover:shadow-lg transition-all duration-300"
    >
      <Link to={`/product/${product.id}`} className="block">
        <div className="relative aspect-square bg-muted overflow-hidden">
          <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
          {product.discount && product.discount > 0 && product.discount !== 0 && (
            <Badge className="absolute top-1.5 left-1.5 bg-sale text-sale-foreground text-[9px] font-bold px-1.5 py-0.5">-{product.discount}%</Badge>
          )}
          {product.isFlashSale && (
            <Badge className="absolute top-1.5 right-1.5 bg-primary text-primary-foreground text-[9px] px-1.5 py-0.5 animate-flash-pulse">⚡ Flash</Badge>
          )}
          {timerEnd && <CountdownTimer endsAt={timerEnd} productId={product.id} />}
          {product.stock !== undefined && product.stock <= 0 && (
            <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
              <span className="text-sm font-bold text-destructive">Out of Stock</span>
            </div>
          )}
          <div className="absolute bottom-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button size="icon" variant="secondary" className="h-7 w-7 rounded-full shadow-md" onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWishlist(product); }}>
              <Heart className={`h-3 w-3 ${isInWishlist(product.id) ? 'fill-red-500 text-red-500' : ''}`} />
            </Button>
            <Button size="icon" className="h-7 w-7 rounded-full shadow-md" onClick={(e) => { e.preventDefault(); e.stopPropagation(); addToCart(product); }}>
              <ShoppingCart className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </Link>
      <Link to={`/product/${product.id}`} className="block p-2.5 md:p-3">
        <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">{product.brand}</p>
        <h3 className="text-xs md:text-sm font-semibold leading-tight line-clamp-2 mb-1.5 group-hover:text-primary transition-colors">{product.name}</h3>
        <div className="flex items-center gap-1 mb-1.5">
          <Star className="h-3 w-3 fill-warning text-warning" />
          <span className="text-[10px] md:text-xs font-medium">{product.rating}</span>
          <span className="text-[9px] md:text-[10px] text-muted-foreground">({product.reviews})</span>
          {product.sold ? <span className="text-[9px] md:text-[10px] text-muted-foreground ml-auto">{product.sold}+ sold</span> : null}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm md:text-base font-bold text-primary">Rs. {product.price.toLocaleString()}</span>
          {product.originalPrice && product.discount && product.discount > 0 && (
            <span className="text-[10px] md:text-xs text-muted-foreground line-through">Rs. {product.originalPrice.toLocaleString()}</span>
          )}
        </div>
      </Link>
    </motion.div>
  );
};

export default ProductCard;
