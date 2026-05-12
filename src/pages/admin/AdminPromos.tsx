import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Ticket, Copy, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

const AdminPromos = () => {
  const [promos, setPromos] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [edit, setEdit] = useState<any>({ code: '', discount_type: 'percent', discount_value: 0, min_order: 0, max_uses: null, is_active: true });

  const fetchPromos = async () => {
    const { data } = await supabase.from('promo_codes').select('*').order('created_at', { ascending: false });
    setPromos(data || []);
  };

  useEffect(() => { fetchPromos(); }, []);

  const save = async () => {
    if (!edit.code) { toast({ title: 'Code required', variant: 'destructive' }); return; }
    if (edit.id) {
      await supabase.from('promo_codes').update(edit).eq('id', edit.id);
    } else {
      await supabase.from('promo_codes').insert(edit);
    }
    toast({ title: `Promo ${edit.id ? 'updated' : 'created'}!` });
    setDialogOpen(false);
    setEdit({ code: '', discount_type: 'percent', discount_value: 0, min_order: 0, max_uses: null, is_active: true });
    fetchPromos();
  };

  const del = async (id: string) => {
    if (!confirm('Delete this promo code?')) return;
    await supabase.from('promo_codes').delete().eq('id', id);
    toast({ title: 'Promo deleted' });
    setPromos(prev => prev.filter(p => p.id !== id));
  };

  const toggleActive = async (promo: any) => {
    await supabase.from('promo_codes').update({ is_active: !promo.is_active }).eq('id', promo.id);
    setPromos(prev => prev.map(p => p.id === promo.id ? { ...p, is_active: !p.is_active } : p));
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(code);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const activeCount = promos.filter(p => p.is_active).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-100 rounded-xl"><Ticket className="h-5 w-5 text-violet-600" /></div>
          <div>
            <h2 className="text-xl font-bold">Promo Codes</h2>
            <p className="text-sm text-muted-foreground">{activeCount} active · {promos.length} total</p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={v => { setDialogOpen(v); if (!v) setEdit({ code: '', discount_type: 'percent', discount_value: 0, min_order: 0, max_uses: null, is_active: true }); }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Add Promo</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{edit.id ? 'Edit' : 'Create'} Promo Code</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Code</Label>
                <Input
                  value={edit.code}
                  onChange={e => setEdit((p: any) => ({ ...p, code: e.target.value.toUpperCase() }))}
                  placeholder="SAVE20"
                  className="mt-1 font-mono uppercase"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Discount Type</Label>
                  <Select value={edit.discount_type} onValueChange={v => setEdit((p: any) => ({ ...p, discount_type: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed (Rs.)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Value ({edit.discount_type === 'percent' ? '%' : 'Rs.'})</Label>
                  <Input type="number" value={edit.discount_value} onChange={e => setEdit((p: any) => ({ ...p, discount_value: Number(e.target.value) }))} className="mt-1" min="0" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Min Order (Rs.)</Label>
                  <Input type="number" value={edit.min_order} onChange={e => setEdit((p: any) => ({ ...p, min_order: Number(e.target.value) }))} className="mt-1" min="0" />
                </div>
                <div>
                  <Label>Max Uses (blank = unlimited)</Label>
                  <Input type="number" value={edit.max_uses ?? ''} onChange={e => setEdit((p: any) => ({ ...p, max_uses: e.target.value ? Number(e.target.value) : null }))} className="mt-1" min="1" placeholder="∞" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={edit.is_active} onCheckedChange={v => setEdit((p: any) => ({ ...p, is_active: v }))} />
                <Label>Active</Label>
              </div>
              <Button onClick={save} className="w-full">{edit.id ? 'Update' : 'Create'} Promo</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {promos.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border">
          <Ticket className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="font-medium">No promo codes yet</p>
          <p className="text-sm text-muted-foreground mt-1">Create your first promo code to offer discounts</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {promos.map(p => (
            <div key={p.id} className={`bg-card border rounded-xl p-4 relative overflow-hidden transition-all ${!p.is_active ? 'opacity-60' : ''}`}>
              {/* Background accent */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -translate-y-8 translate-x-8 pointer-events-none" />

              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <code className="text-base font-black text-primary tracking-wide truncate">{p.code}</code>
                  <button
                    onClick={() => copyCode(p.code)}
                    className="shrink-0 p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    title="Copy code"
                  >
                    {copied === p.code ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <Switch checked={p.is_active} onCheckedChange={() => toggleActive(p)} />
              </div>

              <div className="space-y-1.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Discount</span>
                  <Badge className="bg-violet-100 text-violet-800 border-0 font-bold">
                    {p.discount_type === 'percent' ? `${p.discount_value}% OFF` : `Rs. ${p.discount_value} OFF`}
                  </Badge>
                </div>
                {p.min_order > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Min Order</span>
                    <span className="font-medium">Rs. {Number(p.min_order).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Uses</span>
                  <span className="font-medium">{p.used_count || 0} / {p.max_uses ?? '∞'}</span>
                </div>
              </div>

              <div className="flex gap-2 mt-3 pt-3 border-t">
                <Button
                  size="sm" variant="outline" className="flex-1 h-7 text-xs"
                  onClick={() => { setEdit(p); setDialogOpen(true); }}
                >
                  Edit
                </Button>
                <Button
                  size="sm" variant="destructive" className="h-7 w-7 p-0"
                  onClick={() => del(p.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminPromos;
