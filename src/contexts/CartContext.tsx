// ============================================================
// CartContext — Cart aur Wishlist ka state poori app mein share karta hai
// Data localStorage mein save hota hai taake page reload pe bhi rahe
// ============================================================

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Product, CartItem } from '@/types/product';
import { toast } from '@/hooks/use-toast';

interface CartContextType {
  items: CartItem[];
  wishlist: Product[];
  addToCart: (product: Product, size?: string, color?: string) => void;
  removeFromCart: (productId: string, size?: string, color?: string) => void;
  updateQuantity: (productId: string, quantity: number, size?: string, color?: string) => void;
  clearCart: () => void;
  toggleWishlist: (product: Product) => void;
  isInWishlist: (productId: string) => boolean;
  cartTotal: number;   // PKR mein total amount
  cartCount: number;   // Total items (quantities ke saath)
}

const CartContext = createContext<CartContextType>({} as CartContextType);

export const useCart = () => useContext(CartContext);

// localStorage keys — version change karo agar data structure badlo
const CART_KEY = 'stopy_cart_v1';
const WISHLIST_KEY = 'stopy_wishlist_v1';

// localStorage se cart load karo (parse fail ho to empty array)
const loadCart = (): CartItem[] => {
  try {
    const saved = localStorage.getItem(CART_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

// localStorage se wishlist load karo
const loadWishlist = (): Product[] => {
  try {
    const saved = localStorage.getItem(WISHLIST_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>(loadCart);
  const [wishlist, setWishlist] = useState<Product[]>(loadWishlist);

  // Cart state badlne pe localStorage update karo
  useEffect(() => {
    try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch {}
  }, [items]);

  // Wishlist state badlne pe localStorage update karo
  useEffect(() => {
    try { localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist)); } catch {}
  }, [wishlist]);

  // Cart mein product add karo — agar same product+size+color pehle se hai to quantity badhao
  const addToCart = (product: Product, size?: string, color?: string) => {
    setItems(prev => {
      const existing = prev.find(
        i => i.product.id === product.id && i.selectedSize === size && i.selectedColor === color
      );
      if (existing) {
        return prev.map(i => i === existing ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product, quantity: 1, selectedSize: size, selectedColor: color }];
    });
    toast({ title: 'Added to cart', description: product.name });
  };

  // Cart se product remove karo — size/color bhi match karo taake sahi variant remove ho
  const removeFromCart = (productId: string, size?: string, color?: string) => {
    setItems(prev => prev.filter(
      i => !(i.product.id === productId && i.selectedSize === size && i.selectedColor === color)
    ));
  };

  // Quantity update karo — 0 ya 1 se kam ho to item remove ho jata hai
  const updateQuantity = (productId: string, quantity: number, size?: string, color?: string) => {
    if (quantity < 1) return removeFromCart(productId, size, color);
    setItems(prev => prev.map(
      i => (i.product.id === productId && i.selectedSize === size && i.selectedColor === color)
        ? { ...i, quantity }
        : i
    ));
  };

  // Poora cart clear karo (order place hone ke baad)
  const clearCart = () => {
    setItems([]);
    try { localStorage.removeItem(CART_KEY); } catch {}
  };

  // Wishlist mein add/remove toggle karo
  const toggleWishlist = (product: Product) => {
    setWishlist(prev => {
      const exists = prev.find(p => p.id === product.id);
      if (exists) {
        toast({ title: 'Removed from wishlist' });
        return prev.filter(p => p.id !== product.id);
      }
      toast({ title: 'Added to wishlist', description: product.name });
      return [...prev, product];
    });
  };

  const isInWishlist = (id: string) => wishlist.some(p => p.id === id);

  // PKR mein total cart value
  const cartTotal = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

  // Total items ginti (e.g. 2 shoes + 1 bag = 3)
  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{
      items, wishlist,
      addToCart, removeFromCart, updateQuantity, clearCart,
      toggleWishlist, isInWishlist,
      cartTotal, cartCount
    }}>
      {children}
    </CartContext.Provider>
  );
};
