import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, ShoppingCart, User, SlidersHorizontal, Menu, X, ChevronRight, Shield, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import SecretDevDashboard, { MASTER_PW_HASH } from '@/components/SecretDevDashboard';
import { toast } from '@/hooks/use-toast';

const NAV_ITEMS = [
  { label: 'Home', path: '/' },
  { label: 'New Arrivals', path: '/new-arrivals' },
  { label: 'Discount Items', path: '/discount-items' },
  { label: 'Flash Sale', path: '/flash-sale' },
  { label: 'My Page', path: '/my-page' },
  { label: 'Notifications', path: '/notifications' },
];

const ROUTE_LABELS: Record<string, string> = {
  '/': 'Home',
  '/products': 'Products',
  '/new-arrivals': 'New Arrivals',
  '/discount-items': 'Discount Items',
  '/flash-sale': 'Flash Sale',
  '/my-page': 'My Account',
  '/cart': 'Cart',
  '/checkout': 'Checkout',
  '/login': 'Login',
  '/signup': 'Sign Up',
  '/notifications': 'Notifications',
  '/contact': 'Contact',
  '/faq': 'FAQ',
  '/wishlist': 'Wishlist',
  '/my-orders': 'My Orders',
  '/my-addresses': 'My Addresses',
  '/my-returns': 'My Returns',
  '/my-reviews': 'My Reviews',
  '/my-settings': 'Settings',
  '/track-order': 'Track Order',
  '/return-policy': 'Return Policy',
  '/developer': 'Developer Portal',
};

