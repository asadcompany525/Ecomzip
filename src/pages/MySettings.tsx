import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Camera, Loader2, User } from 'lucide-react';
import BottomNav from '@/components/layout/BottomNav';
import { Link } from 'react-router-dom';

const MySettings = () => {
  const { user } = useAuth();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle().then(({ data }) => {
        if (data) {
          setFullName(data.full_name || '');
          setPhone(data.phone || '');
          setWhatsapp(data.whatsapp || '');
          setAvatarUrl(data.avatar_url || '');
        }
      });
    }
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingAvatar(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = `${data.publicUrl}?t=${Date.now()}`;
      await supabase.from('profiles').update({ avatar_url: url }).eq('user_id', user.id);
      setAvatarUrl(url);
      toast({ title: 'Profile photo updated!' });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    }
    setUploadingAvatar(false);
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from('profiles').update({ full_name: fullName, phone, whatsapp }).eq('user_id', user.id);
    toast({ title: 'Profile updated!' });
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-4">
      <main className="container py-5 max-w-md mx-auto">
        <div className="flex items-center gap-2 mb-1 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-primary">Home</Link>
          <span>/</span>
          <Link to="/my-page" className="hover:text-primary">My Account</Link>
          <span>/</span>
          <span className="text-foreground font-medium">Settings</span>
        </div>
        <h1 className="text-2xl font-bold mb-6">Account Settings</h1>

        <div className="bg-card rounded-xl border p-6 space-y-5">
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="h-20 w-20 rounded-full border-2 border-primary/20 overflow-hidden bg-muted flex items-center justify-center">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="h-10 w-10 text-muted-foreground" />
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 bg-primary text-white rounded-full w-7 h-7 flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors"
                disabled={uploadingAvatar}
              >
                {uploadingAvatar ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
            <p className="text-xs text-muted-foreground">Tap camera icon to change photo</p>
          </div>

          <div className="space-y-4 pt-2">
            <div><Label>Email</Label><Input value={user?.email || ''} disabled className="mt-1 bg-muted" /></div>
            <div><Label>Full Name</Label><Input value={fullName} onChange={e => setFullName(e.target.value)} className="mt-1" placeholder="Your full name" /></div>
            <div><Label>Phone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="03001234567" className="mt-1" /></div>
            <div><Label>WhatsApp</Label><Input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="WhatsApp number" className="mt-1" /></div>
            <Button onClick={save} className="w-full" disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : 'Save Changes'}
            </Button>
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default MySettings;
