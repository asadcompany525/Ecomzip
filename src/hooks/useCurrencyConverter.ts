// ============================================================
// useCurrencyConverter — Visitor ka country detect karo aur currency auto-set karo
// Rates open.er-api.com se fetch hoti hain (free, no API key)
// Cache 6 ghante tak valid rehti hai localStorage mein
// ============================================================

import { useState, useEffect } from 'react';

export interface CurrencyInfo {
  code: string;    // e.g. "USD"
  symbol: string;  // e.g. "$"
  name: string;    // e.g. "US Dollar"
  rate: number;    // PKR se convert karne ka rate (PKR → code)
}

// Supported currencies ki info (rate baad mein set hota hai)
const CURRENCIES: Record<string, Omit<CurrencyInfo, 'rate'>> = {
  PKR: { code: 'PKR', symbol: 'Rs.', name: 'Pakistani Rupee' },
  USD: { code: 'USD', symbol: '$',   name: 'US Dollar' },
  AED: { code: 'AED', symbol: 'AED', name: 'UAE Dirham' },
  GBP: { code: 'GBP', symbol: '£',   name: 'British Pound' },
  EUR: { code: 'EUR', symbol: '€',   name: 'Euro' },
  SAR: { code: 'SAR', symbol: 'SAR', name: 'Saudi Riyal' },
  CAD: { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar' },
  AUD: { code: 'AUD', symbol: 'A$',  name: 'Australian Dollar' },
};

// Country code se currency code map
const COUNTRY_TO_CURRENCY: Record<string, string> = {
  PK: 'PKR', US: 'USD', AE: 'AED', GB: 'GBP',
  DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR',
  SA: 'SAR', CA: 'CAD', AU: 'AUD',
  QA: 'AED', KW: 'AED', OM: 'AED', BH: 'AED',
};

const CACHE_KEY = 'stopy_currency_rates';
const CACHE_TTL = 6 * 3600 * 1000; // 6 ghante milliseconds mein

// Global currency state — sab components ek hi value share karte hain
let globalCurrency: CurrencyInfo = { ...CURRENCIES.PKR, rate: 1 };
const listeners: Array<(c: CurrencyInfo) => void> = [];

function notifyListeners() {
  listeners.forEach(fn => fn(globalCurrency));
}

// PKR base se exchange rates fetch karo (6h cache ke saath)
async function fetchRates(): Promise<Record<string, number>> {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { timestamp, rates, base } = JSON.parse(cached);
      if (base === 'PKR' && Date.now() - timestamp < CACHE_TTL) return rates;
    }
    const res = await fetch('https://open.er-api.com/v6/latest/PKR');
    if (!res.ok) throw new Error('Rate fetch failed');
    const data = await res.json();
    const rates = data.rates || {};
    localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), rates, base: 'PKR' }));
    return rates;
  } catch {
    return {}; // Silently fail — PKR default rahe
  }
}

// Visitor ka country detect karo (ipapi.co) — saved preference pehle check karo
async function detectUserCurrency(): Promise<string> {
  try {
    const saved = localStorage.getItem('stopy_preferred_currency');
    if (saved && CURRENCIES[saved]) return saved; // User ne manually set kiya tha
    const res = await fetch('https://ipapi.co/json/');
    if (!res.ok) throw new Error();
    const data = await res.json();
    const country = data.country_code || 'PK';
    return COUNTRY_TO_CURRENCY[country] || 'PKR';
  } catch {
    return 'PKR'; // Fallback to PKR
  }
}

// Module load pe ek baar initialize karo
let initialized = false;

async function initCurrency() {
  if (initialized) return;
  initialized = true;
  const code = await detectUserCurrency();
  const rates = await fetchRates();
  const rateFromPKR = rates[code] || 1;
  globalCurrency = { ...CURRENCIES[code] || CURRENCIES.PKR, rate: rateFromPKR };
  notifyListeners();
}

initCurrency(); // App load hote hi start

// ── Hook ────────────────────────────────────────────────────

export function useCurrencyConverter() {
  const [currency, setCurrency] = useState<CurrencyInfo>(globalCurrency);

  // Global listener mein register karo taake currency change pe re-render ho
  useEffect(() => {
    listeners.push(setCurrency);
    setCurrency(globalCurrency); // Agar already initialized hai to immediately update karo
    return () => {
      const idx = listeners.indexOf(setCurrency);
      if (idx >= 0) listeners.splice(idx, 1);
    };
  }, []);

  // PKR amount ko current currency mein convert karo
  const convertFromPKR = (pkrAmount: number): number => {
    if (currency.code === 'PKR') return pkrAmount;
    return pkrAmount * currency.rate;
  };

  // Price ko formatted string mein convert karo
  // Example: formatPrice(5000) → "Rs. 5,000" ya "$ 18"
  const formatPrice = (pkrAmount: number): string => {
    const converted = convertFromPKR(pkrAmount);
    if (currency.code === 'PKR') return `Rs. ${Math.round(converted).toLocaleString('en-PK')}`;
    if (converted < 10) return `${currency.symbol} ${converted.toFixed(2)}`;
    return `${currency.symbol} ${Math.round(converted).toLocaleString()}`;
  };

  // User manually currency change kare (CurrencySelector mein use hota hai)
  const changeCurrency = (code: string) => {
    localStorage.setItem('stopy_preferred_currency', code);
    initialized = false; // Force re-initialize with new preference
    initCurrency();
  };

  return { currency, formatPrice, convertFromPKR, changeCurrency, availableCurrencies: CURRENCIES };
}
