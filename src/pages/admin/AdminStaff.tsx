import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, UserPlus, Trash2, RefreshCw, Search, Loader2, ChevronDown, ChevronUp, Shield, BarChart2, MessageSquare, ShoppingBag, Clock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const PRESET_ROLES = ['Manager', 'Support', 'Delivery', 'Editor', 'Viewer', 'Moderator', 'Sales', 'Accountant', 'Dispatcher'];

const ROLE_COLORS: Record<string, string> = {
  manager: 'bg-purple-100 text-purple-700 border-purple-200',
  support: 'bg-blue-100 text-blue-700 border-blue-200',
  delivery: 'bg-orange-100 text-orange-700 border-orange-200',
  editor: 'bg-green-100 text-green-700 border-green-200',
  viewer: 'bg-gray-100 text-gray-700 border-gray-200',
  moderator: 'bg-pink-100 text-pink-700 border-pink-200',
  sales: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  accountant: 'bg-teal-100 text-teal-700 border-teal-200',
  dispatcher: 'bg-cyan-100 text-cyan-700 border-cyan-200',
};

const getRoleColor = (role: string) => ROLE_COLORS[role.toLowerCase()] || 'bg-indigo-100 text-indigo-700 border-indigo-200';

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
  manager:    ['page_dashboard', 'page_orders', 'page_products', 'page_customers', 'page_reviews', 'page_returns', 'page_chat', 'page_deliveries', 'page_analytics', 'page_banners', 'page_promos'],
  support:    ['page_chat', 'page_returns', 'page_reviews', 'page_customers', 'page_orders'],
  delivery:   ['page_orders', 'page_deliveries', 'page_dashboard'],
  editor:     ['page_products', 'page_banners', 'page_promos', 'page_newsletter'],
  viewer:     ['page_dashboard', 'page_analytics'],
  moderator:  ['page_chat', 'page_returns', 'page_reviews', 'page_orders', 'page_customers'],
  sales:      ['page_orders', 'page_customers', 'page_dashboard', 'page_analytics'],
  accountant: ['page_analytics', 'page_orders', 'page_dashboard'],
  dispatcher: ['page_orders', 'page_deliveries', 'page_dashboard'],
};

interface StaffMember {
  id: string;
  user_id: string;
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
const savePerms = (p: Record<string, string[]>) => localStorage.setItem(PERMS_KEY, JSON.stringify(p));

export default function AdminStaff() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('support');
  const [customRole, setCustomRole] = useState('');
  const [useCustomRole, setUseCustomRole] = useState(false);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [staffPerms, setStaffPerms] = useState<Record<string, string[]>>(loadPerms());
  const [perfTarget, setPerfTarget] = useState<StaffMember | null>(null);
  const [perfChats, setPerfChats] = useState<any[]>([]);
  const [perfOrders, setPerfOrders] = useState<any[]>([]);
  const [perfAttendance, setPerfAttendance] = useState<any[]>([]);
  const [perfLoading, setPerfLoading] = useState(false);

  useEffect(() => { fetchStaff(); }, []);

  const fetchStaff = async () => {
    setLoading(true);
    const { data: roles, error } = await supabase
      .from('user_roles')
      .select('id, user_id, role, created_at')
      .not('role', 'eq', 'admin')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Failed to load staff', description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    const userIds = (roles || []).map((r: any) => r.user_id).filter(Boolean);
    let profileMap: Record<string, { full_name: string; email: string }> = {};

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', userIds);
      (profiles || []).forEach((p: any) => {
        profileMap[p.user_id] = { full_name: p.full_name || 'Unknown', email: p.email || 'N/A' };
      });
    }

