import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';

const AdminPromos = () => {
  const [promos, setPromos] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [edit, setEdit] = useState<any>({ code: '', discount_type: 'percent', discount_value: 0, min_order: 0, max_uses: null, is_active: true });

  const fetch = async () => {
    const { data } = await supabase.from('promo_codes').select('*').order('created_at', { ascending: false });
    setPromos(data || []);
  };

  useEffect(() => { fetch(); }, []);

  const save = async () => {
    if (!edit.code) { toast({ title: 'Code required', variant: 'destructive' }); return; }
    if (edit.id) {
      await supabase.from('promo_codes').update(edit).eq('id', edit.id);
    } else {
      await supabase.from('promo_codes').insert(edit);
    }
    toast({ title: 'Promo saved!' });
    setDialogOpen(false);
    fetch();
  };

  const del = async (id: string) => {
    await supabase.from('promo_codes').delete().eq('id', id);
    fetch();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Promo Codes</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Add Promo</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{edit.id ? 'Edit' : 'Add'} Promo Code</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div><Label>Code</Label><Input value={edit.code} onChange={e => setEdit((p: any) => ({ ...p, code: e.target.value.toUpperCase() }))} /></div>
              <div><Label>Type</Label>
                <Select value={edit.discount_type} onValueChange={v => setEdit((p: any) => ({ ...p, discount_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed (Rs.)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Value</Label><Input type="number" value={edit.discount_value} onChange={e => setEdit((p: any) => ({ ...p, discount_value: Number(e.target.value) }))} /></div>
              <div><Label>Min Order (Rs.)</Label><Input type="number" value={edit.min_order} onChange={e => setEdit((p: any) => ({ ...p, min_order: Number(e.target.value) }))} /></div>
              <div><Label>Max Uses</Label><Input type="number" value={edit.max_uses || ''} onChange={e => setEdit((p: any) => ({ ...p, max_uses: Number(e.target.value) || null }))} /></div>
              <label className="flex items-center gap-2"><Switch checked={edit.is_active} onCheckedChange={v => setEdit((p: any) => ({ ...p, is_active: v }))} /><span className="text-sm">Active</span></label>
              <Button onClick={save} className="w-full">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50">
            <th className="text-left p-3">Code</th>
            <th className="text-left p-3">Discount</th>
            <th className="text-left p-3">Min Order</th>
            <th className="text-left p-3">Used</th>
            <th className="text-left p-3">Status</th>
            <th className="text-left p-3">Actions</th>
          </tr></thead>
          <tbody>
            {promos.map(p => (
              <tr key={p.id} className="border-b hover:bg-accent/50">
                <td className="p-3 font-mono font-bold">{p.code}</td>
                <td className="p-3">{p.discount_value}{p.discount_type === 'percent' ? '%' : ' Rs.'}</td>
                <td className="p-3">Rs. {p.min_order}</td>
                <td className="p-3">{p.used_count}/{p.max_uses || '∞'}</td>
                <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{p.is_active ? 'Active' : 'Inactive'}</span></td>
                <td className="p-3"><Button size="icon" variant="ghost" className="text-destructive" onClick={() => del(p.id)}><Trash2 className="h-4 w-4" /></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminPromos;
