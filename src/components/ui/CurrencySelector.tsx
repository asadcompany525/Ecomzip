import { useState } from 'react';
import { Globe } from 'lucide-react';
import { useCurrencyConverter } from '@/hooks/useCurrencyConverter';
import { Button } from '@/components/ui/button';

export default function CurrencySelector() {
  const { currency, changeCurrency, availableCurrencies } = useCurrencyConverter();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 h-8 px-2 text-xs"
        onClick={() => setOpen(v => !v)}
      >
        <Globe className="h-3.5 w-3.5" />
        {currency.symbol} {currency.code}
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 bg-popover border rounded-xl shadow-xl overflow-hidden w-48">
            {Object.values(availableCurrencies).map(c => (
              <button
                key={c.code}
                onClick={() => { changeCurrency(c.code); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors text-left ${currency.code === c.code ? 'bg-primary/10 text-primary font-semibold' : ''}`}
              >
                <span className="w-8 font-mono text-xs">{c.symbol}</span>
                <span>{c.code}</span>
                <span className="text-xs text-muted-foreground ml-auto truncate">{c.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
