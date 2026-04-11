import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Plus, Trash2, Search, MapPin, Sparkles, Truck } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const DEFAULT_DATA: Record<string, Record<string, string[]>> = {
  'Punjab': {
    'Lahore': ['Gulberg', 'DHA', 'Model Town', 'Johar Town', 'Iqbal Town', 'Garden Town', 'Cantt', 'Walled City', 'Shadman', 'Faisal Town'],
    'Rawalpindi': ['Saddar', 'Satellite Town', 'Bahria Town', 'DHA', 'Chaklala', 'Westridge', 'Adiala Road', 'Committee Chowk'],
    'Faisalabad': ['D Ground', 'Peoples Colony', 'Madina Town', 'Ghulam Muhammad Abad', 'Jinnah Colony', 'Canal Road'],
    'Multan': ['Cantt', 'Bosan Road', 'Gulgasht Colony', 'Shah Rukn-e-Alam', 'Mumtazabad', 'New Multan'],
    'Gujranwala': ['Satellite Town', 'Model Town', 'Civil Lines', 'DC Road', 'GT Road'],
    'Sialkot': ['Cantt', 'Paris Road', 'Kashmir Road', 'Hajipura', 'Rangpura'],
    'Sargodha': ['Satellite Town', 'University Road', 'Cantt', 'Kot Momin', 'Bhalwal'],
    'Bahawalpur': ['Model Town', 'Satellite Town', 'Cantt', 'Yazman Road'],
    'Sahiwal': ['Farid Town', 'Model Town', 'Pakpattan Road'],
    'Sheikhupura': ['GT Road', 'Faisalabad Road', 'Model Town'],
    'Jhang': ['Satellite Town', 'Chiniot Road', 'Toba Road'],
    'Rahim Yar Khan': ['Cantt', 'Model Town', 'Khanpur Road'],
    'Kasur': ['GT Road', 'Pattoki Road', 'Model Town'],
    'Gujrat': ['GT Road', 'Bhimber Road', 'Jalalpur Jattan Road'],
    'Jhelum': ['Cantt', 'GT Road', 'Civil Lines'],
    'Mianwali': ['Sargodha Road', 'Isa Khel Road'],
    'Chiniot': ['Jhang Road', 'Faisalabad Road'],
    'Khanewal': ['Multan Road', 'Vehari Road'],
    'Okara': ['GT Road', 'Depalpur Road'],
    'Hafizabad': ['GT Road', 'Pindi Bhattian Road'],
    'Attock': ['Kamra Road', 'Hazro Road', 'GT Road'],
    'Chakwal': ['Talagang Road', 'Rawalpindi Road'],
    'Vehari': ['Multan Road', 'Burewala Road'],
    'Dera Ghazi Khan': ['Cantt', 'City Area', 'Jampur Road'],
    'Bhakkar': ['Darya Khan Road', 'Mankera Road'],
    'Khushab': ['Sargodha Road', 'Jauharabad Road'],
    'Layyah': ['Muzaffargarh Road', 'Chowk Azam'],
    'Lodhran': ['Multan Road', 'Dunyapur Road'],
    'Muzaffargarh': ['Multan Road', 'Kot Addu Road'],
    'Narowal': ['Sialkot Road', 'Shakargarh Road'],
    'Nankana Sahib': ['Lahore Road', 'Shahkot Road'],
    'Pakpattan': ['Sahiwal Road', 'Arifwala Road'],
    'Rajanpur': ['DG Khan Road', 'Jampur Road'],
    'Toba Tek Singh': ['Faisalabad Road', 'Gojra Road'],
    'Mandi Bahauddin': ['Sargodha Road', 'Phalia Road'],
    'Kot Momin': ['Baldiatown', 'Khawajabad', 'Main Bazaar', 'Sargodha Road'],
    'Kamoke': ['GT Road', 'Mandiala Road'],
    'Muridke': ['GT Road', 'Narowal Road'],
    'Wazirabad': ['GT Road', 'Sialkot Road', 'Alipur Chatha'],
    'Taxila': ['Cantt', 'Main Bazaar', 'Wah Road'],
    'Wah Cantt': ['POF', 'Taxila Road', 'Heavy Industries'],
  },
  'Sindh': {
    'Karachi': ['DHA', 'Clifton', 'Gulshan-e-Iqbal', 'North Nazimabad', 'Korangi', 'Malir', 'SITE', 'Saddar', 'FB Area', 'Gulistan-e-Jauhar'],
    'Hyderabad': ['Latifabad', 'Qasimabad', 'City Area'],
    'Sukkur': ['Cantt', 'City Area', 'Airport Road'],
    'Larkana': ['Station Road', 'Naudero Road'],
    'Nawabshah': ['Sakrand Road', 'Station Road'],
    'Mirpur Khas': ['Station Road', 'Digri Road'],
  },
  'KPK': {
    'Peshawar': ['Hayatabad', 'University Town', 'Saddar', 'Cantt', 'Board Bazaar'],
    'Mardan': ['Cantt', 'Shamsi Road', 'Nowshera Road'],
    'Abbottabad': ['Mansehra Road', 'Supply', 'Jinnahabad'],
    'Swat': ['Mingora', 'Saidu Sharif', 'Kabal'],
    'Kohat': ['Cantt', 'Rawalpindi Road'],
    'Dera Ismail Khan': ['Cantt', 'City Area'],
  },
  'Balochistan': {
    'Quetta': ['Cantt', 'Satellite Town', 'Jinnah Road', 'Samungli Road'],
    'Gwadar': ['Port Area', 'City Area'],
    'Turbat': ['Main Bazaar', 'Airport Road'],
    'Hub': ['Hub Chowki', 'Lasbela'],
  },
  'Islamabad': {
    'Islamabad': ['F-6', 'F-7', 'F-8', 'F-10', 'F-11', 'G-6', 'G-7', 'G-8', 'G-9', 'G-10', 'G-11', 'I-8', 'I-9', 'I-10', 'Blue Area', 'DHA', 'Bahria Town'],
  },
  'AJK': {
    'Muzaffarabad': ['City Area', 'CMH Road'],
    'Mirpur': ['Allama Iqbal Road', 'Sector F'],
    'Rawalakot': ['Main Bazaar', 'City Area'],
  },
};

