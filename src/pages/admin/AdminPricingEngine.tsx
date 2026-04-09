import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Clock, Plus, Trash2, Play, Pause, DollarSign, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface HappyHour {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  discount_percent: number;
  is_active: boolean;
  days: string[];
  created_at: string;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_MAP: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0 };

export default function AdminPricingEngine() {
  const [rules, setRules] = useState<HappyHour[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<HappyHour | null>(null);
  const [currentTime, setCurrentTime] = useState('');
  const [activeRules, setActiveRules] = useState<string[]>([]);
  const [form, setForm] = useState({
    name: 'Happy Hour',
    start_time: '21:00',
    end_time: '23:59',
    discount_percent: 10,
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  });
  const timerRef = useRef<any>(null);

  const STORAGE_KEY = 'happy_hour_rules';

  const loadRules = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setRules(JSON.parse(stored));
    } catch {}
  };

  const saveRules = (updated: HappyHour[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setRules(updated);
  };

  const checkActiveRules = (ruleList: HappyHour[]) => {
    const now = new Date();
    const pktOffset = 5 * 60;
    const pktTime = new Date(now.getTime() + (pktOffset + now.getTimezoneOffset()) * 60000);
    const currentHHMM = pktTime.toTimeString().slice(0, 5);
    const currentDay = DAYS[pktTime.getDay() === 0 ? 6 : pktTime.getDay() - 1];
    setCurrentTime(currentHHMM + ' PKT');

    const active = ruleList.filter(r => {
      if (!r.is_active) return false;
      if (!r.days.includes(currentDay)) return false;
      return currentHHMM >= r.start_time && currentHHMM <= r.end_time;
    });
    setActiveRules(active.map(r => r.id));
  };

  useEffect(() => {
    loadRules();
  }, []);

  useEffect(() => {
    checkActiveRules(rules);
    timerRef.current = setInterval(() => checkActiveRules(rules), 30000);
    return () => clearInterval(timerRef.current);
  }, [rules]);

  const addRule = () => {
    if (!form.name || !form.start_time || !form.end_time || form.discount_percent <= 0) {
      toast({ title: 'Please fill all fields', variant: 'destructive' });
      return;
    }
    const newRule: HappyHour = {
      id: Date.now().toString(),
      name: form.name,
      start_time: form.start_time,
      end_time: form.end_time,
      discount_percent: form.discount_percent,
      days: form.days,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    saveRules([...rules, newRule]);
    setShowForm(false);
    toast({ title: 'Happy Hour rule created!', description: `${form.discount_percent}% off from ${form.start_time} to ${form.end_time}` });
  };

  const toggleRule = (id: string) => {
    const updated = rules.map(r => r.id === id ? { ...r, is_active: !r.is_active } : r);
    saveRules(updated);
  };

  const deleteRule = (rule: HappyHour) => {
    saveRules(rules.filter(r => r.id !== rule.id));
    setDeleteTarget(null);
    toast({ title: 'Rule deleted' });
  };

  const applyNow = async (rule: HappyHour) => {
    setLoading(true);
    try {
      const { data: products } = await supabase.from('products').select('id, price, original_price').eq('is_active', true);
      let updated = 0;
      for (const p of (products || [])) {
        const base = p.original_price || p.price;
        const newPrice = Math.round(base * (1 - rule.discount_percent / 100));
        await supabase.from('products').update({ price: newPrice }).eq('id', p.id);
        updated++;
      }
      toast({ title: `✅ Applied ${rule.discount_percent}% discount to ${updated} products!`, description: 'Prices updated in real-time.' });
    } catch (e: any) {
      toast({ title: 'Failed to apply', description: e.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  const revertPrices = async () => {
    setLoading(true);
    try {
      const { data: products } = await supabase.from('products').select('id, original_price').eq('is_active', true).not('original_price', 'is', null);
      for (const p of (products || [])) {
        await supabase.from('products').update({ price: p.original_price }).eq('id', p.id);
      }
      toast({ title: '✅ All prices reverted to original!' });
    } catch (e: any) {
      toast({ title: 'Failed to revert', description: e.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  const toggleDay = (day: string) => {
    setForm(f => ({
      ...f,
      days: f.days.includes(day) ? f.days.filter(d => d !== day) : [...f.days, day],
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><DollarSign className="h-6 w-6 text-primary" /> Dynamic Pricing Engine</h1>
          <p className="text-sm text-muted-foreground mt-1">Schedule automatic "Happy Hour" price reductions with real-time updates.</p>
          <p className="text-xs text-muted-foreground mt-0.5">Current PKT time: <strong>{currentTime}</strong></p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={revertPrices} disabled={loading}>Revert All Prices</Button>
          <Button onClick={() => setShowForm(true)} className="gap-2"><Plus className="h-4 w-4" /> New Rule</Button>
        </div>
      </div>

      {activeRules.length > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <div>
              <p className="font-medium text-green-800">{activeRules.length} Happy Hour rule(s) currently ACTIVE</p>
              <p className="text-sm text-green-700">Discounts are live right now on your store.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {rules.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium">No Happy Hour rules yet</p>
            <p className="text-sm text-muted-foreground">Create your first pricing rule to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {rules.map(rule => {
            const isActive = activeRules.includes(rule.id);
            return (
              <Card key={rule.id} className={isActive ? 'border-green-300 bg-green-50/50' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{rule.name}</h3>
                        {isActive && <Badge className="bg-green-500 text-white text-xs">● LIVE NOW</Badge>}
                        {!rule.is_active && <Badge variant="secondary" className="text-xs">Disabled</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        <Clock className="h-3.5 w-3.5 inline mr-1" />
                        {rule.start_time} – {rule.end_time} &nbsp;·&nbsp; <strong>{rule.discount_percent}% off</strong>
                      </p>
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {DAYS.map(d => (
                          <Badge key={d} variant={rule.days.includes(d) ? 'default' : 'outline'} className="text-xs px-1.5 py-0.5">
                            {d}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={rule.is_active} onCheckedChange={() => toggleRule(rule.id)} />
                      <Button size="sm" variant="outline" onClick={() => applyNow(rule)} disabled={loading} className="gap-1 text-xs">
                        <Play className="h-3 w-3" /> Apply Now
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(rule)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create Happy Hour Rule</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Rule Name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Evening Special" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Time</Label>
                <Input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
              </div>
              <div>
                <Label>End Time</Label>
                <Input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Discount Percent</Label>
              <Input type="number" min="1" max="90" value={form.discount_percent} onChange={e => setForm(f => ({ ...f, discount_percent: Number(e.target.value) }))} />
            </div>
            <div>
              <Label className="mb-2 block">Days</Label>
              <div className="flex gap-2 flex-wrap">
                {DAYS.map(d => (
                  <button key={d} type="button" onClick={() => toggleDay(d)}
                    className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${form.days.includes(d) ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={addRule}>Create Rule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Rule?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to delete "<strong>{deleteTarget?.name}</strong>"? This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteTarget && deleteRule(deleteTarget)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
