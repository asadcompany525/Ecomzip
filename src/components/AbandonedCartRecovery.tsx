import { useEffect, useRef, useState } from 'react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ShoppingCart, X, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const IDLE_TIMEOUT = 3 * 60 * 1000;
const ABANDON_DELAY = 30 * 1000;

const AI_MESSAGES = [
  (name: string, total: number) => `"${name}" is still waiting for you! Don't let it sell out — grab it before someone else does.`,
  (_: string, total: number) => `You're Rs. ${total.toLocaleString()} away from completing your order. Your cart misses you!`,
  (name: string) => `Psst — "${name}" and your other items are still saved. Ready to check out?`,
  (_: string, total: number) => `Quick reminder: Rs. ${total.toLocaleString()} worth of items are sitting in your cart. Complete your order now!`,
  (name: string) => `Your cart is getting lonely! "${name}" is waiting for you.`,
];

export default function AbandonedCartRecovery() {
  const { cartItems, cartCount } = useCart();
  const { user } = useAuth();
  const location = useLocation();
  const [showReminder, setShowReminder] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abandonTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCartPath = useRef<string>('');
  const savedRef = useRef(false);

  const isCartPage = location.pathname === '/cart' || location.pathname === '/checkout';

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

  useEffect(() => {
    if (cartCount > 0 && !isCartPage) {
      lastCartPath.current = location.pathname;
    }
  }, [location.pathname, cartCount, isCartPage]);

  const generateAiMessage = () => {
    const total = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
    const topName = cartItems[0]?.name || 'your item';
    const pick = AI_MESSAGES[Math.floor(Math.random() * AI_MESSAGES.length)];
    setAiMessage(pick(topName, total));
  };

  useEffect(() => {
    if (cartCount === 0 || isCartPage || dismissed) return;

    const resetIdle = () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => {
        generateAiMessage();
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

  useEffect(() => {
    if (cartCount === 0 || isCartPage || dismissed) return;
    if (lastCartPath.current && !isCartPage) {
      if (abandonTimer.current) clearTimeout(abandonTimer.current);
      abandonTimer.current = setTimeout(() => {
        generateAiMessage();
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
    setTimeout(() => setDismissed(false), 10 * 60 * 1000);
  };

  if (!showReminder || cartCount === 0 || isCartPage) return null;

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
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/80 to-primary/40 rounded-t-2xl" />
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
            <div className="flex-1 pr-6">
              <div className="flex items-center gap-1 mb-0.5">
                <Sparkles className="h-3 w-3 text-primary" />
                <p className="font-bold text-sm">Cart Reminder</p>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{aiMessage}</p>
            </div>
          </div>

          {cartItems.length > 0 && (
            <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
              {cartItems.slice(0, 4).map(item => (
                <div key={item.id} className="shrink-0 text-center">
                  <img
                    src={item.image || '/placeholder.svg'}
                    alt={item.name}
                    className="w-12 h-12 rounded-lg object-cover border"
                    loading="lazy"
                  />
                  <p className="text-[9px] text-muted-foreground mt-0.5 w-12 truncate">{item.name}</p>
                </div>
              ))}
              {cartItems.length > 4 && (
                <div className="w-12 h-12 rounded-lg border bg-muted/50 flex items-center justify-center shrink-0 text-xs font-bold text-muted-foreground">
                  +{cartItems.length - 4}
                </div>
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
