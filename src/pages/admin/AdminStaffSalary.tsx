import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'framer-motion';
import { Banknote, Edit2, Loader2, CheckCircle, XCircle, RefreshCw, Users, TrendingUp, Calendar } from 'lucide-react';
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
  const notesRef = useRef<HTMLInputElement>(null);
  const saveBtnRef = useRef<HTMLButtonElement>(null);

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
    const profileMap: Record<string, any> = {};
    (profilesRes.data || []).forEach((p: any) => { profileMap[p.user_id] = p; });
    const staffList: StaffMember[] = (rolesRes.data || []).map((r: any) => ({
      id: r.user_id, user_id: r.user_id,
      email: profileMap[r.user_id]?.email || r.user_id.slice(0, 8) + '…',
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
      [editDialog.user_id]: { user_id: editDialog.user_id, salary: Number(editSalary) || 0, paid_months: salaries[editDialog.user_id]?.paid_months || [], notes: editNotes },
    };
    await supabase.from('site_settings').upsert({ key: 'staff_salaries', value: updated as any }, { onConflict: 'key' });
    setSalaries(updated);
    toast({ title: '✅ Salary saved!' });
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
    toast({ title: updated.includes(monthKey) ? '✅ Marked paid' : '○ Marked unpaid' });
  };

  const totalMonthlyPayroll = staff.reduce((s, m) => s + (salaries[m.user_id]?.salary || 0), 0);
  const years = [currentYear, currentYear - 1, currentYear - 2].map(String);
  const currentMonthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-500 to-violet-600 p-5 text-white shadow-lg">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 70% 50%, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1"><Banknote className="h-5 w-5" /><h2 className="text-xl font-black">Staff Salary Management</h2></div>
            <p className="text-blue-200 text-sm">Set salaries · Track monthly payments · View annual disbursements</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-24 h-8 text-xs bg-white/20 border-white/30 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={loadData} disabled={loading}
              className="bg-white/20 hover:bg-white/30 text-white border-white/30 gap-1.5">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Users, label: 'Total Staff', value: staff.length, unit: '', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200' },
          { icon: Banknote, label: 'Monthly Payroll', value: `Rs. ${totalMonthlyPayroll.toLocaleString()}`, unit: '', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200' },
          { icon: TrendingUp, label: 'Annual Payroll', value: `Rs. ${(totalMonthlyPayroll * 12).toLocaleString()}`, unit: '', color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-950/20 border-violet-200' },
        ].map(c => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl border p-4 ${c.bg}`}>
            <div className="flex items-center gap-2 mb-2">
              <c.icon className={`h-4 w-4 ${c.color}`} />
              <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{c.label}</span>
            </div>
            <p className={`text-xl font-black ${c.color}`}>{c.value}</p>
          </motion.div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
        </div>
      ) : staff.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground bg-card border rounded-2xl">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No staff members found</p>
          <p className="text-sm mt-1">Add staff in Staff Management first</p>
        </div>
      ) : (
        <div className="space-y-3">
          {staff.map((member, idx) => {
            const sal = salaries[member.user_id];
            const paidMonths = sal?.paid_months || [];
            const yearPaidCount = paidMonths.filter(m => m.startsWith(selectedYear)).length;
            const yearDisbursed = yearPaidCount * (sal?.salary || 0);
            const currentMonthPaid = paidMonths.includes(currentMonthKey);
            return (
              <motion.div key={member.user_id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }} className="bg-card border rounded-2xl p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-black text-base shrink-0">
                      {member.name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-sm">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                      {sal?.notes && <p className="text-xs text-muted-foreground/70 italic mt-0.5">{sal.notes}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground font-medium">Monthly</p>
                      <p className="font-black text-base text-blue-600">{sal?.salary ? `Rs. ${Number(sal.salary).toLocaleString()}` : '—'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground font-medium">This Month</p>
                      <div className={`flex items-center gap-1 justify-end ${currentMonthPaid ? 'text-emerald-600' : 'text-amber-500'}`}>
                        {currentMonthPaid ? <CheckCircle className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                        <span className="text-xs font-bold">{currentMonthPaid ? 'Paid' : 'Unpaid'}</span>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => openEdit(member)} className="gap-1.5 h-8 rounded-xl">
                      <Edit2 className="h-3 w-3" /> Edit
                    </Button>
                  </div>
                </div>

                <div className="border-t pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{selectedYear} Payment Status</p>
                    <p className="text-[10px] text-muted-foreground">{yearPaidCount}/12 · Rs. {yearDisbursed.toLocaleString()} disbursed</p>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {MONTHS.map((month, i) => {
                      const key = `${selectedYear}-${String(i + 1).padStart(2, '0')}`;
                      const isPaid = paidMonths.includes(key);
                      return (
                        <button key={month} onClick={() => togglePaidMonth(member.user_id, key)}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold border transition-all hover:scale-105 active:scale-95 ${
                            isPaid ? 'bg-emerald-100 border-emerald-300 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-700 dark:text-emerald-400'
                                   : 'bg-muted/50 border-muted-foreground/20 text-muted-foreground hover:bg-red-50 hover:border-red-300 hover:text-red-600'
                          }`}>
                          {isPaid ? '✓' : '○'} {month}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Edit dialog with Enter key navigation */}
      <Dialog open={!!editDialog} onOpenChange={() => setEditDialog(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-xl"><Banknote className="h-4 w-4 text-blue-700" /></div>
              Edit Salary — {editDialog?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div>
              <Label className="text-xs font-semibold">Monthly Salary (Rs.)</Label>
              <Input id="salary-amount" type="number" value={editSalary} onChange={e => setEditSalary(e.target.value)}
                placeholder="25000" className="mt-1 h-10 rounded-xl text-base font-bold"
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); notesRef.current?.focus(); } }}
                autoFocus />
            </div>
            <div>
              <Label className="text-xs font-semibold">Notes <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <Input ref={notesRef} value={editNotes} onChange={e => setEditNotes(e.target.value)}
                placeholder="e.g. Includes transport allowance" className="mt-1 h-9 rounded-xl"
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); saveBtnRef.current?.click(); } }} />
              <p className="text-[10px] text-muted-foreground mt-1">💡 Press Enter to move Salary → Notes → Save</p>
            </div>
            <div className="flex gap-3 pt-1">
              <Button variant="outline" onClick={() => setEditDialog(null)} className="flex-1 rounded-xl">Cancel</Button>
              <Button ref={saveBtnRef} onClick={saveSalary} disabled={saving} className="flex-1 gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                Save Salary
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
