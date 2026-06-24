import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Package, ShoppingCart, Users, TrendingUp, AlertTriangle, DollarSign, CreditCard, Star, RotateCcw, MessageSquare, Plus, Eye, CheckSquare, ArrowUpRight, ArrowDownRight, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AdminDateFilter from '@/components/admin/AdminDateFilter';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { format, subDays } from 'date-fns';

const QUICK_ACTIONS = [
  { label: 'Add Product', icon: Plus, path: '/admin/products', color: 'bg-blue-500' },
  { label: 'View Orders', icon: ShoppingCart, path: '/admin/orders', color: 'bg-green-500' },
  { label: 'AI Manager', icon: Zap, path: '/admin/ai-global-manager', color: 'bg-orange-500' },
  { label: 'Customers', icon: Users, path: '/admin/customers', color: 'bg-purple-500' },
  { label: 'Reviews', icon: Star, path: '/admin/reviews', color: 'bg-amber-500' },
  { label: 'Reports', icon: TrendingUp, path: '/admin/reports', color: 'bg-cyan-500' },
];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalProducts: 0, totalOrders: 0, totalCustomers: 0,
    pendingOrders: 0, lowStock: 0, revenue: 0,
    todayOnlinePayments: 0, todayOnlineAmount: 0,
    pendingReviews: 0, pendingReturns: 0, unreadChats: 0,
  });
  const [todayOrders, setTodayOrders] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [dateFilter, setDateFilter] = useState<Date | undefined>(new Date());
  const [rangeFilter, setRangeFilter] = useState('month');

  useEffect(() => {
    // Build 7-day revenue chart
    const buildChart = async () => {
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = subDays(new Date(), 6 - i);
        return { date: d, label: format(d, 'MMM d') };
      });
      const start = days[0].date; start.setHours(0, 0, 0, 0);
      const { data } = await supabase.from('orders').select('total, created_at').gte('created_at', start.toISOString());
      const byDay: Record<string, { revenue: number; orders: number }> = {};
      days.forEach(d => { byDay[d.label] = { revenue: 0, orders: 0 }; });
      (data || []).forEach((o: any) => {
        const label = format(new Date(o.created_at), 'MMM d');
        if (byDay[label]) { byDay[label].revenue += Number(o.total) || 0; byDay[label].orders += 1; }
      });
      setChartData(days.map(d => ({ name: d.label, ...byDay[d.label] })));
    };
    buildChart();
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      let startDate: Date;
      if (rangeFilter === 'today' && dateFilter) {
        startDate = new Date(dateFilter); startDate.setHours(0, 0, 0, 0);
      } else if (rangeFilter === 'week') { startDate = subDays(new Date(), 7); }
      else if (rangeFilter === 'month') { startDate = new Date(); startDate.setDate(1); startDate.setHours(0, 0, 0, 0); }
      else if (rangeFilter === '3months') { startDate = new Date(); startDate.setMonth(startDate.getMonth() - 3); }
      else if (rangeFilter === '6months') { startDate = new Date(); startDate.setMonth(startDate.getMonth() - 6); }
      else if (rangeFilter === 'year') { startDate = new Date(); startDate.setFullYear(startDate.getFullYear() - 1); }
      else { startDate = new Date(0); }
      const startISO = startDate.toISOString();
      let endDate: Date | null = null;
      if (rangeFilter === 'today' && dateFilter) {
        endDate = new Date(dateFilter); endDate.setHours(23, 59, 59, 999);
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
      const revenue = orders.reduce((s: number, o: any) => s + (Number(o.total) || 0), 0);
      const onlineOrders = orders.filter((o: any) => o.payment_method !== 'cod');
      const onlineAmount = onlineOrders.reduce((s: number, o: any) => s + (Number(o.total) || 0), 0);

      setStats({
        totalProducts: products.count || 0, totalOrders: orders.length,
        totalCustomers: customers.count || 0, pendingOrders: pending.count || 0,
        lowStock: lowStock.count || 0, revenue,
        todayOnlinePayments: onlineOrders.length, todayOnlineAmount: onlineAmount,
        pendingReviews: reviews.count || 0, pendingReturns: returns.count || 0,
        unreadChats: chats.count || 0,
      });
      setTodayOrders(onlineOrders);
    };
    fetchStats();
  }, [dateFilter, rangeFilter]);

  const kpiCards = [
    { icon: DollarSign, label: 'Revenue', value: `Rs. ${stats.revenue.toLocaleString()}`, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', trend: true, path: '/admin/reports' },
    { icon: ShoppingCart, label: 'Total Orders', value: stats.totalOrders, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', path: '/admin/orders' },
    { icon: Package, label: 'Products', value: stats.totalProducts, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200', path: '/admin/products' },
    { icon: Users, label: 'Customers', value: stats.totalCustomers, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', path: '/admin/customers' },
    { icon: TrendingUp, label: 'Pending Orders', value: stats.pendingOrders, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', alert: stats.pendingOrders > 5, path: '/admin/orders' },
    { icon: AlertTriangle, label: 'Low Stock', value: stats.lowStock, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', alert: stats.lowStock > 0, path: '/admin/stock-alerts' },
    { icon: CreditCard, label: 'Online Payments', value: `${stats.todayOnlinePayments}`, color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-200', sub: `Rs. ${stats.todayOnlineAmount.toLocaleString()}`, path: '/admin/payments' },
    { icon: Star, label: 'Pending Reviews', value: stats.pendingReviews, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', path: '/admin/reviews' },
    { icon: RotateCcw, label: 'Returns', value: stats.pendingReturns, color: 'text-pink-600', bg: 'bg-pink-50', border: 'border-pink-200', path: '/admin/claims-returns' },
    { icon: MessageSquare, label: 'Open Chats', value: stats.unreadChats, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200', alert: stats.unreadChats > 0, path: '/admin/chat' },
  ];

  const totalChartRevenue = chartData.reduce((s, d) => s + d.revenue, 0);
  const totalChartOrders = chartData.reduce((s, d) => s + d.orders, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Welcome back! Here's what's happening.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={rangeFilter} onValueChange={setRangeFilter}>
            <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="3months">Last 3 Months</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="year">Last Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          {rangeFilter === 'today' && <AdminDateFilter date={dateFilter} onDateChange={setDateFilter} />}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {QUICK_ACTIONS.map(action => (
          <Button key={action.label} variant="outline" className="h-auto flex flex-col gap-1.5 py-3 hover:shadow-md transition-shadow"
            onClick={() => navigate(action.path)}>
            <div className={`h-8 w-8 rounded-lg ${action.color} flex items-center justify-center`}>
              <action.icon className="h-4 w-4 text-white" />
            </div>
            <span className="text-xs font-medium">{action.label}</span>
          </Button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpiCards.map(card => (
          <Card key={card.label} onClick={() => navigate(card.path)} className={`border ${card.border} ${card.alert ? 'ring-2 ring-red-300 ring-offset-1' : ''} cursor-pointer hover:shadow-md transition-shadow group`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className={`h-9 w-9 rounded-xl ${card.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <card.icon className={`h-4.5 w-4.5 ${card.color}`} style={{ width: '18px', height: '18px' }} />
                </div>
                {card.alert && <Badge variant="destructive" className="text-[9px] px-1.5 py-0">!</Badge>}
              </div>
              <p className="text-[11px] text-muted-foreground font-medium">{card.label}</p>
              <p className="text-lg font-bold leading-tight">{card.value}</p>
              {card.sub && <p className="text-[10px] text-muted-foreground">{card.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Revenue — Last 7 Days</CardTitle>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-sm font-bold text-emerald-600">Rs. {totalChartRevenue.toLocaleString()}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => v >= 1000 ? `${Math.round(v / 1000)}k` : v} />
                <Tooltip formatter={(v: any) => [`Rs. ${Number(v).toLocaleString()}`, 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} fill="url(#revenueGrad)" dot={{ r: 3, fill: '#22c55e' }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Orders chart */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Orders — 7 Days</CardTitle>
              <Badge variant="secondary" className="text-xs">{totalChartOrders} total</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="orders" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Online Payments Table */}
      {todayOrders.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">💳 Online Payments ({todayOrders.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/30">
                  <th className="text-left py-2 px-3 text-xs font-semibold">Order #</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold">Method</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold">Amount</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold">Status</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold">Notes/TID</th>
                </tr></thead>
                <tbody>
                  {todayOrders.map(o => (
                    <tr key={o.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="py-2 px-3 font-mono text-xs font-medium">{o.order_number}</td>
                      <td className="py-2 px-3"><Badge variant="outline" className="text-xs">{o.payment_method}</Badge></td>
                      <td className="py-2 px-3 font-bold text-emerald-600">Rs. {Number(o.total).toLocaleString()}</td>
                      <td className="py-2 px-3"><Badge variant={o.payment_status === 'paid' ? 'default' : 'secondary'} className="text-xs">{o.payment_status}</Badge></td>
                      <td className="py-2 px-3 text-xs text-muted-foreground truncate max-w-[200px]">{o.notes || '—'}</td>
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
