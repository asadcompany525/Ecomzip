import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Search, Eye, KeyRound } from 'lucide-react';
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
  const [showPasswords, setShowPasswords] = useState(false);

  useEffect(() => {
    supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => setProfiles(data || []));
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

  const filtered = profiles.filter(p =>
    (p.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.phone || '').includes(search)
  );

  const totalSpent = customerOrders.reduce((s, o) => s + Number(o.total || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, email, phone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Badge variant="outline">{profiles.length} Customers</Badge>
        <Button
          size="sm"
          variant={showPasswords ? 'destructive' : 'outline'}
          className="gap-1.5 text-xs"
          onClick={() => setShowPasswords(v => !v)}
        >
          <KeyRound className="h-3.5 w-3.5" />
          {showPasswords ? 'Hide Passwords' : 'Show Passwords'}
        </Button>
      </div>

      <div className="bg-card rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Phone</th>
              {showPasswords && <th className="text-left p-3 text-destructive">Password</th>}
              <th className="text-left p-3">WhatsApp</th>
              <th className="text-left p-3">Joined</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} className="border-b hover:bg-accent/50">
                <td className="p-3 font-medium">{p.full_name || 'N/A'}</td>
                <td className="p-3">{p.email || 'N/A'}</td>
                <td className="p-3">{p.phone || 'N/A'}</td>
                {showPasswords && (
                  <td className="p-3">
                    <code className="bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded text-xs">
                      {p.plain_password || '(not stored)'}
                    </code>
                  </td>
                )}
                <td className="p-3">{p.whatsapp || '-'}</td>
                <td className="p-3">{new Date(p.created_at).toLocaleDateString()}</td>
                <td className="p-3">
                  <Button size="sm" variant="ghost" onClick={() => viewCustomer(p)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={showPasswords ? 7 : 6} className="p-8 text-center text-muted-foreground">No customers found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>👤 {selected?.full_name || 'Customer'}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Email:</span><br />{selected.email}</div>
                <div><span className="text-muted-foreground">Phone:</span><br />{selected.phone || 'N/A'}</div>
                <div><span className="text-muted-foreground">WhatsApp:</span><br />{selected.whatsapp || '-'}</div>
                <div><span className="text-muted-foreground">Joined:</span><br />{new Date(selected.created_at).toLocaleDateString()}</div>
                {selected.plain_password && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground text-xs">Password (plain-text):</span>
                    <div className="mt-0.5">
                      <code className="bg-red-50 text-red-700 border border-red-200 px-2 py-1 rounded text-sm">{selected.plain_password}</code>
                    </div>
                  </div>
                )}
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCustomers;