interface DeliveryRate { fee: number; days: string; }

const AdminCityManager = () => {
  const [cityData, setCityData] = useState<Record<string, Record<string, string[]>>>(DEFAULT_DATA);
  const [selectedProvince, setSelectedProvince] = useState('Punjab');
  const [newCity, setNewCity] = useState('');
  const [newArea, setNewArea] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [deliveryRates, setDeliveryRates] = useState<Record<string, DeliveryRate>>({});
  const [rateSearch, setRateSearch] = useState('');
  const [aiLoadingRates, setAiLoadingRates] = useState(false);

  useEffect(() => {
    supabase.from('site_settings').select('*').eq('key', 'city_delivery_rates').maybeSingle().then(({ data }) => {
      if (data?.value && typeof data.value === 'object') setDeliveryRates(data.value as any);
    });
    supabase.from('site_settings').select('*').eq('key', 'city_areas').maybeSingle().then(({ data }) => {
      if (data?.value && typeof data.value === 'object') {
        setCityData(data.value as any);
      }
    });
  }, []);

  const saveData = async () => {
    setSaving(true);
    const { error } = await supabase.from('site_settings').upsert(
      { key: 'city_areas', value: cityData as any },
      { onConflict: 'key' }
    );
    if (error) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '✅ City data saved!' });
    }
    setSaving(false);
  };

  const saveDeliveryRates = async () => {
    setSaving(true);
    const { error } = await supabase.from('site_settings').upsert(
      { key: 'city_delivery_rates', value: deliveryRates as any },
      { onConflict: 'key' }
    );
    if (error) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '✅ Delivery rates saved!' });
    }
    setSaving(false);
  };

  const aiSuggestRates = async () => {
    setAiLoadingRates(true);
    const allCities: string[] = [];
    Object.values(cityData).forEach(prov => { Object.keys(prov).forEach(c => allCities.push(c)); });
    const { data, error } = await supabase.functions.invoke('ai-assistant', {
      body: {
        type: 'admin-assistant',
        messages: [{
          role: 'user',
          content: `You are a logistics pricing expert for Pakistan e-commerce. Suggest delivery fees (PKR) and estimated delivery days for these Pakistani cities based on distance from major hubs (Lahore, Karachi, Islamabad). Return ONLY valid JSON object like:
{"Lahore":{"fee":150,"days":"1-2"},"Karachi":{"fee":300,"days":"4-6"},...}
Cities: ${allCities.slice(0, 50).join(', ')}`
        }],
      },
    });
    if (!error && data?.reply) {
      try {
        const jsonStr = data.reply.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const suggested = JSON.parse(jsonStr);
        setDeliveryRates(prev => ({ ...suggested, ...prev }));
        toast({ title: 'AI suggested delivery rates!', description: 'Review and adjust before saving.' });
      } catch {
        toast({ title: 'Could not parse AI suggestion', variant: 'destructive' });
      }
    }
    setAiLoadingRates(false);
  };

  const addCity = () => {
    if (!newCity.trim()) return;
    setCityData(prev => ({
      ...prev,
      [selectedProvince]: { ...prev[selectedProvince], [newCity.trim()]: [] }
    }));
    setNewCity('');
  };

  const addArea = () => {
    if (!newArea.trim() || !selectedCity) return;
    setCityData(prev => ({
      ...prev,
      [selectedProvince]: {
        ...prev[selectedProvince],
        [selectedCity]: [...(prev[selectedProvince]?.[selectedCity] || []), newArea.trim()]
      }
    }));
    setNewArea('');
  };

  const removeCity = (city: string) => {
    setCityData(prev => {
      const updated = { ...prev[selectedProvince] };
      delete updated[city];
      return { ...prev, [selectedProvince]: updated };
    });
  };

  const removeArea = (city: string, area: string) => {
    setCityData(prev => ({
      ...prev,
      [selectedProvince]: {
        ...prev[selectedProvince],
        [city]: prev[selectedProvince][city].filter(a => a !== area)
      }
    }));
  };

  const provinces = Object.keys(cityData);
  const cities = Object.keys(cityData[selectedProvince] || {}).sort();
  const filteredCities = search ? cities.filter(c => c.toLowerCase().includes(search.toLowerCase())) : cities;

  const allCitiesForRates = Object.entries(cityData).flatMap(([prov, cities]) =>
    Object.keys(cities).map(city => ({ city, province: prov }))
  ).sort((a, b) => a.city.localeCompare(b.city));

  const filteredCitiesForRates = rateSearch
    ? allCitiesForRates.filter(c => c.city.toLowerCase().includes(rateSearch.toLowerCase()) || c.province.toLowerCase().includes(rateSearch.toLowerCase()))
    : allCitiesForRates;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2"><MapPin className="h-5 w-5" /> City & Area Manager</h2>
      </div>

      <Tabs defaultValue="cities">
        <TabsList>
          <TabsTrigger value="cities">Cities & Areas</TabsTrigger>
          <TabsTrigger value="delivery"><Truck className="h-3 w-3 mr-1" />Delivery Rates</TabsTrigger>
        </TabsList>

        <TabsContent value="delivery" className="space-y-4 pt-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-muted-foreground">Set delivery fee (PKR) and estimated days per city</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={aiSuggestRates} disabled={aiLoadingRates}>
                {aiLoadingRates ? <><span className="animate-spin mr-1">⏳</span> AI Suggesting...</> : <><Sparkles className="h-4 w-4 mr-1" /> AI Suggest All</>}
              </Button>
              <Button onClick={saveDeliveryRates} disabled={saving}>{saving ? 'Saving...' : 'Save Rates'}</Button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search city or province..." value={rateSearch} onChange={e => setRateSearch(e.target.value)} className="pl-10" />
          </div>
          <div className="bg-card rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium">City</th>
                  <th className="text-left p-3 font-medium">Province</th>
                  <th className="text-left p-3 font-medium">Fee (PKR)</th>
                  <th className="text-left p-3 font-medium">Days</th>
                </tr>
              </thead>
              <tbody>
                {filteredCitiesForRates.slice(0, 100).map(({ city, province }) => (
                  <tr key={city} className="border-t hover:bg-muted/30">
                    <td className="p-3 font-medium">{city}</td>
                    <td className="p-3 text-muted-foreground text-xs">{province}</td>
                    <td className="p-3">
                      <Input
                        type="number" min="0" className="w-24 h-7 text-xs"
                        placeholder="e.g. 200"
                        value={deliveryRates[city]?.fee ?? ''}
                        onChange={e => setDeliveryRates(prev => ({ ...prev, [city]: { ...prev[city], fee: Number(e.target.value), days: prev[city]?.days || '2-4' } }))}
                      />
                    </td>
                    <td className="p-3">
                      <Input
                        type="text" className="w-20 h-7 text-xs"
                        placeholder="e.g. 2-4"
                        value={deliveryRates[city]?.days ?? ''}
                        onChange={e => setDeliveryRates(prev => ({ ...prev, [city]: { ...prev[city], days: e.target.value, fee: prev[city]?.fee || 200 } }))}
                      />
                    </td>
                  </tr>
                ))}
                {filteredCitiesForRates.length === 0 && (
                  <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No cities found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="cities" className="space-y-4 pt-4">
        <div className="flex justify-end"><Button onClick={saveData} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button></div>

      <div className="flex items-center gap-3 flex-wrap">
        <Select value={selectedProvince} onValueChange={setSelectedProvince}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            {provinces.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search cities..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
      </div>

      {/* Add city */}
      <div className="flex gap-2">
        <Input placeholder="New city name..." value={newCity} onChange={e => setNewCity(e.target.value)} className="max-w-xs" />
        <Button variant="outline" onClick={addCity}><Plus className="h-4 w-4 mr-1" /> Add City</Button>
      </div>

      {/* Add area */}
      <div className="flex gap-2">
        <Select value={selectedCity} onValueChange={setSelectedCity}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Select city" /></SelectTrigger>
          <SelectContent>{cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
        <Input placeholder="New area name..." value={newArea} onChange={e => setNewArea(e.target.value)} className="max-w-xs" />
        <Button variant="outline" onClick={addArea}><Plus className="h-4 w-4 mr-1" /> Add Area</Button>
      </div>

      <div className="bg-card rounded-xl border p-4 space-y-3 max-h-[500px] overflow-y-auto">
        <p className="text-sm font-medium">{selectedProvince} — {filteredCities.length} cities</p>
        {filteredCities.map(city => (
          <div key={city} className="border rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="font-medium text-sm">{city}</p>
              <Button size="sm" variant="ghost" className="text-destructive h-6 w-6 p-0" onClick={() => removeCity(city)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {(cityData[selectedProvince]?.[city] || []).map(area => (
                <span key={area} className="bg-muted px-2 py-1 rounded text-xs flex items-center gap-1">
                  {area}
                  <button onClick={() => removeArea(city, area)} className="text-destructive hover:text-destructive/80">×</button>
                </span>
              ))}
              {(cityData[selectedProvince]?.[city] || []).length === 0 && <span className="text-xs text-muted-foreground">No areas added</span>}
            </div>
          </div>
        ))}
      </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminCityManager;
