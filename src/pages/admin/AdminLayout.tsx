import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard, Package, ShoppingCart, Users, Image, Tag, Settings, LogOut, Menu, X,
  BarChart3, MessageSquare, RotateCcw, Bell, Layers, Ticket, Star, FileText, CreditCard, TrendingUp, Sparkles, ClipboardList, PieChart, Wallet, MapPin, Bot, PackageSearch, Globe, ImagePlus, Shield, DollarSign, Megaphone, ThumbsUp, UserCog, Command
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const sidebarItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
  { icon: Package, label: 'Products', path: '/admin/products' },
  { icon: Layers, label: 'Categories', path: '/admin/categories' },
  { icon: ShoppingCart, label: 'Orders', path: '/admin/orders' },
  { icon: TrendingUp, label: 'Today Orders', path: '/admin/today-orders' },
  { icon: CreditCard, label: 'Payments', path: '/admin/payments' },
  { icon: Wallet, label: 'Payment Methods', path: '/admin/payment-methods' },
  { icon: Users, label: 'Customers', path: '/admin/customers' },
  { icon: UserCog, label: 'Staff Management', path: '/admin/staff' },
  { icon: Image, label: 'Banners', path: '/admin/banners' },
  { icon: Ticket, label: 'Promo Codes', path: '/admin/promos' },
  { icon: Star, label: 'Reviews', path: '/admin/reviews' },
  { icon: RotateCcw, label: 'Returns/Claims', path: '/admin/returns' },
  { icon: MessageSquare, label: 'Chat Support', path: '/admin/chat' },
  { icon: BarChart3, label: 'Reports', path: '/admin/reports' },
  { icon: PieChart, label: 'Product Analytics', path: '/admin/product-analytics' },
  { icon: Sparkles, label: 'AI Discounts', path: '/admin/ai-discounts' },
  { icon: ClipboardList, label: 'Order Checklist', path: '/admin/order-checklist' },
  { icon: FileText, label: 'AI Form Generator', path: '/admin/form-generator' },
  { icon: Bell, label: 'Stock Alerts', path: '/admin/stock-alerts' },
  { icon: MapPin, label: 'City Manager', path: '/admin/city-manager' },
  { icon: Bot, label: 'AI Helper', path: '/admin/ai-helper' },
  { icon: Globe, label: 'AI Site Manager', path: '/admin/ai-site-manager' },
  { icon: ImagePlus, label: 'AI Banner Creator', path: '/admin/ai-banner-creator' },
  { icon: Sparkles, label: 'AI Bulk Creator', path: '/admin/ai-bulk-creator' },
  { icon: Shield, label: 'AI Fraud Detector', path: '/admin/ai-fraud-detector' },
  { icon: TrendingUp, label: 'AI Sales Predictor', path: '/admin/ai-sales-predictor' },
  { icon: Megaphone, label: 'AI Marketing Hub', path: '/admin/ai-marketing-hub' },
  { icon: ThumbsUp, label: 'AI Feedback Analyzer', path: '/admin/ai-feedback-analyzer' },
  { icon: DollarSign, label: 'AI Price Intelligence', path: '/admin/ai-price-intelligence' },
  { icon: Command, label: 'AI Global Manager', path: '/admin/ai-global-manager' },
  { icon: PackageSearch, label: 'Inventory Insights', path: '/admin/inventory' },
  { icon: FileText, label: 'Activity Log', path: '/admin/activity' },
  { icon: Settings, label: 'Settings', path: '/admin/settings' },
];

const AdminLayout = () => {
  const { signOut, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-background flex">
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transform transition-transform md:relative md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between p-4 border-b">
          <Link to="/admin" className="flex items-center gap-2">
            <img src="/favicon.ico" alt="Admin" className="h-8 w-8" />
            <span className="font-bold text-lg">Admin Panel</span>
          </Link>
          <button className="md:hidden" onClick={() => setSidebarOpen(false)}><X className="h-5 w-5" /></button>
        </div>
        <nav className="p-3 space-y-0.5 overflow-y-auto h-[calc(100vh-140px)]">
          {sidebarItems.map(item => (
            <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === item.path ? 'bg-primary text-primary-foreground' : 'hover:bg-accent text-muted-foreground hover:text-foreground'
              }`}>
              <item.icon className="h-4 w-4 shrink-0" /><span className="truncate">{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t">
          <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />Logout
          </Button>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-card border-b px-4 py-3 flex items-center gap-3">
          <button className="md:hidden" onClick={() => setSidebarOpen(true)}><Menu className="h-5 w-5" /></button>
          <h2 className="text-lg font-semibold flex-1 truncate">{sidebarItems.find(i => i.path === location.pathname)?.label || 'Admin'}</h2>
          <Badge variant="outline" className="text-xs hidden sm:inline-flex">{user?.email}</Badge>
        </header>
        <main className="flex-1 p-3 md:p-6 overflow-auto"><Outlet /></main>
      </div>
    </div>
  );
};

export default AdminLayout;
