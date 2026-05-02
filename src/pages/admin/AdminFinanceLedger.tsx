import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, DollarSign, Plus, Trash2, Loader2, RefreshCw, Wallet, BarChart3 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Expense { id: string; description: string; amount: number; category: string; date: string; }
const CATEGORIES = ['Rent', 'Salaries', 'Utilities', 'Packaging', 'Marketing', 'Shipping', 'Returns/Refunds', 'Miscellaneous'];

const MONTHS_LIST = (() => {
  const m: string[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    m.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return m;
})();

function GradientCard({ title, value, sub, icon, gradient, textColor }: any) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl p-4 ${gradient}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide opacity-70">{title}</p>
          <p className={`text-2xl font-black mt-1 ${textColor}`}>Rs. {Number(value || 0).toLocaleString()}</p>
          {sub && <p className="text-xs opacity-60 mt-1">{sub}</p>}
        </div>
        <div className="p-2.5 bg-white/30 rounded-xl">
          <icon.type {...icon.props} className="h-5 w-5 opacity-80" />
        </div>
      </div>
    </motion.div>
  );
}

export default function AdminFinanceLedger() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [savingExpense, setSavingExpense] = useState(false);
  const [newExp, setNewExp] = useState({ description: '', amount: '', category: 'Miscellaneous', date: new Date().toISOString().split('T')[0] });
  const [selectedMonth, setSelectedMonth] = useState(MONTHS_LIST[0]);
  const amountRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const addBtnRef = useRef<HTMLButtonElement>(null);

  const loadData = async () => {
    setLoading(true);
    const [ordersRes, settingsRes] = await Promise.all([
      supabase.from('orders').select('total_amount, status, created_at').order('created_at', { ascending: false }),
      supabase.from('site_settings').select('value').eq('key', 'finance_expenses').maybeSingle(),
    ]);
    setOrders(ordersRes.data || []);
    if (Array.isArray(settingsRes.data?.value)) setExpenses(settingsRes.data.value as Expense[]);
    setLoading(false);
  };
  useEffect(() => { loadData(); }, []);

  const monthOrders = orders.filter(o => o.created_at?.startsWith(selectedMonth));
  const monthRevenue = monthOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total_amount || 0), 0);
  const monthExpenses = expenses.filter(e => e.date?.startsWith(selectedMonth)).reduce((s, e) => s + Number(e.amount || 0), 0);
  const monthProfit = monthRevenue - monthExpenses;
  const totalRevenue = orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total_amount || 0), 0);
  const totalExpensesAll = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);

  const addExpense = async () => {
    if (!newExp.description.trim() || !newExp.amount) return;
    setSavingExpense(true);
    const entry: Expense = { id: Date.now().toString(), description: newExp.description.trim(), amount: Number(newExp.amount), category: newExp.category, date: newExp.date };
    const updated = [entry, ...expenses];
    await supabase.from('site_settings').upsert({ key: 'finance_expenses', value: updated as any }, { onConflict: 'key' });
    setExpenses(updated);
    setNewExp({ description: '', amount: '', category: 'Miscellaneous', date: new Date().toISOString().split('T')[0] });
    toast({ title: '✅ Expense added!' });
    setSavingExpense(false);
    document.getElementById('exp-description')?.focus();
  };

  const deleteExpense = async (id: string) => {
    const updated = expenses.filter(e => e.id !== id);
    await supabase.from('site_settings').upsert({ key: 'finance_expenses', value: updated as any }, { onConflict: 'key' });
    setExpenses(updated);
    toast({ title: 'Expense deleted' });
  };

  const chartData = MONTHS_LIST.slice(0, 6).reverse().map(m => {
    const rev = orders.filter(o => o.created_at?.startsWith(m) && o.status !== 'cancelled').reduce((s, o) => s + Number(o.total_amount || 0), 0);
    const exp = expenses.filter(e => e.date?.startsWith(m)).reduce((s, e) => s + Number(e.amount || 0), 0);
    return { name: m.slice(5) + '/' + m.slice(2, 4), Revenue: rev, Expenses: exp, Profit: rev - exp };
  });

  const monthExpenseList = expenses.filter(e => e.date?.startsWith(selectedMonth));

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-500 to-cyan-600 p-5 text-white shadow-lg">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 70% 50%, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1"><Wallet className="h-5 w-5" /><h2 className="text-xl font-black">Finance & Profit/Loss Ledger</h2></div>
            <p className="text-emerald-200 text-sm">Track revenue, expenses, and net profit month by month</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-36 h-8 text-xs bg-white/20 border-white/30 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>{MONTHS_LIST.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={loadData} disabled={loading}
              className="bg-white/20 hover:bg-white/30 text-white border-white/30 gap-1.5">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
        </div>
      ) : (<>
        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <GradientCard title="This Month Revenue" value={monthRevenue} sub={`${monthOrders.length} orders`}
            icon={<TrendingUp />} gradient="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200" textColor="text-emerald-700" />
          <GradientCard title="This Month Expenses" value={monthExpenses} sub={`${monthExpenseList.length} entries`}
            icon={<TrendingDown />} gradient="bg-red-50 dark:bg-red-950/20 border border-red-200" textColor="text-red-700" />
          <GradientCard title="Net Profit" value={monthProfit} sub={monthProfit >= 0 ? '✅ In Profit' : '❌ In Loss'}
            icon={<DollarSign />} gradient={`${monthProfit >= 0 ? 'bg-teal-50 dark:bg-teal-950/20 border-teal-200' : 'bg-red-50 dark:bg-red-950/20 border-red-200'} border`}
            textColor={monthProfit >= 0 ? 'text-teal-700' : 'text-red-700'} />
          <GradientCard title="All-Time Revenue" value={totalRevenue} sub={`Rs. ${totalExpensesAll.toLocaleString()} spent total`}
            icon={<BarChart3 />} gradient="bg-violet-50 dark:bg-violet-950/20 border border-violet-200" textColor="text-violet-700" />
        </div>

        {/* Chart */}
        <div className="bg-card border rounded-2xl p-4">
          <h3 className="font-bold text-sm mb-4 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-emerald-600" /> Revenue vs Expenses — Last 6 Months</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barSize={14}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: any) => `Rs. ${Number(v).toLocaleString()}`} contentStyle={{ fontSize: 12, borderRadius: 12 }} />
              <Bar dataKey="Revenue" fill="#10b981" radius={[4,4,0,0]} />
              <Bar dataKey="Expenses" fill="#ef4444" radius={[4,4,0,0]} />
              <Bar dataKey="Profit" fill="#8b5cf6" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Add expense + list */}
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Add form with Enter key navigation */}
          <div className="bg-card border rounded-2xl p-4">
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2"><Plus className="h-4 w-4 text-emerald-600" /> Add Expense Entry</h3>
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-semibold">Description *</Label>
                <Input id="exp-description" value={newExp.description}
                  onChange={e => setNewExp(p => ({ ...p, description: e.target.value }))}
                  placeholder="e.g. Office rent April" className="mt-1 h-9 rounded-xl"
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); amountRef.current?.focus(); } }} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs font-semibold">Amount (Rs.) *</Label>
                  <Input ref={amountRef} type="number" value={newExp.amount}
                    onChange={e => setNewExp(p => ({ ...p, amount: e.target.value }))}
                    placeholder="5000" className="mt-1 h-9 rounded-xl"
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); dateRef.current?.focus(); } }} />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Date</Label>
                  <Input ref={dateRef} type="date" value={newExp.date}
                    onChange={e => setNewExp(p => ({ ...p, date: e.target.value }))}
                    className="mt-1 h-9 rounded-xl"
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addBtnRef.current?.click(); } }} />
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold">Category</Label>
                <Select value={newExp.category} onValueChange={v => setNewExp(p => ({ ...p, category: v }))}>
                  <SelectTrigger className="mt-1 h-9 text-xs rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <p className="text-[10px] text-muted-foreground">💡 Press Enter to move Description → Amount → Date → Add</p>
              <Button ref={addBtnRef} onClick={addExpense} disabled={savingExpense || !newExp.description || !newExp.amount}
                className="w-full h-9 gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white">
                {savingExpense ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add Expense
              </Button>
            </div>
          </div>

          {/* Expense list */}
          <div className="bg-card border rounded-2xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm">Expenses — {selectedMonth}</h3>
              <span className="text-xs text-muted-foreground">{monthExpenseList.length} entries · Rs. {monthExpenses.toLocaleString()}</span>
            </div>
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {monthExpenseList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                  <DollarSign className="h-8 w-8 opacity-20 mb-2" />
                  <p className="text-sm">No expenses this month</p>
                </div>
              ) : monthExpenseList.map((exp, i) => (
                <motion.div key={exp.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-2 p-2.5 rounded-xl hover:bg-muted/40 group border border-transparent hover:border-muted transition-all">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{exp.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] font-bold px-1.5 py-0 rounded-full bg-muted text-muted-foreground border">{exp.category}</span>
                      <span className="text-[10px] text-muted-foreground">{exp.date}</span>
                    </div>
                  </div>
                  <span className="text-sm font-black text-red-600 shrink-0">−Rs. {Number(exp.amount).toLocaleString()}</span>
                  <button onClick={() => deleteExpense(exp.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500 p-1 rounded-lg hover:bg-red-50">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </motion.div>
              ))}
            </div>
            {monthExpenseList.length > 0 && (
              <div className="mt-3 pt-3 border-t flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Total expenses</span>
                <span className="text-sm font-black text-red-600">Rs. {monthExpenses.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      </>)}
    </div>
  );
}
