import { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, User, Loader2, ChevronDown, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useStoreSettings } from '@/hooks/useStoreSettings';

interface Msg {
  role: 'user' | 'ai' | 'admin';
  content: string;
  ts: number;
  isEscalation?: boolean;
}

interface Props {
  product: any;
  categoryName: string;
  categoryType: 'shoes' | 'bags' | 'clothing' | 'electronics' | 'generic';
  variants?: any[];
}

const SESSION_KEY_PREFIX = 'ai_sp_';

const AISalesperson = ({ product, categoryName, categoryType, variants = [] }: Props) => {
  const { user } = useAuth();
  const { brandName } = useStoreSettings();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => `${product?.id}_${Date.now()}`);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const storageKey = `${SESSION_KEY_PREFIX}${product?.id}`;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setMsgs(JSON.parse(saved));
        return;
      }
    } catch {}
    const welcome: Msg = {
      role: 'ai',
      content: `Hi! 👋 I'm your AI Sales Assistant for **${product?.name || 'this product'}**.\n\nI know everything about this product — price, sizes, stock, materials, delivery, return policy, and more. Ask me anything!`,
      ts: Date.now(),
    };
    setMsgs([welcome]);
  }, [product?.id]);

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(msgs)); } catch {}
  }, [msgs]);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [msgs]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const buildProductContext = () => {
    const stockLines = variants.length > 0
      ? variants.map(v => `${v.size || v.color || 'Default'}: ${v.stock ?? 'N/A'} units`).join(', ')
      : `Total stock: ${product?.stock ?? 'N/A'}`;

    return `You are an expert AI sales assistant for ${brandName || 'this store'}.

PRODUCT DETAILS (you know everything about this):
- Name: ${product?.name || 'N/A'}
- Category: ${categoryName || categoryType}
- Price: Rs. ${product?.price?.toLocaleString() || 'N/A'}${product?.originalPrice ? ` (Original: Rs. ${product?.originalPrice?.toLocaleString()})` : ''}${product?.discount ? ` | ${product?.discount}% OFF` : ''}
- Description: ${product?.description || 'No description'}
- Available Sizes: ${(product?.sizes || []).join(', ') || 'N/A'}
- Available Colors: ${(product?.colors || []).join(', ') || 'N/A'}
- Stock: ${stockLines}
- Rating: ${product?.rating || 'No ratings yet'} ⭐
- Brand: ${product?.brand || 'N/A'}
- Return Policy: ${product?.return_policy || '7-day easy return'}
- Warranty/Claim: ${product?.claim_policy || 'Genuine product guarantee'}
- Delivery: 2-5 business days, COD available

INSTRUCTIONS:
1. Be helpful, friendly and persuasive like a real sales expert
2. Highlight product benefits based on customer questions
3. If asked about size, check stock info and recommend
4. If asked about discount/price negotiation, say prices are fixed but offer promo codes info
5. Respond in the SAME LANGUAGE the customer uses (Urdu, English, etc.)
6. If you genuinely don't know something specific (like customer's personal order status), say: "ESCALATE: [your question to admin]"
7. Keep responses concise and helpful`;
  };

  const sendMsg = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');

    const userMsg: Msg = { role: 'user', content: text, ts: Date.now() };
    const updated = [...msgs, userMsg];
    setMsgs(updated);
    setLoading(true);

    try {
      const history = updated.slice(-10).map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      }));

      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          type: 'product-ai',
          messages: [
            { role: 'system', content: buildProductContext() },
            ...history,
          ],
        },
      });

      if (error) throw error;

      const reply = data?.reply || data?.content || "I'm having trouble connecting. Please try again!";

      const isEscalation = reply.startsWith('ESCALATE:');
      const aiMsg: Msg = {
        role: 'ai',
        content: isEscalation ? "I'm checking with our team and will get back to you shortly. You can also contact us directly!" : reply,
        ts: Date.now(),
        isEscalation,
      };

      const finalMsgs = [...updated, aiMsg];
      setMsgs(finalMsgs);

      if (isEscalation) {
        await saveEscalation(text, reply.replace('ESCALATE:', '').trim(), finalMsgs);
      } else {
        await saveChatToDb(sessionId, finalMsgs);
      }
    } catch {
      setMsgs(prev => [...prev, {
        role: 'ai',
        content: "Sorry, I'm having a connection issue. Please try again in a moment!",
        ts: Date.now(),
      }]);
    }
    setLoading(false);
  };

  const saveChatToDb = async (sid: string, messages: Msg[]) => {
    try {
      await supabase.from('chat_history' as any).upsert({
        session_id: sid,
        session_type: 'ai_salesperson',
        messages: messages as any,
        product_id: product?.id,
        product_name: product?.name,
        user_id: user?.id || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'session_id' });
    } catch {}
  };

  const saveEscalation = async (question: string, adminQ: string, messages: Msg[]) => {
    try {
      await saveChatToDb(sessionId, [
        ...messages,
        { role: 'ai', content: `[ESCALATION NEEDED] Customer asked: "${question}" — Admin please answer: ${adminQ}`, ts: Date.now(), isEscalation: true },
      ]);
    } catch {}
  };

  const catEmoji = { shoes: '👟', bags: '👜', clothing: '👗', electronics: '📱', generic: '🛍️' }[categoryType];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-40 md:bottom-6 md:right-6 bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-2xl px-4 py-3 shadow-xl flex items-center gap-2 hover:scale-105 transition-transform"
      >
        <Bot className="h-5 w-5" />
        <span className="text-sm font-semibold">AI Sales Expert</span>
        <Badge className="bg-white/20 text-white text-[10px] px-1.5 py-0 ml-0.5">LIVE</Badge>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            className="fixed bottom-0 right-0 left-0 md:bottom-6 md:right-6 md:left-auto md:w-[380px] z-50 bg-card border border-border rounded-t-2xl md:rounded-2xl shadow-2xl flex flex-col"
            style={{ maxHeight: '75vh' }}
          >
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-3 rounded-t-2xl flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center text-lg">{catEmoji}</div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">AI Sales Expert</p>
                <p className="text-xs text-white/70 truncate">{product?.name}</p>
              </div>
              <Badge className="bg-green-400/30 text-green-100 text-[10px] border-0">● Online</Badge>
              <button onClick={() => setOpen(false)} className="h-7 w-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
              {msgs.map((m, i) => (
                <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role !== 'user' && (
                    <div className="h-7 w-7 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center shrink-0 mt-0.5">
                      {m.role === 'admin' ? <User className="h-3.5 w-3.5 text-white" /> : <Bot className="h-3.5 w-3.5 text-white" />}
                    </div>
                  )}
                  <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : m.role === 'admin'
                      ? 'bg-blue-50 border border-blue-100 text-blue-900 rounded-bl-sm'
                      : 'bg-muted rounded-bl-sm'
                  }`}>
                    {m.role === 'admin' && <p className="text-[10px] font-bold text-blue-500 mb-1">Store Team</p>}
                    {m.isEscalation && <div className="flex items-center gap-1 text-amber-600 text-[11px] mb-1"><AlertCircle className="h-3 w-3" /> Connecting to team...</div>}
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  </div>
                  {m.role === 'user' && (
                    <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                      <User className="h-3.5 w-3.5 text-primary" />
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex gap-2 items-center">
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
                    <Bot className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2">
                    <div className="flex gap-1">
                      {[0, 1, 2].map(j => <div key={j} className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: `${j * 0.15}s` }} />)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 border-t">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMsg()}
                  placeholder="Ask about size, price, delivery..."
                  className="flex-1 h-9 text-sm"
                  disabled={loading}
                />
                <Button size="icon" className="h-9 w-9 bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shrink-0" onClick={sendMsg} disabled={loading || !input.trim()}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground text-center mt-1.5">AI knows full product details · Replies in your language</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AISalesperson;
