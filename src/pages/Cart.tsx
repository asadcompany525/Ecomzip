import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { products } from '@/data/demo-data';
import ProductCard from '@/components/home/ProductCard';


import BottomNav from '@/components/layout/BottomNav';
import PageBreadcrumb from '@/components/layout/PageBreadcrumb';

const Cart = () => {
  const { items, removeFromCart, updateQuantity, clearCart, cartTotal } = useCart();
  const popularProducts = [...products].sort((a, b) => (b.sold || 0) - (a.sold || 0)).slice(0, 4);

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background pb-16 md:pb-0">
        
        <div className="container py-20 text-center">
          <ShoppingBag className="h-20 w-20 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
          <p className="text-muted-foreground mb-6">Add some products to get started</p>
          <Link to="/products"><Button size="lg">Shop Now</Button></Link>
        </div>
        {/* Show popular products in empty cart */}
        <div className="container pb-10">
          <h3 className="text-xl font-bold mb-4">🔥 You Might Like</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {popularProducts.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        </div>
        
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      
      <main className="container py-5">
        <PageBreadcrumb items={[{ label: 'Cart' }]} />
        <h1 className="text-2xl font-bold mb-6">Shopping Cart ({items.length})</h1>
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            {items.map(item => (
              <div key={item.product.id} className="flex gap-4 bg-card rounded-xl border p-4">
                <Link to={`/product/${item.product.id}`} className="shrink-0">
                  <img src={item.product.image} alt={item.product.name} className="w-24 h-24 rounded-lg object-cover" />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/product/${item.product.id}`}>
                    <h3 className="font-semibold text-sm line-clamp-2 hover:text-primary transition-colors">{item.product.name}</h3>
                  </Link>
                  <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                    {item.selectedSize && <span>Size: {item.selectedSize}</span>}
                    {item.selectedColor && <span>Color: {item.selectedColor}</span>}
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center border rounded-lg">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.product.id, item.quantity - 1)}><Minus className="h-3 w-3" /></Button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.product.id, item.quantity + 1)}><Plus className="h-3 w-3" /></Button>
                    </div>
                    <span className="font-bold text-primary">Rs. {(item.product.price * item.quantity).toLocaleString()}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeFromCart(item.product.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={clearCart} className="text-destructive">Clear Cart</Button>
          </div>

          <div className="bg-card rounded-xl border p-6 h-fit sticky top-28">
            <h3 className="font-bold text-lg mb-4">Order Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>Rs. {cartTotal.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span>Calculated at checkout</span></div>
              <div className="border-t pt-3 flex justify-between font-bold text-base">
                <span>Total</span>
                <span className="text-primary">Rs. {cartTotal.toLocaleString()}</span>
              </div>
            </div>
            <Link to="/checkout">
              <Button className="w-full mt-6 h-12 text-base font-semibold">
                Proceed to Checkout <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </main>
      
      <BottomNav />
    </div>
  );
};

export default Cart;
