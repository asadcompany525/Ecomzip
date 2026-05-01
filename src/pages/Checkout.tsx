import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MapPin, CreditCard, Truck, ChevronRight, ArrowLeft, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useCart } from '@/contexts/CartContext';
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
    'Chailsian': ['City Area'],
    'Chakwal': ['City Area', 'Talagang', 'Choa Saidan Shah', 'Lawa'],
    'Chichawatni': ['City Area', 'Tehsil HQ'],
    'Chiniot': ['City Area', 'Lalian', 'Bhowana'],
    'Chishtian': ['City Area', 'Tehsil HQ'],
    'Choa Saidan Shah': ['City Area'],
    'Chunian': ['City Area', 'Tehsil HQ'],
    'Darya Khan': ['City Area'],
    'Daska': ['City Area', 'Tehsil HQ'],
    'Depalpur': ['City Area', 'Tehsil HQ'],
    'Dera Ghazi Khan': ['City Area', 'Taunsa Sharif', 'Tribal Area'],
    'Dina': ['City Area', 'Tehsil HQ'],
    'Dunyapur': ['City Area', 'Tehsil HQ'],
    'Faisalabad': ['D Ground', 'Peoples Colony', 'Madina Town', 'Ghulam Muhammad Abad', 'Jinnah Colony', 'Samanabad', 'Kohinoor City', 'Jaranwala', 'Tandlianwala', 'Sammundri'],
    'Fateh Jang': ['City Area'],
    'Fazilpur': ['City Area'],
    'Fort Abbas': ['City Area'],
    'Ghakhar Mandi': ['City Area'],
    'Gojra': ['City Area', 'Tehsil HQ'],
    'Gujar Khan': ['City Area', 'Tehsil HQ'],
    'Gujranwala': ['Satellite Town', 'Model Town', 'Civil Lines', 'DC Road', 'Trust Plaza', 'Peoples Colony', 'Kamoke', 'Nowshera Virkan', 'Wazirabad'],
    'Gujrat': ['Bhimber Road', 'GT Road', 'Jalalpur Jattan Road', 'Sadar Bazaar', 'Kharian', 'Sarai Alamgir'],
    'Hafizabad': ['City Area', 'Pindi Bhattian', 'Sukheke'],
    'Haroonabad': ['City Area'],
    'Hasilpur': ['City Area'],
    'Hasan Abdal': ['City Area'],
    'Hazro': ['City Area'],
    'Hujra Shah Muqeem': ['City Area'],
    'Isa Khel': ['City Area'],
    'Jampur': ['City Area'],
    'Jaranwala': ['City Area', 'Tehsil HQ'],
    'Jauharabad': ['City Area'],
    'Jhang': ['City Area', 'Shorkot', 'Ahmedpur Sial', '18 Hazari'],
    'Jhelum': ['Cantt', 'Sadar Bazaar', 'Civil Lines', 'GT Road', 'Dina', 'Pind Dadan Khan'],
    'Kallar Kahar': ['City Area'],
    'Kamalia': ['City Area', 'Tehsil HQ'],
    'Kamoke': ['City Area'],
    'Kasur': ['Kot Radha Kishan', 'Pattoki', 'City Area', 'Allahabad', 'Phool Nagar'],
    'Khanewal': ['City Area', 'Kabirwala', 'Mian Channu', 'Jahanian'],
    'Khanpur': ['City Area'],
    'Kharian': ['City Area'],
    'Khushab': ['City Area', 'Jauharabad', 'Noor Pur Thal', 'Quaidabad'],
    'Kot Addu': ['City Area'],
    'Kot Momin': ['City Area', 'Tehsil HQ'],
    'Lahore': ['Gulberg', 'DHA', 'Model Town', 'Johar Town', 'Bahria Town', 'Cantt', 'Wapda Town', 'Iqbal Town', 'Township', 'Allama Iqbal Town', 'Sabzazar', 'Garden Town', 'Faisal Town', 'Shahdara', 'Mughalpura', 'Ichhra', 'Anarkali', 'Valencia', 'EME Society', 'Askari'],
    'Lalamusa': ['City Area'],
    'Layyah': ['City Area', 'Karor Lal Esan', 'Chowk Azam'],
    'Liaquatpur': ['City Area'],
    'Lodhran': ['City Area', 'Kahror Pacca', 'Dunyapur'],
    'Mailsi': ['City Area'],
    'Mandi Bahauddin': ['City Area', 'Phalia', 'Malakwal'],
    'Mankera': ['City Area'],
    'Mian Channu': ['City Area'],
    'Mianwali': ['City Area', 'Piplan', 'Isa Khel'],
    'Minchinabad': ['City Area'],
    'Multan': ['Cantt', 'Bosan Road', 'Shah Rukn-e-Alam', 'Gulgasht Colony', 'New Multan', 'Wapda Town', 'Garden Town', 'Shujabad', 'Jalalpur Pirwala'],
    'Muridke': ['City Area'],
    'Murree': ['City Area', 'Mall Road', 'Bhurban'],
    'Muzaffargarh': ['City Area', 'Kot Addu', 'Alipur', 'Jatoi'],
    'Nankana Sahib': ['City Area', 'Shahkot', 'Sangla Hill'],
    'Narowal': ['City Area', 'Shakargarh', 'Zafarwal'],
    'Noorpur Thal': ['City Area'],
    'Nowshera Virkan': ['City Area'],
    'Okara': ['Depalpur', 'Renala Khurd', 'City Area', 'Hujra Shah Muqeem'],
    'Pakpattan': ['City Area', 'Arifwala'],
    'Pasrur': ['City Area'],
    'Pattoki': ['City Area'],
    'Phalia': ['City Area'],
    'Pindi Bhattian': ['City Area'],
    'Pindigheb': ['City Area'],
    'Pir Mahal': ['City Area'],
    'Quaidabad': ['City Area'],
    'Rahim Yar Khan': ['Khanpur', 'Sadiqabad', 'City Area', 'Liaquatpur'],
    'Raiwind': ['City Area'],
    'Rajanpur': ['City Area', 'Jampur', 'Rojhan'],
    'Rawalpindi': ['Saddar', 'Satellite Town', 'Bahria Town', 'DHA', 'Chaklala', 'Westridge', 'Adiala Road', 'Commercial Market', 'Shamsabad', 'Taxila', 'Wah Cantt', 'Gujar Khan'],
    'Renala Khurd': ['City Area'],
    'Rojhan': ['City Area'],
    'Sadiqabad': ['City Area'],
    'Safdarabad': ['City Area'],
    'Sahiwal': ['Farid Town', 'Model Town', 'High Court Road', 'Railway Road', 'Chichawatni'],
    'Sambrial': ['City Area'],
    'Samundri': ['City Area'],
    'Sangla Hill': ['City Area'],
    'Sargodha': ['Cantt', 'Satellite Town', 'University Road', 'Block 22', 'Sillanwali Road', 'Bhalwal', 'Shahpur', 'Kot Momin'],
    'Shahkot': ['City Area'],
    'Shakargarh': ['City Area'],
    'Sheikhupura': ['Faisal Town', 'Canal Road', 'GT Road', 'Farooq-e-Azam Road', 'Muridke', 'Ferozwala'],
    'Shorkot': ['City Area'],
    'Shujaabad': ['City Area'],
    'Sialkot': ['Cantt', 'Paris Road', 'Kashmir Road', 'Allama Iqbal Road', 'Model Town', 'Defence Road', 'Daska', 'Sambrial', 'Pasrur'],
    'Sohawa': ['City Area'],
    'Talagang': ['City Area'],
    'Tandlianwala': ['City Area'],
    'Taunsa Sharif': ['City Area'],
    'Taxila': ['City Area'],
    'Toba Tek Singh': ['City Area', 'Gojra', 'Kamalia', 'Pir Mahal'],
    'Vehari': ['City Area', 'Burewala', 'Mailsi'],
    'Wah Cantt': ['City Area', 'POF', 'HMC'],
    'Wazirabad': ['City Area'],
    'Yazman': ['City Area'],
    'Zafarwal': ['City Area'],
  },
  'Sindh': {
    'Karachi': ['DHA', 'Clifton', 'Gulshan-e-Iqbal', 'North Nazimabad', 'Malir', 'Korangi', 'PECHS', 'Saddar', 'Gulistan-e-Jauhar', 'Scheme 33', 'Nazimabad', 'Lyari', 'Orangi', 'Landhi', 'Shah Faisal'],
    'Hyderabad': ['Latifabad', 'Qasimabad', 'City Area', 'Heerabad'],
    'Sukkur': ['City Area', 'New Sukkur', 'Rohri'],
    'Larkana': ['City Area', 'Ratodero', 'Dokri'],
    'Nawabshah': ['City Area', 'Sakrand'],
    'Mirpur Khas': ['City Area', 'Digri'],
    'Thatta': ['City Area', 'Makli'],
    'Badin': ['City Area', 'Tando Bago'],
    'Jacobabad': ['City Area', 'Thul'],
    'Shikarpur': ['City Area', 'Lakhi'],
    'Dadu': ['City Area', 'Sehwan'],
    'Khairpur': ['City Area', 'Gambat'],
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
    'Swabi': ['City Area', 'Lahor'],
    'Charsadda': ['City Area', 'Tangi', 'Shabqadar'],
    'Nowshera': ['City Area', 'Pabbi', 'Risalpur'],
    'Dir Lower': ['Timergara', 'Balambat'],
    'Dir Upper': ['Dir', 'Sheringal'],
    'Chitral': ['City Area', 'Drosh'],
    'Buner': ['Daggar', 'Elai'],
    'Shangla': ['Alpuri', 'Bisham'],
    'Battagram': ['City Area', 'Allai'],
    'Malakand': ['Batkhela', 'Dargai'],
  },
  'Balochistan': {
    'Quetta': ['Cantt', 'Satellite Town', 'Jinnah Town', 'Samungli Road', 'Sariab Road'],
    'Gwadar': ['City Area', 'East Bay'],
    'Turbat': ['City Area'],
    'Khuzdar': ['City Area'],
    'Hub': ['City Area', 'Lasbela'],
    'Chaman': ['City Area'],
    'Sibi': ['City Area'],
    'Zhob': ['City Area'],
    'Loralai': ['City Area'],
    'Pishin': ['City Area'],
    'Kalat': ['City Area'],
    'Mastung': ['City Area'],
  },
  'Islamabad': {
    'Islamabad': ['F-6', 'F-7', 'F-8', 'F-10', 'F-11', 'G-9', 'G-10', 'G-11', 'G-13', 'I-8', 'I-10', 'I-14', 'I-16', 'Bahria Town', 'DHA', 'PWD', 'Gulberg Greens', 'B-17', 'E-11', 'D-12', 'H-13'],
  },
  'AJK': {
    'Muzaffarabad': ['City Area', 'Chattar', 'Garhi Dupatta'],
    'Mirpur': ['City Area', 'Bhimber', 'Kotli', 'Dadyal'],
    'Rawalakot': ['City Area', 'Bagh', 'Pallandri'],
    'Neelum': ['Athmuqam', 'Sharda', 'Kel'],
    'Haveli': ['Forward Kahuta'],
    'Hattian Bala': ['City Area'],
  },
  'Gilgit-Baltistan': {
    'Gilgit': ['City Area', 'Jutial', 'Danyore'],
    'Skardu': ['City Area', 'Shigar'],
    'Hunza': ['Karimabad', 'Aliabad'],
    'Nagar': ['City Area'],
    'Ghizer': ['Gahkuch', 'Phander'],
    'Diamer': ['Chilas', 'Darel'],
    'Astore': ['City Area'],
    'Kharmang': ['Olding'],
  },
};

