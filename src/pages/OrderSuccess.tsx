import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, Package, Truck, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/layout/Header';

import BottomNav from '@/components/layout/BottomNav';

const OrderSuccess = () => {
  const { id } = useParams();
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    if (id) {
      supabase.from('orders').select('*').eq('id', id).single().then(({ data }) => setOrder(data));
    }
  }, [id]);

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Header />
      <main className="container py-10 text-center max-w-lg mx-auto">
        <CheckCircle2 className="h-20 w-20 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Order Placed Successfully! 🎉</h1>
        <p className="text-muted-foreground mb-6">Thank you for your order</p>

        {order && (
          <div className="bg-card rounded-xl border p-6 text-left space-y-3 mb-6">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Order Number</span><span className="font-bold">{order.order_number}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total</span><span className="font-bold text-primary">Rs. {Number(order.total).toLocaleString()}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Payment</span><span className="capitalize">{order.payment_method === 'cod' ? 'Cash on Delivery' : order.payment_method.replace('_', ' ')}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Status</span><span className="capitalize text-orange-500 font-medium">{order.status}</span></div>
            {order.barcode && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Barcode</span><span className="font-mono text-xs">{order.barcode}</span></div>}
          </div>
        )}

        <div className="flex gap-3">
          <Link to="/my-page" className="flex-1"><Button variant="outline" className="w-full">My Orders</Button></Link>
          <Link to="/" className="flex-1"><Button className="w-full">Continue Shopping</Button></Link>
        </div>
      </main>
      
      <BottomNav />
    </div>
  );
};

export default OrderSuccess;
