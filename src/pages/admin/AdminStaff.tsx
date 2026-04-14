import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Users, UserPlus, Trash2, RefreshCw, Search, Loader2, ChevronDown, ChevronUp,
  Shield, BarChart2, Eye, EyeOff, Copy, CheckCircle, Lock, AlertTriangle, Clock,
  MessageSquare, Calendar
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { ensureAdminSession } from '@/lib/adminSession';

const ADMIN_EMAIL = 'sscck@gmail.com';
const ROLE_OPTIONS = ['Staff', 'Sales', 'Support', 'Delivery', 'Manager', 'Editor', 'Viewer'];

const ROLE_COLORS: Record<string, string> = {
  staff:    'bg-indigo-100 text-indigo-700 border-indigo-200',
  sales:    'bg-yellow-100 text-yellow-700 border-yellow-200',
  support:  'bg-blue-100 text-blue-700 border-blue-200',
  delivery: 'bg-orange-100 text-orange-700 border-orange-200',
  manager:  'bg-purple-100 text-purple-700 border-purple-200',
  editor:   'bg-green-100 text-green-700 border-green-200',
  viewer:   'bg-gray-100 text-gray-700 border-gray-200',
};

const PAGE_PERMISSIONS = [
  { key: 'page_dashboard',  label: '📊 Dashboard',      group: 'Core' },
  { key: 'page_orders',     label: '🛒 Orders',         group: 'Core' },
  { key: 'page_products',   label: '👟 Products',        group: 'Core' },
  { key: 'page_customers',  label: '👥 Customers',       group: 'Core' },
  { key: 'page_reviews',    label: '⭐ Reviews',         group: 'Core' },
  { key: 'page_returns',    label: '↩️ Returns',         group: 'Core' },
  { key: 'page_chat',       label: '💬 Chat Support',    group: 'Core' },
  { key: 'page_deliveries', label: '🚚 Deliveries',      group: 'Core' },
  { key: 'page_analytics',  label: '📈 Analytics',       group: 'Reports' },
  { key: 'page_banners',    label: '🖼️ Banners',        group: 'Marketing' },
  { key: 'page_promos',     label: '🎟️ Promotions',     group: 'Marketing' },
  { key: 'page_newsletter', label: '📧 Newsletter',      group: 'Marketing' },
];

const DEFAULT_PERMS: Record<string, string[]> = {
  staff:    ['page_dashboard', 'page_orders', 'page_customers', 'page_chat'],
  sales:    ['page_orders', 'page_customers', 'page_dashboard', 'page_analytics'],
  support:  ['page_chat', 'page_returns', 'page_reviews', 'page_customers', 'page_orders'],
  delivery: ['page_orders', 'page_deliveries', 'page_dashboard'],
  manager:  ['page_dashboard', 'page_orders', 'page_products', 'page_customers', 'page_reviews', 'page_returns', 'page_chat', 'page_deliveries', 'page_analytics', 'page_banners', 'page_promos'],
  editor:   ['page_products', 'page_banners', 'page_promos', 'page_newsletter'],
  viewer:   ['page_dashboard', 'page_analytics'],
};

const GROUPS = ['Core', 'Reports', 'Marketing'];

const PERMS_KEY  = 'staff_permissions_v3';
const ROLES_KEY  = 'staff_roles_v3';
const loadPerms  = (): Record<string, string[]> => { try { return JSON.parse(localStorage.getItem(PERMS_KEY) || '{}'); } catch { return {}; } };
const savePerms  = (p: Record<string, string[]>) => localStorage.setItem(PERMS_KEY, JSON.stringify(p));
const loadRoles  = (): Record<string, string> => { try { return JSON.parse(localStorage.getItem(ROLES_KEY) || '{}'); } catch { return {}; } };
const saveRoles  = (r: Record<string, string>) => localStorage.setItem(ROLES_KEY, JSON.stringify(r));

function getRoleColor(role: string) { return ROLE_COLORS[role.toLowerCase()] || 'bg-indigo-100 text-indigo-700 border-indigo-200'; }

function genPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

interface StaffMember {
  id: string;
  user_id: string;
  email: string;
  name: string;
  username: string;
  role: string;
  created_at: string;
  permissions: string[];
  is_deleted?: boolean;
}

interface Credentials { name: string; username: string; email: string; password: string; role: string; }

