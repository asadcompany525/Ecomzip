import { Link, useLocation } from 'react-router-dom';
import { Home, Tag, Zap, User, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

const BottomNav = () => {
  const { pathname } = useLocation();
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    // Check for new products/flash sales/discounts in last 24h
    const checkNotifs = async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count } = await supabase.from('products').select('*', { count: 'exact', head: true })
        .eq('is_active', true).gte('created_at', yesterday);
      setNotifCount(count || 0);
    };
    checkNotifs();
  }, []);

  const items = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Tag, label: 'Discount', path: '/discount-items' },
    { icon: Zap, label: 'Flash Sale', path: '/flash-sale' },
    { icon: User, label: 'My Page', path: '/my-page' },
    { icon: Bell, label: 'Alerts', path: '/notifications' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-around py-2">
        {items.map(({ icon: Icon, label, path }) => (
          <Link
            key={path}
            to={path}
            className={cn(
              'flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium transition-colors relative',
              pathname === path ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <div className="relative">
              <Icon className="h-5 w-5" />
              {label === 'Alerts' && notifCount > 0 && (
                <Badge className="absolute -top-1.5 -right-2.5 h-4 min-w-[16px] px-1 flex items-center justify-center p-0 text-[8px] bg-destructive text-destructive-foreground">
                  {notifCount > 9 ? '9+' : notifCount}
                </Badge>
              )}
            </div>
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
