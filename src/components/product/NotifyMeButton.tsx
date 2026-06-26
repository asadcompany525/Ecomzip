import { useState } from 'react';
import { Bell, BellRing, Loader2, CheckCircle2, MessageCircle, Mail } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface NotifyMeButtonProps {
  productId: string;
  productName: string;
  size?: string;
  variant?: 'icon' | 'card';
}

export default function NotifyMeButton({ productId, productName, size, variant = 'icon' }: NotifyMeButtonProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const displaySize = size || 'Any';

  const handleSubmit = async () => {
    if (!phone.trim() && !email.trim()) {
      toast({ title: 'Contact info required', description: 'Please enter your WhatsApp number or email.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from('stock_notifications' as any).insert({
        product_id: productId,
        product_name: productName,
        size: displaySize,
        customer_name: name.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
      });

      if (error) {
        const key = 'stock_notifications_fallback';
        const { data: existing } = await supabase.from('site_settings').select('value').eq('key', key).maybeSingle();
        const list: any[] = existing?.value ? (Array.isArray(existing.value) ? existing.value : []) : [];
        list.push({
          product_id: productId,
          product_name: productName,
          size: displaySize,
          customer_name: name.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          created_at: new Date().toISOString(),
        });
        await supabase.from('site_settings').upsert({ key, value: list as any });
      }

      setDone(true);
      toast({
        title: '🔔 You\'re on the list!',
        description: `We'll notify you on WhatsApp when ${size ? `Size ${size}` : 'this product'} is back in stock.`,
      });
      setTimeout(() => { setOpen(false); setDone(false); setName(''); setPhone(''); setEmail(''); }, 2500);
    } catch {
      toast({ title: 'Something went wrong', description: 'Please try again or contact us on WhatsApp.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {variant === 'card' ? (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
          className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 hover:bg-amber-100 px-2.5 py-1 rounded-full transition-colors"
          title="Notify me when back in stock"
        >
          <Bell className="h-3 w-3" /> Notify Me
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          title={`Notify me when size ${displaySize} is back`}
          className="absolute -top-1.5 -right-1.5 z-10 w-5 h-5 rounded-full bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center shadow transition-transform hover:scale-110"
        >
          <Bell className="h-2.5 w-2.5" />
        </button>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto">
          <SheetHeader className="mb-5">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <BellRing className="h-5 w-5 text-amber-500" />
              Notify Me When Back In Stock
            </SheetTitle>
          </SheetHeader>

          {done ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <p className="font-semibold text-base">You're on the list!</p>
              <p className="text-sm text-muted-foreground text-center">
                We'll send you a message as soon as{' '}
                <strong>{size ? `Size ${size} of ` : ''}{productName}</strong> is available again.
              </p>
            </div>
          ) : (
            <div className="space-y-4 pb-6">
              <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center font-bold text-amber-700 text-sm shrink-0">
                  {size ? size : '🔔'}
                </div>
                <div>
                  <p className="text-xs text-amber-700 font-medium">
                    Out of stock{size ? ` — Size ${size}` : ''}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{productName}</p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Leave your contact and we'll send you a <strong>WhatsApp message</strong> the moment this {size ? 'size is' : 'product is'} restocked.
              </p>

              <div className="space-y-3">
                <div>
                  <Label className="text-sm">Your Name <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input className="mt-1" placeholder="e.g. Ahmed" value={name} onChange={e => setName(e.target.value)} />
                </div>

                <div>
                  <Label className="text-sm flex items-center gap-1.5">
                    <MessageCircle className="h-3.5 w-3.5 text-green-500" />
                    WhatsApp Number <span className="text-destructive">*</span>
                  </Label>
                  <Input className="mt-1" placeholder="+92 300 1234567" type="tel" value={phone} onChange={e => setPhone(e.target.value)} />
                </div>

                <div>
                  <Label className="text-sm flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-primary" />
                    Email <span className="text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <Input className="mt-1" placeholder="you@example.com" type="email" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
              </div>

              <Button
                className="w-full h-11 gap-2 bg-amber-500 hover:bg-amber-600 text-white"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />}
                {loading ? 'Saving...' : `Notify Me When ${size ? `Size ${size}` : 'It'} Returns`}
              </Button>

              <p className="text-[10px] text-muted-foreground text-center">
                We'll only contact you about this item. No spam, ever.
              </p>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