const DEFAULT_DELIVERY_FEE = 200;

type LocationData = Record<string, Record<string, string[]>>;
type DeliveryRates = Record<string, { fee: number; days: string }>;

const parseDays = (daysStr: string): { min: number; max: number } => {
  if (!daysStr) return { min: 3, max: 5 };
  const parts = daysStr.split('-').map(s => parseInt(s.trim(), 10));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) return { min: parts[0], max: parts[1] };
  if (parts.length === 1 && !isNaN(parts[0])) return { min: parts[0], max: parts[0] };
  return { min: 3, max: 5 };
};

const Checkout = () => {
  const navigate = useNavigate();
  const { items, cartTotal, clearCart } = useCart();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [saveAddress, setSaveAddress] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [locationData, setLocationData] = useState<LocationData>(PROVINCES);
  const [deliveryRates, setDeliveryRates] = useState<DeliveryRates>({});
  const [deliveryFee, setDeliveryFee] = useState(DEFAULT_DELIVERY_FEE);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');
  const [fullAddress, setFullAddress] = useState('');

  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [transactionId, setTransactionId] = useState('');
  const [paymentProofUrl, setPaymentProofUrl] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [notes, setNotes] = useState('');

  const total = cartTotal - promoDiscount + deliveryFee;

  const getDeliveryDays = (): { min: number; max: number } => {
    if (city && deliveryRates[city]?.days) {
      return parseDays(deliveryRates[city].days);
    }
    if (!province) return { min: 3, max: 5 };
    const fast = ['Punjab', 'Islamabad', 'Federal'];
    const medium = ['KPK', 'Sindh', 'Khyber Pakhtunkhwa'];
    const slow = ['Balochistan', 'AJK', 'Azad Kashmir', 'Gilgit-Baltistan'];
    if (fast.includes(province)) return { min: 2, max: 4 };
    if (slow.includes(province)) return { min: 5, max: 8 };
    if (medium.includes(province)) return { min: 3, max: 5 };
    return { min: 3, max: 6 };
  };

  const getEstimatedDelivery = () => {
    const { max } = getDeliveryDays();
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + max);
    const fmt = (d: Date) => d.toLocaleDateString('en-PK', { day: 'numeric', month: 'long' });
    return `${fmt(today)} – ${fmt(endDate)}`;
  };

  // Update delivery fee + days whenever city or rates change
  useEffect(() => {
    if (city && deliveryRates[city]) {
      setDeliveryFee(deliveryRates[city].fee || DEFAULT_DELIVERY_FEE);
    } else if (!city) {
      setDeliveryFee(DEFAULT_DELIVERY_FEE);
    }
  }, [city, deliveryRates]);

  useEffect(() => {
    // Load city data from CityManager (site_settings), fall back to hardcoded PROVINCES
    supabase.from('site_settings').select('value').eq('key', 'city_areas').maybeSingle().then(({ data }) => {
      if (data?.value && typeof data.value === 'object') {
        setLocationData(data.value as LocationData);
      }
    });

    // Load city delivery rates
    supabase.from('site_settings').select('value').eq('key', 'city_delivery_rates').maybeSingle().then(({ data }) => {
      if (data?.value && typeof data.value === 'object') {
        setDeliveryRates(data.value as DeliveryRates);
      }
    });

    // Load payment methods
    supabase.from('payment_methods').select('*').eq('is_active', true).order('sort_order').then(({ data }) => {
      setPaymentMethods(data || []);
    });

    if (user) {
      supabase.from('addresses').select('*').eq('user_id', user.id).order('is_default', { ascending: false })
        .then(({ data }) => {
          setSavedAddresses(data || []);
          const def = (data || []).find(a => a.is_default);
          if (def) {
            loadAddress(def);
            setSelectedAddressId(def.id);
          }
        });
    }
  }, [user]);

  const loadAddress = (addr: any) => {
    setFullName(addr.full_name); setPhone(addr.phone);
    setWhatsapp(addr.whatsapp || ''); setEmail(addr.email || '');
    setProvince(addr.province); setCity(addr.city);
    setArea(addr.area); setFullAddress(addr.full_address);
    setSelectedAddressId(addr.id);
  };

  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingProof(true);
    const path = `payment-proofs/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('returns').upload(path, file);
    if (!error) {
      const { data } = supabase.storage.from('returns').getPublicUrl(path);
      setPaymentProofUrl(data.publicUrl);
      toast({ title: 'Screenshot uploaded!' });
    }
    setUploadingProof(false);
  };

  const applyPromo = async () => {
    if (!promoCode.trim()) return;
    const { data } = await supabase.from('promo_codes').select('*').eq('code', promoCode.toUpperCase()).eq('is_active', true).maybeSingle();
    if (!data) { toast({ title: 'Invalid promo code', variant: 'destructive' }); return; }
    if (data.min_order && cartTotal < Number(data.min_order)) { toast({ title: `Minimum order Rs. ${data.min_order}`, variant: 'destructive' }); return; }
    const disc = data.discount_type === 'percentage' ? (cartTotal * Number(data.discount_value)) / 100 : Number(data.discount_value);
    setPromoDiscount(disc);
    toast({ title: `Promo applied! Save Rs. ${disc.toLocaleString()}` });
  };

  const placeOrder = async () => {
    if (!user) { toast({ title: 'Please login first', variant: 'destructive' }); navigate('/login'); return; }
    if (!fullName || !phone || !province || !city || !area || !fullAddress) { toast({ title: 'Fill all address fields', variant: 'destructive' }); return; }
    // Validate Pakistani phone number format
    const pkPhoneRegex = /^(03\d{9}|\+923\d{9})$/;
    if (!pkPhoneRegex.test(phone.replace(/\s/g, ''))) {
      toast({ title: 'Invalid phone number', description: 'Please enter a valid Pakistani number (e.g. 03001234567)', variant: 'destructive' });
      return;
    }
    // Validate WhatsApp differs from phone
    if (whatsapp && whatsapp.replace(/\s/g, '') === phone.replace(/\s/g, '')) {
      toast({ title: 'Phone & WhatsApp must be different', description: 'Please enter a different number for WhatsApp.', variant: 'destructive' });
      return;
    }
    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ title: 'Invalid email address', description: 'Please enter a valid email (e.g. example@gmail.com)', variant: 'destructive' });
      return;
    }
    if (paymentMethod !== 'cod' && !transactionId) { toast({ title: 'Enter transaction ID', variant: 'destructive' }); return; }

    // Check account verification
    const { data: otpData } = await supabase
      .from('otp_verifications')
      .select('verified')
      .eq('email', user.email?.toLowerCase() || '')
      .maybeSingle();
    if (otpData && !otpData.verified) {
      toast({ title: 'Account Not Verified', description: 'Please verify your email before placing an order. Check your inbox for the OTP.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      if (saveAddress) {
        await supabase.from('addresses').upsert({
          user_id: user.id, full_name: fullName, phone, whatsapp: whatsapp || null, email: email || null,
          province, city, area, full_address: fullAddress, is_default: true,
        }, { onConflict: 'user_id' });
      }

      const { data: order, error } = await supabase.from('orders').insert({
        user_id: user.id, order_number: '', subtotal: cartTotal,
        delivery_fee: deliveryFee, discount_amount: promoDiscount,
        total, payment_method: paymentMethod as any,
        status: paymentMethod === 'cod' ? 'confirmed' : 'pending',
        payment_status: paymentMethod === 'cod' ? 'pending' : 'pending',
        promo_code: promoCode || null,
        notes: [notes, paymentProofUrl ? `Payment Proof: ${paymentProofUrl}` : '', transactionId ? `TxID: ${transactionId}` : ''].filter(Boolean).join('\n') || null,
        address_snapshot: { fullName, phone, whatsapp, email, province, city, area, fullAddress },
      }).select().single();

      if (error) throw error;

      // Find matching variant_id for stock decrease trigger
      const orderItems = await Promise.all(items.map(async (i) => {
        let variantId = null;
        if (i.selectedSize || i.selectedColor) {
          let vQuery = supabase.from('product_variants').select('id').eq('product_id', i.product.id);
          if (i.selectedSize) vQuery = vQuery.eq('size', i.selectedSize);
          if (i.selectedColor) vQuery = vQuery.eq('color', i.selectedColor);
          const { data: vData } = await vQuery.gt('stock', 0).limit(1).maybeSingle();
          variantId = vData?.id || null;
        }
        return {
          order_id: order.id, product_id: i.product.id || null, title: i.product.name,
          price: i.product.price, quantity: i.quantity,
          size: i.selectedSize || null, color: i.selectedColor || null,
          image: i.product.image, variant_id: variantId,
        };
      }));
      await supabase.from('order_items').insert(orderItems);

      clearCart();
      toast({ title: 'Order placed!', description: `Order #${order.order_number}` });
      navigate(`/order-success/${order.id}`);
    } catch (e: any) {
      toast({ title: 'Order failed', description: e.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  if (items.length === 0) { navigate('/cart'); return null; }

  // Get selected payment method details
  const selectedPM = paymentMethods.find(pm => pm.type === paymentMethod || pm.name.toLowerCase().includes(paymentMethod));

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      
      <main className="container py-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1 p-0 h-auto"><ArrowLeft className="h-4 w-4" /> Back</Button>
          <span>/</span>
          <Link to="/">Home</Link><ChevronRight className="h-3 w-3" /><Link to="/cart">Cart</Link><ChevronRight className="h-3 w-3" /><span className="text-foreground">Checkout</span>
        </div>

        <div className="flex items-center gap-2 mb-6">
          {[{ n: 1, l: 'Address', i: MapPin }, { n: 2, l: 'Payment', i: CreditCard }, { n: 3, l: 'Review', i: Truck }].map(s => (
            <button key={s.n} onClick={() => s.n < step && setStep(s.n)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${step >= s.n ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              <s.i className="h-4 w-4" />{s.l}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {step === 1 && (
              <div className="bg-card rounded-xl border p-6 space-y-4">
                <h2 className="text-lg font-bold flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" />Delivery Address</h2>
                
                {savedAddresses.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Saved Addresses:</p>
                    <div className="grid gap-2">
                      {savedAddresses.map(a => (
                        <button key={a.id} onClick={() => loadAddress(a)}
                          className={`text-left text-xs border rounded-lg p-3 transition-colors ${selectedAddressId === a.id ? 'border-primary bg-primary/5' : 'hover:bg-accent'}`}>
                          <p className="font-medium">{a.full_name} · {a.phone}</p>
                          <p className="text-muted-foreground">{a.full_address}, {a.area}, {a.city}, {a.province}</p>
                          {a.is_default && <span className="text-primary text-[10px] font-semibold">DEFAULT</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-4">
                  <div><Label>Full Name *</Label><Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Full name" className="mt-1" required /></div>
                  <div>
                    <Label>Phone *</Label>
                    <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="03001234567" className={`mt-1 ${phone && !/^(03\d{9}|\+923\d{9})$/.test(phone.replace(/\s/g,'')) ? 'border-red-400 focus-visible:ring-red-300' : ''}`} required />
                    {phone && !/^(03\d{9}|\+923\d{9})$/.test(phone.replace(/\s/g,'')) && <p className="text-xs text-red-500 mt-0.5">Enter Pakistani number e.g. 03001234567</p>}
                  </div>
                  <div>
                    <Label>WhatsApp (Optional)</Label>
                    <Input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="Different WhatsApp number" className={`mt-1 ${whatsapp && whatsapp.replace(/\s/g,'') === phone.replace(/\s/g,'') ? 'border-red-400 focus-visible:ring-red-300' : ''}`} />
                    {whatsapp && whatsapp.replace(/\s/g,'') === phone.replace(/\s/g,'') && <p className="text-xs text-red-500 mt-0.5">WhatsApp must be different from Phone</p>}
                  </div>
                  <div>
                    <Label>Email (Optional)</Label>
                    <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="example@gmail.com" className={`mt-1 ${email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'border-red-400 focus-visible:ring-red-300' : ''}`} />
                    {email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && <p className="text-xs text-red-500 mt-0.5">Enter a valid email address</p>}
                  </div>
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <Label>Province *</Label>
                    <Select value={province} onValueChange={v => { setProvince(v); setCity(''); setArea(''); }}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{Object.keys(locationData).sort().map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>City/District *</Label>
                    <Select value={city} onValueChange={v => { setCity(v); setArea(''); }} disabled={!province}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{province && Object.keys(locationData[province] || {}).sort().map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Area/Tehsil *</Label>
                    <Select value={area} onValueChange={setArea} disabled={!city}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{city && province && (locationData[province]?.[city] || []).map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Full Address *</Label><Textarea value={fullAddress} onChange={e => setFullAddress(e.target.value)} placeholder="House #, Street, Landmark..." className="mt-1" /></div>

                {province && (
                  <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2">
                    <Truck className="h-4 w-4 text-green-600 shrink-0" />
                    <div>
                      <span className="text-sm font-medium text-green-700 dark:text-green-400">
                        Expected Delivery: {getEstimatedDelivery()}
                      </span>
                      <p className="text-xs text-green-600 dark:text-green-500">
                        {city && deliveryRates[city]?.days
                          ? `${deliveryRates[city].days} working days`
                          : `${getDeliveryDays().min}–${getDeliveryDays().max} working days`
                        } · {city || province}
                        {city && deliveryRates[city]?.fee ? ` · Rs. ${deliveryRates[city].fee} delivery` : ''}
                      </p>
                    </div>
                  </div>
                )}

                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={saveAddress} onCheckedChange={(v) => setSaveAddress(!!v)} />
                  Save this address for future orders
                </label>
                <Button onClick={() => {
                  const pkPhoneRegex = /^(03\d{9}|\+923\d{9})$/;
                  if (!pkPhoneRegex.test(phone.replace(/\s/g, ''))) {
                    toast({ title: 'Invalid phone number', description: 'Enter a valid Pakistani number e.g. 03001234567', variant: 'destructive' });
                    return;
                  }
                  if (whatsapp && whatsapp.replace(/\s/g, '') === phone.replace(/\s/g, '')) {
                    toast({ title: 'Phone & WhatsApp must be different', description: 'Enter a different WhatsApp number.', variant: 'destructive' });
                    return;
                  }
                  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                    toast({ title: 'Invalid email', description: 'Enter a valid email address.', variant: 'destructive' });
                    return;
                  }
                  setStep(2);
                }} className="w-full h-11" disabled={!fullName || !phone || !province || !city || !area || !fullAddress}>Continue to Payment</Button>
              </div>
            )}

            {step === 2 && (
              <div className="bg-card rounded-xl border p-6 space-y-4">
                <h2 className="text-lg font-bold flex items-center gap-2"><CreditCard className="h-5 w-5 text-primary" />Payment Method</h2>
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-3">
                  <label className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${paymentMethod === 'cod' ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`}>
                    <RadioGroupItem value="cod" /><div><p className="font-medium text-sm">📦 Cash on Delivery (COD)</p><p className="text-xs text-muted-foreground">Pay when you receive your order</p></div>
                  </label>
                  {paymentMethods.filter(pm => pm.type !== 'cod').map(pm => (
                    <label key={pm.id} className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${paymentMethod === pm.type ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`}>
                      <RadioGroupItem value={pm.type} />
                      <div className="flex-1">
                        <p className="font-medium text-sm">🏦 {pm.name}</p>
                        <p className="text-xs text-muted-foreground">{pm.additional_info || `Transfer to ${pm.name} account`}</p>
                      </div>
                    </label>
                  ))}
                  {paymentMethods.length === 0 && (
                    <>
                      {[
                        { v: 'jazzcash', l: '🏦 JazzCash', d: 'Transfer to JazzCash account' },
                        { v: 'easypaisa', l: '🏦 EasyPaisa', d: 'Transfer to EasyPaisa account' },
                        { v: 'bank_transfer', l: '🏦 Bank Transfer', d: 'Direct bank transfer' },
                      ].map(m => (
                        <label key={m.v} className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${paymentMethod === m.v ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`}>
                          <RadioGroupItem value={m.v} /><div><p className="font-medium text-sm">{m.l}</p><p className="text-xs text-muted-foreground">{m.d}</p></div>
                        </label>
                      ))}
                    </>
                  )}
                </RadioGroup>

                {/* Show payment account details when non-COD method selected */}
                {paymentMethod !== 'cod' && (() => {
                  const activePM = paymentMethods.find(pm => pm.type === paymentMethod);
                  return activePM ? (
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-2">
                      <p className="text-sm font-bold text-primary">💳 Payment Details — {activePM.name}</p>
                      {activePM.account_name && <p className="text-sm"><span className="text-muted-foreground">Account Holder:</span> <strong>{activePM.account_name}</strong></p>}
                      {activePM.account_number && <p className="text-sm"><span className="text-muted-foreground">Account No:</span> <strong className="font-mono">{activePM.account_number}</strong></p>}
                      {activePM.additional_info && <p className="text-xs text-muted-foreground">{activePM.additional_info}</p>}
                    </div>
                  ) : null;
                })()}

                {paymentMethod !== 'cod' && (
                  <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                    <p className="text-sm font-medium">Transfer payment and enter transaction details:</p>
                    <div><Label>Transaction ID *</Label><Input value={transactionId} onChange={e => setTransactionId(e.target.value)} placeholder="Enter transaction ID" className="mt-1" /></div>
                    <div><Label>Sender Name</Label><Input placeholder="Your account holder name" className="mt-1" /></div>
                    <div>
                      <Label>Payment Screenshot (optional)</Label>
                      <div className="mt-1 flex gap-2 items-center">
                        <label className="flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer hover:bg-accent text-sm">
                          <Upload className="h-4 w-4" /> {uploadingProof ? 'Uploading...' : 'Upload Screenshot'}
                          <input type="file" accept="image/*" className="hidden" onChange={handleProofUpload} />
                        </label>
                        {paymentProofUrl && <img src={paymentProofUrl} alt="" className="h-12 w-12 rounded object-cover border" />}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">⚠️ Admin will verify your payment before confirming.</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <Input value={promoCode} onChange={e => setPromoCode(e.target.value)} placeholder="Promo code" />
                  <Button variant="outline" onClick={applyPromo}>Apply</Button>
                </div>
                <div><Label>Order Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Special instructions..." className="mt-1" rows={2} /></div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                  <Button onClick={() => setStep(3)} className="flex-1 h-11" disabled={paymentMethod !== 'cod' && !transactionId}>Review Order</Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="bg-card rounded-xl border p-6 space-y-4">
                <h2 className="text-lg font-bold flex items-center gap-2"><Truck className="h-5 w-5 text-primary" />Review & Place Order</h2>
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm font-medium mb-1">📍 Delivery Address</p>
                  <p className="text-sm">{fullName} · {phone}</p>
                  {whatsapp && <p className="text-xs text-muted-foreground">WhatsApp: {whatsapp}</p>}
                  <p className="text-xs text-muted-foreground">{fullAddress}, {area}, {city}, {province}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm font-medium mb-1">💳 Payment: {paymentMethod === 'cod' ? 'Cash on Delivery' : paymentMethod.replace('_', ' ').toUpperCase()}</p>
                  {transactionId && <p className="text-xs text-muted-foreground">Transaction ID: {transactionId}</p>}
                  {paymentProofUrl && <img src={paymentProofUrl} alt="proof" className="mt-2 h-20 rounded border" />}
                </div>
                <div className="divide-y">
                  {items.map(item => (
                    <div key={item.product.id} className="flex gap-3 py-3">
                      <img src={item.product.image} alt="" className="w-14 h-14 rounded-lg object-cover" />
                      <div className="flex-1">
                        <p className="text-sm font-medium line-clamp-1">{item.product.name}</p>
                        <p className="text-xs text-muted-foreground">{item.selectedSize && `Size: ${item.selectedSize}`} {item.selectedColor && `· Color: ${item.selectedColor}`} · Qty: {item.quantity}</p>
                      </div>
                      <p className="text-sm font-bold">Rs. {(item.product.price * item.quantity).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                  <Button onClick={placeOrder} className="flex-1 h-12 text-base font-bold" disabled={loading}>
                    {loading ? 'Placing Order...' : `Place Order · Rs. ${total.toLocaleString()}`}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-card rounded-xl border p-6 h-fit sticky top-28">
            <h3 className="font-bold text-lg mb-4">Order Summary</h3>
            <div className="space-y-2 text-sm">
              {items.map(item => (
                <div key={item.product.id} className="flex justify-between">
                  <span className="text-muted-foreground truncate max-w-[60%]">{item.product.name} × {item.quantity}</span>
                  <span>Rs. {(item.product.price * item.quantity).toLocaleString()}</span>
                </div>
              ))}
              <div className="border-t pt-2 flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>Rs. {cartTotal.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Delivery{city && deliveryRates[city] ? ` (${city})` : ''}</span><span>Rs. {deliveryFee.toLocaleString()}</span></div>
              {promoDiscount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-Rs. {promoDiscount.toLocaleString()}</span></div>}
              <div className="border-t pt-2 flex justify-between font-bold text-base"><span>Total</span><span className="text-primary">Rs. {total.toLocaleString()}</span></div>
            </div>
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default Checkout;
