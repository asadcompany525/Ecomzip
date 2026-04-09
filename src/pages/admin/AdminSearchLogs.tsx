import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Search, Trash2, RefreshCw, TrendingUp, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface SearchLog {
  id: string;
  query: string;
  results_count: number;
  searched_at: string;
  user_id: string | null;
}

interface AggregatedTerm {
  query: string;
  count: number;
  last_searched: string;
  is_zero_results: boolean;
}

export default function AdminSearchLogs() {
  const [logs, setLogs] = useState<SearchLog[]>([]);
  const [aggregated, setAggregated] = useState<AggregatedTerm[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'zero'>('zero');
  const [clearTarget, setClearTarget] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('search_logs')
        .select('*')
        .order('searched_at', { ascending: false })
        .limit(500);

      setLogs(data || []);

      const termMap: Record<string, AggregatedTerm> = {};
      (data || []).forEach((log: SearchLog) => {
        const q = log.query.toLowerCase().trim();
        if (!termMap[q]) {
          termMap[q] = { query: q, count: 0, last_searched: log.searched_at, is_zero_results: log.results_count === 0 };
        }
        termMap[q].count++;
        if (new Date(log.searched_at) > new Date(termMap[q].last_searched)) {
          termMap[q].last_searched = log.searched_at;
        }
        if (log.results_count === 0) termMap[q].is_zero_results = true;
      });

      const sorted = Object.values(termMap).sort((a, b) => b.count - a.count);
      setAggregated(sorted);
    } catch (e: any) {
      toast({ title: 'Failed to load', description: e.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  const clearLogs = async () => {
    try {
      await supabase.from('search_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      setLogs([]);
      setAggregated([]);
      setClearTarget(false);
      toast({ title: 'All search logs cleared' });
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    }
  };

  useEffect(() => { load(); }, []);

  const displayed = aggregated.filter(a => {
    const matchSearch = a.query.includes(search.toLowerCase());
    if (filter === 'zero') return matchSearch && a.is_zero_results;
    return matchSearch;
  });

  const zeroResults = aggregated.filter(a => a.is_zero_results);
  const totalSearches = logs.length;
  const uniqueTerms = aggregated.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Search className="h-6 w-6 text-primary" /> Visual Search Logs</h1>
          <p className="text-sm text-muted-foreground mt-1">Track what customers search for — especially terms returning zero results.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setClearTarget(true)} className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10">
            <Trash2 className="h-4 w-4" /> Clear All
          </Button>
          <Button onClick={load} disabled={loading} variant="outline" className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Eye className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{totalSearches}</p>
              <p className="text-sm text-muted-foreground">Total Searches</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{uniqueTerms}</p>
              <p className="text-sm text-muted-foreground">Unique Terms</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 flex items-center gap-3">
            <Search className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-2xl font-bold text-red-700">{zeroResults.length}</p>
              <p className="text-sm text-red-600">Zero-Result Terms</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Filter terms..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant={filter === 'zero' ? 'default' : 'outline'} onClick={() => setFilter('zero')}>Zero Results Only</Button>
          <Button size="sm" variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>All Terms</Button>
        </div>
      </div>

      {totalSearches === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium">No search logs yet</p>
            <p className="text-sm text-muted-foreground">Logs will appear when customers use the search bar.</p>
            <p className="text-xs text-muted-foreground mt-2">Make sure the search bar calls <code className="bg-muted px-1 rounded">logSearch()</code> after each search.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="bg-card rounded-xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3">#</th>
                <th className="text-left p-3">Search Term</th>
                <th className="text-left p-3">Times Searched</th>
                <th className="text-left p-3">Results</th>
                <th className="text-left p-3">Last Searched</th>
                <th className="text-left p-3">Demand Signal</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((term, i) => (
                <tr key={term.query} className={`border-b hover:bg-accent/30 ${term.is_zero_results ? 'bg-red-50/30' : ''}`}>
                  <td className="p-3 text-muted-foreground">{i + 1}</td>
                  <td className="p-3 font-medium">"{term.query}"</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{term.count}</span>
                      <div className="h-2 bg-primary/20 rounded-full overflow-hidden w-20">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, (term.count / (aggregated[0]?.count || 1)) * 100)}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    {term.is_zero_results
                      ? <Badge className="bg-red-100 text-red-700 border-red-200">❌ No Results</Badge>
                      : <Badge className="bg-green-100 text-green-700 border-green-200">✓ Found</Badge>}
                  </td>
                  <td className="p-3 text-muted-foreground">{new Date(term.last_searched).toLocaleDateString()}</td>
                  <td className="p-3">
                    {term.count >= 5 && term.is_zero_results && (
                      <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs">🔥 High Demand — Stock This!</Badge>
                    )}
                    {term.count >= 2 && term.is_zero_results && term.count < 5 && (
                      <Badge variant="outline" className="text-xs">Consider Adding</Badge>
                    )}
                  </td>
                </tr>
              ))}
              {displayed.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No terms found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={clearTarget} onOpenChange={setClearTarget}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Clear All Logs?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This will permanently delete all {totalSearches} search log entries. This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearTarget(false)}>Cancel</Button>
            <Button variant="destructive" onClick={clearLogs}>Clear All</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
