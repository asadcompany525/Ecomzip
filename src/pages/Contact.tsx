import { Phone, Mail, MapPin, MessageCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const Contact = () => {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [contact, setContact] = useState({ phone: '', email: '', whatsapp: '', address: '' });
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });

  useEffect(() => {
    supabase.from('site_settings').select('*').eq('key', 'contact').maybeSingle().then(({ data }) => {
      if (data) setContact(data.value as any);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.subject.trim() || !form.message.trim()) return;
    setSending(true);
    const { error } = await supabase.from('contact_messages' as any).insert({
      name: form.name.trim(),
      email: form.email.trim(),
      subject: form.subject.trim(),
      message: form.message.trim(),
      is_read: false,
    });
    setSending(false);
    if (error) {
      const needsPolicy = error.code === '42501' || /row-level security|permission denied/i.test(error.message || '');
      alert(needsPolicy
        ? 'Message could not be sent: contact_messages table policy is missing. Please run the latest contact_messages SQL migration in Supabase.'
        : `Message could not be sent: ${error.message}`);
      return;
    }
    setForm({ name: '', email: '', subject: '', message: '' });
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Header />
      <main className="container py-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-8">Contact Us</h1>
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <div className="bg-card rounded-2xl border p-6 space-y-6">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><Phone className="h-5 w-5 text-primary" /></div>
                <div><p className="font-semibold">Phone</p><p className="text-sm text-muted-foreground">{contact.phone || 'N/A'}</p></div>
              </div>
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><MessageCircle className="h-5 w-5 text-primary" /></div>
                <div><p className="font-semibold">WhatsApp</p>
                  <a href={`https://wa.me/${(contact.whatsapp || '').replace(/\D/g, '')}`} className="text-sm text-primary hover:underline">{contact.whatsapp || 'N/A'}</a>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><Mail className="h-5 w-5 text-primary" /></div>
                <div><p className="font-semibold">Email</p><p className="text-sm text-muted-foreground">{contact.email || 'N/A'}</p></div>
              </div>
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><MapPin className="h-5 w-5 text-primary" /></div>
                <div><p className="font-semibold">Address</p><p className="text-sm text-muted-foreground">{contact.address || 'N/A'}</p></div>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-2xl border p-6">
            {sent ? (
              <div className="text-center py-10">
                <p className="text-4xl mb-4">✅</p>
                <h3 className="font-bold text-lg">Message Sent!</h3>
                <p className="text-muted-foreground text-sm mt-2">ہم 24 گھنٹے میں جواب دیں گے۔</p>
                <Button className="mt-4" onClick={() => setSent(false)}>Send Another</Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h3 className="font-bold text-lg mb-2">ہمیں پیغام بھیجیں</h3>
                <div><Label>Name</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="آپ کا نام" required className="mt-1" /></div>
                <div><Label>Email</Label><Input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} type="email" placeholder="your@email.com" required className="mt-1" /></div>
                <div><Label>Subject</Label><Input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="کیسے مدد کر سکتے ہیں؟" required className="mt-1" /></div>
                <div><Label>Message</Label><Textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} placeholder="اپنا پیغام لکھیں..." required className="mt-1" rows={4} /></div>
                <Button type="submit" className="w-full" disabled={sending}>
                  {sending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending...</> : 'Send Message'}
                </Button>
              </form>
            )}
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default Contact;
