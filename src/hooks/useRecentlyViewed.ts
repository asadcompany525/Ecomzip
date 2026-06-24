import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'stopy_recently_viewed';
const MAX_ITEMS = 10;

export interface RecentItem {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  image: string;
  brand?: string;
  rating?: number;
  viewedAt: number;
}

export function useRecentlyViewed(currentProductId?: string) {
  const [items, setItems] = useState<RecentItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: RecentItem[] = JSON.parse(raw);
        setItems(parsed.filter(i => i.id !== currentProductId));
      }
    } catch {
      /* ignore */
    }
  }, [currentProductId]);

  const addItem = useCallback((item: Omit<RecentItem, 'viewedAt'>) => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      let list: RecentItem[] = raw ? JSON.parse(raw) : [];
      list = list.filter(i => i.id !== item.id);
      list.unshift({ ...item, viewedAt: Date.now() });
      list = list.slice(0, MAX_ITEMS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      setItems(list.filter(i => i.id !== item.id));
    } catch {
      /* ignore */
    }
  }, []);

  return { items, addItem };
}