    const stored = loadPerms();
    const normRole = (r: string) => r === 'moderator' ? 'manager' : r;
    const mapped: StaffMember[] = (roles || []).map((r: any) => {
      const nr = normRole(r.role);
      const profile = profileMap[r.user_id] || { full_name: 'Unknown', email: 'N/A' };
      return {
        id: r.id, user_id: r.user_id,
        email: profile.email, name: profile.full_name,
        role: nr, created_at: r.created_at,
        permissions: stored[r.id] ?? DEFAULT_ROLE_PERMS[nr] ?? [],
      };
    });
    setStaff(mapped);
    setLoading(false);
  };

  const addStaff = async () => {
    if (!email.trim()) { toast({ title: 'Email required', variant: 'destructive' }); return; }
    const finalRole = useCustomRole ? (customRole.trim().toLowerCase() || 'viewer') : role;
    setAdding(true);
    try {
      const { data: existing } = await supabase.from('profiles').select('user_id, full_name').eq('email', email.trim().toLowerCase()).maybeSingle();
      if (!existing) {
        toast({ title: 'User not found', description: 'This email must have a registered store account first.', variant: 'destructive' });
        setAdding(false); return;
      }
      const dbRole = finalRole === 'manager' ? 'moderator' : finalRole;
      const { data: inserted, error } = await supabase
        .from('user_roles')
        .upsert({ user_id: existing.user_id, role: dbRole }, { onConflict: 'user_id,role' })
        .select('id').single();
      if (error) throw error;
      if (inserted?.id) {
        const defaultPerms = DEFAULT_ROLE_PERMS[finalRole] || [];
        const updatedPerms = { ...loadPerms(), [inserted.id]: defaultPerms };
        savePerms(updatedPerms); setStaffPerms(updatedPerms);
      }
      toast({ title: '✅ Staff member added!', description: `${name || existing.full_name || email} now has ${finalRole} access.` });
      setName(''); setEmail(''); setRole('support'); setCustomRole(''); setUseCustomRole(false); setShowForm(false);
      fetchStaff();
    } catch (e: any) {
      toast({ title: 'Failed to add staff', description: e.message, variant: 'destructive' });
    }
    setAdding(false);
  };

  const removeStaff = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('user_roles').delete().eq('id', deleteTarget.id);
    if (error) { toast({ title: 'Failed to remove', variant: 'destructive' }); }
    else {
      const p = loadPerms(); delete p[deleteTarget.id]; savePerms(p);
      toast({ title: 'Staff member removed' }); fetchStaff();
    }
    setDeleteTarget(null);
  };

  const togglePerm = (staffId: string, permKey: string) => {
    const current = staffPerms[staffId] || [];
    const updated = current.includes(permKey) ? current.filter(p => p !== permKey) : [...current, permKey];
    const newPerms = { ...staffPerms, [staffId]: updated };
    setStaffPerms(newPerms); savePerms(newPerms);
    setStaff(prev => prev.map(s => s.id === staffId ? { ...s, permissions: updated } : s));
  };

  const toggleGroup = (staffId: string, group: string) => {
    const groupPerms = PAGE_PERMISSIONS.filter(p => p.group === group).map(p => p.key);
    const current = staffPerms[staffId] || [];
    const allGranted = groupPerms.every(k => current.includes(k));
    const updated = allGranted ? current.filter(k => !groupPerms.includes(k)) : [...new Set([...current, ...groupPerms])];
    const newPerms = { ...staffPerms, [staffId]: updated };
    setStaffPerms(newPerms); savePerms(newPerms);
    setStaff(prev => prev.map(s => s.id === staffId ? { ...s, permissions: updated } : s));
  };

  const changeRole = async (s: StaffMember, newRole: string) => {
    const dbRole = newRole === 'manager' ? 'moderator' : newRole;
    const { error } = await supabase.from('user_roles').update({ role: dbRole }).eq('id', s.id);
    if (error) { toast({ title: 'Failed to update role', variant: 'destructive' }); return; }
    const defaults = DEFAULT_ROLE_PERMS[newRole] || [];
    const newPerms = { ...loadPerms(), [s.id]: defaults };
    savePerms(newPerms); setStaffPerms(newPerms);
    setStaff(prev => prev.map(m => m.id === s.id ? { ...m, role: newRole, permissions: defaults } : m));
    toast({ title: `Role updated to "${newRole}"` });
  };

  const openPerformance = async (s: StaffMember) => {
    setPerfTarget(s); setPerfLoading(true);
    const [chatsRes, ordersRes, attendanceRes] = await Promise.all([
      supabase.from('chat_conversations').select('id, created_at, is_resolved, updated_at').order('updated_at', { ascending: false }).limit(20),
      supabase.from('orders').select('id, created_at, status, total_amount, full_name').order('created_at', { ascending: false }).limit(20),
      supabase.from('staff_attendance').select('*').eq('user_id', s.user_id).order('login_at', { ascending: false }).limit(30),
    ]);
    setPerfChats(chatsRes.data || []);
    setPerfOrders(ordersRes.data || []);
    setPerfAttendance(attendanceRes.data || []);
    setPerfLoading(false);
  };

  const filtered = staff.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.role.toLowerCase().includes(search.toLowerCase())
  );

  const fmt = (d: string) => new Date(d).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg"><Users className="h-6 w-6 text-indigo-600" /></div>
          <div>
            <h1 className="text-2xl font-bold">Staff Management</h1>
            <p className="text-muted-foreground text-sm">Add staff, assign any role and control page access</p>
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

      {/* Add Staff Form */}
      {showForm && (
        <div className="border-2 border-dashed border-primary/30 rounded-xl p-5 bg-primary/5 space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Add New Staff Member</h3>
          </div>
          <p className="text-sm text-muted-foreground">The person must already have a registered customer account on the store.</p>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Display Name (optional)</Label>
              <Input placeholder="e.g. Ahmed Ali" value={name} onChange={e => setName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Registered Email <span className="text-destructive">*</span></Label>
              <Input type="email" placeholder="staff@example.com" value={email} onChange={e => setEmail(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="mb-2 block">Role Assignment</Label>
            <div className="flex items-center gap-2 mb-2">
              <Checkbox checked={useCustomRole} onCheckedChange={v => setUseCustomRole(!!v)} id="custom-role-check" />
              <label htmlFor="custom-role-check" className="text-sm cursor-pointer">Create a custom role (type anything)</label>
            </div>
            {useCustomRole ? (
              <Input
                placeholder="e.g. Regional Manager, Inventory Clerk, Social Media..."
                value={customRole}
                onChange={e => setCustomRole(e.target.value)}
              />
            ) : (
              <div className="flex flex-wrap gap-2">
                {PRESET_ROLES.map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r.toLowerCase())}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      role === r.toLowerCase() ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:border-primary/50'
                    }`}
                  >{r}</button>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button onClick={addStaff} disabled={adding}>
              {adding ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Adding...</> : <><UserPlus className="h-4 w-4 mr-2" />Add Staff Member</>}
            </Button>
            <Button variant="outline" onClick={() => { setShowForm(false); setUseCustomRole(false); setCustomRole(''); }}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Staff List */}
      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="p-4 border-b flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name, email or role..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <span className="text-sm text-muted-foreground">{staff.length} total</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium">No staff members yet</p>
            <p className="text-sm mt-1">Click "Add Staff" to get started</p>
          </div>
        ) : (
          <div className="divide-y">
            {filtered.map(s => {
              const roleColor = getRoleColor(s.role);
              const isExpanded = expandedId === s.id;
              const currentPerms = staffPerms[s.id] ?? s.permissions;

              return (
                <div key={s.id}>
                  <div className="flex items-center gap-3 p-4 hover:bg-accent/20 transition-colors flex-wrap">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border ${roleColor}`}>
                      {s.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{s.name}</p>
                      <p className="text-sm text-muted-foreground truncate">{s.email}</p>
                    </div>

                    {/* Inline role editor */}
                    <Select value={s.role} onValueChange={val => changeRole(s, val)}>
                      <SelectTrigger className={`w-36 h-8 text-xs border ${roleColor}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRESET_ROLES.map(r => <SelectItem key={r} value={r.toLowerCase()}>{r}</SelectItem>)}
                        {!PRESET_ROLES.map(r => r.toLowerCase()).includes(s.role) && (
                          <SelectItem value={s.role}>{s.role} (current)</SelectItem>
                        )}
                      </SelectContent>
                    </Select>

                    <Badge variant="outline" className="text-xs hidden sm:inline-flex">
                      {currentPerms.length}/{PAGE_PERMISSIONS.length} pages
                    </Badge>

                    <Button variant="outline" size="sm" className="text-xs gap-1 text-indigo-600 border-indigo-200 hover:bg-indigo-50" onClick={() => openPerformance(s)}>
                      <BarChart2 className="h-3.5 w-3.5" />Dashboard
                    </Button>

                    <Button variant="ghost" size="sm" className={`text-xs gap-1 ${isExpanded ? 'bg-primary/10 text-primary' : ''}`} onClick={() => setExpandedId(isExpanded ? null : s.id)}>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      Access
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
                          const gPerms = PAGE_PERMISSIONS.filter(p => p.group === group);
                          const allChecked = gPerms.every(p => currentPerms.includes(p.key));
                          const someChecked = gPerms.some(p => currentPerms.includes(p.key));
                          return (
                            <div key={group}>
                              <div className="flex items-center gap-2 mb-2">
                                <Checkbox
                                  id={`grp-${s.id}-${group}`}
                                  checked={allChecked}
                                  onCheckedChange={() => toggleGroup(s.id, group)}
                                />
                                <label htmlFor={`grp-${s.id}-${group}`} className="text-xs font-semibold cursor-pointer select-none">{group}</label>
                                <span className="text-xs text-muted-foreground">({gPerms.filter(p => currentPerms.includes(p.key)).length}/{gPerms.length})</span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5 ml-6">
                                {gPerms.map(perm => {
                                  const granted = currentPerms.includes(perm.key);
                                  return (
                                    <label key={perm.key} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer select-none transition-colors ${granted ? 'bg-green-50 border-green-300 text-green-800' : 'bg-background border-border text-muted-foreground hover:bg-accent/50'}`}>
                                      <Checkbox checked={granted} onCheckedChange={() => togglePerm(s.id, perm.key)} className="h-3.5 w-3.5 flex-shrink-0" />
                                      <span className="text-xs font-medium">{perm.label}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-4 pt-3 border-t flex gap-2 flex-wrap">
                        <Button size="sm" variant="outline" onClick={() => { const all = PAGE_PERMISSIONS.map(p => p.key); const np = { ...staffPerms, [s.id]: all }; setStaffPerms(np); savePerms(np); setStaff(prev => prev.map(m => m.id === s.id ? { ...m, permissions: all } : m)); toast({ title: 'All pages granted' }); }}>Grant All</Button>
                        <Button size="sm" variant="outline" className="text-destructive border-destructive/30" onClick={() => { const np = { ...staffPerms, [s.id]: [] }; setStaffPerms(np); savePerms(np); setStaff(prev => prev.map(m => m.id === s.id ? { ...m, permissions: [] } : m)); toast({ title: 'All access revoked' }); }}>Revoke All</Button>
                        <Button size="sm" variant="outline" onClick={() => { const d = DEFAULT_ROLE_PERMS[s.role] || []; const np = { ...staffPerms, [s.id]: d }; setStaffPerms(np); savePerms(np); setStaff(prev => prev.map(m => m.id === s.id ? { ...m, permissions: d } : m)); toast({ title: 'Reset to role default' }); }}>Reset Default</Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Remove Staff Member?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Remove <strong>{deleteTarget?.name}</strong>? They will lose all admin access.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={removeStaff}><Trash2 className="h-4 w-4 mr-2" />Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Performance Dashboard Modal */}
      <Dialog open={!!perfTarget} onOpenChange={() => setPerfTarget(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm border ${getRoleColor(perfTarget?.role || '')}`}>
                {perfTarget?.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-bold">{perfTarget?.name}</p>
                <p className="text-xs text-muted-foreground font-normal">{perfTarget?.email} · {perfTarget?.role}</p>
              </div>
              <Badge className={`ml-auto text-xs border ${getRoleColor(perfTarget?.role || '')}`}>{perfTarget?.role}</Badge>
            </DialogTitle>
          </DialogHeader>

          {perfLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <Tabs defaultValue="attendance">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="attendance" className="gap-1.5"><Clock className="h-3.5 w-3.5" />Attendance</TabsTrigger>
                <TabsTrigger value="chats" className="gap-1.5"><MessageSquare className="h-3.5 w-3.5" />Chat Logs</TabsTrigger>
                <TabsTrigger value="orders" className="gap-1.5"><ShoppingBag className="h-3.5 w-3.5" />Order Logs</TabsTrigger>
              </TabsList>

              <TabsContent value="attendance" className="mt-4">
                <p className="text-xs text-muted-foreground mb-3">Login & logout sessions — last 30 entries</p>
                {perfAttendance.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No attendance records yet</p>
                    <p className="text-xs mt-1">Sessions will appear here once the staff member logs into the admin panel</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {perfAttendance.map((a: any, i: number) => (
                      <div key={a.id || i} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg text-sm">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <div className="flex-1">
                          <p className="font-medium">Login: {fmt(a.login_at)}</p>
                          {a.logout_at && <p className="text-xs text-muted-foreground">Logout: {fmt(a.logout_at)}</p>}
                        </div>
                        {a.duration_minutes && (
                          <Badge variant="outline" className="text-xs">{Math.round(a.duration_minutes)} min</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="chats" className="mt-4">
                <p className="text-xs text-muted-foreground mb-3">Recent chat conversations in the store (latest 20)</p>
                {perfChats.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No chat history found</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {perfChats.map((c: any) => (
                      <div key={c.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg text-sm">
                        <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground">ID: {c.id.slice(0, 8)}...</p>
                          <p className="text-xs">Updated: {fmt(c.updated_at || c.created_at)}</p>
                        </div>
                        <Badge variant={c.is_resolved ? 'secondary' : 'outline'} className="text-xs">
                          {c.is_resolved ? 'Resolved' : 'Open'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="orders" className="mt-4">
                <p className="text-xs text-muted-foreground mb-3">Recent orders in the store (latest 20)</p>
                {perfOrders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No orders found</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {perfOrders.map((o: any) => (
                      <div key={o.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg text-sm">
                        <ShoppingBag className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1">
                          <p className="font-medium">{o.full_name || 'Customer'}</p>
                          <p className="text-xs text-muted-foreground">{fmt(o.created_at)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm">Rs. {o.total_amount?.toLocaleString()}</p>
                          <Badge variant="outline" className="text-xs">{o.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
