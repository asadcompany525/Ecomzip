import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';
import { format, subDays } from 'date-fns';
import { BarChart3 } from 'lucide-react';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6'];
const STATUS_COLORS: Record<string, string> = {
  delivered: '#22c55e', pending: '#f59e0b', processing: '#8b5cf6',
  shipped: '#6366f1', confirmed: '#14b8a6', cancelled: '#ef4444',
};

const AdminReports = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'all'>('weekly');
  const [products, setProducts] = useState<any[]>([]);
  const [dailyData, setDailyData] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('products').select('id, title, sold, stock, price, images').order('sold', { ascending: false }).limit(10),
    ]).then(([{ data: ords }, { data: prods }]) => {
      setOrders(ords || []);
      setProducts(prods || []);
      // Build 14-day chart
      const days = Array.from({ length: 14 }, (_, i) => {
        const d = subDays(new Date(), 13 - i);
        return { label: format(d, 'MMM d'), date: d.toDateString(), revenue: 0, orders: 0 };
      });
      (ords || []).forEach((o: any) => {
        const ds = new Date(o.created_at).toDateString();
        const day = days.find(d => d.date === ds);
        if (day) { day.revenue += Number(o.total) || 0; day.orders += 1; }
      });
      setDailyData(days);
    });
  }, []);

  const now = new Date();
  const filterByPeriod = (o: any) => {
    const d = new Date(o.created_at);
    if (period === 'daily') return d.toDateString() === now.toDateString();
    if (period === 'weekly') { const w = subDays(now, 7); return d >= w; }
    if (period === 'monthly') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    return true;
  };

  const filtered = orders.filter(filterByPeriod);
  const totalRevenue = filtered.reduce((s, o) => s + Number(o.total || 0), 0);
  const codOrders = filtered.filter(o => o.payment_method === 'cod');
  const onlineOrders = filtered.filter(o => o.payment_method !== 'cod');
  const pending = filtered.filter(o => o.status === 'pending');
  const delivered = filtered.filter(o => o.status === 'delivered');
  const cancelled = filtered.filter(o => o.status === 'cancelled');
  const avgOrderValue = filtered.length > 0 ? Math.round(totalRevenue / filtered.length) : 0;

  // Status distribution for pie chart
  const statusMap: Record<string, number> = {};
  filtered.forEach(o => { statusMap[o.status] = (statusMap[o.status] || 0) + 1; });
  const statusData = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

  // Payment method breakdown
  const methodCounts: Record<string, number> = {};
  filtered.forEach(o => { methodCounts[o.payment_method] = (methodCounts[o.payment_method] || 0) + 1; });
  const methodData = Object.entries(methodCounts).map(([name, value]) => ({ name: name.toUpperCase(), value }));

  const kpis = [
    { label: 'Total Orders', value: filtered.length, color: 'text-blue-600 bg-blue-50' },
    { label: 'Revenue', value: `Rs. ${totalRevenue.toLocaleString()}`, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Avg Order Value', value: `Rs. ${avgOrderValue.toLocaleString()}`, color: 'text-indigo-600 bg-indigo-50' },
    { label: 'COD Orders', value: codOrders.length, color: 'text-orange-600 bg-orange-50' },
    { label: 'Online Payments', value: onlineOrders.length, color: 'text-cyan-600 bg-cyan-50' },
    { label: 'Pending', value: pending.length, color: 'text-yellow-600 bg-yellow-50' },
    { label: 'Delivered', value: delivered.length, color: 'text-green-600 bg-green-50' },
    { label: 'Cancelled', value: cancelled.length, color: 'text-red-600 bg-red-50' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-xl"><BarChart3 className="h-5 w-5 text-purple-600" /></div>
          <div>
            <h2 className="text-xl font-bold">Sales Reports</h2>
            <p className="text-sm text-muted-foreground">{orders.length} total orders · Rs. {orders.reduce((s, o) => s + Number(o.total || 0), 0).toLocaleString()} lifetime</p>
          </div>
        </div>
        <div className="flex gap-2">
          {(['daily', 'weekly', 'monthly', 'all'] as const).map(p => (
            <Button key={p} size="sm" variant={period === p ? 'default' : 'outline'} onClick={() => setPeriod(p)} className="capitalize text-xs h-8">
              {p === 'all' ? 'All Time' : p === 'daily' ? 'Today' : p === 'weekly' ? '7 Days' : 'Month'}
            </Button>
          ))}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpis.map(k => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <p className="text-[11px] text-muted-foreground font-medium">{k.label}</p>
              <p className={`text-xl font-bold mt-0.5 ${k.color.split(' ')[0]}`}>{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Revenue — Last 14 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={dailyData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={2} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => v >= 1000 ? `${Math.round(v/1000)}k` : v} />
                <Tooltip formatter={(v: any) => [`Rs. ${Number(v).toLocaleString()}`, 'Revenue']} />
                <Line type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Daily Orders Bar */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Orders — Last 14 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dailyData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={2} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="orders" fill="#6366f1" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Order Status Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Order Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${Math.round(percent*100)}%`} labelLine={false}>
                    {statusData.map((entry, i) => <Cell key={i} fill={STATUS_COLORS[entry.name] || COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">No orders in this period</div>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Payment Methods</CardTitle>
          </CardHeader>
          <CardContent>
            {methodData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={methodData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} label={{ position: 'top', fontSize: 11 }} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">No data</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">🏆 Top Selling Products</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/30">
                <th className="text-left p-3 text-xs">#</th>
                <th className="text-left p-3 text-xs">Product</th>
                <th className="text-left p-3 text-xs">Price</th>
                <th className="text-left p-3 text-xs">Sold</th>
                <th className="text-left p-3 text-xs">Stock</th>
                <th className="text-left p-3 text-xs">Revenue</th>
              </tr></thead>
              <tbody>
                {products.map((p, i) => (
                  <tr key={p.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-bold text-muted-foreground">#{i + 1}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <img src={(p.images as string[])?.[0] || '/placeholder.svg'} alt="" className="w-8 h-8 rounded-lg object-cover border" />
                        <span className="font-medium text-xs line-clamp-1 max-w-[140px]">{p.title}</span>
                      </div>
                    </td>
                    <td className="p-3 text-xs">Rs. {Number(p.price).toLocaleString()}</td>
                    <td className="p-3"><Badge variant="secondary" className="text-xs">{p.sold || 0}</Badge></td>
                    <td className="p-3">
                      <Badge variant={p.stock <= 5 ? 'destructive' : 'outline'} className="text-xs">{p.stock}</Badge>
                    </td>
                    <td className="p-3 text-xs font-semibold text-emerald-600">
                      Rs. {((p.sold || 0) * Number(p.price)).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr><td colSpan={6} className="text-center p-8 text-muted-foreground">No products found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminReports;
