import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, UserPlus, Trash2, RefreshCw, Shield, MessageSquare, Truck, Search, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const ROLES = [
  { id: 'manager', label: 'Manager', icon: Shield, color: 'bg-purple-100 text-purple-700', desc: 'Full store access except billing' },
  { id: 'support', label: 'Support', icon: MessageSquare, color: 'bg-blue-100 text-blue-700', desc: 'Handle chats, returns, reviews' },
  { id: 'delivery', label: 'Delivery', icon: Truck, color: 'bg-orange-100 text-orange-700', desc: 'Manage orders, shipping updates' },
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  manager: ['Dashboard', 'Products', 'Categories', 'Orders', 'Customers', 'Banners', 'Promos', 'Reviews', 'Returns', 'Reports', 'Stock Alerts', 'Delivery', 'Settings'],
  support: ['Chat Support', 'Orders (view)', 'Returns', 'Reviews', 'Customers (view)'],
  delivery: ['Orders', 'Today Orders', 'Order Checklist', 'Delivery Management', 'City Manager'],
};

interface StaffMember {
  id: string;
  email: string;
  role: string;
  name: string;
  created_at: string;
  is_active: boolean;
}

export default function AdminStaff() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('support');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => { fetchStaff(); }, []);

  const fetchStaff = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('user_roles')
      .select('*, profiles(full_name, email)')
      .in('role', ['manager', 'moderator'])
      .order('created_at', { ascending: false });

    const mapped: StaffMember[] = (data || []).map((r: any) => ({
      id: r.id,
      email: r.profiles?.email || 'N/A',
      name: r.profiles?.full_name || 'Unknown',
      role: r.role,
      created_at: r.created_at,
      is_active: true,
    }));
    setStaff(mapped);
    setLoading(false);
  };

  const addStaff = async () => {
    if (!email.trim() || !name.trim()) { toast({ title: 'Name and email required', variant: 'destructive' }); return; }
    setAdding(true);
    try {
      const { data: existing } = await supabase.from('profiles').select('user_id').eq('email', email.trim().toLowerCase()).maybeSingle();
      if (!existing) {
        toast({ title: 'User not found', description: 'This email must already have an account in the system', variant: 'destructive' });
        setAdding(false);
        return;
      }
      const dbRole = role === 'manager' ? 'moderator' : role === 'delivery' ? 'moderator' : 'moderator';
      const { error } = await supabase.from('user_roles').upsert({ user_id: existing.user_id, role: dbRole }, { onConflict: 'user_id,role' });
      if (error) throw error;
      toast({ title: 'Staff member added!', description: `${name} has been granted ${role} access` });
      setName(''); setEmail(''); setShowForm(false);
      fetchStaff();
    } catch (e: any) {
      toast({ title: 'Failed to add staff', description: e.message, variant: 'destructive' });
    }
    setAdding(false);
  };

  const removeStaff = async (staffId: string, staffName: string) => {
    if (!confirm(`Remove ${staffName} from staff?`)) return;
    const { error } = await supabase.from('user_roles').delete().eq('id', staffId);
    if (error) toast({ title: 'Failed to remove', variant: 'destructive' });
    else { toast({ title: 'Staff removed' }); fetchStaff(); }
  };

  const filtered = staff.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase());
    if (activeTab === 'all') return matchSearch;
    return matchSearch && s.role === (activeTab === 'manager' ? 'moderator' : 'user');
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg"><Users className="h-6 w-6 text-indigo-600" /></div>
          <div><h1 className="text-2xl font-bold">Staff Management</h1><p className="text-muted-foreground text-sm">Manage Manager, Support & Delivery roles</p></div>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchStaff} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />Refresh
          </Button>
          <Button onClick={() => setShowForm(!showForm)} size="sm">
            <UserPlus className="h-4 w-4 mr-2" />Add Staff
          </Button>
        </div>
      </div>

      {/* Role Info Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        {ROLES.map(r => (
          <div key={r.id} className={`border rounded-xl p-4 ${r.color.includes('purple') ? 'border-purple-200 bg-purple-50/50' : r.color.includes('blue') ? 'border-blue-200 bg-blue-50/50' : 'border-orange-200 bg-orange-50/50'}`}>
            <div className="flex items-center gap-2 mb-2">
              <r.icon className={`h-5 w-5 ${r.color.split(' ')[1]}`} />
              <span className="font-semibold">{r.label}</span>
              <Badge className={`text-xs ml-auto ${r.color}`}>{staff.length} members</Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-2">{r.desc}</p>
            <p className="text-xs font-medium mb-1">Permissions:</p>
            <div className="flex flex-wrap gap-1">
              {ROLE_PERMISSIONS[r.id].slice(0, 4).map(p => <span key={p} className="text-xs bg-white border rounded px-1.5 py-0.5">{p}</span>)}
              {ROLE_PERMISSIONS[r.id].length > 4 && <span className="text-xs text-muted-foreground">+{ROLE_PERMISSIONS[r.id].length - 4} more</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Add Staff Form */}
      {showForm && (
        <div className="border rounded-xl p-5 bg-card space-y-4">
          <h3 className="font-semibold">Add New Staff Member</h3>
          <p className="text-sm text-muted-foreground">The user must already have a Stopy Shoes account.</p>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label>Full Name</Label>
              <Input placeholder="Staff name" value={name} onChange={e => setName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Email Address</Label>
              <Input type="email" placeholder="staff@example.com" value={email} onChange={e => setEmail(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={addStaff} disabled={adding}>
              {adding ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Adding...</> : <><UserPlus className="h-4 w-4 mr-2" />Add Staff Member</>}
            </Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Staff List */}
      <div className="bg-card border rounded-xl">
        <div className="p-4 border-b flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search staff..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p>No staff members found</p>
            <p className="text-xs mt-1">Add staff members to get started</p>
          </div>
        ) : (
          <div className="divide-y">
            {filtered.map(s => {
              const roleInfo = ROLES.find(r => r.id === s.role) || ROLES.find(r => r.id === 'support')!;
              return (
                <div key={s.id} className="flex items-center gap-4 p-4 hover:bg-accent/50 transition-colors">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${roleInfo.color}`}>
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{s.name}</p>
                    <p className="text-sm text-muted-foreground">{s.email}</p>
                  </div>
                  <Badge className={`text-xs ${roleInfo.color}`}>{roleInfo.label}</Badge>
                  <p className="text-xs text-muted-foreground hidden md:block">{new Date(s.created_at).toLocaleDateString()}</p>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => removeStaff(s.id, s.name)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Permissions Reference */}
      <div className="border rounded-xl p-5 bg-muted/30">
        <h3 className="font-semibold mb-4">Role Permissions Reference</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {ROLES.map(r => (
            <div key={r.id}>
              <p className="font-medium text-sm mb-2 flex items-center gap-1.5"><r.icon className="h-4 w-4" />{r.label}</p>
              <ul className="space-y-1">
                {ROLE_PERMISSIONS[r.id].map(p => <li key={p} className="text-xs text-muted-foreground flex items-center gap-1">• {p}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
