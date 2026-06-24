// ============================================================
// Footer — Desktop only (hidden on mobile, BottomNav use hoti hai)
// Contact, links, payment methods aur social links DB se load hote hain
// ============================================================

import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, MessageCircle, Facebook, Instagram } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const Footer = () => {
  const [contact, setContact] = useState({ phone: '', email: '', whatsapp: '', address: '' });
  const [social, setSocial] = useState({ facebook: '', instagram: '', tiktok: '' });
  const [logo, setLogo] = useState({ url: '/favicon.ico', name: 'Our Store' });
  const [tagline, setTagline] = useState("Pakistan's #1 Shoes & Bags Store");

  useEffect(() => {
    supabase.from('site_settings').select('key, value').in('key', ['contact', 'social', 'logo', 'shop_tagline']).then(({ data }) => {
      (data || []).forEach((s: any) => {
        if (s.key === 'contact') setContact(s.value);
        if (s.key === 'social') setSocial(s.value);
        if (s.key === 'logo') setLogo(s.value);
        if (s.key === 'shop_tagline' && s.value) setTagline(String(s.value));
      });
    });
  }, []);

  return (
    <footer className="bg-foreground text-background/80 mt-16 hidden md:block">
      {/* Main Footer */}
      <div className="container py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <img src={logo.url || '/favicon.ico'} alt={logo.name} className="h-9 w-9 rounded-xl object-contain bg-white/10 p-1" />
              <span className="text-background font-bold text-lg">{logo.name}</span>
            </div>
            <p className="text-sm leading-relaxed text-background/70 mb-4">
              {tagline}
            </p>
            <div className="space-y-2 text-sm">
              {contact.phone && (
                <a href={`tel:${contact.phone}`} className="flex items-center gap-2 hover:text-background transition-colors">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-primary" /> {contact.phone}
                </a>
              )}
              {contact.whatsapp && (
                <a href={`https://wa.me/${contact.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-background transition-colors">
                  <MessageCircle className="h-3.5 w-3.5 shrink-0 text-primary" /> WhatsApp
                </a>
              )}
              {contact.email && (
                <a href={`mailto:${contact.email}`} className="flex items-center gap-2 hover:text-background transition-colors">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-primary" /> {contact.email}
                </a>
              )}
              {contact.address && (
                <span className="flex items-start gap-2 text-background/60">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-primary mt-0.5" /> {contact.address}
                </span>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-background mb-4 text-sm uppercase tracking-wider">Quick Links</h4>
            <ul className="space-y-2.5 text-sm">
              {[
                { label: 'Home', to: '/' },
                { label: 'New Arrivals', to: '/new-arrivals' },
                { label: 'Discount Items', to: '/discount-items' },
                { label: 'Flash Sale', to: '/flash-sale' },
                { label: 'All Products', to: '/products' },
              ].map(l => (
                <li key={l.to}>
                  <Link to={l.to} className="hover:text-background hover:translate-x-1 transition-all inline-block">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h4 className="font-semibold text-background mb-4 text-sm uppercase tracking-wider">Customer Service</h4>
            <ul className="space-y-2.5 text-sm">
              {[
                { label: 'Contact Us', to: '/contact' },
                { label: 'FAQs', to: '/faq' },
                { label: 'Return Policy', to: '/return-policy' },
                { label: 'Track Order', to: '/track-order' },
                { label: 'My Account', to: '/my-page' },
              ].map(l => (
                <li key={l.to}>
                  <Link to={l.to} className="hover:text-background hover:translate-x-1 transition-all inline-block">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Payments & Social */}
          <div>
            <h4 className="font-semibold text-background mb-4 text-sm uppercase tracking-wider">We Accept</h4>
            <div className="flex flex-wrap gap-2 mb-6">
              {['💳 Visa', '💳 MasterCard', '🏦 JazzCash', '🏦 EasyPaisa', '📦 COD'].map(item => (
                <span key={item} className="text-xs bg-background/10 hover:bg-background/15 transition-colors px-2.5 py-1 rounded-lg">{item}</span>
              ))}
            </div>

            {(social.facebook || social.instagram || social.tiktok) && (
              <>
                <h4 className="font-semibold text-background mb-3 text-sm uppercase tracking-wider">Follow Us</h4>
                <div className="flex gap-3">
                  {social.facebook && (
                    <a href={social.facebook} target="_blank" rel="noopener noreferrer"
                      className="h-9 w-9 rounded-lg bg-background/10 hover:bg-primary transition-colors flex items-center justify-center">
                      <Facebook className="h-4 w-4" />
                    </a>
                  )}
                  {social.instagram && (
                    <a href={social.instagram} target="_blank" rel="noopener noreferrer"
                      className="h-9 w-9 rounded-lg bg-background/10 hover:bg-primary transition-colors flex items-center justify-center">
                      <Instagram className="h-4 w-4" />
                    </a>
                  )}
                  {social.tiktok && (
                    <a href={social.tiktok} target="_blank" rel="noopener noreferrer"
                      className="h-9 w-9 rounded-lg bg-background/10 hover:bg-primary transition-colors flex items-center justify-center">
                      <span className="text-xs font-bold">TK</span>
                    </a>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-background/10">
        <div className="container py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-background/40">
          <p>© {new Date().getFullYear()} {logo.name}. All rights reserved.</p>
          <p>Developed by <Link to="/developer" className="text-primary font-semibold hover:underline">ASDEVOLPER</Link></p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