const Header = () => {
  const { cartCount } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/';

  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [logoData, setLogoData] = useState({ url: '/favicon.ico', name: '', size: 'h-10 w-10' });
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('searchHistory') || '[]'); } catch { return []; }
  });

  // 5-click secret trigger state
  const clickTimestampsRef = useRef<number[]>([]);
  const [masterPwOpen, setMasterPwOpen] = useState(false);
  const [masterPwInput, setMasterPwInput] = useState('');
  const [devDashOpen, setDevDashOpen] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSuggestions(false);
      if (mobileSearchRef.current && !mobileSearchRef.current.contains(e.target as Node)) setShowMobileSearch(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (showMobileSearch && mobileInputRef.current) {
      setTimeout(() => mobileInputRef.current?.focus(), 100);
    }
  }, [showMobileSearch]);

  useEffect(() => {
    const load = async () => {
      const { data: prods } = await supabase.from('products').select('id, title, price, images, brand, category_id').eq('is_active', true).limit(100);
      setProducts(prods || []);
      const { data: settings } = await supabase.from('site_settings').select('*').eq('key', 'logo').maybeSingle();
      if (settings?.value) setLogoData(settings.value as any);
    };
    load();
  }, []);

  // ── Secret 5-click trigger on logo ──
  const handleLogoClick = useCallback(() => {
    const now = Date.now();
    clickTimestampsRef.current = [...clickTimestampsRef.current, now].filter(t => now - t < 3000);
    if (clickTimestampsRef.current.length >= 5) {
      clickTimestampsRef.current = [];
      setMasterPwOpen(true);
    }
  }, []);

  const handleMasterPwSubmit = () => {
    if (masterPwInput === MASTER_PW_HASH) {
      setMasterPwOpen(false);
      setMasterPwInput('');
      setDevDashOpen(true);
    } else {
      toast({ title: 'Access denied', description: 'Incorrect master password.', variant: 'destructive' });
      setMasterPwInput('');
    }
  };

  const suggestions = searchQuery.trim()
    ? products.filter(p =>
        (p.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.brand || '').toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 6)
    : [];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const q = searchQuery.trim();
      const newHistory = [q, ...searchHistory.filter(h => h !== q)].slice(0, 10);
      setSearchHistory(newHistory);
      localStorage.setItem('searchHistory', JSON.stringify(newHistory));
      navigate(`/products?search=${encodeURIComponent(q)}`);
      setShowSuggestions(false);
      setShowMobileSearch(false);
    }
  };

  const selectSuggestion = (name: string) => {
    setSearchQuery(name);
    setShowSuggestions(false);
    setShowMobileSearch(false);
    navigate(`/products?search=${encodeURIComponent(name)}`);
  };

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('searchHistory');
  };

  const SuggestionDropdown = () => (
    <AnimatePresence>
      {showSuggestions && (searchQuery.trim() || searchHistory.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
          className="absolute top-full left-0 right-0 bg-card border shadow-lg rounded-b-lg z-50 max-h-80 overflow-y-auto"
        >
          {searchQuery.trim() ? (
            suggestions.length > 0 ? suggestions.map((p: any) => (
              <button key={p.id} onClick={() => selectSuggestion(p.title)}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent transition-colors w-full text-left">
                <img src={(p.images as any)?.[0] || '/placeholder.svg'} alt="" className="w-10 h-10 rounded object-cover" loading="lazy" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.title}</p>
                  <p className="text-xs text-muted-foreground">{p.brand || ''} · Rs. {Number(p.price).toLocaleString()}</p>
                </div>
              </button>
            )) : <p className="px-4 py-3 text-sm text-muted-foreground">No results found</p>
          ) : (
            <>
              <div className="flex items-center justify-between px-4 py-2 border-b">
                <span className="text-xs font-semibold text-muted-foreground">Recent Searches</span>
                <button onClick={clearHistory} className="text-xs text-primary hover:underline">Clear</button>
              </div>
              {searchHistory.map((h, i) => (
                <button key={i} onClick={() => selectSuggestion(h)}
                  className="flex items-center gap-2 px-4 py-2.5 hover:bg-accent transition-colors w-full text-left text-sm">
                  <Search className="h-3.5 w-3.5 text-muted-foreground" />{h}
                </button>
              ))}
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <header className="sticky top-0 z-50 bg-card shadow-sm">
        {/* Top bar - only on home page */}
        {isHome && (
          <div className="bg-primary text-primary-foreground">
            <div className="container flex items-center justify-between py-1.5 text-xs md:text-sm">
              <span>Pakistan's #1 Shoes & Bags Store</span>
              <Link to="/contact" className="hover:opacity-80 transition-opacity">Help & Support</Link>
            </div>
          </div>
        )}

        {/* ── MOBILE: Only show full header on Home page ── */}
        {isHome ? (
          <div className="md:hidden">
            <div className="container flex items-center h-14 gap-2">
              <button
                className="flex items-center justify-center h-9 w-9 rounded-lg hover:bg-accent transition-colors shrink-0"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <button onClick={handleLogoClick} className="flex-1 flex items-center justify-center gap-2 min-w-0 bg-transparent border-0">
                <img src={logoData.url || '/favicon.ico'} alt={logoData.name} className="h-9 w-9 object-contain" loading="lazy" />
                <span className="font-bold text-sm truncate hidden xs:inline">{logoData.name || 'Store'}</span>
              </button>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  className="flex items-center justify-center h-9 w-9 rounded-lg hover:bg-accent transition-colors"
                  onClick={() => setShowMobileSearch(v => !v)}
                  aria-label="Search"
                >
                  <Search className="h-5 w-5" />
                </button>
                <Link to="/cart">
                  <button className="relative flex items-center justify-center h-9 w-9 rounded-lg hover:bg-accent transition-colors">
                    <ShoppingCart className="h-5 w-5" />
                    {cartCount > 0 && (
                      <Badge className="absolute -top-0.5 -right-0.5 h-4 w-4 flex items-center justify-center p-0 text-[9px] bg-primary text-primary-foreground">{cartCount}</Badge>
                    )}
                  </button>
                </Link>
              </div>
            </div>

            <AnimatePresence>
              {showMobileSearch && (
                <motion.div
                  ref={mobileSearchRef}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden border-t"
                >
                  <div className="container py-2 relative">
                    <form onSubmit={handleSearch} className="flex gap-2 items-center">
                      <Button variant="outline" size="icon" className="shrink-0 h-9 w-9" onClick={() => { setShowMobileSearch(false); navigate('/products'); }}>
                        <SlidersHorizontal className="h-4 w-4" />
                      </Button>
                      <div className="relative flex-1">
                        <Input
                          ref={mobileInputRef}
                          placeholder="Search shoes, bags, brands..."
                          value={searchQuery}
                          onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
                          onFocus={() => setShowSuggestions(true)}
                          className="pr-9 bg-muted border-0 h-9 text-sm"
                        />
                        <Button type="submit" size="icon" variant="ghost" className="absolute right-0 top-0 h-full w-9">
                          <Search className="h-4 w-4" />
                        </Button>
                      </div>
                      <button type="button" onClick={() => setShowMobileSearch(false)} className="text-muted-foreground p-1">
                        <X className="h-4 w-4" />
                      </button>
                    </form>
                    <div className="relative">
                      <SuggestionDropdown />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          /* On non-home mobile: show a slim back-nav bar */
          <div className="md:hidden">
            <div className="container flex items-center h-11 gap-2">
              <button onClick={() => navigate(-1)} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-accent shrink-0">
                <X className="h-4 w-4" />
              </button>
              <button onClick={handleLogoClick} className="flex-1 flex items-center justify-center gap-1.5 bg-transparent border-0">
                <img src={logoData.url || '/favicon.ico'} alt={logoData.name} className="h-7 w-7 object-contain" loading="lazy" />
                <span className="font-semibold text-sm">{logoData.name || 'Store'}</span>
              </button>
              <Link to="/cart" className="relative flex items-center justify-center h-8 w-8 rounded-lg hover:bg-accent">
                <ShoppingCart className="h-4 w-4" />
                {cartCount > 0 && (
                  <Badge className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 flex items-center justify-center p-0 text-[8px] bg-primary text-primary-foreground">{cartCount}</Badge>
                )}
              </Link>
            </div>
          </div>
        )}

        {/* ── DESKTOP HEADER ── */}
        <div className="hidden md:block">
          {/* Main row: only on home page */}
          {isHome && (
            <div className="container py-3">
              <div className="flex items-center gap-3 md:gap-6">
                <button onClick={handleLogoClick} className="shrink-0 flex items-center gap-2 bg-transparent border-0 cursor-pointer select-none">
                  <img src={logoData.url || '/favicon.ico'} alt={logoData.name} className={logoData.size || 'h-12 w-12'} loading="lazy" />
                </button>

                <div className="hidden md:flex flex-1 max-w-xl relative items-center gap-2" ref={searchRef}>
                  <Button variant="outline" size="icon" className="shrink-0 h-10 w-10" onClick={() => navigate('/products')}>
                    <SlidersHorizontal className="h-4 w-4" />
                  </Button>
                  <form onSubmit={handleSearch} className="w-full flex relative">
                    <Input
                      placeholder="Search shoes, bags, brands..."
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
                      onFocus={() => setShowSuggestions(true)}
                      className="pr-10 bg-muted border-0 focus-visible:ring-primary"
                    />
                    <Button type="submit" size="icon" className="absolute right-0 top-0 h-full rounded-l-none">
                      <Search className="h-4 w-4" />
                    </Button>
                  </form>
                  <SuggestionDropdown />
                </div>

                <div className="flex items-center gap-1 md:gap-2 ml-auto">
                  <Link to="/cart">
                    <Button variant="ghost" size="icon" className="relative">
                      <ShoppingCart className="h-5 w-5" />
                      {cartCount > 0 && (
                        <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] bg-primary text-primary-foreground">{cartCount}</Badge>
                      )}
                    </Button>
                  </Link>
                  <Link to={user ? "/my-page" : "/login"}>
                    <Button variant="ghost" size="sm" className="gap-1">
                      <User className="h-4 w-4" />
                      {user ? (user.user_metadata?.full_name?.split(' ')[0] || 'Account') : 'Login'}
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Breadcrumb / Nav bar */}
          {isHome ? (
            /* Home page: subtle quick-links row with off-white background */
            <nav className="border-t bg-muted/30 backdrop-blur-sm">
              <div className="container">
                <div className="flex items-center gap-0.5 py-0.5">
                  {NAV_ITEMS.map(item => (
                    <Link key={item.path} to={item.path}
                      className={`px-3 py-2 text-sm font-medium transition-colors rounded-md ${
                        location.pathname === item.path
                          ? 'text-primary font-semibold'
                          : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                      }`}>
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            </nav>
          ) : (
            /* Non-home pages: breadcrumb nav with transparent/off-white background */
            <nav className="border-b bg-background/60 backdrop-blur-md">
              <div className="container">
                <div className="flex items-center gap-2 h-10">
                  {/* Logo on non-home desktop */}
                  <button onClick={handleLogoClick} className="flex items-center gap-2 bg-transparent border-0 cursor-pointer select-none mr-2 shrink-0">
                    <img src={logoData.url || '/favicon.ico'} alt={logoData.name} className="h-7 w-7 object-contain" loading="lazy" />
                    <span className="font-bold text-sm hidden lg:inline">{logoData.name || 'Store'}</span>
                  </button>

                  {/* Breadcrumb */}
                  <div className="flex items-center gap-1 text-sm flex-1 min-w-0">
                    <button
                      onClick={() => navigate(-1)}
                      className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 shrink-0 hover:bg-accent/50 px-2 py-1 rounded-md"
                    >
                      ← Back
                    </button>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                    <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
                      Home
                    </Link>
                    {location.pathname !== '/' && ROUTE_LABELS[location.pathname] && (
                      <>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                        <span className="text-foreground font-medium truncate">
                          {ROUTE_LABELS[location.pathname] || location.pathname.replace('/', '').replace(/-/g, ' ')}
                        </span>
                      </>
                    )}
                    {location.pathname !== '/' && !ROUTE_LABELS[location.pathname] && (
                      <>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                        <span className="text-foreground font-medium truncate capitalize">
                          {location.pathname.split('/').filter(Boolean).pop()?.replace(/-/g, ' ') || ''}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Cart + User (right side) */}
                  <div className="flex items-center gap-1 ml-auto shrink-0">
                    <Link to="/cart">
                      <Button variant="ghost" size="icon" className="relative h-8 w-8">
                        <ShoppingCart className="h-4 w-4" />
                        {cartCount > 0 && (
                          <Badge className="absolute -top-0.5 -right-0.5 h-4 w-4 flex items-center justify-center p-0 text-[9px] bg-primary text-primary-foreground">{cartCount}</Badge>
                        )}
                      </Button>
                    </Link>
                    <Link to={user ? "/my-page" : "/login"}>
                      <Button variant="ghost" size="sm" className="gap-1 h-8 text-xs">
                        <User className="h-3.5 w-3.5" />
                        {user ? (user.user_metadata?.full_name?.split(' ')[0] || 'Me') : 'Login'}
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </nav>
          )}
        </div>
      </header>

      {/* ── Mobile Slide-out Menu (home page only) ── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 w-72 bg-card shadow-2xl md:hidden flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b">
                <button onClick={handleLogoClick} className="flex items-center gap-2 bg-transparent border-0">
                  <img src={logoData.url || '/favicon.ico'} alt={logoData.name} className="h-9 w-9" loading="lazy" />
                  <span className="font-bold text-lg">{logoData.name || 'My Store'}</span>
                </button>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1 rounded hover:bg-accent">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {user && (
                <div className="px-4 py-3 border-b bg-accent/30">
                  <p className="text-sm font-semibold">{user.user_metadata?.full_name || 'My Account'}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              )}

              <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
                {NAV_ITEMS.map(item => (
                  <Link
                    key={item.path} to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      location.pathname === item.path
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-accent text-foreground'
                    }`}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                ))}
                <div className="pt-2 border-t mt-2">
                  <Link to="/products" onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-accent text-foreground">
                    <SlidersHorizontal className="h-4 w-4 shrink-0" />All Products
                  </Link>
                  <Link to="/wishlist" onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-accent text-foreground">
                    <Search className="h-4 w-4 shrink-0" />Wishlist
                  </Link>
                  <Link to={user ? '/my-page' : '/login'} onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-accent text-foreground">
                    <User className="h-4 w-4 shrink-0" />{user ? 'My Account' : 'Login / Signup'}
                  </Link>
                </div>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Master Password Dialog ── */}
      <Dialog open={masterPwOpen} onOpenChange={v => { if (!v) { setMasterPwOpen(false); setMasterPwInput(''); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Developer Access
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">Enter the master developer password to access the hidden dashboard.</p>
            <Input
              type="password"
              placeholder="Master password..."
              value={masterPwInput}
              onChange={e => setMasterPwInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleMasterPwSubmit(); }}
              autoFocus
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setMasterPwOpen(false); setMasterPwInput(''); }}>Cancel</Button>
              <Button className="flex-1 gap-2" onClick={handleMasterPwSubmit}>
                <Shield className="h-4 w-4" />Unlock
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Secret Developer Dashboard ── */}
      <SecretDevDashboard open={devDashOpen} onClose={() => setDevDashOpen(false)} />
    </>
  );
};

export default Header;
