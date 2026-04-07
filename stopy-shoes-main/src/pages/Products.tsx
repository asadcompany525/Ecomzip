import { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Filter, Grid3X3, List, SlidersHorizontal, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import ProductCard from '@/components/home/ProductCard';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import { Product } from '@/types/product';

const mapDbProduct = (p: any): Product => ({
  id: p.id, name: p.title, price: Number(p.price),
  originalPrice: p.original_price ? Number(p.original_price) : undefined,
  discount: p.discount_percent ? Number(p.discount_percent) : undefined,
  image: (p.images as any)?.[0] || '/placeholder.svg',
  images: (p.images as string[]) || [], category: p.category_id || '',
  brand: p.brand || '', colors: (p.colors as string[]) || [],
  sizes: (p.sizes as string[]) || [], rating: Number(p.rating) || 0,
  reviews: p.review_count || 0, stock: p.stock, sold: p.sold,
  isFlashSale: p.is_flash_sale, isTrending: p.is_featured,
  gender: p.gender as any, description: p.description, type: p.sub_category_id || '',
});

const Products = () => {
  const [searchParams] = useSearchParams();
  const initialCategory = searchParams.get('category') || '';
  const initialSearch = searchParams.get('search') || '';
  const initialFilter = searchParams.get('filter') || '';

  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [dbCategories, setDbCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedGender, setSelectedGender] = useState('');
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState([0, 50000]);
  const [sortBy, setSortBy] = useState('popular');
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      let query = supabase.from('products').select('*').eq('is_active', true);
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
  const allSizes = useMemo(() => [...new Set(allProducts.flatMap(p => (p.sizes || []).map((s: any) => String(s))))].sort(), [allProducts]);
  const allBrands = useMemo(() => [...new Set(allProducts.map(p => p.brand).filter(Boolean))], [allProducts]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const level1Cats = dbCategories.filter(c => c.level === 1);

  const filteredProducts = useMemo(() => {
    let result = allProducts.filter(p => {
      if (selectedCategory) {
        const cat = dbCategories.find(c => c.name === selectedCategory || c.id === selectedCategory);
        if (cat) {
          // Match main category, sub-category, or sub-sub category
          const catIds = [cat.id];
          // If level 1, include all sub/sub-sub categories
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
      if (selectedSizes.length && !p.sizes?.some((s: any) => selectedSizes.includes(String(s)))) return false;
      if (selectedBrands.length && !selectedBrands.includes(p.brand)) return false;
      if (p.price < priceRange[0] || p.price > priceRange[1]) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q);
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
  }, [allProducts, selectedCategory, selectedGender, selectedColors, selectedSizes, selectedBrands, priceRange, sortBy, searchQuery, dbCategories]);

  const popularProducts = useMemo(() => [...allProducts].sort((a, b) => (b.sold || 0) - (a.sold || 0)).slice(0, 8), [allProducts]);
  const toggleArray = (arr: string[], val: string) => arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val];
  const clearFilters = () => { setSelectedCategory(''); setSelectedGender(''); setSelectedColors([]); setSelectedSizes([]); setSelectedBrands([]); setPriceRange([0, 50000]); setSearchQuery(''); };
  const activeFilterCount = [selectedCategory, selectedGender, selectedColors.length > 0, selectedSizes.length > 0, selectedBrands.length > 0, priceRange[0] > 0 || priceRange[1] < 50000].filter(Boolean).length;

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
        <Slider min={0} max={50000} step={500} value={priceRange} onValueChange={setPriceRange} className="mb-2" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Rs. {priceRange[0].toLocaleString()}</span><span>Rs. {priceRange[1].toLocaleString()}</span>
        </div>
      </div>
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
      {allSizes.length > 0 && (
        <div>
          <h4 className="font-semibold mb-3 text-sm">Size</h4>
          <div className="flex flex-wrap gap-2">
            {allSizes.map(size => (
              <button key={size} onClick={() => setSelectedSizes(toggleArray(selectedSizes, size))}
                className={`w-10 h-10 rounded-lg text-xs font-medium border transition-colors ${selectedSizes.includes(size) ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary'}`}>{size}</button>
            ))}
          </div>
        </div>
      )}
      {allBrands.length > 0 && (
        <div>
          <h4 className="font-semibold mb-3 text-sm">Brand</h4>
          <div className="space-y-2">
            {allBrands.map(brand => (
              <label key={brand} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={selectedBrands.includes(brand)} onCheckedChange={() => setSelectedBrands(toggleArray(selectedBrands, brand))} />{brand}
              </label>
            ))}
          </div>
        </div>
      )}
      {activeFilterCount > 0 && <Button variant="outline" className="w-full" onClick={clearFilters}><X className="h-4 w-4 mr-2" /> Clear All Filters</Button>}
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Header />
      <main className="container py-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Link to="/" className="hover:text-primary">Home</Link><span>/</span>
          <span className="text-foreground">{selectedCategory || 'All Products'}</span>
        </div>

        {/* Search Bar with Filter */}
        <div className="flex items-center gap-2 mb-4">
          <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0 h-10 w-10 relative">
                <Filter className="h-4 w-4" />
                {activeFilterCount > 0 && <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]">{activeFilterCount}</Badge>}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="overflow-y-auto">
              <SheetHeader><SheetTitle>Filters</SheetTitle></SheetHeader>
              <div className="mt-4"><FilterContent /></div>
            </SheetContent>
          </Sheet>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search products..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
        </div>

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

            {activeFilterCount > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedCategory && <Badge variant="secondary" className="gap-1">{selectedCategory} <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedCategory('')} /></Badge>}
                {selectedGender && <Badge variant="secondary" className="gap-1 capitalize">{selectedGender} <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedGender('')} /></Badge>}
                {selectedColors.map(c => <Badge key={c} variant="secondary" className="gap-1">{c} <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedColors(selectedColors.filter(x => x !== c))} /></Badge>)}
                {selectedSizes.map(s => <Badge key={s} variant="secondary" className="gap-1">Size {s} <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedSizes(selectedSizes.filter(x => x !== s))} /></Badge>)}
              </div>
            )}

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
