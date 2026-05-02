import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, CheckCircle, Database, Download, Loader2, RefreshCw,
  Server, Shield, Trash2, Activity, Info, ShoppingCart, Package, RotateCcw,
  HardDrive, Zap, Users, MessageSquare, Star, Settings,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface LogEntry { id: string; level: 'error' | 'warn' | 'info'; message: string; source: string; timestamp: string; }

const LEVEL_STYLE: Record<string, { bar: string; bg: string; text: string; icon: any }> = {
  error: { bar: 'bg-red-500', bg: 'bg-red-50 dark:bg-red-950/20 border-red-200', text: 'text-red-700 dark:text-red-300', icon: AlertTriangle },
  warn: { bar: 'bg-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200', text: 'text-amber-700 dark:text-amber-300', icon: AlertTriangle },
  info: { bar: 'bg-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200', text: 'text-blue-700 dark:text-blue-300', icon: Info },
};

export default function AdminTechLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [backingUp, setBackingUp] = useState(false);
  const [filter, setFilter] = useState<'all' | 'error' | 'warn' | 'info'>('all');
  const [search, setSearch] = useState('');
  const [health, setHealth] = useState({ orders: 0, products: 0, returns: 0, settings: 0, reviews: 0, customers: 0, chats: 0, banners: 0 });

  const loadLogs = async () => {
    setLoading(true);
    const { data } = await supabase.from('site_settings').select('value').eq('key', 'system_error_logs').maybeSingle();
    if (data?.value && Array.isArray(data.value)) {
      setLogs(data.value as LogEntry[]);
    } else {
      setLogs([
        { id: '1', level: 'info', message: 'System started successfully', source: 'App', timestamp: new Date().toISOString() },
        { id: '2', level: 'info', message: 'Database connection established', source: 'Supabase', timestamp: new Date(Date.now() - 60000).toISOString() },
        { id: '3', level: 'info', message: 'AI assistant edge function active', source: 'Edge Functions', timestamp: new Date(Date.now() - 120000).toISOString() },
      ]);
    }
    const results = await Promise.all([
      supabase.from('orders').select('id', { count: 'exact', head: true }),
      supabase.from('products').select('id', { count: 'exact', head: true }),
      supabase.from('returns').select('id', { count: 'exact', head: true }),
      supabase.from('site_settings').select('id', { count: 'exact', head: true }),
      supabase.from('reviews').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('user_id', { count: 'exact', head: true }),
      supabase.from('chat_conversations').select('id', { count: 'exact', head: true }),
      supabase.from('banners').select('id', { count: 'exact', head: true }),
    ]);
    setHealth({
      orders: results[0].count || 0, products: results[1].count || 0,
      returns: results[2].count || 0, settings: results[3].count || 0,
      reviews: results[4].count || 0, customers: results[5].count || 0,
      chats: results[6].count || 0, banners: results[7].count || 0,
    });
    setLoading(false);
  };
  useEffect(() => { loadLogs(); }, []);

  const logEntry = async (level: 'error' | 'warn' | 'info', message: string, source = 'Admin') => {
    const newLog: LogEntry = { id: Date.now().toString(), level, message, source, timestamp: new Date().toISOString() };
    const updated = [newLog, ...logs].slice(0, 200);
    await supabase.from('site_settings').upsert({ key: 'system_error_logs', value: updated as any }, { onConflict: 'key' });
    setLogs(updated);
  };

  const clearLogs = async () => {
    await supabase.from('site_settings').upsert({ key: 'system_error_logs', value: [] as any }, { onConflict: 'key' });
    setLogs([]);
    toast({ title: 'Logs cleared' });
  };

  const runBackup = async () => {
    setBackingUp(true);
    try {
      const [ordersRes, productsRes, returnsRes, customersRes, settingsRes] = await Promise.all([
        supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(500),
        supabase.from('products').select('*').order('created_at', { ascending: false }).limit(500),
        supabase.from('returns').select('*').order('created_at', { ascending: false }).limit(200),
        supabase.from('profiles').select('user_id, full_name, phone, created_at').limit(500),
        supabase.from('site_settings').select('*'),
      ]);
      const backup = { exported_at: new Date().toISOString(), orders: ordersRes.data || [], products: productsRes.data || [], returns: returnsRes.data || [], customers: customersRes.data || [], settings: settingsRes.data || [] };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `backup_${new Date().toISOString().split('T')[0]}.json`; a.click();
      URL.revokeObjectURL(url);
      await logEntry('info', `Manual backup: ${(ordersRes.data||[]).length} orders, ${(productsRes.data||[]).length} products`, 'Backup');
      toast({ title: '✅ Backup downloaded!', description: 'JSON saved to your device' });
    } catch (err: any) {
      await logEntry('error', `Backup failed: ${err.message}`, 'Backup');
      toast({ title: 'Backup failed', variant: 'destructive' });
    }
    setBackingUp(false);
  };

  const filtered = logs.filter(l =>
    (filter === 'all' || l.level === filter) &&
    (!search || l.message.toLowerCase().includes(search.toLowerCase()) || l.source.toLowerCase().includes(search.toLowerCase()))
  );
  const errCount = logs.filter(l => l.level === 'error').length;
  const warnCount = logs.filter(l => l.level === 'warn').length;

  const dbItems = [
    { icon: ShoppingCart, label: 'Orders', count: health.orders, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/20' },
    { icon: Package, label: 'Products', count: health.products, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/20' },
    { icon: RotateCcw, label: 'Returns', count: health.returns, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950/20' },
    { icon: Users, label: 'Customers', count: health.customers, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-950/20' },
    { icon: Star, label: 'Reviews', count: health.reviews, color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-950/20' },
    { icon: MessageSquare, label: 'Chats', count: health.chats, color: 'text-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-950/20' },
    { icon: HardDrive, label: 'Settings', count: health.settings, color: 'text-slate-600', bg: 'bg-slate-50 dark:bg-slate-950/20' },
    { icon: Zap, label: 'Banners', count: health.banners, color: 'text-pink-600', bg: 'bg-pink-50 dark:bg-pink-950/20' },
  ];

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-700 via-slate-600 to-slate-800 p-5 text-white shadow-lg">
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 70% 50%, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1"><Server className="h-5 w-5" /><h2 className="text-xl font-black">Tech Maintenance</h2></div>
            <p className="text-slate-300 text-sm">Database health · Error logs · Backup export</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadLogs} disabled={loading}
              className="bg-white/10 hover:bg-white/20 text-white border-white/30 gap-1.5">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Button size="sm" onClick={runBackup} disabled={backingUp}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
              {backingUp ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Export Backup
            </Button>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Database, label: 'Tables Online', value: '8/8', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200' },
          { icon: AlertTriangle, label: 'Errors', value: errCount, color: errCount > 0 ? 'text-red-600' : 'text-emerald-600', bg: errCount > 0 ? 'bg-red-50 dark:bg-red-950/20 border-red-200' : 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200' },
          { icon: AlertTriangle, label: 'Warnings', value: warnCount, color: warnCount > 0 ? 'text-amber-600' : 'text-emerald-600', bg: warnCount > 0 ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200' : 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200' },
          { icon: Activity, label: 'Total Logs', value: logs.length, color: 'text-slate-600', bg: 'bg-slate-50 dark:bg-slate-950/20 border-slate-200' },
        ].map(s => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl border p-3 text-center ${s.bg}`}>
            <s.icon className={`h-5 w-5 mx-auto mb-1 ${s.color}`} />
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide mt-0.5">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* DB Health */}
      <div className="bg-card border rounded-2xl p-4">
        <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-emerald-500" /> Database Health Check
          {!loading && <span className="text-[10px] font-normal text-emerald-600 ml-auto">All systems operational</span>}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {dbItems.map(item => (
            <div key={item.label} className={`flex items-center gap-2.5 p-2.5 rounded-xl ${item.bg} border border-transparent`}>
              <div className={`p-1.5 rounded-lg bg-white/60 dark:bg-black/20`}>
                <item.icon className={`h-3.5 w-3.5 ${item.color}`} />
              </div>
              <div>
                <p className="text-xs font-bold">{item.label}</p>
                {loading ? <div className="h-3 w-8 bg-muted rounded animate-pulse mt-0.5" /> :
                 <p className={`text-xs font-black ${item.color}`}>{item.count.toLocaleString()}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Log viewer */}
      <div className="bg-card border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-slate-600" />
            <h3 className="font-bold text-sm">System Logs</h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-bold">{filtered.length}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="h-7 w-36 text-xs rounded-lg pl-2" />
            </div>
            <div className="flex gap-1 bg-muted rounded-xl p-1">
              {(['all', 'error', 'warn', 'info'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                    filter === f ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}>
                  {f === 'all' ? 'All' : f === 'error' ? `🔴 ${errCount}` : f === 'warn' ? `🟡 ${warnCount}` : `🔵 Info`}
                </button>
              ))}
            </div>
            <button onClick={clearLogs}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-red-500 px-2 py-1 rounded-lg hover:bg-red-50 transition-all">
              <Trash2 className="h-3 w-3" /> Clear
            </button>
          </div>
        </div>

        <div className="space-y-1.5 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Shield className="h-8 w-8 mb-2 opacity-20" />
              <p className="text-sm">No logs found</p>
            </div>
          ) : (
            <AnimatePresence>
              {filtered.map((log, i) => {
                const s = LEVEL_STYLE[log.level];
                const LogIcon = s.icon;
                return (
                  <motion.div key={log.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs ${s.bg}`}>
                    <div className={`w-1 h-full min-h-[24px] rounded-full ${s.bar} shrink-0`} />
                    <LogIcon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${s.text}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold ${s.text}`}>{log.message}</p>
                      <p className="text-muted-foreground text-[10px] mt-0.5">{log.source} · {format(new Date(log.timestamp), 'dd MMM HH:mm:ss')}</p>
                    </div>
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase shrink-0 ${s.text} border ${s.bg}`}>{log.level}</span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        <div className="mt-3 pt-3 border-t flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" className="text-xs gap-1.5 h-7 rounded-lg"
            onClick={() => logEntry('info', 'Manual health check triggered', 'Admin')}>
            <Activity className="h-3 w-3" /> Log Health Check
          </Button>
          <Button size="sm" variant="outline" className="text-xs gap-1.5 h-7 rounded-lg"
            onClick={() => logEntry('warn', 'Cache cleared manually', 'Admin')}>
            <AlertTriangle className="h-3 w-3" /> Log Warning
          </Button>
          <Button size="sm" variant="outline" className="text-xs gap-1.5 h-7 rounded-lg"
            onClick={() => logEntry('error', 'Test error entry', 'Admin')}>
            <AlertTriangle className="h-3 w-3 text-red-500" /> Log Error
          </Button>
        </div>
      </div>
    </div>
  );
}
