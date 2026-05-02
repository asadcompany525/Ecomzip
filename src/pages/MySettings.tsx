import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  Camera, Loader2, User, Bell, ShoppingBag, Globe, Lock, Shield,
  Eye, EyeOff, Palette, ChevronRight, Save, Phone, Mail,
  MapPin, Calendar, UserCircle, Package, Heart, Star, Volume2
} from 'lucide-react';
import BottomNav from '@/components/layout/BottomNav';
import Header from '@/components/layout/Header';
import PageBreadcrumb from '@/components/layout/PageBreadcrumb';
import { Link } from 'react-router-dom';

const GENDERS = ['Male', 'Female', 'Prefer not to say'];
const SIZES = ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45'];
const LANGUAGES = ['English', 'Urdu'];
const CURRENCIES = ['PKR (Rs.)', 'USD ($)'];
const SORT_OPTIONS = ['Newest First', 'Price: Low to High', 'Price: High to Low', 'Top Rated', 'Most Popular'];
const CITIES = ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Quetta', 'Sialkot', 'Gujranwala', 'Other'];

interface Settings {
  full_name: string;
  username: string;
  phone: string;
  whatsapp: string;
  bio: string;
  gender: string;
  dob: string;
  city: string;
  avatar_url: string;
  notif_email_orders: boolean;
  notif_email_promos: boolean;
  notif_sms_orders: boolean;
  notif_sms_promos: boolean;
  notif_push_orders: boolean;
  notif_push_promos: boolean;
  notif_wishlist_restock: boolean;
  notif_flash_sale: boolean;
  notif_new_arrivals: boolean;
  pref_default_size: string;
  pref_sort: string;
  pref_language: string;
  pref_currency: string;
  pref_show_instock_only: boolean;
  pref_show_discounts_first: boolean;
  pref_compact_view: boolean;
  privacy_profile_visible: boolean;
  privacy_reviews_visible: boolean;
  privacy_marketing: boolean;
  privacy_analytics: boolean;
  display_theme: string;
}

const DEFAULT: Settings = {
  full_name: '', username: '', phone: '', whatsapp: '', bio: '', gender: '',
  dob: '', city: '', avatar_url: '',
  notif_email_orders: true, notif_email_promos: false, notif_sms_orders: true,
  notif_sms_promos: false, notif_push_orders: true, notif_push_promos: true,
  notif_wishlist_restock: true, notif_flash_sale: true, notif_new_arrivals: false,
  pref_default_size: '', pref_sort: 'Newest First', pref_language: 'English',
  pref_currency: 'PKR (Rs.)', pref_show_instock_only: false,
  pref_show_discounts_first: false, pref_compact_view: false,
  privacy_profile_visible: true, privacy_reviews_visible: true,
  privacy_marketing: false, privacy_analytics: true, display_theme: 'system',
};

type Section = 'profile' | 'notifications' | 'preferences' | 'privacy' | 'security' | 'display';

const sections: { id: Section; label: string; icon: any; desc: string }[] = [
  { id: 'profile', label: 'Profile', icon: UserCircle, desc: 'Name, photo, contact info' },
  { id: 'notifications', label: 'Notifications', icon: Bell, desc: 'Alerts and updates' },
  { id: 'preferences', label: 'Shopping', icon: ShoppingBag, desc: 'Size, sort, display' },
  { id: 'privacy', label: 'Privacy', icon: Shield, desc: 'Who sees your data' },
  { id: 'display', label: 'Display', icon: Palette, desc: 'Theme and language' },
  { id: 'security', label: 'Security', icon: Lock, desc: 'Password and sessions' },
];

