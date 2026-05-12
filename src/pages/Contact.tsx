import { Phone, Mail, MapPin, MessageCircle, Loader2, Send, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import BottomNav from '@/components/layout/BottomNav';
import PageBreadcrumb from '@/components/layout/PageBreadcrumb';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

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
      toast({
        title: 'Could not send message',
        description: needsPolicy
          ? 'Contact table not set up yet. Please try WhatsApp instead.'
          : error.message,
        variant: 'destructive',
      });
      return;
    }
    setForm({ name: '', email: '', subject: '', message: '' });
    setSent(true);
  };

  const infoItems = [
    { icon: Phone, label: 'Phone', value: contact.phone || 'N/A', href: contact.phone ? `tel:${contact.phone}` : undefined, color: 'bg-blue-50 text-blue-600' },
    { icon: MessageCircle, label: 'WhatsApp', value: contact.whatsapp || 'N/A', href: contact.whatsapp ? `https://wa.me/${contact.whatsapp.replace(/\D/g, '')}` : undefined, color: 'bg-green-50 text-green-600' },
    { icon: Mail, label: 'Email', value: contact.email || 'N/A', href: contact.email ? `mailto:${contact.email}` : undefined, color: 'bg-orange-50 text-orange-600' },
    { icon: MapPin, label: 'Address', value: contact.address || 'N/A', color: 'bg-purple-50 text-purple-600' },
  ];

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <main className="container max-w-5xl py-6 md:py-10">
        <PageBreadcrumb items={[{ label: 'Contact Us' }]} />

        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold">Contact Us</h1>
          <p className="text-muted-foreground mt-1">We're here to help — reach out anytime</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Contact Info */}
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl border p-6">
              <h2 className="font-bold text-lg mb-5">Get in Touch</h2>
              <div className="space-y-4">
                {infoItems.map(({ icon: Icon, label, value, href, color }) => (
                  <div key={label} className="flex items-center gap-4">
                    <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">{label}</p>
                      {href ? (
                        <a href={href} className="font-semibold text-sm hover:text-primary transition-colors">{value}</a>
                      ) : (
                        <p className="font-semibold text-sm">{value}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {contact.whatsapp && (
              <a
                href={`https://wa.me/${contact.whatsapp.replace(/\D/g, '')}?text=Hello! I need help with my order.`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 w-full bg-[#25D366] hover:bg-[#1ebe59] text-white font-bold py-3.5 rounded-xl transition-colors"
              >
                <MessageCircle className="h-5 w-5" />
                Chat on WhatsApp
              </a>
            )}
          </div>

          {/* Contact Form */}
          <div className="bg-card rounded-2xl border p-6 shadow-sm">
            {sent ? (
              <div className="text-center py-12 flex flex-col items-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="font-bold text-xl">Message Sent!</h3>
                <p className="text-muted-foreground text-sm mt-2 max-w-xs">We'll get back to you within 24 hours. شکریہ!</p>
                <Button className="mt-6" variant="outline" onClick={() => setSent(false)}>Send Another Message</Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h2 className="font-bold text-lg mb-2">Send Us a Message</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-medium">Your Name</Label>
                    <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Full name" required className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Email Address</Label>
                    <Input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} type="email" placeholder="your@email.com" required className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-medium">Subject</Label>
                  <Input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="How can we help you?" required className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-medium">Message</Label>
                  <Textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} placeholder="Write your message here..." required className="mt-1" rows={5} />
                </div>
                <Button type="submit" className="w-full h-11 gap-2 text-base" disabled={sending}>
                  {sending ? <><Loader2 className="h-4 w-4 animate-spin" />Sending...</> : <><Send className="h-4 w-4" /> Send Message</>}
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
