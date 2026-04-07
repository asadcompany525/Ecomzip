import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Upload } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
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
    }
    setUploading(false);
  };

  const save = async () => {
    if (!edit.image_url) { toast({ title: 'Image required', variant: 'destructive' }); return; }
    if (edit.id) {
      await supabase.from('banners').update(edit).eq('id', edit.id);
    } else {
      await supabase.from('banners').insert(edit);
    }
    toast({ title: 'Banner saved!' });
    setDialogOpen(false);
    fetchBanners();
  };

  const del = async (id: string) => {
    if (!confirm('Delete banner?')) return;
    await supabase.from('banners').delete().eq('id', id);
    fetchBanners();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Banners</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEdit({ title: '', subtitle: '', image_url: '', video_url: '', link: '', is_active: true })}>
              <Plus className="h-4 w-4 mr-2" /> Add Banner
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{edit.id ? 'Edit' : 'Add'} Banner</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div><Label>Title</Label><Input value={edit.title || ''} onChange={e => setEdit((p: any) => ({ ...p, title: e.target.value }))} /></div>
              <div><Label>Subtitle</Label><Input value={edit.subtitle || ''} onChange={e => setEdit((p: any) => ({ ...p, subtitle: e.target.value }))} /></div>
              <div><Label>Link</Label><Input value={edit.link || ''} onChange={e => setEdit((p: any) => ({ ...p, link: e.target.value }))} /></div>
              <div><Label>Video URL</Label><Input value={edit.video_url || ''} onChange={e => setEdit((p: any) => ({ ...p, video_url: e.target.value }))} placeholder="Optional YouTube/video URL" /></div>
              <div>
                <Label>Banner Image</Label>
                {edit.image_url && <img src={edit.image_url} alt="" className="w-full h-32 object-cover rounded-lg mt-2" />}
                <label className="mt-2 flex items-center gap-2 cursor-pointer">
                  <Button variant="outline" size="sm" asChild><span><Upload className="h-4 w-4 mr-1" />{uploading ? 'Uploading...' : 'Upload'}</span></Button>
                  <input type="file" accept="image/*,video/*" className="hidden" onChange={uploadImage} />
                </label>
              </div>
              <label className="flex items-center gap-2">
                <Switch checked={edit.is_active} onCheckedChange={v => setEdit((p: any) => ({ ...p, is_active: v }))} />
                <span className="text-sm">Active</span>
              </label>
              <Button onClick={save} className="w-full">Save Banner</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {banners.map(b => (
          <div key={b.id} className="bg-card rounded-xl border overflow-hidden">
            <img src={b.image_url} alt={b.title} className="w-full h-40 object-cover" />
            <div className="p-3 flex items-center justify-between">
              <div>
                <p className="font-medium">{b.title || 'Untitled'}</p>
                <p className="text-xs text-muted-foreground">{b.is_active ? 'Active' : 'Inactive'}</p>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => { setEdit(b); setDialogOpen(true); }}>✏️</Button>
                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => del(b.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminBanners;
