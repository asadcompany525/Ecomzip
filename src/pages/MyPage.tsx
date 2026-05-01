import { Link, useNavigate } from 'react-router-dom';
import { User, ShoppingBag, Heart, MapPin, Settings, LogOut, ChevronRight, Package, RotateCcw, Star, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

import { useStoreSettings } from '@/hooks/useStoreSettings';

import BottomNav from '@/components/layout/BottomNav';

const menuItems = [
  { icon: ShoppingBag, label: 'My Orders', path: '/my-orders', desc: 'Track and manage your orders' },
  { icon: Heart, label: 'My Wishlist', path: '/wishlist', desc: 'Products you saved for later' },
  { icon: MapPin, label: 'My Addresses', path: '/my-addresses', desc: 'Manage delivery addresses' },
  { icon: RotateCcw, label: 'Returns & Claims', path: '/my-returns', desc: 'Return requests and refunds' },
  { icon: Star, label: 'My Reviews', path: '/my-reviews', desc: 'Your product reviews' },
  { icon: Settings, label: 'Account Settings', path: '/my-settings', desc: 'Edit profile, change password' },
];

const MyPage = () => {
  const { brandName } = useStoreSettings();
  const { user, isAdmin, isStaff, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ orders: 0, pending: 0 });

  useEffect(() => {
    if (user) {
      supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle().then(({ data }) => setProfile(data));
      supabase.from('orders').select('id, status').eq('user_id', user.id).then(({ data }) => {
        setStats({ orders: data?.length || 0, pending: data?.filter(o => !['delivered', 'cancelled'].includes(o.status)).length || 0 });
      });
    }
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const displayName = profile?.full_name || user?.user_metadata?.full_name || 'User';
  const canAccessPanel = isAdmin || isStaff;

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      
      <main className="container py-5">
        <h1 className="text-2xl font-bold mb-6">My Account</h1>

        {!user ? (
          <div className="bg-card rounded-2xl border p-6 mb-6 text-center">
            <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <User className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold mb-1">Welcome to {brandName || 'Our Store'}</h2>
            <p className="text-sm text-muted-foreground mb-4">Login to access your orders, wishlist and more</p>
            <div className="flex gap-3 justify-center">
              <Link to="/login"><Button>Login</Button></Link>
              <Link to="/signup"><Button variant="outline">Sign Up</Button></Link>
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-2xl border p-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                {displayName[0]?.toUpperCase()}
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold">Welcome, {displayName}! 👋</h2>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <div className="flex gap-4 mt-2 text-xs">
                  <span><strong>{stats.orders}</strong> Orders</span>
                  <span><strong>{stats.pending}</strong> Active</span>
                </div>
              </div>
              {canAccessPanel && (
                <Link to="/admin">
                  <Button size="sm" variant="outline" className="gap-1.5">
                    <Shield className="h-3.5 w-3.5" />
                    Enter Panel
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}

        <div className="bg-card rounded-2xl border divide-y">
          {menuItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className="flex items-center gap-4 p-4 hover:bg-accent transition-colors"
            >
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <item.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </div>

        {user && (
          <Button variant="outline" className="w-full mt-4 text-destructive" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" /> Logout
          </Button>
        )}
      </main>
      
      <BottomNav />
    </div>
  );
};

export default MyPage;
