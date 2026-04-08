import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkles, Loader2, Send, Save, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const CHAT_STORAGE_KEY = 'ai_site_manager_history';

interface ChatMsg { role: string; content: string; ts?: number; }

const AdminAiSiteManager = () => {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<Record<string, any>>({});
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from('site_settings').select('*').then(({ data }) => {
      const map: Record<string, any> = {};
      (data || []).forEach(s => { map[s.key] = typeof s.value === 'string' ? JSON.parse(s.value) : s.value; });
      setSettings(map);
    });
    try {
      const saved = localStorage.getItem(CHAT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setMessages(parsed.slice(-60));
      }
    } catch {}
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const persistMessages = (msgs: ChatMsg[]) => {
    try { localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(msgs.slice(-60))); } catch {}
  };

  const clearHistory = () => {
    setMessages([]);
    localStorage.removeItem(CHAT_STORAGE_KEY);
    toast({ title: 'Chat history cleared' });
  };

  const quickActions = [
    'Change store name to "Stopy Shoes"',
    'Update delivery fee to Rs. 250',
    'Set free delivery minimum to Rs. 3000',
    'Update contact phone number',
    'Change store description',
    'Update return policy text',
    'Set store email',
  ];

  const sendMessage = async (msg?: string) => {
    const text = msg || input;
    if (!text.trim()) return;
    const newMsg: ChatMsg = { role: 'user', content: text, ts: Date.now() };
    const newMessages = [...messages, newMsg];
    setMessages(newMessages);
    persistMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const { data: allSettings } = await supabase.from('site_settings').select('*');
      const settingsStr = JSON.stringify((allSettings || []).map(s => ({ key: s.key, value: s.value })));

      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          type: 'admin-helper',
          messages: [
            { role: 'system', content: `You are a website settings manager for "Stopy Shoes" store. You can update any site setting.
Current settings: ${settingsStr}

When admin asks to change a setting, return action JSON wrapped in <ACTION_JSON>...</ACTION_JSON> tags:
{ "action": "update_setting", "key": "setting_key", "value": "new_value" }
Or for new settings:
{ "action": "create_setting", "key": "setting_key", "value": "new_value" }

Common keys: shop_name, shop_email, shop_phone, delivery_fee, free_delivery_min, return_policy_text, store_description, social_links, receipt_footer

Reply in English or Roman Urdu.` },
            ...newMessages.slice(-6).map(m => ({ role: m.role, content: m.content })),
          ],
        },
      });
      if (error) throw error;
      const reply = typeof data === 'string' ? data : data?.reply || data?.content || 'No response';

      const actionMatch = reply.match(/<ACTION_JSON>([\s\S]*?)<\/ACTION_JSON>/);
      if (actionMatch) {
        try {
          const action = JSON.parse(actionMatch[1]);
          if (action.action === 'update_setting' || action.action === 'create_setting') {
            await supabase.from('site_settings').upsert({ key: action.key, value: action.value }, { onConflict: 'key' });
            toast({ title: `✅ Setting "${action.key}" updated!` });
          }
        } catch (e) { console.error('Action error:', e); }
      }

      const cleanReply = reply.replace(/<ACTION_JSON>[\s\S]*?<\/ACTION_JSON>/g, '').trim();
      const replyMsg: ChatMsg = { role: 'assistant', content: cleanReply || '✅ Setting updated!', ts: Date.now() };
      const finalMessages = [...newMessages, replyMsg];
      setMessages(finalMessages);
      persistMessages(finalMessages);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  const formatTime = (ts?: number) => {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Karachi' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2"><Sparkles className="h-5 w-5" /> AI Site Manager</h2>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground text-xs" onClick={clearHistory}>
            <Trash2 className="h-3.5 w-3.5" /> Clear History
          </Button>
        )}
      </div>
      <p className="text-sm text-muted-foreground">Change any website setting with AI — store name, policies, fees, contact info, etc. Your chat history is saved.</p>

      <div className="flex gap-2 flex-wrap">
        {quickActions.map(q => (
          <Button key={q} variant="outline" size="sm" className="text-xs" onClick={() => sendMessage(q)}>{q}</Button>
        ))}
      </div>

      <div className="bg-card border rounded-xl min-h-[300px] max-h-[420px] overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Tell AI what to change on your website</p>
            <p className="text-xs mt-1 opacity-70">Chat history is saved and persists across page refreshes</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
              <p className="whitespace-pre-wrap">{m.content}</p>
              {m.ts && <p className={`text-[9px] mt-1 opacity-60 ${m.role === 'user' ? 'text-right' : ''}`}>{formatTime(m.ts)}</p>}
            </div>
          </div>
        ))}
        {loading && <div className="flex justify-start"><div className="bg-muted rounded-xl px-4 py-2.5"><Loader2 className="h-4 w-4 animate-spin" /></div></div>}
        <div ref={chatEndRef} />
      </div>

      <div className="flex gap-2">
        <Textarea value={input} onChange={e => setInput(e.target.value)} placeholder="Tell AI what to change..." rows={2} className="flex-1"
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} />
        <Button onClick={() => sendMessage()} disabled={loading || !input.trim()} className="self-end"><Send className="h-4 w-4" /></Button>
      </div>
    </div>
  );
};

export default AdminAiSiteManager;
