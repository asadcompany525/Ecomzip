import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, UserPlus, Trash2, RefreshCw, Search, Loader2, ChevronDown, ChevronUp, Shield } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const ROLES = [
  { id: 'manager',  label: 'Manager',  color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { id: 'support',  label: 'Support',  color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'delivery', label: 'Delivery', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { id: 'editor',   label: 'Editor',   color: 'bg-green-100 text-green-700 border-green-200' },
  { id: 'viewer',   label: 'Viewer',   color: 'bg-gray-100 text-gray-700 border-gray-200' },
];

const PAGE_PERMISSIONS = [
  { key: 'page_dashboard',       label: '📊 Dashboard',            group: 'Core' },
  { key: 'page_orders',          label: '🛒 Orders',               group: 'Core' },
  { key: 'page_products',        label: '👟 Products',             group: 'Core' },
  { key: 'page_customers',       label: '👥 Customers',            group: 'Core' },
  { key: 'page_reviews',         label: '⭐ Reviews',              group: 'Core' },
  { key: 'page_returns',         label: '↩️ Returns',              group: 'Core' },
  { key: 'page_chat',            label: '💬 Chat Support',         group: 'Core' },
  { key: 'page_deliveries',      label: '🚚 Deliveries',           group: 'Core' },
  { key: 'page_analytics',       label: '📈 Analytics / Reports',  group: 'Reports' },
  { key: 'page_banners',         label: '🖼️ Banners',             group: 'Marketing' },
  { key: 'page_promos',          label: '🎟️ Promotions',          group: 'Marketing' },
  { key: 'page_newsletter',      label: '📧 Newsletter',           group: 'Marketing' },
  { key: 'page_trend_predictor', label: '🤖 AI Trend Predictor',   group: 'AI Tools' },
  { key: 'page_pricing_engine',  label: '💰 Pricing Engine',       group: 'AI Tools' },
  { key: 'page_loyalty',         label: '🏆 Loyalty Heatmap',      group: 'AI Tools' },
  { key: 'page_search_logs',     label: '🔍 Search Logs',          group: 'AI Tools' },
  { key: 'page_staff',           label: '👔 Staff Management',     group: 'Admin' },
  { key: 'page_settings',        label: '⚙️ Settings',             group: 'Admin' },
  { key: 'view_passwords',       label: '🔑 View Passwords',       group: 'Admin' },
];

const GROUPS = ['Core', 'Reports', 'Marketing', 'AI Tools', 'Admin'];

const DEFAULT_ROLE_PERMS: Record<string, string[]> = {
  manager:  ['page_dashboard', 'page_orders', 'page_products', 'page_customers', 'page_reviews', 'page_returns', 'page_chat', 'page_deliveries', 'page_analytics', 'page_banners', 'page_promos'],
  support:  ['page_chat', 'page_returns', 'page_reviews', 'page_customers', 'page_orders'],
  delivery: ['page_orders', 'page_deliveries', 'page_dashboard'],
  editor:   ['page_products', 'page_banners', 'page_promos', 'page_newsletter'],
  viewer:   ['page_dashboard', 'page_analytics'],
};

interface StaffMember {
  id: string;
  email: string;
  role: string;
  name: string;
  created_at: string;
  permissions: string[];
}

const PERMS_KEY = 'staff_permissions_v2';
const loadPerms = (): Record<string, string[]> => {
  try { return JSON.parse(localStorage.getItem(PERMS_KEY) || '{}'); } catch { return {}; }
};
const savePerms = (perms: Record<string, string[]>) => {
  localStorage.setItem(PERMS_KEY, JSON.stringify(perms));
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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [staffPerms, setStaffPerms] = useState<Record<string, string[]>>(loadPerms());

  useEffect(() => { fetchStaff(); }, []);

  const fetchStaff = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('user_roles')
      .select('*, profiles(full_name, email)')
      .not('role', 'eq', 'admin')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Failed to load staff', description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    const stored = loadPerms();
    const mapped: StaffMember[] = (data || []).map((r: any) => {
      const normRole = r.role === 'moderator' ? 'manager' : r.role;
      return {
        id: r.id,
        email: r.profiles?.email || 'N/A',
        name: r.profiles?.full_name || 'Unknown',
        role: normRole,
        created_at: r.created_at,
        permissions: stored[r.id] ?? DEFAULT_ROLE_PERMS[normRole] ?? [],
      };
    });
    setStaff(mapped);
    setLoading(false);
  };

  const addStaff = async () => {
    if (!email.trim()) {
      toast({ title: 'Email required', variant: 'destructive' });
      return;
    }
    setAdding(true);
    try {
      const { data: existing } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();

      if (!existing) {
        toast({ title: 'User not found', description: 'This email must already have a registered account on the store.', variant: 'destructive' });
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
        const defaultPerms = DEFAULT_ROLE_PERMS[role] || [];
        const updatedPerms = { ...loadPerms(), [inserted.id]: defaultPerms };
        savePerms(updatedPerms);
        setStaffPerms(updatedPerms);
      }

      toast({ title: '✅ Staff member added!', description: `${name || existing.full_name || email} now has ${role} access.` });
      setName(''); setEmail(''); setRole('support'); setShowForm(false);
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

  const togglePerm = (staffId: string, permKey: string) => {
    const current = staffPerms[staffId] || [];
    const updated = current.includes(permKey)
      ? current.filter(p => p !== permKey)
      : [...current, permKey];
    const newPerms = { ...staffPerms, [staffId]: updated };
    setStaffPerms(newPerms);
    savePerms(newPerms);
    setStaff(prev => prev.map(s => s.id === staffId ? { ...s, permissions: updated } : s));
  };

  const toggleAll = (staffId: string, group: string) => {
    const groupPerms = PAGE_PERMISSIONS.filter(p => p.group === group).map(p => p.key);
    const current = staffPerms[staffId] || [];
    const allGranted = groupPerms.every(k => current.includes(k));
    const updated = allGranted
      ? current.filter(k => !groupPerms.includes(k))
      : [...new Set([...current, ...groupPerms])];
    const newPerms = { ...staffPerms, [staffId]: updated };
    setStaffPerms(newPerms);
    savePerms(newPerms);
    setStaff(prev => prev.map(s => s.id === staffId ? { ...s, permissions: updated } : s));
  };

  const changeRole = async (staffMember: StaffMember, newRole: string) => {
    const dbRole = newRole === 'manager' ? 'moderator' : newRole;
    const { error } = await supabase.from('user_roles').update({ role: dbRole }).eq('id', staffMember.id);
    if (error) {
      toast({ title: 'Failed to update role', variant: 'destructive' });
      return;
    }
    const defaultPerms = DEFAULT_ROLE_PERMS[newRole] || [];
    const updatedPerms = { ...loadPerms(), [staffMember.id]: defaultPerms };
    savePerms(updatedPerms);
    setStaffPerms(updatedPerms);
    setStaff(prev => prev.map(s => s.id === staffMember.id ? { ...s, role: newRole, permissions: defaultPerms } : s));
    toast({ title: `Role changed to ${newRole}`, description: 'Default permissions applied. Customise below.' });
  };

  const filtered = staff.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.role.toLowerCase().includes(search.toLowerCase())
  );

  const getRoleInfo = (roleId: string) => ROLES.find(r => r.id === roleId) || { label: roleId, color: 'bg-gray-100 text-gray-700 border-gray-200' };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg"><Users className="h-6 w-6 text-indigo-600" /></div>
          <div>
            <h1 className="text-2xl font-bold">Staff Management</h1>
            <p className="text-muted-foreground text-sm">Add staff, assign roles and control page access</p>
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

      {/* Role Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {ROLES.map(r => (
          <div key={r.id} className={`border rounded-xl p-3 text-center ${r.color.replace('text-', 'border-').split(' ')[0].replace('bg-', 'border-').replace('100', '200')} bg-opacity-30`}>
            <p className="text-2xl font-bold">{staff.filter(s => s.role === r.id).length}</p>
            <p className="text-xs font-medium mt-0.5">{r.label}</p>
          </div>
        ))}
      </div>

      {/* Add Staff Form */}
      {showForm && (
        <div className="border-2 border-dashed border-primary/30 rounded-xl p-5 bg-primary/5 space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Add New Staff Member</h3>
          </div>
          <p className="text-sm text-muted-foreground">The person must already have a registered customer account on the store.</p>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label>Display Name (optional)</Label>
              <Input placeholder="e.g. Ahmed Ali" value={name} onChange={e => setName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Registered Email <span className="text-destructive">*</span></Label>
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
      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="p-4 border-b flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search staff..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <span className="text-sm text-muted-foreground">{staff.length} total</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium">No staff members yet</p>
            <p className="text-sm mt-1">Click "Add Staff" to get started</p>
          </div>
        ) : (
          <div className="divide-y">
            {filtered.map(s => {
              const roleInfo = getRoleInfo(s.role);
              const isExpanded = expandedId === s.id;
              const currentPerms = staffPerms[s.id] ?? s.permissions;

              return (
                <div key={s.id}>
                  {/* Staff Row */}
                  <div className="flex items-center gap-3 p-4 hover:bg-accent/20 transition-colors flex-wrap">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border ${roleInfo.color}`}>
                      {s.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{s.name}</p>
                      <p className="text-sm text-muted-foreground truncate">{s.email}</p>
                    </div>

                    {/* Role Selector */}
                    <Select value={s.role} onValueChange={val => changeRole(s, val)}>
                      <SelectTrigger className={`w-32 h-8 text-xs border ${roleInfo.color}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map(r => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}
                      </SelectContent>
                    </Select>

                    <Badge variant="outline" className="text-xs hidden sm:inline-flex">
                      {currentPerms.length}/{PAGE_PERMISSIONS.length} pages
                    </Badge>

                    <Button
                      variant="ghost" size="sm"
                      className={`text-xs gap-1 ${isExpanded ? 'bg-primary/10 text-primary' : ''}`}
                      onClick={() => setExpandedId(isExpanded ? null : s.id)}
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      Page Access
                    </Button>

                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => setDeleteTarget(s)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Permissions Panel */}
                  {isExpanded && (
                    <div className="bg-muted/20 border-t px-4 pb-5 pt-4">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Page Access Control</p>
                      <div className="space-y-4">
                        {GROUPS.map(group => {
                          const groupPerms = PAGE_PERMISSIONS.filter(p => p.group === group);
                          const allChecked = groupPerms.every(p => currentPerms.includes(p.key));
                          const someChecked = groupPerms.some(p => currentPerms.includes(p.key));
                          return (
                            <div key={group}>
                              <div className="flex items-center gap-2 mb-2">
                                <Checkbox
                                  id={`group-${s.id}-${group}`}
                                  checked={allChecked}
                                  ref={(el: any) => { if (el) el.indeterminate = someChecked && !allChecked; }}
                                  onCheckedChange={() => toggleAll(s.id, group)}
                                  className="h-4 w-4"
                                />
                                <label htmlFor={`group-${s.id}-${group}`} className="text-xs font-semibold text-foreground cursor-pointer select-none">
                                  {group}
                                </label>
                                <span className="text-xs text-muted-foreground">({groupPerms.filter(p => currentPerms.includes(p.key)).length}/{groupPerms.length})</span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5 ml-6">
                                {groupPerms.map(perm => {
                                  const granted = currentPerms.includes(perm.key);
                                  return (
                                    <label
                                      key={perm.key}
                                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer select-none transition-colors ${
                                        granted
                                          ? 'bg-green-50 border-green-300 text-green-800'
                                          : 'bg-background border-border text-muted-foreground hover:bg-accent/50'
                                      }`}
                                    >
                                      <Checkbox
                                        checked={granted}
                                        onCheckedChange={() => togglePerm(s.id, perm.key)}
                                        className="h-3.5 w-3.5 flex-shrink-0"
                                      />
                                      <span className="text-xs font-medium">{perm.label}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-4 pt-3 border-t flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => {
                          const all = PAGE_PERMISSIONS.map(p => p.key);
                          const newPerms = { ...staffPerms, [s.id]: all };
                          setStaffPerms(newPerms); savePerms(newPerms);
                          setStaff(prev => prev.map(m => m.id === s.id ? { ...m, permissions: all } : m));
                          toast({ title: 'All pages granted' });
                        }}>Grant All</Button>
                        <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => {
                          const newPerms = { ...staffPerms, [s.id]: [] };
                          setStaffPerms(newPerms); savePerms(newPerms);
                          setStaff(prev => prev.map(m => m.id === s.id ? { ...m, permissions: [] } : m));
                          toast({ title: 'All access revoked' });
                        }}>Revoke All</Button>
                        <Button size="sm" variant="outline" onClick={() => {
                          const defaults = DEFAULT_ROLE_PERMS[s.role] || [];
                          const newPerms = { ...staffPerms, [s.id]: defaults };
                          setStaffPerms(newPerms); savePerms(newPerms);
                          setStaff(prev => prev.map(m => m.id === s.id ? { ...m, permissions: defaults } : m));
                          toast({ title: 'Reset to role defaults' });
                        }}>Reset to Role Default</Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove Staff Member?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Remove <strong>{deleteTarget?.name}</strong> from staff? They will lose all admin access immediately.
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
