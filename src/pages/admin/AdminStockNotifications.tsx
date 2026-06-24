import { useState, useEffect } from 'react';
import { Bell, Trash2, Phone, Mail, User, Package, RefreshCw, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';

interface Notification {
  id?: string;
  product_id: string;
  product_name: string;
  size: string;
  customer_name: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
  notified?: boolean;
}

export default function AdminStockNotifications() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [source, setSource] = useState<'table' | 'fallback' | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      // Try dedicated table first
      const { data, error } = await supabase
        .from('stock_notifications' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setItems(data as Notification[]);
        setSource('table');
      } else {
        // Fallback: read from site_settings JSON blob
        const { data: setting } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', 'stock_notifications_fallback')
          .maybeSingle();
        const list: Notification[] = Array.isArray(setting?.value) ? setting.value : [];
        setItems(list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        setSource('fallback');
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const markNotified = async (item: Notification, idx: number) => {
    if (source === 'table' && item.id) {
      await supabase.from('stock_notifications' as any).update({ notified: true } as any).eq('id', item.id);
    }
    const updated = items.map((n, i) => i === idx ? { ...n, notified: true } : n);
    setItems(updated);
    if (source === 'fallback') {
      await supabase.from('site_settings').upsert({ key: 'stock_notifications_fallback', value: updated as any });
    }
    toast({ title: '✅ Marked as notified' });
  };

  const deleteItem = async (item: Notification, idx: number) => {
    if (source === 'table' && item.id) {
      await supabase.from('stock_notifications' as any).delete().eq('id', item.id);
    }
    const updated = items.filter((_, i) => i !== idx);
    setItems(updated);
    if (source === 'fallback') {
      await supabase.from('site_settings').upsert({ key: 'stock_notifications_fallback', value: updated as any });
    }
    toast({ title: 'Deleted' });
  };

  const filtered = items.filter(n =>
    !search ||
    n.product_name?.toLowerCase().includes(search.toLowerCase()) ||
    n.size?.toLowerCase().includes(search.toLowerCase()) ||
    n.phone?.includes(search) ||
    n.customer_name?.toLowerCase().includes(search.toLowerCase())
  );

  const pending = filtered.filter(n => !n.notified);
  const done = filtered.filter(n => n.notified);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Bell className="h-6 w-6 text-amber-500" />
          <div>
            <h1 className="text-xl font-bold">Stock Notifications</h1>
            <p className="text-xs text-muted-foreground">Customers waiting for out-of-stock sizes</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pending.length > 0 && (
            <Badge className="bg-amber-100 text-amber-700 border-amber-200">
              {pending.length} pending
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* SQL hint if using fallback */}
      {source === 'fallback' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800 space-y-1">
          <p className="font-semibold">💡 Optional: Create dedicated table for better tracking</p>
          <p>Run this in Supabase SQL Editor for full features (mark notified, delete per-row):</p>
          <pre className="bg-blue-100 rounded p-2 text-[10px] overflow-x-auto whitespace-pre-wrap mt-1">{`CREATE TABLE IF NOT EXISTS stock_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id TEXT,
  product_name TEXT,
  size TEXT,
  customer_name TEXT,
  phone TEXT,
  email TEXT,
  notified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE stock_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access" ON stock_notifications FOR ALL USING (true);`}</pre>
        </div>
      )}

      {/* Search */}
      <Input
        placeholder="Search by product, size, phone, name..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <Bell className="h-10 w-10 text-muted-foreground/30 mx-auto" />
          <p className="text-muted-foreground font-medium">No notifications yet</p>
          <p className="text-xs text-muted-foreground">When customers click "Notify Me" on out-of-stock sizes, they'll appear here.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pending */}
          {pending.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-amber-700 mb-3 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                Pending — needs attention ({pending.length})
              </h2>
              <div className="space-y-2">
                {pending.map((item, idx) => (
                  <NotifCard
                    key={idx}
                    item={item}
                    onMarkNotified={() => markNotified(item, items.indexOf(item))}
                    onDelete={() => deleteItem(item, items.indexOf(item))}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Done */}
          {done.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                Notified ({done.length})
              </h2>
              <div className="space-y-2 opacity-60">
                {done.map((item, idx) => (
                  <NotifCard
                    key={idx}
                    item={item}
                    onMarkNotified={() => {}}
                    onDelete={() => deleteItem(item, items.indexOf(item))}
                    isDone
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NotifCard({ item, onMarkNotified, onDelete, isDone }: {
  item: Notification;
  onMarkNotified: () => void;
  onDelete: () => void;
  isDone?: boolean;
}) {
  const waLink = item.phone
    ? `https://wa.me/${item.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi${item.customer_name ? ' ' + item.customer_name : ''}! Great news — Size ${item.size} of ${item.product_name} is back in stock! 🎉`)}`
    : null;

  return (
    <div className="bg-card border rounded-xl p-4 flex items-start gap-3">
      {/* Size badge */}
      <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 font-bold text-sm flex items-center justify-center shrink-0">
        {item.size}
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <p className="text-sm font-medium line-clamp-1">{item.product_name}</p>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
            {item.created_at ? new Date(item.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
          </span>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
          {item.customer_name && (
            <span className="flex items-center gap-1"><User className="h-3 w-3" />{item.customer_name}</span>
          )}
          {item.phone && (
            <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{item.phone}</span>
          )}
          {item.email && (
            <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{item.email}</span>
          )}
        </div>

        <div className="flex items-center gap-2 pt-1 flex-wrap">
          {waLink && (
            <a href={waLink} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-green-300 text-green-700 hover:bg-green-50">
                <MessageCircle className="h-3 w-3" /> WhatsApp
              </Button>
            </a>
          )}
          {!isDone && (
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={onMarkNotified}>
              ✅ Mark Notified
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive gap-1 ml-auto" onClick={onDelete}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
