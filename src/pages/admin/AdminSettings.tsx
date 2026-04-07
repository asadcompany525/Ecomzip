import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const AdminSettings = () => {
  const [contact, setContact] = useState({ phone: '', email: '', whatsapp: '', address: '' });
  const [delivery, setDelivery] = useState({ free_delivery_min: 0, default_fee: 200, express_fee: 400 });
  const [social, setSocial] = useState({ facebook: '', instagram: '', tiktok: '' });
  const [logo, setLogo] = useState({ url: '/favicon.ico', name: 'Stopy Shoes', size: 'h-8 w-8' });
  const [helpPage, setHelpPage] = useState({ title: 'Help & Support', content: '', phone: '', email: '', whatsapp: '' });
  const [developerPage, setDeveloperPage] = useState({ name: 'ASDEVOLPER', logo: '', phone: '', email: '', description: '' });
  const [returnPolicy, setReturnPolicy] = useState({ title: 'Return Policy', content: '', days: 7 });
  const [faqPage, setFaqPage] = useState({ title: 'FAQs', items: '[]' });
  const [adminCreds, setAdminCreds] = useState({ email: '', password: '' });
  const [receipt, setReceipt] = useState<any>({ 
    shop_name: 'STOPY SHOES', tagline: "Pakistan's #1 Shoes & Bags Store",
    contact_line: 'support@stopyshoes.pk | +92 300 1234567',
    footer_line: 'Thank you for shopping with Stopy Shoes!',
    website: 'www.stopyshoes.pk',
    links: [] as { label: string; url: string }[],
  });

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('site_settings').select('*');
      (data || []).forEach((s: any) => {
        if (s.key === 'contact') setContact(s.value);
        if (s.key === 'delivery') setDelivery(s.value);
        if (s.key === 'social') setSocial(s.value);
        if (s.key === 'logo') setLogo(s.value);
        if (s.key === 'help_page') setHelpPage(s.value);
        if (s.key === 'developer_page') setDeveloperPage(s.value);
        if (s.key === 'return_policy') setReturnPolicy(s.value);
        if (s.key === 'faq_page') setFaqPage(s.value);
        if (s.key === 'receipt') setReceipt(s.value);
      });
    };
    load();
  }, []);

  const save = async (key: string, value: any) => {
    const { data: existing } = await supabase.from('site_settings').select('id').eq('key', key).maybeSingle();
    if (existing) {
      await supabase.from('site_settings').update({ value }).eq('key', key);
    } else {
      await supabase.from('site_settings').insert({ key, value });
    }
    toast({ title: `${key} settings saved!` });
  };

  const updateAdminPassword = async () => {
    if (!adminCreds.email || !adminCreds.password) {
      toast({ title: 'Email and password required', variant: 'destructive' });
      return;
    }
    const res = await supabase.functions.invoke('admin-login', {
      body: { username: adminCreds.email, password: adminCreds.password, action: 'update_credentials' }
    });
    if (res.error) toast({ title: 'Failed to update credentials', variant: 'destructive' });
    else toast({ title: 'Admin credentials updated!' });
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Site Settings</h1>
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="w-full flex-wrap h-auto gap-1 mb-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="delivery">Delivery</TabsTrigger>
          <TabsTrigger value="social">Social</TabsTrigger>
          <TabsTrigger value="receipt">Receipt</TabsTrigger>
          <TabsTrigger value="pages">Pages</TabsTrigger>
          <TabsTrigger value="admin">Admin</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Logo & Branding</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Site Name</Label><Input value={logo.name} onChange={e => setLogo(p => ({ ...p, name: e.target.value }))} /></div>
              <div><Label>Logo URL</Label><Input value={logo.url} onChange={e => setLogo(p => ({ ...p, url: e.target.value }))} /></div>
              <div><Label>Logo Size</Label><Input value={logo.size} onChange={e => setLogo(p => ({ ...p, size: e.target.value }))} placeholder="h-10 w-10" /></div>
              {logo.url && <img src={logo.url} alt="Preview" className="h-16 w-16 object-contain border rounded" />}
              <Button onClick={() => save('logo', logo)}>Save Logo</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Contact Info (Contact Us page بھی یہاں سے آتی ہے)</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Phone</Label><Input value={contact.phone} onChange={e => setContact(p => ({ ...p, phone: e.target.value }))} /></div>
              <div><Label>Email</Label><Input value={contact.email} onChange={e => setContact(p => ({ ...p, email: e.target.value }))} /></div>
              <div><Label>WhatsApp</Label><Input value={contact.whatsapp} onChange={e => setContact(p => ({ ...p, whatsapp: e.target.value }))} /></div>
              <div><Label>Address</Label><Input value={contact.address} onChange={e => setContact(p => ({ ...p, address: e.target.value }))} /></div>
              <Button onClick={() => save('contact', contact)}>Save Contact</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delivery" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Delivery Fees</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Free Delivery Min (Rs.)</Label><Input type="number" value={delivery.free_delivery_min} onChange={e => setDelivery(p => ({ ...p, free_delivery_min: Number(e.target.value) }))} /></div>
              <div><Label>Default Fee (Rs.)</Label><Input type="number" value={delivery.default_fee} onChange={e => setDelivery(p => ({ ...p, default_fee: Number(e.target.value) }))} /></div>
              <div><Label>Express Fee (Rs.)</Label><Input type="number" value={delivery.express_fee} onChange={e => setDelivery(p => ({ ...p, express_fee: Number(e.target.value) }))} /></div>
              <Button onClick={() => save('delivery', delivery)}>Save Delivery</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="social" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Social Links</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Facebook</Label><Input value={social.facebook} onChange={e => setSocial(p => ({ ...p, facebook: e.target.value }))} /></div>
              <div><Label>Instagram</Label><Input value={social.instagram} onChange={e => setSocial(p => ({ ...p, instagram: e.target.value }))} /></div>
              <div><Label>TikTok</Label><Input value={social.tiktok} onChange={e => setSocial(p => ({ ...p, tiktok: e.target.value }))} /></div>
              <Button onClick={() => save('social', social)}>Save Social</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receipt" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>🧾 Receipt / Shipping Slip</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Shop Name</Label><Input value={receipt.shop_name} onChange={e => setReceipt(p => ({ ...p, shop_name: e.target.value }))} /></div>
              <div><Label>Tagline</Label><Input value={receipt.tagline} onChange={e => setReceipt(p => ({ ...p, tagline: e.target.value }))} /></div>
              <div><Label>Contact Line</Label><Input value={receipt.contact_line} onChange={e => setReceipt(p => ({ ...p, contact_line: e.target.value }))} /></div>
              <div><Label>Footer Line</Label><Input value={receipt.footer_line} onChange={e => setReceipt(p => ({ ...p, footer_line: e.target.value }))} /></div>
              <div><Label>Website</Label><Input value={receipt.website} onChange={e => setReceipt((p: any) => ({ ...p, website: e.target.value }))} /></div>
              
              {/* Links */}
              <div>
                <Label>Footer Links (unlimited)</Label>
                {(receipt.links || []).map((link: any, i: number) => (
                  <div key={i} className="flex gap-2 mt-1">
                    <Input value={link.label} placeholder="Label" onChange={e => {
                      const links = [...(receipt.links || [])];
                      links[i] = { ...links[i], label: e.target.value };
                      setReceipt((p: any) => ({ ...p, links }));
                    }} />
                    <Input value={link.url} placeholder="URL" onChange={e => {
                      const links = [...(receipt.links || [])];
                      links[i] = { ...links[i], url: e.target.value };
                      setReceipt((p: any) => ({ ...p, links }));
                    }} />
                    <Button variant="ghost" size="sm" onClick={() => {
                      const links = (receipt.links || []).filter((_: any, j: number) => j !== i);
                      setReceipt((p: any) => ({ ...p, links }));
                    }}>✕</Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="mt-2" onClick={() => setReceipt((p: any) => ({ ...p, links: [...(p.links || []), { label: '', url: '' }] }))}>+ Add Link</Button>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg text-center text-sm border">
                <img src="/favicon.ico" alt="Logo" className="h-8 w-8 mx-auto mb-1" />
                <p className="font-bold text-base">{receipt.shop_name}</p>
                <p className="text-xs text-muted-foreground">{receipt.tagline}</p>
                <p className="text-xs text-muted-foreground">{receipt.contact_line}</p>
                <hr className="my-2 border-dashed" />
                <p className="text-xs">{receipt.footer_line}</p>
                <p className="text-xs text-muted-foreground">{receipt.website}</p>
                {(receipt.links || []).map((link: any, i: number) => (
                  <p key={i} className="text-xs text-primary">{link.label}: {link.url}</p>
                ))}
              </div>
              <Button onClick={() => save('receipt', receipt)}>Save Receipt Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pages" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Help & Support</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Title</Label><Input value={helpPage.title} onChange={e => setHelpPage(p => ({ ...p, title: e.target.value }))} /></div>
              <div><Label>Phone</Label><Input value={helpPage.phone} onChange={e => setHelpPage(p => ({ ...p, phone: e.target.value }))} /></div>
              <div><Label>Email</Label><Input value={helpPage.email} onChange={e => setHelpPage(p => ({ ...p, email: e.target.value }))} /></div>
              <div><Label>WhatsApp</Label><Input value={helpPage.whatsapp} onChange={e => setHelpPage(p => ({ ...p, whatsapp: e.target.value }))} /></div>
              <div><Label>Content</Label><Textarea rows={6} value={helpPage.content} onChange={e => setHelpPage(p => ({ ...p, content: e.target.value }))} /></div>
              <Button onClick={() => save('help_page', helpPage)}>Save Help Page</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Developer Page</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Name</Label><Input value={developerPage.name} onChange={e => setDeveloperPage(p => ({ ...p, name: e.target.value }))} /></div>
              <div><Label>Logo URL</Label><Input value={developerPage.logo} onChange={e => setDeveloperPage(p => ({ ...p, logo: e.target.value }))} /></div>
              <div><Label>Phone</Label><Input value={developerPage.phone} onChange={e => setDeveloperPage(p => ({ ...p, phone: e.target.value }))} /></div>
              <div><Label>Email</Label><Input value={developerPage.email} onChange={e => setDeveloperPage(p => ({ ...p, email: e.target.value }))} /></div>
              <div><Label>Description</Label><Textarea rows={6} value={developerPage.description} onChange={e => setDeveloperPage(p => ({ ...p, description: e.target.value }))} /></div>
              <Button onClick={() => save('developer_page', developerPage)}>Save Developer Page</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Return Policy</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Title</Label><Input value={returnPolicy.title} onChange={e => setReturnPolicy(p => ({ ...p, title: e.target.value }))} /></div>
              <div><Label>Return Days</Label><Input type="number" value={returnPolicy.days} onChange={e => setReturnPolicy(p => ({ ...p, days: Number(e.target.value) }))} /></div>
              <div><Label>Content</Label><Textarea rows={8} value={returnPolicy.content} onChange={e => setReturnPolicy(p => ({ ...p, content: e.target.value }))} /></div>
              <Button onClick={() => save('return_policy', returnPolicy)}>Save Return Policy</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admin" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Admin Login Credentials</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">ایڈمن لاگ ان ای میل اور پاس ورڈ تبدیل کریں</p>
              <div><Label>New Email</Label><Input type="email" value={adminCreds.email} onChange={e => setAdminCreds(p => ({ ...p, email: e.target.value }))} /></div>
              <div><Label>New Password</Label><Input type="password" value={adminCreds.password} onChange={e => setAdminCreds(p => ({ ...p, password: e.target.value }))} /></div>
              <Button onClick={updateAdminPassword} variant="destructive">Update Admin Credentials</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSettings;
