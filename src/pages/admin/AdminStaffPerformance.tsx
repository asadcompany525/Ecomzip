import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import {
  Clock, MessageSquare, RefreshCw, Activity, LogIn, LogOut,
  TrendingUp, Users, Loader2, Search, ChevronDown, ChevronUp,
  Calendar, BarChart2, X
} from 'lucide-react';

interface StaffRecord {
  row_id: string;
  user_id: string;
  email: string;
  name: string;
  role_label: string;
  total_minutes: number;
  session_count: number;
  chat_replies: number;
  last_login: string | null;
  last_logout: string | null;
  logs: SessionLog[];
}

interface SessionLog {
  id: string;
  login_at: string;
  logout_at: string | null;
  duration_minutes: number | null;
}

// Role display names — mirrors AdminStaff logic without touching DB column
const ROLE_DISPLAY: Record<string, string> = {
  staff: 'Staff', sales: 'Sales', support: 'Support',
  delivery: 'Delivery', manager: 'Manager', editor: 'Editor', viewer: 'Viewer',
  moderator: 'Staff',
};

const ROLE_COLORS: Record<string, string> = {
  staff:    'bg-indigo-100 text-indigo-700 border-indigo-200',
  sales:    'bg-yellow-100 text-yellow-700 border-yellow-200',
  support:  'bg-blue-100 text-blue-700 border-blue-200',
  delivery: 'bg-orange-100 text-orange-700 border-orange-200',
  manager:  'bg-purple-100 text-purple-700 border-purple-200',
  editor:   'bg-green-100 text-green-700 border-green-200',
  viewer:   'bg-gray-100 text-gray-700 border-gray-200',
};

// Read role labels saved by AdminStaff into localStorage
const ROLES_KEY = 'staff_roles_v3';
const loadSavedRoles = (): Record<string, string> => {
  try { return JSON.parse(localStorage.getItem(ROLES_KEY) || '{}'); } catch { return {}; }
};

function getRoleLabel(rowId: string, fallback = 'Staff'): string {
  const saved = loadSavedRoles();
  const key = saved[rowId] || 'staff';
  return ROLE_DISPLAY[key] || key.charAt(0).toUpperCase() + key.slice(1) || fallback;
}

function getRoleColor(label: string) {
  const key = label.toLowerCase().replace(/\s+/g, '');
  return ROLE_COLORS[key] || ROLE_COLORS.staff;
}

function fmtDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return '0h 0m';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${m}m`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-PK', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
}

function fmtDay(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AdminStaffPerformance() {
  const navigate = useNavigate();
  const [staff, setStaff]           = useState<StaffRecord[]>([]);
  const [loading, setLoading]        = useState(true);
  const [search, setSearch]          = useState('');
  const [expanded, setExpanded]      = useState<string | null>(null);
  const [selectedId, setSelectedId]  = useState<string>('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch staff from user_roles — no custom_role_label column dependency
      const { data: roles, error: rolesErr } = await supabase
        .from('user_roles')
        .select('id, user_id, role')
        .eq('role', 'moderator');

      if (rolesErr) throw rolesErr;
      if (!roles?.length) { setStaff([]); setLoading(false); return; }

      const userIds = roles.map(r => r.user_id).filter(Boolean);

      // Fetch profiles + attendance + chat message counts in parallel
      const [
        { data: profiles },
        { data: logs },
        { data: chatData },
      ] = await Promise.all([
        supabase.from('profiles').select('user_id, email, full_name').in('user_id', userIds),
        supabase
          .from('staff_attendance')
          .select('id, user_id, login_at, logout_at, duration_minutes')
          .in('user_id', userIds)
          .order('login_at', { ascending: false }),
        supabase
          .from('chat_messages')
          .select('sender_id')
          .in('sender_id', userIds),
      ]);

      const profileMap: Record<string, any> = {};
      (profiles || []).forEach(p => { profileMap[p.user_id] = p; });

      // Count chat replies per user
      const chatCounts: Record<string, number> = {};
      (chatData || []).forEach(m => {
        if (m.sender_id) chatCounts[m.sender_id] = (chatCounts[m.sender_id] || 0) + 1;
      });

      const records: StaffRecord[] = roles.map(role => {
        const profile  = profileMap[role.user_id] || {};
        const myLogs   = (logs || []).filter(l => l.user_id === role.user_id);
        const total_minutes = myLogs.reduce((sum, l) => sum + (l.duration_minutes || 0), 0);

        return {
          row_id:        role.id,
          user_id:       role.user_id,
          email:         profile.email || '—',
          name:          profile.full_name || profile.email || 'Staff',
          role_label:    getRoleLabel(role.id),
          total_minutes,
          session_count: myLogs.length,
          chat_replies:  chatCounts[role.user_id] || 0,
          last_login:    myLogs[0]?.login_at  || null,
          last_logout:   myLogs[0]?.logout_at || null,
          logs:          myLogs.slice(0, 20).map(l => ({
            id:               l.id,
            login_at:         l.login_at,
            logout_at:        l.logout_at,
            duration_minutes: l.duration_minutes,
          })),
        };
      });

      records.sort((a, b) => b.total_minutes - a.total_minutes);
      setStaff(records);
    } catch (err: any) {
      toast({ title: 'Failed to load performance data', description: err.message, variant: 'destructive' });
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const totalHours   = staff.reduce((s, r) => s + r.total_minutes, 0);
  const totalChats   = staff.reduce((s, r) => s + r.chat_replies, 0);
  const totalSessions= staff.reduce((s, r) => s + r.session_count, 0);

  // Selected staff for individual panel
  const selectedStaff = staff.find(s => s.row_id === selectedId) || null;

  // Filtered list for the cards
  const filtered = staff.filter(s =>
    !search ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.role_label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" /> Staff Performance
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Monitor login hours, chat activity, and session logs per staff member.</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="gap-2">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-lg"><Users className="h-4 w-4 text-primary" /></div>
          <div>
            <p className="text-xs text-muted-foreground">Total Staff</p>
            <p className="text-xl font-bold">{staff.length}</p>
          </div>
        </div>
        <div className="bg-card border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 bg-green-500/10 rounded-lg"><Clock className="h-4 w-4 text-green-600" /></div>
          <div>
            <p className="text-xs text-muted-foreground">Total Hours</p>
            <p className="text-xl font-bold">{fmtDuration(totalHours)}</p>
          </div>
        </div>
        <div className="bg-card border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 rounded-lg"><TrendingUp className="h-4 w-4 text-blue-600" /></div>
          <div>
            <p className="text-xs text-muted-foreground">Total Sessions</p>
            <p className="text-xl font-bold">{totalSessions}</p>
          </div>
        </div>
        <div className="bg-card border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 bg-orange-500/10 rounded-lg"><MessageSquare className="h-4 w-4 text-orange-500" /></div>
          <div>
            <p className="text-xs text-muted-foreground">Chat Replies</p>
            <p className="text-xl font-bold">{totalChats}</p>
          </div>
        </div>
      </div>

      {/* Individual Staff Selector */}
      <div className="bg-card border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm font-semibold flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-primary" /> Individual Staff View
          </p>
          {selectedStaff && (
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground" onClick={() => setSelectedId('')}>
              <X className="h-3 w-3" /> Clear
            </Button>
          )}
        </div>
        <select
          value={selectedId}
          onChange={e => setSelectedId(e.target.value)}
          className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">— Select a staff member —</option>
          {staff.map(s => (
            <option key={s.row_id} value={s.row_id}>
              {s.name} ({s.email}) · {s.role_label}
            </option>
          ))}
        </select>

        {selectedStaff && (
          <div className="space-y-4 pt-2 border-t">
            {/* Individual Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-muted/40 rounded-lg p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Hours</p>
                <p className="font-bold text-base text-green-600 mt-0.5">{fmtDuration(selectedStaff.total_minutes)}</p>
              </div>
              <div className="bg-muted/40 rounded-lg p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Sessions</p>
                <p className="font-bold text-base mt-0.5">{selectedStaff.session_count}</p>
              </div>
              <div className="bg-muted/40 rounded-lg p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Avg / Session</p>
                <p className="font-bold text-base mt-0.5">
                  {selectedStaff.session_count > 0 ? fmtDuration(selectedStaff.total_minutes / selectedStaff.session_count) : '—'}
                </p>
              </div>
              <div className="bg-muted/40 rounded-lg p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Chat Replies</p>
                <p className="font-bold text-base text-orange-500 mt-0.5">{selectedStaff.chat_replies}</p>
              </div>
            </div>

            {/* Session Logs Table */}
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Calendar className="h-3 w-3" /> Session Logs (last 20)
              </p>
              {selectedStaff.logs.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">No sessions recorded yet.</p>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/50 border-b">
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground">#</th>
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Date</th>
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Login</th>
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Logout</th>
                        <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedStaff.logs.map((log, i) => (
                        <tr key={log.id} className={`border-b last:border-b-0 ${i % 2 === 0 ? '' : 'bg-muted/20'}`}>
                          <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                          <td className="px-3 py-2 font-medium">{fmtDay(log.login_at)}</td>
                          <td className="px-3 py-2 text-green-600 font-medium">{fmtTime(log.login_at)}</td>
                          <td className="px-3 py-2 text-red-400">{log.logout_at ? fmtTime(log.logout_at) : <span className="text-amber-500 italic">Active</span>}</td>
                          <td className="px-3 py-2 text-right font-semibold">{fmtDuration(log.duration_minutes || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Chat History Link */}
            <Button
              className="w-full gap-2"
              onClick={() => navigate('/admin/chat', { state: { filterUserId: selectedStaff.user_id, filterName: selectedStaff.name } })}
            >
              <MessageSquare className="h-4 w-4" /> View {selectedStaff.name}'s Chat History
            </Button>
          </div>
        )}
      </div>

      {/* Search + Staff List */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by name, email or role…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
          {search && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSearch('')}>
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <Users className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">{search ? 'No staff match your search.' : 'No staff members found.'}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((s, i) => {
              const isExpanded = expanded === s.row_id;
              const rank = staff.indexOf(s) + 1;
              return (
                <div key={s.row_id} className="bg-card border rounded-xl overflow-hidden">
                  {/* Card header — always visible */}
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Rank + Name */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                        rank === 1 ? 'bg-yellow-400 text-yellow-900'
                        : rank === 2 ? 'bg-slate-300 text-slate-700'
                        : rank === 3 ? 'bg-amber-600/70 text-white'
                        : 'bg-muted text-muted-foreground'
                      }`}>
                        {rank}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{s.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                      </div>
                      <Badge className={`text-[10px] px-2 py-0.5 border font-semibold shrink-0 ${getRoleColor(s.role_label)}`}>
                        {s.role_label}
                      </Badge>
                    </div>

                    {/* Quick stats */}
                    <div className="grid grid-cols-3 gap-3 text-center text-xs shrink-0">
                      <div>
                        <p className="text-muted-foreground uppercase tracking-wide text-[10px]">Hours</p>
                        <p className="font-bold text-green-600">{fmtDuration(s.total_minutes)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground uppercase tracking-wide text-[10px]">Sessions</p>
                        <p className="font-bold">{s.session_count}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground uppercase tracking-wide text-[10px]">Chats</p>
                        <p className="font-bold text-orange-500">{s.chat_replies}</p>
                      </div>
                    </div>

                    {/* Timestamps */}
                    <div className="text-xs space-y-1 min-w-[170px]">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <LogIn className="h-3 w-3 text-green-500 shrink-0" />
                        <span className="truncate">{fmtDate(s.last_login)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <LogOut className="h-3 w-3 text-red-400 shrink-0" />
                        <span className="truncate">{fmtDate(s.last_logout)}</span>
                      </div>
                    </div>

                    {/* Expand toggle */}
                    <button
                      onClick={() => setExpanded(isExpanded ? null : s.row_id)}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0 px-2 py-1 rounded-md hover:bg-accent"
                    >
                      {isExpanded ? <><ChevronUp className="h-3.5 w-3.5" /> Hide</> : <><ChevronDown className="h-3.5 w-3.5" /> Details</>}
                    </button>
                  </div>

                  {/* Expanded session logs */}
                  {isExpanded && (
                    <div className="border-t bg-muted/20 px-4 pt-3 pb-4 space-y-3">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" /> Session Logs (last 20)
                      </p>
                      {s.logs.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">No sessions recorded.</p>
                      ) : (
                        <div className="rounded-lg border overflow-hidden">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-muted/50 border-b">
                                <th className="text-left px-3 py-1.5 font-semibold text-muted-foreground">Date</th>
                                <th className="text-left px-3 py-1.5 font-semibold text-muted-foreground">Login</th>
                                <th className="text-left px-3 py-1.5 font-semibold text-muted-foreground">Logout</th>
                                <th className="text-right px-3 py-1.5 font-semibold text-muted-foreground">Duration</th>
                              </tr>
                            </thead>
                            <tbody>
                              {s.logs.map((log, li) => (
                                <tr key={log.id} className={`border-b last:border-b-0 ${li % 2 === 0 ? '' : 'bg-muted/20'}`}>
                                  <td className="px-3 py-1.5 font-medium">{fmtDay(log.login_at)}</td>
                                  <td className="px-3 py-1.5 text-green-600 font-medium">{fmtTime(log.login_at)}</td>
                                  <td className="px-3 py-1.5 text-red-400">
                                    {log.logout_at ? fmtTime(log.logout_at) : <span className="text-amber-500 italic">Active</span>}
                                  </td>
                                  <td className="px-3 py-1.5 text-right font-semibold">{fmtDuration(log.duration_minutes || 0)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs w-full"
                        onClick={() => navigate('/admin/chat', { state: { filterUserId: s.user_id, filterName: s.name } })}
                      >
                        <MessageSquare className="h-3.5 w-3.5" /> View {s.name}'s Chat History
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
