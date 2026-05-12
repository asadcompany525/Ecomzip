import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Check, Loader2, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import AdminDateFilter from '@/components/admin/AdminDateFilter';
import { format } from 'date-fns';

const AdminAiDiscounts = () => {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiCommand, setAiCommand] = useState('');
  const [aiProcessing, setAiProcessing] = useState(false);
  const [dateFilter, setDateFilter] = useState<Date | undefined>(new Date());

  const fetchData = async () => {
    let sugQuery = supabase.from('ai_discount_suggestions').select('*').order('created_at', { ascending: false });
    if (dateFilter) {
      const start = new Date(dateFilter); start.setHours(0,0,0,0);
      const end = new Date(dateFilter); end.setHours(23,59,59,999);
      sugQuery = sugQuery.gte('created_at', start.toISOString()).lte('created_at', end.toISOString());
    }
    const [{ data: sug }, { data: prods }, { data: cats }] = await Promise.all([
      sugQuery,
      supabase.from('products').select('id, title, price, original_price, discount_percent, stock, sold, created_at, is_flash_sale, brand, gender, category_id, tags, flash_sale_ends').eq('is_active', true),
      supabase.from('categories').select('*').eq('is_active', true),
    ]);
    setSuggestions(sug || []);
    setProducts(prods || []);
    setCategories(cats || []);
  };

  useEffect(() => { fetchData(); }, [dateFilter]);

  const runAiAnalysis = async () => {
    setAnalyzing(true);
    try {
      const now = new Date();
      const slowProducts = products.filter(p => {
        const age = (now.getTime() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24);
        return (p.sold < 3 && age > 14) || (p.sold < 1 && age > 7) || age > 60;
      });
      const inserts = slowProducts
        .filter(p => !suggestions.find(s => s.product_id === p.id && !s.is_applied))
        .map(p => {
          const age = Math.floor((now.getTime() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24));
          let discount = 10, reason = '';
          if (age > 60) { discount = 30; reason = `${age} days old - very low sales (${p.sold})`; }
          else if (age > 30) { discount = 20; reason = `${age} days - only ${p.sold} sold`; }
          else if (p.sold < 1) { discount = 15; reason = `${age} days, 0 sales`; }
          else { discount = 10; reason = `Low sales (${p.sold}) - ${age} days`; }
          return { product_id: p.id, suggested_discount: discount, reason };
        });
      if (inserts.length > 0) {
        await supabase.from('ai_discount_suggestions').insert(inserts);
        toast({ title: `AI suggested ${inserts.length} discounts!` });
      } else {
        toast({ title: 'All products performing well!' });
      }
      fetchData();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setAnalyzing(false);
  };

  const handleAiCommand = async () => {
    if (!aiCommand.trim()) return;
    setAiProcessing(true);
    try {
      const cmd = aiCommand.toLowerCase();
      const percentMatch = cmd.match(/(\d+)\s*%/);
      const discountPercent = percentMatch ? parseInt(percentMatch[1]) : 10;
      
      // Check for flash sale command
      const isFlash = cmd.includes('flash');
      let flashEndDate: string | null = null;
      if (isFlash) {
        const dateMatch = cmd.match(/(\d{4}-\d{2}-\d{2})/);
        if (dateMatch) {
          flashEndDate = new Date(dateMatch[1]).toISOString();
        } else if (cmd.includes('tomorrow')) {
          const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(23,59,59);
          flashEndDate = d.toISOString();
        } else if (cmd.includes('week')) {
          const d = new Date(); d.setDate(d.getDate() + 7); d.setHours(23,59,59);
          flashEndDate = d.toISOString();
        } else {
          const d = new Date(); d.setDate(d.getDate() + 3); d.setHours(23,59,59);
          flashEndDate = d.toISOString();
        }
      }

      // Check for product code match
      const codeMatch = cmd.match(/\b([a-z]{2,5}\d{3,})\b/i);
      let matchingProducts = [...products];

      if (codeMatch) {
        matchingProducts = matchingProducts.filter(p => {
          const code = (p.tags as string[])?.[0]?.toLowerCase() || '';
          return code === codeMatch[1].toLowerCase();
        });
      } else {
        if (cmd.includes('men') && !cmd.includes('women')) matchingProducts = matchingProducts.filter(p => p.gender === 'men');
        if (cmd.includes('women')) matchingProducts = matchingProducts.filter(p => p.gender === 'women');
        if (cmd.includes('kid')) matchingProducts = matchingProducts.filter(p => p.gender === 'kids');
        const catKeywords = categories.map(c => ({ id: c.id, name: c.name.toLowerCase() }));
        for (const cat of catKeywords) {
          if (cmd.includes(cat.name)) matchingProducts = matchingProducts.filter(p => p.category_id === cat.id);
        }
        if (cmd.includes('local')) matchingProducts = matchingProducts.filter(p => !p.brand || p.brand.toLowerCase().includes('local'));
        if (cmd.includes('flash') && !isFlash) matchingProducts = matchingProducts.filter(p => p.is_flash_sale);
      }

      if (matchingProducts.length === 0) {
        toast({ title: 'No products found matching command', variant: 'destructive' });
        setAiProcessing(false);
        return;
      }

      // Apply discount directly to products + create suggestions
      for (const p of matchingProducts) {
        const origPrice = p.original_price || p.price;
        const newPrice = Math.round(origPrice - (origPrice * discountPercent / 100));
        const updates: any = { discount_percent: discountPercent, price: newPrice, original_price: origPrice };
        if (isFlash) {
          updates.is_flash_sale = true;
          updates.flash_sale_ends = flashEndDate;
        }
        await supabase.from('products').update(updates).eq('id', p.id);
      }

      const inserts = matchingProducts.map(p => ({
        product_id: p.id,
        suggested_discount: discountPercent,
        reason: `AI Command: "${aiCommand}" — ${discountPercent}% ${isFlash ? 'flash sale' : 'discount'}`,
        is_applied: true,
      }));
      await supabase.from('ai_discount_suggestions').insert(inserts);
      
      toast({ title: `✅ ${matchingProducts.length} products updated with ${discountPercent}% ${isFlash ? 'flash sale' : 'discount'}!` });
      setAiCommand('');
      fetchData();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setAiProcessing(false);
  };

  const applyDiscount = async (sug: any) => {
    const product = products.find(p => p.id === sug.product_id);
    if (!product) return;
    const origPrice = product.original_price || product.price;
    const newPrice = Math.round(origPrice - (origPrice * sug.suggested_discount / 100));
    await supabase.from('products').update({ discount_percent: sug.suggested_discount, price: newPrice, original_price: origPrice }).eq('id', sug.product_id);
    await supabase.from('ai_discount_suggestions').update({ is_applied: true }).eq('id', sug.id);
    toast({ title: `✅ ${sug.suggested_discount}% discount applied!` });
    fetchData();
  };

  const applyAll = async () => {
    const pending = suggestions.filter(s => !s.is_applied);
    for (const sug of pending) await applyDiscount(sug);
    toast({ title: `✅ All ${pending.length} discounts applied!` });
  };

  const clearAll = async () => {
    await supabase.from('ai_discount_suggestions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    toast({ title: 'All suggestions cleared' });
    fetchData();
  };

  const getProductName = (id: string) => products.find(p => p.id === id)?.title || 'Unknown';
  const getProductCode = (id: string) => (products.find(p => p.id === id)?.tags as string[])?.[0] || '';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 rounded-xl"><Sparkles className="h-5 w-5 text-orange-600" /></div>
          <div>
            <h2 className="text-xl font-bold">AI Discounts & Flash Sales</h2>
            <p className="text-sm text-muted-foreground">AI-powered discount strategy & flash sale automation</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <AdminDateFilter date={dateFilter} onDateChange={setDateFilter} />
          <Button onClick={runAiAnalysis} disabled={analyzing} className="gap-2">
            <Sparkles className="h-4 w-4" /> {analyzing ? 'Analyzing...' : 'AI Auto Analyze'}
          </Button>
          {suggestions.filter(s => !s.is_applied).length > 0 && (
            <Button variant="outline" onClick={applyAll}>Apply All ({suggestions.filter(s => !s.is_applied).length})</Button>
          )}
          {suggestions.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAll}><X className="h-4 w-4 mr-1" />Clear</Button>
          )}
        </div>
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
        <p className="text-sm font-medium">🤖 AI Command — Examples: "PMP001 per flash 20% till 2026-04-10" or "mens joggers per 15% discount"</p>
        <div className="flex gap-2">
          <Textarea value={aiCommand} onChange={e => setAiCommand(e.target.value)} placeholder='e.g. "PMP001 flash 20% tomorrow" or "women bags 15% discount"' rows={2} className="flex-1" />
          <Button onClick={handleAiCommand} disabled={aiProcessing} className="gap-2 self-end">
            {aiProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Apply
          </Button>
        </div>
        <div className="flex gap-2 flex-wrap">
          {['Flash items per 15% discount', 'PMP001 flash 20% tomorrow', 'Mens shoes 10% off', 'Women bags 20% discount', 'Kids shoes 25% off', 'All canvas flash 15% week'].map(ex => (
            <Button key={ex} variant="outline" size="sm" className="text-xs" onClick={() => setAiCommand(ex)}>{ex}</Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { l: 'Total Suggestions', v: suggestions.length },
          { l: 'Applied', v: suggestions.filter(s => s.is_applied).length, c: 'text-green-600' },
          { l: 'Pending', v: suggestions.filter(s => !s.is_applied).length, c: 'text-yellow-600' },
          { l: 'Slow Products', v: products.filter(p => p.sold < 3).length, c: 'text-red-600' },
        ].map(s => (
          <div key={s.l} className="bg-card border rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">{s.l}</p>
            <p className={`text-xl font-bold ${s.c || ''}`}>{s.v}</p>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50">
            <th className="text-left p-3">Code</th>
            <th className="text-left p-3">Product</th>
            <th className="text-left p-3">%</th>
            <th className="text-left p-3">Reason</th>
            <th className="text-left p-3">Status</th>
            <th className="text-left p-3">Action</th>
          </tr></thead>
          <tbody>
            {suggestions.map(s => (
              <tr key={s.id} className="border-b hover:bg-accent/50">
                <td className="p-3 text-xs font-mono">{getProductCode(s.product_id)}</td>
                <td className="p-3 font-medium max-w-[200px] truncate">{getProductName(s.product_id)}</td>
                <td className="p-3"><Badge>{s.suggested_discount}%</Badge></td>
                <td className="p-3 text-xs max-w-[250px]">{s.reason}</td>
                <td className="p-3"><Badge variant={s.is_applied ? 'default' : 'secondary'}>{s.is_applied ? '✅ Applied' : '⏳ Pending'}</Badge></td>
                <td className="p-3">
                  {!s.is_applied && (
                    <Button size="sm" onClick={() => applyDiscount(s)} className="gap-1"><Check className="h-3 w-3" /> Apply</Button>
                  )}
                </td>
              </tr>
            ))}
            {suggestions.length === 0 && <tr><td colSpan={6} className="text-center p-8 text-muted-foreground">No suggestions yet. Run AI analysis!</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminAiDiscounts;
