import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Printer, Loader2, Download, FileText, FileSpreadsheet, History, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useStoreSettings } from '@/hooks/useStoreSettings';

const HISTORY_KEY = 'ai_form_generator_history_v1';
const loadFormHistory = (): string[] => { try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; } };
const saveFormHistory = (prompts: string[]) => { try { localStorage.setItem(HISTORY_KEY, JSON.stringify(prompts.slice(0, 15))); } catch {} };

const EXAMPLES = [
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
  'All pending payments list',
  'Customers with most orders',
  'Daily sales with discounts breakdown',
  'Size-wise list of PAR001',
];

function stripHtmlForCsv(html: string): string[][] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const rows: string[][] = [];
  doc.querySelectorAll('table').forEach(table => {
    table.querySelectorAll('tr').forEach(tr => {
      const cells: string[] = [];
      tr.querySelectorAll('th, td').forEach(td => {
        cells.push(td.textContent?.trim().replace(/"/g, '""') || '');
      });
      if (cells.length) rows.push(cells);
    });
  });
  if (rows.length === 0) {
    doc.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6, div').forEach(el => {
      const text = el.textContent?.trim();
      if (text) rows.push([text]);
    });
  }
  return rows;
}

const AdminFormGenerator = () => {
  const { brandName } = useStoreSettings();
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [recentHistory, setRecentHistory] = useState<string[]>([]);

  useEffect(() => { setRecentHistory(loadFormHistory()); }, []);

  const generateForm = async () => {
    if (!prompt.trim()) {
      toast({ title: 'Enter some instructions', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const [
        { data: products },
        { data: orders },
        { data: returns },
        { data: variants },
        { data: categories },
        { data: orderItems },
        { data: payments },
        { data: customers },
      ] = await Promise.all([
        supabase.from('products').select('id, title, price, stock, sold, discount_percent, is_flash_sale, created_at, brand, gender, tags, original_price, flash_sale_ends, category_id, claim_duration'),
        supabase.from('orders').select('id, order_number, total, status, payment_method, created_at, payment_status'),
        supabase.from('returns').select('id, reason, status, created_at'),
        supabase.from('product_variants').select('id, product_id, color, size, stock'),
        supabase.from('categories').select('id, name, level, parent_id'),
        supabase.from('order_items').select('id, order_id, product_id, title, size, color, quantity, price'),
        supabase.from('orders').select('id, order_number, total, status, payment_method, payment_status, created_at').eq('payment_status', 'pending'),
        supabase.from('profiles').select('id, full_name, email, created_at').limit(200),
      ]);

      const variantsByProduct: Record<string, any[]> = {};
      (variants || []).forEach(v => {
        if (!variantsByProduct[v.product_id]) variantsByProduct[v.product_id] = [];
        variantsByProduct[v.product_id].push(v);
      });

      const soldDetail: Record<string, { size: string; color: string; qty: number; price: number; discount: boolean; flash: boolean }[]> = {};
      (orderItems || []).forEach(oi => {
        if (!oi.product_id) return;
        if (!soldDetail[oi.product_id]) soldDetail[oi.product_id] = [];
        const prod = (products || []).find(p => p.id === oi.product_id);
        soldDetail[oi.product_id].push({
          size: oi.size || '-',
          color: oi.color || '-',
          qty: oi.quantity,
          price: oi.price,
          discount: (prod?.discount_percent || 0) > 0 && !prod?.is_flash_sale,
          flash: prod?.is_flash_sale || false,
        });
      });

      const context = `
FULL DATA ACCESS (with size/color/variant detail):
Products (${(products || []).length}): ${JSON.stringify((products || []).map(p => ({
        ...p,
        code: (p.tags as string[])?.[0] || '',
        variants: variantsByProduct[p.id] || [],
        sold_detail: soldDetail[p.id] || [],
      })))}
Categories: ${JSON.stringify(categories || [])}
Orders (${(orders || []).length}): ${JSON.stringify(orders || [])}
Order Items (${(orderItems || []).length}): ${JSON.stringify(orderItems || [])}
Returns (${(returns || []).length}): ${JSON.stringify(returns || [])}
Pending Payments (${(payments || []).length}): ${JSON.stringify(payments || [])}
Customers (${(customers || []).length}): ${JSON.stringify(customers || [])}

IMPORTANT: You have full variant-level data (each size, each color, stock per variant).
Create reports showing: which sizes sold, which colors, discount vs flash vs regular sales, 
stock per size, total sell price per size, pending payment orders, customer lists, etc.
Format output as clean HTML table(s) with headers, subtotals and grand totals. Be detailed.
      `.trim();

      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          type: 'admin-form',
          messages: [
            {
              role: 'system',
              content: `You are a helpful admin assistant for "${brandName || 'our store'}". Generate detailed reports in clean HTML table format with proper headers, subtotals and grand totals. Always include a summary section at the bottom. Data:\n${context}`,
            },
            { role: 'user', content: prompt },
          ],
        },
      });

      if (error) throw error;
      setResult(typeof data === 'string' ? data : data?.reply || data?.content || JSON.stringify(data));
      toast({ title: '✅ Report generated!' });
      const updated = [prompt, ...recentHistory.filter(h => h !== prompt)].slice(0, 15);
      setRecentHistory(updated);
      saveFormHistory(updated);
    } catch (e: any) {
      toast({ title: 'Error generating report', description: e.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  const handlePrint = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head>
      <title>${brandName || 'Store'} — AI Report</title>
      <style>
        * { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; box-sizing: border-box; }
        body { padding: 24px 32px; color: #111; font-size: 12px; }
        .report-header { text-align: center; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid #f97316; }
        .report-header h1 { font-size: 20px; color: #f97316; }
        .report-header p { font-size: 11px; color: #666; margin-top: 3px; }
        table { width: 100%; border-collapse: collapse; margin: 12px 0; }
        th { background: #f97316; color: white; padding: 7px 10px; text-align: left; font-size: 11px; }
        td { border: 1px solid #ddd; padding: 6px 10px; font-size: 11px; }
        tr:nth-child(even) td { background: #fafafa; }
        h1, h2, h3 { margin: 14px 0 6px; color: #f97316; }
        h2 { font-size: 14px; } h3 { font-size: 12px; }
        p { margin: 4px 0; line-height: 1.5; }
        ul, ol { padding-left: 20px; margin: 6px 0; }
        li { margin: 2px 0; }
        .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #eee; text-align: center; color: #aaa; font-size: 10px; }
        @media print { body { padding: 12px 16px; } }
      </style>
    </head><body>
      <div class="report-header">
        <h1>${brandName || 'Store'} — AI Generated Report</h1>
        <p>Generated on: ${new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })} | Query: ${prompt}</p>
      </div>
      ${result}
      <div class="footer">Confidential · ${brandName || 'Store'} Admin Panel · ASDEVOLPER</div>
    </body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 400);
  };

  const handleDownloadCSV = () => {
    const rows = stripHtmlForCsv(result);
    if (!rows.length) { toast({ title: 'No table data to export', variant: 'destructive' }); return; }
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'CSV downloaded!' });
  };

  const handleDownloadPDF = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head>
      <title>${brandName || 'Store'} — AI Report</title>
      <style>
        * { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; box-sizing: border-box; }
        body { padding: 24px 32px; color: #111; font-size: 12px; }
        .report-header { text-align: center; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid #f97316; }
        .report-header h1 { font-size: 20px; color: #f97316; }
        .report-header p { font-size: 11px; color: #666; margin-top: 3px; }
        table { width: 100%; border-collapse: collapse; margin: 12px 0; }
        th { background: #f97316; color: white; padding: 7px 10px; text-align: left; font-size: 11px; }
        td { border: 1px solid #ddd; padding: 6px 10px; font-size: 11px; }
        tr:nth-child(even) td { background: #fafafa; }
        h1, h2, h3 { margin: 14px 0 6px; color: #f97316; }
        h2 { font-size: 14px; } h3 { font-size: 12px; }
        p { margin: 4px 0; line-height: 1.5; }
        .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #eee; text-align: center; color: #aaa; font-size: 10px; }
      </style>
    </head><body>
      <div class="report-header">
        <h1>${brandName || 'Store'} — AI Generated Report</h1>
        <p>Generated: ${new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })} | ${prompt}</p>
      </div>
      ${result}
      <div class="footer">Confidential · ${brandName || 'Store'} Admin Panel</div>
      <script>window.onload = function(){ window.print(); window.onafterprint = function(){ window.close(); }; }<\/script>
    </body></html>`);
    win.document.close();
    toast({ title: 'PDF print dialog opening...' });
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Universal AI Report Generator
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Type any request in plain language — get 100% accurate data with export options.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {[
          { label: 'Size-wise stock', color: 'bg-blue-50 border-blue-200 text-blue-700' },
          { label: 'Pending payments', color: 'bg-red-50 border-red-200 text-red-700' },
          { label: "Today's sales", color: 'bg-green-50 border-green-200 text-green-700' },
          { label: 'Sale history', color: 'bg-orange-50 border-orange-200 text-orange-700' },
          { label: 'Customer lists', color: 'bg-purple-50 border-purple-200 text-purple-700' },
          { label: 'Flash sale report', color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
        ].map(tag => (
          <Badge key={tag.label} variant="outline" className={`justify-center py-1 cursor-pointer text-xs ${tag.color}`} onClick={() => setPrompt(tag.label)}>
            {tag.label}
          </Badge>
        ))}
      </div>

      <div className="bg-muted/30 rounded-xl p-4 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground">Quick Examples — click to use:</p>
        <div className="flex gap-1.5 flex-wrap">
          {EXAMPLES.map(ex => (
            <button
              key={ex}
              onClick={() => setPrompt(ex)}
              className="text-[11px] px-2 py-1 rounded-md bg-background border hover:border-primary hover:text-primary transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="e.g. 'Show size-wise list of PAR001', 'List all pending payments', 'Today's sales with discounts'..."
          rows={3}
          className="resize-none"
          onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) generateForm(); }}
        />
        <p className="text-[11px] text-muted-foreground">Tip: Press Ctrl+Enter to generate quickly</p>
      </div>

      {recentHistory.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <History className="h-3.5 w-3.5" /> Recent Reports — click to reuse:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {recentHistory.map((h, i) => (
              <button
                key={i}
                onClick={() => setPrompt(h)}
                className="text-[11px] px-2.5 py-1 rounded-full bg-muted/50 border hover:border-primary hover:text-primary transition-colors flex items-center gap-1 max-w-xs truncate"
              >
                <History className="h-3 w-3 shrink-0 opacity-60" />
                <span className="truncate">{h}</span>
              </button>
            ))}
            <button
              onClick={() => { setRecentHistory([]); localStorage.removeItem(HISTORY_KEY); }}
              className="text-[11px] px-2 py-1 rounded-full text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
            >
              <X className="h-3 w-3" /> Clear
            </button>
          </div>
        </div>
      )}

      <Button onClick={generateForm} disabled={loading} className="gap-2 w-full sm:w-auto">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {loading ? 'Generating Report…' : 'Generate Report'}
      </Button>

      {result && (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm font-medium text-muted-foreground">Report ready — export below:</p>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={handleDownloadCSV} className="gap-1.5">
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                Download CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadPDF} className="gap-1.5">
                <FileText className="h-4 w-4 text-red-500" />
                Download PDF
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
                <Printer className="h-4 w-4" />
                Print
              </Button>
            </div>
          </div>

          <div
            className="bg-card border rounded-xl p-4 overflow-x-auto prose prose-sm max-w-none
              [&_table]:w-full [&_table]:border-collapse
              [&_th]:bg-primary [&_th]:text-primary-foreground [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-xs
              [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-1.5 [&_td]:text-xs
              [&_tr:nth-child(even)_td]:bg-muted/30
              [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_h2]:text-primary [&_h3]:text-primary"
            dangerouslySetInnerHTML={{ __html: result }}
          />
        </div>
      )}
    </div>
  );
};

export default AdminFormGenerator;
