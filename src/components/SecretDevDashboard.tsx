import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Trash2, Upload, Save, Settings, RefreshCw, AlertTriangle, User, Plus, X, Link as LinkIcon, ArrowLeft, Globe } from 'lucide-react';
import { ensureAdminSession } from '@/lib/adminSession';

const MASTER_PW_HASH = 'Asad_Dev_99';

const DEV_INFO_KEY = '__stopy_dev_info__';

const DEFAULT_DEV_INFO = {
  name: 'Muhammad Asad Ali',
  handle: 'ASDEVOLPER',
  tagline: 'Full-Stack Web & Mobile Developer specializing in AI-powered e-commerce platforms, scalable cloud architectures, and intelligent automation systems.',
  location: 'Pakistan',
  availabilityBadge: 'Available for Projects',
  projects: '50+',
  clients: '30+',
  experience: '5+ Yrs',
  technologies: '20+',
  origin_story: 'This platform (Stopy Shoes — Universal AI Commerce Engine) was entirely designed, developed, and deployed by Muhammad Asad Ali (ASDEVOLPER). Including all AI modules, e-commerce logic, admin dashboard, and real-time integrations.',
  copyright: '© 2024–2026 Muhammad Asad Ali · All Rights Reserved',
  email: 'asdevolper@gmail.com',
  whatsapp: '+923001234567',
  github: '',
  instagram: '',
  linkedin: '',
  asLogoUrl: '',
  customLinks: [] as { title: string; url: string }[],
};

interface Props {
  open: boolean;
  onClose: () => void;
}

const ensureLogosBucket = async () => {
  const { error } = await supabase.storage.createBucket('logos', { public: true });
  if (error && !error.message.includes('already exists')) {
    console.warn('Bucket creation note:', error.message);
  }
};

