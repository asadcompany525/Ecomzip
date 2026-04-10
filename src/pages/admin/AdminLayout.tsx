import { useState, useEffect, useRef } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  LayoutDashboard, Package, ShoppingCart, Users, Image, Tag, Settings, LogOut, Menu, X,
  BarChart3, MessageSquare, RotateCcw, Bell, Layers, Ticket, Star, FileText, CreditCard,
  TrendingUp, Sparkles, ClipboardList, PieChart, Wallet, MapPin, Bot, PackageSearch, Globe,
  ImagePlus, Shield, DollarSign, Megaphone, ThumbsUp, UserCog, Command, Mail, Heart, Search, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

const sidebarGroups = [
  {
    label: 'Core',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
      { icon: Package, label: 'Products', path: '/admin/products' },
      { icon: Layers, label: 'Categories', path: '/admin/categories' },
      { icon: ShoppingCart, label: 'Orders', path: '/admin/orders' },
      { icon: TrendingUp, label: 'Today Orders', path: '/admin/today-orders' },
      { icon: CreditCard, label: 'Payments', path: '/admin/payments' },
      { icon: Wallet, label: 'Payment Methods', path: '/admin/payment-methods' },
      { icon: Users, label: 'Customers', path: '/admin/customers' },
      { icon: UserCog, label: 'Staff Management', path: '/admin/staff' },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { icon: Image, label: 'Banners', path: '/admin/banners' },
      { icon: Ticket, label: 'Promo Codes', path: '/admin/promos' },
      { icon: Mail, label: 'Newsletter', path: '/admin/newsletter' },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { icon: TrendingUp, label: 'AI Trend Predictor', path: '/admin/trend-predictor' },
      { icon: Clock, label: 'Dynamic Pricing', path: '/admin/pricing-engine' },
      { icon: Heart, label: 'Loyalty Heatmap', path: '/admin/loyalty-heatmap' },
      { icon: Search, label: 'Search Logs', path: '/admin/search-logs' },
      { icon: Command, label: 'AI Global Manager', path: '/admin/ai-global-manager' },
      { icon: Bot, label: 'AI Helper', path: '/admin/ai-helper' },
      { icon: Shield, label: 'AI Fraud Detector', path: '/admin/ai-fraud-detector' },
      { icon: TrendingUp, label: 'AI Sales Predictor', path: '/admin/ai-sales-predictor' },
      { icon: Megaphone, label: 'AI Marketing Hub', path: '/admin/ai-marketing-hub' },
      { icon: ThumbsUp, label: 'AI Feedback Analyzer', path: '/admin/ai-feedback-analyzer' },
      { icon: DollarSign, label: 'AI Price Intelligence', path: '/admin/ai-price-intelligence' },
      { icon: Sparkles, label: 'AI Discounts', path: '/admin/ai-discounts' },
      { icon: Globe, label: 'AI Site Manager', path: '/admin/ai-site-manager' },
      { icon: ImagePlus, label: 'AI Banner Creator', path: '/admin/ai-banner-creator' },
      { icon: Sparkles, label: 'AI Bulk Creator', path: '/admin/ai-bulk-creator' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { icon: Star, label: 'Reviews', path: '/admin/reviews' },
      { icon: RotateCcw, label: 'Returns/Claims', path: '/admin/returns' },
      { icon: MessageSquare, label: 'Chat Support', path: '/admin/chat' },
      { icon: BarChart3, label: 'Reports', path: '/admin/reports' },
      { icon: PieChart, label: 'Product Analytics', path: '/admin/product-analytics' },
      { icon: ClipboardList, label: 'Order Checklist', path: '/admin/order-checklist' },
      { icon: Bell, label: 'Stock Alerts', path: '/admin/stock-alerts' },
      { icon: MapPin, label: 'City Manager', path: '/admin/city-manager' },
      { icon: PackageSearch, label: 'Inventory Insights', path: '/admin/inventory' },
      { icon: Tag, label: 'Delivery', path: '/admin/delivery' },
      { icon: FileText, label: 'Activity Log', path: '/admin/activity' },
      { icon: Settings, label: 'Settings', path: '/admin/settings' },
    ],
  },
];

const allItems = sidebarGroups.flatMap(g => g.items);
const SECRET_PASSWORD = 'Asad_Dev_99';

