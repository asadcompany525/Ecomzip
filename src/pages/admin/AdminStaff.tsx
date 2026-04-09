import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, UserPlus, Trash2, RefreshCw, Shield, MessageSquare, Truck, Search, Loader2, Lock, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const ROLES = [
  { id: 'manager', label: 'Manager', icon: Shield, color: 'bg-purple-100 text-purple-700', desc: 'Full store access except billing' },
  { id: 'support', label: 'Support', icon: MessageSquare, color: 'bg-blue-100 text-blue-700', desc: 'Handle chats, returns, reviews' },
  { id: 'delivery', label: 'Delivery', icon: Truck, color: 'bg-orange-100 text-orange-700', desc: 'Manage orders, shipping updates' },
];

const ALL_PERMISSIONS = [
  { key: 'view_dashboard', label: 'View Dashboard' },
  { key: 'manage_products', label: 'Manage Products' },
  { key: 'manage_orders', label: 'Manage Orders' },
  { key: 'view_customers', label: 'View Customers' },
  { key: 'view_reports', label: 'View Sales Reports' },
  { key: 'view_passwords', label: 'View Customer Passwords' },
  { key: 'manage_reviews', label: 'Manage Reviews' },
  { key: 'manage_returns', label: 'Manage Returns' },
  { key: 'chat_support', label: 'Chat Support' },
  { key: 'manage_banners', label: 'Manage Banners' },
  { key: 'manage_promos', label: 'Manage Promos' },
  { key: 'manage_settings', label: 'Manage Settings' },
  { key: 'manage_staff', label: 'Manage Staff' },
  { key: 'manage_deliveries', label: 'Manage Deliveries' },
];

const DEFAULT_ROLE_PERMS: Record<string, string[]> = {
  manager: ['view_dashboard', 'manage_products', 'manage_orders', 'view_customers', 'view_reports', 'manage_reviews', 'manage_returns', 'manage_banners', 'manage_promos', 'manage_deliveries'],
  support: ['chat_support', 'manage_returns', 'manage_reviews', 'view_customers'],
  delivery: ['manage_orders', 'manage_deliveries', 'view_dashboard'],
};

interface StaffMember {
  id: string;
  email: string;
  role: string;
  name: string;
  created_at: string;
  permissions: string[];
}

const PERMS_STORAGE_KEY = 'staff_permissions';

const loadPerms = (): Record<string, string[]> => {
  try { return JSON.parse(localStorage.getItem(PERMS_STORAGE_KEY) || '{}'); } catch { return {}; }
};

const savePerms = (perms: Record<string, string[]>) => {
  localStorage.setItem(PERMS_STORAGE_KEY, JSON.stringify(perms));
};

