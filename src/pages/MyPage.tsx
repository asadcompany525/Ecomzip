import { Link, useNavigate } from 'react-router-dom';
import { User, ShoppingBag, Heart, MapPin, Settings, LogOut, ChevronRight, Package, RotateCcw, Star, Shield, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import BottomNav from '@/components/layout/BottomNav';
import { toast } from '@/hooks/use-toast';

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
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle().then(({ data }) => setProfile(data));
      supabase.from('orders').select('id, status').eq('user_id', user.id).then(({ data }) => {
        setStats({ orders: data?.length || 0, pending: data?.filter(o => !['delivered', 'cancelled'].includes(o.status)).length || 0 });
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
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    }
    setUploadingAvatar(false);
  };

  const displayName = profile?.full_name || user?.user_metadata?.full_name || 'User';
  const canAccessPanel = isAdmin || isStaff;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-4">
      <main className="container py-5 max-w-md mx-auto">
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
              <div className="relative shrink-0">
                <div className="h-16 w-16 rounded-full border-2 border-primary/20 overflow-hidden bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt={displayName} className="w-full h-full object-cover" />
                  ) : (
                    displayName[0]?.toUpperCase()
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors"
                  disabled={uploadingAvatar}
                >
                  <Camera className="h-3 w-3" />
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold truncate">Welcome, {displayName}! 👋</h2>
                <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                <div className="flex gap-4 mt-1 text-xs">
                  <span><strong>{stats.orders}</strong> Orders</span>
                  <span><strong>{stats.pending}</strong> Active</span>
                </div>
              </div>
              {canAccessPanel && (
                <Link to="/admin">
                  <Button size="sm" variant="outline" className="gap-1.5 shrink-0">
                    <Shield className="h-3.5 w-3.5" /> Panel
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}

        <div className="bg-card rounded-2xl border divide-y">
          {menuItems.map(item => (
            <Link key={item.path} to={item.path} className="flex items-center gap-4 p-4 hover:bg-accent transition-colors">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <item.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{item.label}</p>
                <p className="text-xs text-muted-foreground truncate">{item.desc}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
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