const SwitchRow = ({ label, desc, checked, onChange }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <div className="flex items-center justify-between gap-4 py-3">
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium">{label}</p>
      {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
    </div>
    <Switch checked={checked} onCheckedChange={onChange} />
  </div>
);

const MySettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Settings>(DEFAULT);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [activeSection, setActiveSection] = useState<Section>('profile');
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPass, setChangingPass] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('full_name, username, phone, whatsapp, avatar_url, email').eq('user_id', user.id).maybeSingle().then(({ data }) => {
      if (!data) return;
      const savedPrefs = (() => { try { return JSON.parse(localStorage.getItem(`stopy_prefs_${user.id}`) || '{}'); } catch { return {}; } })();
      setSettings(prev => ({
        ...prev,
        full_name: data.full_name || '',
        username: data.username || '',
        phone: data.phone || '',
        whatsapp: data.whatsapp || '',
        avatar_url: data.avatar_url || '',
        ...savedPrefs,
      }));
    });
  }, [user]);

  const set = (key: keyof Settings, val: any) => setSettings(prev => ({ ...prev, [key]: val }));

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingAvatar(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = `${data.publicUrl}?t=${Date.now()}`;
      set('avatar_url', url);
      await supabase.from('profiles').update({ avatar_url: url }).eq('user_id', user.id);
      toast({ title: 'Photo updated!' });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    }
    setUploadingAvatar(false);
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { full_name, username, phone, whatsapp, bio, gender, dob, city, avatar_url, ...prefs } = settings;
      const { error } = await supabase.from('profiles').update({
        full_name, username, phone, whatsapp, avatar_url,
      }).eq('user_id', user.id);
      if (error) throw error;
      try { localStorage.setItem(`stopy_prefs_${user.id}`, JSON.stringify(prefs)); } catch {}
      toast({ title: '✅ Settings saved!' });
    } catch (err: any) {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  const changePassword = async () => {
    if (newPassword.length < 8) { toast({ title: 'Password must be at least 8 characters', variant: 'destructive' }); return; }
    setChangingPass(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast({ title: 'Failed to change password', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Password changed!' }); setOldPassword(''); setNewPassword(''); }
    setChangingPass(false);
  };

  const initials = (settings.full_name || user?.email || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-20 text-center">
          <p className="text-muted-foreground mb-4">Please log in to access settings</p>
          <Link to="/login"><Button>Login</Button></Link>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-4">
      <Header />
      <main className="container py-5 max-w-5xl mx-auto">
        <PageBreadcrumb items={[{ label: 'My Account', href: '/my-page' }, { label: 'Settings' }]} />
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl font-bold">Account Settings</h1>
          <Button onClick={save} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {/* Sidebar */}
          <div className="md:col-span-1">
            <div className="bg-card rounded-2xl border overflow-hidden">
              {/* Avatar section */}
              <div className="p-5 text-center border-b">
                <div className="relative inline-block">
                  <div className="h-16 w-16 rounded-full bg-primary/10 border-2 border-primary/20 overflow-hidden flex items-center justify-center text-xl font-bold text-primary mx-auto">
                    {settings.avatar_url ? <img src={settings.avatar_url} alt="" className="w-full h-full object-cover" /> : initials}
                  </div>
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar}
                    className="absolute bottom-0 right-0 bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center border-2 border-background">
                    {uploadingAvatar ? <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> : <Camera className="h-3 w-3" />}
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                </div>
                <p className="text-sm font-medium mt-2 truncate">{settings.full_name || user.email}</p>
              </div>

              {/* Nav */}
              <div className="p-1">
                {sections.map(s => (
                  <button key={s.id} onClick={() => setActiveSection(s.id)}
                    className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm ${activeSection === s.id ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}>
                    <s.icon className="h-4 w-4 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium">{s.label}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="md:col-span-3 bg-card rounded-2xl border">
            {/* PROFILE */}
            {activeSection === 'profile' && (
              <div className="p-5 space-y-5">
                <div className="pb-3 border-b">
                  <h2 className="font-semibold flex items-center gap-2"><UserCircle className="h-5 w-5 text-primary" /> Profile Information</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">Update your personal details</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Full Name</Label>
                    <Input value={settings.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Your full name" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Username</Label>
                    <Input value={settings.username} onChange={e => set('username', e.target.value)} placeholder="@username" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> Phone</Label>
                    <Input value={settings.phone} onChange={e => set('phone', e.target.value)} placeholder="+92 3XX XXXXXXX" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1"><Phone className="h-3.5 w-3.5 text-green-600" /> WhatsApp</Label>
                    <Input value={settings.whatsapp} onChange={e => set('whatsapp', e.target.value)} placeholder="+92 3XX XXXXXXX" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> Gender</Label>
                    <Select value={settings.gender} onValueChange={v => set('gender', v)}>
                      <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                      <SelectContent>{GENDERS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Date of Birth</Label>
                    <Input type="date" value={settings.dob} onChange={e => set('dob', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> City</Label>
                    <Select value={settings.city} onValueChange={v => set('city', v)}>
                      <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
                      <SelectContent>{CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> Email</Label>
                    <Input value={user.email || ''} disabled className="opacity-60" />
                    <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Bio</Label>
                    <Textarea value={settings.bio} onChange={e => set('bio', e.target.value)} placeholder="Tell us a bit about yourself..." rows={3} />
                  </div>
                </div>
              </div>
            )}

            {/* NOTIFICATIONS */}
            {activeSection === 'notifications' && (
              <div className="p-5 space-y-5">
                <div className="pb-3 border-b">
                  <h2 className="font-semibold flex items-center gap-2"><Bell className="h-5 w-5 text-primary" /> Notification Settings</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">Choose how you want to be notified</p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">📧 Email Notifications</p>
                  <div className="bg-muted/30 rounded-xl px-4 divide-y">
                    <SwitchRow label="Order Updates" desc="Shipped, delivered, cancelled alerts" checked={settings.notif_email_orders} onChange={v => set('notif_email_orders', v)} />
                    <SwitchRow label="Promotions & Offers" desc="Flash sales, discount codes" checked={settings.notif_email_promos} onChange={v => set('notif_email_promos', v)} />
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">📱 SMS Notifications</p>
                  <div className="bg-muted/30 rounded-xl px-4 divide-y">
                    <SwitchRow label="Order Status SMS" desc="Real-time order updates via SMS" checked={settings.notif_sms_orders} onChange={v => set('notif_sms_orders', v)} />
                    <SwitchRow label="Promo SMS" desc="Special deals sent to your phone" checked={settings.notif_sms_promos} onChange={v => set('notif_sms_promos', v)} />
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">🔔 Push Notifications</p>
                  <div className="bg-muted/30 rounded-xl px-4 divide-y">
                    <SwitchRow label="Order Alerts" desc="Instant order status pushes" checked={settings.notif_push_orders} onChange={v => set('notif_push_orders', v)} />
                    <SwitchRow label="Flash Sale Alerts" desc="Get notified before flash sales start" checked={settings.notif_flash_sale} onChange={v => set('notif_flash_sale', v)} />
                    <SwitchRow label="Wishlist Restocked" desc="When saved items are back in stock" checked={settings.notif_wishlist_restock} onChange={v => set('notif_wishlist_restock', v)} />
                    <SwitchRow label="New Arrivals" desc="Be the first to know about new products" checked={settings.notif_new_arrivals} onChange={v => set('notif_new_arrivals', v)} />
                    <SwitchRow label="Promotions" desc="Discount codes and special events" checked={settings.notif_push_promos} onChange={v => set('notif_push_promos', v)} />
                  </div>
                </div>
              </div>
            )}

            {/* SHOPPING PREFERENCES */}
            {activeSection === 'preferences' && (
              <div className="p-5 space-y-5">
                <div className="pb-3 border-b">
                  <h2 className="font-semibold flex items-center gap-2"><ShoppingBag className="h-5 w-5 text-primary" /> Shopping Preferences</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">Customize your shopping experience</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1"><Package className="h-3.5 w-3.5" /> Default Shoe Size</Label>
                    <Select value={settings.pref_default_size} onValueChange={v => set('pref_default_size', v)}>
                      <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
                      <SelectContent>{SIZES.map(s => <SelectItem key={s} value={s}>EU {s}</SelectItem>)}</SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">We'll pre-select this size on product pages</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Default Sort Order</Label>
                    <Select value={settings.pref_sort} onValueChange={v => set('pref_sort', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{SORT_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="bg-muted/30 rounded-xl px-4 divide-y">
                  <SwitchRow label="Show In-Stock Only" desc="Filter out sold-out products by default" checked={settings.pref_show_instock_only} onChange={v => set('pref_show_instock_only', v)} />
                  <SwitchRow label="Show Discounted Products First" desc="Prioritise sale items in listings" checked={settings.pref_show_discounts_first} onChange={v => set('pref_show_discounts_first', v)} />
                  <SwitchRow label="Compact Product View" desc="Show more products per row" checked={settings.pref_compact_view} onChange={v => set('pref_compact_view', v)} />
                </div>
              </div>
            )}

            {/* PRIVACY */}
            {activeSection === 'privacy' && (
              <div className="p-5 space-y-5">
                <div className="pb-3 border-b">
                  <h2 className="font-semibold flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /> Privacy Settings</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">Control your data and visibility</p>
                </div>
                <div className="bg-muted/30 rounded-xl px-4 divide-y">
                  <SwitchRow label="Public Profile" desc="Let other users see your profile" checked={settings.privacy_profile_visible} onChange={v => set('privacy_profile_visible', v)} />
                  <SwitchRow label="Public Reviews" desc="Show your name on product reviews" checked={settings.privacy_reviews_visible} onChange={v => set('privacy_reviews_visible', v)} />
                  <SwitchRow label="Marketing Communications" desc="Allow us to contact you for offers" checked={settings.privacy_marketing} onChange={v => set('privacy_marketing', v)} />
                  <SwitchRow label="Analytics & Tracking" desc="Help us improve your experience (anonymous)" checked={settings.privacy_analytics} onChange={v => set('privacy_analytics', v)} />
                </div>
                <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4">
                  <p className="text-sm font-semibold text-destructive mb-1">Delete Account</p>
                  <p className="text-xs text-muted-foreground mb-3">Permanently delete your account and all data. This action cannot be undone.</p>
                  <Button variant="destructive" size="sm" disabled>Request Account Deletion</Button>
                  <p className="text-xs text-muted-foreground mt-2">Contact support to proceed with account deletion</p>
                </div>
              </div>
            )}

            {/* DISPLAY */}
            {activeSection === 'display' && (
              <div className="p-5 space-y-5">
                <div className="pb-3 border-b">
                  <h2 className="font-semibold flex items-center gap-2"><Palette className="h-5 w-5 text-primary" /> Display Settings</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">Appearance and language options</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1"><Globe className="h-3.5 w-3.5" /> Language</Label>
                    <Select value={settings.pref_language} onValueChange={v => set('pref_language', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{LANGUAGES.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Currency Display</Label>
                    <Select value={settings.pref_currency} onValueChange={v => set('pref_currency', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Theme</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'light', label: '☀️ Light', desc: 'White background' },
                      { id: 'dark', label: '🌙 Dark', desc: 'Dark background' },
                      { id: 'system', label: '🖥️ System', desc: 'Match device' },
                    ].map(t => (
                      <button key={t.id} onClick={() => set('display_theme', t.id)}
                        className={`p-3 rounded-xl border-2 text-center transition-all ${settings.display_theme === t.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}>
                        <p className="text-sm font-medium">{t.label}</p>
                        <p className="text-xs text-muted-foreground">{t.desc}</p>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">Theme changes will apply on next reload</p>
                </div>
              </div>
            )}

            {/* SECURITY */}
            {activeSection === 'security' && (
              <div className="p-5 space-y-5">
                <div className="pb-3 border-b">
                  <h2 className="font-semibold flex items-center gap-2"><Lock className="h-5 w-5 text-primary" /> Security Settings</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">Keep your account safe</p>
                </div>

                <div className="bg-muted/30 rounded-xl p-4 space-y-4">
                  <p className="text-sm font-semibold">Change Password</p>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label>Current Password</Label>
                      <div className="relative">
                        <Input type={showOldPass ? 'text' : 'password'} value={oldPassword}
                          onChange={e => setOldPassword(e.target.value)} placeholder="Current password" className="pr-9" />
                        <button type="button" onClick={() => setShowOldPass(!showOldPass)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showOldPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>New Password</Label>
                      <div className="relative">
                        <Input type={showNewPass ? 'text' : 'password'} value={newPassword}
                          onChange={e => setNewPassword(e.target.value)} placeholder="Min 8 characters" className="pr-9" />
                        <button type="button" onClick={() => setShowNewPass(!showNewPass)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showNewPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <Button onClick={changePassword} disabled={changingPass || !newPassword} className="gap-2">
                      {changingPass ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                      Change Password
                    </Button>
                  </div>
                </div>

                <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                  <p className="text-sm font-semibold">Account Security</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between py-1">
                      <div>
                        <p className="text-sm">Two-Factor Authentication</p>
                        <p className="text-xs text-muted-foreground">Add extra layer of security</p>
                      </div>
                      <Badge variant="secondary">Coming Soon</Badge>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <div>
                        <p className="text-sm">Login History</p>
                        <p className="text-xs text-muted-foreground">View recent login activity</p>
                      </div>
                      <Badge variant="secondary">Coming Soon</Badge>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <div>
                        <p className="text-sm">Active Sessions</p>
                        <p className="text-xs text-muted-foreground">Manage logged-in devices</p>
                      </div>
                      <Badge variant="secondary">Coming Soon</Badge>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-sm font-medium text-amber-800 mb-1">⚠️ Account Linked</p>
                  <p className="text-xs text-amber-700">Your account is linked to <strong>{user.email}</strong>. To change your email, please contact support.</p>
                </div>
              </div>
            )}

            {/* Save button at bottom */}
            <div className="p-4 border-t">
              <Button onClick={save} disabled={saving} className="w-full gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save All Settings
              </Button>
            </div>
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default MySettings;
