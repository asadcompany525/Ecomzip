import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Shield, AlertTriangle, CheckCircle, XCircle, Search, RefreshCw, Ban, Phone, MapPin, Package, Wifi, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const BLACKLIST_PHONES = ['03000000000', '03111111111', '03333333333'];
const BLACKLIST_EMAILS = ['test@test.com', 'fake@fake.com'];

interface FraudCheck {
  orderId: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  address: string;
  total: number;
  items: number;
  riskScore: number;
  flags: string[];
  status: 'safe' | 'suspicious' | 'high-risk';
}

export default function AdminAiFraudDetector() {
  const [orders, setOrders] = useState<any[]>([]);
  const [checks, setChecks] = useState<FraudCheck[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [blacklistPhone, setBlacklistPhone] = useState('');
  const [blacklistPhones, setBlacklistPhones] = useState<string[]>(BLACKLIST_PHONES);
  const [tab, setTab] = useState<'scan' | 'blacklist' | 'manual'>('scan');
  const [manualOrder, setManualOrder] = useState('');
  const [manualResult, setManualResult] = useState<any>(null);
  const [manualLoading, setManualLoading] = useState(false);

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(count)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(50);
    setOrders(data || []);
    setLoading(false);
  };

  const analyzeOrders = async () => {
    setAnalyzing(true);
    const results: FraudCheck[] = orders.map(o => {
      const flags: string[] = [];
      let riskScore = 0;
      const snap = o.address_snapshot || {};
      const phone = snap.phone || '';
      const address = snap.full_address || snap.area || '';
      const name = snap.full_name || 'Unknown';

      if (blacklistPhones.includes(phone.replace(/\s/g, ''))) { flags.push('Blacklisted phone'); riskScore += 40; }
      if (phone.length < 10 || !/^03\d{9}$/.test(phone.replace(/\s/g, ''))) { flags.push('Invalid phone format'); riskScore += 20; }
      if (address.length < 15) { flags.push('Short/incomplete address'); riskScore += 25; }
      if (o.total > 50000) { flags.push('Unusually large order'); riskScore += 15; }
      if (o.payment_method === 'cod' && o.total > 30000) { flags.push('High-value COD'); riskScore += 10; }
      if (!snap.email && !snap.whatsapp) { flags.push('No contact info'); riskScore += 15; }
      const hour = new Date(o.created_at).getHours();
      if (hour >= 1 && hour <= 4) { flags.push('Placed at odd hours'); riskScore += 10; }

      const status: FraudCheck['status'] = riskScore >= 60 ? 'high-risk' : riskScore >= 30 ? 'suspicious' : 'safe';
      return { orderId: o.id, orderNumber: o.order_number, customerName: name, phone, address, total: o.total, items: o.order_items?.[0]?.count || 0, riskScore, flags, status };
    });
    setChecks(results);
    setAnalyzing(false);
    const highRisk = results.filter(r => r.status === 'high-risk').length;
    const suspicious = results.filter(r => r.status === 'suspicious').length;
    toast({ title: `Scan Complete`, description: `${highRisk} high-risk, ${suspicious} suspicious orders found` });
  };

  const analyzeManual = async () => {
    if (!manualOrder.trim()) return;
    setManualLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          type: 'fraud-check',
          messages: [{
            role: 'user',
            content: `You are a fraud detection AI for Stopy Shoes Pakistan e-commerce.
Analyze this order and detect fraud signals:

${manualOrder}

Blacklisted phones: ${blacklistPhones.join(', ')}

Return JSON only:
{
  "riskScore": 0-100,
  "verdict": "safe|suspicious|high-risk",
  "flags": ["flag1", "flag2"],
  "recommendation": "Brief action recommendation",
  "explanation": "2-3 sentence explanation"
}`
          }]
        }
      });
      if (error) throw error;
      let parsed = data;
      if (typeof data === 'string') { const m = data.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); }
      setManualResult(parsed);
    } catch (e: any) {
      toast({ title: 'Analysis failed', description: e.message, variant: 'destructive' });
    }
    setManualLoading(false);
  };

  const flagColor = (status: string) => status === 'high-risk' ? 'destructive' : status === 'suspicious' ? 'warning' : 'secondary';
  const highRiskCount = checks.filter(c => c.status === 'high-risk').length;
  const suspiciousCount = checks.filter(c => c.status === 'suspicious').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-red-100 rounded-lg"><Shield className="h-6 w-6 text-red-600" /></div>
        <div><h1 className="text-2xl font-bold">AI Fraud Detector</h1><p className="text-muted-foreground text-sm">Scan pending orders for fraud signals automatically</p></div>
      </div>

      {checks.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Safe Orders', count: checks.filter(c => c.status === 'safe').length, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Suspicious', count: suspiciousCount, color: 'text-yellow-600', bg: 'bg-yellow-50' },
            { label: 'High Risk', count: highRiskCount, color: 'text-red-600', bg: 'bg-red-50' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl p-4 text-center`}>
              <p className={`text-3xl font-bold ${s.color}`}>{s.count}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 border-b">
        {[['scan', 'Auto Scan'], ['blacklist', 'Blacklist'], ['manual', 'Manual Check']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id as any)}
            className={`pb-2 px-3 text-sm font-medium border-b-2 transition-colors ${tab === id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'scan' && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <Button onClick={fetchOrders} variant="outline" disabled={loading}><RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />Refresh Orders</Button>
            <Button onClick={analyzeOrders} disabled={analyzing || orders.length === 0} className="bg-red-600 hover:bg-red-700 text-white">
              {analyzing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Scanning...</> : <><Shield className="h-4 w-4 mr-2" />Scan {orders.length} Pending Orders</>}
            </Button>
          </div>

          {checks.length > 0 && (
            <div className="space-y-3">
              {checks.sort((a, b) => b.riskScore - a.riskScore).map(c => (
                <div key={c.orderId} className={`border rounded-xl p-4 ${c.status === 'high-risk' ? 'border-red-200 bg-red-50/50' : c.status === 'suspicious' ? 'border-yellow-200 bg-yellow-50/50' : 'border-green-200 bg-green-50/50'}`}>
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{c.orderNumber}</span>
                        <Badge variant={flagColor(c.status) as any}>{c.status.toUpperCase()}</Badge>
                        <span className="text-sm text-muted-foreground">Risk: {c.riskScore}/100</span>
                      </div>
                      <p className="text-sm mt-1"><span className="font-medium">{c.customerName}</span> · {c.phone}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><MapPin className="h-3 w-3" />{c.address || 'No address'}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Rs. {c.total.toLocaleString()} · {c.items} items</p>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      {c.status === 'high-risk' ? <XCircle className="h-5 w-5 text-red-500" /> : c.status === 'suspicious' ? <AlertTriangle className="h-5 w-5 text-yellow-500" /> : <CheckCircle className="h-5 w-5 text-green-500" />}
                    </div>
                  </div>
                  {c.flags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {c.flags.map((f, i) => <span key={i} className="text-xs bg-white border rounded-full px-2 py-0.5 text-red-700">{f}</span>)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'blacklist' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input placeholder="03XX XXXXXXX" value={blacklistPhone} onChange={e => setBlacklistPhone(e.target.value)} className="max-w-xs" />
            <Button onClick={() => { if (blacklistPhone.trim()) { setBlacklistPhones([...blacklistPhones, blacklistPhone.trim()]); setBlacklistPhone(''); toast({ title: 'Phone added to blacklist' }); } }}>
              <Ban className="h-4 w-4 mr-2" />Add to Blacklist
            </Button>
          </div>
          <div className="space-y-2">
            {blacklistPhones.map((p, i) => (
              <div key={i} className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-red-600" /><span className="font-mono text-sm">{p}</span></div>
                <button onClick={() => setBlacklistPhones(blacklistPhones.filter((_, j) => j !== i))} className="text-red-600 hover:text-red-800 text-xs">Remove</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'manual' && (
        <div className="space-y-4">
          <div>
            <Label>Paste Order Details</Label>
            <Textarea rows={8} placeholder="Name: Ahmed Ali&#10;Phone: 03001234567&#10;Address: 123 Main St, Lahore&#10;Total: Rs. 15000&#10;Payment: COD&#10;Items: 3" value={manualOrder} onChange={e => setManualOrder(e.target.value)} className="mt-1 font-mono text-sm" />
          </div>
          <Button onClick={analyzeManual} disabled={manualLoading || !manualOrder.trim()}>
            {manualLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analyzing...</> : <><Search className="h-4 w-4 mr-2" />Analyze with AI</>}
          </Button>
          {manualResult && (
            <div className={`border rounded-xl p-5 space-y-3 ${manualResult.verdict === 'high-risk' ? 'border-red-300 bg-red-50' : manualResult.verdict === 'suspicious' ? 'border-yellow-300 bg-yellow-50' : 'border-green-300 bg-green-50'}`}>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold">{manualResult.riskScore}/100</span>
                <Badge variant={flagColor(manualResult.verdict) as any} className="text-sm">{manualResult.verdict?.toUpperCase()}</Badge>
              </div>
              <p className="text-sm font-medium">{manualResult.recommendation}</p>
              <p className="text-sm text-muted-foreground">{manualResult.explanation}</p>
              {manualResult.flags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {manualResult.flags.map((f: string, i: number) => <span key={i} className="text-xs bg-white border rounded-full px-2 py-0.5">{f}</span>)}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
