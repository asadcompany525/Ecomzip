import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Brain, RefreshCw, Search, Eye, ExternalLink, CheckCircle, XCircle,
  AlertCircle, Loader2, Check, Database, RotateCcw, ChevronRight, BarChart3,
  TrendingUp, Clock, Package, FileText, Star, ArrowUpRight, Filter,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import AdminDateFilter from '@/components/admin/AdminDateFilter';
import { format } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

// ─────────────────────────────────────────────
// AI helpers
// ─────────────────────────────────────────────
const CACHE_KEY = 'ai_claim_cache_v2';
function loadCache(): Record<string, any> {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch { return {}; }
}
function saveCache(c: Record<string, any>) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch {}
}
function buildAiPrompt(r: any) {
  const policy = r.products?.claim_policy || 'Standard: Manufacturing defects within 30 days qualify.';
  const duration = r.products?.claim_duration || 'Not set';
  const imgs = r.images || [];
  return `You are an AI claim validator for a shoe store in Pakistan.
PRODUCT: ${r.products?.title || 'Unknown'}
CLAIM POLICY: ${policy}
CLAIM DURATION: ${duration}
REASON: ${r.reason || 'Not specified'}
CUSTOMER NOTE: ${r.description || 'None'}
IMAGES: ${imgs.length}
${imgs[0] ? `EVIDENCE: ${imgs[0]}` : ''}
Respond ONLY with JSON:
{"decision":"APPROVED"|"REJECTED"|"NEEDS_REVIEW","confidence":0-100,"reasoning":"brief","recommendation":"action","refundAmount":"full"|"partial"|"none","partialRefundPercent":0,"flaggedIssues":[],"aiOpinion":"1-2 sentence summary"}`;
}
const DECISION_TO_STATUS: Record<string, string> = {
  APPROVED: 'approved', REJECTED: 'rejected', NEEDS_REVIEW: 'pending',
};

