import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface StoreSettings {
  brandName: string;
  shopName: string;
  shopCategory: string;
  shopTagline: string;
  productLabel: string;
  categoryLabel: string;
  deliveryFee: number;
  freeDeliveryMin: number;
  faviconUrl: string;
  siteTitle: string;
}

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

let cachedSettings: StoreSettings | null = null;
const listeners: Array<(s: StoreSettings) => void> = [];

export function invalidateStoreSettingsCache() {
  cachedSettings = null;
}

export function useStoreSettings(): StoreSettings {
  const [settings, setSettings] = useState<StoreSettings>(cachedSettings || DEFAULTS);

  useEffect(() => {
    if (cachedSettings) return;
    const load = async () => {
      const { data } = await supabase.from('site_settings').select('key, value');
      if (!data) return;
      const map: Record<string, any> = {};
      data.forEach(row => { map[row.key] = row.value; });

      const logoValue = map.logo || {};
      const brandName = String(logoValue.name || map.shop_name || DEFAULTS.brandName);

      const resolved: StoreSettings = {
        brandName,
        shopName: brandName,
        shopCategory: String(map.shop_category || DEFAULTS.shopCategory),
        shopTagline: String(map.shop_tagline || DEFAULTS.shopTagline),
        productLabel: String(map.product_label || DEFAULTS.productLabel),
        categoryLabel: String(map.category_label || DEFAULTS.categoryLabel),
        deliveryFee: Number(map.delivery_fee || DEFAULTS.deliveryFee),
        freeDeliveryMin: Number(map.free_delivery_min || DEFAULTS.freeDeliveryMin),
        faviconUrl: String(logoValue.url || map.favicon_url || DEFAULTS.faviconUrl),
        siteTitle: String(map.site_title || brandName || DEFAULTS.siteTitle),
      };
      cachedSettings = resolved;
      setSettings(resolved);
      listeners.forEach(fn => fn(resolved));
    };
    load();
  }, []);

  return settings;
}
