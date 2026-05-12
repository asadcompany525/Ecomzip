import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import ProductCard from '@/components/home/ProductCard';
import BottomNav from '@/components/layout/BottomNav';
import PageBreadcrumb from '@/components/layout/PageBreadcrumb';
import { supabase } from '@/integrations/supabase/client';
import { mapDbProduct, PRODUCT_SELECT } from '@/lib/mapDbProduct';
import { Product } from '@/types/product';

const Cart = () => {
  const { items, removeFromCart, updateQuantity, clearCart, cartTotal } = useCart();
  const [suggestions, setSuggestions] = useState<Product[]>([]);

  useEffect(() => {
    supabase
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('is_active', true)
      .order('sold', { ascending: false })
      .limit(4)
      .then(({ data }) => setSuggestions((data || []).map(mapDbProduct)));
  }, []);

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <main className="container py-5">
          <PageBreadcrumb items={[{ label: 'Cart' }]} />
          <div className="py-16 text-center">
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-5">
              <ShoppingBag className="h-12 w-12 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
            <p className="text-muted-foreground mb-6">Add some products to get started</p>
            <Link to="/products"><Button size="lg" className="px-8">Browse Products</Button></Link>
          </div>

          {suggestions.length > 0 && (
            <div className="pb-10">
              <div className="flex items-center gap-2 mb-4">
                <Package className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold">Popular Right Now</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                {suggestions.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
              </div>
            </div>
          )}
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <main className="container py-5">
        <PageBreadcrumb items={[{ label: 'Cart' }]} />

        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl">
              <ShoppingBag className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Shopping Cart</h1>
              <p className="text-sm text-muted-foreground">{items.length} item{items.length !== 1 ? 's' : ''} · Rs. {cartTotal.toLocaleString()}</p>
            </div>
          </div>
          <Link to="/products">
            <Button variant="outline" size="sm" className="gap-1.5">Continue Shopping</Button>
          </Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-3">
            {items.map(item => (
              <div key={`${item.product.id}-${item.selectedSize}-${item.selectedColor}`}
                className="flex gap-4 bg-card rounded-xl border p-4 hover:shadow-sm transition-shadow">
                <Link to={`/product/${item.product.id}`} className="shrink-0">
                  <img
                    src={item.product.image}
                    alt={item.product.name}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover border"
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/product/${item.product.id}`}>
                    <h3 className="font-semibold text-sm sm:text-base line-clamp-2 hover:text-primary transition-colors">
                      {item.product.name}
                    </h3>
                  </Link>
                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                    {item.selectedSize && (
                      <span className="bg-muted px-2 py-0.5 rounded">Size: <b>{item.selectedSize}</b></span>
                    )}
                    {item.selectedColor && (
                      <span className="bg-muted px-2 py-0.5 rounded">Color: <b>{item.selectedColor}</b></span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-3 gap-2">
                    <div className="flex items-center border rounded-lg overflow-hidden">
                      <Button
                        variant="ghost" size="icon"
                        className="h-8 w-8 rounded-none hover:bg-muted"
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                      <Button
                        variant="ghost" size="icon"
                        className="h-8 w-8 rounded-none hover:bg-muted"
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <span className="font-bold text-primary text-base">
                      Rs. {(item.product.price * item.quantity).toLocaleString()}
                    </span>
                    <Button
                      variant="ghost" size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0"
                      onClick={() => removeFromCart(item.product.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            <Button
              variant="outline" size="sm"
              onClick={clearCart}
              className="text-destructive border-destructive/30 hover:bg-destructive/5"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Clear Cart
            </Button>
          </div>

          {/* Order Summary */}
          <div className="bg-card rounded-xl border p-6 h-fit sticky top-28 shadow-sm">
            <h3 className="font-bold text-lg mb-5">Order Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} items)</span>
                <span className="font-medium text-foreground">Rs. {cartTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Delivery</span>
                <span className="text-emerald-600 font-medium">Calculated at checkout</span>
              </div>
              <div className="border-t pt-3 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-primary">Rs. {cartTotal.toLocaleString()}</span>
              </div>
            </div>

            <Link to="/checkout">
              <Button className="w-full mt-6 h-12 text-base font-semibold gap-2">
                Proceed to Checkout <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>

            <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span>🔒 Secure checkout</span>
              <span>•</span>
              <span>📦 Fast delivery</span>
            </div>
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default Cart;
