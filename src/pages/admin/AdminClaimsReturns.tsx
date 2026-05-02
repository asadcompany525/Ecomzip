import { useState, useEffect, useRef, useCallback } from 'react';
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
  TrendingUp, Clock, Package, FileText, Star, Filter, Sparkles, ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import AdminDateFilter from '@/components/admin/AdminDateFilter';
import { format } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

// ─── AI helpers ──────────────────────────────────────────────────────────────
const CACHE_KEY = 'ai_claim_cache_v2';
const loadCache = (): Record<string, any> => { try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch { return {}; } };
const saveCache = (c: Record<string, any>) => { try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch {} };

function buildAiPrompt(r: any) {
  const policy = r.products?.claim_policy || 'Standard: Manufacturing defects within 30 days qualify.';
  return `You are an AI claim validator for a fashion/shoe store in Pakistan.
PRODUCT: ${r.products?.title || 'Unknown'} | CLAIM POLICY: ${policy}
CLAIM DURATION: ${r.products?.claim_duration || 'Not set'} | REASON: ${r.reason || 'Not specified'}
CUSTOMER NOTE: ${r.description || 'None'} | IMAGES: ${(r.images || []).length}
${(r.images || [])[0] ? `EVIDENCE: ${r.images[0]}` : ''}
Respond ONLY with JSON: {"decision":"APPROVED"|"REJECTED"|"NEEDS_REVIEW","confidence":0-100,"reasoning":"brief","recommendation":"action","refundAmount":"full"|"partial"|"none","partialRefundPercent":0,"flaggedIssues":[],"aiOpinion":"1-2 sentence summary"}`;
}
const DECISION_TO_STATUS: Record<string, string> = { APPROVED: 'approved', REJECTED: 'rejected', NEEDS_REVIEW: 'pending' };

// ─── Helpers ──────────────────────────────────────────────────────────────────
const isClaim = (r: any) => r?.reason?.startsWith('CLAIM:');
const getImages = (r: any) => { try { return Array.isArray(r?.images) ? r.images : JSON.parse(r?.images || '[]'); } catch { return []; } };
const focusNext = (currentId: string, nextId: string) => (e: React.KeyboardEvent) => {
  if (e.key === 'Enter') { e.preventDefault(); document.getElementById(nextId)?.focus(); }
};
const submitOnEnter = (fn: () => void) => (e: React.KeyboardEvent) => {
  if (e.key === 'Enter') { e.preventDefault(); fn(); }
};

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatusPill({ status }: { status: string }) {
  const variants: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300',
    rejected: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300',
    refunded: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-300',
  };
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize tracking-wide ${variants[status] || 'bg-muted text-muted-foreground border-muted-foreground/20'}`}>
      {status === 'approved' && '✓'}{status === 'rejected' && '✗'}{status === 'pending' && '○'}{status === 'refunded' && '↩'} {status}
    </span>
  );
}

function TypeChip({ claim }: { claim: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
      claim ? 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300' : 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300'
    }`}>
      {claim ? '⚙' : '↩'} {claim ? 'Claim' : 'Return'}
    </span>
  );
}

function AiBadge({ decision }: { decision: string }) {
  if (decision === 'APPROVED') return <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">✅ APPROVED</span>;
  if (decision === 'REJECTED')  return <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200">❌ REJECTED</span>;
  return <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">🔍 REVIEW</span>;
}

