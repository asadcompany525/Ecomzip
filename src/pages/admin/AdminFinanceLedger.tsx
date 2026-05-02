import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, DollarSign, Plus, Trash2, Loader2, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
}

const CATEGORIES = ['Rent', 'Salaries', 'Utilities', 'Packaging', 'Marketing', 'Shipping', 'Returns/Refunds', 'Miscellaneous'];

function StatCard({ title, value, sub, icon: Icon, color }: any) {
  return (
    <div className="bg-card border rounded-xl p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground mb-1">{title}</p>
          <p className={`text-2xl font-bold ${color}`}>Rs. {Number(value || 0).toLocaleString()}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
        <div className={`p-2 rounded-lg ${color === 'text-green-600' ? 'bg-green-50' : color === 'text-red-600' ? 'bg-red-50' : 'bg-primary/10'}`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
      </div>
    </div>
  );
}

export default function AdminFinanceLedger() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [savingExpense, setSavingExpense] = useState(false);
  const [newExpense, setNewExpense] = useState({ description: '', amount: '', category: 'Miscellaneous', date: new Date().toISOString().split('T')[0] });
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const loadData = async () => {
    setLoading(true);
    const [ordersRes, settingsRes] = await Promise.all([
      supabase.from('orders').select('total_amount, status, created_at').order('created_at', { ascending: false }),
      supabase.from('site_settings').select('value').eq('key', 'finance_expenses').maybeSingle(),
    ]);
    setOrders(ordersRes.data || []);
    if (settingsRes.data?.value && Array.isArray(settingsRes.data.value)) {
      setExpenses(settingsRes.data.value as Expense[]);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const monthOrders = orders.filter(o => o.created_at?.startsWith(selectedMonth));
  const monthRevenue = monthOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total_amount || 0), 0);
  const monthExpenses = expenses.filter(e => e.date?.startsWith(selectedMonth)).reduce((s, e) => s + Number(e.amount || 0), 0);
  const monthProfit = monthRevenue - monthExpenses;

  const totalRevenue = orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total_amount || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);

  const addExpense = async () => {
    if (!newExpense.description.trim() || !newExpense.amount) return;
    setSavingExpense(true);
    const entry: Expense = {
      id: Date.now().toString(),
      description: newExpense.description.trim(),
      amount: Number(newExpense.amount),
      category: newExpense.category,
      date: newExpense.date,
    };
    const updated = [entry, ...expenses];
    await supabase.from('site_settings').upsert({ key: 'finance_expenses', value: updated as any }, { onConflict: 'key' });
    setExpenses(updated);
    setNewExpense({ description: '', amount: '', category: 'Miscellaneous', date: new Date().toISOString().split('T')[0] });
    toast({ title: 'Expense added!' });
    setSavingExpense(false);
  };

  const deleteExpense = async (id: string) => {
    const updated = expenses.filter(e => e.id !== id);
    await supabase.from('site_settings').upsert({ key: 'finance_expenses', value: updated as any }, { onConflict: 'key' });
    setExpenses(updated);
    toast({ title: 'Expense deleted' });
  };

  const months: string[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><DollarSign className="h-5 w-5 text-primary" /> Finance & Profit/Loss Ledger</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Track revenue, expenses, and net profit</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard title="This Month Revenue" value={monthRevenue} icon={TrendingUp} color="text-green-600" sub={`${monthOrders.length} orders`} />
            <StatCard title="This Month Expenses" value={monthExpenses} icon={TrendingDown} color="text-red-600" sub={`${expenses.filter(e => e.date?.startsWith(selectedMonth)).length} entries`} />
            <StatCard title="Net Profit" value={monthProfit} icon={DollarSign} color={monthProfit >= 0 ? 'text-green-600' : 'text-red-600'} sub={monthProfit >= 0 ? 'In Profit ✅' : 'In Loss ❌'} />
            <StatCard title="All-Time Revenue" value={totalRevenue} icon={TrendingUp} color="text-primary" sub={`Rs. ${totalExpenses.toLocaleString()} expenses total`} />
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="bg-card border rounded-xl p-4">
              <h3 className="font-semibold text-sm mb-3">Add Expense Entry</h3>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Description *</Label>
                  <Input value={newExpense.description} onChange={e => setNewExpense(p => ({ ...p, description: e.target.value }))} placeholder="e.g. Office rent April" className="mt-1 h-8 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Amount (Rs.) *</Label>
                    <Input type="number" value={newExpense.amount} onChange={e => setNewExpense(p => ({ ...p, amount: e.target.value }))} placeholder="5000" className="mt-1 h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Date</Label>
                    <Input type="date" value={newExpense.date} onChange={e => setNewExpense(p => ({ ...p, date: e.target.value }))} className="mt-1 h-8 text-sm" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Category</Label>
                  <Select value={newExpense.category} onValueChange={v => setNewExpense(p => ({ ...p, category: v }))}>
                    <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button onClick={addExpense} disabled={savingExpense || !newExpense.description || !newExpense.amount} className="w-full h-8 text-sm gap-1.5">
                  {savingExpense ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Add Expense
                </Button>
              </div>
            </div>

            <div className="bg-card border rounded-xl p-4">
              <h3 className="font-semibold text-sm mb-3">
                Expense Entries — {selectedMonth}
                <span className="text-muted-foreground font-normal ml-2 text-xs">
                  ({expenses.filter(e => e.date?.startsWith(selectedMonth)).length} items)
                </span>
              </h3>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {expenses.filter(e => e.date?.startsWith(selectedMonth)).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No expenses for this month</p>
                ) : (
                  expenses.filter(e => e.date?.startsWith(selectedMonth)).map(exp => (
                    <div key={exp.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/40 group">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{exp.description}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge variant="outline" className="text-[9px] px-1 py-0">{exp.category}</Badge>
                          <span className="text-[10px] text-muted-foreground">{exp.date}</span>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-red-600 shrink-0">Rs. {Number(exp.amount).toLocaleString()}</span>
                      <button onClick={() => deleteExpense(exp.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="bg-card border rounded-xl p-4">
            <h3 className="font-semibold text-sm mb-3">Monthly Revenue — Last 6 Months</h3>
            <div className="space-y-2">
              {months.slice(0, 6).map(m => {
                const rev = orders.filter(o => o.created_at?.startsWith(m) && o.status !== 'cancelled').reduce((s, o) => s + Number(o.total_amount || 0), 0);
                const exp = expenses.filter(e => e.date?.startsWith(m)).reduce((s, e) => s + Number(e.amount || 0), 0);
                const profit = rev - exp;
                const maxRev = Math.max(...months.slice(0, 6).map(mo => orders.filter(o => o.created_at?.startsWith(mo) && o.status !== 'cancelled').reduce((s, o) => s + Number(o.total_amount || 0), 0)), 1);
                return (
                  <div key={m} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-16 shrink-0">{m}</span>
                    <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                      <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${(rev / maxRev) * 100}%` }} />
                    </div>
                    <span className="text-xs font-medium w-28 text-right shrink-0">Rs. {rev.toLocaleString()}</span>
                    <span className={`text-[10px] w-16 text-right shrink-0 ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {profit >= 0 ? '+' : ''}Rs. {profit.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
