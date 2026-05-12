import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, Image as ImageIcon, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useStoreSettings } from '@/hooks/useStoreSettings';

interface ChatMsg {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  image?: string;
  senderType?: string;
}

const GUEST_HISTORY_KEY = 'store_guest_chat_history';

const makeWelcomeMsg = (brandLabel: string, userName?: string): ChatMsg => ({
  role: 'assistant',
  content: userName
    ? `Assalam-o-Alaikum, ${userName}! 👋 ${brandLabel} میں خوش آمدید۔\n\nآپ یہاں سے ہم سے بات کر سکتے ہیں۔ ہماری ٹیم جلد جواب دے گی!`
    : `Assalam-o-Alaikum! 👋 ${brandLabel} میں خوش آمدید۔\n\nآپ یہاں سے ہم سے بات کر سکتے ہیں۔ ہماری ٹیم جلد جواب دے گی!`,
});

const AIChatWidget = () => {
  const { brandName } = useStoreSettings();
  const [open, setOpen] = useState(false);
  const [userName, setUserName] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<ChatMsg[]>(() => {
    try {
      const saved = localStorage.getItem(GUEST_HISTORY_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [makeWelcomeMsg('Our Store')];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  // Fetch user's real name from profile for personalized greeting
  useEffect(() => {
    if (!user) return;
    const firstName = user.user_metadata?.full_name?.split(' ')[0] ||
                      user.user_metadata?.name?.split(' ')[0];
    if (firstName) {
      setUserName(firstName);
      return;
    }
    supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle().then(({ data }) => {
      const name = (data?.full_name as string | null)?.split(' ')[0];
      if (name) setUserName(name);
    });
  }, [user]);

  // Update welcome message when brand name or user name is resolved
  useEffect(() => {
    if (!brandName || brandName === 'My Store') return;
    setMessages(prev => {
      if (prev.length === 1 && prev[0].role === 'assistant') {
        return [makeWelcomeMsg(brandName, userName)];
      }
      return prev;
    });
  }, [brandName, userName]);

  // Persist guest chat history to localStorage (only if not logged in)
  useEffect(() => {
    if (!user && messages.length > 1) {
      const toSave = messages.slice(-30);
      try { localStorage.setItem(GUEST_HISTORY_KEY, JSON.stringify(toSave)); } catch {}
    }
  }, [messages, user]);

  // Load existing conversation
  useEffect(() => {
    if (!user || !open) return;
    const loadConvo = async () => {
      const { data } = await supabase.from('chat_conversations')
        .select('id').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (data) {
        setConversationId(data.id);
        const { data: msgs } = await supabase.from('chat_messages')
          .select('*').eq('conversation_id', data.id).order('created_at');
        if (msgs && msgs.length > 0) {
          setMessages(msgs.map(m => ({
            id: m.id, role: m.sender_type === 'user' ? 'user' as const : 'assistant' as const,
            content: parseMsg(m.message).text, image: parseMsg(m.message).image, senderType: m.sender_type,
          })));
        }
      }
    };
    loadConvo();
  }, [user, open]);

  // Subscribe to new messages
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`user-chat-${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'chat_messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload: any) => {
        const msg = payload.new;
        if (msg.sender_type === 'admin') {
          const parsed = parseMsg(msg.message);
          setMessages(prev => {
            if (prev.some(m => m.id === msg.id)) return prev;
            return [...prev, { id: msg.id, role: 'assistant', content: parsed.text, image: parsed.image, senderType: 'admin' }];
          });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  const parseMsg = (text: string) => {
    const imgMatch = text.match(/\[Image: (https?:\/\/[^\]]+)\]/);
    const cleanText = text.replace(/\[Image: https?:\/\/[^\]]+\]/g, '').trim();
    return { text: cleanText, image: imgMatch?.[1] };
  };

  const ensureConversation = async () => {
    if (conversationId) return conversationId;
    if (!user) return null;
    const { data } = await supabase.from('chat_conversations').insert({
      user_id: user.id, subject: 'Customer Chat', is_ai_handled: false,
    }).select('id').single();
    if (data) { setConversationId(data.id); return data.id; }
    return null;
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setImageFile(file); setImagePreview(URL.createObjectURL(file)); }
  };

  const send = async () => {
    if ((!input.trim() && !imageFile) || loading) return;
    const userMsg = input.trim();
    setInput('');
    
    let uploadedUrl: string | undefined;
    if (imageFile) {
      const path = `chat/${Date.now()}-${imageFile.name}`;
      const { error } = await supabase.storage.from('chat').upload(path, imageFile);
      if (!error) {
        const { data: urlData } = supabase.storage.from('chat').getPublicUrl(path);
        uploadedUrl = urlData.publicUrl;
      }
      setImageFile(null); setImagePreview(null);
    }

    setMessages(prev => [...prev, { role: 'user', content: userMsg || '📷 Image', image: uploadedUrl }]);
    setLoading(true);

    try {
      const convoId = user ? await ensureConversation() : null;
      const pktTimestamp = new Date(Date.now() + 5 * 3600000).toISOString();
      if (convoId) {
        await supabase.from('chat_messages').insert({
          conversation_id: convoId, sender_type: 'user', sender_id: user!.id,
          message: uploadedUrl ? `${userMsg}\n[Image: ${uploadedUrl}]` : userMsg,
        });
        // Also persist to chat_history for unified history
        supabase.from('chat_history' as any).insert([
          { session_type: 'customer_chat', role: 'user', content: userMsg || '📷 Image',
            metadata: { conversation_id: convoId, image: uploadedUrl }, created_at: pktTimestamp, user_id: user?.id },
        ]).then(() => {});
      }
      // No AI reply - wait for admin response via realtime
    } catch {}
    setLoading(false);
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-20 md:bottom-6 right-4 z-50 w-[340px] md:w-[380px] bg-card border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            style={{ height: '500px' }}>
            <div className="bg-primary text-primary-foreground p-4 flex items-center gap-3">
              <MessageCircle className="h-6 w-6" />
              <div className="flex-1">
                <p className="font-bold text-sm">{brandName ? `${brandName} Support` : 'Support Chat'}</p>
                <p className="text-xs opacity-80">ہماری ٹیم آن لائن ہے</p>
              </div>
              <button onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : ''}`}>
                  {m.role === 'assistant' && (
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap ${m.role === 'user' ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-muted rounded-bl-md'}`}>
                    {m.image && <img src={m.image} alt="" className="w-full max-w-[200px] rounded-lg mb-2" />}
                    {m.content}
                    {m.senderType === 'admin' && <p className="text-[10px] opacity-60 mt-1">Admin</p>}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-2">
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><MessageCircle className="h-4 w-4 text-primary" /></div>
                  <div className="bg-muted px-3 py-2 rounded-2xl rounded-bl-md text-sm"><span className="animate-pulse">Sending...</span></div>
                </div>
              )}
            </div>
            {imagePreview && (
              <div className="px-3 pb-1">
                <div className="relative inline-block">
                  <img src={imagePreview} alt="" className="h-16 rounded-lg border" />
                  <button onClick={() => { setImageFile(null); setImagePreview(null); }}
                    className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center text-[10px]">×</button>
                </div>
              </div>
            )}
            <form onSubmit={e => { e.preventDefault(); send(); }} className="p-3 border-t flex gap-2">
              <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={handleImageSelect} />
              <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={() => fileRef.current?.click()} disabled={!user}>
                <ImageIcon className="h-4 w-4" />
              </Button>
              <Input value={input} onChange={e => setInput(e.target.value)} placeholder={user ? "پیغام لکھیں..." : "Login to chat..."} className="flex-1" disabled={!user} />
              <Button type="submit" size="icon" disabled={loading || (!input.trim() && !imageFile) || !user}><Send className="h-4 w-4" /></Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {!open && (
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} onClick={() => setOpen(true)}
          className="fixed bottom-20 md:bottom-6 right-4 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center">
          <MessageCircle className="h-6 w-6" />
        </motion.button>
      )}
    </>
  );
};

export default AIChatWidget;
