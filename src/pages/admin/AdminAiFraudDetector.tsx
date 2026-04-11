import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Shield, AlertTriangle, CheckCircle, XCircle, Search, RefreshCw, Ban, Phone, MapPin, Loader2, Siren, Bot, Fingerprint } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const DEFAULT_BLACKLIST = [
  '03000000000','03111111111','03222222222','03333333333',
  '03444444444','03555555555','03666666666','03777777777',
  '03888888888','03999999999','1234567890','00000000000',
];

const GIBBERISH_PATTERNS = [
  /^(.)\1{4,}$/,
  /^[asdfghjkl]{4,}$/i,
  /^[qwertyuiop]{4,}$/i,
  /^[zxcvbnm]{4,}$/i,
  /^[.!@#$%^&*]{3,}$/,
  /^(abc|xyz|test|dummy|fake|na|n\/a|xxx|aaaa|bbbb)/i,
  /^[\d\s]{1,8}$/,
];

function isGibberish(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  for (const pat of GIBBERISH_PATTERNS) { if (pat.test(t)) return true; }
  const unique = new Set(t.toLowerCase().replace(/\s/g, '')).size;
  if (t.length > 4 && unique <= 2) return true;
  return false;
}

function phoneRiskLevel(raw: string): { flags: string[]; score: number } {
  const phone = raw.replace(/\s|-/g, '');
  const flags: string[] = [];
  let score = 0;

  if (phone.length !== 11) { flags.push(`Wrong length (${phone.length} digits, need 11)`); score += 35; }
  if (/^(.)\1{10}$/.test(phone)) { flags.push('All same digits – clearly fake'); score += 60; }
  if (/^0(1234567890|9876543210|1111|2222|3333|4444|5555|6666|7777|8888|9999)/.test(phone)) { flags.push('Sequential/patterned number'); score += 40; }
  if (DEFAULT_BLACKLIST.includes(phone)) { flags.push('Blacklisted number'); score += 60; }
  if (!/^03\d{9}$/.test(phone)) { flags.push('Not a valid PK mobile (must start 03XXXXXXXXX)'); score += 25; }

  return { flags, score };
}

function addressRiskLevel(addr: string): { flags: string[]; score: number } {
  const flags: string[] = [];
  let score = 0;
  const clean = addr.trim();

  if (clean.length < 15) { flags.push(`Too short (${clean.length} chars, min 15)`); score += 35; }
  if (isGibberish(clean)) { flags.push('Gibberish/random characters detected'); score += 50; }
  if (/^[a-z]{1,3}$/i.test(clean)) { flags.push('Single word / initials only'); score += 45; }

  return { flags, score };
}

interface FraudCheck {
  orderId: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  address: string;
  email: string;
  ip?: string;
  total: number;
  items: number;
  riskScore: number;
  flags: string[];
  status: 'safe' | 'suspicious' | 'high-risk' | 'bot-attack';
  createdAt: string;
}

export default function AdminAiFraudDetector() {
  const [orders, setOrders] = useState<any[]>([]);
  const [checks, setChecks] = useState<FraudCheck[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [blacklistPhone, setBlacklistPhone] = useState('');
  const [blacklistPhones, setBlacklistPhones] = useState<string[]>(DEFAULT_BLACKLIST);
  const [tab, setTab] = useState<'scan' | 'blacklist' | 'manual'>('scan');
  const [manualOrder, setManualOrder] = useState('');
  const [manualResult, setManualResult] = useState<any>(null);
  const [manualLoading, setManualLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(count)')
      .order('created_at', { ascending: false })
      .limit(100);
    setOrders(data || []);
    setLoading(false);
  };

  const analyzeOrders = async () => {
    setAnalyzing(true);

    const ipBuckets: Record<string, { count: number; timestamps: number[] }> = {};
    orders.forEach(o => {
      const snap = o.address_snapshot || {};
      const ip = snap.ip || o.ip_address || '';
      if (ip) {
        if (!ipBuckets[ip]) ipBuckets[ip] = { count: 0, timestamps: [] };
        ipBuckets[ip].count++;
        ipBuckets[ip].timestamps.push(new Date(o.created_at).getTime());
      }
    });

    const botIPs = new Set<string>();
    Object.entries(ipBuckets).forEach(([ip, { timestamps }]) => {
      const sorted = [...timestamps].sort();
      for (let i = 0; i < sorted.length - 2; i++) {
        if (sorted[i + 2] - sorted[i] < 3600000) { botIPs.add(ip); break; }
      }
    });

    const results: FraudCheck[] = orders.map(o => {
      const flags: string[] = [];
      let riskScore = 0;
      const snap = o.address_snapshot || {};
      const phone = (snap.phone || '').replace(/\s|-/g, '');
      const address = snap.full_address || snap.area || snap.address || '';
      const name = snap.full_name || o.customer_name || 'Unknown';
      const email = snap.email || '';
      const ip = snap.ip || o.ip_address || '';
      const createdAt = o.created_at;

      const phoneRisk = phoneRiskLevel(phone);
      flags.push(...phoneRisk.flags);
      riskScore += phoneRisk.score;

      if (blacklistPhones.includes(phone)) { flags.push('Blacklisted number'); riskScore += 60; }

      const addrRisk = addressRiskLevel(address);
      flags.push(...addrRisk.flags);
      riskScore += addrRisk.score;

      if (isGibberish(name)) { flags.push('Suspicious customer name'); riskScore += 30; }
      if (!email && !snap.whatsapp) { flags.push('No email or WhatsApp'); riskScore += 20; }
      if (o.total > 50000) { flags.push('Unusually large order value'); riskScore += 15; }
      if (o.payment_method === 'cod' && o.total > 30000) { flags.push('High-value COD order'); riskScore += 10; }

      const hour = new Date(createdAt).getHours();
      if (hour >= 1 && hour <= 4) { flags.push('Placed at suspicious hours (1–4 AM)'); riskScore += 10; }

      const uniqueFlags = [...new Set(flags)];
      const isBotAttack = ip && botIPs.has(ip);
      if (isBotAttack) { uniqueFlags.push('BOT ATTACK: 3+ orders from same IP in 1 hour'); riskScore += 70; }

      const clampedScore = Math.min(riskScore, 100);
      const status: FraudCheck['status'] =
        isBotAttack ? 'bot-attack' :
        clampedScore >= 60 ? 'high-risk' :
        clampedScore >= 30 ? 'suspicious' :
        'safe';

      return {
        orderId: o.id, orderNumber: o.order_number || `#${o.id.slice(0,8)}`,
        customerName: name, phone, address, email, ip,
        total: o.total, items: o.order_items?.[0]?.count || 0,
        riskScore: clampedScore, flags: uniqueFlags, status, createdAt,
      };
    });

    setChecks(results);
    setAnalyzing(false);
    const highRisk = results.filter(r => r.status === 'high-risk' || r.status === 'bot-attack').length;
    const suspicious = results.filter(r => r.status === 'suspicious').length;
    toast({ title: `✅ Scan Complete`, description: `${highRisk} high-risk/bot, ${suspicious} suspicious orders found` });
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
            content: `You are a strict fraud detection AI for Stopy Shoes Pakistan.

RULES:
- Phone 03000000000 = FAKE (all zeros)
- Address under 15 chars or gibberish (aa, asdf, ...) = FAKE
- All same digits in phone = FAKE
- Wrong phone length (not 11 digits) = SUSPICIOUS

Blacklisted phones: ${blacklistPhones.join(', ')}

Analyze this order:
${manualOrder}

Return ONLY valid JSON:
{
  "riskScore": 0-100,
  "verdict": "safe|suspicious|high-risk",
  "flags": ["..."],
  "recommendation": "one sentence action",
  "explanation": "2-3 sentences"
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

  const filtered = checks.filter(c => filterStatus === 'all' || c.status === filterStatus);
  const highRiskCount = checks.filter(c => c.status === 'high-risk' || c.status === 'bot-attack').length;
  const suspiciousCount = checks.filter(c => c.status === 'suspicious').length;
  const safeCount = checks.filter(c => c.status === 'safe').length;

  const statusConfig = {
    'safe': { label: 'SAFE', color: 'text-green-700', bg: 'bg-green-50 border-green-200', icon: <CheckCircle className="h-5 w-5 text-green-500" /> },
    'suspicious': { label: 'SUSPICIOUS', color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200', icon: <AlertTriangle className="h-5 w-5 text-yellow-500" /> },
    'high-risk': { label: 'SCAM ALERT', color: 'text-red-700', bg: 'bg-red-50 border-red-300', icon: <XCircle className="h-5 w-5 text-red-600" /> },
    'bot-attack': { label: 'BOT ATTACK', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-300', icon: <Bot className="h-5 w-5 text-purple-600" /> },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-red-100 rounded-lg"><Shield className="h-6 w-6 text-red-600" /></div>
        <div>
          <h1 className="text-2xl font-bold">AI Fraud Detector</h1>
          <p className="text-muted-foreground text-sm">Ultra-strict fraud detection — fake phones, gibberish addresses, bot attacks</p>
        </div>
      </div>

      {checks.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Safe', count: safeCount, color: 'text-green-600', bg: 'bg-green-50 border-green-200', status: 'safe' },
            { label: 'Suspicious', count: suspiciousCount, color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200', status: 'suspicious' },
            { label: 'High Risk', count: checks.filter(c=>c.status==='high-risk').length, color: 'text-red-600', bg: 'bg-red-50 border-red-200', status: 'high-risk' },
            { label: 'Bot Attack', count: checks.filter(c=>c.status==='bot-attack').length, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200', status: 'bot-attack' },
          ].map(s => (
            <button key={s.label} onClick={() => setFilterStatus(filterStatus === s.status ? 'all' : s.status)}
              className={`${s.bg} border rounded-xl p-4 text-center transition-all ${filterStatus === s.status ? 'ring-2 ring-offset-1 ring-current' : ''}`}>
              <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </button>
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
          <div className="flex gap-3 flex-wrap">
            <Button onClick={fetchOrders} variant="outline" disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />Refresh Orders
            </Button>
            <Button onClick={analyzeOrders} disabled={analyzing || orders.length === 0} className="bg-red-600 hover:bg-red-700 text-white">
              {analyzing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Scanning...</> : <><Shield className="h-4 w-4 mr-2" />Scan {orders.length} Orders</>}
            </Button>
            {filterStatus !== 'all' && (
              <Button variant="ghost" size="sm" onClick={() => setFilterStatus('all')}>Clear Filter</Button>
            )}
          </div>

          {orders.length > 0 && checks.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Click "Scan Orders" to run fraud detection</p>
              <p className="text-xs mt-1">Will check {orders.length} orders for fake phones, gibberish addresses, bot attacks</p>
            </div>
          )}

          {filtered.length > 0 && (
            <div className="space-y-3">
              {filtered.sort((a, b) => b.riskScore - a.riskScore).map(c => {
                const cfg = statusConfig[c.status];
                const isScam = c.status === 'high-risk' || c.status === 'bot-attack';
                return (
                  <div key={c.orderId} className={`border-2 rounded-xl p-4 ${cfg.bg} ${isScam ? 'shadow-md' : ''}`}>
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-bold text-sm">{c.orderNumber}</span>

                          {isScam ? (
                            <span className="inline-flex items-center gap-1 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full animate-pulse">
                              <Siren className="h-3 w-3" />
                              {c.status === 'bot-attack' ? 'BOT ATTACK' : 'SCAM ALERT'}
                            </span>
                          ) : c.status === 'suspicious' ? (
                            <span className="inline-flex items-center gap-1 bg-yellow-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                              <AlertTriangle className="h-3 w-3" />SUSPICIOUS
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-green-600 text-white text-xs px-2 py-0.5 rounded-full">
                              <CheckCircle className="h-3 w-3" />SAFE
                            </span>
                          )}

                          <span className="text-xs text-muted-foreground ml-auto">Risk: <strong>{c.riskScore}</strong>/100</span>
                        </div>

                        <p className="text-sm font-medium">{c.customerName}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Phone className="h-3 w-3" />
                          <span className={c.riskScore >= 30 && c.flags.some(f => f.toLowerCase().includes('phone')) ? 'text-red-600 font-semibold' : ''}>{c.phone || 'N/A'}</span>
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3" />
                          <span className={c.flags.some(f => f.toLowerCase().includes('address')) ? 'text-red-600 font-semibold' : ''}>{c.address || 'No address'}</span>
                        </p>
                        {c.ip && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Fingerprint className="h-3 w-3" />IP: {c.ip}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Rs. {c.total?.toLocaleString()} · {c.items} items · {new Date(c.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div>{cfg.icon}</div>
                    </div>

                    {c.flags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-current/10">
                        {c.flags.map((f, i) => (
                          <span key={i} className={`text-xs border rounded-full px-2.5 py-0.5 font-medium ${isScam ? 'bg-red-100 border-red-300 text-red-800' : c.status === 'suspicious' ? 'bg-yellow-100 border-yellow-300 text-yellow-800' : 'bg-white border-gray-200 text-gray-700'}`}>
                            {f}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'blacklist' && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Any order from these phone numbers is automatically flagged as HIGH RISK.</p>
          <div className="flex gap-2">
            <Input placeholder="03XXXXXXXXX" value={blacklistPhone} onChange={e => setBlacklistPhone(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && blacklistPhone.trim()) { setBlacklistPhones([...blacklistPhones, blacklistPhone.trim()]); setBlacklistPhone(''); } }}
              className="max-w-xs font-mono" />
            <Button onClick={() => { if (blacklistPhone.trim()) { setBlacklistPhones([...blacklistPhones, blacklistPhone.trim()]); setBlacklistPhone(''); toast({ title: 'Added to blacklist' }); } }}>
              <Ban className="h-4 w-4 mr-2" />Blacklist
            </Button>
          </div>
          <div className="space-y-2">
            {blacklistPhones.map((p, i) => (
              <div key={i} className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
                <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-red-600" /><span className="font-mono text-sm">{p}</span></div>
                <button onClick={() => setBlacklistPhones(blacklistPhones.filter((_, j) => j !== i))} className="text-red-600 hover:text-red-800 text-xs font-medium">Remove</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'manual' && (
        <div className="space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm text-orange-800 space-y-1">
            <p className="font-semibold">Test with known fakes:</p>
            <p>• Phone: <code className="font-mono bg-white px-1 rounded">03000000000</code> → all zeros = HIGH RISK</p>
            <p>• Address: <code className="font-mono bg-white px-1 rounded">aa</code> → 2 chars, gibberish = HIGH RISK</p>
            <p>• Phone: <code className="font-mono bg-white px-1 rounded">0300</code> → too short = SUSPICIOUS</p>
          </div>
          <div>
            <Label>Paste Order Details</Label>
            <Textarea rows={8} placeholder={`Name: Ahmed Ali\nPhone: 03000000000\nAddress: aa\nTotal: Rs. 15000\nPayment: COD`}
              value={manualOrder} onChange={e => setManualOrder(e.target.value)} className="mt-1 font-mono text-sm" />
          </div>
          <Button onClick={analyzeManual} disabled={manualLoading || !manualOrder.trim()} className="bg-red-600 hover:bg-red-700 text-white">
            {manualLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analyzing...</> : <><Search className="h-4 w-4 mr-2" />Run Fraud Check</>}
          </Button>
          {manualResult && (
            <div className={`border-2 rounded-xl p-5 space-y-3 ${manualResult.verdict === 'high-risk' ? 'border-red-400 bg-red-50' : manualResult.verdict === 'suspicious' ? 'border-yellow-400 bg-yellow-50' : 'border-green-400 bg-green-50'}`}>
              <div className="flex items-center gap-3">
                <span className="text-4xl font-black">{manualResult.riskScore}</span>
                <div>
                  <span className="text-muted-foreground text-sm">/ 100 risk score</span>
                  {manualResult.verdict === 'high-risk' && (
                    <div className="inline-flex items-center gap-1 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full ml-2 animate-pulse">
                      <Siren className="h-3 w-3" />SCAM ALERT
                    </div>
                  )}
                  {manualResult.verdict === 'suspicious' && (
                    <div className="inline-flex items-center gap-1 bg-yellow-500 text-white text-xs font-bold px-2.5 py-1 rounded-full ml-2">
                      <AlertTriangle className="h-3 w-3" />SUSPICIOUS
                    </div>
                  )}
                  {manualResult.verdict === 'safe' && (
                    <div className="inline-flex items-center gap-1 bg-green-600 text-white text-xs px-2 py-0.5 rounded-full ml-2">
                      <CheckCircle className="h-3 w-3" />SAFE
                    </div>
                  )}
                </div>
              </div>
              <p className="text-sm font-semibold">{manualResult.recommendation}</p>
              <p className="text-sm text-muted-foreground">{manualResult.explanation}</p>
              {manualResult.flags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2 border-t">
                  {manualResult.flags.map((f: string, i: number) => (
                    <span key={i} className="text-xs bg-white border border-red-200 rounded-full px-2.5 py-0.5 text-red-700 font-medium">{f}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
