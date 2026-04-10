import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Search, Eye, Users, Trash2, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';

const AdminCustomers = () => {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const loadCustomers = () => {
    supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => setProfiles(data || []));
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const viewCustomer = async (p: any) => {
    setSelected(p);
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', p.user_id)
      .order('created_at', { ascending: false });
    setCustomerOrders(data || []);
  };

  const confirmDelete = (p: any) => {
    setDeleteTarget(p);
    setDeleteError('');
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError('');
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', deleteTarget.id);
      if (error) throw error;
      setProfiles(prev => prev.filter(p => p.id !== deleteTarget.id));
      setDeleteTarget(null);
      if (selected?.id === deleteTarget.id) setSelected(null);
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete customer.');
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
            <p className="text-xs text-muted-foreground">All registered store accounts</p>
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
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-semibold">Name</th>
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
                    <code className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded text-xs font-mono">
                      {p.plain_password}
                    </code>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">not stored</span>
                  )}
                </td>
                <td className="p-3 text-muted-foreground text-xs">{new Date(p.created_at).toLocaleDateString()}</td>
                <td className="p-3">
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={() => viewCustomer(p)} title="View customer">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => confirmDelete(p)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      title="Delete customer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  No customers found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Delete Confirmation Modal (pure Tailwind) ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !deleting && setDeleteTarget(null)}
          />
          {/* Modal card */}
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 border border-gray-100 dark:border-gray-700">
            {/* Icon + title */}
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Delete Customer?</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">This action cannot be undone.</p>
              </div>
            </div>

            {/* Customer info */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 space-y-1">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                {deleteTarget.full_name || 'Unnamed Customer'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{deleteTarget.email || 'No email'}</p>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-300">
              Are you sure you want to permanently delete this customer's profile? Their order history may still remain in the system.
            </p>

            {/* Error message */}
            {deleteError && (
              <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                {deleteError}
              </p>
            )}

            {/* Buttons */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Yes, Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Customer Detail Modal ── */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>👤 {selected?.full_name || 'Customer'}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Email</p>
                  <p className="font-medium">{selected.email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Phone</p>
                  <p className="font-medium">{selected.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">WhatsApp</p>
                  <p className="font-medium">{selected.whatsapp || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Joined</p>
                  <p className="font-medium">{new Date(selected.created_at).toLocaleDateString()}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground mb-0.5">Password (plain-text)</p>
                  {selected.plain_password ? (
                    <code className="inline-block bg-amber-50 text-amber-800 border border-amber-200 px-2 py-1 rounded text-sm font-mono">
                      {selected.plain_password}
                    </code>
                  ) : (
                    <span className="text-sm text-muted-foreground italic">Not stored in database</span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="pt-3 text-center">
                    <p className="text-xs text-muted-foreground">Orders</p>
                    <p className="text-xl font-bold">{customerOrders.length}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-3 text-center">
                    <p className="text-xs text-muted-foreground">Total Spent</p>
                    <p className="text-xl font-bold">Rs. {totalSpent.toLocaleString()}</p>
                  </CardContent>
                </Card>
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
                <button
                  onClick={() => { setSelected(null); confirmDelete(selected); }}
                  className="w-full text-sm text-red-600 hover:text-red-700 hover:bg-red-50 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete this customer
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