export default function AdminStaff() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('support');
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null);
  const [expandedPerms, setExpandedPerms] = useState<string | null>(null);
  const [staffPerms, setStaffPerms] = useState<Record<string, string[]>>(loadPerms());

  useEffect(() => { fetchStaff(); }, []);

  const fetchStaff = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('user_roles')
      .select('*, profiles(full_name, email)')
      .in('role', ['manager', 'moderator', 'support', 'delivery'])
      .order('created_at', { ascending: false });

    const stored = loadPerms();
    const mapped: StaffMember[] = (data || []).map((r: any) => ({
      id: r.id,
      email: r.profiles?.email || 'N/A',
      name: r.profiles?.full_name || 'Unknown',
      role: r.role === 'moderator' ? 'manager' : r.role,
      created_at: r.created_at,
      permissions: stored[r.id] || DEFAULT_ROLE_PERMS[r.role === 'moderator' ? 'manager' : r.role] || [],
    }));
    setStaff(mapped);
    setLoading(false);
  };

  const addStaff = async () => {
    if (!email.trim() || !name.trim()) {
      toast({ title: 'Name and email required', variant: 'destructive' });
      return;
    }
    setAdding(true);
    try {
      const { data: existing } = await supabase.from('profiles').select('user_id').eq('email', email.trim().toLowerCase()).maybeSingle();
      if (!existing) {
        toast({ title: 'User not found', description: 'This email must already have an account', variant: 'destructive' });
        setAdding(false);
        return;
      }
      const dbRole = role === 'manager' ? 'moderator' : role;
      const { data: inserted, error } = await supabase
        .from('user_roles')
        .upsert({ user_id: existing.user_id, role: dbRole }, { onConflict: 'user_id,role' })
        .select('id')
        .single();
      if (error) throw error;

      if (inserted?.id) {
        const updatedPerms = { ...loadPerms(), [inserted.id]: DEFAULT_ROLE_PERMS[role] || [] };
        savePerms(updatedPerms);
        setStaffPerms(updatedPerms);
      }

      toast({ title: 'Staff member added!', description: `${name} has been granted ${role} access` });
      setName(''); setEmail(''); setShowForm(false);
      fetchStaff();
    } catch (e: any) {
      toast({ title: 'Failed to add staff', description: e.message, variant: 'destructive' });
    }
    setAdding(false);
  };

  const removeStaff = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('user_roles').delete().eq('id', deleteTarget.id);
    if (error) {
      toast({ title: 'Failed to remove', variant: 'destructive' });
    } else {
      const updatedPerms = loadPerms();
      delete updatedPerms[deleteTarget.id];
      savePerms(updatedPerms);
      toast({ title: 'Staff member removed' });
      fetchStaff();
    }
    setDeleteTarget(null);
  };

  const togglePermission = (staffId: string, permKey: string) => {
    const current = staffPerms[staffId] || [];
    const updated = current.includes(permKey)
      ? current.filter(p => p !== permKey)
      : [...current, permKey];
    const newPerms = { ...staffPerms, [staffId]: updated };
    setStaffPerms(newPerms);
    savePerms(newPerms);
    setStaff(prev => prev.map(s => s.id === staffId ? { ...s, permissions: updated } : s));
    toast({ title: `Permission ${current.includes(permKey) ? 'removed' : 'granted'}` });
  };

  const filtered = staff.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg"><Users className="h-6 w-6 text-indigo-600" /></div>
          <div>
            <h1 className="text-2xl font-bold">Staff Management</h1>
            <p className="text-muted-foreground text-sm">Manage roles & granular permissions</p>
          </div>
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

      <div className="grid md:grid-cols-3 gap-4">
        {ROLES.map(r => (
          <div key={r.id} className={`border rounded-xl p-4 ${r.id === 'manager' ? 'border-purple-200 bg-purple-50/50' : r.id === 'support' ? 'border-blue-200 bg-blue-50/50' : 'border-orange-200 bg-orange-50/50'}`}>
            <div className="flex items-center gap-2 mb-1">
              <r.icon className="h-4 w-4" />
              <span className="font-semibold text-sm">{r.label}</span>
              <Badge className={`text-xs ml-auto ${r.color}`}>{staff.filter(s => s.role === r.id).length}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{r.desc}</p>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="border rounded-xl p-5 bg-card space-y-4">
          <h3 className="font-semibold">Add New Staff Member</h3>
          <p className="text-sm text-muted-foreground">User must already have a registered account.</p>
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

      <div className="bg-card border rounded-xl">
        <div className="p-4 border-b flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search staff..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p>No staff members yet</p>
          </div>
        ) : (
          <div className="divide-y">
            {filtered.map(s => {
              const roleInfo = ROLES.find(r => r.id === s.role) || ROLES[1];
              const isExpanded = expandedPerms === s.id;
              return (
                <div key={s.id}>
                  <div className="flex items-center gap-4 p-4 hover:bg-accent/30 transition-colors">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${roleInfo.color}`}>
                      {s.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{s.name}</p>
                      <p className="text-sm text-muted-foreground">{s.email}</p>
                    </div>
                    <Badge className={`text-xs ${roleInfo.color}`}>{roleInfo.label}</Badge>
                    <Badge variant="outline" className="text-xs hidden md:inline-flex">
                      <Lock className="h-3 w-3 mr-1" />{s.permissions.length} perms
                    </Badge>
                    <Button
                      variant="ghost" size="sm"
                      className="text-xs gap-1"
                      onClick={() => setExpandedPerms(isExpanded ? null : s.id)}
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      Permissions
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteTarget(s)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 bg-muted/20 border-t">
                      <p className="text-xs font-semibold text-muted-foreground mt-3 mb-2 uppercase tracking-wide">Granular Permission Control</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {ALL_PERMISSIONS.map(perm => {
                          const granted = (staffPerms[s.id] || s.permissions).includes(perm.key);
                          const isRestricted = perm.key === 'view_passwords' || perm.key === 'view_reports';
                          return (
                            <div key={perm.key} className={`flex items-center gap-2 p-2 rounded-lg border ${granted ? 'bg-green-50 border-green-200' : 'bg-background border-border'}`}>
                              <Switch
                                checked={granted}
                                onCheckedChange={() => togglePermission(s.id, perm.key)}
                                className="scale-75"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">{perm.label}</p>
                                {isRestricted && <p className="text-[10px] text-destructive">Sensitive</p>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove Staff Member?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to remove <strong>{deleteTarget?.name}</strong> from staff? They will lose all admin access.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={removeStaff}>
              <Trash2 className="h-4 w-4 mr-2" />Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
