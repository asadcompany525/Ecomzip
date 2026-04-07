import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Package, ShoppingCart, Users, TrendingUp, AlertTriangle, DollarSign, CreditCard, Star, RotateCcw, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AdminDateFilter from '@/components/admin/AdminDateFilter';
import { format } from 'date-fns';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalProducts: 0, totalOrders: 0, totalCustomers: 0,
    pendingOrders: 0, lowStock: 0, revenue: 0,
    todayOnlinePayments: 0, todayOnlineAmount: 0,
    pendingReviews: 0, pendingReturns: 0, unreadChats: 0,
  });
  const [todayOrders, setTodayOrders] = useState<any[]>([]);
  const [dateFilter, setDateFilter] = useState<Date | undefined>(new Date());
  const [rangeFilter, setRangeFilter] = useState('today');

  useEffect(() => {
    const fetchStats = async () => {
      let startDate: Date;
      if (rangeFilter === 'today' && dateFilter) {
        startDate = new Date(dateFilter);
        startDate.setHours(0, 0, 0, 0);
      } else if (rangeFilter === 'week') {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
      } else if (rangeFilter === 'month') {
        startDate = new Date();
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
      } else if (rangeFilter === '3months') {
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 3);
      } else if (rangeFilter === '6months') {
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 6);
      } else if (rangeFilter === 'year') {
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
      } else {
        startDate = new Date(0); // all time
      }
      const startISO = startDate.toISOString();
      
      let endDate: Date | null = null;
      if (rangeFilter === 'today' && dateFilter) {
        endDate = new Date(dateFilter);
        endDate.setHours(23, 59, 59, 999);
      }

      const [products, allOrders, customers, pending, lowStock, reviews, returns, chats] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }),
        endDate 
          ? supabase.from('orders').select('id, total, payment_method, payment_status, order_number, notes, status, created_at').gte('created_at', startISO).lte('created_at', endDate.toISOString())
          : supabase.from('orders').select('id, total, payment_method, payment_status, order_number, notes, status, created_at').gte('created_at', startISO),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('products').select('id', { count: 'exact', head: true }).lt('stock', 5),
        supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('is_approved', false),
        supabase.from('returns').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('chat_conversations').select('id', { count: 'exact', head: true }).eq('is_resolved', false),
      ]);

      const orders = allOrders.data || [];
      const revenue = orders.reduce((sum: number, o: any) => sum + (Number(o.total) || 0), 0);
      const onlineOrders = orders.filter(o => o.payment_method !== 'cod');
      const onlineAmount = onlineOrders.reduce((sum: number, o: any) => sum + (Number(o.total) || 0), 0);

      setStats({
        totalProducts: products.count || 0,
        totalOrders: orders.length,
        totalCustomers: customers.count || 0,
        pendingOrders: pending.count || 0,
        lowStock: lowStock.count || 0,
        revenue,
        todayOnlinePayments: onlineOrders.length,
        todayOnlineAmount: onlineAmount,
        pendingReviews: reviews.count || 0,
        pendingReturns: returns.count || 0,
        unreadChats: chats.count || 0,
      });
      setTodayOrders(onlineOrders);
    };
    fetchStats();
  }, [dateFilter, rangeFilter]);

  const cards = [
    { icon: Package, label: 'Total Products', value: stats.totalProducts, color: 'text-blue-500' },
    { icon: ShoppingCart, label: 'Orders', value: stats.totalOrders, color: 'text-green-500' },
    { icon: Users, label: 'Customers', value: stats.totalCustomers, color: 'text-purple-500' },
    { icon: TrendingUp, label: 'Pending Orders', value: stats.pendingOrders, color: 'text-orange-500' },
    { icon: AlertTriangle, label: 'Low Stock', value: stats.lowStock, color: 'text-red-500' },
    { icon: DollarSign, label: 'Revenue', value: `Rs. ${stats.revenue.toLocaleString()}`, color: 'text-emerald-500' },
    { icon: CreditCard, label: 'Online Payments', value: `${stats.todayOnlinePayments} (Rs. ${stats.todayOnlineAmount.toLocaleString()})`, color: 'text-indigo-500' },
    { icon: Star, label: 'Pending Reviews', value: stats.pendingReviews, color: 'text-yellow-500' },
    { icon: RotateCcw, label: 'Pending Returns', value: stats.pendingReturns, color: 'text-pink-500' },
    { icon: MessageSquare, label: 'Open Chats', value: stats.unreadChats, color: 'text-cyan-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Dashboard Overview</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={rangeFilter} onValueChange={setRangeFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Specific Date</SelectItem>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="3months">Last 3 Months</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="year">Last Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          {rangeFilter === 'today' && (
            <AdminDateFilter date={dateFilter} onDateChange={setDateFilter} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {cards.map(card => (
          <Card key={card.label}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className={`h-12 w-12 rounded-xl bg-muted flex items-center justify-center ${card.color}`}>
                  <card.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                  <p className="text-lg font-bold">{card.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {todayOrders.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">💳 Online Payments</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b">
                  <th className="text-left py-2">Order #</th>
                  <th className="text-left py-2">Method</th>
                  <th className="text-left py-2">Amount</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Notes/TID</th>
                </tr></thead>
                <tbody>
                  {todayOrders.map(o => (
                    <tr key={o.id} className="border-b">
                      <td className="py-2 font-medium">{o.order_number}</td>
                      <td className="py-2"><Badge variant="outline">{o.payment_method}</Badge></td>
                      <td className="py-2 font-bold">Rs. {Number(o.total).toLocaleString()}</td>
                      <td className="py-2"><Badge variant={o.payment_status === 'paid' ? 'default' : 'secondary'}>{o.payment_status}</Badge></td>
                      <td className="py-2 text-xs text-muted-foreground">{o.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminDashboard;
