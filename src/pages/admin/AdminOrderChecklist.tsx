import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Printer, Download } from 'lucide-react';

const AdminOrderChecklist = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [dateFilter, setDateFilter] = useState('today');
  const [methodFilter, setMethodFilter] = useState('all');

  useEffect(() => {
    const fetch = async () => {
      let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
      
      if (dateFilter === 'today') {
        const today = new Date(); today.setHours(0,0,0,0);
        query = query.gte('created_at', today.toISOString());
      } else if (dateFilter === 'week') {
        const w = new Date(); w.setDate(w.getDate() - 7);
        query = query.gte('created_at', w.toISOString());
      }
      
      if (methodFilter !== 'all') query = query.eq('payment_method', methodFilter as any);
      
      const { data } = await query;
      setOrders(data || []);

      if (data && data.length > 0) {
        const { data: items } = await supabase.from('order_items').select('*').in('order_id', data.map(o => o.id));
        setOrderItems(items || []);
      }
    };
    fetch();
  }, [dateFilter, methodFilter]);

  const getItems = (orderId: string) => orderItems.filter(i => i.order_id === orderId);

  const printChecklist = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    const rows = orders.map(o => {
      const items = getItems(o.id);
      const addr = o.address_snapshot as any;
      return `<tr>
        <td><input type="checkbox"/></td>
        <td>${o.order_number}</td>
        <td>${items.map(i => `${i.title} (${i.size||'-'} / ${i.color||'-'} x${i.quantity})`).join('<br/>')}</td>
        <td>Rs.${Number(o.total).toLocaleString()}</td>
        <td>${o.payment_method}</td>
        <td>${addr?.fullName || addr?.full_name || '-'}<br/>${addr?.phone || '-'}<br/>${addr?.city || '-'}</td>
        <td>${o.status}</td>
      </tr>`;
    }).join('');

    win.document.write(`<!DOCTYPE html><html><head><title>Order Checklist</title>
      <style>*{font-family:sans-serif;margin:0}body{padding:15px}h1{font-size:16px;margin-bottom:10px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:5px;font-size:11px;text-align:left}th{background:#f0f0f0}input[type=checkbox]{width:16px;height:16px}@media print{body{padding:5px}}</style>
    </head><body>
      <h1>📋 Order Checklist — ${dateFilter === 'today' ? 'Today' : dateFilter === 'week' ? 'This Week' : 'All'} ${methodFilter !== 'all' ? '| ' + methodFilter.toUpperCase() : ''}</h1>
      <p style="font-size:11px;margin-bottom:8px">Generated: ${new Date().toLocaleString()} | Total: ${orders.length} orders | Amount: Rs.${orders.reduce((s,o)=>s+Number(o.total),0).toLocaleString()}</p>
      <table><thead><tr><th>✓</th><th>Order#</th><th>Items</th><th>Total</th><th>Payment</th><th>Customer</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody></table>
    </body></html>`);
    win.document.close(); win.print();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-xl"><Printer className="h-5 w-5 text-blue-600" /></div>
          <div>
            <h2 className="text-xl font-bold">Order Checklist</h2>
            <p className="text-sm text-muted-foreground">Print packing slips and delivery checklists for fulfilment</p>
          </div>
        </div>
        <Button onClick={printChecklist} className="gap-1"><Printer className="h-4 w-4" /> Print / Download</Button>
      </div>

      <div className="flex gap-2">
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
        <Select value={methodFilter} onValueChange={setMethodFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payment</SelectItem>
            <SelectItem value="cod">COD</SelectItem>
            <SelectItem value="jazzcash">JazzCash</SelectItem>
            <SelectItem value="easypaisa">EasyPaisa</SelectItem>
            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-card border rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground">Orders</p>
          <p className="text-xl font-bold">{orders.length}</p>
        </div>
        <div className="bg-card border rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground">Total Amount</p>
          <p className="text-xl font-bold">Rs. {orders.reduce((s,o) => s + Number(o.total), 0).toLocaleString()}</p>
        </div>
        <div className="bg-card border rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground">Pending</p>
          <p className="text-xl font-bold text-yellow-600">{orders.filter(o => o.status === 'pending').length}</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50">
            <th className="p-3 w-8">✓</th>
            <th className="text-left p-3">Order #</th>
            <th className="text-left p-3">Items</th>
            <th className="text-left p-3">Total</th>
            <th className="text-left p-3">Payment</th>
            <th className="text-left p-3">Customer</th>
            <th className="text-left p-3">Status</th>
          </tr></thead>
          <tbody>
            {orders.map(o => {
              const items = getItems(o.id);
              const addr = o.address_snapshot as any;
              return (
                <tr key={o.id} className="border-b hover:bg-accent/50">
                  <td className="p-3"><input type="checkbox" className="w-4 h-4" /></td>
                  <td className="p-3 font-mono text-xs">{o.order_number}</td>
                  <td className="p-3 text-xs">
                    {items.map(i => <div key={i.id}>{i.title} ({i.size||'-'}/{i.color||'-'} x{i.quantity})</div>)}
                  </td>
                  <td className="p-3 font-medium">Rs. {Number(o.total).toLocaleString()}</td>
                  <td className="p-3 text-xs">{o.payment_method}</td>
                  <td className="p-3 text-xs">{addr?.fullName || addr?.full_name || '-'}<br/>{addr?.phone || '-'}</td>
                  <td className="p-3 text-xs capitalize">{o.status}</td>
                </tr>
              );
            })}
            {orders.length === 0 && <tr><td colSpan={7} className="text-center p-8 text-muted-foreground">No orders found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminOrderChecklist;
