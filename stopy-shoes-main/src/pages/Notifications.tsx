import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Tag, Zap, Package, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';

interface Notification {
  id: string;
  title: string;
  type: 'new' | 'discount' | 'flash';
  link: string;
  time: string;
  image: string;
}

const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const week = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase.from('products').select('id, title, images, is_flash_sale, discount_percent, is_new_arrival, created_at')
        .eq('is_active', true).gte('created_at', week).order('created_at', { ascending: false }).limit(50);

      const notifs: Notification[] = (data || []).map((p: any) => {
        const type = p.is_flash_sale ? 'flash' : (p.discount_percent > 0 ? 'discount' : 'new');
        const labels = { flash: '⚡ Flash Sale!', discount: `🏷️ ${p.discount_percent}% OFF!`, new: '🆕 New Arrival!' };
        return {
          id: p.id,
          title: `${labels[type]} ${p.title}`,
          type,
          link: `/product/${p.id}`,
          time: new Date(p.created_at).toLocaleDateString(),
          image: (p.images as any)?.[0] || '/placeholder.svg',
        };
      });
      setNotifications(notifs);
      setLoading(false);
    };
    fetch();
  }, []);

  const iconMap = { new: Package, discount: Tag, flash: Zap };

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Header />
      <main className="container py-5">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
          <h1 className="text-xl font-bold flex items-center gap-2"><Bell className="h-5 w-5" /> Notifications</h1>
        </div>

        {loading ? (
          <p className="text-center py-10 text-muted-foreground">Loading...</p>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20">
            <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No new notifications</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map(n => {
              const Icon = iconMap[n.type];
              return (
                <Link key={n.id} to={n.link} className="flex items-center gap-3 p-3 bg-card border rounded-xl hover:bg-accent transition-colors">
                  <img src={n.image} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-2">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.time}</p>
                  </div>
                  <Icon className={`h-5 w-5 shrink-0 ${n.type === 'flash' ? 'text-warning' : n.type === 'discount' ? 'text-destructive' : 'text-primary'}`} />
                </Link>
              );
            })}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default Notifications;
