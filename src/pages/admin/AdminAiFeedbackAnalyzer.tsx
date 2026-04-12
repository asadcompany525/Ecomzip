import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, ThumbsUp, ThumbsDown, Loader2, Star, RefreshCw, Sparkles, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useStoreSettings } from '@/hooks/useStoreSettings';

interface Analysis {
  overallSentiment: 'positive' | 'mixed' | 'negative';
  score: number;
  pros: string[];
  cons: string[];
  topComplaints: string[];
  suggestions: string[];
  summary: string;
  actionItems: string[];
}

export default function AdminAiFeedbackAnalyzer() {
  const { brandName } = useStoreSettings();
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('all');
  const [reviews, setReviews] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    supabase.from('products').select('id, title').eq('is_active', true).limit(60).then(({ data }) => setProducts(data || []));
  }, []);

  const fetchReviews = async () => {
    setLoading(true);
    setAnalysis(null);
    let query = supabase.from('reviews').select('*, products(title)').order('created_at', { ascending: false }).limit(100);
    if (selectedProduct !== 'all') query = query.eq('product_id', selectedProduct);
    const { data } = await query;
    setReviews(data || []);
    setLoading(false);
  };

  const analyze = async () => {
    if (reviews.length === 0) { toast({ title: 'No reviews to analyze', variant: 'destructive' }); return; }
    setAnalyzing(true);
    try {
      const reviewText = reviews.slice(0, 50).map(r =>
        `Rating: ${r.rating}/5 | Review: ${r.comment || 'No comment'}`
      ).join('\n');

      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          type: 'feedback-analyzer',
          messages: [{
            role: 'user',
            content: `You are a customer feedback analyst for ${brandName || 'our store'} Pakistan.
Analyze these ${reviews.length} customer reviews and provide insights:

${reviewText}

Return JSON only:
{
  "overallSentiment": "positive|mixed|negative",
  "score": 0-100,
  "pros": ["pro1", "pro2", "pro3"],
  "cons": ["con1", "con2", "con3"],
  "topComplaints": ["complaint1", "complaint2"],
  "suggestions": ["suggestion1", "suggestion2"],
  "summary": "2-3 sentence overall summary",
  "actionItems": ["action1", "action2", "action3"]
}
Return ONLY valid JSON.`
          }]
        }
      });
      if (error) throw error;
      let parsed = data;
      if (typeof data === 'string') { const m = data.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); }
      setAnalysis(parsed);
    } catch (e: any) {
      toast({ title: 'Analysis failed', description: e.message, variant: 'destructive' });
    }
    setAnalyzing(false);
  };

  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '0';
  const ratingDist = [5, 4, 3, 2, 1].map(r => ({ r, count: reviews.filter(rv => rv.rating === r).length }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-yellow-100 rounded-lg"><MessageSquare className="h-6 w-6 text-yellow-600" /></div>
        <div><h1 className="text-2xl font-bold">AI Feedback Analyzer</h1><p className="text-muted-foreground text-sm">Summarize reviews into Pros, Cons & actionable insights</p></div>
      </div>

      <div className="bg-card border rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger><SelectValue placeholder="All Products" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                {products.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={fetchReviews} disabled={loading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />Load Reviews
          </Button>
        </div>
        {reviews.length > 0 && (
          <Button onClick={analyze} disabled={analyzing} className="w-full">
            {analyzing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analyzing {reviews.length} reviews...</> : <><Sparkles className="h-4 w-4 mr-2" />Analyze Feedback</>}
          </Button>
        )}
      </div>

      {reviews.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-card border rounded-xl p-4">
            <h3 className="font-semibold mb-3">Rating Overview ({reviews.length} reviews)</h3>
            <div className="flex items-center gap-4 mb-4">
              <div className="text-center">
                <p className="text-4xl font-bold text-primary">{avgRating}</p>
                <div className="flex gap-0.5 mt-1">
                  {[...Array(5)].map((_, i) => <Star key={i} className={`h-3 w-3 ${i < Math.round(Number(avgRating)) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />)}
                </div>
              </div>
              <div className="flex-1 space-y-1">
                {ratingDist.map(({ r, count }) => (
                  <div key={r} className="flex items-center gap-2">
                    <span className="text-xs w-4">{r}</span>
                    <div className="flex-1 bg-muted rounded-full h-1.5">
                      <div className="bg-yellow-400 h-1.5 rounded-full transition-all" style={{ width: reviews.length ? `${(count / reviews.length) * 100}%` : '0%' }} />
                    </div>
                    <span className="text-xs text-muted-foreground w-6">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="bg-card border rounded-xl p-4">
            <h3 className="font-semibold mb-3">Recent Reviews</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {reviews.slice(0, 6).map(r => (
                <div key={r.id} className="text-sm border-b pb-1.5 last:border-0">
                  <div className="flex items-center gap-1 mb-0.5">
                    {[...Array(5)].map((_, i) => <Star key={i} className={`h-3 w-3 ${i < r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />)}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">{r.comment || 'No comment'}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {analysis && (
        <div className="space-y-4">
          <div className={`border rounded-xl p-5 ${analysis.overallSentiment === 'positive' ? 'bg-green-50 border-green-200' : analysis.overallSentiment === 'negative' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <h3 className="font-bold text-lg">Overall Sentiment</h3>
              <div className="flex items-center gap-2">
                <Badge variant={analysis.overallSentiment === 'positive' ? 'default' : analysis.overallSentiment === 'negative' ? 'destructive' : 'secondary'} className="text-sm">
                  {analysis.overallSentiment.toUpperCase()}
                </Badge>
                <span className="text-2xl font-bold">{analysis.score}/100</span>
              </div>
            </div>
            <p className="text-sm">{analysis.summary}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="border rounded-xl p-4 bg-green-50 border-green-200">
              <div className="flex items-center gap-2 mb-3"><ThumbsUp className="h-5 w-5 text-green-600" /><h3 className="font-semibold text-green-800">Pros</h3></div>
              <ul className="space-y-1.5">
                {analysis.pros?.map((p, i) => <li key={i} className="text-sm flex items-start gap-2"><span className="text-green-600 mt-0.5">✓</span>{p}</li>)}
              </ul>
            </div>
            <div className="border rounded-xl p-4 bg-red-50 border-red-200">
              <div className="flex items-center gap-2 mb-3"><ThumbsDown className="h-5 w-5 text-red-600" /><h3 className="font-semibold text-red-800">Cons</h3></div>
              <ul className="space-y-1.5">
                {analysis.cons?.map((c, i) => <li key={i} className="text-sm flex items-start gap-2"><span className="text-red-600 mt-0.5">✗</span>{c}</li>)}
              </ul>
            </div>
          </div>

          {analysis.topComplaints?.length > 0 && (
            <div className="border rounded-xl p-4 bg-orange-50 border-orange-200">
              <div className="flex items-center gap-2 mb-3"><AlertCircle className="h-5 w-5 text-orange-600" /><h3 className="font-semibold">Top Complaints</h3></div>
              <ul className="space-y-1">
                {analysis.topComplaints.map((c, i) => <li key={i} className="text-sm">• {c}</li>)}
              </ul>
            </div>
          )}

          <div className="border rounded-xl p-4 bg-blue-50 border-blue-200">
            <div className="flex items-center gap-2 mb-3"><Sparkles className="h-5 w-5 text-blue-600" /><h3 className="font-semibold">Action Items</h3></div>
            <ul className="space-y-1.5">
              {analysis.actionItems?.map((a, i) => (
                <li key={i} className="text-sm flex items-start gap-2 bg-white rounded-lg p-2">
                  <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>{a}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {!loading && reviews.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p>Load reviews to start analyzing customer feedback</p>
        </div>
      )}
    </div>
  );
}
