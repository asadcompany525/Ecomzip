import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2, Upload } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

const AdminCategories = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [edit, setEdit] = useState<any>({ name: '', slug: '', icon: '', image_url: '', parent_id: null, level: 1 });

  const fetchCats = async () => {
    const { data } = await supabase.from('categories').select('*').order('level').order('sort_order');
    setCategories(data || []);
  };

  useEffect(() => { fetchCats(); }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const path = `categories/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('products').upload(path, file);
    if (!error) {
      const { data } = supabase.storage.from('products').getPublicUrl(path);
      setEdit((p: any) => ({ ...p, image_url: data.publicUrl }));
    }
  };

  const save = async () => {
    if (!edit.name) { toast({ title: 'Name required', variant: 'destructive' }); return; }
    const slug = edit.slug || edit.name.toLowerCase().replace(/\s+/g, '-');
    const data = { ...edit, slug, icon: null };
    if (edit.id) {
      await supabase.from('categories').update(data).eq('id', edit.id);
    } else {
      await supabase.from('categories').insert(data);
    }
    toast({ title: 'Category saved!' });
    setDialogOpen(false);
    setEdit({ name: '', slug: '', icon: '', image_url: '', parent_id: null, level: 1 });
    fetchCats();
  };

  const del = async (id: string) => {
    if (!confirm('Delete?')) return;
    await supabase.from('categories').delete().eq('id', id);
    toast({ title: 'Deleted' });
    fetchCats();
  };

  const level1 = categories.filter(c => c.level === 1);
  const level2 = categories.filter(c => c.level === 2);
  const getParentName = (parentId: string | null) => categories.find(c => c.id === parentId)?.name || '-';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-100 rounded-xl"><Edit className="h-5 w-5 text-teal-600" /></div>
          <div>
            <h2 className="text-xl font-bold">Categories</h2>
            <p className="text-sm text-muted-foreground">{categories.length} categories · 3-level hierarchy</p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEdit({ name: '', slug: '', icon: '', image_url: '', parent_id: null, level: 1 })}>
              <Plus className="h-4 w-4 mr-2" /> Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{edit.id ? 'Edit' : 'Add'} Category</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>Level</Label>
                <Select value={String(edit.level)} onValueChange={v => setEdit((e: any) => ({ ...e, level: Number(v), parent_id: null }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Main Category</SelectItem>
                    <SelectItem value="2">Sub Category</SelectItem>
                    <SelectItem value="3">Sub-Sub Category</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {edit.level > 1 && (
                <div>
                  <Label>Parent</Label>
                  <Select value={edit.parent_id || ''} onValueChange={v => setEdit((e: any) => ({ ...e, parent_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select parent" /></SelectTrigger>
                    <SelectContent>
                      {(edit.level === 2 ? level1 : level2).map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div><Label>Name</Label><Input value={edit.name} onChange={e => setEdit((p: any) => ({ ...p, name: e.target.value }))} /></div>
              <div>
                <Label>Image (optional)</Label>
                <div className="flex gap-2 items-center">
                  <label className="cursor-pointer border-2 border-dashed rounded-lg px-4 py-2 text-sm flex items-center gap-2 hover:bg-accent">
                    <Upload className="h-4 w-4" /> Upload
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                  {edit.image_url && <img src={edit.image_url} alt="" className="h-12 w-12 object-cover rounded" />}
                </div>
              </div>
              <Button onClick={save} className="w-full">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/40">
            <th className="text-left p-3 text-xs font-semibold">Name</th>
            <th className="text-left p-3 text-xs font-semibold">Level</th>
            <th className="text-left p-3 text-xs font-semibold">Parent</th>
            <th className="text-left p-3 text-xs font-semibold">Actions</th>
          </tr></thead>
          <tbody>
            {categories.map(c => (
              <tr key={c.id} className="border-b hover:bg-muted/30 transition-colors">
                <td className="p-3 font-medium" style={{ paddingLeft: `${(c.level - 1) * 24 + 12}px` }}>
                  {c.image_url && <img src={c.image_url} alt="" className="w-6 h-6 rounded inline mr-2 object-cover" />}
                  {c.name}
                </td>
                <td className="p-3">L{c.level}</td>
                <td className="p-3 text-muted-foreground">{getParentName(c.parent_id)}</td>
                <td className="p-3">
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setEdit(c); setDialogOpen(true); }}><Edit className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => del(c.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminCategories;
