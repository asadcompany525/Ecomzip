import { useEffect, useRef } from 'react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { ShoppingCart } from 'lucide-react';

const REMINDER_INTERVAL_MS = 30 * 60 * 1000;
const SNOOZE_KEY = 'stopy_cart_notif_snoozed_until';

const isEnabled = (userId?: string): boolean => {
  try {
    const key = userId ? `stopy_prefs_${userId}` : null;
    const prefs = key ? JSON.parse(localStorage.getItem(key) || '{}') : {};
    return prefs.notif_abandoned_cart !== false;
  } catch { return true; }
};

const isSnoozed = (): boolean => {
  try {
    const until = Number(localStorage.getItem(SNOOZE_KEY) || '0');
    return Date.now() < until;
  } catch { return false; }
};

const snooze = () => {
  try { localStorage.setItem(SNOOZE_KEY, String(Date.now() + REMINDER_INTERVAL_MS)); } catch {}
};

const AbandonedCartWebNotification = () => {
  const { items } = useCart();
  const { user } = useAuth();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasShownRef = useRef(false);

  const showNotification = () => {
    if (!isEnabled(user?.id)) return;
    if (isSnoozed()) return;
    if (items.length === 0) return;

    snooze();
    hasShownRef.current = true;

    const totalItems = items.reduce((s, i) => s + i.quantity, 0);
    const firstName = items[0]?.product?.name || 'items';

    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('🛒 Your cart is waiting!', {
          body: `You have ${totalItems} item${totalItems > 1 ? 's' : ''} in your cart. Don't forget to complete your order!`,
          icon: '/favicon.ico',
          tag: 'abandoned-cart',
        });
        return;
      } catch {}
    }

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(perm => {
        if (perm === 'granted') {
          try {
            new Notification('🛒 Your cart is waiting!', {
              body: `You have ${totalItems} item${totalItems > 1 ? 's' : ''} in your cart. Complete your order now!`,
              icon: '/favicon.ico',
              tag: 'abandoned-cart',
            });
          } catch {}
        }
      });
    }

    toast({
      title: '🛒 Cart Reminder',
      description: `You have ${totalItems} item${totalItems > 1 ? 's' : ''} waiting in your cart. Ready to checkout?`,
      duration: 8000,
    });
  };

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    hasShownRef.current = false;

    if (items.length === 0) return;
    if (!isEnabled(user?.id)) return;

    timerRef.current = setTimeout(() => {
      showNotification();
    }, REMINDER_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [items.length, user?.id]);

  return null;
};

export default AbandonedCartWebNotification;