export default function AdminStaff() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const isMainAdmin = isAdmin || user?.email === ADMIN_EMAIL;

  const [staff,         setStaff]         = useState<StaffMember[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [showForm,      setShowForm]      = useState(false);
  const [adding,        setAdding]        = useState(false);
  const [search,        setSearch]        = useState('');
  const [expandedId,    setExpandedId]    = useState<string | null>(null);
  const [expandedTab,   setExpandedTab]   = useState<Record<string, 'access' | 'attendance'>>({});
  const [staffPerms,    setStaffPerms]    = useState<Record<string, string[]>>(loadPerms());
  const [deleteTarget,  setDeleteTarget]  = useState<StaffMember | null>(null);
  const [deleting,      setDeleting]      = useState(false);
  const [credentials,   setCredentials]   = useState<Credentials | null>(null);
  const [showPass,      setShowPass]      = useState(false);
  const [copied,        setCopied]        = useState(false);
  const [attendanceLogs,setAttendanceLogs]= useState<Record<string, any[]>>({});
  const [loadingLogs,   setLoadingLogs]   = useState<string | null>(null);

  // Form fields
  const [fName,     setFName]     = useState('');
  const [fUsername, setFUsername] = useState('');
  const [fEmail,    setFEmail]    = useState('');
  const [fPassword, setFPassword] = useState('');
  const [fRole,     setFRole]     = useState('staff');
  const [fShowPass, setFShowPass] = useState(false);

  useEffect(() => { if (isMainAdmin) fetchStaff(); }, [isMainAdmin]);

  const fetchAttendance = async (userId: string, staffId: string) => {
    setLoadingLogs(staffId);
    const { data } = await supabase
      .from('staff_attendance')
      .select('*')
      .eq('user_id', userId)
      .order('login_at', { ascending: false })
      .limit(20);
    setAttendanceLogs(prev => ({ ...prev, [staffId]: data || [] }));
    setLoadingLogs(null);
  };

  const fetchStaff = async () => {
    setLoading(true);
    await ensureAdminSession().catch(() => null);
    // Fetch all moderator roles (staff) — exclude admin role
    const { data: roles, error } = await supabase
      .from('user_roles')
      .select('id, user_id, role, created_at')
      .eq('role', 'moderator')
      .order('created_at', { ascending: false });

    if (error) { toast({ title: 'Failed to load staff', description: error.message, variant: 'destructive' }); setLoading(false); return; }

    const userIds = (roles || []).map((r: any) => r.user_id).filter(Boolean);
    let profileMap: Record<string, any> = {};
    if (userIds.length > 0) {
      let { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, phone, whatsapp, avatar_url, created_at, updated_at, username')
        .in('user_id', userIds);

      if (profilesError) {
        const fallback = await supabase
          .from('profiles')
          .select('user_id, full_name, email, phone, whatsapp, avatar_url, created_at, updated_at')
          .in('user_id', userIds);
        profiles = fallback.data || [];
      }

      (profiles || []).forEach((p: any) => { profileMap[p.user_id] = p; });
    }

    const stored = loadPerms(), storedRoles = loadRoles();
    const mapped: StaffMember[] = (roles || []).map((r: any) => {
      const profile = profileMap[r.user_id] || {};
      const displayRole = storedRoles[r.id] || 'staff';
      return {
        id: r.id, user_id: r.user_id,
        email: profile.email || r.email || 'No email found',
        name: profile.full_name || profile.email || 'Staff member',
        username: profile.username || (profile.email ? profile.email.split('@')[0] : '—'),
        role: displayRole,
        created_at: r.created_at,
        permissions: stored[r.id] ?? DEFAULT_PERMS[displayRole] ?? DEFAULT_PERMS.staff,
      };
    });
    setStaff(mapped);
    setLoading(false);
  };

  const addStaff = async () => {
    if (!fName.trim())     { toast({ title: 'Name required', variant: 'destructive' }); return; }
    if (!fUsername.trim()) { toast({ title: 'Username required', variant: 'destructive' }); return; }
    if (!fEmail.trim())    { toast({ title: 'Email required', variant: 'destructive' }); return; }
    if (fPassword.length < 8) { toast({ title: 'Password must be at least 8 characters', variant: 'destructive' }); return; }

    setAdding(true);
    try {
      await ensureAdminSession();
      // Create user via separate Supabase client (won't affect admin session)
      const tempClient = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
      );

      const { data: signUpData, error: signUpError } = await tempClient.auth.signUp({
        email: fEmail.trim().toLowerCase(),
        password: fPassword,
        options: { data: { full_name: fName.trim() } },
      });

      if (signUpError) throw signUpError;
      if (!signUpData.user) throw new Error('User creation failed — no user returned');

      const newUserId = signUpData.user.id;

      // Wait a moment for the profile trigger to fire
      await new Promise(r => setTimeout(r, 1200));

      // Update profile with username and plain_password
      const profilePayload: any = { user_id: newUserId, full_name: fName.trim(), email: fEmail.trim().toLowerCase(), username: fUsername.trim(), plain_password: fPassword };
      let profileSave = await supabase.from('profiles').upsert(
        profilePayload,
        { onConflict: 'user_id' }
      );

      if (profileSave.error?.code === 'PGRST204' || profileSave.error?.message?.includes('username') || profileSave.error?.message?.includes('plain_password')) {
        profileSave = await supabase.from('profiles').upsert(
          { user_id: newUserId, full_name: fName.trim(), email: fEmail.trim().toLowerCase() },
          { onConflict: 'user_id' }
        );
      }

      if (profileSave.error) throw profileSave.error;

      await supabase.from('site_settings').upsert(
        {
          key: `staff_credentials_${newUserId}`,
          value: {
            name: fName.trim(),
            username: fUsername.trim(),
            email: fEmail.trim().toLowerCase(),
            password: fPassword,
            role: fRole,
            created_at: new Date().toISOString(),
          },
        },
        { onConflict: 'key' }
      );

      await supabase.from('profiles').upsert(
        { user_id: newUserId, full_name: fName.trim(), email: fEmail.trim().toLowerCase(), username: fUsername.trim(), plain_password: fPassword },
        { onConflict: 'user_id' }
      ).then(({ error }) => {
        if (error && !error.message?.includes('username') && !error.message?.includes('plain_password')) throw error;
      });

      // Add moderator role (staff)
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .upsert({ user_id: newUserId, role: 'moderator' as any }, { onConflict: 'user_id,role' })
        .select('id').single();

      if (roleError) throw roleError;

      if (roleData?.id) {
        const defaultPerms = DEFAULT_PERMS[fRole.toLowerCase()] || DEFAULT_PERMS.staff;
        const newPerms  = { ...loadPerms(),  [roleData.id]: defaultPerms };
        const newRoles  = { ...loadRoles(),  [roleData.id]: fRole.toLowerCase() };
        savePerms(newPerms); saveRoles(newRoles); setStaffPerms(newPerms);
      }

      // Show success credentials popup
      setCredentials({ name: fName.trim(), username: fUsername.trim(), email: fEmail.trim().toLowerCase(), password: fPassword, role: fRole });
      setFName(''); setFUsername(''); setFEmail('');
      setFPassword(genPassword()); setFRole('staff');
      setShowForm(false);
      fetchStaff();
    } catch (e: any) {
      toast({ title: 'Failed to create staff', description: e.message, variant: 'destructive' });
    }
    setAdding(false);
  };

  const softDeleteStaff = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await ensureAdminSession();
      // Soft-delete: set is_deleted = true on profile
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ is_deleted: true } as any)
        .eq('user_id', deleteTarget.user_id);

      // Also remove from user_roles to revoke admin access
      const { error: roleErr } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', deleteTarget.id);

      if (profileErr && roleErr) throw profileErr;

      const p = loadPerms(); delete p[deleteTarget.id]; savePerms(p);
      const r = loadRoles(); delete r[deleteTarget.id]; saveRoles(r);
      toast({ title: '✅ Staff member deactivated', description: 'Account marked as deleted (data preserved).' });
      fetchStaff();
    } catch (e: any) {
      toast({ title: 'Failed to delete', description: e.message, variant: 'destructive' });
    }
    setDeleting(false);
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

  const changeRole = (s: StaffMember, newRole: string) => {
    const newRoles = { ...loadRoles(), [s.id]: newRole };
    saveRoles(newRoles);
    const defaults = DEFAULT_PERMS[newRole] || DEFAULT_PERMS.staff;
    const newPerms = { ...loadPerms(), [s.id]: defaults };
    savePerms(newPerms); setStaffPerms(newPerms);
    setStaff(prev => prev.map(m => m.id === s.id ? { ...m, role: newRole, permissions: defaults } : m));
    toast({ title: `✅ Role updated to "${newRole}"` });
  };

  const copyCredentials = () => {
    if (!credentials) return;
    const text = `Staff Credentials\nName: ${credentials.name}\nUsername: ${credentials.username}\nEmail: ${credentials.email}\nPassword: ${credentials.password}\nRole: ${credentials.role}`;
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const filtered = staff.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.username.toLowerCase().includes(search.toLowerCase()) ||
    s.role.toLowerCase().includes(search.toLowerCase())
  );

  if (!isMainAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <div className="p-4 bg-red-100 rounded-full"><Lock className="h-8 w-8 text-red-600" /></div>
        <h2 className="text-xl font-bold">Access Restricted</h2>
        <p className="text-muted-foreground text-sm max-w-xs">Only the Main Admin can access Staff Management.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg"><Users className="h-6 w-6 text-indigo-600" /></div>
          <div>
            <h1 className="text-2xl font-bold">Staff Management</h1>
            <p className="text-muted-foreground text-sm">Private — Admin eyes only</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchStaff} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />Refresh
          </Button>
          <Button onClick={() => { setShowForm(!showForm); if (!fPassword) setFPassword(genPassword()); }} size="sm">
            <UserPlus className="h-4 w-4 mr-2" />Add Staff
          </Button>
        </div>
      </div>

      {/* ── Add Staff Form ── */}
      {showForm && (
        <div className="border-2 border-dashed border-primary/30 rounded-xl p-5 bg-primary/5 space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Register New Staff Member</h3>
            <Badge variant="secondary" className="text-xs">Admin Only</Badge>
          </div>
          <p className="text-sm text-muted-foreground">Creates a brand-new account. Staff will use these credentials to log in to the admin panel.</p>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Full Name <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g. Ahmed Ali" value={fName} onChange={e => setFName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Username <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g. ahmed_ali" value={fUsername} onChange={e => setFUsername(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Email <span className="text-destructive">*</span></Label>
              <Input type="email" placeholder="staff@example.com" value={fEmail} onChange={e => setFEmail(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Password <span className="text-destructive">*</span></Label>
              <div className="relative mt-1">
                <Input
                  type={fShowPass ? 'text' : 'password'}
                  placeholder="Min 8 characters"
                  value={fPassword}
                  onChange={e => setFPassword(e.target.value)}
                  className="pr-16"
                />
                <button type="button" onClick={() => setFShowPass(v => !v)} className="absolute right-8 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {fShowPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button type="button" onClick={() => setFPassword(genPassword())} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary text-[10px] font-bold">GEN</button>
              </div>
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Role</Label>
            <div className="flex flex-wrap gap-2">
              {ROLE_OPTIONS.map(r => (
                <button key={r} type="button" onClick={() => setFRole(r.toLowerCase())}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${fRole === r.toLowerCase() ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:border-primary/50'}`}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={addStaff} disabled={adding}>
              {adding ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating Account…</> : <><UserPlus className="h-4 w-4 mr-2" />Create Staff Account</>}
            </Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* ── Staff List ── */}
      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="p-4 border-b flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name, username, role…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <span className="text-sm text-muted-foreground">{staff.length} staff</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium">No staff members yet</p>
            <p className="text-sm mt-1">Click "Add Staff" to create the first account</p>
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
                      {(s.name.charAt(0) || '?').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{s.name}</p>
                      <p className="text-xs text-muted-foreground truncate">@{s.username} · {s.email}</p>
                    </div>

                    <Select value={s.role} onValueChange={val => changeRole(s, val)}>
                      <SelectTrigger className={`w-32 h-8 text-xs border ${roleColor}`}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map(r => <SelectItem key={r} value={r.toLowerCase()}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>

                    <Badge variant="outline" className="text-xs hidden sm:inline-flex">{currentPerms.length}/{PAGE_PERMISSIONS.length} pages</Badge>

                    <Button variant="ghost" size="sm" className={`text-xs gap-1 ${isExpanded ? 'bg-primary/10 text-primary' : ''}`} onClick={() => {
                      const newExpanded = isExpanded ? null : s.id;
                      setExpandedId(newExpanded);
                      if (newExpanded && !expandedTab[s.id]) {
                        setExpandedTab(prev => ({ ...prev, [s.id]: 'access' }));
                      }
                    }}>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />} Manage
                    </Button>

                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => setDeleteTarget(s)} title="Soft delete (deactivate)">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {isExpanded && (
                    <div className="bg-muted/20 border-t px-4 pb-5 pt-4">
                      {/* Tabs */}
                      <div className="flex gap-1 mb-4 bg-muted rounded-lg p-1 w-fit">
                        {(['access', 'attendance'] as const).map(tab => (
                          <button
                            key={tab}
                            onClick={() => {
                              setExpandedTab(prev => ({ ...prev, [s.id]: tab }));
                              if (tab === 'attendance' && !attendanceLogs[s.id]) {
                                fetchAttendance(s.user_id, s.id);
                              }
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                              (expandedTab[s.id] || 'access') === tab
                                ? 'bg-card shadow-sm text-foreground'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            {tab === 'access' ? <><Shield className="h-3 w-3" />Access Control</> : <><Clock className="h-3 w-3" />Attendance Logs</>}
                          </button>
                        ))}
                        <button
                          onClick={() => navigate(`/admin/chat`)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                          title="View this staff member's chats"
                        >
                          <MessageSquare className="h-3 w-3" />Chat Watch
                        </button>
                      </div>

                      {/* Access Control tab */}
                      {(expandedTab[s.id] || 'access') === 'access' && (
                      <>
                      <div className="space-y-4">
                        {GROUPS.map(group => {
                          const gPerms = PAGE_PERMISSIONS.filter(p => p.group === group);
                          const allChecked = gPerms.every(p => currentPerms.includes(p.key));
                          return (
                            <div key={group}>
                              <div className="flex items-center gap-2 mb-2">
                                <Checkbox id={`grp-${s.id}-${group}`} checked={allChecked} onCheckedChange={() => toggleGroup(s.id, group)} />
                                <label htmlFor={`grp-${s.id}-${group}`} className="text-xs font-semibold cursor-pointer">{group}</label>
                                <span className="text-xs text-muted-foreground">({gPerms.filter(p => currentPerms.includes(p.key)).length}/{gPerms.length})</span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5 ml-6">
                                {gPerms.map(perm => {
                                  const granted = currentPerms.includes(perm.key);
                                  return (
                                    <label key={perm.key} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-xs font-medium transition-colors ${granted ? 'bg-green-50 border-green-300 text-green-800' : 'bg-background border-border text-muted-foreground hover:bg-accent/50'}`}>
                                      <Checkbox checked={granted} onCheckedChange={() => togglePerm(s.id, perm.key)} className="h-3.5 w-3.5 flex-shrink-0" />
                                      {perm.label}
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-4 pt-3 border-t flex gap-2 flex-wrap">
                        <Button size="sm" variant="outline" onClick={() => {
                          const all = PAGE_PERMISSIONS.map(p => p.key);
                          const np = { ...staffPerms, [s.id]: all }; setStaffPerms(np); savePerms(np);
                          setStaff(prev => prev.map(m => m.id === s.id ? { ...m, permissions: all } : m));
                          toast({ title: 'All pages granted' });
                        }}>Grant All</Button>
                        <Button size="sm" variant="outline" className="text-destructive border-destructive/30" onClick={() => {
                          const np = { ...staffPerms, [s.id]: [] }; setStaffPerms(np); savePerms(np);
                          setStaff(prev => prev.map(m => m.id === s.id ? { ...m, permissions: [] } : m));
                          toast({ title: 'All pages revoked' });
                        }}>Revoke All</Button>
                        <Button size="sm" variant="outline" onClick={() => {
                          const d = DEFAULT_PERMS[s.role] || DEFAULT_PERMS.staff;
                          const np = { ...staffPerms, [s.id]: d }; setStaffPerms(np); savePerms(np);
                          setStaff(prev => prev.map(m => m.id === s.id ? { ...m, permissions: d } : m));
                          toast({ title: 'Reset to default' });
                        }}>Reset Default</Button>
                      </div>
                      </>
                      )}

                      {/* Attendance Logs tab */}
                      {(expandedTab[s.id] || 'access') === 'attendance' && (
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Session Logs (last 20)</p>
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => fetchAttendance(s.user_id, s.id)} disabled={loadingLogs === s.id}>
                              <RefreshCw className={`h-3 w-3 mr-1 ${loadingLogs === s.id ? 'animate-spin' : ''}`} />Refresh
                            </Button>
                          </div>
                          {loadingLogs === s.id ? (
                            <div className="flex items-center justify-center py-8">
                              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            </div>
                          ) : !attendanceLogs[s.id] ? (
                            <div className="text-center py-8 text-muted-foreground text-sm">
                              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-20" />
                              <p>Click Refresh to load attendance logs</p>
                            </div>
                          ) : attendanceLogs[s.id].length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground text-sm">
                              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-20" />
                              <p>No sessions recorded yet</p>
                            </div>
                          ) : (
                            <div className="rounded-xl border overflow-hidden">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="bg-muted/50">
                                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">#</th>
                                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Login</th>
                                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Logout</th>
                                    <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Duration</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y">
                                  {attendanceLogs[s.id].map((log: any, i: number) => (
                                    <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                                      <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                                      <td className="px-3 py-2">
                                        <p>{new Date(log.login_at).toLocaleDateString()}</p>
                                        <p className="text-muted-foreground">{new Date(log.login_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                      </td>
                                      <td className="px-3 py-2">
                                        {log.logout_at ? (
                                          <>
                                            <p>{new Date(log.logout_at).toLocaleDateString()}</p>
                                            <p className="text-muted-foreground">{new Date(log.logout_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                          </>
                                        ) : <span className="text-green-600 font-medium">Active now</span>}
                                      </td>
                                      <td className="px-3 py-2 text-right">
                                        {log.duration_minutes != null
                                          ? <span className="font-medium">{log.duration_minutes < 60 ? `${log.duration_minutes}m` : `${Math.floor(log.duration_minutes / 60)}h ${log.duration_minutes % 60}m`}</span>
                                          : <span className="text-muted-foreground">—</span>}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Soft Delete Confirmation ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => !deleting && setDeleteTarget(null)} />
          <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 border">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold">Deactivate Staff Member?</h3>
                <p className="text-sm text-muted-foreground mt-0.5">Account will be disabled. Data is never permanently deleted.</p>
              </div>
            </div>
            <div className="bg-muted/50 rounded-xl p-3">
              <p className="font-semibold text-sm">{deleteTarget.name}</p>
              <p className="text-xs text-muted-foreground">@{deleteTarget.username} · {deleteTarget.email}</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
              <Button className="flex-1 bg-amber-600 hover:bg-amber-700 text-white" onClick={softDeleteStaff} disabled={deleting}>
                {deleting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deactivating…</> : 'Deactivate'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Credentials Popup ── */}
      {credentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-sm border overflow-hidden">
            <div className="bg-gradient-to-br from-primary to-primary/80 px-6 py-5 text-center">
              <CheckCircle className="h-10 w-10 text-white mx-auto mb-2" />
              <h2 className="text-white font-bold text-lg">Staff Account Created!</h2>
              <p className="text-white/70 text-xs mt-1">Share these credentials privately</p>
            </div>
            <div className="p-5 space-y-3">
              {[
                { label: 'Name',     value: credentials.name },
                { label: 'Username', value: credentials.username },
                { label: 'Email',    value: credentials.email },
                { label: 'Role',     value: credentials.role.charAt(0).toUpperCase() + credentials.role.slice(1) },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground w-20">{label}</span>
                  <span className="text-sm font-medium">{value}</span>
                </div>
              ))}
              <div className="flex justify-between items-center bg-amber-50 border border-amber-200 rounded-lg p-2">
                <span className="text-xs text-amber-600 w-20">Password</span>
                <div className="flex items-center gap-2">
                  <code className="font-mono text-sm text-amber-800">
                    {showPass ? credentials.password : '••••••••••'}
                  </code>
                  <button onClick={() => setShowPass(v => !v)} className="text-amber-600 hover:text-amber-800">
                    {showPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1 gap-2" onClick={copyCredentials}>
                  {copied ? <><CheckCircle className="h-4 w-4 text-green-600" />Copied!</> : <><Copy className="h-4 w-4" />Copy All</>}
                </Button>
                <Button className="flex-1" onClick={() => { setCredentials(null); setShowPass(false); }}>Done</Button>
              </div>
              <p className="text-xs text-muted-foreground text-center opacity-60">Save these credentials — they won't be shown again.</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
