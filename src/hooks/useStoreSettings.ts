// ============================================================
// useStoreSettings — Supabase site_settings table se store config load karta hai
// Global cache use karta hai taake har component alag DB call na kare
// ============================================================

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface StoreSettings {
  brandName: string;        // Store ka naam (header + title mein)
  shopName: string;         // Same as brandName
  shopCategory: string;     // e.g. "Shoes & Bags"
  shopTagline: string;      // Hero section mein tagline
  productLabel: string;     // "Products" ya custom label
  categoryLabel: string;    // "Shoes" ya custom
  deliveryFee: number;      // PKR mein default delivery fee
  freeDeliveryMin: number;  // Is amount se upar free delivery
  faviconUrl: string;       // Browser tab icon URL
  siteTitle: string;        // Browser tab title
}

// Default values — DB se load hone tak ya agar setting missing ho
const DEFAULTS: StoreSettings = {
  brandName: 'My Store',
  shopName: 'My Store',
  shopCategory: 'Shoes & Bags',
  shopTagline: "Pakistan's #1 Shoes & Bags Store",
  productLabel: 'Products',
  categoryLabel: 'Shoes',
  deliveryFee: 200,
  freeDeliveryMin: 3000,
  faviconUrl: '/favicon.ico',
  siteTitle: 'My Store',
};

// Module-level cache — sirf ek baar DB se load karo
let cachedSettings: StoreSettings | null = null;

// Admin settings save karne ke baad cache invalidate karo
export function invalidateStoreSettingsCache() {
  cachedSettings = null;
}

export function useStoreSettings(): StoreSettings {
  const [settings, setSettings] = useState<StoreSettings>(cachedSettings || DEFAULTS);

  useEffect(() => {
    // Cache available hai — DB call mat karo
    if (cachedSettings) return;

    const load = async () => {
      const { data } = await supabase.from('site_settings').select('key, value');
      if (!data) return; // DB error — defaults ke saath chal-te raho

      // Key-value rows ko map mein convert karo
      const map: Record<string, any> = {};
      data.forEach(row => { map[row.key] = row.value; });

      // Logo object se brand name nikalo (fallback chain)
      const logoValue = map.logo || {};
      const brandName = String(logoValue.name || map.shop_name || DEFAULTS.brandName);

      const resolved: StoreSettings = {
        brandName,
        shopName: brandName,
        shopCategory:   String(map.shop_category   || DEFAULTS.shopCategory),
        shopTagline:    String(map.shop_tagline     || DEFAULTS.shopTagline),
        productLabel:   String(map.product_label    || DEFAULTS.productLabel),
        categoryLabel:  String(map.category_label   || DEFAULTS.categoryLabel),
        deliveryFee:    Number(map.delivery_fee     || DEFAULTS.deliveryFee),
        freeDeliveryMin:Number(map.free_delivery_min|| DEFAULTS.freeDeliveryMin),
        faviconUrl:     String(logoValue.url || map.favicon_url || DEFAULTS.faviconUrl),
        siteTitle:      String(map.site_title || brandName || DEFAULTS.siteTitle),
      };

      cachedSettings = resolved;
      setSettings(resolved);
    };

    load();
  }, []);

  return settings;
}
