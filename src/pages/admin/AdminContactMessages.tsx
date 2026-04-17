import { useEffect, useState } from 'react';
import { Mail, Search, RefreshCw, Loader2, CheckCircle, Eye, DatabaseZap, Copy, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';

const MIGRATION_SQL = `create table if not exists contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text,
  subject text,
  message text,
  is_read boolean default false,
  created_at timestamptz default now()
);
alter table contact_messages enable row level security;
create policy "Admin full access" on contact_messages
  for all using (true);`;

export default function AdminContactMessages() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [tableNotFound, setTableNotFound] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);

  const fetchMessages = async () => {
    setLoading(true);
    setTableNotFound(false);
    const { data, error } = await supabase
      .from('contact_messages' as any)
      .select('*')
      .order('created_at', { ascending: false });
    setLoading(false);
    if (error) {
      const msg = error.message || '';
      if (
        msg.includes('schema cache') ||
        msg.includes('contact_messages') ||
        msg.includes('does not exist') ||
        msg.includes('relation') ||
        error.code === '42P01' ||
        error.code === 'PGRST200'
      ) {
        setTableNotFound(true);
      } else {
        toast({ title: 'Failed to load messages', description: msg, variant: 'destructive' });
      }
      return;
    }
    setMessages(data || []);
  };

  useEffect(() => { fetchMessages(); }, []);

  const markRead = async (message: any) => {
    const { error } = await supabase.from('contact_messages' as any).update({ is_read: true }).eq('id', message.id);
    if (error) { toast({ title: 'Could not mark as read', description: error.message, variant: 'destructive' }); return; }
    setMessages(prev => prev.map(m => m.id === message.id ? { ...m, is_read: true } : m));
    setSelected((prev: any) => prev?.id === message.id ? { ...prev, is_read: true } : prev);
  };

  const copySQL = () => {
    navigator.clipboard.writeText(MIGRATION_SQL);
    toast({ title: '✅ SQL copied! Paste it in Supabase SQL Editor.' });
  };

  const filtered = messages.filter(m =>
    String(m.name || '').toLowerCase().includes(search.toLowerCase()) ||
    String(m.email || '').toLowerCase().includes(search.toLowerCase()) ||
    String(m.subject || '').toLowerCase().includes(search.toLowerCase()) ||
    String(m.message || '').toLowerCase().includes(search.toLowerCase())
  );

  const unread = messages.filter(m => !m.is_read).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg"><Mail className="h-5 w-5 text-primary" /></div>
          <div>
            <h1 className="text-2xl font-bold">Contact Messages</h1>
            <p className="text-sm text-muted-foreground">Inbox for Contact Us form submissions</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchMessages} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Refresh
        </Button>
      </div>

      {/* Table not found — show setup instructions instead of red toast */}
      {tableNotFound ? (
        <div className="border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 rounded-xl p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg shrink-0">
              <DatabaseZap className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="font-semibold text-amber-800 dark:text-amber-300">Contact Messages table not set up yet</p>
              <p className="text-sm text-amber-700/80 dark:text-amber-400/80 mt-1">
                Run the SQL below in your Supabase SQL Editor to create the table — takes 10 seconds.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">SQL to run:</p>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={copySQL} className="gap-1.5 text-xs border-amber-300 text-amber-700 hover:bg-amber-100">
                  <Copy className="h-3.5 w-3.5" /> Copy SQL
                </Button>
                <Button size="sm" variant="outline" asChild className="gap-1.5 text-xs border-amber-300 text-amber-700 hover:bg-amber-100">
                  <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" /> Open Supabase
                  </a>
                </Button>
              </div>
            </div>
            <pre className="bg-white dark:bg-zinc-900 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-xs overflow-x-auto text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
              {MIGRATION_SQL}
            </pre>
          </div>

          <div className="bg-white dark:bg-zinc-900/60 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-xs text-amber-700 dark:text-amber-400 space-y-1.5">
            <p className="font-semibold">Steps:</p>
            {[
              'Go to supabase.com → your project → SQL Editor',
              'Paste the SQL above and click Run',
              'Come back here and click Refresh',
            ].map((s, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                <span>{s}</span>
              </div>
            ))}
          </div>

          <Button onClick={fetchMessages} disabled={loading} variant="outline" className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-100">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Check Again
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="bg-card border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-xl font-bold">{messages.length}</p>
            </div>
            <div className="bg-card border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Unread</p>
              <p className="text-xl font-bold text-primary">{unread}</p>
            </div>
            <div className="bg-card border rounded-lg p-3 col-span-2 md:col-span-1">
              <p className="text-xs text-muted-foreground">Read</p>
              <p className="text-xl font-bold text-green-600">{messages.length - unread}</p>
            </div>
          </div>

          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search messages..." className="pl-10" />
          </div>

          <div className="bg-card border rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Name</th>
                  <th className="text-left p-3">Email</th>
                  <th className="text-left p-3">Subject</th>
                  <th className="text-left p-3">Date</th>
                  <th className="text-left p-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="p-8 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></td></tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-muted-foreground">
                      <Mail className="h-10 w-10 mx-auto mb-3 opacity-20" />
                      <p className="font-medium">No contact messages yet</p>
                      <p className="text-xs mt-1 opacity-60">Messages from the Contact Us page will appear here</p>
                    </td>
                  </tr>
                ) : filtered.map(message => (
                  <tr key={message.id} className="border-b hover:bg-accent/50">
                    <td className="p-3"><Badge variant={message.is_read ? 'outline' : 'default'}>{message.is_read ? 'Read' : 'Unread'}</Badge></td>
                    <td className="p-3 font-medium">{message.name}</td>
                    <td className="p-3">{message.email}</td>
                    <td className="p-3 max-w-[220px] truncate">{message.subject}</td>
                    <td className="p-3 text-xs">{message.created_at ? new Date(message.created_at).toLocaleString() : '-'}</td>
                    <td className="p-3">
                      <Button size="sm" variant="ghost" onClick={() => { setSelected(message); if (!message.is_read) markRead(message); }}>
                        <Eye className="h-4 w-4 mr-1" /> View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Contact Message</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><p className="text-muted-foreground text-xs">Name</p><p className="font-medium">{selected.name}</p></div>
                <div><p className="text-muted-foreground text-xs">Email</p><a href={`mailto:${selected.email}`} className="text-primary hover:underline">{selected.email}</a></div>
                <div className="md:col-span-2"><p className="text-muted-foreground text-xs">Subject</p><p className="font-medium">{selected.subject}</p></div>
              </div>
              <div className="bg-muted/40 rounded-lg p-3">
                <p className="text-muted-foreground text-xs mb-1">Message</p>
                <p className="whitespace-pre-wrap">{selected.message}</p>
              </div>
              <div className="flex gap-2">
                <Button asChild className="flex-1"><a href={`mailto:${selected.email}?subject=Re: ${encodeURIComponent(selected.subject || '')}`}>Reply by Email</a></Button>
                <Button variant="outline" onClick={() => markRead(selected)} disabled={selected.is_read}>
                  <CheckCircle className="h-4 w-4 mr-2" /> Mark Read
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
