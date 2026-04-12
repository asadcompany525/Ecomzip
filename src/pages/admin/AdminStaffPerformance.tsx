import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import {
  Clock, MessageSquare, RefreshCw, Activity, LogIn, LogOut, TrendingUp, Users, Loader2
} from 'lucide-react';

interface StaffRecord {
  user_id: string;
  email: string;
  name: string;
  role_label: string;
  total_minutes: number;
  session_count: number;
  last_login: string | null;
  last_logout: string | null;
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

const ROLE_COLORS: Record<string, string> = {
  staff:    'bg-indigo-100 text-indigo-700 border-indigo-200',
  sales:    'bg-yellow-100 text-yellow-700 border-yellow-200',
  support:  'bg-blue-100 text-blue-700 border-blue-200',
  delivery: 'bg-orange-100 text-orange-700 border-orange-200',
  manager:  'bg-purple-100 text-purple-700 border-purple-200',
  editor:   'bg-green-100 text-green-700 border-green-200',
  viewer:   'bg-gray-100 text-gray-700 border-gray-200',
};

function getRoleColor(label: string) {
  const key = label.toLowerCase().replace(/\s+/g, '');
  return ROLE_COLORS[key] || ROLE_COLORS.staff;
}

export default function AdminStaffPerformance() {
  const navigate = useNavigate();
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: roles, error: rolesErr } = await supabase
        .from('user_roles')
        .select('user_id, role, custom_role_label')
        .eq('role', 'moderator');

      if (rolesErr) throw rolesErr;
      if (!roles?.length) { setStaff([]); setLoading(false); return; }

      const userIds = roles.map(r => r.user_id).filter(Boolean);

      const [{ data: profiles }, { data: logs }] = await Promise.all([
        supabase.from('profiles').select('user_id, email, full_name').in('user_id', userIds),
        supabase.from('staff_attendance').select('user_id, login_at, logout_at, duration_minutes').in('user_id', userIds).order('login_at', { ascending: false }),
      ]);

      const profileMap: Record<string, any> = {};
      (profiles || []).forEach(p => { profileMap[p.user_id] = p; });

      const records: StaffRecord[] = roles.map(role => {
        const profile = profileMap[role.user_id] || {};
        const myLogs = (logs || []).filter(l => l.user_id === role.user_id);
        const total_minutes = myLogs.reduce((sum, l) => sum + (l.duration_minutes || 0), 0);
        const last_login  = myLogs[0]?.login_at  || null;
        const last_logout = myLogs[0]?.logout_at || null;

        return {
          user_id: role.user_id,
          email: profile.email || '—',
          name: profile.full_name || profile.email || 'Staff',
          role_label: role.custom_role_label || 'Staff',
          total_minutes,
          session_count: myLogs.length,
          last_login,
          last_logout,
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

  const totalHours = staff.reduce((s, r) => s + r.total_minutes, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" /> Staff Performance
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Login hours, sessions, and chat activity for all staff members.</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="gap-2">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
            <p className="text-xs text-muted-foreground">Total Hours Logged</p>
            <p className="text-xl font-bold">{fmtDuration(totalHours)}</p>
          </div>
        </div>
        <div className="bg-card border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 rounded-lg"><TrendingUp className="h-4 w-4 text-blue-600" /></div>
          <div>
            <p className="text-xs text-muted-foreground">Total Sessions</p>
            <p className="text-xl font-bold">{staff.reduce((s, r) => s + r.session_count, 0)}</p>
          </div>
        </div>
      </div>

      {/* Staff Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : staff.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <Users className="h-12 w-12 text-muted-foreground/30" />
          <p className="text-muted-foreground">No staff members found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {staff.map((s, i) => (
            <div key={s.user_id} className="bg-card border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Rank + Name */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                  i === 0 ? 'bg-yellow-400 text-yellow-900' : i === 1 ? 'bg-slate-300 text-slate-700' : i === 2 ? 'bg-amber-600/70 text-white' : 'bg-muted text-muted-foreground'
                }`}>
                  {i + 1}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{s.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                </div>
                <Badge className={`text-[10px] px-2 py-0.5 border font-semibold shrink-0 ${getRoleColor(s.role_label)}`}>
                  {s.role_label}
                </Badge>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Hours</p>
                  <p className="font-bold text-sm text-green-600">{fmtDuration(s.total_minutes)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Sessions</p>
                  <p className="font-bold text-sm">{s.session_count}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Avg / Session</p>
                  <p className="font-bold text-sm">
                    {s.session_count > 0 ? fmtDuration(s.total_minutes / s.session_count) : '—'}
                  </p>
                </div>
              </div>

              {/* Timestamps */}
              <div className="text-xs space-y-1 min-w-[180px]">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <LogIn className="h-3 w-3 text-green-500 shrink-0" />
                  <span className="truncate">{fmtDate(s.last_login)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <LogOut className="h-3 w-3 text-red-400 shrink-0" />
                  <span className="truncate">{fmtDate(s.last_logout)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs"
                  onClick={() => navigate('/admin/chat', { state: { filterUserId: s.user_id } })}
                >
                  <MessageSquare className="h-3.5 w-3.5" /> View Chat History
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
