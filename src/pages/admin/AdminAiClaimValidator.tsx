import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, Loader2, CheckCircle, XCircle, AlertCircle, RefreshCw, ChevronRight, Brain, Check, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/hooks/use-toast';

const CACHE_KEY = 'ai_claim_cache_v2';

function loadCache(): Record<string, any> {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch { return {}; }
}
function saveCache(c: Record<string, any>) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch {}
}

function buildPrompt(r: any) {
  const claimPolicy = r.products?.claim_policy || 'Standard: Manufacturing defects within 30 days qualify. Normal wear does not.';
  const claimDuration = r.products?.claim_duration || 'Not set';
  const allImages = r.images || [];
  return `You are an AI claim validator for ${r.products?.title ? `"${r.products.title}"` : 'a shoe store'} in Pakistan.

PRODUCT CLAIM POLICY: ${claimPolicy}
CLAIM DURATION: ${claimDuration}
RETURN REASON: ${r.reason || 'Not specified'}
CUSTOMER NOTE: ${r.description || 'None'}
IMAGES PROVIDED: ${allImages.length}
${allImages[0] ? `EVIDENCE IMAGE: ${allImages[0]}` : ''}

Respond ONLY with valid JSON:
{"decision":"APPROVED"|"REJECTED"|"NEEDS_REVIEW","confidence":0-100,"reasoning":"brief","recommendation":"admin action","refundAmount":"full"|"partial"|"none","partialRefundPercent":0,"flaggedIssues":[],"aiOpinion":"1-2 sentence plain summary for admin"}`;
}

function DecisionBadge({ decision }: { decision: string }) {
  if (decision === 'APPROVED') return <Badge className="bg-green-100 text-green-800 border border-green-200 text-[10px]">✅ APPROVED</Badge>;
  if (decision === 'REJECTED')  return <Badge className="bg-red-100 text-red-800 border border-red-200 text-[10px]">❌ REJECTED</Badge>;
  return <Badge className="bg-orange-100 text-orange-800 border border-orange-200 text-[10px]">🔍 NEEDS REVIEW</Badge>;
}

const DECISION_TO_STATUS: Record<string, string> = {
  'APPROVED': 'approved',
  'REJECTED': 'rejected',
  'NEEDS_REVIEW': 'pending',
};