// ─────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────
const isClaim = (r: any) => r?.reason?.startsWith('CLAIM:');
const getImages = (r: any) => {
  try { return Array.isArray(r?.images) ? r.images : JSON.parse(r?.images || '[]'); } catch { return []; }
};

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    approved: 'bg-green-100 text-green-800 border-green-200',
    rejected: 'bg-red-100 text-red-800 border-red-200',
    refunded: 'bg-blue-100 text-blue-800 border-blue-200',
  };
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${map[status] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
      {status}
    </span>
  );
}
function AiDecisionBadge({ decision }: { decision: string }) {
  if (decision === 'APPROVED') return <Badge className="bg-green-100 text-green-800 border border-green-200 text-[10px]">✅ APPROVED</Badge>;
  if (decision === 'REJECTED')  return <Badge className="bg-red-100 text-red-800 border border-red-200 text-[10px]">❌ REJECTED</Badge>;
  return <Badge className="bg-orange-100 text-orange-800 border border-orange-200 text-[10px]">🔍 NEEDS REVIEW</Badge>;
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export default function AdminClaimsReturns() {
  const [activeTab, setActiveTab] = useState<'cases' | 'ai' | 'analytics'>('cases');
  const [returns, setReturns] = useState<any[]>([]);
  const [loadingReturns, setLoadingReturns] = useState(true);

  // All Cases tab state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [selected, setSelected] = useState<any>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [order, setOrder] = useState<any>(null);
  const [productDetails, setProductDetails] = useState<any[]>([]);
  const [adminNotes, setAdminNotes] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);
  const [dialogAiChecking, setDialogAiChecking] = useState(false);

  // AI Validator tab state
  const [aiCache, setAiCache] = useState<Record<string, any>>(loadCache());
  const [analyzing, setAnalyzing] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState<Set<string>>(new Set());
  const [applied, setApplied] = useState<Set<string>>(new Set());
  const [aiSelected, setAiSelected] = useState<string | null>(null);
  const queueRef = useRef<any[]>([]);
  const runningRef = useRef(false);

  // ── Fetch ──────────────────────────────────
  const fetchReturns = async () => {
    setLoadingReturns(true);
    let q = supabase
      .from('returns')
      .select('*, products(title, claim_policy, claim_duration, return_policy, brand)')
      .order('created_at', { ascending: false })
      .limit(100);
    if (statusFilter !== 'all') q = q.eq('status', statusFilter as any);
    if (dateFilter) {
      const s = new Date(dateFilter); s.setHours(0,0,0,0);
      const e = new Date(dateFilter); e.setHours(23,59,59,999);
      q = q.gte('created_at', s.toISOString()).lte('created_at', e.toISOString());
    }
    const { data } = await q;
    setLoadingReturns(false);
    if (!data) return;
    setReturns(data);
    const toAnalyze = data.filter(r => !aiCache[r.id]);
    queueRef.current = toAnalyze;
    runQueue(data);
  };

  useEffect(() => { fetchReturns(); }, [statusFilter, dateFilter]);

  // ── AI Queue ───────────────────────────────
  const analyzeOne = async (r: any) => {
    setAnalyzing(prev => new Set(prev).add(r.id));
    try {
      const { data } = await supabase.functions.invoke('ai-assistant', {
        body: { type: 'claim-validator', imageUrl: r.images?.[0] || null, messages: [{ role: 'user', content: buildAiPrompt(r) }] },
      });
      let parsed = data;
      if (typeof data === 'string') { const m = data.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); }
      if (parsed?.decision) {
        const newStatus = DECISION_TO_STATUS[parsed.decision] || r.status;
        const adminNote = `AI: ${parsed.decision} (${parsed.confidence}%) — ${parsed.aiOpinion || parsed.reasoning}`;
        await supabase.from('returns').update({ status: newStatus as any, admin_notes: adminNote }).eq('id', r.id);
        setReturns(prev => prev.map(ret => ret.id === r.id ? { ...ret, status: newStatus, admin_notes: adminNote } : ret));
        setApplied(prev => new Set(prev).add(r.id));
        setAiCache(prev => { const n = { ...prev, [r.id]: parsed }; saveCache(n); return n; });
      }
    } catch {}
    setAnalyzing(prev => { const s = new Set(prev); s.delete(r.id); return s; });
  };

  const runQueue = async (data?: any[]) => {
    if (runningRef.current) return;
    runningRef.current = true;
    while (queueRef.current.length > 0) {
      const batch = queueRef.current.splice(0, 3);
      await Promise.all(batch.map(analyzeOne));
    }
    runningRef.current = false;
  };

  const reAnalyze = (r: any) => {
    setAiCache(prev => { const n = { ...prev }; delete n[r.id]; saveCache(n); return n; });
    setApplied(prev => { const n = new Set(prev); n.delete(r.id); return n; });
    queueRef.current = [r];
    runQueue();
  };

  const applyDecision = async (r: any, result: any) => {
    if (!result?.decision) return;
    setApplying(prev => new Set(prev).add(r.id));
    const newStatus = DECISION_TO_STATUS[result.decision] || r.status;
    const adminNote = `AI: ${result.decision} (${result.confidence}%) — ${result.aiOpinion || result.reasoning}`;
    const { error } = await supabase.from('returns').update({ status: newStatus as any, admin_notes: adminNote }).eq('id', r.id);
    if (!error) {
      setReturns(prev => prev.map(ret => ret.id === r.id ? { ...ret, status: newStatus, admin_notes: adminNote } : ret));
      setApplied(prev => new Set(prev).add(r.id));
      toast({ title: `✅ Decision Applied: ${result.decision}`, description: `Status → "${newStatus}"` });
    } else { toast({ title: 'Failed to apply decision', variant: 'destructive' }); }
    setApplying(prev => { const s = new Set(prev); s.delete(r.id); return s; });
  };

  // ── View Return Detail ─────────────────────
  const viewReturn = async (r: any) => {
    setSelected(r);
    setAdminNotes(r.admin_notes || '');
    setRefundAmount(r.refund_amount ? String(r.refund_amount) : '');
    const [{ data: ord }, { data: items }] = await Promise.all([
      supabase.from('orders').select('*').eq('id', r.order_id).maybeSingle(),
      supabase.from('order_items').select('*').eq('order_id', r.order_id),
    ]);
    setOrder(ord);
    setOrderItems(items || []);
    if (items && items.length > 0) {
      const ids = items.map((i: any) => i.product_id).filter(Boolean);
      if (ids.length) {
        const { data: prods } = await supabase.from('products').select('id,title,images,claim_policy,claim_duration,return_policy,price,brand').in('id', ids);
        setProductDetails(prods || []);
      }
    }
  };

  const updateStatus = async (id: string, status: string) => {
    setSavingStatus(true);
    await supabase.from('returns').update({
      status: status as any,
      admin_notes: adminNotes || null,
      refund_amount: refundAmount ? Number(refundAmount) : null,
    }).eq('id', id);
    toast({ title: `✅ Status updated to "${status}"` });
    setReturns(prev => prev.map(r => r.id === id ? { ...r, status, admin_notes: adminNotes } : r));
    setSavingStatus(false);
    setSelected(null);
  };

  const dialogAiReview = async () => {
    if (!selected) return;
    setDialogAiChecking(true);
    try {
      const product = productDetails?.[0];
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          type: 'return-review',
          messages: [{ role: 'user', content: `Review this ${isClaim(selected) ? 'CLAIM' : 'RETURN'}:
Reason: ${selected.reason}
Product: ${product?.title || 'Unknown'}
Claim Duration: ${product?.claim_duration || 'Not set'}
Claim Policy: ${product?.claim_policy || 'None'}
Return Policy: ${product?.return_policy || 'None'}
Order Date: ${order ? format(new Date(order.created_at), 'dd MMM yyyy') : 'Unknown'}
Return Date: ${format(new Date(selected.created_at), 'dd MMM yyyy')}
Images: ${getImages(selected).length}
Admin Notes: ${adminNotes || 'None'}
Provide: 1) Within policy? 2) Valid reason? 3) Recommendation: approve/reject with explanation.` }],
        },
      });
      if (error) throw error;
      const rec = typeof data === 'string' ? data : data?.reply || data?.content || '';
      await supabase.from('returns').update({ ai_recommendation: rec }).eq('id', selected.id);
      setSelected((s: any) => ({ ...s, ai_recommendation: rec }));
      toast({ title: '🤖 AI Review Complete' });
    } catch (e: any) {
      toast({ title: 'AI Error', description: e.message, variant: 'destructive' });
    }
    setDialogAiChecking(false);
  };

  // ── Derived State ──────────────────────────
  const stats = {
    total: returns.length,
    pending: returns.filter(r => r.status === 'pending').length,
    approved: returns.filter(r => r.status === 'approved').length,
    rejected: returns.filter(r => r.status === 'rejected').length,
    refunded: returns.filter(r => r.status === 'refunded').length,
    claims: returns.filter(r => isClaim(r)).length,
    returnsCount: returns.filter(r => !isClaim(r)).length,
  };

  const filteredReturns = returns.filter(r => {
    const matchSearch = !search || r.id.includes(search) || r.reason?.toLowerCase().includes(search.toLowerCase()) || r.order_id?.includes(search);
    const matchType = typeFilter === 'all' || (typeFilter === 'claim' ? isClaim(r) : !isClaim(r));
    return matchSearch && matchType;
  });

  const aiSelectedReturn = returns.find(r => r.id === aiSelected);
  const aiSelectedResult = aiSelected ? aiCache[aiSelected] : null;
  const pendingAnalysis = analyzing.size;

  // ── Analytics Data ─────────────────────────
  const reasonCounts: Record<string, number> = {};
  returns.forEach(r => {
    const reason = r.reason?.replace('CLAIM: ', '') || 'Unknown';
    reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
  });
  const reasonData = Object.entries(reasonCounts)
    .sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([name, value]) => ({ name: name.length > 18 ? name.slice(0, 18) + '…' : name, value }));

  const pieData = [
    { name: 'Approved', value: stats.approved, color: '#22c55e' },
    { name: 'Rejected', value: stats.rejected, color: '#ef4444' },
    { name: 'Pending', value: stats.pending, color: '#f59e0b' },
    { name: 'Refunded', value: stats.refunded, color: '#3b82f6' },
  ].filter(d => d.value > 0);

  const monthlyData = (() => {
    const map: Record<string, { approved: number; rejected: number; pending: number }> = {};
    returns.forEach(r => {
      const m = format(new Date(r.created_at), 'MMM yy');
      if (!map[m]) map[m] = { approved: 0, rejected: 0, pending: 0 };
      if (r.status === 'approved') map[m].approved++;
      else if (r.status === 'rejected') map[m].rejected++;
      else map[m].pending++;
    });
    return Object.entries(map).slice(-6).map(([name, v]) => ({ name, ...v }));
  })();

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <div className="space-y-5 max-w-6xl">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Claims &amp; Returns Center
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage all return requests and warranty claims — with AI-powered auto-validation.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchReturns} disabled={loadingReturns} className="gap-2">
          <RefreshCw className={`h-3.5 w-3.5 ${loadingReturns ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {/* ── Stats Bar ── */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {[
          { label: 'Total', value: stats.total, color: 'text-foreground', bg: '' },
          { label: 'Pending', value: stats.pending, color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-950/20' },
          { label: 'Approved', value: stats.approved, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950/20' },
          { label: 'Rejected', value: stats.rejected, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/20' },
          { label: 'Refunded', value: stats.refunded, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/20' },
          { label: 'Claims', value: stats.claims, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/20' },
          { label: 'Returns', value: stats.returnsCount, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950/20' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-2.5 text-center ${s.bg}`}>
            <p className="text-[10px] text-muted-foreground font-medium">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── AI Analysis Banner ── */}
      {pendingAnalysis > 0 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
          <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
          <p className="text-sm text-primary font-medium">
            AI is analyzing {pendingAnalysis} claim{pendingAnalysis !== 1 ? 's' : ''} in background and updating database…
          </p>
        </motion.div>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-muted/50 rounded-xl p-1 w-fit">
        {([
          { key: 'cases', label: 'All Cases', icon: FileText },
          { key: 'ai', label: 'AI Validator', icon: Brain },
          { key: 'analytics', label: 'Analytics', icon: BarChart3 },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
            {tab.key === 'cases' && <Badge variant="outline" className="text-[10px] ml-0.5 px-1.5 py-0">{filteredReturns.length}</Badge>}
            {tab.key === 'ai' && applied.size > 0 && (
              <Badge className="text-[10px] ml-0.5 px-1.5 py-0 bg-green-500 text-white">{applied.size}</Badge>
            )}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════
          TAB 1 — ALL CASES
      ══════════════════════════════════════ */}
      {activeTab === 'cases' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by ID, reason, order…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
            </div>
            <AdminDateFilter date={dateFilter} onDateChange={setDateFilter} />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 h-9"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-32 h-9"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="claim">Claims Only</SelectItem>
                <SelectItem value="return">Returns Only</SelectItem>
              </SelectContent>
            </Select>
            {(search || statusFilter !== 'all' || typeFilter !== 'all' || dateFilter) && (
              <Button variant="ghost" size="sm" className="h-9 gap-1.5 text-muted-foreground"
                onClick={() => { setSearch(''); setStatusFilter('all'); setTypeFilter('all'); setDateFilter(undefined); }}>
                <RotateCcw className="h-3.5 w-3.5" /> Clear
              </Button>
            )}
          </div>

          {/* Table */}
          {loadingReturns ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="bg-card rounded-xl border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left p-3 font-medium">Type</th>
                    <th className="text-left p-3 font-medium">Product</th>
                    <th className="text-left p-3 font-medium">Reason</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">AI Decision</th>
                    <th className="text-left p-3 font-medium">Date</th>
                    <th className="text-left p-3 font-medium">Evidence</th>
                    <th className="text-left p-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReturns.map(r => {
                    const imgs = getImages(r);
                    const result = aiCache[r.id];
                    const isAna = analyzing.has(r.id);
                    return (
                      <tr key={r.id} className="border-b hover:bg-accent/30 transition-colors">
                        <td className="p-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isClaim(r) ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-orange-100 text-orange-800 border-orange-200'
                          }`}>
                            {isClaim(r) ? '⚙ Claim' : '↩ Return'}
                          </span>
                        </td>
                        <td className="p-3 max-w-[140px]">
                          <p className="text-xs font-medium truncate">{r.products?.title || '—'}</p>
                        </td>
                        <td className="p-3 max-w-[180px]">
                          <p className="text-xs truncate text-muted-foreground">{r.reason?.replace('CLAIM: ', '') || '—'}</p>
                        </td>
                        <td className="p-3"><StatusBadge status={r.status} /></td>
                        <td className="p-3">
                          {isAna ? (
                            <span className="flex items-center gap-1 text-[10px] text-primary">
                              <Loader2 className="h-3 w-3 animate-spin" /> Analyzing…
                            </span>
                          ) : result ? (
                            <AiDecisionBadge decision={result.decision} />
                          ) : (
                            <span className="text-[10px] text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(r.created_at), 'dd MMM yy')}
                        </td>
                        <td className="p-3">
                          {imgs.length > 0 ? (
                            <div className="flex gap-1 items-center">
                              {imgs.slice(0, 2).map((img: string, i: number) => (
                                <a key={i} href={img} target="_blank" rel="noopener">
                                  <img src={img} alt="" className="w-8 h-8 rounded object-cover border hover:opacity-75 transition" />
                                </a>
                              ))}
                              {imgs.length > 2 && <span className="text-[10px] text-muted-foreground">+{imgs.length - 2}</span>}
                            </div>
                          ) : <span className="text-xs text-muted-foreground">None</span>}
                        </td>
                        <td className="p-3">
                          <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => viewReturn(r)}>
                            <Eye className="h-3 w-3" /> View
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredReturns.length === 0 && (
                    <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">
                      <Shield className="h-8 w-8 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">No cases found</p>
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════
          TAB 2 — AI VALIDATOR
      ══════════════════════════════════════ */}
      {activeTab === 'ai' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-primary/5 to-purple-500/5 border border-primary/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                <Brain className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">AI Auto-Validator</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  AI automatically analyzes every claim/return against the product policy and instantly updates the database status. 
                  Select any case to see full AI reasoning, confidence score, and refund recommendation.
                </p>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Check className="h-3 w-3 text-green-500" /> {applied.size} DB Updated</span>
                  <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 text-primary" /> {pendingAnalysis} In Progress</span>
                  <span>{returns.length} Total Cases</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-5 gap-4">
            {/* Left: case list */}
            <div className="lg:col-span-2 space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
              {loadingReturns ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : returns.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Shield className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No claims or returns found</p>
                </div>
              ) : returns.map(r => {
                const result = aiCache[r.id];
                const isAna = analyzing.has(r.id);
                const isApp = applied.has(r.id);
                const isSel = aiSelected === r.id;
                return (
                  <motion.button key={r.id} layout onClick={() => setAiSelected(isSel ? null : r.id)}
                    className={`w-full text-left rounded-xl border p-3 transition-all ${
                      isSel ? 'border-primary bg-primary/5 shadow-sm' : 'hover:border-primary/40 hover:bg-muted/30'
                    }`}>
                    <div className="flex items-center gap-2 mb-1">
                      {isAna ? (
                        <Loader2 className="h-3.5 w-3.5 text-primary animate-spin shrink-0" />
                      ) : result ? (
                        result.decision === 'APPROVED' ? <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" /> :
                        result.decision === 'REJECTED' ? <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" /> :
                        <AlertCircle className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                      ) : <Shield className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                      <span className="text-xs font-medium truncate flex-1">
                        {r.products?.title || 'Unknown Product'}
                      </span>
                      {isApp && <Check className="h-3 w-3 text-green-500 shrink-0" title="Applied to DB" />}
                      <ChevronRight className={`h-3 w-3 text-muted-foreground shrink-0 transition-transform ${isSel ? 'rotate-90' : ''}`} />
                    </div>
                    <div className="flex items-center gap-2 ml-5">
                      {result ? <AiDecisionBadge decision={result.decision} /> :
                       isAna ? <Badge variant="outline" className="text-[10px] text-primary border-primary/30">Analyzing…</Badge> :
                       <Badge variant="outline" className="text-[10px]">Queued</Badge>}
                      <span className={`text-[10px] px-1.5 py-0 rounded-full ${
                        isClaim(r) ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'
                      }`}>{isClaim(r) ? 'Claim' : 'Return'}</span>
                    </div>
                    {result?.aiOpinion && (
                      <p className="text-[10px] text-muted-foreground ml-5 mt-1 line-clamp-1">{result.aiOpinion}</p>
                    )}
                    <div className="ml-5 mt-1 flex items-center gap-1.5">
                      <StatusBadge status={r.status} />
                      {isApp && <span className="text-[9px] text-green-600 font-medium">✓ DB Updated</span>}
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Right: AI detail panel */}
            <div className="lg:col-span-3">
              <AnimatePresence mode="wait">
                {aiSelected && aiSelectedReturn ? (
                  <motion.div key={aiSelected} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">
                    {/* Case info card */}
                    <div className="bg-card border rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <h3 className="font-semibold text-sm">{aiSelectedReturn.products?.title || 'Unknown Product'}</h3>
                          <p className="text-xs text-muted-foreground">{format(new Date(aiSelectedReturn.created_at), 'dd MMM yyyy')}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={aiSelectedReturn.status} />
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isClaim(aiSelectedReturn) ? 'bg-purple-100 text-purple-800' : 'bg-orange-100 text-orange-800'
                          }`}>{isClaim(aiSelectedReturn) ? 'Claim' : 'Return'}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><span className="text-muted-foreground">Reason: </span>{aiSelectedReturn.reason?.replace('CLAIM: ', '') || '—'}</div>
                        <div><span className="text-muted-foreground">Order: </span>#{aiSelectedReturn.order_id?.slice(0,8)}</div>
                      </div>
                      {aiSelectedReturn.description && (
                        <p className="text-xs bg-muted/30 rounded-lg p-2">{aiSelectedReturn.description}</p>
                      )}
                      {getImages(aiSelectedReturn).length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                          {getImages(aiSelectedReturn).map((img: string, i: number) => (
                            <a key={i} href={img} target="_blank" rel="noopener">
                              <img src={img} alt="" className="w-14 h-14 rounded-lg object-cover border hover:opacity-80 transition" />
                            </a>
                          ))}
                        </div>
                      )}
                      {aiSelectedReturn.products?.claim_policy && (
                        <div className="text-[11px] bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-lg p-2">
                          <span className="font-semibold text-blue-700">Policy: </span>
                          <span className="text-blue-900 dark:text-blue-200">{aiSelectedReturn.products.claim_policy}</span>
                        </div>
                      )}
                      {aiSelectedReturn.admin_notes && (
                        <div className="text-[11px] bg-green-50 dark:bg-green-950/30 border border-green-200 rounded-lg p-2">
                          <span className="font-semibold text-green-700">📝 DB Note: </span>
                          <span className="text-green-900 dark:text-green-200">{aiSelectedReturn.admin_notes}</span>
                        </div>
                      )}
                    </div>

                    {/* AI result */}
                    {analyzing.has(aiSelected) ? (
                      <div className="flex flex-col items-center justify-center gap-3 py-10 bg-card border rounded-xl">
                        <motion.div animate={{ scale: [1,1.15,1] }} transition={{ repeat: Infinity, duration: 1.4 }}>
                          <Brain className="h-8 w-8 text-primary" />
                        </motion.div>
                        <p className="text-sm text-muted-foreground">AI is analyzing this case and updating database…</p>
                      </div>
                    ) : aiSelectedResult ? (
                      <div className={`rounded-xl border p-4 space-y-4 ${
                        aiSelectedResult.decision === 'APPROVED' ? 'bg-green-50 dark:bg-green-950/20 border-green-200' :
                        aiSelectedResult.decision === 'REJECTED' ? 'bg-red-50 dark:bg-red-950/20 border-red-200' :
                        'bg-orange-50 dark:bg-orange-950/20 border-orange-200'
                      }`}>
                        {/* Decision header */}
                        <div className="flex items-center gap-3">
                          {aiSelectedResult.decision === 'APPROVED' ? <CheckCircle className="h-7 w-7 text-green-600 shrink-0" /> :
                           aiSelectedResult.decision === 'REJECTED' ? <XCircle className="h-7 w-7 text-red-600 shrink-0" /> :
                           <AlertCircle className="h-7 w-7 text-orange-600 shrink-0" />}
                          <div className="flex-1">
                            <p className="font-bold text-lg">{aiSelectedResult.decision}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <div className="flex-1 bg-white/50 dark:bg-black/20 rounded-full h-2 overflow-hidden">
                                <div className="h-full bg-current rounded-full" style={{ width: `${aiSelectedResult.confidence}%` }} />
                              </div>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">{aiSelectedResult.confidence}% confidence</span>
                            </div>
                          </div>
                          <Badge className={
                            aiSelectedResult.refundAmount === 'full' ? 'bg-green-600 text-white shrink-0' :
                            aiSelectedResult.refundAmount === 'partial' ? 'bg-orange-500 text-white shrink-0' : 'bg-gray-400 text-white shrink-0'
                          }>
                            {aiSelectedResult.refundAmount === 'full' ? '💯 Full Refund' :
                             aiSelectedResult.refundAmount === 'partial' ? `${aiSelectedResult.partialRefundPercent}% Refund` : 'No Refund'}
                          </Badge>
                        </div>

                        {aiSelectedResult.aiOpinion && (
                          <div className="bg-white/60 dark:bg-black/20 rounded-lg p-3 text-sm font-medium">
                            💬 {aiSelectedResult.aiOpinion}
                          </div>
                        )}

                        <div className="grid sm:grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">Reasoning</p>
                            <p className="text-xs">{aiSelectedResult.reasoning}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">Recommendation</p>
                            <p className="text-xs">{aiSelectedResult.recommendation}</p>
                          </div>
                        </div>

                        {aiSelectedResult.flaggedIssues?.length > 0 && (
                          <div className="bg-orange-100/60 dark:bg-orange-950/30 rounded-lg p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-orange-700 mb-1">⚠ Flagged Issues</p>
                            <ul className="space-y-0.5">
                              {aiSelectedResult.flaggedIssues.map((f: string, i: number) => (
                                <li key={i} className="text-xs text-orange-700">• {f}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="flex gap-2 flex-wrap pt-1">
                          <Button size="sm" className="gap-2"
                            onClick={() => applyDecision(aiSelectedReturn, aiSelectedResult)}
                            disabled={applying.has(aiSelected) || applied.has(aiSelected)}>
                            {applying.has(aiSelected) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> :
                             applied.has(aiSelected) ? <Check className="h-3.5 w-3.5" /> : <Database className="h-3.5 w-3.5" />}
                            {applied.has(aiSelected) ? 'Applied to DB ✓' : 'Apply to Database'}
                          </Button>
                          <Button variant="outline" size="sm" className="gap-2" onClick={() => reAnalyze(aiSelectedReturn)}>
                            <RefreshCw className="h-3.5 w-3.5" /> Re-analyze
                          </Button>
                          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground"
                            onClick={() => { viewReturn(aiSelectedReturn); setActiveTab('cases'); }}>
                            <Eye className="h-3.5 w-3.5" /> Full Details
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-10 bg-card border rounded-xl text-muted-foreground">
                        <Brain className="h-8 w-8 mb-2 opacity-30" />
                        <p className="text-sm">AI analysis not available yet</p>
                        <Button size="sm" variant="outline" className="mt-3 gap-2" onClick={() => reAnalyze(aiSelectedReturn)}>
                          <Brain className="h-3.5 w-3.5" /> Analyze Now
                        </Button>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center h-64 text-muted-foreground bg-card border rounded-xl">
                    <Brain className="h-10 w-10 mb-3 opacity-20" />
                    <p className="text-sm">Select a case from the list to see AI analysis</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          TAB 3 — ANALYTICS
      ══════════════════════════════════════ */}
      {activeTab === 'analytics' && (
        <div className="space-y-5">
          {/* Summary cards */}
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-card border rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-green-100 dark:bg-green-950/40 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <p className="text-sm font-medium">Approval Rate</p>
              </div>
              <p className="text-3xl font-bold text-green-600">
                {stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">{stats.approved} approved of {stats.total} total</p>
            </div>
            <div className="bg-card border rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-950/40 rounded-lg">
                  <Shield className="h-4 w-4 text-purple-600" />
                </div>
                <p className="text-sm font-medium">Claim vs Return</p>
              </div>
              <div className="flex items-end gap-3">
                <div>
                  <p className="text-3xl font-bold text-purple-600">{stats.claims}</p>
                  <p className="text-xs text-muted-foreground">Claims</p>
                </div>
                <div className="text-muted-foreground text-xl font-light mb-1">/</div>
                <div>
                  <p className="text-3xl font-bold text-orange-600">{stats.returnsCount}</p>
                  <p className="text-xs text-muted-foreground">Returns</p>
                </div>
              </div>
            </div>
            <div className="bg-card border rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-950/40 rounded-lg">
                  <Clock className="h-4 w-4 text-yellow-600" />
                </div>
                <p className="text-sm font-medium">Pending Action</p>
              </div>
              <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
              <p className="text-xs text-muted-foreground mt-1">cases require your decision</p>
            </div>
          </div>

          {/* Charts row */}
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Monthly bar chart */}
            <div className="bg-card border rounded-xl p-4">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> Monthly Trend
              </h3>
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={monthlyData} barSize={10}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="approved" fill="#22c55e" radius={[3,3,0,0]} name="Approved" />
                    <Bar dataKey="rejected" fill="#ef4444" radius={[3,3,0,0]} name="Rejected" />
                    <Bar dataKey="pending"  fill="#f59e0b" radius={[3,3,0,0]} name="Pending" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Not enough data</div>
              )}
            </div>

            {/* Status pie chart */}
            <div className="bg-card border rounded-xl p-4">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" /> Status Breakdown
              </h3>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false} style={{ fontSize: 10 }}>
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">No data available</div>
              )}
            </div>
          </div>

          {/* Top reasons */}
          <div className="bg-card border rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Star className="h-4 w-4 text-primary" /> Top Return/Claim Reasons
            </h3>
            <div className="space-y-2">
              {reasonData.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No data available</p>}
              {reasonData.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-5 shrink-0">#{i+1}</span>
                  <span className="text-xs flex-1 truncate">{item.name}</span>
                  <div className="w-32 bg-muted rounded-full h-2 overflow-hidden shrink-0">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${(item.value / (reasonData[0]?.value || 1)) * 100}%` }} />
                  </div>
                  <span className="text-xs font-semibold w-6 text-right shrink-0">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pending list */}
          {stats.pending > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-300 mb-3 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" /> {stats.pending} Cases Need Your Decision
              </h3>
              <div className="space-y-2">
                {returns.filter(r => r.status === 'pending').slice(0, 5).map(r => (
                  <div key={r.id} className="flex items-center gap-3 bg-white/60 dark:bg-black/20 rounded-lg p-2.5">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      isClaim(r) ? 'bg-purple-100 text-purple-800' : 'bg-orange-100 text-orange-800'
                    }`}>{isClaim(r) ? 'Claim' : 'Return'}</span>
                    <span className="text-xs flex-1 truncate">{r.reason?.replace('CLAIM: ', '') || '—'}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(r.created_at), 'dd MMM')}</span>
                    <Button size="sm" variant="outline" className="h-6 text-xs gap-1 shrink-0"
                      onClick={() => { viewReturn(r); setActiveTab('cases'); }}>
                      <Eye className="h-3 w-3" /> Review
                    </Button>
                  </div>
                ))}
                {stats.pending > 5 && (
                  <p className="text-xs text-yellow-700 dark:text-yellow-400 text-center pt-1">
                    +{stats.pending - 5} more pending — switch to "All Cases" to see all
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════
          DETAIL DIALOG
      ══════════════════════════════════════ */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isClaim(selected) ? <Shield className="h-5 w-5 text-purple-600" /> : <RotateCcw className="h-5 w-5 text-orange-600" />}
              {isClaim(selected) ? 'Claim Detail' : 'Return Detail'}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              {/* Basic info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-muted/30 rounded-lg p-2.5">
                  <p className="text-[10px] text-muted-foreground font-medium mb-1">STATUS</p>
                  <StatusBadge status={selected.status} />
                </div>
                <div className="bg-muted/30 rounded-lg p-2.5">
                  <p className="text-[10px] text-muted-foreground font-medium mb-1">TYPE</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isClaim(selected) ? 'bg-purple-100 text-purple-800' : 'bg-orange-100 text-orange-800'
                  }`}>{isClaim(selected) ? 'Warranty Claim' : 'Return Request'}</span>
                </div>
                <div className="bg-muted/30 rounded-lg p-2.5">
                  <p className="text-[10px] text-muted-foreground font-medium mb-1">DATE</p>
                  <p className="text-xs font-medium">{format(new Date(selected.created_at), 'dd MMM yyyy')}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-2.5">
                  <p className="text-[10px] text-muted-foreground font-medium mb-1">ORDER</p>
                  <p className="text-xs font-medium">{order?.order_number || '#' + selected.order_id?.slice(0,8)}</p>
                </div>
              </div>

              {/* Reason */}
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">Reason</p>
                <p className="text-sm">{selected.reason?.replace('CLAIM: ', '') || '—'}</p>
                {selected.description && <p className="text-xs text-muted-foreground mt-1">{selected.description}</p>}
              </div>

              {/* Evidence Images */}
              {getImages(selected).length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-2">Evidence Photos</p>
                  <div className="flex gap-2 flex-wrap">
                    {getImages(selected).map((img: string, i: number) => (
                      <a key={i} href={img} target="_blank" rel="noopener">
                        <img src={img} alt="" className="w-24 h-24 object-cover rounded-xl border hover:opacity-80 transition" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Products in order */}
              {orderItems.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-2">Products in Order</p>
                  {orderItems.map((item: any) => {
                    const prod = productDetails?.find((p: any) => p.id === item.product_id);
                    return (
                      <div key={item.id} className="p-3 bg-muted/20 rounded-xl border mb-2">
                        <div className="flex items-center gap-3">
                          <img src={item.image || (prod?.images as any)?.[0] || '/placeholder.svg'} alt=""
                            className="w-16 h-16 rounded-lg object-cover border shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium truncate">{item.title}</p>
                              {prod && (
                                <Link to={`/product/${prod.id}`} target="_blank" className="text-primary shrink-0">
                                  <ExternalLink className="h-3 w-3" />
                                </Link>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">Size: {item.size || '-'} | Color: {item.color || '-'} | Qty: {item.quantity}</p>
                            <p className="text-sm font-semibold text-primary">Rs. {Number(item.price).toLocaleString()}</p>
                          </div>
                        </div>
                        {prod && (
                          <div className="mt-2 text-xs space-y-1 border-t pt-2 text-muted-foreground">
                            {prod.return_policy && <p><span className="font-medium text-foreground">Return Policy: </span>{prod.return_policy}</p>}
                            {prod.claim_duration && <p><span className="font-medium text-foreground">Claim Duration: </span>{prod.claim_duration}</p>}
                            {prod.claim_policy && <p><span className="font-medium text-foreground">AI Claim Instructions: </span>{prod.claim_policy}</p>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* AI Review button */}
              <Button variant="outline" onClick={dialogAiReview} disabled={dialogAiChecking} className="w-full gap-2">
                {dialogAiChecking ? <><Loader2 className="h-4 w-4 animate-spin" /> AI Reviewing…</> : <><Brain className="h-4 w-4" /> Get AI Recommendation</>}
              </Button>
              {selected.ai_recommendation && (
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 rounded-xl p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-blue-700 mb-1">🤖 AI Recommendation</p>
                  <p className="text-sm whitespace-pre-wrap text-blue-900 dark:text-blue-200">{selected.ai_recommendation}</p>
                </div>
              )}

              {/* Admin actions */}
              <div className="space-y-3 border-t pt-3">
                <div>
                  <Label className="text-xs">Admin Notes</Label>
                  <Textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} rows={2} className="mt-1 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Refund Amount (Rs.)</Label>
                  <Input value={refundAmount} onChange={e => setRefundAmount(e.target.value)} className="mt-1 h-9" type="number" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Button disabled={savingStatus} onClick={() => updateStatus(selected.id, 'approved')}
                    className="gap-2 bg-green-600 hover:bg-green-700 text-white">
                    <CheckCircle className="h-4 w-4" /> Approve
                  </Button>
                  <Button disabled={savingStatus} variant="destructive" onClick={() => updateStatus(selected.id, 'rejected')}
                    className="gap-2">
                    <XCircle className="h-4 w-4" /> Reject
                  </Button>
                  <Button disabled={savingStatus} variant="outline" onClick={() => updateStatus(selected.id, 'refunded')}
                    className="gap-2">
                    <Package className="h-4 w-4" /> Refunded
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
