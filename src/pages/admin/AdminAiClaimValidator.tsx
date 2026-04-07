import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Shield, Loader2, CheckCircle, XCircle, AlertCircle, Upload } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function AdminAiClaimValidator() {
  const [returns, setReturns] = useState<any[]>([]);
  const [selectedReturn, setSelectedReturn] = useState<any>(null);
  const [extraImages, setExtraImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('returns').select('*, products(title, claim_policy)').order('created_at', { ascending: false }).limit(50)
      .then(({ data }) => setReturns(data || []));

    const saved = localStorage.getItem('ai_claim_history');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setUploading(true);
    const urls: string[] = [...extraImages];
    for (const file of Array.from(files)) {
      const path = `claim-validator/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from('returns').upload(path, file);
      if (!error) {
        const { data } = supabase.storage.from('returns').getPublicUrl(path);
        urls.push(data.publicUrl);
      }
    }
    setExtraImages(urls);
    setUploading(false);
  };

  const validate = async () => {
    if (!selectedReturn) {
      toast({ title: 'Select a return request first', variant: 'destructive' });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const allImages = [
        ...(selectedReturn.images || []),
        ...extraImages,
      ];

      const claimPolicy = selectedReturn.products?.claim_policy ||
        'Standard: Manufacturing defects within 30 days qualify for claim. Normal wear and tear does not.';

      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          type: 'claim-validator',
          imageUrl: allImages[0] || null,
          messages: [{
            role: 'user',
            content: `You are an AI claim validator for Stopy Shoes, a Pakistani shoe store.

ADMIN CLAIM INSTRUCTIONS (Product Policy):
${claimPolicy}

CUSTOMER CLAIM DETAILS:
- Return Reason: ${selectedReturn.reason || 'Not specified'}
- Customer Description: ${selectedReturn.description || 'No description'}
- Product: ${selectedReturn.products?.title || 'Unknown'}
- Order ID: ${selectedReturn.order_id}
- Images Provided: ${allImages.length} image(s)
${allImages.length > 0 ? `- First Image URL: ${allImages[0]}` : ''}

Analyze the claim and return a JSON response:
{
  "decision": "APPROVED" | "REJECTED" | "NEEDS_REVIEW",
  "confidence": 85,
  "reasoning": "Detailed explanation of decision",
  "evidenceFound": ["Evidence point 1", "Evidence point 2"],
  "policyMatch": true,
  "recommendation": "What action admin should take",
  "flaggedIssues": ["Any suspicious patterns or missing evidence"],
  "refundAmount": "full" | "partial" | "none",
  "partialRefundPercent": 0
}

Be strict but fair. If images show clear defects matching the claim policy, approve. If images don't match the complaint or show misuse, reject.
Return ONLY valid JSON.`
          }],
        },
      });

      if (error) throw error;
      let parsed = data;
      if (typeof data === 'string') {
        const m = data.match(/\{[\s\S]*\}/);
        if (m) parsed = JSON.parse(m[0]);
      }
      setResult(parsed);

      const entry = {
        id: selectedReturn.id,
        returnId: selectedReturn.id,
        productTitle: selectedReturn.products?.title,
        decision: parsed.decision,
        confidence: parsed.confidence,
        timestamp: new Date().toISOString(),
        result: parsed,
      };
      const newHistory = [entry, ...history].slice(0, 20);
      setHistory(newHistory);
      localStorage.setItem('ai_claim_history', JSON.stringify(newHistory));

      toast({ title: `AI Decision: ${parsed.decision}` });
    } catch (e: any) {
      toast({ title: 'AI Error', description: e.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  const getDecisionIcon = (decision: string) => {
    if (decision === 'APPROVED') return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (decision === 'REJECTED') return <XCircle className="h-5 w-5 text-destructive" />;
    return <AlertCircle className="h-5 w-5 text-orange-500" />;
  };

  const getDecisionColor = (decision: string) => {
    if (decision === 'APPROVED') return 'bg-green-100 text-green-800 border-green-200';
    if (decision === 'REJECTED') return 'bg-red-100 text-red-800 border-red-200';
    return 'bg-orange-100 text-orange-800 border-orange-200';
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" /> AI Visual Claim Validator
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          AI reviews customer return photos against your product's claim policy and decides validity automatically.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left: Input */}
        <div className="space-y-4">
          <div className="bg-card rounded-xl border p-4 space-y-4">
            <Label className="text-base font-semibold">📋 Select Return Request</Label>
            <Select onValueChange={v => {
              const r = returns.find(r => r.id === v);
              setSelectedReturn(r || null);
              setResult(null);
            }}>
              <SelectTrigger><SelectValue placeholder="Select a return request..." /></SelectTrigger>
              <SelectContent>
                {returns.map(r => (
                  <SelectItem key={r.id} value={r.id}>
                    #{r.id.slice(0, 8)} — {r.products?.title || 'Unknown'} — {r.status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedReturn && (
              <div className="bg-muted/30 rounded-lg p-3 space-y-2 text-sm">
                <p><span className="text-muted-foreground">Product:</span> {selectedReturn.products?.title}</p>
                <p><span className="text-muted-foreground">Reason:</span> {selectedReturn.reason}</p>
                <p><span className="text-muted-foreground">Status:</span> <Badge variant="outline">{selectedReturn.status}</Badge></p>
                {selectedReturn.description && (
                  <p><span className="text-muted-foreground">Description:</span> {selectedReturn.description}</p>
                )}
                {selectedReturn.images?.length > 0 && (
                  <div>
                    <p className="text-muted-foreground mb-1">Customer Photos:</p>
                    <div className="flex gap-2 flex-wrap">
                      {selectedReturn.images.map((img: string, i: number) => (
                        <img key={i} src={img} alt="" className="w-16 h-16 rounded-lg object-cover border" />
                      ))}
                    </div>
                  </div>
                )}
                {selectedReturn.products?.claim_policy && (
                  <div className="border-t pt-2">
                    <p className="text-muted-foreground text-xs font-medium">Claim Policy:</p>
                    <p className="text-xs">{selectedReturn.products.claim_policy}</p>
                  </div>
                )}
              </div>
            )}

            <div>
              <Label className="text-sm">Add Additional Evidence Photos</Label>
              <label className="mt-2 w-full border-2 border-dashed rounded-lg p-3 flex items-center justify-center gap-2 cursor-pointer hover:bg-accent text-sm text-muted-foreground">
                <Upload className="h-4 w-4" /> Upload more photos
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
              </label>
              {uploading && <p className="text-xs text-muted-foreground mt-1">Uploading...</p>}
              {extraImages.length > 0 && (
                <div className="flex gap-2 flex-wrap mt-2">
                  {extraImages.map((img, i) => (
                    <img key={i} src={img} alt="" className="w-14 h-14 rounded object-cover border" />
                  ))}
                </div>
              )}
            </div>

            <Button onClick={validate} disabled={loading || !selectedReturn} className="w-full gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
              {loading ? 'AI Validating...' : 'Validate Claim with AI'}
            </Button>
          </div>
        </div>

        {/* Right: Result */}
        <div className="space-y-4">
          {result ? (
            <div className={`rounded-xl border p-4 space-y-4 ${getDecisionColor(result.decision)}`}>
              <div className="flex items-center gap-3">
                {getDecisionIcon(result.decision)}
                <div>
                  <h3 className="font-bold text-lg">{result.decision}</h3>
                  <p className="text-sm">Confidence: {result.confidence}%</p>
                </div>
                <Badge className="ml-auto">
                  {result.refundAmount === 'full' ? 'Full Refund' : result.refundAmount === 'partial' ? `${result.partialRefundPercent}% Refund` : 'No Refund'}
                </Badge>
              </div>

              <div className="bg-white/60 rounded-lg p-3 space-y-3 text-sm">
                <div>
                  <p className="font-semibold text-xs uppercase tracking-wide mb-1">Reasoning</p>
                  <p>{result.reasoning}</p>
                </div>

                {result.evidenceFound?.length > 0 && (
                  <div>
                    <p className="font-semibold text-xs uppercase tracking-wide mb-1">Evidence Found</p>
                    <ul className="space-y-0.5">
                      {result.evidenceFound.map((e: string, i: number) => (
                        <li key={i} className="flex items-start gap-1 text-xs"><span>•</span>{e}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.flaggedIssues?.length > 0 && (
                  <div>
                    <p className="font-semibold text-xs uppercase tracking-wide mb-1 text-orange-700">Flagged Issues</p>
                    <ul className="space-y-0.5">
                      {result.flaggedIssues.map((f: string, i: number) => (
                        <li key={i} className="flex items-start gap-1 text-xs text-orange-700"><span>⚠</span>{f}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <p className="font-semibold text-xs uppercase tracking-wide mb-1">Recommendation</p>
                  <p className="text-xs">{result.recommendation}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-muted/20 rounded-xl border-2 border-dashed p-12 text-center text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">AI validation result will appear here</p>
            </div>
          )}

          {/* History */}
          {history.length > 0 && (
            <div className="bg-card rounded-xl border p-4 space-y-2">
              <Label className="text-sm font-semibold">Recent Validations</Label>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {history.map((h, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs border rounded-lg p-2">
                    {getDecisionIcon(h.decision)}
                    <span className="flex-1 truncate">{h.productTitle}</span>
                    <Badge variant="outline" className="text-[10px]">{h.decision}</Badge>
                    <span className="text-muted-foreground">{h.confidence}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