export default function AdminAiClaimValidator() {
  const [returns, setReturns] = useState<any[]>([]);
  const [cache, setCache] = useState<Record<string, any>>(loadCache());
  const [analyzing, setAnalyzing] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState<Set<string>>(new Set());
  const [applied, setApplied] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);
  const [loadingReturns, setLoadingReturns] = useState(true);
  const queueRef = useRef<any[]>([]);
  const runningRef = useRef(false);

  const fetchReturns = async () => {
    setLoadingReturns(true);
    const { data } = await supabase
      .from('returns')
      .select('*, products(title, claim_policy, claim_duration)')
      .order('created_at', { ascending: false })
      .limit(40);
    setLoadingReturns(false);
    if (!data) return;
    setReturns(data);
    const toAnalyze = data.filter(r => !cache[r.id]);
    queueRef.current = toAnalyze;
    runQueue();
  };

  const analyzeOne = async (r: any) => {
    setAnalyzing(prev => new Set(prev).add(r.id));
    try {
      const { data } = await supabase.functions.invoke('ai-assistant', {
        body: {
          type: 'claim-validator',
          imageUrl: r.images?.[0] || null,
          messages: [{ role: 'user', content: buildPrompt(r) }],
        },
      });
      let parsed = data;
      if (typeof data === 'string') {
        const m = data.match(/\{[\s\S]*\}/);
        if (m) parsed = JSON.parse(m[0]);
      }
      if (parsed?.decision) {
        const newStatus = DECISION_TO_STATUS[parsed.decision] || r.status;
        const adminNote = `AI Decision: ${parsed.decision} (${parsed.confidence}% confidence) — ${parsed.aiOpinion || parsed.reasoning}`;
        await supabase.from('returns').update({
          status: newStatus as any,
          admin_notes: adminNote,
        }).eq('id', r.id);
        setReturns(prev => prev.map(ret => ret.id === r.id ? { ...ret, status: newStatus, admin_notes: adminNote } : ret));
        setApplied(prev => new Set(prev).add(r.id));
        setCache(prev => {
          const next = { ...prev, [r.id]: parsed };
          saveCache(next);
          return next;
        });
      }
    } catch {}
    setAnalyzing(prev => { const s = new Set(prev); s.delete(r.id); return s; });
  };

  const runQueue = async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    while (queueRef.current.length > 0) {
      const batch = queueRef.current.splice(0, 3);
      await Promise.all(batch.map(analyzeOne));
    }
    runningRef.current = false;
  };

  const reAnalyze = (r: any) => {
    setCache(prev => { const n = { ...prev }; delete n[r.id]; saveCache(n); return n; });
    setApplied(prev => { const n = new Set(prev); n.delete(r.id); return n; });
    queueRef.current = [r];
    runQueue();
  };

  const applyDecision = async (r: any, result: any) => {
    if (!result?.decision) return;
    setApplying(prev => new Set(prev).add(r.id));
    const newStatus = DECISION_TO_STATUS[result.decision] || r.status;
    const adminNote = `AI Decision: ${result.decision} (${result.confidence}% confidence) — ${result.aiOpinion || result.reasoning}`;
    const { error } = await supabase.from('returns').update({
      status: newStatus as any,
      admin_notes: adminNote,
    }).eq('id', r.id);
    if (!error) {
      setReturns(prev => prev.map(ret => ret.id === r.id ? { ...ret, status: newStatus, admin_notes: adminNote } : ret));
      setApplied(prev => new Set(prev).add(r.id));
      toast({ title: `✅ Decision Applied: ${result.decision}`, description: `Status updated to "${newStatus}" in database` });
    } else {
      toast({ title: 'Failed to apply decision', variant: 'destructive' });
    }
    setApplying(prev => { const s = new Set(prev); s.delete(r.id); return s; });
  };

  useEffect(() => { fetchReturns(); }, []);

  const pendingCount = analyzing.size;
  const selectedReturn = returns.find(r => r.id === selected);
  const selectedResult = selected ? cache[selected] : null;

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" /> AI Claim Validator
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            AI auto-analyzes claims and updates status in database.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchReturns} disabled={loadingReturns} className="gap-2">
          <RefreshCw className={`h-3.5 w-3.5 ${loadingReturns ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {pendingCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl px-4 py-3"
        >
          <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
          <p className="text-sm text-primary font-medium">
            AI is analyzing {pendingCount} claim{pendingCount !== 1 ? 's' : ''} and updating database…
          </p>
        </motion.div>
      )}

      <div className="grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2 space-y-2">
          {loadingReturns ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : returns.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Shield className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No return requests found</p>
            </div>
          ) : returns.map(r => {
            const result = cache[r.id];
            const isAnalyzing = analyzing.has(r.id);
            const isApplied = applied.has(r.id);
            const isSelected = selected === r.id;
            return (
              <motion.button
                key={r.id}
                layout
                onClick={() => setSelected(isSelected ? null : r.id)}
                className={`w-full text-left rounded-xl border p-3 transition-all ${isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'hover:border-primary/40 hover:bg-muted/30'}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {isAnalyzing ? (
                    <Loader2 className="h-3.5 w-3.5 text-primary animate-spin shrink-0" />
                  ) : result ? (
                    result.decision === 'APPROVED' ? <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" /> :
                    result.decision === 'REJECTED' ? <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" /> :
                    <AlertCircle className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                  ) : (
                    <Shield className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  )}
                  <span className="text-xs font-medium truncate flex-1">{r.products?.title || 'Unknown Product'}</span>
                  {isApplied && <Check className="h-3 w-3 text-green-500 shrink-0" title="Applied to DB" />}
                  <ChevronRight className={`h-3 w-3 text-muted-foreground transition-transform shrink-0 ${isSelected ? 'rotate-90' : ''}`} />
                </div>
                <div className="flex items-center gap-2 ml-5">
                  {result ? (
                    <DecisionBadge decision={result.decision} />
                  ) : isAnalyzing ? (
                    <Badge variant="outline" className="text-[10px] text-primary border-primary/30">Analyzing…</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">Pending</Badge>
                  )}
                  <span className="text-[10px] text-muted-foreground truncate">{r.reason}</span>
                </div>
                {result?.aiOpinion && (
                  <p className="text-[10px] text-muted-foreground ml-5 mt-1 line-clamp-1">{result.aiOpinion}</p>
                )}
                <div className="ml-5 mt-1 flex items-center gap-1.5">
                  <Badge variant="outline" className="text-[9px] px-1 py-0">{r.status}</Badge>
                  {isApplied && <span className="text-[9px] text-green-600 font-medium">✓ DB Updated</span>}
                </div>
              </motion.button>
            );
          })}
        </div>

        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            {selected && selectedReturn ? (
              <motion.div
                key={selected}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-4"
              >
                <div className="bg-card border rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">{selectedReturn.products?.title || 'Unknown Product'}</h3>
                    <Badge variant="outline" className="text-[10px]">{selectedReturn.status}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Reason:</span> {selectedReturn.reason}</div>
                    <div><span className="text-muted-foreground">Order:</span> #{selectedReturn.order_id?.slice(0, 8)}</div>
                  </div>
                  {selectedReturn.description && (
                    <p className="text-xs bg-muted/30 rounded-lg p-2">{selectedReturn.description}</p>
                  )}
                  {selectedReturn.images?.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {selectedReturn.images.map((img: string, i: number) => (
                        <a key={i} href={img} target="_blank" rel="noopener">
                          <img src={img} alt="" className="w-14 h-14 rounded-lg object-cover border hover:opacity-80 transition" />
                        </a>
                      ))}
                    </div>
                  )}
                  {selectedReturn.products?.claim_policy && (
                    <div className="text-[11px] bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-lg p-2">
                      <span className="font-semibold text-blue-700 dark:text-blue-300">Policy: </span>
                      <span className="text-blue-900 dark:text-blue-200">{selectedReturn.products.claim_policy}</span>
                    </div>
                  )}
                  {selectedReturn.admin_notes && (
                    <div className="text-[11px] bg-green-50 border border-green-100 rounded-lg p-2">
                      <span className="font-semibold text-green-700">DB Note: </span>
                      <span className="text-green-900">{selectedReturn.admin_notes}</span>
                    </div>
                  )}
                </div>

                {analyzing.has(selected) ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-10 bg-card border rounded-xl">
                    <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 1.4 }}>
                      <Brain className="h-8 w-8 text-primary" />
                    </motion.div>
                    <p className="text-sm text-muted-foreground">AI is reviewing this claim and updating database…</p>
                  </div>
                ) : selectedResult ? (
                  <div className={`rounded-xl border p-4 space-y-4 ${
                    selectedResult.decision === 'APPROVED' ? 'bg-green-50 dark:bg-green-950/20 border-green-200' :
                    selectedResult.decision === 'REJECTED' ? 'bg-red-50 dark:bg-red-950/20 border-red-200' :
                    'bg-orange-50 dark:bg-orange-950/20 border-orange-200'
                  }`}>
                    <div className="flex items-center gap-3">
                      {selectedResult.decision === 'APPROVED' ? <CheckCircle className="h-6 w-6 text-green-600" /> :
                       selectedResult.decision === 'REJECTED' ? <XCircle className="h-6 w-6 text-red-600" /> :
                       <AlertCircle className="h-6 w-6 text-orange-600" />}
                      <div className="flex-1">
                        <p className="font-bold text-lg">{selectedResult.decision}</p>
                        <p className="text-xs text-muted-foreground">AI Confidence: {selectedResult.confidence}%</p>
                      </div>
                      <Badge className={
                        selectedResult.refundAmount === 'full' ? 'bg-green-600 text-white' :
                        selectedResult.refundAmount === 'partial' ? 'bg-orange-500 text-white' : 'bg-gray-400 text-white'
                      }>
                        {selectedResult.refundAmount === 'full' ? 'Full Refund' :
                         selectedResult.refundAmount === 'partial' ? `${selectedResult.partialRefundPercent}% Refund` : 'No Refund'}
                      </Badge>
                    </div>

                    {selectedResult.aiOpinion && (
                      <div className="bg-white/60 dark:bg-black/20 rounded-lg p-3 text-sm font-medium">
                        💬 {selectedResult.aiOpinion}
                      </div>
                    )}

                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="font-semibold text-xs uppercase tracking-wide mb-1 text-muted-foreground">Reasoning</p>
                        <p>{selectedResult.reasoning}</p>
                      </div>
                      {selectedResult.flaggedIssues?.length > 0 && (
                        <div>
                          <p className="font-semibold text-xs uppercase tracking-wide mb-1 text-orange-700">⚠ Flagged</p>
                          <ul className="space-y-0.5">{selectedResult.flaggedIssues.map((f: string, i: number) => <li key={i} className="text-xs text-orange-700">• {f}</li>)}</ul>
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-xs uppercase tracking-wide mb-1 text-muted-foreground">Recommendation</p>
                        <p className="text-xs">{selectedResult.recommendation}</p>
                      </div>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        className="gap-2"
                        onClick={() => applyDecision(selectedReturn, selectedResult)}
                        disabled={applying.has(selected) || applied.has(selected)}
                      >
                        {applying.has(selected) ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : applied.has(selected) ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Database className="h-3.5 w-3.5" />
                        )}
                        {applied.has(selected) ? 'Applied to DB ✓' : 'Apply Decision to DB'}
                      </Button>
                      <Button variant="outline" size="sm" className="gap-2" onClick={() => reAnalyze(selectedReturn)}>
                        <RefreshCw className="h-3.5 w-3.5" /> Re-analyze
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 bg-card border rounded-xl text-muted-foreground">
                    <Shield className="h-8 w-8 mb-2 opacity-30" />
                    <p className="text-sm">Analysis not available yet</p>
                    <Button size="sm" variant="outline" className="mt-3 gap-2" onClick={() => reAnalyze(selectedReturn)}>
                      <Brain className="h-3.5 w-3.5" /> Analyze Now
                    </Button>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-48 text-muted-foreground"
              >
                <Shield className="h-10 w-10 mb-3 opacity-20" />
                <p className="text-sm">Select a claim to see AI analysis</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
