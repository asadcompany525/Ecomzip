import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Trash2, Loader2, Upload, Bot, Eye, EyeOff, CheckCircle, XCircle, Zap } from 'lucide-react';
import { invalidateStoreSettingsCache } from '@/hooks/useStoreSettings';
import { ensureAdminSession } from '@/lib/adminSession';

const AdminSettings = () => {
  const [contact, setContact] = useState({ phone: '', email: '', whatsapp: '', address: '' });
  const [social, setSocial] = useState({ facebook: '', instagram: '', tiktok: '' });
  const [logo, setLogo] = useState({ url: '/favicon.ico', name: '', size: 'h-8 w-8' });
  const [siteTitle, setSiteTitle] = useState('');
  const [helpPage, setHelpPage] = useState({ title: 'Help & Support', content: '', phone: '', email: '', whatsapp: '' });
  const [returnPolicy, setReturnPolicy] = useState({ title: 'Return Policy', content: '', days: 7 });
  const [faqPage, setFaqPage] = useState({ title: 'FAQs', items: '[]' });
  const [adminCreds, setAdminCreds] = useState({ email: '', password: '' });
  const [geminiKey, setGeminiKey] = useState('');
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [savingAi, setSavingAi] = useState(false);
  const [keySaved, setKeySaved] = useState(false);
  const [testingKey, setTestingKey] = useState(false);
  const [keyTestResult, setKeyTestResult] = useState<'ok' | 'fail' | null>(null);
  const [resetting, setResetting] = useState(false);
  const [resetConfirm, setResetConfirm] = useState('');
  const [faviconUploading, setFaviconUploading] = useState(false);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  const [receipt, setReceipt] = useState<any>({ 
    shop_name: '', tagline: "Pakistan's #1 Shoes & Bags Store",
    contact_line: '',
    footer_line: '',
    website: '',
    links: [] as { label: string; url: string }[],
  });

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('site_settings').select('*');
      (data || []).forEach((s: any) => {
        if (s.key === 'contact') setContact(s.value);
        if (s.key === 'social') setSocial(s.value);
        if (s.key === 'logo') setLogo(s.value);
        if (s.key === 'help_page') setHelpPage(s.value);
        if (s.key === 'return_policy') setReturnPolicy(s.value);
        if (s.key === 'faq_page') setFaqPage(s.value);
        if (s.key === 'receipt') setReceipt(s.value);
        if (s.key === 'site_title') setSiteTitle(String(s.value || ''));
        if (s.key === 'gemini_api_key') { const k = String(s.value || ''); setGeminiKey(k); if (k) setKeySaved(true); }
      });
    };
    load();
  }, []);

  const save = async (key: string, value: any) => {
    try {
      await ensureAdminSession();
      const { error } = await supabase.from('site_settings').upsert({ key, value }, { onConflict: 'key' }).select('key').single();
      if (error) throw error;
      invalidateStoreSettingsCache();
      toast({ title: `${key} settings saved!` });
    } catch (e: any) {
      toast({ title: `${key} save failed`, description: e.message || 'Unknown Supabase error', variant: 'destructive' });
      throw e;
    }
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFaviconUploading(true);
    try {
      await ensureAdminSession();
      const ext = file.name.split('.').pop() || 'ico';
      const path = `favicon/favicon-${Date.now()}.${ext}`;
      let bucket = 'logos';
      let upload = await supabase.storage.from(bucket).upload(path, file, { upsert: true, contentType: file.type });

      if (upload.error?.message?.toLowerCase().includes('bucket not found')) {
        bucket = 'products';
        upload = await supabase.storage.from(bucket).upload(path, file, { upsert: true, contentType: file.type });
      }

      if (upload.error) {
        const base64 = await fileToBase64(file);
        setLogo(p => ({ ...p, url: base64 }));
        toast({ title: 'Favicon ready', description: 'Storage upload was blocked, so the icon was embedded. Click Save Branding to apply.' });
        return;
      }

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
      const newUrl = urlData.publicUrl;
      setLogo(p => ({ ...p, url: newUrl }));
      toast({ title: 'Favicon uploaded!', description: 'Click Save Branding to apply.' });
    } catch (err: any) {
      try {
        const base64 = await fileToBase64(file);
        setLogo(p => ({ ...p, url: base64 }));
        toast({ title: 'Favicon ready', description: 'Upload was blocked, so the icon was embedded. Click Save Branding to apply.' });
      } catch {
        toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
      }
    }
    setFaviconUploading(false);
  };

  const saveBranding = async () => {
    try {
      await save('logo', logo);
      await save('site_title', siteTitle || logo.name);
      toast({ title: 'Branding saved!', description: 'Brand name, favicon and site title updated.' });
    } catch {}
  };

  const productionReset = async () => {
    if (resetConfirm !== 'RESET') {
      toast({ title: 'Type RESET to confirm', variant: 'destructive' });
      return;
    }
    setResetting(true);
    try {
      await supabase.from('order_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('reviews').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('returns').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('chat_messages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('chat_conversations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('stock_alerts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('ai_discount_suggestions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      toast({ title: '✅ Production Reset Complete', description: 'All test/dummy data has been wiped. Store is ready for launch.' });
      setResetConfirm('');
    } catch (e: any) {
      toast({ title: 'Reset failed', description: e.message, variant: 'destructive' });
    }
    setResetting(false);
  };

  const saveAiSettings = async () => {
    if (!geminiKey.trim()) {
      toast({ title: 'Please enter a Gemini API key', variant: 'destructive' });
      return;
    }
    setSavingAi(true);
    try {
      await save('gemini_api_key', geminiKey.trim());
      setKeySaved(true);
      setKeyTestResult(null);
      toast({ title: '✅ Gemini API key saved!', description: 'All AI features are now connected and ready to use.' });
    } catch {}
    setSavingAi(false);
  };

  const testAiKey = async () => {
    if (!geminiKey.trim()) {
      toast({ title: 'Enter and save a key first', variant: 'destructive' });
      return;
    }
    setTestingKey(true);
    setKeyTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: { type: 'product-ai', messages: [{ role: 'user', content: 'Respond with only the word: OK' }] },
      });
      if (error || data?.error) throw new Error(error?.message || data?.error || 'Failed');
      setKeyTestResult('ok');
      toast({ title: '✅ AI Connection Successful', description: 'Your Gemini key is working and all AI features are active.' });
    } catch (e: any) {
      setKeyTestResult('fail');
      toast({ title: '❌ AI Connection Failed', description: e.message || 'Key may be invalid or edge function not deployed.', variant: 'destructive' });
    }
    setTestingKey(false);
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
      <Tabs defaultValue="branding" className="w-full">
        <TabsList className="w-full flex-wrap h-auto gap-1 mb-4">
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="social">Social</TabsTrigger>
          <TabsTrigger value="receipt">Receipt</TabsTrigger>
          <TabsTrigger value="pages">Pages</TabsTrigger>
          <TabsTrigger value="ai">AI Settings</TabsTrigger>
          <TabsTrigger value="admin">Admin</TabsTrigger>
          <TabsTrigger value="reset" className="text-destructive">Production Reset</TabsTrigger>
        </TabsList>

        <TabsContent value="branding" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Brand Name & Identity</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Brand Name</Label>
                <Input
                  value={logo.name}
                  onChange={e => setLogo(p => ({ ...p, name: e.target.value }))}
                  placeholder="Enter your brand/store name"
                />
                <p className="text-xs text-muted-foreground mt-1">This name appears in the header, footer, admin sidebar and everywhere branding is shown.</p>
              </div>

              <div>
                <Label>Site Title (browser tab)</Label>
                <Input
                  value={siteTitle}
                  onChange={e => setSiteTitle(e.target.value)}
                  placeholder="e.g. My Store - Best Shoes Online"
                />
                <p className="text-xs text-muted-foreground mt-1">Shown in browser tab. Defaults to Brand Name if left empty.</p>
              </div>

              <div>
                <Label>Favicon / Logo Icon</Label>
                <div className="flex items-center gap-3 mt-2">
                  {logo.url && (
                    <img src={logo.url} alt="Favicon Preview" className="h-10 w-10 object-contain border rounded p-1 bg-muted" />
                  )}
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => faviconInputRef.current?.click()}
                      disabled={faviconUploading}
                    >
                      {faviconUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {faviconUploading ? 'Uploading…' : 'Upload Favicon / Icon'}
                    </Button>
                    <p className="text-xs text-muted-foreground">Supports .ico, .png, .svg, .jpg — recommended 64×64px</p>
                  </div>
                </div>
                <input
                  ref={faviconInputRef}
                  type="file"
                  accept=".ico,.png,.svg,.jpg,.jpeg,.webp"
                  className="hidden"
                  onChange={handleFaviconUpload}
                />
                <div className="mt-2">
                  <Label>Or paste a URL directly</Label>
                  <Input
                    value={logo.url}
                    onChange={e => setLogo(p => ({ ...p, url: e.target.value }))}
                    placeholder="/favicon.ico or https://..."
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label>Logo Display Size (CSS class)</Label>
                <Input value={logo.size} onChange={e => setLogo(p => ({ ...p, size: e.target.value }))} placeholder="h-10 w-10" />
              </div>

              <Button onClick={saveBranding} className="w-full">Save Branding</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Contact Info</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Phone</Label><Input value={contact.phone} onChange={e => setContact(p => ({ ...p, phone: e.target.value }))} /></div>
              <div><Label>Email</Label><Input value={contact.email} onChange={e => setContact(p => ({ ...p, email: e.target.value }))} /></div>
              <div><Label>WhatsApp</Label><Input value={contact.whatsapp} onChange={e => setContact(p => ({ ...p, whatsapp: e.target.value }))} /></div>
              <div><Label>Address</Label><Input value={contact.address} onChange={e => setContact(p => ({ ...p, address: e.target.value }))} /></div>
              <Button onClick={() => save('contact', contact)}>Save Contact</Button>
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
              <div><Label>Shop Name</Label><Input value={receipt.shop_name} onChange={e => setReceipt((p: any) => ({ ...p, shop_name: e.target.value }))} /></div>
              <div><Label>Tagline</Label><Input value={receipt.tagline} onChange={e => setReceipt((p: any) => ({ ...p, tagline: e.target.value }))} /></div>
              <div><Label>Contact Line</Label><Input value={receipt.contact_line} onChange={e => setReceipt((p: any) => ({ ...p, contact_line: e.target.value }))} /></div>
              <div><Label>Footer Line</Label><Input value={receipt.footer_line} onChange={e => setReceipt((p: any) => ({ ...p, footer_line: e.target.value }))} /></div>
              <div><Label>Website</Label><Input value={receipt.website} onChange={e => setReceipt((p: any) => ({ ...p, website: e.target.value }))} /></div>
              
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
                <img src={logo.url || '/favicon.ico'} alt="Logo" className="h-8 w-8 mx-auto mb-1" />
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
            <CardHeader><CardTitle>Return Policy</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Title</Label><Input value={returnPolicy.title} onChange={e => setReturnPolicy(p => ({ ...p, title: e.target.value }))} /></div>
              <div><Label>Return Days</Label><Input type="number" value={returnPolicy.days} onChange={e => setReturnPolicy(p => ({ ...p, days: Number(e.target.value) }))} /></div>
              <div><Label>Content</Label><Textarea rows={8} value={returnPolicy.content} onChange={e => setReturnPolicy(p => ({ ...p, content: e.target.value }))} /></div>
              <Button onClick={() => save('return_policy', returnPolicy)}>Save Return Policy</Button>
            </CardContent>
          </Card>

        </TabsContent>

        <TabsContent value="ai" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" /> AI Configuration
                {keySaved && keyTestResult === null && (
                  <span className="ml-auto text-xs font-normal bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> Key Saved
                  </span>
                )}
                {keyTestResult === 'ok' && (
                  <span className="ml-auto text-xs font-normal bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> AI Active ✓
                  </span>
                )}
                {keyTestResult === 'fail' && (
                  <span className="ml-auto text-xs font-normal bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <XCircle className="h-3 w-3" /> Connection Failed
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                <p className="font-semibold mb-1">📌 Set your Gemini API Key once — applies to ALL AI features instantly</p>
                <ol className="list-decimal ml-4 space-y-0.5 text-xs">
                  <li>Go to <strong>aistudio.google.com</strong></li>
                  <li>Click <strong>Get API Key</strong> → Create API key</li>
                  <li>Paste below and click <strong>Save</strong></li>
                </ol>
                <p className="mt-2 text-xs font-medium">✅ One key connects: Virtual Try-On · Size Advisor · AI Helper · Sales Predictor · Fraud Detector · Marketing Hub · Banner Creator · and all other AI tools</p>
              </div>

              <div>
                <Label>Gemini API Key</Label>
                <div className="relative mt-1">
                  <Input
                    type={showGeminiKey ? 'text' : 'password'}
                    value={geminiKey}
                    onChange={e => { setGeminiKey(e.target.value); setKeySaved(false); setKeyTestResult(null); }}
                    placeholder="AIza..."
                    className="pr-10 font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGeminiKey(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showGeminiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Stored securely in your database. Never exposed to the public. Change anytime — takes effect immediately.
                </p>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button onClick={saveAiSettings} disabled={savingAi} className="gap-2">
                  {savingAi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                  {savingAi ? 'Saving...' : keySaved ? 'Update API Key' : 'Save API Key'}
                </Button>
                <Button onClick={testAiKey} disabled={testingKey || !geminiKey} variant="outline" className="gap-2">
                  {testingKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                  {testingKey ? 'Testing...' : 'Test Connection'}
                </Button>
              </div>

              {keyTestResult === 'ok' && (
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-3">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-semibold">AI is fully connected!</p>
                    <p className="text-xs mt-0.5">All AI features across the store are now using your Gemini key.</p>
                  </div>
                </div>
              )}
              {keyTestResult === 'fail' && (
                <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-3">
                  <XCircle className="h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-semibold">Connection failed</p>
                    <p className="text-xs mt-0.5">Check your API key is valid. You can still save and try again later.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admin" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Admin Login Credentials</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">Change admin login email and password</p>
              <div><Label>New Email</Label><Input type="email" value={adminCreds.email} onChange={e => setAdminCreds(p => ({ ...p, email: e.target.value }))} /></div>
              <div><Label>New Password</Label><Input type="password" value={adminCreds.password} onChange={e => setAdminCreds(p => ({ ...p, password: e.target.value }))} /></div>
              <Button onClick={updateAdminPassword} variant="destructive">Update Admin Credentials</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reset" className="space-y-4">
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" /> Production Reset
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
                <p className="font-semibold text-red-800">⚠️ Warning: This is irreversible!</p>
                <p className="text-sm text-red-700">This will permanently delete all:</p>
                <ul className="text-sm text-red-700 space-y-0.5 ml-4 list-disc">
                  <li>All orders & order items</li>
                  <li>All customer reviews</li>
                  <li>All return requests</li>
                  <li>All chat conversations & messages</li>
                  <li>All stock alerts</li>
                  <li>All AI suggestions</li>
                </ul>
                <p className="text-sm text-red-700 mt-2"><strong>Products, categories, banners, and settings will NOT be deleted.</strong></p>
              </div>
              <div className="space-y-2">
                <Label>Type <span className="font-mono font-bold">RESET</span> to confirm</Label>
                <Input value={resetConfirm} onChange={e => setResetConfirm(e.target.value)} placeholder="Type RESET here" className="border-destructive max-w-xs" />
              </div>
              <Button variant="destructive" onClick={productionReset} disabled={resetting || resetConfirm !== 'RESET'} className="gap-2">
                {resetting ? <><Loader2 className="h-4 w-4 animate-spin" />Resetting...</> : <><Trash2 className="h-4 w-4" />Wipe Test Data & Launch</>}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSettings;
