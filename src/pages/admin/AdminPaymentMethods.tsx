import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

const AdminPaymentMethods = () => {
  const [methods, setMethods] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ id: '', name: '', type: 'bank_transfer', account_name: '', account_number: '', additional_info: '', is_active: true });

  const fetch = async () => {
    const { data } = await supabase.from('payment_methods').select('*').order('sort_order');
    setMethods(data || []);
  };

  useEffect(() => { fetch(); }, []);

  const save = async () => {
    if (!form.name) { toast({ title: 'Name required', variant: 'destructive' }); return; }
    const data = { name: form.name, type: form.type, account_name: form.account_name || null, account_number: form.account_number || null, additional_info: form.additional_info || null, is_active: form.is_active };
    if (form.id) {
      await supabase.from('payment_methods').update(data).eq('id', form.id);
    } else {
      await supabase.from('payment_methods').insert(data);
    }
    toast({ title: 'Payment method saved!' });
    setDialogOpen(false);
    setForm({ id: '', name: '', type: 'bank_transfer', account_name: '', account_number: '', additional_info: '', is_active: true });
    fetch();
  };

  const del = async (id: string) => {
    if (!confirm('Delete this payment method?')) return;
    await supabase.from('payment_methods').delete().eq('id', id);
    toast({ title: 'Deleted' }); fetch();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 rounded-xl"><Plus className="h-5 w-5 text-emerald-600" /></div>
          <div>
            <h2 className="text-xl font-bold">Payment Methods</h2>
            <p className="text-sm text-muted-foreground">{methods.length} methods · {methods.filter(m => m.is_active).length} active</p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setForm({ id: '', name: '', type: 'bank_transfer', account_name: '', account_number: '', additional_info: '', is_active: true })}>
              <Plus className="h-4 w-4 mr-2" /> Add Method
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{form.id ? 'Edit' : 'Add'} Payment Method</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div><Label>Method Name</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. JazzCash, Bank Account" /></div>
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">🏦 Bank Transfer</SelectItem>
                    <SelectItem value="jazzcash">📱 JazzCash</SelectItem>
                    <SelectItem value="easypaisa">📱 EasyPaisa</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Account Holder Name</Label><Input value={form.account_name} onChange={e => setForm(p => ({ ...p, account_name: e.target.value }))} placeholder="Account holder name" /></div>
              <div><Label>Account Number / IBAN</Label><Input value={form.account_number} onChange={e => setForm(p => ({ ...p, account_number: e.target.value }))} placeholder="Account number" /></div>
              <div><Label>Additional Info (Branch, notes)</Label><Textarea value={form.additional_info} onChange={e => setForm(p => ({ ...p, additional_info: e.target.value }))} rows={2} /></div>
              <label className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} />
                <span className="text-sm">Active</span>
              </label>
              <Button onClick={save} className="w-full">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        {methods.map(m => (
          <div key={m.id} className={`bg-card border rounded-xl p-4 flex items-center gap-4 hover:shadow-sm transition-shadow ${!m.is_active ? 'opacity-60' : ''}`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${
              m.type === 'jazzcash' ? 'bg-red-100' : m.type === 'easypaisa' ? 'bg-green-100' : 'bg-blue-100'
            }`}>
              {m.type === 'jazzcash' ? '📱' : m.type === 'easypaisa' ? '📱' : '🏦'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold truncate">{m.name}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {m.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              {m.account_name && <p className="text-sm text-muted-foreground mt-0.5">👤 {m.account_name}</p>}
              {m.account_number && <p className="text-sm font-mono text-muted-foreground">🔢 {m.account_number}</p>}
              {m.additional_info && <p className="text-xs text-muted-foreground mt-0.5">{m.additional_info}</p>}
            </div>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" onClick={() => { setForm({ id: m.id, name: m.name, type: m.type, account_name: m.account_name || '', account_number: m.account_number || '', additional_info: m.additional_info || '', is_active: m.is_active }); setDialogOpen(true); }}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="text-destructive" onClick={() => del(m.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        {methods.length === 0 && <p className="text-center text-muted-foreground p-8">No payment methods added yet</p>}
      </div>
    </div>
  );
};

export default AdminPaymentMethods;
