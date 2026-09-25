import { useState, useEffect, useRef } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import {
  LayoutDashboard, Package, ShoppingCart, Users, Image, Tag, Settings, LogOut, Menu, X,
  BarChart3, MessageSquare, RotateCcw, Bell, Layers, Ticket, Star, FileText, CreditCard,
  TrendingUp, Sparkles, ClipboardList, PieChart, Wallet, MapPin, Bot, PackageSearch, Globe,
  ImagePlus, Shield, DollarSign, Megaphone, ThumbsUp, UserCog, Command, Mail, Heart, Search,
  Clock, Lock, Activity, FileSpreadsheet, Banknote, Server, BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';

const ADMIN_EMAIL = 'sscck@gmail.com';

const PERMS_KEY = 'staff_permissions_v3';
const ROLES_KEY = 'staff_roles_v3';
const loadPerms = (): Record<string, string[]> => { try { return JSON.parse(localStorage.getItem(PERMS_KEY) || '{}'); } catch { return {}; } };
const loadRoles = (): Record<string, string> => { try { return JSON.parse(localStorage.getItem(ROLES_KEY) || '{}'); } catch { return {}; } };
const accessKey = (userId: string) => `staff_access_${userId}`;

const PATH_TO_PERM: Record<string, string> = {
  '/admin': 'page_dashboard',
  '/admin/orders': 'page_orders',
  '/admin/today-orders': 'page_orders',
  '/admin/order-checklist': 'page_orders',
  '/admin/products': 'page_products',
  '/admin/categories': 'page_products',
  '/admin/customers': 'page_customers',
  '/admin/reviews': 'page_reviews',
  '/admin/returns': 'page_returns',
  '/admin/claims-returns': 'page_returns',
  '/admin/chat': 'page_chat',
  '/admin/contact-messages': 'page_chat',
  '/admin/ai-salesperson-chat': 'page_chat',
  '/admin/delivery': 'page_deliveries',
  '/admin/payments': 'page_payments',
  '/admin/payment-methods': 'page_payments',
  '/admin/staff': 'page_staff',
  '/admin/staff-performance': 'page_staff',
  '/admin/settings': 'page_settings',
  '/admin/product-analytics': 'page_analytics',
  '/admin/reports': 'page_analytics',
  '/admin/stock-alerts': 'page_inventory',
  '/admin/inventory': 'page_inventory',
  '/admin/city-manager': 'page_inventory',
  '/admin/activity': 'page_activity',
  '/admin/banners': 'page_banners',
  '/admin/promos': 'page_promos',
  '/admin/newsletter': 'page_newsletter',
  '/admin/ai-helper': 'page_ai_helper',
  '/admin/ai-site-manager': 'page_ai_site_manager',
  '/admin/ai-global-manager': 'page_ai_global_manager',
  '/admin/ai-voice': 'page_ai_voice',
  '/admin/ai-discounts': 'page_ai_discounts',
  '/admin/ai-fraud-detector': 'page_ai_fraud',
  '/admin/ai-sales-predictor': 'page_ai_sales',
  '/admin/ai-marketing-hub': 'page_ai_marketing',
  '/admin/ai-feedback-analyzer': 'page_ai_feedback',
  '/admin/ai-banner-creator': 'page_ai_banners',
  '/admin/ai-bulk-creator': 'page_ai_bulk',
  '/admin/ai-claim-validator': 'page_returns',
  '/admin/ai-virtual-tryon': 'page_ai_tryon',
  '/admin/ai-size-advisor': 'page_ai_tryon',
  '/admin/form-generator': 'page_ai_bulk',
  '/admin/trend-predictor': 'page_intelligence',
  '/admin/pricing-engine': 'page_intelligence',
  '/admin/loyalty-heatmap': 'page_intelligence',
  '/admin/search-logs': 'page_intelligence',
  '/admin/finance-ledger': 'page_finance',
  '/admin/staff-salary': 'page_finance',
  '/admin/tech-logs': 'page_tech',
};

const sidebarGroups = [
  {
    label: 'Core',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard',        path: '/admin',                 adminOnly: false },
      { icon: Package,         label: 'Products',         path: '/admin/products',        adminOnly: false },
      { icon: Layers,          label: 'Categories',       path: '/admin/categories',      adminOnly: false },
      { icon: ShoppingCart,    label: 'Orders',           path: '/admin/orders',          adminOnly: false },
      { icon: TrendingUp,      label: 'Today Orders',     path: '/admin/today-orders',    adminOnly: false },
      { icon: CreditCard,      label: 'Payments',         path: '/admin/payments',        adminOnly: true  },
      { icon: Wallet,          label: 'Payment Methods',  path: '/admin/payment-methods', adminOnly: true  },
      { icon: Users,           label: 'Customers',        path: '/admin/customers',       adminOnly: false },
      { icon: UserCog,         label: 'Staff Management', path: '/admin/staff',           adminOnly: true  },
      { icon: Activity,        label: 'Staff Performance',path: '/admin/staff-performance',adminOnly: true },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { icon: Image,           label: 'Banners',          path: '/admin/banners',         adminOnly: false },
      { icon: Ticket,          label: 'Promo Codes',      path: '/admin/promos',          adminOnly: false },
      { icon: Mail,            label: 'Newsletter',       path: '/admin/newsletter',      adminOnly: false },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { icon: TrendingUp,      label: 'AI Trend Predictor',     path: '/admin/trend-predictor',       adminOnly: true },
      { icon: Clock,           label: 'Dynamic Pricing',        path: '/admin/pricing-engine',        adminOnly: true },
      { icon: Heart,           label: 'Loyalty Heatmap',        path: '/admin/loyalty-heatmap',       adminOnly: true },
      { icon: Search,          label: 'Search Logs',            path: '/admin/search-logs',           adminOnly: true },
      { icon: Command,         label: 'AI Global Manager',      path: '/admin/ai-global-manager',     adminOnly: true },
      { icon: Bot,             label: 'AI Helper',              path: '/admin/ai-helper',             adminOnly: true },
      { icon: Shield,          label: 'AI Fraud Detector',      path: '/admin/ai-fraud-detector',     adminOnly: true },
      { icon: TrendingUp,      label: 'AI Sales Predictor',     path: '/admin/ai-sales-predictor',    adminOnly: true },
      { icon: Megaphone,       label: 'AI Marketing Hub',       path: '/admin/ai-marketing-hub',      adminOnly: true },
      { icon: ThumbsUp,        label: 'AI Feedback Analyzer',   path: '/admin/ai-feedback-analyzer',  adminOnly: true },
      { icon: Sparkles,        label: 'AI Discounts',           path: '/admin/ai-discounts',          adminOnly: true },
      { icon: Globe,           label: 'AI Site Manager',        path: '/admin/ai-site-manager',       adminOnly: true },
      { icon: ImagePlus,       label: 'AI Banner Creator',      path: '/admin/ai-banner-creator',     adminOnly: true },
      { icon: Sparkles,        label: 'AI Bulk Creator',        path: '/admin/ai-bulk-creator',       adminOnly: true },
      { icon: FileSpreadsheet, label: 'AI Report Generator',    path: '/admin/form-generator',        adminOnly: true },
    ],
  },
  {
    label: 'Finance',
    items: [
      { icon: BookOpen,        label: 'Profit/Loss Ledger', path: '/admin/finance-ledger',    adminOnly: true },
      { icon: Banknote,        label: 'Staff Salary',       path: '/admin/staff-salary',      adminOnly: true },
    ],
  },
  {
    label: 'Operations',
    items: [
      { icon: Star,            label: 'Reviews',            path: '/admin/reviews',           adminOnly: false },
      { icon: Shield,          label: 'Claims & Returns',   path: '/admin/claims-returns',    adminOnly: false },
      { icon: Mail,            label: 'Contact Messages',   path: '/admin/contact-messages',  adminOnly: false },
      { icon: MessageSquare,   label: 'Chat Support',       path: '/admin/chat',              adminOnly: false },
      { icon: Bot,             label: 'AI Salesperson Chats', path: '/admin/ai-salesperson-chat', adminOnly: false },
      { icon: BarChart3,       label: 'Reports',            path: '/admin/reports',           adminOnly: false },
      { icon: PieChart,        label: 'Product Analytics',  path: '/admin/product-analytics', adminOnly: false },
      { icon: ClipboardList,   label: 'Order Checklist',    path: '/admin/order-checklist',   adminOnly: false },
      { icon: Bell,            label: 'Stock Alerts',       path: '/admin/stock-alerts',      adminOnly: true  },
      { icon: Bell,            label: 'Notify Me Requests', path: '/admin/stock-notifications', adminOnly: true },
      { icon: MapPin,          label: 'City Manager',       path: '/admin/city-manager',      adminOnly: true  },
      { icon: PackageSearch,   label: 'Inventory Insights', path: '/admin/inventory',         adminOnly: true  },
      { icon: Tag,             label: 'Delivery',           path: '/admin/delivery',          adminOnly: false },
      { icon: FileText,        label: 'Activity Log',       path: '/admin/activity',          adminOnly: false },
      { icon: Settings,        label: 'Settings',           path: '/admin/settings',          adminOnly: true  },
      { icon: Server,          label: 'Tech & Error Logs',  path: '/admin/tech-logs',         adminOnly: true  },
    ],
  },
];

