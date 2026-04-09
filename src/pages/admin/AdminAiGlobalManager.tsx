import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Command, History, Trash2, Send, Loader2, Zap, CheckCircle, Navigation, Settings, Tag, ShoppingCart, Bell, BarChart3, Globe } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const QUICK_COMMANDS = [
  { label: 'Change site title', example: 'Change site title to Stopy Luxury', icon: Globe },
  { label: '20% store-wide discount for 12 hours', example: 'Apply 20% store-wide discount for 12 hours', icon: Tag },
  { label: 'Update delivery fee', example: 'Set delivery fee to Rs. 250', icon: ShoppingCart },
  { label: 'Show today revenue', example: 'Show me today\'s total revenue', icon: BarChart3 },
  { label: 'Low stock alert', example: 'List all products with stock under 5', icon: Bell },
  { label: 'Enable free delivery', example: 'Set free delivery minimum to Rs. 3000', icon: Settings },
  { label: 'Today\'s orders count', example: 'How many orders today?', icon: ShoppingCart },
  { label: 'Show top products', example: 'Show top 5 selling products this month', icon: BarChart3 },
];

const NAVIGATION_MAP: Record<string, string> = {
  'orders': '/admin/orders',
  'today orders': '/admin/today-orders',
  'products': '/admin/products',
  'dashboard': '/admin',
  'returns': '/admin/returns',
  'customers': '/admin/customers',
  'settings': '/admin/settings',
  'promo': '/admin/promos',
  'staff': '/admin/staff',
  'banners': '/admin/banners',
  'payments': '/admin/payments',
  'chat': '/admin/chat',
  'city manager': '/admin/city-manager',
  'inventory': '/admin/inventory',
  'reports': '/admin/reports',
  'marketing': '/admin/ai-marketing-hub',
  'fraud': '/admin/ai-fraud-detector',
  'analytics': '/admin/product-analytics',
};

interface CommandEntry {
  command: string;
  result: any;
  timestamp: string;
  status: 'success' | 'error';
}

