import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Upload, Image as ImageIcon, Edit, Eye, EyeOff } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

const AdminBanners = () => {
  const [banners, setBanners] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [edit, setEdit] = useState<any>({ title: '', subtitle: '', image_url: '', video_url: '', link: '', is_active: true });
  const [uploading, setUploading] = useState(false);

  const fetchBanners = async () => {
    const { data } = await supabase.from('banners').select('*').order('sort_order');
    setBanners(data || []);
  };

  useEffect(() => { fetchBanners(); }, []);

  const uploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const path = `${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('banners').upload(path, file);
    if (!error) {
      const { data } = supabase.storage.from('banners').getPublicUrl(path);
      setEdit((p: any) => ({ ...p, image_url: data.publicUrl }));
      toast({ title: 'Image uploaded!' });
    } else {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    }
    setUploading(false);
  };

  const save = async () => {
    if (!edit.image_url) { toast({ title: 'Image required', variant: 'destructive' }); return; }
    if (edit.id) {
      await supabase.from('banners').update(edit).eq('id', edit.id);
    } else {
      await supabase.from('banners').insert({ ...edit, sort_order: banners.length });
    }
    toast({ title: `Banner ${edit.id ? 'updated' : 'created'}!` });
    setDialogOpen(false);
    setEdit({ title: '', subtitle: '', image_url: '', video_url: '', link: '', is_active: true });
    fetchBanners();
  };

  const del = async (id: string) => {
    if (!confirm('Delete banner?')) return;
    await supabase.from('banners').delete().eq('id', id);
    toast({ title: 'Banner deleted' });
    setBanners(prev => prev.filter(b => b.id !== id));
  };

  const toggleActive = async (banner: any) => {
    await supabase.from('banners').update({ is_active: !banner.is_active }).eq('id', banner.id);
    setBanners(prev => prev.map(b => b.id === banner.id ? { ...b, is_active: !b.is_active } : b));
  };

  const activeCount = banners.filter(b => b.is_active).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-xl"><ImageIcon className="h-5 w-5 text-blue-600" /></div>
          <div>
            <h2 className="text-xl font-bold">Banners</h2>
            <p className="text-sm text-muted-foreground">{activeCount} active · {banners.length} total</p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={v => { setDialogOpen(v); if (!v) setEdit({ title: '', subtitle: '', image_url: '', video_url: '', link: '', is_active: true }); }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Add Banner</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{edit.id ? 'Edit' : 'Create'} Banner</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div><Label>Title</Label><Input value={edit.title || ''} onChange={e => setEdit((p: any) => ({ ...p, title: e.target.value }))} placeholder="Banner headline..." className="mt-1" /></div>
              <div><Label>Subtitle</Label><Input value={edit.subtitle || ''} onChange={e => setEdit((p: any) => ({ ...p, subtitle: e.target.value }))} placeholder="Short description..." className="mt-1" /></div>
              <div><Label>Link URL</Label><Input value={edit.link || ''} onChange={e => setEdit((p: any) => ({ ...p, link: e.target.value }))} placeholder="/products or /flash-sale" className="mt-1" /></div>
              <div>
                <Label>Banner Image</Label>
                {edit.image_url && (
                  <img src={edit.image_url} alt="" className="w-full h-32 object-cover rounded-xl mt-2 border" />
                )}
                <label className="mt-2 flex items-center gap-2 cursor-pointer">
                  <Button variant="outline" size="sm" asChild disabled={uploading}>
                    <span><Upload className="h-4 w-4 mr-1" />{uploading ? 'Uploading...' : 'Upload Image'}</span>
                  </Button>
                  <input type="file" accept="image/*,video/*" className="hidden" onChange={uploadImage} />
                  {edit.image_url && <span className="text-xs text-emerald-600 font-medium">✓ Image ready</span>}
                </label>
              </div>
              <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
                <Switch checked={edit.is_active} onCheckedChange={v => setEdit((p: any) => ({ ...p, is_active: v }))} />
                <Label>Show on homepage</Label>
              </div>
              <Button onClick={save} className="w-full h-11">Save Banner</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {banners.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border">
          <ImageIcon className="h-14 w-14 mx-auto mb-3 text-muted-foreground/30" />
          <p className="font-medium">No banners yet</p>
          <p className="text-sm text-muted-foreground mt-1">Add a banner to display on the homepage slideshow</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {banners.map(b => (
            <div key={b.id} className={`bg-card rounded-xl border overflow-hidden transition-all hover:shadow-md ${!b.is_active ? 'opacity-60' : ''}`}>
              <div className="relative">
                {b.image_url ? (
                  <img src={b.image_url} alt={b.title} className="w-full h-44 object-cover" />
                ) : (
                  <div className="w-full h-44 bg-muted flex items-center justify-center">
                    <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <Badge className={b.is_active ? 'bg-emerald-500 text-white border-0' : 'bg-gray-500 text-white border-0'}>
                    {b.is_active ? 'Live' : 'Hidden'}
                  </Badge>
                </div>
              </div>
              <div className="p-3">
                <p className="font-semibold text-sm line-clamp-1">{b.title || 'Untitled'}</p>
                {b.subtitle && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{b.subtitle}</p>}
                {b.link && <p className="text-xs text-primary mt-1 truncate">→ {b.link}</p>}
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" className="flex-1 h-7 text-xs gap-1"
                    onClick={() => { setEdit(b); setDialogOpen(true); }}>
                    <Edit className="h-3 w-3" /> Edit
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 w-8 p-0"
                    onClick={() => toggleActive(b)} title={b.is_active ? 'Hide banner' : 'Show banner'}>
                    {b.is_active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                  <Button size="sm" variant="destructive" className="h-7 w-8 p-0" onClick={() => del(b.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminBanners;
