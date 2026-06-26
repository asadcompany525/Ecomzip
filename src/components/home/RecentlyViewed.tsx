import { Link } from 'react-router-dom';
import { Clock, ArrowRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { useCurrencyConverter } from '@/hooks/useCurrencyConverter';
import { useState } from 'react';

const RecentlyViewed = () => {
  const { items } = useRecentlyViewed();
  const { formatPrice } = useCurrencyConverter();
  const [dismissed, setDismissed] = useState(false);

  if (items.length === 0 || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold">Recently Viewed</h2>
              <p className="text-xs text-muted-foreground">Continue where you left off</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/products" className="flex items-center gap-1 text-sm text-primary font-medium hover:underline group">
              View All <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <button
              onClick={() => setDismissed(true)}
              className="h-7 w-7 rounded-full bg-muted hover:bg-muted/70 flex items-center justify-center transition-colors"
              title="Dismiss"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Horizontal scroll on mobile, grid on desktop */}
        <div className="flex gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-4 lg:grid-cols-5 md:overflow-visible md:pb-0 scrollbar-none">
          {items.slice(0, 8).map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="shrink-0 w-36 md:w-auto"
            >
              <Link
                to={`/product/${item.id}`}
                className="group block bg-card rounded-xl border border-border/60 overflow-hidden hover:shadow-md hover:border-primary/20 transition-all duration-200"
              >
                <div className="relative aspect-square bg-muted/40 overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    onError={e => { (e.currentTarget as HTMLImageElement).src = '/placeholder.svg'; }}
                  />
                  {item.discount && item.discount > 0 && (
                    <span className="absolute top-1.5 left-1.5 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                      -{item.discount}%
                    </span>
                  )}
                  {/* Amber "viewed" indicator */}
                  <span className="absolute top-1.5 right-1.5 bg-amber-500/90 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">
                    Viewed
                  </span>
                </div>
                <div className="p-2">
                  {item.brand && (
                    <p className="text-[9px] text-muted-foreground uppercase tracking-widest truncate">{item.brand}</p>
                  )}
                  <p className="text-xs font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                    {item.name}
                  </p>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-sm font-bold text-primary">{formatPrice(item.price)}</span>
                    {item.originalPrice && item.discount && item.discount > 0 && (
                      <span className="text-[9px] text-muted-foreground line-through">{formatPrice(item.originalPrice)}</span>
                    )}
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.section>
    </AnimatePresence>
  );
};

export default RecentlyViewed;
