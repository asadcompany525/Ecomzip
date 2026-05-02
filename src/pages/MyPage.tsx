import { Link, useNavigate } from 'react-router-dom';
import {
  User, ShoppingBag, Heart, MapPin, Settings, LogOut, ChevronRight,
  RotateCcw, Star, Shield, Camera, Bell, MessageCircle, HelpCircle,
  FileText, Gift, Truck, Package, Phone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import BottomNav from '@/components/layout/BottomNav';
import Header from '@/components/layout/Header';
import { toast } from '@/hooks/use-toast';

const menuGroups = [
  {
    title: 'My Orders',
    items: [
      { icon: ShoppingBag, label: 'My Orders', path: '/my-orders', desc: 'Track and manage your orders', badge: null },
      { icon: Truck, label: 'Track Order', path: '/track-order', desc: 'Real-time delivery tracking', badge: null },
      { icon: RotateCcw, label: 'Returns & Claims', path: '/my-returns', desc: 'Return requests and refunds', badge: null },
    ],
  },
  {
    title: 'My Account',
    items: [
      { icon: Heart, label: 'My Wishlist', path: '/wishlist', desc: 'Products you saved for later', badge: null },
      { icon: MapPin, label: 'My Addresses', path: '/my-addresses', desc: 'Manage delivery addresses', badge: null },
      { icon: Star, label: 'My Reviews', path: '/my-reviews', desc: 'Your product reviews', badge: null },
      { icon: Bell, label: 'Notifications', path: '/notifications', desc: 'Updates and alerts', badge: null },
    ],
  },
  {
    title: 'Support',
    items: [
      { icon: MessageCircle, label: 'Contact Us', path: '/contact', desc: 'Get help from our team', badge: null },
      { icon: HelpCircle, label: 'FAQ', path: '/faq', desc: 'Frequently asked questions', badge: null },
      { icon: FileText, label: 'Return Policy', path: '/return-policy', desc: 'Our return & refund policy', badge: null },
    ],
  },
  {
    title: 'Settings',
    items: [
      { icon: Settings, label: 'Account Settings', path: '/my-settings', desc: 'Edit profile, preferences & more', badge: null },
    ],
  },
];

const MyPage = () => {
  const { brandName } = useStoreSettings();
  const { user, isAdmin, isStaff, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ orders: 0, pending: 0, wishlist: 0 });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle().then(({ data }) => setProfile(data));
      supabase.from('orders').select('id, status').eq('user_id', user.id).then(({ data }) => {
        setStats(s => ({
          ...s,
          orders: data?.length || 0,
          pending: data?.filter(o => !['delivered', 'cancelled', 'received'].includes(o.status)).length || 0,
        }));
      });
    }
  }, [user]);

  const handleLogout = async () => { await signOut(); navigate('/'); };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingAvatar(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = `${data.publicUrl}?t=${Date.now()}`;
      await supabase.from('profiles').update({ avatar_url: url }).eq('user_id', user.id);
      setProfile((p: any) => ({ ...p, avatar_url: url }));
      toast({ title: 'Profile photo updated!' });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message || 'Storage bucket may not be configured', variant: 'destructive' });
    }
    setUploadingAvatar(false);
  };

  const displayName = profile?.full_name || user?.user_metadata?.full_name || 'User';
  const canAccessPanel = isAdmin || isStaff;
  const initials = displayName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-4">
      <Header />
      <main className="container py-5 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-5">My Account</h1>

        {!user ? (
          <div className="bg-card rounded-2xl border p-8 mb-6 text-center max-w-md mx-auto">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <User className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Welcome to {brandName || 'Our Store'}</h2>
            <p className="text-sm text-muted-foreground mb-6">Login to access your orders, wishlist and more</p>
            <div className="flex gap-3 justify-center">
              <Link to="/login"><Button className="px-6">Login</Button></Link>
              <Link to="/signup"><Button variant="outline" className="px-6">Sign Up</Button></Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Left: Profile card */}
            <div className="md:col-span-1 space-y-4">
              <div className="bg-card rounded-2xl border p-6 text-center">
                <div className="relative inline-block mb-4">
                  <div className="h-20 w-20 rounded-full border-4 border-primary/20 overflow-hidden bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary mx-auto">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt={displayName} className="w-full h-full object-cover" />
                    ) : initials}
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute bottom-0 right-0 bg-primary text-white rounded-full w-7 h-7 flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors border-2 border-background"
                  >
                    {uploadingAvatar ? <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                </div>

                <h2 className="text-lg font-bold">{displayName}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">{user.email}</p>

                {profile?.phone && (
                  <div className="flex items-center justify-center gap-1 mt-1 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" />{profile.phone}
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t">
                  <div className="text-center">
                    <p className="text-xl font-bold text-primary">{stats.orders}</p>
                    <p className="text-xs text-muted-foreground">Orders</p>
                  </div>
                  <div className="text-center border-x">
                    <p className="text-xl font-bold text-orange-500">{stats.pending}</p>
                    <p className="text-xs text-muted-foreground">Active</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-pink-500">{stats.wishlist}</p>
                    <p className="text-xs text-muted-foreground">Saved</p>
                  </div>
                </div>

                {canAccessPanel && (
                  <Link to="/admin" className="block mt-4">
                    <Button size="sm" variant="outline" className="w-full gap-1.5">
                      <Shield className="h-3.5 w-3.5" /> Admin Panel
                    </Button>
                  </Link>
                )}

                <Button variant="ghost" className="w-full mt-2 text-destructive hover:text-destructive text-sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" /> Logout
                </Button>
              </div>

              {/* Quick promo */}
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-primary/20 p-4 text-center">
                <Gift className="h-8 w-8 text-primary mx-auto mb-2" />
                <p className="font-semibold text-sm">Refer & Earn</p>
                <p className="text-xs text-muted-foreground mt-1">Share your referral link and earn discounts</p>
                <Button size="sm" variant="outline" className="mt-3 text-xs h-7">Coming Soon</Button>
              </div>
            </div>

            {/* Right: Menu groups */}
            <div className="md:col-span-2 space-y-4">
              {menuGroups.map(group => (
                <div key={group.title} className="bg-card rounded-2xl border overflow-hidden">
                  <div className="px-4 py-2.5 border-b bg-muted/30">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{group.title}</p>
                  </div>
                  <div className="divide-y">
                    {group.items.map(item => (
                      <Link key={item.path} to={item.path}
                        className="flex items-center gap-3 px-4 py-3.5 hover:bg-accent transition-colors group">
                        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                          <item.icon className="h-4.5 w-4.5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{item.label}</p>
                          <p className="text-xs text-muted-foreground truncate">{item.desc}</p>
                        </div>
                        {item.badge && <Badge variant="secondary" className="text-xs shrink-0">{item.badge}</Badge>}
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default MyPage;