function StatCard({ label, value, color, bg, icon }: { label: string; value: number; color: string; bg: string; icon: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-3 text-center ${bg}`}>
      <p className="text-lg mb-0.5">{icon}</p>
      <p className={`text-2xl font-black ${color}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground font-medium mt-0.5 uppercase tracking-wide">{label}</p>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function AdminClaimsReturns() {
  const [activeTab, setActiveTab] = useState<'cases' | 'ai' | 'analytics'>('cases');
  const [returns, setReturns] = useState<any[]>([]);
  const [loadingReturns, setLoadingReturns] = useState(true);

  // All Cases state
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

  // AI Validator state
  const [aiCache, setAiCache] = useState<Record<string, any>>(loadCache());
  const [analyzing, setAnalyzing] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState<Set<string>>(new Set());
  const [applied, setApplied] = useState<Set<string>>(new Set());
  const [aiSelected, setAiSelected] = useState<string | null>(null);
  const queueRef = useRef<any[]>([]);
  const runningRef = useRef(false);

  // ── Data fetching ──────────────────────────────────────────────────────────
  const fetchReturns = useCallback(async () => {
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
    queueRef.current = data.filter(r => !aiCache[r.id]);
    runQueue();
  }, [statusFilter, dateFilter]);

  useEffect(() => { fetchReturns(); }, [fetchReturns]);

  // ── AI queue ──────────────────────────────────────────────────────────────
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
        const note = `AI: ${parsed.decision} (${parsed.confidence}% confidence) — ${parsed.aiOpinion || parsed.reasoning}`;
        await supabase.from('returns').update({ status: newStatus as any, admin_notes: note }).eq('id', r.id);
        setReturns(prev => prev.map(ret => ret.id === r.id ? { ...ret, status: newStatus, admin_notes: note } : ret));
        setApplied(prev => new Set(prev).add(r.id));
        setAiCache(prev => { const n = { ...prev, [r.id]: parsed }; saveCache(n); return n; });
      }
    } catch {}
    setAnalyzing(prev => { const s = new Set(prev); s.delete(r.id); return s; });
  };

  const runQueue = async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    while (queueRef.current.length > 0) {
      await Promise.all(queueRef.current.splice(0, 3).map(analyzeOne));
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
    const note = `AI: ${result.decision} (${result.confidence}%) — ${result.aiOpinion || result.reasoning}`;
    const { error } = await supabase.from('returns').update({ status: newStatus as any, admin_notes: note }).eq('id', r.id);
    if (!error) {
      setReturns(prev => prev.map(ret => ret.id === r.id ? { ...ret, status: newStatus, admin_notes: note } : ret));
      setApplied(prev => new Set(prev).add(r.id));
      toast({ title: `✅ Applied: ${result.decision}`, description: `Status → "${newStatus}"` });
    } else { toast({ title: 'Failed', variant: 'destructive' }); }
    setApplying(prev => { const s = new Set(prev); s.delete(r.id); return s; });
  };

  // ── View detail ───────────────────────────────────────────────────────────
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
    if (items?.length) {
      const ids = items.map((i: any) => i.product_id).filter(Boolean);
      if (ids.length) {
        const { data: prods } = await supabase.from('products').select('id,title,images,claim_policy,claim_duration,return_policy,price,brand').in('id', ids);
        setProductDetails(prods || []);
      }
    }
  };

  const updateStatus = async (id: string, status: string) => {
    setSavingStatus(true);
    await supabase.from('returns').update({ status: status as any, admin_notes: adminNotes || null, refund_amount: refundAmount ? Number(refundAmount) : null }).eq('id', id);
    toast({ title: `✅ Status → "${status}"` });
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
          messages: [{ role: 'user', content: `Review this ${isClaim(selected) ? 'CLAIM' : 'RETURN'}:\nReason: ${selected.reason}\nProduct: ${product?.title || 'Unknown'}\nClaim Duration: ${product?.claim_duration || 'Not set'}\nPolicy: ${product?.claim_policy || 'None'}\nReturn Policy: ${product?.return_policy || 'None'}\nOrder: ${order ? format(new Date(order.created_at), 'dd MMM yyyy') : 'Unknown'}\nImages: ${getImages(selected).length}\nProvide: within policy? valid reason? recommendation.` }],
        },
      });
      if (error) throw error;
      const rec = typeof data === 'string' ? data : data?.reply || data?.content || '';
      await supabase.from('returns').update({ ai_recommendation: rec }).eq('id', selected.id);
      setSelected((s: any) => ({ ...s, ai_recommendation: rec }));
      toast({ title: '🤖 AI Review Complete' });
    } catch (e: any) { toast({ title: 'AI Error', description: e.message, variant: 'destructive' }); }
    setDialogAiChecking(false);
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const stats = {
    total: returns.length,
    pending: returns.filter(r => r.status === 'pending').length,
    approved: returns.filter(r => r.status === 'approved').length,
    rejected: returns.filter(r => r.status === 'rejected').length,
    refunded: returns.filter(r => r.status === 'refunded').length,
    claims: returns.filter(r => isClaim(r)).length,
    returnsOnly: returns.filter(r => !isClaim(r)).length,
  };

  const filtered = returns.filter(r => {
    if (search && !r.id.includes(search) && !r.reason?.toLowerCase().includes(search.toLowerCase()) && !r.order_id?.includes(search)) return false;
    if (typeFilter === 'claim' && !isClaim(r)) return false;
    if (typeFilter === 'return' && isClaim(r)) return false;
    return true;
  });

  const aiSelectedReturn = returns.find(r => r.id === aiSelected);
  const aiSelectedResult = aiSelected ? aiCache[aiSelected] : null;
  const pendingAnalysis = analyzing.size;

  // ── Analytics ─────────────────────────────────────────────────────────────
  const pieData = [
    { name: 'Approved', value: stats.approved, color: '#10b981' },
    { name: 'Rejected', value: stats.rejected, color: '#ef4444' },
    { name: 'Pending', value: stats.pending, color: '#f59e0b' },
    { name: 'Refunded', value: stats.refunded, color: '#3b82f6' },
  ].filter(d => d.value > 0);

  const monthlyData = (() => {
    const map: Record<string, any> = {};
    returns.forEach(r => {
      const m = format(new Date(r.created_at), 'MMM yy');
      if (!map[m]) map[m] = { name: m, approved: 0, rejected: 0, pending: 0 };
      if (r.status === 'approved') map[m].approved++;
      else if (r.status === 'rejected') map[m].rejected++;
      else map[m].pending++;
    });
    return Object.values(map).slice(-6);
  })();

  const reasonMap: Record<string, number> = {};
  returns.forEach(r => { const k = r.reason?.replace('CLAIM: ', '') || 'Unknown'; reasonMap[k] = (reasonMap[k] || 0) + 1; });
  const topReasons = Object.entries(reasonMap).sort((a,b) => b[1]-a[1]).slice(0,6);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 max-w-6xl">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-violet-500 to-purple-600 p-5 text-white shadow-lg">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 70% 50%, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-5 w-5" />
              <h2 className="text-xl font-black tracking-tight">Claims & Returns Center</h2>
            </div>
            <p className="text-violet-200 text-sm">AI-powered claim validation · Instant database updates · Full analytics</p>
          </div>
          <Button onClick={fetchReturns} disabled={loadingReturns} size="sm"
            className="bg-white/20 hover:bg-white/30 text-white border border-white/30 gap-2 shrink-0">
            <RefreshCw className={`h-3.5 w-3.5 ${loadingReturns ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
        {pendingAnalysis > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="relative mt-3 flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
            <Sparkles className="h-4 w-4 animate-pulse" />
            <span className="text-sm font-medium">AI analyzing {pendingAnalysis} case{pendingAnalysis !== 1 ? 's' : ''} and updating database…</span>
          </motion.div>
        )}
      </div>

      {/* ── Stats Row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
        <StatCard label="Total" value={stats.total} color="text-foreground" bg="bg-card border" icon="📋" />
        <StatCard label="Pending" value={stats.pending} color="text-amber-600" bg="bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800" icon="⏳" />
        <StatCard label="Approved" value={stats.approved} color="text-emerald-600" bg="bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800" icon="✅" />
        <StatCard label="Rejected" value={stats.rejected} color="text-red-600" bg="bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800" icon="❌" />
        <StatCard label="Refunded" value={stats.refunded} color="text-sky-600" bg="bg-sky-50 border-sky-200 dark:bg-sky-950/20 dark:border-sky-800" icon="↩️" />
        <StatCard label="Claims" value={stats.claims} color="text-violet-600" bg="bg-violet-50 border-violet-200 dark:bg-violet-950/20 dark:border-violet-800" icon="⚙️" />
        <StatCard label="Returns" value={stats.returnsOnly} color="text-orange-600" bg="bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800" icon="📦" />
      </div>

      {/* ── Tab Bar ───────────────────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 bg-muted/60 rounded-2xl w-fit border">
        {([
          { key: 'cases' as const, label: 'All Cases', icon: FileText, count: filtered.length },
          { key: 'ai' as const, label: 'AI Validator', icon: Brain, count: applied.size },
          { key: 'analytics' as const, label: 'Analytics', icon: BarChart3, count: null },
        ]).map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === tab.key ? 'bg-background shadow-md text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
            }`}>
            <tab.icon className="h-4 w-4" />
            {tab.label}
            {tab.count !== null && (
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                activeTab === tab.key ? (tab.key === 'ai' && tab.count > 0 ? 'bg-emerald-500 text-white' : 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300') : 'bg-muted text-muted-foreground'
              }`}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ══ TAB: ALL CASES ═══════════════════════════════════════════════════ */}
      {activeTab === 'cases' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by ID, reason, order…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 rounded-xl" />
            </div>
            <AdminDateFilter date={dateFilter} onDateChange={setDateFilter} />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 h-9 rounded-xl"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-32 h-9 rounded-xl"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="claim">Claims</SelectItem>
                <SelectItem value="return">Returns</SelectItem>
              </SelectContent>
            </Select>
            {(search || statusFilter !== 'all' || typeFilter !== 'all' || dateFilter) && (
              <Button variant="ghost" size="sm" className="h-9 gap-1.5 text-muted-foreground rounded-xl"
                onClick={() => { setSearch(''); setStatusFilter('all'); setTypeFilter('all'); setDateFilter(undefined); }}>
                <RotateCcw className="h-3.5 w-3.5" /> Clear
              </Button>
            )}
          </div>

          {/* Table */}
          {loadingReturns ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <div className="relative w-12 h-12">
                  <div className="absolute inset-0 rounded-full border-4 border-violet-200" />
                  <div className="absolute inset-0 rounded-full border-4 border-violet-600 border-t-transparent animate-spin" />
                </div>
                <p className="text-sm text-muted-foreground">Loading cases…</p>
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left p-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Type</th>
                      <th className="text-left p-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Product</th>
                      <th className="text-left p-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Reason</th>
                      <th className="text-left p-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Status</th>
                      <th className="text-left p-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">AI</th>
                      <th className="text-left p-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Date</th>
                      <th className="text-left p-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Photos</th>
                      <th className="text-right p-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((r, idx) => {
                      const imgs = getImages(r);
                      const result = aiCache[r.id];
                      const isAna = analyzing.has(r.id);
                      return (
                        <motion.tr key={r.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.02 }} className="hover:bg-muted/20 transition-colors group">
                          <td className="p-3"><TypeChip claim={isClaim(r)} /></td>
                          <td className="p-3 max-w-[130px]">
                            <p className="text-xs font-semibold truncate">{r.products?.title || '—'}</p>
                          </td>
                          <td className="p-3 max-w-[170px]">
                            <p className="text-xs text-muted-foreground truncate">{r.reason?.replace('CLAIM: ', '') || '—'}</p>
                          </td>
                          <td className="p-3"><StatusPill status={r.status} /></td>
                          <td className="p-3">
                            {isAna ? (
                              <span className="flex items-center gap-1 text-[10px] text-violet-600 font-medium">
                                <Loader2 className="h-3 w-3 animate-spin" /> AI…
                              </span>
                            ) : result ? <AiBadge decision={result.decision} /> : <span className="text-[10px] text-muted-foreground">—</span>}
                          </td>
                          <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">{format(new Date(r.created_at), 'dd MMM yy')}</td>
                          <td className="p-3">
                            {imgs.length > 0 ? (
                              <div className="flex gap-1 items-center">
                                {imgs.slice(0,2).map((img: string, i: number) => (
                                  <a key={i} href={img} target="_blank" rel="noopener">
                                    <img src={img} alt="" className="w-8 h-8 rounded-lg object-cover border hover:scale-110 transition-transform" />
                                  </a>
                                ))}
                                {imgs.length > 2 && <span className="text-[10px] text-muted-foreground">+{imgs.length-2}</span>}
                              </div>
                            ) : <span className="text-xs text-muted-foreground/50">—</span>}
                          </td>
                          <td className="p-3 text-right">
                            <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs rounded-lg opacity-70 group-hover:opacity-100 transition-opacity"
                              onClick={() => viewReturn(r)}>
                              <Eye className="h-3 w-3" /> View
                            </Button>
                          </td>
                        </motion.tr>
                      );
                    })}
                    {filtered.length === 0 && (
                      <tr><td colSpan={8} className="text-center py-16 text-muted-foreground">
                        <Shield className="h-10 w-10 mx-auto mb-3 opacity-20" />
                        <p className="text-sm font-medium">No cases found</p>
                        <p className="text-xs mt-1">Try adjusting your filters</p>
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ TAB: AI VALIDATOR ════════════════════════════════════════════════ */}
      {activeTab === 'ai' && (
        <div className="space-y-4">
          {/* Info banner */}
          <div className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 border border-violet-200 dark:border-violet-800 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-violet-100 dark:bg-violet-900/50 rounded-xl shrink-0">
                <Brain className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm text-violet-900 dark:text-violet-100">AI Auto-Validator</p>
                <p className="text-xs text-violet-700 dark:text-violet-300 mt-0.5">
                  AI analyzes every case against product policies and instantly updates the database. Select any case to see full reasoning.
                </p>
                <div className="flex gap-4 mt-2 text-xs text-violet-600 dark:text-violet-400">
                  <span className="flex items-center gap-1"><Check className="h-3 w-3" /> {applied.size} DB Updated</span>
                  <span className="flex items-center gap-1"><Loader2 className="h-3 w-3" /> {pendingAnalysis} Analyzing</span>
                  <span>{returns.length} Total</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-5 gap-4">
            {/* Case list */}
            <div className="lg:col-span-2 space-y-1.5 max-h-[620px] overflow-y-auto pr-1">
              {loadingReturns ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : returns.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Shield className="h-10 w-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No claims or returns</p>
                </div>
              ) : returns.map(r => {
                const result = aiCache[r.id];
                const isAna = analyzing.has(r.id);
                const isApp = applied.has(r.id);
                const isSel = aiSelected === r.id;
                return (
                  <motion.button key={r.id} layout onClick={() => setAiSelected(isSel ? null : r.id)}
                    className={`w-full text-left rounded-2xl border p-3 transition-all ${
                      isSel ? 'border-violet-400 bg-violet-50 dark:bg-violet-950/30 shadow-md' : 'hover:border-violet-200 hover:bg-muted/30 bg-card'
                    }`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                        isAna ? 'bg-violet-100' :
                        result?.decision === 'APPROVED' ? 'bg-emerald-100' :
                        result?.decision === 'REJECTED' ? 'bg-red-100' :
                        result ? 'bg-amber-100' : 'bg-muted'
                      }`}>
                        {isAna ? <Loader2 className="h-3 w-3 text-violet-600 animate-spin" /> :
                         result?.decision === 'APPROVED' ? <Check className="h-3 w-3 text-emerald-600" /> :
                         result?.decision === 'REJECTED' ? <XCircle className="h-3 w-3 text-red-600" /> :
                         result ? <AlertCircle className="h-3 w-3 text-amber-600" /> :
                         <Shield className="h-3 w-3 text-muted-foreground" />}
                      </div>
                      <span className="text-xs font-semibold truncate flex-1">{r.products?.title || 'Unknown Product'}</span>
                      {isApp && <Check className="h-3 w-3 text-emerald-500 shrink-0" />}
                      <ChevronRight className={`h-3 w-3 text-muted-foreground shrink-0 transition-transform ${isSel ? 'rotate-90' : ''}`} />
                    </div>
                    <div className="flex items-center gap-2 pl-8">
                      {result ? <AiBadge decision={result.decision} /> :
                       isAna ? <span className="text-[10px] text-violet-600 font-medium">Analyzing…</span> :
                       <span className="text-[10px] text-muted-foreground border border-muted-foreground/20 rounded-full px-2 py-0.5">Queued</span>}
                      <TypeChip claim={isClaim(r)} />
                    </div>
                    {result?.aiOpinion && (
                      <p className="text-[10px] text-muted-foreground pl-8 mt-1 line-clamp-1">{result.aiOpinion}</p>
                    )}
                    <div className="pl-8 mt-1 flex items-center gap-2">
                      <StatusPill status={r.status} />
                      {isApp && <span className="text-[9px] text-emerald-600 font-bold">✓ DB Updated</span>}
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* AI detail */}
            <div className="lg:col-span-3">
              <AnimatePresence mode="wait">
                {aiSelected && aiSelectedReturn ? (
                  <motion.div key={aiSelected} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="space-y-3">
                    {/* Case card */}
                    <div className="bg-card border rounded-2xl p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <p className="font-bold text-sm">{aiSelectedReturn.products?.title || 'Unknown Product'}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(aiSelectedReturn.created_at), 'dd MMM yyyy')}</p>
                        </div>
                        <div className="flex gap-2">
                          <StatusPill status={aiSelectedReturn.status} />
                          <TypeChip claim={isClaim(aiSelectedReturn)} />
                        </div>
                      </div>
                      <p className="text-xs bg-muted/30 rounded-xl p-2.5">{aiSelectedReturn.reason?.replace('CLAIM: ', '') || '—'}{aiSelectedReturn.description && ` · ${aiSelectedReturn.description}`}</p>
                      {getImages(aiSelectedReturn).length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                          {getImages(aiSelectedReturn).map((img: string, i: number) => (
                            <a key={i} href={img} target="_blank" rel="noopener">
                              <img src={img} alt="" className="w-14 h-14 rounded-xl object-cover border hover:scale-105 transition-transform" />
                            </a>
                          ))}
                        </div>
                      )}
                      {aiSelectedReturn.products?.claim_policy && (
                        <div className="text-[11px] bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 rounded-xl p-2.5">
                          <span className="font-bold text-violet-700 dark:text-violet-300">Policy: </span>
                          <span className="text-violet-900 dark:text-violet-200">{aiSelectedReturn.products.claim_policy}</span>
                        </div>
                      )}
                      {aiSelectedReturn.admin_notes && (
                        <div className="text-[11px] bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 rounded-xl p-2.5">
                          <span className="font-bold text-emerald-700">📝 DB: </span>
                          <span className="text-emerald-900 dark:text-emerald-200">{aiSelectedReturn.admin_notes}</span>
                        </div>
                      )}
                    </div>

                    {/* AI result */}
                    {analyzing.has(aiSelected) ? (
                      <div className="flex flex-col items-center justify-center gap-3 py-12 bg-card border rounded-2xl">
                        <motion.div animate={{ scale: [1,1.2,1], rotate: [0,5,-5,0] }} transition={{ repeat: Infinity, duration: 1.6 }}>
                          <Brain className="h-10 w-10 text-violet-600" />
                        </motion.div>
                        <p className="text-sm text-muted-foreground font-medium">AI reviewing and updating database…</p>
                      </div>
                    ) : aiSelectedResult ? (
                      <div className={`rounded-2xl border p-4 space-y-4 ${
                        aiSelectedResult.decision === 'APPROVED' ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200' :
                        aiSelectedResult.decision === 'REJECTED' ? 'bg-red-50 dark:bg-red-950/20 border-red-200' :
                        'bg-amber-50 dark:bg-amber-950/20 border-amber-200'
                      }`}>
                        <div className="flex items-center gap-3">
                          {aiSelectedResult.decision === 'APPROVED' ? <div className="p-2 bg-emerald-100 rounded-xl"><CheckCircle className="h-6 w-6 text-emerald-600" /></div> :
                           aiSelectedResult.decision === 'REJECTED' ? <div className="p-2 bg-red-100 rounded-xl"><XCircle className="h-6 w-6 text-red-600" /></div> :
                           <div className="p-2 bg-amber-100 rounded-xl"><AlertCircle className="h-6 w-6 text-amber-600" /></div>}
                          <div className="flex-1">
                            <p className="font-black text-xl tracking-tight">{aiSelectedResult.decision}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex-1 h-1.5 bg-black/10 rounded-full overflow-hidden">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${aiSelectedResult.confidence}%` }}
                                  className="h-full bg-current rounded-full" />
                              </div>
                              <span className="text-xs font-semibold">{aiSelectedResult.confidence}%</span>
                            </div>
                          </div>
                          <span className={`text-xs font-bold px-3 py-1.5 rounded-xl shrink-0 ${
                            aiSelectedResult.refundAmount === 'full' ? 'bg-emerald-600 text-white' :
                            aiSelectedResult.refundAmount === 'partial' ? 'bg-amber-500 text-white' : 'bg-muted text-muted-foreground'
                          }`}>
                            {aiSelectedResult.refundAmount === 'full' ? '💯 Full' :
                             aiSelectedResult.refundAmount === 'partial' ? `${aiSelectedResult.partialRefundPercent}%` : 'No Refund'}
                          </span>
                        </div>

                        {aiSelectedResult.aiOpinion && (
                          <p className="text-sm bg-white/60 dark:bg-black/20 rounded-xl p-3 font-medium">💬 {aiSelectedResult.aiOpinion}</p>
                        )}

                        <div className="grid sm:grid-cols-2 gap-3">
                          <div className="bg-white/40 dark:bg-black/10 rounded-xl p-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Reasoning</p>
                            <p className="text-xs">{aiSelectedResult.reasoning}</p>
                          </div>
                          <div className="bg-white/40 dark:bg-black/10 rounded-xl p-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Recommendation</p>
                            <p className="text-xs">{aiSelectedResult.recommendation}</p>
                          </div>
                        </div>

                        {aiSelectedResult.flaggedIssues?.length > 0 && (
                          <div className="bg-amber-100/60 dark:bg-amber-950/30 rounded-xl p-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 mb-1.5">⚠ Flagged Issues</p>
                            {aiSelectedResult.flaggedIssues.map((f: string, i: number) => <p key={i} className="text-xs text-amber-800">• {f}</p>)}
                          </div>
                        )}

                        <div className="flex gap-2 flex-wrap">
                          <Button size="sm" className="gap-2 rounded-xl"
                            onClick={() => applyDecision(aiSelectedReturn, aiSelectedResult)}
                            disabled={applying.has(aiSelected) || applied.has(aiSelected)}>
                            {applying.has(aiSelected) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> :
                             applied.has(aiSelected) ? <Check className="h-3.5 w-3.5" /> : <Database className="h-3.5 w-3.5" />}
                            {applied.has(aiSelected) ? 'Applied ✓' : 'Apply to DB'}
                          </Button>
                          <Button variant="outline" size="sm" className="gap-2 rounded-xl" onClick={() => reAnalyze(aiSelectedReturn)}>
                            <RefreshCw className="h-3.5 w-3.5" /> Re-analyze
                          </Button>
                          <Button variant="ghost" size="sm" className="gap-2 rounded-xl text-muted-foreground"
                            onClick={() => { viewReturn(aiSelectedReturn); setActiveTab('cases'); }}>
                            <Eye className="h-3.5 w-3.5" /> Full Details
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 bg-card border rounded-2xl text-muted-foreground">
                        <Brain className="h-10 w-10 mb-3 opacity-20" />
                        <p className="text-sm font-medium">Analysis not yet available</p>
                        <Button size="sm" variant="outline" className="mt-3 gap-2 rounded-xl" onClick={() => reAnalyze(aiSelectedReturn)}>
                          <Sparkles className="h-3.5 w-3.5" /> Analyze Now
                        </Button>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center h-72 text-muted-foreground bg-card border border-dashed rounded-2xl">
                    <Brain className="h-12 w-12 mb-3 opacity-15" />
                    <p className="text-sm font-medium">Select a case to see AI analysis</p>
                    <p className="text-xs mt-1">AI automatically analyzes all new cases</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}

      {/* ══ TAB: ANALYTICS ═══════════════════════════════════════════════════ */}
      {activeTab === 'analytics' && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { icon: '✅', label: 'Approval Rate', value: `${stats.total > 0 ? Math.round(stats.approved/stats.total*100) : 0}%`, sub: `${stats.approved} approved of ${stats.total}`, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200' },
              { icon: '⏳', label: 'Pending Action', value: String(stats.pending), sub: 'cases require your decision', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200' },
              { icon: '🤖', label: 'AI Processed', value: String(applied.size), sub: `of ${returns.length} total cases`, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-950/20 border-violet-200' },
            ].map(card => (
              <div key={card.label} className={`rounded-2xl border p-4 ${card.bg}`}>
                <p className="text-2xl mb-2">{card.icon}</p>
                <p className={`text-3xl font-black ${card.color}`}>{card.value}</p>
                <p className="text-xs font-semibold text-muted-foreground mt-1">{card.label}</p>
                <p className="text-[10px] text-muted-foreground">{card.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="bg-card border rounded-2xl p-4">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-violet-600" /> Monthly Trend</h3>
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={monthlyData} barSize={12}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12 }} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="approved" fill="#10b981" radius={[4,4,0,0]} name="Approved" />
                    <Bar dataKey="rejected" fill="#ef4444" radius={[4,4,0,0]} name="Rejected" />
                    <Bar dataKey="pending" fill="#f59e0b" radius={[4,4,0,0]} name="Pending" />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Not enough data</div>}
            </div>

            <div className="bg-card border rounded-2xl p-4">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-violet-600" /> Status Breakdown</h3>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false} style={{ fontSize: 10 }}>
                      {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">No data</div>}
            </div>
          </div>

          <div className="bg-card border rounded-2xl p-4">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2"><Star className="h-4 w-4 text-violet-600" /> Top Reasons</h3>
            <div className="space-y-2.5">
              {topReasons.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No data yet</p>}
              {topReasons.map(([reason, count], i) => (
                <div key={reason} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground w-4">#{i+1}</span>
                  <span className="text-xs flex-1 truncate font-medium">{reason}</span>
                  <div className="w-24 bg-muted rounded-full h-2 overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${(count / (topReasons[0]?.[1] || 1)) * 100}%` }}
                      className="h-full bg-violet-500 rounded-full" />
                  </div>
                  <span className="text-xs font-black w-6 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {stats.pending > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 rounded-2xl p-4">
              <h3 className="text-sm font-bold text-amber-800 dark:text-amber-300 mb-3">⏳ {stats.pending} Cases Awaiting Decision</h3>
              <div className="space-y-2">
                {returns.filter(r => r.status === 'pending').slice(0,5).map(r => (
                  <div key={r.id} className="flex items-center gap-3 bg-white/70 dark:bg-black/20 rounded-xl p-2.5">
                    <TypeChip claim={isClaim(r)} />
                    <span className="text-xs flex-1 truncate font-medium">{r.reason?.replace('CLAIM: ', '') || '—'}</span>
                    <span className="text-xs text-muted-foreground">{format(new Date(r.created_at), 'dd MMM')}</span>
                    <Button size="sm" variant="outline" className="h-6 text-xs gap-1 rounded-lg shrink-0"
                      onClick={() => { viewReturn(r); setActiveTab('cases'); }}>
                      <Eye className="h-3 w-3" /> Review
                    </Button>
                  </div>
                ))}
                {stats.pending > 5 && <p className="text-xs text-amber-700 text-center pt-1">+{stats.pending-5} more — go to All Cases tab</p>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ DETAIL DIALOG ════════════════════════════════════════════════════ */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              {isClaim(selected) ? <div className="p-1.5 bg-violet-100 rounded-lg"><Shield className="h-4 w-4 text-violet-700" /></div>
               : <div className="p-1.5 bg-orange-100 rounded-lg"><RotateCcw className="h-4 w-4 text-orange-700" /></div>}
              {isClaim(selected) ? 'Warranty Claim' : 'Return Request'} Detail
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              {/* Meta grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: 'Status', content: <StatusPill status={selected.status} /> },
                  { label: 'Type', content: <TypeChip claim={isClaim(selected)} /> },
                  { label: 'Date', content: <span className="text-xs font-semibold">{format(new Date(selected.created_at), 'dd MMM yyyy')}</span> },
                  { label: 'Order', content: <span className="text-xs font-semibold font-mono">#{order?.order_number || selected.order_id?.slice(0,8)}</span> },
                ].map(m => (
                  <div key={m.label} className="bg-muted/30 rounded-xl p-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{m.label}</p>
                    {m.content}
                  </div>
                ))}
              </div>

              {/* Reason */}
              <div className="bg-muted/20 rounded-xl p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Reason</p>
                <p className="text-sm font-medium">{selected.reason?.replace('CLAIM: ', '') || '—'}</p>
                {selected.description && <p className="text-xs text-muted-foreground mt-1">{selected.description}</p>}
              </div>

              {/* Images */}
              {getImages(selected).length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Evidence Photos</p>
                  <div className="flex gap-2 flex-wrap">
                    {getImages(selected).map((img: string, i: number) => (
                      <a key={i} href={img} target="_blank" rel="noopener">
                        <img src={img} alt="" className="w-24 h-24 object-cover rounded-2xl border hover:scale-105 transition-transform" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Products */}
              {orderItems.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Products in Order</p>
                  {orderItems.map((item: any) => {
                    const prod = productDetails?.find((p: any) => p.id === item.product_id);
                    return (
                      <div key={item.id} className="bg-muted/20 rounded-xl p-3 mb-2 border">
                        <div className="flex items-center gap-3">
                          <img src={item.image || (prod?.images as any)?.[0] || '/placeholder.svg'} alt=""
                            className="w-16 h-16 rounded-xl object-cover border shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold truncate">{item.title}</p>
                              {prod && <Link to={`/product/${prod.id}`} target="_blank" className="text-violet-500 shrink-0"><ExternalLink className="h-3 w-3" /></Link>}
                            </div>
                            <p className="text-xs text-muted-foreground">{[item.size && `Size ${item.size}`, item.color && `Color: ${item.color}`, `Qty: ${item.quantity}`].filter(Boolean).join(' · ')}</p>
                            <p className="text-sm font-bold text-violet-600">Rs. {Number(item.price).toLocaleString()}</p>
                          </div>
                        </div>
                        {prod && (prod.return_policy || prod.claim_duration || prod.claim_policy) && (
                          <div className="mt-2 pt-2 border-t text-xs space-y-0.5 text-muted-foreground">
                            {prod.return_policy && <p><span className="font-semibold text-foreground">Return: </span>{prod.return_policy}</p>}
                            {prod.claim_duration && <p><span className="font-semibold text-foreground">Claim Duration: </span>{prod.claim_duration}</p>}
                            {prod.claim_policy && <p><span className="font-semibold text-foreground">Policy: </span>{prod.claim_policy}</p>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* AI Review */}
              <Button variant="outline" onClick={dialogAiReview} disabled={dialogAiChecking} className="w-full gap-2 rounded-xl">
                {dialogAiChecking ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing…</> : <><Brain className="h-4 w-4" /> Get AI Recommendation</>}
              </Button>
              {selected.ai_recommendation && (
                <div className="bg-violet-50 dark:bg-violet-950/30 border border-violet-200 rounded-xl p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-violet-700 mb-1.5">🤖 AI Recommendation</p>
                  <p className="text-sm whitespace-pre-wrap text-violet-900 dark:text-violet-200 leading-relaxed">{selected.ai_recommendation}</p>
                </div>
              )}

              {/* Admin actions — Enter key navigation */}
              <div className="space-y-3 border-t pt-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Admin Decision</p>
                <div>
                  <Label className="text-xs font-semibold">Admin Notes</Label>
                  <Textarea id="dialog-admin-notes" value={adminNotes} onChange={e => setAdminNotes(e.target.value)} rows={2}
                    placeholder="Optional notes…" className="mt-1 text-sm rounded-xl"
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); document.getElementById('dialog-refund-amount')?.focus(); } }} />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Refund Amount (Rs.)</Label>
                  <Input id="dialog-refund-amount" value={refundAmount} onChange={e => setRefundAmount(e.target.value)}
                    className="mt-1 h-9 rounded-xl" type="number" placeholder="0"
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('dialog-approve-btn')?.click(); } }} />
                  <p className="text-[10px] text-muted-foreground mt-1">Press Enter to approve · Shift+Enter in notes to move here</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Button id="dialog-approve-btn" disabled={savingStatus} onClick={() => updateStatus(selected.id, 'approved')}
                    className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
                    <CheckCircle className="h-4 w-4" /> Approve
                  </Button>
                  <Button disabled={savingStatus} variant="destructive" onClick={() => updateStatus(selected.id, 'rejected')}
                    className="gap-1.5 rounded-xl">
                    <XCircle className="h-4 w-4" /> Reject
                  </Button>
                  <Button disabled={savingStatus} variant="outline" onClick={() => updateStatus(selected.id, 'refunded')}
                    className="gap-1.5 rounded-xl">
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