const SecretDevDashboard = ({ open, onClose }: Props) => {
  const [tab, setTab] = useState('dev-info');
  const [devInfo, setDevInfo] = useState<typeof DEFAULT_DEV_INFO>(DEFAULT_DEV_INFO);
  const [logoUrl, setLogoUrl] = useState('');
  const [logoName, setLogoName] = useState('Stopy Shoes');
  const [settingKey, setSettingKey] = useState('');
  const [settingValue, setSettingValue] = useState('');
  const [resetConfirm, setResetConfirm] = useState('');
  const [resetting, setResetting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [siteTitle, setSiteTitle] = useState('Stopy Shoes | Pakistan\'s Best Store');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [savingBranding, setSavingBranding] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const asLogoRef = useRef<HTMLInputElement>(null);
  const faviconRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    try {
      const stored = localStorage.getItem(DEV_INFO_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setDevInfo({ ...DEFAULT_DEV_INFO, ...parsed, customLinks: parsed.customLinks || [] });
      }
    } catch {}
    supabase.from('site_settings').select('*').then(({ data }) => {
      (data || []).forEach((s: any) => {
        if (s.key === 'logo') {
          const v = s.value as any;
          setLogoUrl(v.url || '');
          setLogoName(v.name || 'Stopy Shoes');
        }
        if (s.key === 'developer_page') {
          const v = s.value as any;
          const merged = { ...DEFAULT_DEV_INFO, ...v, customLinks: v.customLinks || [] };
          setDevInfo(merged);
          localStorage.setItem(DEV_INFO_KEY, JSON.stringify(merged));
        }
        if (s.key === 'site_branding') {
          const v = s.value as any;
          if (v.title) setSiteTitle(v.title);
          if (v.favicon) setFaviconUrl(v.favicon);
        }
      });
    });
  }, [open]);

  const saveBranding = async () => {
    setSavingBranding(true);
    try {
      await ensureAdminSession();
      document.title = siteTitle;
      if (faviconUrl) {
        let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
        if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
        link.href = faviconUrl;
      }
      const { error } = await supabase.from('site_settings').upsert(
        { key: 'site_branding', value: { title: siteTitle, favicon: faviconUrl } as any },
        { onConflict: 'key' }
      ).select('key').single();
      if (error) throw error;
      toast({ title: '✅ Branding saved!', description: 'Title and favicon updated instantly.' });
    } catch (e: any) {
      toast({ title: 'Save failed', description: e.message || 'Unknown Supabase error', variant: 'destructive' });
    }
    setSavingBranding(false);
  };

  const saveDevInfo = async () => {
    localStorage.setItem(DEV_INFO_KEY, JSON.stringify(devInfo));
    try {
      await ensureAdminSession();
      const { error } = await supabase.from('site_settings').upsert({ key: 'developer_page', value: devInfo }, { onConflict: 'key' }).select('key').single();
      if (error) throw error;
      toast({ title: '✅ Developer info saved!', description: 'Changes will reflect on the Developer page.' });
    } catch (e: any) {
      toast({ title: 'Developer info saved locally only', description: e.message || 'Supabase write failed', variant: 'destructive' });
    }
  };

  const addCustomLink = () => {
    if (!newLinkTitle.trim() || !newLinkUrl.trim()) {
      toast({ title: 'Both title and URL are required', variant: 'destructive' });
      return;
    }
    const url = newLinkUrl.startsWith('http') ? newLinkUrl : `https://${newLinkUrl}`;
    const updated = [...(devInfo.customLinks || []), { title: newLinkTitle.trim(), url }];
    setDevInfo(d => ({ ...d, customLinks: updated }));
    setNewLinkTitle('');
    setNewLinkUrl('');
  };

  const removeCustomLink = (idx: number) => {
    const updated = (devInfo.customLinks || []).filter((_, i) => i !== idx);
    setDevInfo(d => ({ ...d, customLinks: updated }));
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await ensureLogosBucket();
      const ext = file.name.split('.').pop();
      const path = `site-logo-${Date.now()}.${ext}`;
      const { error: uploadError, data: uploadData } = await supabase.storage.from('logos').upload(path, file, { upsert: true });
      if (!uploadError && uploadData) {
        const { data: urlData } = supabase.storage.from('logos').getPublicUrl(path);
        setLogoUrl(urlData.publicUrl);
        toast({ title: '✅ Logo uploaded to storage!', description: 'Click "Save Logo" to apply.' });
      } else {
        const base64 = await fileToBase64(file);
        setLogoUrl(base64);
        toast({ title: '✅ Logo ready (embedded)', description: 'Stored as inline image. Click "Save Logo" to apply.' });
      }
    } catch (e: any) {
      try {
        const base64 = await fileToBase64(file);
        setLogoUrl(base64);
        toast({ title: '✅ Logo ready (embedded)', description: 'Click "Save Logo" to apply.' });
      } catch {
        toast({ title: 'Upload failed', description: 'Could not process image file.', variant: 'destructive' });
      }
    }
    setUploading(false);
  };

  const saveLogo = async () => {
    try {
      await ensureAdminSession();
      const { error } = await supabase.from('site_settings').upsert({ key: 'logo', value: { url: logoUrl, name: logoName, size: 'h-10 w-10' } }, { onConflict: 'key' }).select('key').single();
      if (error) throw error;
      toast({ title: '✅ Logo updated!', description: 'Refresh the page to see the change.' });
    } catch (e: any) {
      toast({ title: 'Save failed', description: e.message || 'Unknown Supabase error', variant: 'destructive' });
    }
  };

  const saveSetting = async () => {
    if (!settingKey.trim()) return;
    let val: any = settingValue;
    try { val = JSON.parse(settingValue); } catch {}
    try {
      await ensureAdminSession();
      const { error } = await supabase.from('site_settings').upsert({ key: settingKey, value: val }, { onConflict: 'key' }).select('key').single();
      if (error) throw error;
      toast({ title: `✅ Setting "${settingKey}" overridden!` });
      setSettingKey('');
      setSettingValue('');
    } catch (e: any) {
      toast({ title: 'Save failed', description: e.message || 'Unknown Supabase error', variant: 'destructive' });
    }
  };

  const runFactoryReset = async () => {
    if (resetConfirm !== 'FACTORY RESET') {
      toast({ title: 'Type FACTORY RESET to confirm', variant: 'destructive' });
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
      await supabase.from('promo_codes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('banners').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('stock_alerts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('ai_discount_suggestions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('product_variants').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('categories').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('site_settings').delete().neq('key', '__placeholder__');
      localStorage.clear();
      toast({ title: '🔥 Factory Reset Complete', description: 'All data wiped. Store is now blank.' });
      setResetConfirm('');
      onClose();
    } catch (e: any) {
      toast({ title: 'Reset error', description: e.message, variant: 'destructive' });
    }
    setResetting(false);
  };

  const field = (label: string, key: keyof typeof DEFAULT_DEV_INFO, multiline = false) => (
    <div key={key}>
      <Label className="text-xs">{label}</Label>
      {multiline ? (
        <Textarea className="mt-1 text-sm" rows={3} value={(devInfo as any)[key] || ''} onChange={e => setDevInfo(d => ({ ...d, [key]: e.target.value }))} />
      ) : (
        <Input className="mt-1 text-sm" value={(devInfo as any)[key] || ''} onChange={e => setDevInfo(d => ({ ...d, [key]: e.target.value }))} />
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Shield className="h-5 w-5" />
            Master Developer Dashboard
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-normal ml-1">Muhammad Asad Ali · ASDEVOLPER</span>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="dev-info"><User className="h-3.5 w-3.5 mr-1" />Dev Info</TabsTrigger>
            <TabsTrigger value="logo"><Upload className="h-3.5 w-3.5 mr-1" />Logo</TabsTrigger>
            <TabsTrigger value="branding"><Globe className="h-3.5 w-3.5 mr-1" />Branding</TabsTrigger>
            <TabsTrigger value="settings"><Settings className="h-3.5 w-3.5 mr-1" />Settings</TabsTrigger>
            <TabsTrigger value="reset"><Trash2 className="h-3.5 w-3.5 mr-1" />Factory Reset</TabsTrigger>
          </TabsList>

          <TabsContent value="dev-info" className="space-y-3 mt-4">
            <p className="text-xs text-muted-foreground">These fields appear on the /developer page. All changes saved permanently.</p>
            {field('Full Name', 'name')}
            {field('Handle / Username', 'handle')}
            {field('Tagline', 'tagline', true)}
            {field('Location', 'location')}
            {field('Availability Badge', 'availabilityBadge')}
            <div className="grid grid-cols-4 gap-2">
              {field('Projects', 'projects')}
              {field('Clients', 'clients')}
              {field('Experience', 'experience')}
              {field('Technologies', 'technologies')}
            </div>
            {field('Origin Story', 'origin_story', true)}
            {field('Copyright', 'copyright')}

            <div className="border-t pt-3 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact & Social Links</p>
              {field('Email Address', 'email' as any)}
              {field('WhatsApp Number (with country code)', 'whatsapp' as any)}
              {field('GitHub URL', 'github' as any)}
              {field('Instagram URL', 'instagram' as any)}
              {field('LinkedIn URL', 'linkedin' as any)}
            </div>

            {/* Dynamic Custom Links */}
            <div className="border-t pt-3 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <LinkIcon className="h-3.5 w-3.5 inline mr-1" />Add More Links
              </p>
              <p className="text-xs text-muted-foreground">Add custom links (e.g. TikTok, Portfolio, Behance) that appear on your developer page.</p>

              {(devInfo.customLinks || []).length > 0 && (
                <div className="space-y-2">
                  {(devInfo.customLinks || []).map((link, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{link.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{link.url}</p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:bg-destructive/10 shrink-0"
                        onClick={() => removeCustomLink(idx)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Link Title</Label>
                  <Input
                    className="mt-1 text-sm"
                    placeholder="e.g. TikTok, Portfolio"
                    value={newLinkTitle}
                    onChange={e => setNewLinkTitle(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addCustomLink()}
                  />
                </div>
                <div>
                  <Label className="text-xs">URL</Label>
                  <Input
                    className="mt-1 text-sm"
                    placeholder="https://..."
                    value={newLinkUrl}
                    onChange={e => setNewLinkUrl(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addCustomLink()}
                  />
                </div>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={addCustomLink}>
                <Plus className="h-3.5 w-3.5" />Add Link
              </Button>
            </div>

            <div className="border-t pt-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">AS Developer Logo</p>
              <p className="text-xs text-muted-foreground">This logo appears as your profile avatar on the /developer page.</p>
              {(devInfo as any).asLogoUrl && (
                <div className="flex justify-center p-3 border rounded-xl bg-muted/30">
                  <img src={(devInfo as any).asLogoUrl} alt="AS Logo" className="h-20 w-20 rounded-full object-cover border-2 border-primary/20" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </div>
              )}
              <div>
                <Label className="text-xs">Logo URL (paste link)</Label>
                <Input className="mt-1 text-sm" value={(devInfo as any).asLogoUrl || ''} onChange={e => setDevInfo(d => ({ ...d, asLogoUrl: e.target.value }))} placeholder="https://..." />
              </div>
              <div>
                <Label className="text-xs">Or Upload Logo File (saved to dedicated logos storage)</Label>
                <input ref={asLogoRef} type="file" accept="image/*" className="hidden" onChange={async e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setUploading(true);
                  try {
                    await ensureLogosBucket();
                    const ext = file.name.split('.').pop();
                    const path = `as-dev-logo-${Date.now()}.${ext}`;
                    const { error: uploadError, data: uploadData } = await supabase.storage.from('logos').upload(path, file, { upsert: true });
                    if (!uploadError && uploadData) {
                      const { data: urlData } = supabase.storage.from('logos').getPublicUrl(path);
                      setDevInfo(d => ({ ...d, asLogoUrl: urlData.publicUrl }));
                      toast({ title: '✅ AS Logo uploaded! Click Save to apply.' });
                    } else {
                      const base64 = await fileToBase64(file);
                      setDevInfo(d => ({ ...d, asLogoUrl: base64 }));
                      toast({ title: '✅ AS Logo ready (embedded)', description: 'Click Save to apply.' });
                    }
                  } catch (err: any) {
                    try {
                      const base64 = await fileToBase64(file);
                      setDevInfo(d => ({ ...d, asLogoUrl: base64 }));
                      toast({ title: '✅ AS Logo ready (embedded)', description: 'Click Save to apply.' });
                    } catch {
                      toast({ title: 'Upload failed', description: 'Could not process image.', variant: 'destructive' });
                    }
                  }
                  setUploading(false);
                }} />
                <Button variant="outline" className="w-full mt-1 gap-2" onClick={() => asLogoRef.current?.click()} disabled={uploading}>
                  <Upload className="h-4 w-4" />{uploading ? 'Uploading...' : 'Upload AS Logo'}
                </Button>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={saveDevInfo} className="flex-1 gap-2"><Save className="h-4 w-4" />Save All Developer Info</Button>
              <Button variant="outline" onClick={onClose} className="gap-2"><ArrowLeft className="h-4 w-4" />Back</Button>
            </div>
          </TabsContent>

          <TabsContent value="logo" className="space-y-4 mt-4">
            <p className="text-xs text-muted-foreground">Update the site logo that appears in the header across all pages.</p>
            {logoUrl && (
              <div className="flex justify-center p-4 border rounded-xl bg-muted/30">
                <img src={logoUrl} alt="Current logo" className="h-20 object-contain" />
              </div>
            )}
            <div>
              <Label className="text-xs">Logo URL (direct link)</Label>
              <Input className="mt-1" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div>
              <Label className="text-xs">Brand Name (shown next to logo)</Label>
              <Input className="mt-1" value={logoName} onChange={e => setLogoName(e.target.value)} placeholder="Stopy Shoes" />
            </div>
            <div>
              <Label className="text-xs">Or Upload a New Logo (saved to logos bucket)</Label>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              <Button variant="outline" className="w-full mt-1 gap-2" onClick={() => fileRef.current?.click()} disabled={uploading}>
                <Upload className="h-4 w-4" />{uploading ? 'Uploading...' : 'Upload Logo File'}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button onClick={saveLogo} className="flex-1 gap-2"><Save className="h-4 w-4" />Save Logo</Button>
              <Button variant="outline" onClick={onClose} className="gap-2"><ArrowLeft className="h-4 w-4" />Back</Button>
            </div>
          </TabsContent>

          <TabsContent value="branding" className="space-y-4 mt-4">
            <p className="text-xs text-muted-foreground">Control the browser tab title and website favicon. Changes apply instantly on save.</p>

            <div>
              <Label className="text-xs">Site Title (Browser Tab)</Label>
              <Input
                className="mt-1"
                value={siteTitle}
                onChange={e => { setSiteTitle(e.target.value); document.title = e.target.value; }}
                placeholder="e.g. Stopy Shoes | Pakistan's Best Store"
              />
              <p className="text-xs text-muted-foreground mt-1">This updates the browser tab title in real-time as you type.</p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Favicon (Browser Tab Icon)</Label>
              {faviconUrl && (
                <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                  <img src={faviconUrl} alt="Favicon" className="h-8 w-8 object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  <div>
                    <p className="text-xs font-medium">Current Favicon</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">{faviconUrl.startsWith('data:') ? 'Embedded image' : faviconUrl}</p>
                  </div>
                </div>
              )}
              <div>
                <Label className="text-xs">Favicon URL (paste link to .ico or .png)</Label>
                <Input className="mt-1 text-sm" value={faviconUrl} onChange={e => setFaviconUrl(e.target.value)} placeholder="https://... or upload below" />
              </div>
              <div>
                <Label className="text-xs">Or Upload Favicon (.ico / .png / .svg)</Label>
                <input ref={faviconRef} type="file" accept="image/x-icon,image/png,image/svg+xml,image/*" className="hidden" onChange={async e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setUploading(true);
                  try {
                    const base64 = await fileToBase64(file);
                    setFaviconUrl(base64);
                    let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
                    if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
                    link.href = base64;
                    toast({ title: '✅ Favicon uploaded!', description: 'Click Save Branding to apply permanently.' });
                  } catch {
                    toast({ title: 'Upload failed', variant: 'destructive' });
                  }
                  setUploading(false);
                }} />
                <Button variant="outline" className="w-full mt-1 gap-2" onClick={() => faviconRef.current?.click()} disabled={uploading}>
                  <Upload className="h-4 w-4" />{uploading ? 'Uploading...' : 'Upload Favicon'}
                </Button>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t">
              <Button onClick={saveBranding} disabled={savingBranding} className="flex-1 gap-2">
                <Save className="h-4 w-4" />{savingBranding ? 'Saving...' : 'Save Branding'}
              </Button>
              <Button variant="outline" onClick={onClose} className="gap-2"><ArrowLeft className="h-4 w-4" />Back</Button>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4 mt-4">
            <p className="text-xs text-muted-foreground">Override any site setting directly. This bypasses normal admin restrictions.</p>
            <div>
              <Label className="text-xs">Setting Key</Label>
              <Input className="mt-1" value={settingKey} onChange={e => setSettingKey(e.target.value)} placeholder="e.g. shop_name, delivery_fee, logo" />
            </div>
            <div>
              <Label className="text-xs">Value (JSON or plain text)</Label>
              <Textarea className="mt-1" rows={3} value={settingValue} onChange={e => setSettingValue(e.target.value)} placeholder='e.g. "Stopy Shoes" or {"url":"..."}' />
            </div>
            <div className="flex gap-2">
              <Button onClick={saveSetting} disabled={!settingKey.trim()} className="flex-1 gap-2"><Save className="h-4 w-4" />Override Setting</Button>
              <Button variant="outline" onClick={onClose} className="gap-2"><ArrowLeft className="h-4 w-4" />Back</Button>
            </div>
          </TabsContent>

          <TabsContent value="reset" className="space-y-4 mt-4">
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-destructive font-bold">
                <AlertTriangle className="h-5 w-5" />
                DANGER ZONE — Factory Reset
              </div>
              <p className="text-sm text-muted-foreground">
                This will permanently delete <strong>ALL data</strong>: orders, products, reviews, categories, customers, banners, promo codes, chat history, and all site settings. The store will be completely blank, ready for a fresh setup.
              </p>
              <p className="text-sm font-bold text-destructive">This action is irreversible.</p>
            </div>
            <div>
              <Label className="text-xs text-destructive">Type "FACTORY RESET" to confirm</Label>
              <Input
                className="mt-1 border-destructive focus-visible:ring-destructive"
                value={resetConfirm}
                onChange={e => setResetConfirm(e.target.value)}
                placeholder="FACTORY RESET"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                className="flex-1 gap-2"
                onClick={runFactoryReset}
                disabled={resetting || resetConfirm !== 'FACTORY RESET'}
              >
                {resetting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {resetting ? 'Wiping all data...' : 'Execute Factory Reset'}
              </Button>
              <Button variant="outline" onClick={onClose} className="gap-2"><ArrowLeft className="h-4 w-4" />Back</Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export { MASTER_PW_HASH, DEV_INFO_KEY, DEFAULT_DEV_INFO };
export default SecretDevDashboard;
