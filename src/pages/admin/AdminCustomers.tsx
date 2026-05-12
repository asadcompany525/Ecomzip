import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Eye, Users, Trash2, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { ensureAdminSession } from '@/lib/adminSession';

const ADMIN_EMAIL = 'sscck@gmail.com';
const DEACTIVATED_CUSTOMERS_KEY = 'deactivated_customers';

const AdminCustomers = () => {
  const { user } = useAuth();
  const [profiles,       setProfiles]       = useState<any[]>([]);
  const [search,         setSearch]         = useState('');
  const [selected,       setSelected]       = useState<any>(null);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [deleteTarget,   setDeleteTarget]   = useState<any>(null);
  const [deleting,       setDeleting]       = useState(false);
  const [deleteError,    setDeleteError]    = useState('');

  const loadCustomers = useCallback(async () => {
    // 1. Get all staff / admin user IDs to exclude from customer list
    const { data: staffRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role', ['admin', 'moderator']);
    const excludedIds = (staffRoles || []).map((r: any) => r.user_id).filter(Boolean);

    // 2. Fetch non-deleted profiles that are NOT admin/staff
    let query = supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    // Exclude admin email explicitly
    query = query.neq('email', ADMIN_EMAIL);

    const [{ data, error }, hiddenRes] = await Promise.all([
      query,
      supabase.from('site_settings').select('value').eq('key', DEACTIVATED_CUSTOMERS_KEY).maybeSingle(),
    ]);
    if (error) { toast({ title: 'Failed to load customers', description: error.message, variant: 'destructive' }); return; }
    const hiddenCustomerIds = Array.isArray(hiddenRes.data?.value) ? hiddenRes.data.value : [];

    const filtered = (data || []).filter((p: any) => {
      // Exclude admin / staff user_ids
      if (excludedIds.includes(p.user_id)) return false;
      // Exclude soft-deleted
      if (p.is_deleted === true) return false;
      if (hiddenCustomerIds.includes(p.id) || hiddenCustomerIds.includes(p.user_id)) return false;
      return true;
    });

    setProfiles(filtered);
  }, []);

  useEffect(() => { loadCustomers(); }, [loadCustomers]);

  const viewCustomer = async (p: any) => {
    setSelected(p);
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', p.user_id)
      .order('created_at', { ascending: false });
    setCustomerOrders(data || []);
  };

  const confirmDelete = (p: any) => { setDeleteTarget(p); setDeleteError(''); };

  const handleSoftDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await ensureAdminSession();
      await supabase.from('user_roles').delete().eq('user_id', deleteTarget.user_id);
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', deleteTarget.id);

      if (error) {
        throw error;
      }

      const { data: existing } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', DEACTIVATED_CUSTOMERS_KEY)
        .maybeSingle();
      const hiddenIds = Array.isArray(existing?.value) ? existing.value : [];
      const nextHiddenIds = hiddenIds.filter((id: string) => id !== deleteTarget.id && id !== deleteTarget.user_id);
      await supabase.from('site_settings').upsert({ key: DEACTIVATED_CUSTOMERS_KEY, value: nextHiddenIds }, { onConflict: 'key' });

      setProfiles(prev => prev.filter(p => p.id !== deleteTarget.id));
      setDeleteTarget(null);
      if (selected?.id === deleteTarget.id) setSelected(null);
      toast({ title: '✅ Customer permanently deleted', description: 'Customer profile was removed from the database.' });
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to deactivate customer.');
    } finally {
      setDeleting(false);
    }
  };

  const filtered = profiles.filter(p =>
    (p.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.phone || '').includes(search)
  );

  const totalSpent = customerOrders.reduce((s, o) => s + Number(o.total || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-100 rounded-lg"><Users className="h-5 w-5 text-blue-600" /></div>
          <div>
            <h1 className="text-xl font-bold">Customers</h1>
            <p className="text-xs text-muted-foreground">Active registered store accounts (staff & admin excluded)</p>
          </div>
        </div>
        <div className="relative flex-1 max-w-sm ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, email, phone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Badge variant="outline">{profiles.length} Total</Badge>
      </div>

      <div className="bg-card rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="text-left p-3 font-semibold text-xs">Name</th>
              <th className="text-left p-3 font-semibold">Email</th>
              <th className="text-left p-3 font-semibold">Phone</th>
              <th className="text-left p-3 font-semibold text-amber-700">Password</th>
              <th className="text-left p-3 font-semibold">Joined</th>
              <th className="text-left p-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} className="border-b hover:bg-accent/50">
                <td className="p-3 font-medium">{p.full_name || 'N/A'}</td>
                <td className="p-3 text-muted-foreground">{p.email || 'N/A'}</td>
                <td className="p-3">{p.phone || '—'}</td>
                <td className="p-3">
                  {p.plain_password ? (
                    <code className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded text-xs font-mono">{p.plain_password}</code>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">not stored</span>
                  )}
                </td>
                <td className="p-3 text-muted-foreground text-xs">{new Date(p.created_at).toLocaleDateString()}</td>
                <td className="p-3">
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={() => viewCustomer(p)} title="View customer"><Eye className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => confirmDelete(p)} className="text-red-500 hover:text-red-700 hover:bg-red-50" title="Soft delete customer">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground"><Users className="h-8 w-8 mx-auto mb-2 opacity-20" />No customers found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Soft Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !deleting && setDeleteTarget(null)} />
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 border border-gray-100 dark:border-gray-700">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold">Permanently Delete Customer?</h3>
                <p className="text-sm text-gray-500 mt-0.5">Their profile will be removed from the database. Orders stay for records.</p>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 space-y-1">
              <p className="text-sm font-semibold truncate">{deleteTarget.full_name || 'Unnamed'}</p>
              <p className="text-xs text-gray-500 truncate">{deleteTarget.email || 'No email'}</p>
            </div>
            {deleteError && (
              <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{deleteError}</p>
            )}
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} disabled={deleting}
                className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleSoftDelete} disabled={deleting}
                className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50 flex items-center justify-center gap-2">
                {deleting ? <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>Deleting…</> : <><Trash2 className="h-4 w-4" />Delete Permanently</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Detail Modal */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>👤 {selected?.full_name || 'Customer'}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-muted-foreground mb-0.5">Email</p><p className="font-medium">{selected.email || 'N/A'}</p></div>
                <div><p className="text-xs text-muted-foreground mb-0.5">Phone</p><p className="font-medium">{selected.phone || 'N/A'}</p></div>
                <div><p className="text-xs text-muted-foreground mb-0.5">WhatsApp</p><p className="font-medium">{selected.whatsapp || '—'}</p></div>
                <div><p className="text-xs text-muted-foreground mb-0.5">Joined</p><p className="font-medium">{new Date(selected.created_at).toLocaleDateString()}</p></div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground mb-0.5">Password (stored)</p>
                  {selected.plain_password ? (
                    <code className="inline-block bg-amber-50 text-amber-800 border border-amber-200 px-2 py-1 rounded text-sm font-mono">{selected.plain_password}</code>
                  ) : (
                    <span className="text-sm text-muted-foreground italic">Not stored</span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Card><CardContent className="pt-3 text-center"><p className="text-xs text-muted-foreground">Orders</p><p className="text-xl font-bold">{customerOrders.length}</p></CardContent></Card>
                <Card><CardContent className="pt-3 text-center"><p className="text-xs text-muted-foreground">Total Spent</p><p className="text-xl font-bold">Rs. {totalSpent.toLocaleString()}</p></CardContent></Card>
              </div>
              {customerOrders.length > 0 && (
                <div className="space-y-1 max-h-[200px] overflow-y-auto">
                  {customerOrders.map(o => (
                    <div key={o.id} className="flex items-center justify-between text-sm bg-muted/50 p-2 rounded">
                      <span className="font-mono text-xs">{o.order_number}</span>
                      <Badge variant="outline" className="text-xs">{o.status}</Badge>
                      <span className="font-medium">Rs. {Number(o.total).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="pt-2 border-t">
                <button onClick={() => { setSelected(null); confirmDelete(selected); }}
                  className="w-full text-sm text-amber-600 hover:text-amber-700 hover:bg-amber-50 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5">
                  <Trash2 className="h-4 w-4" />Deactivate this customer
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCustomers;
