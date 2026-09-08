import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, Grid3X3, List, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import ProductCard from '@/components/home/ProductCard';
import BottomNav from '@/components/layout/BottomNav';
import PageBreadcrumb from '@/components/layout/PageBreadcrumb';
import { Product } from '@/types/product';
import { mapDbProduct, PRODUCT_SELECT } from '@/lib/mapDbProduct';

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCategory = searchParams.get('category') || '';
  const initialSearch = searchParams.get('search') || '';
  const initialFilter = searchParams.get('filter') || '';
  const initialSort = searchParams.get('sort') === 'best-sellers' ? 'popular' : searchParams.get('sort') || 'popular';
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [dbCategories, setDbCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedGender, setSelectedGender] = useState('');
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState([0, 50000]);
  const [sortBy, setSortBy] = useState(initialSort);
  const [searchQuery, setSearchQuery] = useState(initialSearch);

  // Keep searchQuery in sync when URL params change (e.g. user searches from header)
  useEffect(() => {
    setSearchQuery(searchParams.get('search') || '');
  }, [searchParams]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      let query = supabase.from('products').select(PRODUCT_SELECT).eq('is_active', true);
      if (initialFilter === 'flash-sale') query = query.eq('is_flash_sale', true);
      const { data: products } = await query.order('created_at', { ascending: false });
      setAllProducts((products || []).map(mapDbProduct));
      const { data: cats } = await supabase.from('categories').select('*').eq('is_active', true).order('sort_order');
      setDbCategories(cats || []);
      setLoading(false);
    };
    fetchData();
  }, [initialFilter]);

  const allColors = useMemo(() => [...new Set(allProducts.flatMap(p => {
    if (Array.isArray(p.colors)) return p.colors.map((c: any) => typeof c === 'object' ? c.name : c).filter(Boolean);
    return [];
  }))], [allProducts]);
  const level1Cats = dbCategories.filter(c => c.level === 1);

  const filteredProducts = useMemo(() => {
    let result = allProducts.filter(p => {
      if (selectedCategory) {
        const cat = dbCategories.find(c => c.name === selectedCategory || c.id === selectedCategory);
        if (cat) {
          const catIds = [cat.id];
          if (cat.level === 1) {
            const l2 = dbCategories.filter(c => c.level === 2 && c.parent_id === cat.id);
            l2.forEach(c2 => { catIds.push(c2.id); dbCategories.filter(c => c.level === 3 && c.parent_id === c2.id).forEach(c3 => catIds.push(c3.id)); });
          } else if (cat.level === 2) {
            dbCategories.filter(c => c.level === 3 && c.parent_id === cat.id).forEach(c3 => catIds.push(c3.id));
          }
          if (!catIds.includes(p.category)) return false;
        }
      }
      if (selectedGender && p.gender !== selectedGender) return false;
      if (selectedColors.length) {
        const pColors = (p.colors || []).map((c: any) => typeof c === 'object' ? c.name : c);
        if (!pColors.some((c: string) => selectedColors.includes(c))) return false;
      }
      if (selectedSizes.length) {
        const pSizes = Array.isArray(p.sizes) ? p.sizes.map(String) : [];
        if (!pSizes.some((s: string) => selectedSizes.includes(s))) return false;
      }
      if (p.price < priceRange[0] || p.price > priceRange[1]) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const pTags = Array.isArray((p as any).tags) ? (p as any).tags : [];
        const code = (pTags[0] || '').toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          code.includes(q) ||
          (p.description || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
    switch (sortBy) {
      case 'price-low': result.sort((a, b) => a.price - b.price); break;
      case 'price-high': result.sort((a, b) => b.price - a.price); break;
      case 'rating': result.sort((a, b) => b.rating - a.rating); break;
      case 'discount': result.sort((a, b) => (b.discount || 0) - (a.discount || 0)); break;
      default: result.sort((a, b) => (b.sold || 0) - (a.sold || 0));
    }
    return result;
  }, [allProducts, selectedCategory, selectedGender, selectedColors, priceRange, sortBy, searchQuery, dbCategories]);

  // Log search queries to Supabase for admin analytics
  useEffect(() => {
    if (!searchQuery.trim()) return;
    const timeout = setTimeout(async () => {
      try {
        await supabase.from('search_logs').insert({
          query: searchQuery.trim(),
          results_count: filteredProducts.length,
          user_id: (await supabase.auth.getUser()).data.user?.id ?? null,
        } as any);
      } catch {}
    }, 1500);
    return () => clearTimeout(timeout);
  }, [searchQuery, filteredProducts.length]);

  const popularProducts = useMemo(() => [...allProducts].sort((a, b) => (b.sold || 0) - (a.sold || 0)).slice(0, 8), [allProducts]);
  const toggleArray = (arr: string[], val: string) => arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val];
  const allSizes = useMemo(() => {
    const sizes = new Set<string>();
    allProducts.forEach(p => {
      if (Array.isArray(p.sizes)) p.sizes.forEach((s: any) => sizes.add(String(s)));
    });
    return [...sizes].sort((a, b) => {
      const na = Number(a), nb = Number(b);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a.localeCompare(b);
    });
  }, [allProducts]);

  const clearFilters = () => { setSelectedCategory(''); setSelectedGender(''); setSelectedColors([]); setSelectedSizes([]); setPriceRange([0, 50000]); setSearchQuery(''); };
  const activeFilterCount = [selectedCategory, selectedGender, selectedColors.length > 0, selectedSizes.length > 0, priceRange[0] > 0 || priceRange[1] < 50000].filter(Boolean).length;

  const level2All = dbCategories.filter(c => c.level === 2);
  const level3All = dbCategories.filter(c => c.level === 3);

  const FilterContent = () => (
    <div className="space-y-6">
      <div>
        <h4 className="font-semibold mb-3 text-sm">Category</h4>
        <div className="space-y-1">
          {level1Cats.map(cat => {
            const subs = level2All.filter(s => s.parent_id === cat.id);
            return (
              <div key={cat.id}>
                <button onClick={() => setSelectedCategory(selectedCategory === cat.name ? '' : cat.name)}
                  className={`flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${selectedCategory === cat.name ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
                  {cat.name}
                </button>
                {subs.length > 0 && (
                  <div className="pl-4 space-y-0.5">
                    {subs.map(sub => {
                      const subSubs = level3All.filter(ss => ss.parent_id === sub.id);
                      return (
                        <div key={sub.id}>
                          <button onClick={() => setSelectedCategory(selectedCategory === sub.name ? '' : sub.name)}
                            className={`w-full text-left px-3 py-1.5 rounded text-xs transition-colors ${selectedCategory === sub.name ? 'bg-primary/80 text-primary-foreground' : 'hover:bg-muted text-muted-foreground'}`}>
                            {sub.name}
                          </button>
                          {subSubs.length > 0 && (
                            <div className="pl-4 space-y-0.5">
                              {subSubs.map(ss => (
                                <button key={ss.id} onClick={() => setSelectedCategory(selectedCategory === ss.name ? '' : ss.name)}
                                  className={`w-full text-left px-3 py-1 rounded text-[11px] transition-colors ${selectedCategory === ss.name ? 'bg-primary/60 text-primary-foreground' : 'hover:bg-muted text-muted-foreground'}`}>
                                  {ss.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div>
        <h4 className="font-semibold mb-3 text-sm">Gender</h4>
        <div className="flex flex-wrap gap-2">
          {['men', 'women', 'kids', 'unisex'].map(g => (
            <Badge key={g} variant={selectedGender === g ? 'default' : 'outline'} className="cursor-pointer capitalize" onClick={() => setSelectedGender(selectedGender === g ? '' : g)}>{g}</Badge>
          ))}
        </div>
      </div>
      <div>
        <h4 className="font-semibold mb-3 text-sm">Price Range</h4>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">Min (Rs.)</label>
            <Input
              type="number"
              min={0}
              max={priceRange[1]}
              step={100}
              value={priceRange[0]}
              onChange={e => {
                const val = Math.max(0, Math.min(Number(e.target.value), priceRange[1]));
                setPriceRange([val, priceRange[1]]);
              }}
              className="h-8 text-sm"
              placeholder="0"
            />
          </div>
          <span className="text-muted-foreground pt-5 text-xs">—</span>
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">Max (Rs.)</label>
            <Input
              type="number"
              min={priceRange[0]}
              max={50000}
              step={100}
              value={priceRange[1]}
              onChange={e => {
                const val = Math.max(priceRange[0], Math.min(Number(e.target.value), 50000));
                setPriceRange([priceRange[0], val]);
              }}
              className="h-8 text-sm"
              placeholder="50000"
            />
          </div>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
          <span>Selected: Rs. {priceRange[0].toLocaleString()} – Rs. {priceRange[1].toLocaleString()}</span>
        </div>
      </div>
      {allSizes.length > 0 && (
        <div>
          <h4 className="font-semibold mb-3 text-sm">Size</h4>
          <div className="flex flex-wrap gap-2">
            {allSizes.map(size => (
              <button key={size} onClick={() => setSelectedSizes(toggleArray(selectedSizes, size))}
                className={`px-3 py-1.5 rounded-lg text-xs border font-medium transition-all ${selectedSizes.includes(size) ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary'}`}>{size}</button>
            ))}
          </div>
        </div>
      )}
      {allColors.length > 0 && (
        <div>
          <h4 className="font-semibold mb-3 text-sm">Color</h4>
          <div className="flex flex-wrap gap-2">
            {allColors.map(color => (
              <button key={color} onClick={() => setSelectedColors(toggleArray(selectedColors, color))}
                className={`px-3 py-1.5 rounded-full text-xs border transition-all ${selectedColors.includes(color) ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary'}`}>{color}</button>
            ))}
          </div>
        </div>
      )}
      {activeFilterCount > 0 && <Button variant="outline" className="w-full" onClick={clearFilters}><X className="h-4 w-4 mr-2" /> Clear All Filters</Button>}
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <main className="container py-5">
        <PageBreadcrumb items={[{ label: 'All Products' }]} />

        {/* Unified Search + Filter bar */}
        <form
          className="flex items-center mb-4 rounded-xl border bg-background shadow-sm overflow-hidden"
          onSubmit={e => { e.preventDefault(); if (searchQuery.trim()) setSearchParams(p => { p.set('search', searchQuery); return p; }); }}
        >
          {/* Filter trigger embedded left */}
          <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 h-11 shrink-0 border-r text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Filters</span>
                {activeFilterCount > 0 && (
                  <Badge className="h-4 w-4 p-0 flex items-center justify-center text-[10px]">{activeFilterCount}</Badge>
                )}
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="overflow-y-auto">
              <SheetHeader><SheetTitle>Filters</SheetTitle></SheetHeader>
              {activeFilterCount > 0 && (
                <button onClick={clearFilters} className="mt-2 text-xs text-primary hover:underline">
                  Clear all filters
                </button>
              )}
              <div className="mt-4"><FilterContent /></div>
            </SheetContent>
          </Sheet>

          {/* Search input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); if (!e.target.value.trim()) setSearchParams(p => { p.delete('search'); return p; }); }}
              placeholder="Search by name, brand, code..."
              className="w-full h-11 pl-9 pr-8 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {searchQuery && (
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                onClick={() => { setSearchQuery(''); setSearchParams(p => { p.delete('search'); return p; }); }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Search submit button embedded right */}
          <button
            type="submit"
            className="flex items-center justify-center h-11 w-11 shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Search className="h-4 w-4" />
          </button>
        </form>

        {/* Active filter chips */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-2 mb-3 -mt-1">
            {selectedCategory && <Badge variant="secondary" className="gap-1">{selectedCategory} <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedCategory('')} /></Badge>}
            {selectedGender && <Badge variant="secondary" className="gap-1 capitalize">{selectedGender} <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedGender('')} /></Badge>}
            {selectedColors.map(c => <Badge key={c} variant="secondary" className="gap-1">{c} <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedColors(selectedColors.filter(x => x !== c))} /></Badge>)}
            {selectedSizes.map(s => <Badge key={s} variant="secondary" className="gap-1">Size {s} <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedSizes(selectedSizes.filter(x => x !== s))} /></Badge>)}
            <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-destructive transition-colors">Clear all</button>
          </div>
        )}

        <div>
          <div>
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <p className="text-sm text-muted-foreground">
                {loading ? 'Loading...' : <><strong className="text-foreground">{filteredProducts.length}</strong> products found</>}
              </p>
              <div className="flex items-center gap-2">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40 h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="popular">Most Popular</SelectItem>
                    <SelectItem value="price-low">Price: Low to High</SelectItem>
                    <SelectItem value="price-high">Price: High to Low</SelectItem>
                    <SelectItem value="rating">Top Rated</SelectItem>
                    <SelectItem value="discount">Biggest Discount</SelectItem>
                  </SelectContent>
                </Select>
                <div className="hidden sm:flex border rounded-lg">
                  <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" className="h-9 w-9" onClick={() => setViewMode('grid')}><Grid3X3 className="h-4 w-4" /></Button>
                  <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" className="h-9 w-9" onClick={() => setViewMode('list')}><List className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-20"><p className="text-muted-foreground">Loading products...</p></div>
            ) : filteredProducts.length > 0 ? (
              <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4' : 'space-y-3'}>
                {filteredProducts.map((product, i) => <ProductCard key={product.id} product={product} index={i} />)}
              </div>
            ) : (
              <div>
                <div className="text-center py-10">
                  <p className="text-4xl mb-4">🔍</p>
                  <h3 className="font-bold text-lg mb-2">No products found</h3>
                  <p className="text-muted-foreground mb-4">Try adjusting your filters</p>
                  <Button onClick={clearFilters}>Clear Filters</Button>
                </div>
                {popularProducts.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-xl font-bold mb-4">🔥 Popular Products You Might Like</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                      {popularProducts.map((product, i) => <ProductCard key={product.id} product={product} index={i} />)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default Products;
