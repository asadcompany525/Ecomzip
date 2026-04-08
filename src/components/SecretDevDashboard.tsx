import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Trash2, Upload, Save, Settings, RefreshCw, AlertTriangle, User } from 'lucide-react';

const MASTER_PW_HASH = 'ASDEV@2026';

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
};

interface Props {
  open: boolean;
  onClose: () => void;
}

const SecretDevDashboard = ({ open, onClose }: Props) => {
  const [tab, setTab] = useState('dev-info');
  const [devInfo, setDevInfo] = useState(DEFAULT_DEV_INFO);
  const [logoUrl, setLogoUrl] = useState('');
  const [logoName, setLogoName] = useState('Stopy Shoes');
  const [settingKey, setSettingKey] = useState('');
  const [settingValue, setSettingValue] = useState('');
  const [resetConfirm, setResetConfirm] = useState('');
  const [resetting, setResetting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    try {
      const stored = localStorage.getItem(DEV_INFO_KEY);
      if (stored) setDevInfo(JSON.parse(stored));
    } catch {}
    supabase.from('site_settings').select('*').eq('key', 'logo').maybeSingle().then(({ data }) => {
      if (data?.value) {
        const v = data.value as any;
        setLogoUrl(v.url || '');
        setLogoName(v.name || 'Stopy Shoes');
      }
    });
  }, [open]);

  const saveDevInfo = () => {
    localStorage.setItem(DEV_INFO_KEY, JSON.stringify(devInfo));
    toast({ title: '✅ Developer info saved!', description: 'Changes will reflect on the Developer page.' });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `logo/site-logo-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('product-images').upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(path);
      setLogoUrl(urlData.publicUrl);
      toast({ title: 'Logo uploaded!', description: 'Click "Save Logo" to apply.' });
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e.message, variant: 'destructive' });
    }
    setUploading(false);
  };

  const saveLogo = async () => {
    await supabase.from('site_settings').upsert({ key: 'logo', value: { url: logoUrl, name: logoName, size: 'h-10 w-10' } }, { onConflict: 'key' });
    toast({ title: '✅ Logo updated!', description: 'Refresh the page to see the change.' });
  };

  const saveSetting = async () => {
    if (!settingKey.trim()) return;
    let val: any = settingValue;
    try { val = JSON.parse(settingValue); } catch {}
    await supabase.from('site_settings').upsert({ key: settingKey, value: val }, { onConflict: 'key' });
    toast({ title: `✅ Setting "${settingKey}" overridden!` });
    setSettingKey('');
    setSettingValue('');
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

  const field = (label: string, key: keyof typeof devInfo, multiline = false) => (
    <div key={key}>
      <Label className="text-xs">{label}</Label>
      {multiline ? (
        <Textarea className="mt-1 text-sm" rows={3} value={devInfo[key]} onChange={e => setDevInfo(d => ({ ...d, [key]: e.target.value }))} />
      ) : (
        <Input className="mt-1 text-sm" value={devInfo[key]} onChange={e => setDevInfo(d => ({ ...d, [key]: e.target.value }))} />
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
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="dev-info"><User className="h-3.5 w-3.5 mr-1" />Dev Info</TabsTrigger>
            <TabsTrigger value="logo"><Upload className="h-3.5 w-3.5 mr-1" />Logo</TabsTrigger>
            <TabsTrigger value="settings"><Settings className="h-3.5 w-3.5 mr-1" />Settings</TabsTrigger>
            <TabsTrigger value="reset"><Trash2 className="h-3.5 w-3.5 mr-1" />Factory Reset</TabsTrigger>
          </TabsList>

          <TabsContent value="dev-info" className="space-y-3 mt-4">
            <p className="text-xs text-muted-foreground">These fields appear on the /developer page. Changes saved locally.</p>
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
            <Button onClick={saveDevInfo} className="w-full gap-2"><Save className="h-4 w-4" />Save Developer Info</Button>
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
              <Label className="text-xs">Or Upload a New Logo</Label>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              <Button variant="outline" className="w-full mt-1 gap-2" onClick={() => fileRef.current?.click()} disabled={uploading}>
                <Upload className="h-4 w-4" />{uploading ? 'Uploading...' : 'Upload Logo File'}
              </Button>
            </div>
            <Button onClick={saveLogo} className="w-full gap-2"><Save className="h-4 w-4" />Save Logo</Button>
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
            <Button onClick={saveSetting} disabled={!settingKey.trim()} className="w-full gap-2"><Save className="h-4 w-4" />Override Setting</Button>
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
            <Button
              variant="destructive"
              className="w-full gap-2"
              onClick={runFactoryReset}
              disabled={resetting || resetConfirm !== 'FACTORY RESET'}
            >
              {resetting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {resetting ? 'Wiping all data...' : 'Execute Factory Reset'}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export { MASTER_PW_HASH, DEV_INFO_KEY, DEFAULT_DEV_INFO };
export default SecretDevDashboard;
