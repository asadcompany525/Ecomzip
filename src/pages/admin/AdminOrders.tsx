import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Eye, Printer, ScanLine } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700', confirmed: 'bg-blue-100 text-blue-700',
  processing: 'bg-purple-100 text-purple-700', shipped: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-green-100 text-green-700', received: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700', returned: 'bg-orange-100 text-orange-700',
};

const AdminOrders = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [showSlip, setShowSlip] = useState(false);
  const [scanMode, setScanMode] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const [receipt, setReceipt] = useState<any>({ shop_name: 'E COMMERCE', tagline: "Pakistan's #1 Online Store", contact_line: '', footer_line: 'Thank you!', website: '' });
  const slipRef = useRef<HTMLDivElement>(null);

  const fetchOrders = async () => {
    let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (statusFilter !== 'all') query = query.eq('status', statusFilter as any);
    if (paymentFilter !== 'all') query = query.eq('payment_method', paymentFilter as any);
    const { data } = await query;
    let result = data || [];

    // Date filter
    if (dateFilter === 'today') {
      const today = new Date(); today.setHours(0,0,0,0);
      result = result.filter(o => new Date(o.created_at) >= today);
    } else if (dateFilter === 'week') {
      const w = new Date(); w.setDate(w.getDate() - 7);
      result = result.filter(o => new Date(o.created_at) >= w);
    } else if (dateFilter === 'month') {
      const m = new Date(); m.setDate(1); m.setHours(0,0,0,0);
      result = result.filter(o => new Date(o.created_at) >= m);
    }
    setOrders(result);
  };

  useEffect(() => { fetchOrders(); }, [statusFilter, paymentFilter, dateFilter]);

  // Load receipt settings
  useEffect(() => {
    supabase.from('site_settings').select('*').eq('key', 'receipt').maybeSingle().then(({ data }) => {
      if (data) setReceipt(data.value);
    });
  }, []);

  const viewOrder = async (order: any) => {
    setSelectedOrder(order);
    const { data } = await supabase.from('order_items').select('*').eq('order_id', order.id);
    setOrderItems(data || []);
  };

  const updateStatus = async (orderId: string, status: string) => {
    await supabase.from('orders').update({ status: status as any }).eq('id', orderId);
    toast({ title: `Order ${status}` });
    fetchOrders();
    if (selectedOrder?.id === orderId) setSelectedOrder((o: any) => ({ ...o, status }));
  };

  const updatePaymentStatus = async (orderId: string, ps: string) => {
    await supabase.from('orders').update({ payment_status: ps as any }).eq('id', orderId);
    toast({ title: `Payment ${ps}` });
    if (selectedOrder?.id === orderId) setSelectedOrder((o: any) => ({ ...o, payment_status: ps }));
  };

  const updateTracking = async (orderId: string, trackingId: string) => {
    await supabase.from('orders').update({ tracking_id: trackingId }).eq('id', orderId);
    toast({ title: 'Tracking updated' });
    setSelectedOrder((o: any) => ({ ...o, tracking_id: trackingId }));
  };

  const handleScan = () => {
    if (!scanInput.trim()) return;
    const found = orders.find(o => o.barcode === scanInput.trim() || o.order_number === scanInput.trim());
    if (found) { viewOrder(found); setScanMode(false); setScanInput(''); }
    else toast({ title: 'Not found', variant: 'destructive' });
  };

  const printSlip = () => {
    const content = slipRef.current;
    if (!content) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Slip - ${selectedOrder?.order_number}</title>
      <style>*{margin:0;padding:0;box-sizing:border-box;font-family:'Segoe UI',sans-serif}body{padding:20px}.slip{max-width:400px;margin:0 auto;border:2px solid #000;padding:16px}.header{text-align:center;border-bottom:2px dashed #000;padding-bottom:12px;margin-bottom:12px}.header h1{font-size:18px}.header p{font-size:11px;color:#666}.barcode{text-align:center;margin:12px 0;font-family:monospace;font-size:14px;letter-spacing:3px;padding:8px;border:1px solid #ccc;background:#f9f9f9}.info{font-size:12px;margin-bottom:8px}.info div{display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px dotted #ddd}.info div span:first-child{font-weight:600}.items{margin:12px 0}.items h3{font-size:13px;font-weight:600;border-bottom:1px solid #000;padding-bottom:4px;margin-bottom:8px}.item{font-size:11px;padding:4px 0;border-bottom:1px dotted #eee;display:flex;justify-content:space-between}.address{font-size:11px;background:#f5f5f5;padding:8px;border-radius:4px;margin:8px 0}.address h4{font-size:12px;font-weight:600;margin-bottom:4px}.total{text-align:right;font-size:14px;font-weight:700;border-top:2px solid #000;padding-top:8px;margin-top:8px}.footer{text-align:center;font-size:10px;color:#999;margin-top:12px;border-top:1px dashed #ccc;padding-top:8px}@media print{body{padding:0}.slip{border:none}}</style>
    </head><body>${content.innerHTML}</body></html>`);
    win.document.close(); win.print();
  };

  const addr = selectedOrder?.address_snapshot as any;

  // Extract payment proof from notes
  const getPaymentProof = (order: any) => {
    const notes = order?.notes || '';
    const match = notes.match(/Payment Proof: (https?:\/\/[^\s]+)/);
    return match?.[1];
  };

  const filtered = orders.filter(o =>
    o.order_number?.toLowerCase().includes(search.toLowerCase()) ||
    o.tracking_id?.toLowerCase().includes(search.toLowerCase()) ||
    o.barcode?.toLowerCase().includes(search.toLowerCase())
  );

  // Stats
  const totalAmount = filtered.reduce((s, o) => s + Number(o.total || 0), 0);
  const codCount = filtered.filter(o => o.payment_method === 'cod').length;
  const onlineCount = filtered.filter(o => o.payment_method !== 'cod').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-100 rounded-xl">
          <Eye className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold">All Orders</h2>
          <p className="text-sm text-muted-foreground">{filtered.length} orders · Rs. {totalAmount.toLocaleString()} total</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-center">
          <p className="text-xs text-indigo-600 font-medium">Total Orders</p>
          <p className="text-2xl font-bold text-indigo-700">{filtered.length}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
          <p className="text-xs text-emerald-600 font-medium">Revenue</p>
          <p className="text-xl font-bold text-emerald-700">Rs. {totalAmount.toLocaleString()}</p>
        </div>
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 text-center">
          <p className="text-xs text-orange-600 font-medium">COD</p>
          <p className="text-2xl font-bold text-orange-700">{codCount}</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
          <p className="text-xs text-blue-600 font-medium">Online</p>
          <p className="text-2xl font-bold text-blue-700">{onlineCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Button variant="outline" onClick={() => setScanMode(true)} className="gap-2">
          <ScanLine className="h-4 w-4" /> Scan
        </Button>
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {['pending','confirmed','processing','shipped','delivered','cancelled','returned'].map(s => (
              <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payment</SelectItem>
            {['cod','bank_transfer','jazzcash','easypaisa','stripe'].map(p => (
              <SelectItem key={p} value={p}>{p.toUpperCase()}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/40">
            <th className="text-left p-3 text-xs font-semibold">Order #</th>
            <th className="text-left p-3 text-xs font-semibold">Date</th>
            <th className="text-left p-3 text-xs font-semibold">Total</th>
            <th className="text-left p-3 text-xs font-semibold">Payment</th>
            <th className="text-left p-3 text-xs font-semibold">Pay Status</th>
            <th className="text-left p-3 text-xs font-semibold">Status</th>
            <th className="text-left p-3 text-xs font-semibold">Actions</th>
          </tr></thead>
          <tbody>
            {filtered.map(o => (
              <tr key={o.id} className="border-b hover:bg-muted/30 transition-colors">
                <td className="p-3 font-mono text-xs font-bold">{o.order_number}</td>
                <td className="p-3 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString('en-PK', { day: '2-digit', month: 'short' })}</td>
                <td className="p-3 font-bold text-emerald-700">Rs. {Number(o.total).toLocaleString()}</td>
                <td className="p-3"><Badge variant="outline" className="text-xs uppercase">{o.payment_method?.replace('_', ' ')}</Badge></td>
                <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${o.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{o.payment_status}</span></td>
                <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[o.status] || 'bg-muted text-muted-foreground'}`}>{o.status}</span></td>
                <td className="p-3">
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => viewOrder(o)}><Eye className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => { viewOrder(o); setTimeout(() => setShowSlip(true), 300); }}><Printer className="h-4 w-4" /></Button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} className="text-center p-8 text-muted-foreground">No orders</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Scan Dialog */}
      <Dialog open={scanMode} onOpenChange={setScanMode}>
        <DialogContent>
          <DialogHeader><DialogTitle>📦 Barcode Scanner</DialogTitle></DialogHeader>
          <div className="flex gap-2">
            <Input value={scanInput} onChange={e => setScanInput(e.target.value)} placeholder="Scan barcode..." autoFocus onKeyDown={e => e.key === 'Enter' && handleScan()} />
            <Button onClick={handleScan}>Find</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder && !showSlip} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Order {selectedOrder?.order_number}</DialogTitle></DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Status:</span> <Badge>{selectedOrder.status}</Badge></div>
                <div><span className="text-muted-foreground">Payment:</span> {selectedOrder.payment_method}</div>
                <div><span className="text-muted-foreground">Pay Status:</span> <Badge variant={selectedOrder.payment_status === 'paid' ? 'default' : 'secondary'}>{selectedOrder.payment_status}</Badge></div>
                <div><span className="text-muted-foreground">Total:</span> Rs. {Number(selectedOrder.total).toLocaleString()}</div>
              </div>

              {/* Payment Proof */}
              {getPaymentProof(selectedOrder) && (
                <div>
                  <p className="font-medium text-sm mb-1">💳 Payment Proof:</p>
                  <a href={getPaymentProof(selectedOrder)} target="_blank" rel="noopener">
                    <img src={getPaymentProof(selectedOrder)} alt="Proof" className="max-w-[200px] rounded-lg border" />
                  </a>
                </div>
              )}

              {addr && (
                <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                  <p className="font-semibold">📍 Address</p>
                  <p>{addr.full_name || addr.fullName} | {addr.phone}</p>
                  {(addr.whatsapp) && <p>WhatsApp: {addr.whatsapp}</p>}
                  {(addr.email) && <p>Email: {addr.email}</p>}
                  <p>{addr.full_address || addr.fullAddress}, {addr.area}, {addr.city}, {addr.province}</p>
                </div>
              )}

              {orderItems.length > 0 && (
                <div>
                  <p className="font-medium mb-2">Items:</p>
                  {orderItems.map(item => (
                    <div key={item.id} className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg mb-1">
                      <img src={item.image || '/placeholder.svg'} alt="" className="w-10 h-10 rounded object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.size} · {item.color} · Qty: {item.quantity}</p>
                      </div>
                      <p className="text-sm font-medium">Rs. {Number(item.price).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Tracking */}
              <div>
                <p className="font-medium mb-1 text-sm">Tracking:</p>
                <div className="flex gap-2">
                  <Input value={selectedOrder.tracking_id || ''} onChange={e => setSelectedOrder((o: any) => ({ ...o, tracking_id: e.target.value }))} placeholder="TCS/Leopards..." />
                  <Button size="sm" onClick={() => updateTracking(selectedOrder.id, selectedOrder.tracking_id || '')}>Save</Button>
                </div>
              </div>

              {/* Status Update */}
              <div>
                <p className="font-medium mb-1 text-sm">Order Status:</p>
                <div className="flex gap-2 flex-wrap">
                  {['confirmed','processing','shipped','delivered','cancelled'].map(s => (
                    <Button key={s} size="sm" variant={selectedOrder.status === s ? 'default' : 'outline'} onClick={() => updateStatus(selectedOrder.id, s)} className="capitalize">{s}</Button>
                  ))}
                </div>
              </div>

              {/* Payment Status */}
              <div>
                <p className="font-medium mb-1 text-sm">Payment Status:</p>
                <div className="flex gap-2 flex-wrap">
                  {['pending','paid','failed','refunded'].map(s => (
                    <Button key={s} size="sm" variant={selectedOrder.payment_status === s ? 'default' : 'outline'} onClick={() => updatePaymentStatus(selectedOrder.id, s)} className="capitalize">{s}</Button>
                  ))}
                </div>
              </div>

              <Button className="w-full gap-2" onClick={() => setShowSlip(true)}><Printer className="h-4 w-4" /> Print Slip</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Shipping Slip Dialog */}
      <Dialog open={showSlip} onOpenChange={setShowSlip}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Shipping Slip</DialogTitle></DialogHeader>
          <div ref={slipRef}>
            <div className="slip">
              <div className="header">
                <div style={{textAlign:'center',marginBottom:'8px'}}><img src="/favicon.ico" alt="Logo" style={{width:'40px',height:'40px',margin:'0 auto'}} /></div>
                <h1>{receipt.shop_name}</h1>
                <p>{receipt.tagline}</p>
                <p>{receipt.contact_line}</p>
              </div>
              <div className="barcode">
                <div className="barcode-lines">
                  {(selectedOrder?.barcode || '').split('').map((_: string, i: number) => (
                    <span key={i} style={{ height: `${20 + (i % 3) * 8}px`, display: 'inline-block', width: '2px', background: '#000' }} />
                  ))}
                </div>
                {selectedOrder?.barcode}
              </div>
              <div className="info">
                <div><span>Order #:</span><span>{selectedOrder?.order_number}</span></div>
                <div><span>Date:</span><span>{selectedOrder ? new Date(selectedOrder.created_at).toLocaleDateString() : ''}</span></div>
                <div><span>Payment:</span><span>{selectedOrder?.payment_method?.toUpperCase()}</span></div>
                {selectedOrder?.tracking_id && <div><span>Tracking:</span><span>{selectedOrder.tracking_id}</span></div>}
              </div>
              {addr && (
                <div className="address">
                  <h4>📍 Ship To:</h4>
                  <p><strong>{addr.full_name || addr.fullName}</strong></p>
                  <p>📞 {addr.phone}</p>
                  <p>{addr.full_address || addr.fullAddress}, {addr.area}, {addr.city}, {addr.province}</p>
                </div>
              )}
              <div className="items">
                <h3>Items ({orderItems.length})</h3>
                {orderItems.map(item => (
                  <div key={item.id} className="item"><span>{item.title} ({item.size}/{item.color}) x{item.quantity}</span><span>Rs. {Number(item.price).toLocaleString()}</span></div>
                ))}
              </div>
              <div className="total">Total: Rs. {Number(selectedOrder?.total || 0).toLocaleString()}</div>
              <div className="footer">
                <p>{receipt.footer_line}</p>
                <p>{receipt.website}</p>
                {receipt.links && Array.isArray(receipt.links) && receipt.links.map((link: any, i: number) => (
                  <p key={i}><a href={link.url} style={{color:'#FF6B00',textDecoration:'underline'}}>{link.label}</a></p>
                ))}
              </div>
            </div>
          </div>
          <Button onClick={printSlip} className="w-full gap-2 mt-2"><Printer className="h-4 w-4" /> Print</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminOrders;
