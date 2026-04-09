import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface StoreSettings {
  shopName: string;
  shopCategory: string;
  shopTagline: string;
  productLabel: string;
  categoryLabel: string;
  deliveryFee: number;
  freeDeliveryMin: number;
}

const DEFAULTS: StoreSettings = {
  shopName: 'Stopy Shoes',
  shopCategory: 'Shoes & Bags',
  shopTagline: "Pakistan's #1 Shoes & Bags Store",
  productLabel: 'Products',
  categoryLabel: 'Shoes',
  deliveryFee: 200,
  freeDeliveryMin: 3000,
};

let cachedSettings: StoreSettings | null = null;
const listeners: Array<(s: StoreSettings) => void> = [];

export function useStoreSettings(): StoreSettings {
  const [settings, setSettings] = useState<StoreSettings>(cachedSettings || DEFAULTS);

  useEffect(() => {
    if (cachedSettings) return;
    const load = async () => {
      const { data } = await supabase.from('site_settings').select('key, value');
      if (!data) return;
      const map: Record<string, any> = {};
      data.forEach(row => { map[row.key] = row.value; });

      const resolved: StoreSettings = {
        shopName: String(map.shop_name || DEFAULTS.shopName),
        shopCategory: String(map.shop_category || DEFAULTS.shopCategory),
        shopTagline: String(map.shop_tagline || DEFAULTS.shopTagline),
        productLabel: String(map.product_label || DEFAULTS.productLabel),
        categoryLabel: String(map.category_label || DEFAULTS.categoryLabel),
        deliveryFee: Number(map.delivery_fee || DEFAULTS.deliveryFee),
        freeDeliveryMin: Number(map.free_delivery_min || DEFAULTS.freeDeliveryMin),
      };
      cachedSettings = resolved;
      setSettings(resolved);
      listeners.forEach(fn => fn(resolved));
    };
    load();
  }, []);

  return settings;
}
