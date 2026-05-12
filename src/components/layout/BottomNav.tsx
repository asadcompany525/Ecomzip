import { Link, useLocation } from 'react-router-dom';
import { Home, Tag, Zap, User, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCart } from '@/contexts/CartContext';
import { Badge } from '@/components/ui/badge';

const BottomNav = () => {
  const { pathname } = useLocation();
  const { cartCount } = useCart();

  const items = [
    { icon: Home,        label: 'Home',      path: '/' },
    { icon: Tag,         label: 'Sale',       path: '/discount-items' },
    { icon: Zap,         label: 'Flash',      path: '/flash-sale' },
    { icon: ShoppingCart,label: 'Cart',       path: '/cart', badge: cartCount },
    { icon: User,        label: 'Account',    path: '/my-page' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-t shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      <div className="flex items-center justify-around py-1.5 px-2">
        {items.map(({ icon: Icon, label, path, badge }) => {
          const isActive = pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium transition-all rounded-xl relative min-w-[52px]',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div className={cn('relative p-1.5 rounded-xl transition-all', isActive ? 'bg-primary/10' : '')}>
                <Icon className={cn('h-5 w-5', isActive ? 'text-primary' : '')} />
                {badge !== undefined && badge > 0 && (
                  <Badge className="absolute -top-1 -right-1.5 h-4 min-w-[16px] px-1 flex items-center justify-center p-0 text-[8px] bg-primary text-primary-foreground border-2 border-card">
                    {badge > 9 ? '9+' : badge}
                  </Badge>
                )}
              </div>
              <span className={cn(isActive ? 'text-primary font-semibold' : '')}>{label}</span>
              {isActive && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