const allItems = sidebarGroups.flatMap(g => g.items);
const SECRET_PASSWORD = 'Asad_Dev_99';

const ROLE_DISPLAY: Record<string, string> = {
  staff: 'Staff', sales: 'Sales Staff', support: 'Support Staff',
  delivery: 'Delivery Staff', manager: 'Manager', editor: 'Editor', viewer: 'Viewer',
};

const AdminLayout = () => {
  const { signOut, user, isAdmin, isStaff } = useAuth();
  const isMainAdmin = isAdmin || user?.email === ADMIN_EMAIL;
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

  const [staffPermissions, setStaffPermissions] = useState<string[] | null>(null);
  const [staffRoleLabel, setStaffRoleLabel] = useState('Staff');

  const siteConfig = useStoreSettings();
  const baseBrand = siteConfig.brandName || 'Admin';
  const brandName = isMainAdmin ? `${baseBrand} Admin` : `${baseBrand} Staff`;

  useEffect(() => {
    if (!isStaff || !user?.id) return;
    supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', user.id)
      .eq('role', 'moderator')
      .maybeSingle()
      .then(async ({ data }) => {
        if (data?.id) {
          const stored = loadPerms();
          const roles = loadRoles();
          const { data: accessRow } = await supabase
            .from('site_settings')
            .select('value')
            .eq('key', accessKey(user.id))
            .maybeSingle();
          const value = typeof accessRow?.value === 'object' && accessRow.value ? accessRow.value as any : {};
          const perms = Array.isArray(value.permissions) ? value.permissions : (stored[data.id] ?? ['page_dashboard', 'page_orders', 'page_customers', 'page_chat']);
          const roleKey = value.role || roles[data.id] || 'staff';
          setStaffPermissions(perms);
          setStaffRoleLabel(ROLE_DISPLAY[roleKey] || roleKey.charAt(0).toUpperCase() + roleKey.slice(1));
        }
      });
  }, [isStaff, user?.id]);

  useEffect(() => {
    if (!user?.id || user.email === ADMIN_EMAIL) return;
    supabase.from('staff_attendance').insert({ user_id: user.id, login_at: new Date().toISOString() })
      .select('id').single().then(({ data, error }) => {
        if (error?.code === 'PGRST205') return;
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
    if (attendanceId.current && user?.email !== ADMIN_EMAIL) {
      await supabase.from('staff_attendance').update({ logout_at: new Date().toISOString() }).eq('id', attendanceId.current);
    }
    await signOut();
    navigate('/login');
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

  const hasFullAccess = staffPermissions?.includes('page_full_access') ?? false;

  const isItemDisabled = (item: any): boolean => {
    if (isMainAdmin) return false;
    if (!isStaff) return false;
    if (hasFullAccess) return false;
    if (item.adminOnly) return true;
    const perm = PATH_TO_PERM[item.path];
    if (perm && staffPermissions !== null && !staffPermissions.includes(perm)) return true;
    return false;
  };

  const canAccessCurrentPath = (): boolean => {
    if (isMainAdmin) return true;
    if (!isStaff) return true;
    if (hasFullAccess) return true;
    const perm = PATH_TO_PERM[location.pathname];
    if (!perm) {
      const item = allItems.find(i => i.path === location.pathname);
      if (item?.adminOnly) return false;
      return true;
    }
    if (staffPermissions === null) return true;
    return staffPermissions.includes(perm);
  };

  const currentLabel = allItems.find(i => i.path === location.pathname)?.label || 'Admin Panel';
  const hasAccess = canAccessCurrentPath();

  const identityLabel = isMainAdmin
    ? 'Logged in as: Admin'
    : isStaff
    ? `Logged in as: ${staffRoleLabel}`
    : '';

  const handleDisabledClick = () => {
    toast({
      title: 'Access Denied',
      description: 'You do not have permission to view this page.',
      variant: 'destructive',
    });
  };

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      <aside className={`fixed inset-y-0 left-0 z-50 w-56 bg-card border-r transform transition-transform flex flex-col md:relative md:translate-x-0 md:h-full ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-3 py-3 border-b shrink-0">
          <button onClick={handleLogoClick} className="flex items-center gap-2 select-none focus:outline-none" title="Click 5x for secret access">
            <img src={siteConfig.faviconUrl || '/favicon.ico'} alt={baseBrand} className="h-7 w-7 rounded" onError={e => { (e.target as HTMLImageElement).src = '/favicon.ico'; }} />
            <div className="min-w-0">
              <span className="font-bold text-sm truncate block">{brandName}</span>
              {!isMainAdmin && isStaff && (
                <span className="text-[10px] text-primary font-semibold">{staffRoleLabel} Panel</span>
              )}
              {isMainAdmin && (
                <span className="text-[10px] text-primary font-semibold">Admin Panel</span>
              )}
            </div>
          </button>
          <button className="md:hidden" onClick={() => setSidebarOpen(false)}><X className="h-4 w-4" /></button>
        </div>
        <nav className="flex-1 px-2 py-2 overflow-y-auto">
          {sidebarGroups.map(group => (
            <div key={group.label} className="mb-2">
              <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest px-2 py-1">{group.label}</p>
              {group.items.map((item: any) => {
                const disabled = isItemDisabled(item);
                const isActive = location.pathname === item.path;
                const baseClass = `flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] font-medium transition-colors mb-0.5 w-full text-left`;
                const activeClass = 'bg-primary text-primary-foreground';
                const normalClass = 'hover:bg-accent text-muted-foreground hover:text-foreground';
                const disabledClass = 'opacity-40 cursor-not-allowed text-muted-foreground';

                if (disabled) {
                  return (
                    <button
                      key={item.path}
                      onClick={handleDisabledClick}
                      className={`${baseClass} ${disabledClass}`}
                      title="No permission"
                    >
                      <item.icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{item.label}</span>
                      <Lock className="h-2.5 w-2.5 ml-auto shrink-0 opacity-60" />
                    </button>
                  );
                }

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`${baseClass} ${isActive ? activeClass : normalClass}`}
                  >
                    <item.icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="shrink-0 px-2 py-2 border-t bg-card">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground text-xs h-8" onClick={handleLogout}>
            <LogOut className="h-3.5 w-3.5" />Logout
          </Button>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="shrink-0 z-30 bg-card border-b px-4 py-2.5 flex items-center gap-3">
          <button className="md:hidden" onClick={() => setSidebarOpen(true)}><Menu className="h-5 w-5" /></button>
          <h2 className="text-sm font-semibold flex-1 truncate">{currentLabel}</h2>
          {identityLabel && (
            <Badge variant="secondary" className="text-[10px] hidden sm:inline-flex max-w-[180px] truncate">
              {identityLabel}
            </Badge>
          )}
          <Badge variant="outline" className="text-[10px] hidden md:inline-flex max-w-[160px] truncate">{user?.email}</Badge>
        </header>
        <main className="flex-1 overflow-y-auto p-3 md:p-5">
          {hasAccess ? (
            <Outlet />
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
              <div className="p-5 bg-destructive/10 rounded-full">
                <Lock className="h-10 w-10 text-destructive" />
              </div>
              <h2 className="text-2xl font-bold">No Access</h2>
              <p className="text-muted-foreground text-sm max-w-sm">
                You don't have permission to view this page. Contact your Admin to request access.
              </p>
              <Button variant="outline" onClick={() => navigate('/admin')}>Go to Dashboard</Button>
            </div>
          )}
        </main>
      </div>

      <Dialog open={showSecretModal} onOpenChange={open => { if (!open) { setShowSecretModal(false); setSecretError(''); setSecretInput(''); } }}>
        <DialogContent className="max-w-xs p-0 overflow-hidden border-2 border-primary/20 shadow-2xl">
          <div className="bg-gradient-to-br from-primary via-primary/90 to-primary/70 px-6 pt-6 pb-5 text-center">
            <div className="w-14 h-14 rounded-full bg-white/15 backdrop-blur flex items-center justify-center mx-auto mb-3 shadow-inner">
              <Shield className="h-7 w-7 text-white" />
            </div>
            <h2 className="text-white font-black text-lg tracking-tight">Developer Portal</h2>
            <p className="text-white/70 text-xs mt-1">Restricted Access · ASDEVOLPER</p>
          </div>
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
