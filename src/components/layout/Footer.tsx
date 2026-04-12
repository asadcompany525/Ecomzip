import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStoreSettings } from '@/hooks/useStoreSettings';

const Footer = () => {
  const storeSettings = useStoreSettings();
  const [contact, setContact] = useState({ phone: '', email: '', whatsapp: '', address: '' });
  const [social, setSocial] = useState({ facebook: '', instagram: '', tiktok: '' });
  const [logo, setLogo] = useState({ url: '/favicon.ico', name: 'Our Store' });

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('site_settings').select('*');
      (data || []).forEach((s: any) => {
        if (s.key === 'contact') setContact(s.value);
        if (s.key === 'social') setSocial(s.value);
        if (s.key === 'logo') setLogo(s.value);
      });
    };
    load();
  }, []);

  return (
    <footer className="bg-foreground text-background/80 mt-12 hidden md:block">
      <div className="container py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-lg font-bold text-background mb-4 flex items-center gap-2">
              <img src={logo.url || '/favicon.ico'} alt={logo.name} className="h-8 w-8" />
              <span>{logo.name}</span>
            </h3>
            <p className="text-sm leading-relaxed">
              {storeSettings.shopTagline || "Pakistan's #1 online store for quality shoes and bags at the best prices."}
            </p>
            <div className="flex flex-col gap-2 mt-4 text-sm">
              {contact.phone && <span className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> {contact.phone}</span>}
              {contact.email && <span className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> {contact.email}</span>}
              {contact.address && <span className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> {contact.address}</span>}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-background mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-primary transition-colors">Home</Link></li>
              <li><Link to="/new-arrivals" className="hover:text-primary transition-colors">New Arrivals</Link></li>
              <li><Link to="/discount-items" className="hover:text-primary transition-colors">Discount Items</Link></li>
              <li><Link to="/flash-sale" className="hover:text-primary transition-colors">Flash Sale</Link></li>
              <li><Link to="/products" className="hover:text-primary transition-colors">All Products</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-background mb-4">Customer Service</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/contact" className="hover:text-primary transition-colors">Contact Us</Link></li>
              <li><Link to="/faq" className="hover:text-primary transition-colors">FAQs</Link></li>
              <li><Link to="/return-policy" className="hover:text-primary transition-colors">Return Policy</Link></li>
              <li><Link to="/track-order" className="hover:text-primary transition-colors">Track Order</Link></li>
              <li><Link to="/my-page" className="hover:text-primary transition-colors">My Account</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-background mb-4">Payment Methods</h4>
            <div className="flex flex-wrap gap-2">
              {['💳 Visa', '💳 MasterCard', '🏦 JazzCash', '🏦 EasyPaisa', '📦 COD'].map(item => (
                <span key={item} className="text-xs bg-background/10 px-2 py-1 rounded">{item}</span>
              ))}
            </div>
            {(social.facebook || social.instagram || social.tiktok) && (
              <div className="mt-4">
                <h4 className="font-semibold text-background mb-2">Follow Us</h4>
                <div className="flex gap-3 text-sm">
                  {social.facebook && <a href={social.facebook} target="_blank" rel="noopener noreferrer" className="hover:text-primary">Facebook</a>}
                  {social.instagram && <a href={social.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-primary">Instagram</a>}
                  {social.tiktok && <a href={social.tiktok} target="_blank" rel="noopener noreferrer" className="hover:text-primary">TikTok</a>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="border-t border-background/10">
        <div className="container py-4 text-center text-sm text-background/50">
          <p>© 2026 {logo.name}. All rights reserved.</p>
          <p className="mt-1 text-xs">Developed by <Link to="/developer" className="text-primary font-semibold hover:underline">ASDEVOLPER</Link></p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
