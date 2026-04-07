import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, ShoppingCart, Heart, User, SlidersHorizontal, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

const NAV_ITEMS = [
  { label: 'Home', path: '/' },
  { label: 'New Arrivals', path: '/new-arrivals' },
  { label: 'Discount Items', path: '/discount-items' },
  { label: 'Flash Sale', path: '/flash-sale' },
  { label: 'My Page', path: '/my-page' },
];

const Header = () => {
  const { cartCount } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [logoData, setLogoData] = useState({ url: '/favicon.ico', name: 'Stopy Shoes', size: 'h-12 w-12' });
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('searchHistory') || '[]'); } catch { return []; }
  });
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    const load = async () => {
      const { data: prods } = await supabase.from('products').select('id, title, price, images, brand, category_id').eq('is_active', true).limit(100);
      setProducts(prods || []);
      const { data: settings } = await supabase.from('site_settings').select('*').eq('key', 'logo').maybeSingle();
      if (settings?.value) setLogoData(settings.value as any);
    };
    load();
  }, []);

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
    }
  };

  const selectSuggestion = (name: string) => {
    setSearchQuery(name);
    setShowSuggestions(false);
    navigate(`/products?search=${encodeURIComponent(name)}`);
  };

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('searchHistory');
  };

  const canGoBack = location.key !== 'default';

  return (
    <header className="sticky top-0 z-50 bg-card shadow-sm">
      {/* Top bar - only on home page */}
      {location.pathname === '/' && (
        <div className="bg-primary text-primary-foreground">
          <div className="container flex items-center justify-between py-1.5 text-xs md:text-sm">
            <span>Pakistan's #1 Shoes & Bags Store</span>
            <Link to="/contact" className="hover:opacity-80 transition-opacity">Help & Support</Link>
          </div>
        </div>
      )}

      {/* Main header */}
      <div className="container py-3">
        <div className="flex items-center gap-3 md:gap-6">
          {canGoBack && (
            <button className="md:hidden" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}

          <Link to="/" className="shrink-0 flex items-center gap-2">
            <img src={logoData.url || '/favicon.ico'} alt={logoData.name} className={logoData.size || 'h-12 w-12'} />
          </Link>

          {/* Desktop search */}
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
                        <img src={(p.images as any)?.[0] || '/placeholder.svg'} alt="" className="w-10 h-10 rounded object-cover" />
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
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 md:gap-2 ml-auto">
            <Link to="/wishlist">
              <Button variant="ghost" size="icon" className="relative"><Heart className="h-5 w-5" /></Button>
            </Link>
            <Link to="/cart">
              <Button variant="ghost" size="icon" className="relative">
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] bg-primary text-primary-foreground">{cartCount}</Badge>
                )}
              </Button>
            </Link>
            <Link to={user ? "/my-page" : "/login"}>
              <Button variant="ghost" size="sm" className="hidden md:flex gap-1">
                <User className="h-4 w-4" />
                {user ? (user.user_metadata?.full_name?.split(' ')[0] || 'Account') : 'Login'}
              </Button>
              <Button variant="ghost" size="icon" className="md:hidden"><User className="h-5 w-5" /></Button>
            </Link>
          </div>
        </div>

        {/* Mobile search - flex-nowrap to prevent wrapping */}
        <div className="md:hidden mt-3 flex gap-2 items-center flex-nowrap">
          <Button variant="outline" size="icon" className="shrink-0 h-9 w-9" onClick={() => navigate('/products')}>
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
          <form onSubmit={handleSearch} className="flex-1 min-w-0 relative">
            <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pr-9 bg-muted border-0 h-9 text-sm" />
            <Button type="submit" size="icon" variant="ghost" className="absolute right-0 top-0 h-full w-9">
              <Search className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>

      {/* Desktop Nav */}
      <nav className="hidden md:block border-t bg-card">
        <div className="container">
          <div className="flex items-center gap-1">
            {NAV_ITEMS.map(item => (
              <Link key={item.path} to={item.path}
                className={`px-4 py-2.5 text-sm font-medium transition-colors ${location.pathname === item.path ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-primary'}`}>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;
