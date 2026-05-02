import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Banknote, Plus, Edit2, Loader2, CheckCircle, XCircle, RefreshCw, Users } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface StaffMember { id: string; user_id: string; email: string; name: string; role: string; }
interface SalaryRecord { user_id: string; salary: number; paid_months: string[]; notes: string; }

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const currentYear = new Date().getFullYear();

export default function AdminStaffSalary() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [salaries, setSalaries] = useState<Record<string, SalaryRecord>>({});
  const [loading, setLoading] = useState(true);
  const [editDialog, setEditDialog] = useState<StaffMember | null>(null);
  const [editSalary, setEditSalary] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());

  const loadData = async () => {
    setLoading(true);
    const [rolesRes, settingsRes] = await Promise.all([
      supabase.from('user_roles').select('user_id, role').eq('role', 'moderator'),
      supabase.from('site_settings').select('value').eq('key', 'staff_salaries').maybeSingle(),
    ]);

    const userIds = (rolesRes.data || []).map((r: any) => r.user_id);
    const profilesRes = userIds.length > 0
      ? await supabase.from('profiles').select('user_id, full_name, phone').in('user_id', userIds)
      : { data: [] };
    const authRes = userIds.length > 0
      ? await supabase.from('profiles').select('user_id').in('user_id', userIds)
      : { data: [] };

    const profileMap: Record<string, any> = {};
    (profilesRes.data || []).forEach((p: any) => { profileMap[p.user_id] = p; });

    const staffList: StaffMember[] = (rolesRes.data || []).map((r: any) => ({
      id: r.user_id, user_id: r.user_id,
      email: profileMap[r.user_id]?.email || r.user_id.slice(0, 8) + '...',
      name: profileMap[r.user_id]?.full_name || 'Staff Member',
      role: r.role,
    }));
    setStaff(staffList);

    if (settingsRes.data?.value && typeof settingsRes.data.value === 'object') {
      setSalaries(settingsRes.data.value as Record<string, SalaryRecord>);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const openEdit = (member: StaffMember) => {
    const sal = salaries[member.user_id];
    setEditSalary(sal?.salary?.toString() || '');
    setEditNotes(sal?.notes || '');
    setEditDialog(member);
  };

  const saveSalary = async () => {
    if (!editDialog) return;
    setSaving(true);
    const updated: Record<string, SalaryRecord> = {
      ...salaries,
      [editDialog.user_id]: {
        user_id: editDialog.user_id,
        salary: Number(editSalary) || 0,
        paid_months: salaries[editDialog.user_id]?.paid_months || [],
        notes: editNotes,
      },
    };
    await supabase.from('site_settings').upsert({ key: 'staff_salaries', value: updated as any }, { onConflict: 'key' });
    setSalaries(updated);
    toast({ title: 'Salary saved!' });
    setSaving(false);
    setEditDialog(null);
  };

  const togglePaidMonth = async (userId: string, monthKey: string) => {
    const current = salaries[userId] || { user_id: userId, salary: 0, paid_months: [], notes: '' };
    const paid = current.paid_months || [];
    const updated = paid.includes(monthKey) ? paid.filter((m: string) => m !== monthKey) : [...paid, monthKey];
    const newSalaries = { ...salaries, [userId]: { ...current, paid_months: updated } };
    await supabase.from('site_settings').upsert({ key: 'staff_salaries', value: newSalaries as any }, { onConflict: 'key' });
    setSalaries(newSalaries);
    toast({ title: updated.includes(monthKey) ? '✅ Marked as paid' : 'Marked unpaid' });
  };

  const totalMonthlyPayroll = staff.reduce((s, m) => s + (salaries[m.user_id]?.salary || 0), 0);
  const years = [currentYear, currentYear - 1, currentYear - 2].map(String);

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><Banknote className="h-5 w-5 text-primary" /> Staff Salary Management</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Set salaries and track monthly payments</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Total Staff</p>
          <p className="text-2xl font-bold text-primary">{staff.length}</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Monthly Payroll</p>
          <p className="text-2xl font-bold text-green-600">Rs. {totalMonthlyPayroll.toLocaleString()}</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Annual Payroll</p>
          <p className="text-2xl font-bold">{(totalMonthlyPayroll * 12).toLocaleString()}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : staff.length === 0 ? (
        <div className="text-center py-16">
          <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground">No staff members found. Add staff in Staff Management.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {staff.map(member => {
            const sal = salaries[member.user_id];
            const paidMonths = sal?.paid_months || [];
            return (
              <div key={member.user_id} className="bg-card border rounded-xl p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                      {member.name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                      {sal?.notes && <p className="text-xs text-muted-foreground italic mt-0.5">{sal.notes}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Monthly</p>
                      <p className="font-bold text-sm text-primary">
                        {sal?.salary ? `Rs. ${Number(sal.salary).toLocaleString()}` : '—'}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => openEdit(member)} className="gap-1 h-8">
                      <Edit2 className="h-3 w-3" /> Edit
                    </Button>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 font-medium">{selectedYear} — Payment Status</p>
                  <div className="flex flex-wrap gap-1.5">
                    {MONTHS.map((month, i) => {
                      const key = `${selectedYear}-${String(i + 1).padStart(2, '0')}`;
                      const isPaid = paidMonths.includes(key);
                      return (
                        <button
                          key={month}
                          onClick={() => togglePaidMonth(member.user_id, key)}
                          className={`flex items-center gap-0.5 px-2 py-1 rounded-md text-[10px] font-medium border transition-all ${
                            isPaid
                              ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                              : 'bg-muted border-muted-foreground/20 text-muted-foreground hover:bg-red-50 hover:border-red-200 hover:text-red-600'
                          }`}
                        >
                          {isPaid ? <CheckCircle className="h-2.5 w-2.5" /> : <XCircle className="h-2.5 w-2.5" />}
                          {month}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1.5">
                    {paidMonths.filter(m => m.startsWith(selectedYear)).length}/{MONTHS.length} months paid
                    {sal?.salary ? ` · Rs. ${(paidMonths.filter(m => m.startsWith(selectedYear)).length * Number(sal.salary)).toLocaleString()} disbursed` : ''}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!editDialog} onOpenChange={() => setEditDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Banknote className="h-4 w-4" /> Edit Salary — {editDialog?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Monthly Salary (Rs.)</Label>
              <Input type="number" value={editSalary} onChange={e => setEditSalary(e.target.value)} placeholder="25000" className="mt-1" />
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Input value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="e.g. Includes transport allowance" className="mt-1" />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setEditDialog(null)} className="flex-1">Cancel</Button>
              <Button onClick={saveSalary} disabled={saving} className="flex-1 gap-1.5">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Save Salary
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
