import { useEffect, useRef, useState } from 'react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ShoppingCart, X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const IDLE_TIMEOUT = 3 * 60 * 1000; // 3 minutes idle
const ABANDON_DELAY = 30 * 1000; // 30 seconds after cart has items and user navigates away

export default function AbandonedCartRecovery() {
  const { cartItems, cartCount } = useCart();
  const { user } = useAuth();
  const location = useLocation();
  const [showReminder, setShowReminder] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abandonTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCartPath = useRef<string>('');
  const savedRef = useRef(false);

  const isCartPage = location.pathname === '/cart' || location.pathname === '/checkout';

  // Log to DB for abandoned cart tracking
  const logAbandonedCart = async () => {
    if (!cartItems.length || savedRef.current) return;
    savedRef.current = true;
    try {
      await supabase.from('site_settings').upsert({
        key: `abandoned_cart_${user?.id || 'guest'}_${Date.now()}`,
        value: {
          userId: user?.id || null,
          email: user?.email || null,
          items: cartItems.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.quantity })),
          total: cartItems.reduce((s, i) => s + i.price * i.quantity, 0),
          abandonedAt: new Date().toISOString(),
          path: lastCartPath.current,
        }
      }, { onConflict: 'key' });
    } catch {}
  };

  // Track page where cart had items
  useEffect(() => {
    if (cartCount > 0 && !isCartPage) {
      lastCartPath.current = location.pathname;
    }
  }, [location.pathname, cartCount, isCartPage]);

  // Show reminder when idle with items in cart
  useEffect(() => {
    if (cartCount === 0 || isCartPage || dismissed) return;

    const resetIdle = () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => {
        setShowReminder(true);
        logAbandonedCart();
      }, IDLE_TIMEOUT);
    };

    const events = ['mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(e => document.addEventListener(e, resetIdle, { passive: true }));
    resetIdle();

    return () => {
      events.forEach(e => document.removeEventListener(e, resetIdle));
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [cartCount, isCartPage, dismissed]);

  // Show after navigating away from cart with items
  useEffect(() => {
    if (cartCount === 0 || isCartPage || dismissed) return;
    if (lastCartPath.current && !isCartPage) {
      if (abandonTimer.current) clearTimeout(abandonTimer.current);
      abandonTimer.current = setTimeout(() => {
        setShowReminder(true);
        logAbandonedCart();
      }, ABANDON_DELAY);
    }
    return () => {
      if (abandonTimer.current) clearTimeout(abandonTimer.current);
    };
  }, [location.pathname, cartCount, isCartPage, dismissed]);

  const handleDismiss = () => {
    setShowReminder(false);
    setDismissed(true);
    savedRef.current = false;
    setTimeout(() => setDismissed(false), 10 * 60 * 1000); // Re-enable after 10 min
  };

  if (!showReminder || cartCount === 0 || isCartPage) return null;

  const topItem = cartItems[0];
  const total = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 80, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 80, scale: 0.95 }}
        transition={{ type: 'spring', damping: 20, stiffness: 200 }}
        className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm"
      >
        <div className="bg-card border shadow-2xl rounded-2xl p-4 relative overflow-hidden">
          {/* Accent bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-primary/60 rounded-t-2xl" />

          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 w-7 h-7 rounded-full hover:bg-accent flex items-center justify-center text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <ShoppingCart className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-bold text-sm">You left something behind!</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {cartCount} item{cartCount > 1 ? 's' : ''} waiting in your cart
              </p>
            </div>
          </div>

          {topItem && (
            <div className="flex items-center gap-2 bg-muted/30 rounded-lg p-2 mb-3">
              <img
                src={topItem.image || '/placeholder.svg'}
                alt={topItem.name}
                className="w-10 h-10 rounded object-cover"
                loading="lazy"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{topItem.name}</p>
                <p className="text-xs text-primary font-bold">Rs. {topItem.price.toLocaleString()}</p>
              </div>
              {cartCount > 1 && (
                <span className="text-xs text-muted-foreground">+{cartCount - 1} more</span>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Total: <strong className="text-foreground">Rs. {total.toLocaleString()}</strong>
            </p>
            <Link to="/cart" onClick={handleDismiss}>
              <Button size="sm" className="gap-1.5 h-8 text-xs">
                Complete Order <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
