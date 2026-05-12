import { useState, useEffect } from 'react';

export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  rate: number;
}

const CURRENCIES: Record<string, Omit<CurrencyInfo, 'rate'>> = {
  PKR: { code: 'PKR', symbol: 'Rs.', name: 'Pakistani Rupee' },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar' },
  AED: { code: 'AED', symbol: 'AED', name: 'UAE Dirham' },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro' },
  SAR: { code: 'SAR', symbol: 'SAR', name: 'Saudi Riyal' },
  CAD: { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar' },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
};

const COUNTRY_TO_CURRENCY: Record<string, string> = {
  PK: 'PKR', US: 'USD', AE: 'AED', GB: 'GBP',
  DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR',
  SA: 'SAR', CA: 'CAD', AU: 'AUD', QA: 'AED', KW: 'AED',
  OM: 'AED', BH: 'AED',
};

const CACHE_KEY = 'stopy_currency_rates';
const CACHE_TTL = 6 * 3600 * 1000;

let globalCurrency: CurrencyInfo = { ...CURRENCIES.PKR, rate: 1 };
const listeners: Array<(c: CurrencyInfo) => void> = [];

function notifyListeners() {
  listeners.forEach(fn => fn(globalCurrency));
}

async function fetchRates(baseCurrency: string): Promise<Record<string, number>> {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { timestamp, rates, base } = JSON.parse(cached);
      if (base === baseCurrency && Date.now() - timestamp < CACHE_TTL) return rates;
    }
    const res = await fetch(`https://open.er-api.com/v6/latest/PKR`);
    if (!res.ok) throw new Error('Rate fetch failed');
    const data = await res.json();
    const rates = data.rates || {};
    localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), rates, base: 'PKR' }));
    return rates;
  } catch {
    return {};
  }
}

async function detectUserCurrency(): Promise<string> {
  try {
    const saved = localStorage.getItem('stopy_preferred_currency');
    if (saved && CURRENCIES[saved]) return saved;
    const res = await fetch('https://ipapi.co/json/');
    if (!res.ok) throw new Error();
    const data = await res.json();
    const country = data.country_code || 'PK';
    return COUNTRY_TO_CURRENCY[country] || 'PKR';
  } catch {
    return 'PKR';
  }
}

let initialized = false;

async function initCurrency() {
  if (initialized) return;
  initialized = true;
  const code = await detectUserCurrency();
  const rates = await fetchRates('PKR');
  const rateFromPKR = rates[code] || 1;
  globalCurrency = { ...CURRENCIES[code] || CURRENCIES.PKR, rate: rateFromPKR };
  notifyListeners();
}

initCurrency();

export function useCurrencyConverter() {
  const [currency, setCurrency] = useState<CurrencyInfo>(globalCurrency);

  useEffect(() => {
    listeners.push(setCurrency);
    setCurrency(globalCurrency);
    return () => {
      const idx = listeners.indexOf(setCurrency);
      if (idx >= 0) listeners.splice(idx, 1);
    };
  }, []);

  const convertFromPKR = (pkrAmount: number): number => {
    if (currency.code === 'PKR') return pkrAmount;
    return pkrAmount * currency.rate;
  };

  const formatPrice = (pkrAmount: number): string => {
    const converted = convertFromPKR(pkrAmount);
    if (currency.code === 'PKR') return `Rs. ${Math.round(converted).toLocaleString('en-PK')}`;
    if (converted < 10) return `${currency.symbol} ${converted.toFixed(2)}`;
    return `${currency.symbol} ${Math.round(converted).toLocaleString()}`;
  };

  const changeCurrency = (code: string) => {
    localStorage.setItem('stopy_preferred_currency', code);
    initialized = false;
    initCurrency();
  };

  return { currency, formatPrice, convertFromPKR, changeCurrency, availableCurrencies: CURRENCIES };
}
