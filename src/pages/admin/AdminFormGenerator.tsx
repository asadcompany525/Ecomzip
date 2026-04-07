import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Printer, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const AdminFormGenerator = () => {
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const generateForm = async () => {
    if (!prompt.trim()) { toast({ title: 'Enter some instructions', variant: 'destructive' }); return; }
    setLoading(true);
    try {
      const { data: products } = await supabase.from('products').select('id, title, price, stock, sold, discount_percent, is_flash_sale, created_at, brand, gender, tags, original_price, flash_sale_ends, category_id');
      const { data: orders } = await supabase.from('orders').select('id, order_number, total, status, payment_method, created_at');
      const { data: returns } = await supabase.from('returns').select('id, reason, status, created_at');
      const { data: variants } = await supabase.from('product_variants').select('id, product_id, color, size, stock');
      const { data: categories } = await supabase.from('categories').select('id, name, level, parent_id');
      const { data: orderItems } = await supabase.from('order_items').select('id, order_id, product_id, title, size, color, quantity, price');

      // Build detailed variant data per product
      const variantsByProduct: Record<string, any[]> = {};
      (variants || []).forEach(v => {
        if (!variantsByProduct[v.product_id]) variantsByProduct[v.product_id] = [];
        variantsByProduct[v.product_id].push(v);
      });

      // Build sold data by size/color from order items
      const soldDetail: Record<string, { size: string; color: string; qty: number; price: number; discount: boolean; flash: boolean }[]> = {};
      (orderItems || []).forEach(oi => {
        if (!oi.product_id) return;
        if (!soldDetail[oi.product_id]) soldDetail[oi.product_id] = [];
        const prod = (products || []).find(p => p.id === oi.product_id);
        soldDetail[oi.product_id].push({
          size: oi.size || '-', color: oi.color || '-', qty: oi.quantity, price: oi.price,
          discount: (prod?.discount_percent || 0) > 0 && !prod?.is_flash_sale,
          flash: prod?.is_flash_sale || false,
        });
      });

      const context = `
FULL DATA ACCESS (with size/color/variant detail):
Products (${(products || []).length}): ${JSON.stringify((products || []).map(p => ({
  ...p, code: (p.tags as string[])?.[0] || '',
  variants: variantsByProduct[p.id] || [],
  sold_detail: soldDetail[p.id] || [],
})))}
Categories: ${JSON.stringify(categories || [])}
Orders (${(orders || []).length}): ${JSON.stringify(orders || [])}
Order Items (${(orderItems || []).length}): ${JSON.stringify(orderItems || [])}
Returns (${(returns || []).length}): ${JSON.stringify(returns || [])}

IMPORTANT: You have access to VARIANT-LEVEL data (each size, each color, stock per variant). 
You can create reports showing: which sizes sold, which colors, discount vs flash vs regular sales, 
stock per size, total sell price per size, etc. Be as detailed as possible.
      `.trim();

      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          type: 'admin-form',
          messages: [
            { role: 'system', content: `You are a helpful admin assistant for a shoes & bags store "Stopy Shoes". The user wants to generate a report/form/list. You have FULL access to ALL store data including product codes, variants (size/stock per color per product), order items (which size/color sold), returns, categories. Use the provided data to create the output. Format as a clean HTML table or list that can be printed. Always include headers, subtotals and grand totals where applicable. Show SIZE-LEVEL and COLOR-LEVEL detail when asked. You can answer ANY question about any product, size, color, stock, sales, dates, discounts, flash sales, etc. Data:\n${context}` },
            { role: 'user', content: prompt },
          ],
        },
      });

      if (error) throw error;
      setResult(typeof data === 'string' ? data : data?.reply || data?.content || JSON.stringify(data));
      toast({ title: '✅ Form generated!' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  const printResult = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>AI Generated Form</title>
      <style>*{font-family:sans-serif;margin:0;padding:0}body{padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:6px;font-size:12px;text-align:left}th{background:#f5f5f5}h1,h2,h3{margin:8px 0}p{margin:4px 0}ul{padding-left:20px}</style>
    </head><body>${result}</body></html>`);
    win.document.close(); win.print();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">🤖 AI Form Generator (Full Data Access)</h2>
      <p className="text-sm text-muted-foreground">Generate any report — product sizes, sales by date, stock details, anything!</p>

      <div className="bg-muted/30 rounded-xl p-4 space-y-3">
        <p className="text-xs font-medium">Examples:</p>
        <div className="flex gap-2 flex-wrap">
          {[
            'PMP001 all sizes with stock',
            'All products with their sold quantities',
            'Products sold on discount vs flash sale',
            'Each product total sell price',
            'Size 42 stock across all products',
            'Low stock products list',
            'Today orders checklist',
            'Monthly revenue report',
            'Products by category with totals',
            'Flash sale products with timer end dates',
          ].map(ex => (
            <Button key={ex} variant="outline" size="sm" className="text-xs" onClick={() => setPrompt(ex)}>{ex}</Button>
          ))}
        </div>
      </div>

      <Textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Ask anything about your store data..." rows={3} />
      <Button onClick={generateForm} disabled={loading} className="gap-2">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {loading ? 'Generating...' : 'Generate Form'}
      </Button>

      {result && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button variant="outline" onClick={printResult} className="gap-1"><Printer className="h-4 w-4" /> Print / Download</Button>
          </div>
          <div className="bg-card border rounded-xl p-4 overflow-x-auto prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: result }} />
        </div>
      )}
    </div>
  );
};

export default AdminFormGenerator;
