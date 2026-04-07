import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import Header from '@/components/layout/Header';

import BottomNav from '@/components/layout/BottomNav';

const MySettings = () => {
  const { user } = useAuth();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle().then(({ data }) => {
        if (data) { setFullName(data.full_name || ''); setPhone(data.phone || ''); setWhatsapp(data.whatsapp || ''); }
      });
    }
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from('profiles').update({ full_name: fullName, phone, whatsapp }).eq('user_id', user.id);
    toast({ title: 'Profile updated!' });
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Header />
      <main className="container py-5 max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-6">Account Settings</h1>
        <div className="bg-card rounded-xl border p-6 space-y-4">
          <div><Label>Email</Label><Input value={user?.email || ''} disabled className="mt-1 bg-muted" /></div>
          <div><Label>Full Name</Label><Input value={fullName} onChange={e => setFullName(e.target.value)} className="mt-1" /></div>
          <div><Label>Phone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="03001234567" className="mt-1" /></div>
          <div><Label>WhatsApp</Label><Input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="WhatsApp number" className="mt-1" /></div>
          <Button onClick={save} className="w-full" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
        </div>
      </main>
      
      <BottomNav />
    </div>
  );
};

export default MySettings;