export default function AdminAiGlobalManager() {
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [navAction, setNavAction] = useState<string | null>(null);
  const [history, setHistory] = useState<CommandEntry[]>(() => {
    try { return JSON.parse(localStorage.getItem('ai_global_manager_history') || '[]'); } catch { return []; }
  });

  useEffect(() => {
    // Also sync from DB if localStorage empty
    if (history.length === 0) {
      supabase.from('site_settings').select('value').eq('key', 'ai_global_manager_history').maybeSingle().then(({ data }) => {
        if (data?.value && Array.isArray(data.value) && data.value.length > 0) {
          setHistory(data.value as CommandEntry[]);
        }
      });
    }
  }, []);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const tryNavigation = (command: string): boolean => {
    const lower = command.toLowerCase();
    const goToMatch = lower.match(/go\s+to\s+(.+)|navigate\s+to\s+(.+)|open\s+(.+)|take\s+me\s+to\s+(.+)/);
    const target = (goToMatch?.[1] || goToMatch?.[2] || goToMatch?.[3] || goToMatch?.[4] || '').trim();
    if (!target) return false;
    for (const [key, path] of Object.entries(NAVIGATION_MAP)) {
      if (target.includes(key)) {
        setNavAction(path);
        toast({ title: `Navigating to ${key}` });
        setTimeout(() => navigate(path), 1000);
        return true;
      }
    }
    return false;
  };

  const processCommand = async (cmd?: string) => {
    const command = (cmd || input).trim();
    if (!command) return;
    setInput('');
    setNavAction(null);
    setResult(null);

    if (tryNavigation(command)) return;

    setProcessing(true);

    try {
      const [ordersRes, productsRes, settingsRes] = await Promise.all([
        supabase.from('orders').select('id, status, total_amount, created_at').order('created_at', { ascending: false }).limit(100),
        supabase.from('products').select('id, title, stock, sold, price, is_active').order('sold', { ascending: false }).limit(50),
        supabase.from('site_settings').select('*'),
      ]);

      const now = new Date();
      const pkTime = new Date(now.getTime() + 5 * 60 * 60 * 1000);
      const today = pkTime.toISOString().split('T')[0];
      const todayOrders = (ordersRes.data || []).filter(o => o.created_at?.startsWith(today));
      const pendingOrders = (ordersRes.data || []).filter(o => o.status === 'pending');
      const lowStock = (productsRes.data || []).filter(p => (p.stock || 0) < 5);
      const monthRevenue = (ordersRes.data || []).filter(o => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total_amount || 0), 0);
      const settingsMap: Record<string, any> = {};
      (settingsRes.data || []).forEach(s => { settingsMap[s.key] = s.value; });

      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          type: 'global-manager',
          messages: [{
            role: 'user',
            content: `You are the AI Global Manager for a universal e-commerce platform (currently selling Shoes & Bags but category-agnostic). Current time is UTC+5 (Pakistan Time): ${pkTime.toLocaleString('en-PK')}.

ADMIN COMMAND: "${command}"

LIVE DATA SNAPSHOT:
- Today's Orders (PKT): ${todayOrders.length} | Total: Rs. ${todayOrders.reduce((s, o) => s + Number(o.total_amount || 0), 0).toLocaleString()}
- Pending Orders: ${pendingOrders.length}
- Total Monthly Revenue: Rs. ${monthRevenue.toLocaleString()}
- Low Stock Products (<5): ${lowStock.map(p => p.title).join(', ') || 'None'}
- Top 5 Products: ${(productsRes.data || []).slice(0, 5).map(p => `${p.title} (sold:${p.sold})`).join(', ')}
- Current Settings: ${JSON.stringify(settingsMap).slice(0, 500)}

CAPABILITIES:
1. Read and report data (orders, revenue, products, customers)
2. Update site_settings table via ACTION_JSON
3. Apply store-wide discounts via ACTION_JSON (updates products table)
4. Navigate the admin dashboard

For DB actions, return ACTION_JSON inside <ACTION_JSON>...</ACTION_JSON> tags. Examples:
- Change site name: <ACTION_JSON>{"action":"update_setting","key":"shop_name","value":"New Store Name"}</ACTION_JSON>
- Apply discount: <ACTION_JSON>{"action":"store_discount","percent":20,"hours":12}</ACTION_JSON>
- Update fee: <ACTION_JSON>{"action":"update_setting","key":"delivery_fee","value":"250"}</ACTION_JSON>

Respond with JSON:
{
  "understanding": "what admin wants",
  "response": "clear confirmation or data in English",
  "actionTaken": true/false,
  "actionDescription": "what was updated",
  "data": { "key": "value" },
  "highlights": ["stat 1", "stat 2"],
  "chartType": "number|list|table"
}
Return ONLY valid JSON inside <RESPONSE_JSON>...</RESPONSE_JSON> and optionally <ACTION_JSON>...</ACTION_JSON>.`
          }],
        },
      });

      if (error) throw error;

      const raw = typeof data === 'string' ? data : JSON.stringify(data);

      const actionMatch = raw.match(/<ACTION_JSON>([\s\S]*?)<\/ACTION_JSON>/);
      if (actionMatch) {
        try {
          const action = JSON.parse(actionMatch[1]);
          if (action.action === 'update_setting') {
            await supabase.from('site_settings').upsert({ key: action.key, value: action.value }, { onConflict: 'key' });
            toast({ title: `✅ Setting "${action.key}" updated!` });
          } else if (action.action === 'store_discount') {
            await supabase.from('products').update({
              discount_percent: action.percent,
              is_flash_sale: action.hours <= 24,
            }).eq('is_active', true);
            toast({ title: `✅ ${action.percent}% discount applied to all products!` });
          } else if (action.action === 'create_setting') {
            await supabase.from('site_settings').upsert({ key: action.key, value: action.value }, { onConflict: 'key' });
            toast({ title: `✅ Setting "${action.key}" created!` });
          }
        } catch (e) { console.error('Action parse error:', e); }
      }

      let parsed: any = {};
      const respMatch = raw.match(/<RESPONSE_JSON>([\s\S]*?)<\/RESPONSE_JSON>/);
      if (respMatch) {
        try { parsed = JSON.parse(respMatch[1]); } catch {}
      } else {
        const m = raw.match(/\{[\s\S]*\}/);
        if (m) {
          try { parsed = JSON.parse(m[0]); } catch {}
        }
        if (!parsed.response) {
          parsed = { response: raw.replace(/<[^>]+>/g, '').trim(), understanding: command, highlights: [] };
        }
      }

      setResult(parsed);

      // PKT timestamp (UTC+5)
      const pktTimestamp = new Date(Date.now() + 5 * 3600000).toISOString();
      const entry: CommandEntry = {
        command,
        result: parsed,
        timestamp: pktTimestamp,
        status: 'success',
      };
      const newHistory = [entry, ...history].slice(0, 30);
      setHistory(newHistory);
      localStorage.setItem('ai_global_manager_history', JSON.stringify(newHistory));
      // Persist to chat_history DB table for cross-device reference
      supabase.from('chat_history' as any).insert([
        { session_type: 'ai_global_manager', role: 'user', content: command, metadata: { type: 'command' }, created_at: pktTimestamp },
        { session_type: 'ai_global_manager', role: 'assistant', content: parsed.response || JSON.stringify(parsed), metadata: parsed, created_at: pktTimestamp },
      ]).then(() => {});
      // Also backup to site_settings
      supabase.from('site_settings').upsert({ key: 'ai_global_manager_history', value: newHistory }, { onConflict: 'key' }).then(() => {});

      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

    } catch (e: any) {
      const errPkt = new Date(Date.now() + 5 * 3600000).toISOString();
      const entry: CommandEntry = { command, result: null, timestamp: errPkt, status: 'error' };
      const newHistory = [entry, ...history].slice(0, 30);
      setHistory(newHistory);
      localStorage.setItem('ai_global_manager_history', JSON.stringify(newHistory));
      supabase.from('site_settings').upsert({ key: 'ai_global_manager_history', value: newHistory }, { onConflict: 'key' }).then(() => {});
      supabase.from('chat_history' as any).insert([
        { session_type: 'ai_global_manager', role: 'user', content: command, metadata: { error: e.message }, created_at: errPkt },
      ]).then(() => {});
      toast({ title: 'AI Error', description: e.message, variant: 'destructive' });
    }
    setProcessing(false);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Command className="h-5 w-5 text-primary" /> AI Global Manager
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Text-based command center — type any instruction and AI instantly acts on it.
          </p>
        </div>
        <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
          UTC+5 · PKT Active
        </Badge>
      </div>

      {/* Quick Commands */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {QUICK_COMMANDS.map((qc, i) => (
          <button
            key={i}
            onClick={() => processCommand(qc.example)}
            disabled={processing}
            className="flex items-start gap-2 text-left p-3 rounded-xl border bg-card hover:bg-accent hover:border-primary/30 transition-all text-xs group"
          >
            <qc.icon className="h-4 w-4 text-primary shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
            <span className="leading-tight">{qc.label}</span>
          </button>
        ))}
      </div>

      {/* Command Input */}
      <div className="bg-card border rounded-xl p-4 space-y-3">
        <Label className="text-sm font-semibold flex items-center gap-1.5">
          <Zap className="h-4 w-4 text-primary" /> Type Your Command
        </Label>
        <div className="flex gap-2">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder='e.g. "Change site title to Stopy Luxury" or "Apply 15% discount on all shoes for 6 hours"'
            rows={2}
            className="flex-1 resize-none"
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                processCommand();
              }
            }}
          />
          <Button
            onClick={() => processCommand()}
            disabled={processing || !input.trim()}
            className="self-end gap-1 px-5"
          >
            {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {processing ? 'Processing...' : 'Execute'}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">Press Enter to execute · Shift+Enter for new line</p>
      </div>

      {/* Navigation Overlay */}
      {navAction && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 flex items-center gap-4">
          <Navigation className="h-8 w-8 text-primary animate-pulse" />
          <div>
            <p className="font-bold">Navigating...</p>
            <p className="text-sm text-muted-foreground">{navAction}</p>
          </div>
        </div>
      )}

      {/* Result */}
      <div ref={resultRef}>
        {processing && (
          <div className="bg-card border rounded-xl p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">AI is processing your command...</p>
          </div>
        )}

        {result && !processing && (
          <div className="bg-card border rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <Label className="text-base font-semibold">Command Executed</Label>
              {result.actionTaken && (
                <Badge className="bg-green-100 text-green-800 border-green-200 text-xs ml-auto">DB Updated</Badge>
              )}
            </div>

            <div className="bg-muted/30 rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-1">AI understood: <em>{result.understanding}</em></p>
              <p className="text-sm leading-relaxed">{result.response}</p>
              {result.actionDescription && (
                <p className="text-xs text-primary mt-2 font-medium">✅ {result.actionDescription}</p>
              )}
            </div>

            {result.highlights?.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {result.highlights.map((h: string, i: number) => (
                  <div key={i} className="bg-primary/5 border border-primary/10 rounded-lg p-3 text-center">
                    <p className="text-sm font-semibold">{h}</p>
                  </div>
                ))}
              </div>
            )}

            {result.data && typeof result.data === 'object' && Object.keys(result.data).length > 0 && (
              <div className="bg-muted/20 rounded-lg p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Data Details</p>
                <div className="grid grid-cols-2 gap-1">
                  {Object.entries(result.data).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between text-xs py-1 border-b border-muted last:border-0">
                      <span className="text-muted-foreground capitalize">{k.replace(/_/g, ' ')}</span>
                      <span className="font-medium">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Command History */}
      {history.length > 0 && (
        <div className="bg-card rounded-xl border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold flex items-center gap-1.5">
              <History className="h-4 w-4" /> Command History
            </Label>
            <Button
              size="sm" variant="ghost"
              className="h-7 gap-1 text-destructive hover:text-destructive text-xs"
              onClick={() => { setHistory([]); localStorage.removeItem('ai_global_manager_history'); }}
            >
              <Trash2 className="h-3 w-3" /> Clear
            </Button>
          </div>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {history.map((h, i) => (
              <button
                key={i}
                onClick={() => { setResult(h.result); }}
                className="w-full text-left border rounded-lg p-2.5 hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${h.status === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-xs font-medium truncate flex-1">{h.command}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {new Date(h.timestamp).toLocaleTimeString('en-PK', { timeZone: 'Asia/Karachi' })}
                  </span>
                </div>
                {h.result?.response && (
                  <p className="text-[10px] text-muted-foreground truncate pl-3.5">{h.result.response}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
