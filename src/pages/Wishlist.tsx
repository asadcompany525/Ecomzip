import { Link } from 'react-router-dom';
import { Heart, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import BottomNav from '@/components/layout/BottomNav';
import PageBreadcrumb from '@/components/layout/PageBreadcrumb';
import ProductCard from '@/components/home/ProductCard';

const Wishlist = () => {
  const { wishlist } = useCart();

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <main className="container py-5">
        <PageBreadcrumb items={[{ label: 'My Account', href: '/my-page' }, { label: 'Wishlist' }]} />

        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-pink-100 rounded-xl">
              <Heart className="h-6 w-6 text-pink-600 fill-pink-200" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">My Wishlist</h1>
              <p className="text-muted-foreground text-sm">{wishlist.length} saved {wishlist.length === 1 ? 'item' : 'items'}</p>
            </div>
          </div>
          {wishlist.length > 0 && (
            <Link to="/products">
              <Button variant="outline" size="sm" className="gap-2">
                <ShoppingBag className="h-4 w-4" /> Continue Shopping
              </Button>
            </Link>
          )}
        </div>

        {wishlist.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-24 h-24 bg-pink-50 border border-pink-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <Heart className="h-12 w-12 text-pink-300" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Nothing saved yet</h2>
            <p className="text-muted-foreground mb-6">Tap the heart on any product to save it here</p>
            <Link to="/products">
              <Button size="lg" className="px-8">Browse Products</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
            {wishlist.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default Wishlist;
