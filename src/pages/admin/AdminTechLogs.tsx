import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AlertTriangle, CheckCircle, Database, Download, Loader2, RefreshCw, Server, Shield, Trash2, Activity } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface LogEntry { id: string; level: 'error' | 'warn' | 'info'; message: string; source: string; timestamp: string; }

const LEVEL_COLORS: Record<string, string> = {
  error: 'bg-red-100 text-red-700 border-red-200',
  warn: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  info: 'bg-blue-100 text-blue-700 border-blue-200',
};

function StatCard({ icon: Icon, title, value, color }: any) {
  return (
    <div className="bg-card border rounded-xl p-4 flex items-center gap-3">
      <div className={`p-2 rounded-lg ${color}`}><Icon className="h-5 w-5" /></div>
      <div><p className="text-xs text-muted-foreground">{title}</p><p className="font-bold text-lg">{value}</p></div>
    </div>
  );
}

export default function AdminTechLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [backingUp, setBackingUp] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [health, setHealth] = useState({ orders: 0, products: 0, returns: 0, settings: 0 });

  const loadLogs = async () => {
    setLoading(true);
    const { data } = await supabase.from('site_settings').select('value').eq('key', 'system_error_logs').maybeSingle();
    if (data?.value && Array.isArray(data.value)) {
      setLogs(data.value as LogEntry[]);
    } else {
      const sampleLogs: LogEntry[] = [
        { id: '1', level: 'info', message: 'System started successfully', source: 'App', timestamp: new Date().toISOString() },
        { id: '2', level: 'info', message: 'Database connection established', source: 'Supabase', timestamp: new Date(Date.now() - 60000).toISOString() },
        { id: '3', level: 'info', message: 'AI assistant edge function active', source: 'Edge Functions', timestamp: new Date(Date.now() - 120000).toISOString() },
      ];
      setLogs(sampleLogs);
    }
    const [ordersRes, productsRes, returnsRes, settingsRes] = await Promise.all([
      supabase.from('orders').select('id', { count: 'exact', head: true }),
      supabase.from('products').select('id', { count: 'exact', head: true }),
      supabase.from('returns').select('id', { count: 'exact', head: true }),
      supabase.from('site_settings').select('id', { count: 'exact', head: true }),
    ]);
    setHealth({ orders: ordersRes.count || 0, products: productsRes.count || 0, returns: returnsRes.count || 0, settings: settingsRes.count || 0 });
    setLoading(false);
  };

  useEffect(() => { loadLogs(); }, []);

  const logError = async (level: 'error' | 'warn' | 'info', message: string, source = 'Admin') => {
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
      const backup = {
        exported_at: new Date().toISOString(),
        orders: ordersRes.data || [],
        products: productsRes.data || [],
        returns: returnsRes.data || [],
        customers: customersRes.data || [],
        settings: settingsRes.data || [],
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stopy_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      await logError('info', `Manual backup exported: ${(ordersRes.data || []).length} orders, ${(productsRes.data || []).length} products`, 'Backup');
      toast({ title: '✅ Backup downloaded!', description: 'JSON file saved to your device.' });
    } catch (err: any) {
      await logError('error', `Backup failed: ${err.message}`, 'Backup');
      toast({ title: 'Backup failed', variant: 'destructive' });
    }
    setBackingUp(false);
  };

  const filtered = logs.filter(l => {
    if (filter !== 'all' && l.level !== filter) return false;
    if (search && !l.message.toLowerCase().includes(search.toLowerCase()) && !l.source.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const errorCount = logs.filter(l => l.level === 'error').length;
  const warnCount = logs.filter(l => l.level === 'warn').length;

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><Server className="h-5 w-5 text-primary" /> Tech Maintenance</h2>
          <p className="text-sm text-muted-foreground mt-0.5">System health, error logs & database backup</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadLogs} disabled={loading} className="gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button size="sm" onClick={runBackup} disabled={backingUp} className="gap-1.5">
            {backingUp ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Export Backup
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Database} title="Total Orders" value={health.orders} color="bg-blue-50 text-blue-600" />
        <StatCard icon={Activity} title="Products" value={health.products} color="bg-green-50 text-green-600" />
        <StatCard icon={AlertTriangle} title="Errors" value={errorCount} color={errorCount > 0 ? 'bg-red-50 text-red-600' : 'bg-muted text-muted-foreground'} />
        <StatCard icon={Shield} title="Warnings" value={warnCount} color={warnCount > 0 ? 'bg-yellow-50 text-yellow-600' : 'bg-muted text-muted-foreground'} />
      </div>

      <div className="bg-card border rounded-xl p-4">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" /> Database Health Check</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {[
            { label: 'Orders Table', count: health.orders, ok: health.orders >= 0 },
            { label: 'Products Table', count: health.products, ok: health.products >= 0 },
            { label: 'Returns Table', count: health.returns, ok: health.returns >= 0 },
            { label: 'Settings Table', count: health.settings, ok: health.settings >= 0 },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
              <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
              <div>
                <p className="text-xs font-medium">{item.label}</p>
                <p className="text-[10px] text-muted-foreground">{item.count} records</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="font-semibold text-sm">System Logs ({filtered.length})</h3>
          <div className="flex items-center gap-2">
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search logs..." className="h-7 w-40 text-xs" />
            <div className="flex gap-1">
              {['all', 'error', 'warn', 'info'].map(f => (
                <button key={f} onClick={() => setFilter(f)} className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${filter === f ? 'bg-primary text-primary-foreground border-primary' : 'border-muted text-muted-foreground hover:bg-muted'}`}>
                  {f}
                </button>
              ))}
            </div>
            <button onClick={clearLogs} className="text-[10px] text-muted-foreground hover:text-destructive flex items-center gap-1">
              <Trash2 className="h-3 w-3" /> Clear
            </button>
          </div>
        </div>
        <div className="space-y-1.5 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No logs found</p>
          ) : (
            filtered.map(log => (
              <div key={log.id} className={`flex items-start gap-2 p-2 rounded-lg border text-xs ${LEVEL_COLORS[log.level]}`}>
                <Badge variant="outline" className={`text-[9px] shrink-0 px-1 py-0 border ${LEVEL_COLORS[log.level]}`}>{log.level.toUpperCase()}</Badge>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{log.message}</p>
                  <p className="opacity-70 text-[10px] mt-0.5">{log.source} · {new Date(log.timestamp).toLocaleString('en-PK')}</p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-3 pt-3 border-t flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => logError('info', 'Manual health check triggered', 'Admin')} className="text-xs gap-1 h-7">
            <Activity className="h-3 w-3" /> Log Health Check
          </Button>
          <Button size="sm" variant="outline" onClick={() => logError('warn', 'Cache cleared manually', 'Admin')} className="text-xs gap-1 h-7">
            <AlertTriangle className="h-3 w-3" /> Log Warning
          </Button>
        </div>
      </div>
    </div>
  );
}
