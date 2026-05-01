import { useEffect, useState } from 'react';
import { MapPin, Plus, Trash2, Edit, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

import BottomNav from '@/components/layout/BottomNav';

const PROVINCES: Record<string, Record<string, string[]>> = {
  'Punjab': {
    'Ahmedpur East': ['City Area', 'Tehsil HQ'],
    'Alipur': ['City Area', 'Tehsil HQ'],
    'Arifwala': ['City Area', 'Tehsil HQ'],
    'Attock': ['City Area', 'Hazro', 'Fateh Jang', 'Pindi Gheb', 'Jand', 'Hasan Abdal'],
    'Bahawalnagar': ['City Area', 'Chishtian', 'Fort Abbas', 'Haroonabad', 'Minchinabad'],
    'Bahawalpur': ['Model Town', 'Satellite Town', 'Circular Road', 'Yazman Road', 'Hasilpur Road', 'Ahmadpur East'],
    'Bhakkar': ['City Area', 'Darya Khan', 'Mankera', 'Kallur Kot'],
    'Bhalwal': ['City Area', 'Tehsil HQ'],
    'Burewala': ['City Area', 'Tehsil HQ'],
    'Chakwal': ['City Area', 'Talagang', 'Choa Saidan Shah', 'Lawa'],
    'Chichawatni': ['City Area', 'Tehsil HQ'],
    'Chiniot': ['City Area', 'Lalian', 'Bhowana'],
    'Chunian': ['City Area', 'Tehsil HQ'],
    'Daska': ['City Area', 'Tehsil HQ'],
    'Depalpur': ['City Area', 'Tehsil HQ'],
    'Dera Ghazi Khan': ['City Area', 'Taunsa Sharif', 'Tribal Area'],
    'Faisalabad': ['D Ground', 'Peoples Colony', 'Madina Town', 'Ghulam Muhammad Abad', 'Jinnah Colony', 'Samanabad', 'Kohinoor City', 'Jaranwala', 'Tandlianwala', 'Sammundri'],
    'Gojra': ['City Area', 'Tehsil HQ'],
    'Gujar Khan': ['City Area', 'Tehsil HQ'],
    'Gujranwala': ['Satellite Town', 'Model Town', 'Civil Lines', 'DC Road', 'Trust Plaza', 'Peoples Colony', 'Kamoke', 'Nowshera Virkan', 'Wazirabad'],
    'Gujrat': ['Bhimber Road', 'GT Road', 'Jalalpur Jattan Road', 'Sadar Bazaar', 'Kharian', 'Sarai Alamgir'],
    'Hafizabad': ['City Area', 'Pindi Bhattian', 'Sukheke'],
    'Jhang': ['City Area', 'Shorkot', 'Ahmedpur Sial', '18 Hazari'],
    'Jhelum': ['Cantt', 'Sadar Bazaar', 'Civil Lines', 'GT Road', 'Dina', 'Pind Dadan Khan'],
    'Kamalia': ['City Area', 'Tehsil HQ'],
    'Kasur': ['Kot Radha Kishan', 'Pattoki', 'City Area', 'Allahabad', 'Phool Nagar'],
    'Khanewal': ['City Area', 'Kabirwala', 'Mian Channu', 'Jahanian'],
    'Khanpur': ['City Area'],
    'Khushab': ['City Area', 'Jauharabad', 'Noor Pur Thal', 'Quaidabad'],
    'Kot Addu': ['City Area'],
    'Kot Momin': ['City Area', 'Tehsil HQ'],
    'Lahore': ['Gulberg', 'DHA', 'Model Town', 'Johar Town', 'Bahria Town', 'Cantt', 'Wapda Town', 'Iqbal Town', 'Township', 'Allama Iqbal Town', 'Sabzazar', 'Garden Town', 'Faisal Town', 'Shahdara', 'Mughalpura', 'Ichhra', 'Anarkali', 'Valencia', 'EME Society', 'Askari'],
    'Layyah': ['City Area', 'Karor Lal Esan', 'Chowk Azam'],
    'Lodhran': ['City Area', 'Kahror Pacca', 'Dunyapur'],
    'Mandi Bahauddin': ['City Area', 'Phalia', 'Malakwal'],
    'Mianwali': ['City Area', 'Piplan', 'Isa Khel'],
    'Multan': ['Cantt', 'Bosan Road', 'Shah Rukn-e-Alam', 'Gulgasht Colony', 'New Multan', 'Wapda Town', 'Garden Town', 'Shujabad', 'Jalalpur Pirwala'],
    'Muzaffargarh': ['City Area', 'Kot Addu', 'Alipur', 'Jatoi'],
    'Nankana Sahib': ['City Area', 'Shahkot', 'Sangla Hill'],
    'Narowal': ['City Area', 'Shakargarh', 'Zafarwal'],
    'Okara': ['Depalpur', 'Renala Khurd', 'City Area', 'Hujra Shah Muqeem'],
    'Pakpattan': ['City Area', 'Arifwala'],
    'Rahim Yar Khan': ['Khanpur', 'Sadiqabad', 'City Area', 'Liaquatpur'],
    'Rajanpur': ['City Area', 'Jampur', 'Rojhan'],
    'Rawalpindi': ['Saddar', 'Satellite Town', 'Bahria Town', 'DHA', 'Chaklala', 'Westridge', 'Adiala Road', 'Commercial Market', 'Shamsabad', 'Taxila', 'Wah Cantt', 'Gujar Khan'],
    'Sahiwal': ['Farid Town', 'Model Town', 'High Court Road', 'Railway Road', 'Chichawatni'],
    'Sargodha': ['Cantt', 'Satellite Town', 'University Road', 'Block 22', 'Sillanwali Road', 'Bhalwal', 'Shahpur', 'Kot Momin'],
    'Sheikhupura': ['Faisal Town', 'Canal Road', 'GT Road', 'Farooq-e-Azam Road', 'Muridke', 'Ferozwala'],
    'Sialkot': ['Cantt', 'Paris Road', 'Kashmir Road', 'Allama Iqbal Road', 'Model Town', 'Defence Road', 'Daska', 'Sambrial', 'Pasrur'],
    'Toba Tek Singh': ['City Area', 'Gojra', 'Kamalia', 'Pir Mahal'],
    'Vehari': ['City Area', 'Burewala', 'Mailsi'],
    'Wah Cantt': ['City Area', 'POF', 'HMC'],
  },
  'Sindh': {
    'Karachi': ['DHA', 'Clifton', 'Gulshan-e-Iqbal', 'North Nazimabad', 'Malir', 'Korangi', 'PECHS', 'Saddar', 'Gulistan-e-Jauhar', 'Scheme 33', 'Nazimabad', 'Lyari', 'Orangi', 'Landhi', 'Shah Faisal'],
    'Hyderabad': ['Latifabad', 'Qasimabad', 'City Area', 'Heerabad'],
    'Sukkur': ['City Area', 'New Sukkur', 'Rohri'],
    'Larkana': ['City Area', 'Ratodero', 'Dokri'],
    'Nawabshah': ['City Area', 'Sakrand'],
    'Mirpur Khas': ['City Area', 'Digri'],
  },
  'KPK': {
    'Peshawar': ['Hayatabad', 'University Town', 'Saddar', 'Cantt', 'Board Bazaar', 'Ring Road', 'Warsak Road'],
    'Abbottabad': ['Supply', 'Jinnahabad', 'Mandian', 'Mirpur'],
    'Mardan': ['City Area', 'Cantt', 'Takht Bhai'],
    'Swat': ['Mingora', 'Saidu Sharif', 'Kalam', 'Bahrain'],
    'Mansehra': ['City Area', 'Balakot', 'Oghi', 'Shinkiari'],
    'Haripur': ['City Area', 'Ghazi', 'Khalabat'],
    'Kohat': ['City Area', 'Darra Adam Khel'],
    'Bannu': ['City Area', 'Domel'],
    'DI Khan': ['City Area', 'Paroa'],
    'Nowshera': ['City Area', 'Pabbi', 'Risalpur'],
  },
  'Balochistan': {
    'Quetta': ['Cantt', 'Satellite Town', 'Jinnah Town', 'Samungli Road', 'Sariab Road'],
    'Gwadar': ['City Area', 'East Bay'],
    'Turbat': ['City Area'],
    'Hub': ['City Area', 'Lasbela'],
  },
  'Islamabad': {
    'Islamabad': ['F-6', 'F-7', 'F-8', 'F-10', 'F-11', 'G-9', 'G-10', 'G-11', 'G-13', 'I-8', 'I-10', 'I-14', 'I-16', 'Bahria Town', 'DHA', 'PWD', 'Gulberg Greens', 'B-17', 'E-11', 'D-12', 'H-13'],
  },
  'AJK': {
    'Muzaffarabad': ['City Area', 'Chattar', 'Garhi Dupatta'],
    'Mirpur': ['City Area', 'Bhimber', 'Kotli', 'Dadyal'],
    'Rawalakot': ['City Area', 'Bagh', 'Pallandri'],
  },
  'Gilgit-Baltistan': {
    'Gilgit': ['City Area', 'Jutial', 'Danyore'],
    'Skardu': ['City Area', 'Shigar'],
    'Hunza': ['Karimabad', 'Aliabad'],
  },
};

const MyAddresses = () => {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [dynamicProvinces, setDynamicProvinces] = useState<Record<string, Record<string, string[]>>>(PROVINCES);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [label, setLabel] = useState('Home');

  const fetchAddresses = async () => {
    if (!user) return;
    const { data } = await supabase.from('addresses').select('*').eq('user_id', user.id).order('is_default', { ascending: false });
    setAddresses(data || []);
  };

  useEffect(() => {
    fetchAddresses();
    // Load city manager data from site_settings
    supabase.from('site_settings').select('*').eq('key', 'city_areas').maybeSingle().then(({ data }) => {
      if (data?.value && typeof data.value === 'object') {
        // Merge with defaults - city manager data takes priority
        setDynamicProvinces(prev => {
          const merged = { ...prev };
          const cm = data.value as Record<string, Record<string, string[]>>;
          for (const prov of Object.keys(cm)) {
            if (!merged[prov]) merged[prov] = {};
            for (const city of Object.keys(cm[prov])) {
              merged[prov][city] = cm[prov][city];
            }
          }
          return merged;
        });
      }
    });
  }, [user]);

  const resetForm = () => {
    setFullName(''); setPhone(''); setWhatsapp(''); setEmail('');
    setProvince(''); setCity(''); setArea(''); setFullAddress('');
    setLabel('Home'); setEditId(null);
  };

  const openEdit = (addr: any) => {
    setEditId(addr.id);
    setFullName(addr.full_name); setPhone(addr.phone);
    setWhatsapp(addr.whatsapp || ''); setEmail(addr.email || '');
    setProvince(addr.province); setCity(addr.city);
    setArea(addr.area); setFullAddress(addr.full_address);
    setLabel(addr.label || 'Home');
    setDialogOpen(true);
  };

  const saveAddress = async () => {
    if (!user || !fullName || !phone || !province || !city || !area || !fullAddress) {
      toast({ title: 'Fill all required fields', variant: 'destructive' }); return;
    }
    const data = {
      user_id: user.id, full_name: fullName, phone, whatsapp: whatsapp || null,
      email: email || null, province, city, area, full_address: fullAddress,
      label, is_default: addresses.length === 0,
    };
    if (editId) {
      await supabase.from('addresses').update(data).eq('id', editId);
    } else {
      await supabase.from('addresses').insert(data);
    }
    toast({ title: editId ? 'Address updated!' : 'Address saved!' });
    setDialogOpen(false); resetForm(); fetchAddresses();
  };

  const deleteAddr = async (id: string) => {
    if (!confirm('Delete this address?')) return;
    await supabase.from('addresses').delete().eq('id', id);
    toast({ title: 'Address deleted' }); fetchAddresses();
  };

  const setDefault = async (id: string) => {
    if (!user) return;
    await supabase.from('addresses').update({ is_default: false }).eq('user_id', user.id);
    await supabase.from('addresses').update({ is_default: true }).eq('id', id);
    toast({ title: 'Default address updated' }); fetchAddresses();
  };

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      
      <main className="container py-5 max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">My Addresses</h1>
          <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="gap-1">
            <Plus className="h-4 w-4" /> Add Address
          </Button>
        </div>

        {addresses.length === 0 ? (
          <div className="text-center py-16">
            <MapPin className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No saved addresses</p>
            <Button className="mt-4" onClick={() => setDialogOpen(true)}>Add Your First Address</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {addresses.map(addr => (
              <div key={addr.id} className={`bg-card rounded-xl border p-4 ${addr.is_default ? 'border-primary' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium bg-muted px-2 py-0.5 rounded">{addr.label || 'Home'}</span>
                      {addr.is_default && <span className="text-xs text-primary font-semibold">Default</span>}
                    </div>
                    <p className="font-medium text-sm">{addr.full_name} · {addr.phone}</p>
                    <p className="text-xs text-muted-foreground mt-1">{addr.full_address}, {addr.area}, {addr.city}, {addr.province}</p>
                  </div>
                  <div className="flex gap-1">
                    {!addr.is_default && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDefault(addr.id)} title="Set as default">
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(addr)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteAddr(addr.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editId ? 'Edit Address' : 'Add New Address'}</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="flex gap-2">
                {['Home', 'Office', 'Other'].map(l => (
                  <Button key={l} variant={label === l ? 'default' : 'outline'} size="sm" onClick={() => setLabel(l)}>{l}</Button>
                ))}
              </div>
              <div><Label>Full Name *</Label><Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Full name" className="mt-1" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Phone *</Label><Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="03001234567" className="mt-1" /></div>
                <div><Label>WhatsApp</Label><Input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="WhatsApp" className="mt-1" /></div>
              </div>
              <div><Label>Email</Label><Input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="mt-1" /></div>
              <div>
                <Label>Province *</Label>
                <Select value={province} onValueChange={v => { setProvince(v); setCity(''); setArea(''); }}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select Province" /></SelectTrigger>
                  <SelectContent>{Object.keys(dynamicProvinces).map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>City *</Label>
                <Select value={city} onValueChange={v => { setCity(v); setArea(''); }} disabled={!province}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select City" /></SelectTrigger>
                  <SelectContent>{province && Object.keys(dynamicProvinces[province] || {}).sort().map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Area/Tehsil *</Label>
                <Select value={area} onValueChange={setArea} disabled={!city}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select Area" /></SelectTrigger>
                  <SelectContent>{city && province && (dynamicProvinces[province]?.[city] || []).map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Full Address *</Label><Textarea value={fullAddress} onChange={e => setFullAddress(e.target.value)} placeholder="House #, Street, Landmark..." className="mt-1" /></div>
              <Button onClick={saveAddress} className="w-full">{editId ? 'Update Address' : 'Save Address'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
      <BottomNav />
    </div>
  );
};

export default MyAddresses;
