import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';


import BottomNav from '@/components/layout/BottomNav';
import PageBreadcrumb from '@/components/layout/PageBreadcrumb';
import ProductCard from '@/components/home/ProductCard';

const Wishlist = () => {
  const { wishlist } = useCart();

  if (wishlist.length === 0) {
    return (
      <div className="min-h-screen bg-background pb-16 md:pb-0">
        <main className="container py-5">
          <PageBreadcrumb items={[{ label: 'My Account', href: '/my-page' }, { label: 'Wishlist' }]} />
          <div className="py-16 text-center">
            <Heart className="h-20 w-20 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Your wishlist is empty</h2>
            <p className="text-muted-foreground mb-6">Save products you love for later</p>
            <Link to="/products"><Button size="lg">Browse Products</Button></Link>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      
      <main className="container py-5">
        <PageBreadcrumb items={[{ label: 'My Account', href: '/my-page' }, { label: 'Wishlist' }]} />
        <h1 className="text-2xl font-bold mb-6">My Wishlist ({wishlist.length})</h1>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
          {wishlist.map((product, i) => (
            <ProductCard key={product.id} product={product} index={i} />
          ))}
        </div>
      </main>
      
      <BottomNav />
    </div>
  );
};

export default Wishlist;