const AdminLayout = () => {
  const { signOut, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logoClicks, setLogoClicks] = useState(0);
  const [showSecretModal, setShowSecretModal] = useState(false);
  const [secretInput, setSecretInput] = useState('');
  const [secretError, setSecretError] = useState('');
  const [secretShake, setSecretShake] = useState(false);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attendanceId = useRef<string | null>(null);
  const [brandName] = useState('Admin');
  const [brandLogo] = useState('/favicon.ico');

  // Record attendance login
  useEffect(() => {
    if (!user?.id) return;
    supabase.from('staff_attendance').insert({ user_id: user.id, login_at: new Date().toISOString() })
      .select('id').single().then(({ data }) => {
        if (data?.id) attendanceId.current = data.id;
      });
    const handleUnload = () => {
      if (attendanceId.current) {
        supabase.from('staff_attendance').update({ logout_at: new Date().toISOString() }).eq('id', attendanceId.current).then(() => {});
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => { window.removeEventListener('beforeunload', handleUnload); handleUnload(); };
  }, [user?.id]);

  const handleLogout = async () => {
    if (attendanceId.current) {
      await supabase.from('staff_attendance').update({ logout_at: new Date().toISOString() }).eq('id', attendanceId.current);
    }
    await signOut();
    navigate('/admin/login');
  };

  const handleLogoClick = () => {
    const newCount = logoClicks + 1;
    setLogoClicks(newCount);
    if (clickTimer.current) clearTimeout(clickTimer.current);
    if (newCount >= 5) {
      setLogoClicks(0);
      setShowSecretModal(true);
      setSecretInput('');
      setSecretError('');
      setSecretShake(false);
    } else {
      clickTimer.current = setTimeout(() => setLogoClicks(0), 2000);
    }
  };

  const handleSecretSubmit = () => {
    if (secretInput === SECRET_PASSWORD) {
      setShowSecretModal(false);
      navigate('/developer');
    } else {
      setSecretError('Incorrect password. Access denied.');
      setSecretShake(true);
      setTimeout(() => setSecretShake(false), 600);
    }
  };

  const currentLabel = allItems.find(i => i.path === location.pathname)?.label || 'Admin Panel';

  return (
    <div className="min-h-screen bg-background flex">
      <aside className={`fixed inset-y-0 left-0 z-50 w-56 bg-card border-r transform transition-transform md:relative md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-3 py-3 border-b">
          <button onClick={handleLogoClick} className="flex items-center gap-2 select-none focus:outline-none" title="Click 5x for secret access">
            <img src={brandLogo} alt="AS" className="h-7 w-7 rounded" onError={e => { (e.target as HTMLImageElement).src = '/favicon.ico'; }} />
            <span className="font-bold text-sm truncate">{brandName}</span>
          </button>
          <button className="md:hidden" onClick={() => setSidebarOpen(false)}><X className="h-4 w-4" /></button>
        </div>
        <nav className="px-2 py-2 overflow-y-auto h-[calc(100vh-112px)]">
          {sidebarGroups.map(group => (
            <div key={group.label} className="mb-2">
              <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest px-2 py-1">{group.label}</p>
              {group.items.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] font-medium transition-colors mb-0.5 ${
                    location.pathname === item.path
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <item.icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 px-2 py-2 border-t bg-card">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground text-xs h-8" onClick={handleLogout}>
            <LogOut className="h-3.5 w-3.5" />Logout
          </Button>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-card border-b px-4 py-2.5 flex items-center gap-3">
          <button className="md:hidden" onClick={() => setSidebarOpen(true)}><Menu className="h-5 w-5" /></button>
          <h2 className="text-sm font-semibold flex-1 truncate">{currentLabel}</h2>
          <Badge variant="outline" className="text-[10px] hidden sm:inline-flex max-w-[160px] truncate">{user?.email}</Badge>
        </header>
        <main className="flex-1 p-3 md:p-5 overflow-auto">
          <Outlet />
        </main>
      </div>

      {/* Polished Secret Developer Portal Modal */}
      <Dialog open={showSecretModal} onOpenChange={open => { if (!open) { setShowSecretModal(false); setSecretError(''); setSecretInput(''); } }}>
        <DialogContent className="max-w-xs p-0 overflow-hidden border-2 border-primary/20 shadow-2xl">
          {/* Header gradient banner */}
          <div className="bg-gradient-to-br from-primary via-primary/90 to-primary/70 px-6 pt-6 pb-5 text-center">
            <div className="w-14 h-14 rounded-full bg-white/15 backdrop-blur flex items-center justify-center mx-auto mb-3 shadow-inner">
              <Shield className="h-7 w-7 text-white" />
            </div>
            <h2 className="text-white font-black text-lg tracking-tight">Developer Portal</h2>
            <p className="text-white/70 text-xs mt-1">Restricted Access · ASDEVOLPER</p>
          </div>

          {/* Body */}
          <div className={`p-5 space-y-4 transition-all ${secretShake ? 'animate-[shake_0.4s_ease-in-out]' : ''}`}>
            <p className="text-sm text-muted-foreground text-center">Enter the secret password to continue.</p>
            <Input
              type="password"
              placeholder="••••••••••••"
              className={`text-center tracking-widest text-base h-11 ${secretError ? 'border-destructive focus-visible:ring-destructive/40' : ''}`}
              value={secretInput}
              onChange={e => { setSecretInput(e.target.value); setSecretError(''); }}
              onKeyDown={e => { if (e.key === 'Enter') handleSecretSubmit(); }}
              autoFocus
            />
            {secretError && (
              <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                <X className="h-3.5 w-3.5 text-destructive shrink-0" />
                <p className="text-xs text-destructive font-medium">{secretError}</p>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => { setShowSecretModal(false); setSecretError(''); setSecretInput(''); }}>Cancel</Button>
              <Button className="flex-1 gap-2" onClick={handleSecretSubmit}>
                <Shield className="h-4 w-4" />Enter
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground/50 text-center">This portal is private and encrypted.</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminLayout;
