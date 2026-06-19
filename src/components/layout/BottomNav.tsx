// ============================================================
// BottomNav — Mobile navigation bar (fixed at bottom, hidden on md+)
// Active tab pe animated dot aur scale effect hota hai
// ============================================================

import { Link, useLocation } from 'react-router-dom';
import { Home, Tag, Zap, User, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCart } from '@/contexts/CartContext';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';

const BottomNav = () => {
  const { pathname } = useLocation();
  const { cartCount } = useCart();

  const items = [
    { icon: Home,         label: 'Home',    path: '/' },
    { icon: Tag,          label: 'Sale',    path: '/discount-items' },
    { icon: Zap,          label: 'Flash',   path: '/flash-sale' },
    { icon: ShoppingCart, label: 'Cart',    path: '/cart', badge: cartCount },
    { icon: User,         label: 'Account', path: '/my-page' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t shadow-[0_-4px_24px_rgba(0,0,0,0.1)]">
      <div className="flex items-center justify-around py-1 px-1">
        {items.map(({ icon: Icon, label, path, badge }) => {
          const isActive = pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 text-[10px] font-medium rounded-xl relative min-w-[52px] select-none',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <motion.div
                className={cn(
                  'relative p-1.5 rounded-xl',
                  isActive ? 'bg-primary/10' : ''
                )}
                whileTap={{ scale: 0.82 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                <motion.div
                  animate={isActive ? { scale: 1.15 } : { scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                >
                  <Icon className={cn('h-5 w-5 transition-colors duration-200', isActive ? 'text-primary' : '')} />
                </motion.div>

                <AnimatePresence>
                  {badge !== undefined && badge > 0 && (
                    <motion.div
                      key="badge"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                      className="absolute -top-1 -right-1.5"
                    >
                      <Badge className="h-4 min-w-[16px] px-1 flex items-center justify-center p-0 text-[8px] bg-primary text-primary-foreground border-2 border-card">
                        {badge > 9 ? '9+' : badge}
                      </Badge>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              <motion.span
                animate={isActive ? { color: 'hsl(var(--primary))' } : {}}
                className={cn(isActive ? 'font-semibold' : '')}
              >
                {label}
              </motion.span>

              <AnimatePresence>
                {isActive && (
                  <motion.div
                    key="dot"
                    layoutId="bottomNavDot"
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 600, damping: 25 }}
                  />
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
